import { useRouterState } from "@tanstack/react-router";
import {
  BarChart3,
  BookOpen,
  Crown,
  MapPin,
  ShoppingBag,
  Trophy,
} from "lucide-react";
import { FlagIcon } from "@/components/flag-icon";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLearnerChrome } from "@/lib/learner-chrome";
import { WORLD_MAP, levelFromXp } from "@/lib/map-art";
import { isExclusive, useProgress } from "@/lib/progress";
import type { Language } from "@/lib/types";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "Categorías", icon: MapPin },
  { to: "/daily", label: "Lecciones", icon: BookOpen },
  { to: "/stats", label: "Estadísticas", icon: BarChart3 },
  { to: "/board", label: "Marcador", icon: Trophy },
  { to: "/shop", label: "Comprar", icon: ShoppingBag },
] as const;

export function LearnerShell({
  children,
  languages,
}: {
  children: React.ReactNode;
  languages: Language[];
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const xp = useProgress((s) => s.xp);
  const streak = useProgress((s) => s.streak);
  const languageId = useProgress((s) => s.targetLanguageId);
  const setLanguage = useProgress((s) => s.setLanguage);
  const displayName = useProgress((s) => s.displayName);
  const exclusiveUntil = useProgress((s) => s.exclusiveUntil);
  const title = useLearnerChrome((s) => s.title);
  const current =
    languages.find((l) => l.id === languageId) ??
    languages.find((l) => l.code === "en") ??
    languages[0];
  const level = levelFromXp(xp);
  const bleed = pathname === "/" || pathname.startsWith("/category/");
  const hideMainDock = pathname.startsWith("/category/");
  const exclusive = isExclusive(exclusiveUntil);
  const initial = (displayName.trim()[0] || "R").toUpperCase();

  return (
    <div className="relative min-h-dvh overflow-x-hidden bg-sky text-white">
      {!bleed ? (
        <div
          className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-80"
          style={{ backgroundImage: `url(${WORLD_MAP})` }}
        />
      ) : null}
      {!bleed ? <div className="pointer-events-none absolute inset-0 bg-sky/45" /> : null}

      <header className="absolute inset-x-0 top-0 z-30 bg-gradient-to-b from-navy/70 via-navy/25 to-transparent">
        <div className="flex h-12 items-center justify-between gap-2 px-3 pt-1 sm:h-14 sm:px-5">
          <div className="flex min-w-0 items-center gap-2 text-[11px] sm:text-sm">
            <span className="relative flex size-8 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-sm font-bold">
              {initial}
              {exclusive ? (
                <Crown className="absolute -right-1 -top-1 size-3 text-gold" />
              ) : null}
            </span>
            <span className="hidden font-semibold sm:inline">Ruta</span>
            {current ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="flex items-center gap-1 rounded-full px-1 py-0.5 hover:bg-white/10"
                    aria-label="Cambiar idioma"
                  >
                    <FlagIcon code={current.code} />
                    <span className="hidden text-white/80 lg:inline">{current.name}</span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuLabel>Aprender</DropdownMenuLabel>
                  {languages
                    .filter((l) => l.isActive)
                    .map((lang) => (
                      <DropdownMenuItem key={lang.id} onClick={() => setLanguage(lang.id)}>
                        <FlagIcon code={lang.code} className="size-5" />
                        {lang.name}
                      </DropdownMenuItem>
                    ))}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
            <span className="hidden text-white/80 sm:inline">
              nivel {level}
              <span className="mx-1 text-white/40">|</span>
              {xp} puntos
              <span className="mx-1 text-white/40">|</span>
              {streak} días
            </span>
            <span className="tabular-nums text-white/85 sm:hidden">
              {xp} pts · {streak}d
            </span>
          </div>
          <p className="pointer-events-none absolute left-1/2 hidden -translate-x-1/2 font-semibold text-white text-shadow-label md:block">
            {title}
          </p>
          <div className="flex items-center gap-1 sm:gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-white hover:bg-white/15 hover:text-white"
              asChild
            >
              <a href="/settings">Ajustes</a>
            </Button>
            <Button
              size="sm"
              className="h-8 rounded-full bg-coral text-coral-foreground hover:bg-coral/90"
              asChild
            >
              <a href="/shop">
                <Crown className="size-3.5" />
                {exclusive ? "Activo" : "Exclusivo"}
              </a>
            </Button>
          </div>
        </div>
      </header>

      <main
        className={cn(
          "relative z-10",
          bleed ? "min-h-dvh" : "mx-auto w-full max-w-3xl px-4 pb-28 pt-20",
        )}
      >
        {bleed ? children : (
          <div className="rounded-3xl bg-card/95 p-5 text-card-foreground shadow-border sm:p-7">
            {children}
          </div>
        )}
      </main>

      {!hideMainDock ? (
        <nav className="fixed inset-x-0 bottom-4 z-30 flex justify-center px-3 pb-[env(safe-area-inset-bottom)]">
          <ul className="flex items-stretch gap-1 rounded-full bg-navy/92 px-2 py-1.5 text-white shadow-lg backdrop-blur-md sm:gap-2 sm:px-4">
            {NAV.map((item) => {
              const active =
                item.to === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.to);
              const Icon = item.icon;
              return (
                <li key={item.to}>
                  <a
                    href={item.to}
                    className={cn(
                      "flex min-h-12 min-w-14 flex-col items-center justify-center gap-0.5 rounded-full px-2 text-[10px] font-medium sm:min-w-16 sm:px-3 sm:text-[11px]",
                      active ? "text-white" : "text-white/55 hover:text-white",
                    )}
                  >
                    <Icon className={cn("size-5", active && "text-coral")} />
                    {item.label}
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>
      ) : null}
    </div>
  );
}
