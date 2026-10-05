import { cn } from "@/lib/utils";

const FLAGS: Record<string, { label: string; stripes: string[] }> = {
  en: { label: "Inglés", stripes: ["#1d3a6e", "#fff", "#b22234"] },
  fr: { label: "Francés", stripes: ["#0055a4", "#fff", "#ef4135"] },
  pt: { label: "Portugués", stripes: ["#009c3b", "#ffdf00", "#002776"] },
  it: { label: "Italiano", stripes: ["#009246", "#fff", "#ce2b37"] },
  de: { label: "Alemán", stripes: ["#000", "#dd0000", "#ffce00"] },
  es: { label: "Español", stripes: ["#aa151b", "#f1bf00", "#aa151b"] },
};

export function FlagIcon({
  code,
  className,
}: {
  code: string;
  className?: string;
}) {
  const flag = FLAGS[code] ?? FLAGS.en;
  return (
    <span
      className={cn(
        "inline-flex size-6 overflow-hidden rounded-full ring-1 ring-white/50",
        className,
      )}
      title={flag.label}
      aria-hidden
    >
      {code === "en" ? (
        <svg viewBox="0 0 24 24" className="size-full">
          <rect width="24" height="24" fill="#1d3a6e" />
          <path d="M0 0 L24 24 M24 0 L0 24" stroke="#fff" strokeWidth="4" />
          <path d="M0 0 L24 24 M24 0 L0 24" stroke="#b22234" strokeWidth="2" />
          <rect x="10" width="4" height="24" fill="#fff" />
          <rect y="10" width="24" height="4" fill="#fff" />
          <rect x="11" width="2" height="24" fill="#b22234" />
          <rect y="11" width="24" height="2" fill="#b22234" />
        </svg>
      ) : code === "de" ? (
        <svg viewBox="0 0 24 24" className="size-full">
          <rect width="24" height="8" fill="#000" />
          <rect y="8" width="24" height="8" fill="#dd0000" />
          <rect y="16" width="24" height="8" fill="#ffce00" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" className="size-full">
          <rect width="8" height="24" fill={flag.stripes[0]} />
          <rect x="8" width="8" height="24" fill={flag.stripes[1]} />
          <rect x="16" width="8" height="24" fill={flag.stripes[2]} />
        </svg>
      )}
    </span>
  );
}
