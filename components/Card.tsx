import type { ReactNode } from "react";

export default function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  // Tailwind v4 emits `.bg-white` / `.border-slate-200` after the blue/slate
  // scale utilities, so a caller's override would lose the cascade. Only apply
  // the defaults when the caller has not supplied their own.
  const background = /(^|\s)bg-/.test(className) ? "" : "bg-white";
  const borderColor = /(^|\s)border-/.test(className) ? "" : "border-slate-200";

  return (
    <div
      className={`rounded-xl border p-5 shadow-sm ${borderColor} ${background} ${className}`}
    >
      {children}
    </div>
  );
}
