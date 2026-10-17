"use client";

import { usePathname } from "next/navigation";

export default function Footer() {
  const pathname = usePathname();
  if (pathname === "/" || pathname === "/login") return null;

  return (
    <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-400">
      MediQueue · Campus Clinic Appointment &amp; Triage System · MVP Demo
    </footer>
  );
}
