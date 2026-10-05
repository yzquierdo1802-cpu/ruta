import { useId, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type Rim = "coral" | "daily" | "gold";

const RIM_FILL: Record<Rim, string> = {
  coral: "var(--color-coral)",
  daily: "var(--color-daily)",
  gold: "var(--color-gold)",
};

const TEARDROP =
  "M56 8 C88 8 106 30 106 56 C106 86 78 116 56 144 C34 116 6 86 6 56 C6 30 24 8 56 8 Z";
const TEARDROP_INNER =
  "M56 14 C84 14 100 33 100 56 C100 82 75 110 56 134 C37 110 12 82 12 56 C12 33 28 14 56 14 Z";

export function TeardropPin({
  to,
  params,
  label,
  photo,
  progress,
  isNew,
  rim = "coral",
  children,
}: {
  to: "/daily" | "/chat" | "/category/$id";
  params?: { id: string };
  label: string;
  photo?: string;
  progress?: string;
  isNew?: boolean;
  rim?: Rim;
  children?: ReactNode;
}) {
  const clipId = useId().replace(/:/g, "");
  const className = "group relative z-10 flex w-28 cursor-pointer touch-manipulation flex-col items-center sm:w-32";
  const href =
    to === "/category/$id" && params
      ? `/category/${params.id}`
      : to === "/chat"
        ? "/chat"
        : "/daily";
  const inner = (
    <>
      <div className="relative h-36 w-28 sm:h-40 sm:w-32">
        {isNew ? (
          <span className="pointer-events-none absolute -top-1 right-1 z-20 rounded-md bg-nuevo px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-nuevo-foreground shadow-sm">
            Nuevo
          </span>
        ) : null}
        <svg
          viewBox="0 0 112 152"
          className="pointer-events-none absolute inset-0 size-full drop-shadow-md"
          aria-hidden
        >
          <defs>
            <clipPath id={clipId}>
              <path d={TEARDROP_INNER} />
            </clipPath>
          </defs>
          <path d={TEARDROP} fill={RIM_FILL[rim]} />
          {photo ? (
            <image
              href={photo}
              x="12"
              y="14"
              width="88"
              height="120"
              preserveAspectRatio="xMidYMid slice"
              clipPath={`url(#${clipId})`}
            />
          ) : (
            <path d={TEARDROP_INNER} fill="white" />
          )}
          {children ? (
            <foreignObject x="18" y="22" width="76" height="70" clipPath={`url(#${clipId})`}>
              <div className="flex h-full w-full items-center justify-center overflow-hidden">
                {children}
              </div>
            </foreignObject>
          ) : null}
        </svg>
        {progress ? (
          <span className="pointer-events-none absolute bottom-8 -right-1 z-10 rounded-full bg-white/95 px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-navy shadow-sm">
            {progress}
          </span>
        ) : null}
      </div>
      <span
        className={cn(
          "mt-0.5 h-1 w-8 rounded-full",
          rim === "daily" ? "bg-daily" : rim === "gold" ? "bg-gold" : "bg-coral",
        )}
      />
      <span className="mt-2 max-w-36 text-center text-sm font-semibold leading-tight text-white text-shadow-label">
        {label}
      </span>
    </>
  );

  return (
    <a href={href} className={className}>
      {inner}
    </a>
  );
}
