import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Flame, Medal, Star, Trophy } from "lucide-react";
import { listCmsUsers, listLessons } from "@/lib/server/queries";
import { levelFromXp } from "@/lib/map-art";
import { isExclusive, useProgress } from "@/lib/progress";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/board")({
  loader: async () => {
    const [lessons, roster] = await Promise.all([
      listLessons({ data: {} }),
      listCmsUsers(),
    ]);
    return { lessons, roster };
  },
  component: BoardPage,
});

function BoardPage() {
  const initial = Route.useLoaderData();
  const xp = useProgress((s) => s.xp);
  const streak = useProgress((s) => s.streak);
  const completed = useProgress((s) => s.completedLessons);
  const learned = useProgress((s) => s.learnedVocab);
  const testsPassed = useProgress((s) => s.testsPassed);
  const exclusiveUntil = useProgress((s) => s.exclusiveUntil);
  const displayName = useProgress((s) => s.displayName);
  const { data: lessons = initial.lessons } = useQuery({
    queryKey: ["lessons"],
    queryFn: () => listLessons({ data: {} }),
    initialData: initial.lessons,
    staleTime: Infinity,
    refetchOnMount: false,
  });
  const { data: roster = initial.roster } = useQuery({
    queryKey: ["cms-users"],
    queryFn: () => listCmsUsers(),
    initialData: initial.roster,
    staleTime: Infinity,
    refetchOnMount: false,
  });
  const done = Object.keys(completed).length;
  const words = Object.keys(learned).length;
  const level = levelFromXp(xp);
  const exclusive = isExclusive(exclusiveUntil);

  const rows = [
    { name: displayName || "Tú", xp, highlight: true },
    ...roster
      .filter((u) => u.isActive && u.alias !== displayName)
      .map((u) => ({ name: u.alias, xp: u.xp, highlight: false })),
  ].sort((a, b) => b.xp - a.xp);

  const badges = [
    { id: "first", title: "Primer paso", hint: "Completa una lección", done: done >= 1 },
    { id: "five", title: "Ritmo", hint: "5 lecciones", done: done >= 5 },
    { id: "ten", title: "Camino largo", hint: "10 lecciones", done: done >= 10 },
    { id: "streak3", title: "Constancia", hint: "3 días seguidos", done: streak >= 3 },
    { id: "streak7", title: "Semana de fuego", hint: "7 días de racha", done: streak >= 7 },
    { id: "words", title: "Léxico", hint: "20 palabras", done: words >= 20 },
    { id: "level3", title: "Nivel 3", hint: "Llega al nivel 3", done: level >= 3 },
    { id: "test", title: "Examinado", hint: "Aprueba una prueba", done: testsPassed >= 1 },
    { id: "exclusive", title: "Exclusivo", hint: "Activa el plan", done: exclusive },
  ];

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
          Marcador
        </p>
        <h1 className="font-display text-3xl font-medium">Tu ranking</h1>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Stat icon={Trophy} label="Nivel" value={String(level)} />
        <Stat icon={Star} label="Puntos" value={String(xp)} />
        <Stat icon={Flame} label="Racha" value={`${streak}d`} />
      </div>
      <p className="text-sm text-muted-foreground">
        {done} lecciones hechas de {lessons.length} en el catálogo.
      </p>
      <ol className="space-y-2">
        {rows.map((row, i) => (
          <li
            key={`${row.name}-${i}`}
            className={cn(
              "flex items-center justify-between rounded-2xl px-4 py-3",
              row.highlight ? "bg-coral/15 text-foreground" : "bg-muted",
            )}
          >
            <span className="flex items-center gap-3">
              <span className="w-6 tabular-nums text-muted-foreground">{i + 1}</span>
              <span className="font-medium">{row.name}</span>
            </span>
            <span className="tabular-nums font-semibold">{row.xp} pts</span>
          </li>
        ))}
      </ol>
      <div>
        <h2 className="font-display text-lg">Logros</h2>
        <ul className="mt-3 grid grid-cols-3 gap-2">
          {badges.map((badge) => (
            <li
              key={badge.id}
              className={cn(
                "rounded-2xl px-2 py-3 text-center",
                badge.done ? "bg-coral/15" : "bg-muted opacity-60",
              )}
            >
              <Medal className={cn("mx-auto size-5", badge.done ? "text-coral" : "text-muted-foreground")} />
              <p className="mt-1 text-xs font-semibold leading-tight">{badge.title}</p>
              <p className="mt-0.5 text-[10px] text-muted-foreground">{badge.hint}</p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Trophy;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl bg-muted p-4 text-center">
      <Icon className="mx-auto size-4 text-coral" />
      <p className="mt-2 font-display text-2xl tabular-nums">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
