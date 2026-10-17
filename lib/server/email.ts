// Maps a campus ID (e.g. STU-2021-045) to the synthetic Supabase Auth email
// used for email/password sign-in.

const DOMAIN = "mediqueue.local";

export function campusIdToEmail(campusId: string): string {
  return `${campusId.trim().toLowerCase()}@${DOMAIN}`;
}
