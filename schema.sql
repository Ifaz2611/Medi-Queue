-- ============================================================================
-- MediQueue — Campus Clinic Appointment & Triage System
-- PostgreSQL / Supabase schema (FR-01 ... FR-05)
-- Run this in the Supabase SQL editor (or `psql -f schema.sql`).
-- ============================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
do $$ begin
  create type user_role as enum ('student', 'doctor', 'admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type appointment_status as enum
    ('Initiated', 'Triaged', 'Scheduled', 'In-Consultation', 'Completed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type urgency_level as enum ('Low', 'Medium', 'High');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- users  (FR-01 role-based access)
-- ---------------------------------------------------------------------------
create table if not exists users (
  id            uuid primary key default gen_random_uuid(),
  auth_user_id  uuid unique,                       -- references auth.users(id) in Supabase
  full_name     text not null,
  email         text,
  campus_id     text unique,                       -- e.g. STU-2021-045 / DR-1001
  role          user_role not null default 'student',
  created_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- appointments  (FR-02 symptom intake, FR-03 triage + booking, FR-04 consult)
-- ---------------------------------------------------------------------------
create table if not exists appointments (
  id               uuid primary key default gen_random_uuid(),
  student_id       uuid references users(id) on delete set null,
  student_name     text not null,
  student_code     text not null,                  -- student ID captured at intake
  chief_complaint  text,
  symptoms         text[] not null default '{}',   -- symptom keys, e.g. {chest_pain}
  severity         int not null check (severity between 1 and 10),
  triage_score     numeric(6, 1) not null default 0,
  urgency          urgency_level not null default 'Low',
  slot_time        text not null,                  -- e.g. '09:00'
  slot_date        date not null default current_date,
  status           appointment_status not null default 'Initiated',
  notes_encrypted  text,                           -- field-level AES-256 clinical notes
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- Prevent double-booking the same slot (completed appointments free the slot).
create unique index if not exists appointments_slot_unique
  on appointments (slot_date, slot_time)
  where status <> 'Completed';

create index if not exists appointments_queue_idx
  on appointments (slot_date, urgency, slot_time);

-- ---------------------------------------------------------------------------
-- audit_logs  (FR-05 immutable audit trail)
-- ---------------------------------------------------------------------------
create table if not exists audit_logs (
  id           uuid primary key default gen_random_uuid(),
  timestamp    timestamptz not null default now(),
  user_id      text not null,                      -- e.g. STU-2021-045 / DR-1001
  role         user_role not null,
  action       text not null,                      -- 'Slot Booked', 'Clinical Note Added', ...
  resource_id  text not null,                      -- appointment ID or other resource
  ip_address   inet
);

-- Make the audit log append-only (immutable).
create or replace function prevent_audit_mutation()
returns trigger as $$
begin
  raise exception 'audit_logs is append-only (immutable)';
end;
$$ language plpgsql;

drop trigger if exists trg_audit_immutable on audit_logs;
create trigger trg_audit_immutable
  before update or delete on audit_logs
  for each row execute function prevent_audit_mutation();

-- Keep appointments.updated_at fresh.
create or replace function touch_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_appointments_updated on appointments;
create trigger trg_appointments_updated
  before update on appointments
  for each row execute function touch_updated_at();

-- ---------------------------------------------------------------------------
-- Auth bridge: create a profile row whenever a Supabase Auth user is created.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (auth_user_id, full_name, email, campus_id, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    new.email,
    new.raw_user_meta_data ->> 'campus_id',
    coalesce((new.raw_user_meta_data ->> 'role')::user_role, 'student')
  )
  on conflict (auth_user_id) do update
    set full_name = excluded.full_name,
        email     = excluded.email,
        campus_id = excluded.campus_id,
        role      = excluded.role;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Row Level Security (RBAC privacy — admin sees metadata only)
-- ---------------------------------------------------------------------------
alter table users        enable row level security;
alter table appointments enable row level security;
alter table audit_logs   enable row level security;

-- Resolve the caller's MediQueue role / campus ID from their auth identity.
create or replace function public.current_app_role()
returns user_role as $$
  select role from public.users where auth_user_id = auth.uid();
$$ language sql stable security definer set search_path = public;

create or replace function public.current_campus_id()
returns text as $$
  select campus_id from public.users where auth_user_id = auth.uid();
$$ language sql stable security definer set search_path = public;

-- users: read your own row; doctors/admins read everyone.
drop policy if exists "users_read_self_or_staff" on users;
create policy "users_read_self_or_staff" on users
  for select using (
    auth_user_id = auth.uid()
    or public.current_app_role() in ('doctor', 'admin')
  );

-- users: keep your own profile current.
drop policy if exists "users_update_self" on users;
create policy "users_update_self" on users
  for update using (auth_user_id = auth.uid());

-- appointments: students own their rows; doctors read/update all; admins read all.
drop policy if exists "students_own_appointments" on appointments;
create policy "students_own_appointments" on appointments
  for all using (student_code = public.current_campus_id())
  with check (student_code = public.current_campus_id());

drop policy if exists "staff_read_appointments" on appointments;
create policy "staff_read_appointments" on appointments
  for select using (public.current_app_role() in ('doctor', 'admin'));

drop policy if exists "doctors_update_appointments" on appointments;
create policy "doctors_update_appointments" on appointments
  for update using (public.current_app_role() = 'doctor');

-- audit_logs: append-only for anyone signed in, readable by admins only.
drop policy if exists "audit_insert_authenticated" on audit_logs;
create policy "audit_insert_authenticated" on audit_logs
  for insert with check (auth.role() = 'authenticated');

drop policy if exists "admins_read_audit" on audit_logs;
create policy "admins_read_audit" on audit_logs
  for select using (public.current_app_role() = 'admin');
