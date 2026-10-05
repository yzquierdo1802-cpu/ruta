import { cn } from "@/lib/utils";

export function Logo({ className, markClassName }: { className?: string; markClassName?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <svg
        viewBox="0 0 32 32"
        className={cn("size-8 shrink-0", markClassName)}
        aria-hidden="true"
      >
        <rect width="32" height="32" rx="8" fill="currentColor" />
        <circle cx="16" cy="16" r="9.6" fill="none" stroke="#F3EFE6" strokeWidth="2.25" />
        <path fill="#F3EFE6" d="M16 5.2 19.4 16 16 26.8 12.6 16Z" />
        <path fill="#F3EFE6" d="M5.2 16 16 12.6 26.8 16 16 19.4Z" />
        <path fill="#C45C3E" d="M16 5.2 19.4 16 H16Z" />
        <circle cx="16" cy="16" r="2.5" fill="#F3EFE6" />
        <circle cx="16" cy="16" r="1.2" fill="#152028" />
      </svg>
      <span className="font-display text-xl font-semibold tracking-tight">Ruta</span>
    </span>
  );
}
