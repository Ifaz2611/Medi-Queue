"use client";

import { usePathname } from "next/navigation";
import IubLogo from "@/components/IubLogo";

export default function Footer() {
  const pathname = usePathname();
  if (pathname === "/" || pathname === "/login") return null;

  return (
    <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-400">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-center gap-2 px-4 sm:flex-row sm:gap-3">
        <span>
          MediQueue · Campus Clinic Appointment &amp; Triage System · MVP Demo
        </span>
        <span className="hidden text-slate-300 sm:inline" aria-hidden="true">
          |
        </span>
        <span className="flex items-center gap-2">
          <IubLogo className="h-5 w-auto" />
          <span>
            In collaboration with{" "}
            <span className="font-medium text-slate-600">
              Independent University Bangladesh
            </span>
          </span>
        </span>
      </div>
    </footer>
  );
}
