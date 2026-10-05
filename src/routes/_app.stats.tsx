import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { NamedIcon } from "@/components/named-icon";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { listCategories, listLanguages, listLessons, listVocabulary } from "@/lib/server/queries";
import { lessonProgress, useProgress } from "@/lib/progress";
import { todayKey } from "@/lib/utils";

export const Route = createFileRoute("/_app/stats")({
  loader: async () => {
    const languages = await listLanguages();
    const preferred = languages.find((l) => l.code === "en") ?? languages[0];
    const languageId = preferred?.id;
    const [categories, lessons, vocab] = await Promise.all([
      listCategories({ data: { languageId } }),
      listLessons({ data: {} }),
      listVocabulary({ data: { languageId } }),
    ]);
    return { categories, lessons, vocab, languageId };
  },
  component: StatsPage,
});

function StatsPage() {
  const initial = Route.useLoaderData();
  const xp = useProgress((s) => s.xp);
  const streak = useProgress((s) => s.streak);
  const completed = useProgress((s) => s.completedLessons);
  const learned = useProgress((s) => s.learnedVocab);
  const xpLog = useProgress((s) => s.xpLog);
  const testsPassed = useProgress((s) => s.testsPassed);
  const storedId = useProgress((s) => s.targetLanguageId);
  const languageId = storedId ?? initial.languageId;

  const { data: categories = initial.categories } = useQuery({
    queryKey: ["categories", languageId],
    queryFn: () => listCategories({ data: { languageId: languageId ?? undefined } }),
    enabled: Boolean(languageId),
    initialData: languageId === initial.languageId ? initial.categories : undefined,
    staleTime: Infinity,
    refetchOnMount: false,
  });
  const { data: lessons = initial.lessons } = useQuery({
    queryKey: ["lessons"],
    queryFn: () => listLessons({ data: {} }),
    initialData: initial.lessons,
    staleTime: Infinity,
    refetchOnMount: false,
  });
  const { data: vocab = initial.vocab } = useQuery({
    queryKey: ["vocab-lang", languageId],
    queryFn: () => listVocabulary({ data: { languageId: languageId ?? undefined } }),
    enabled: Boolean(languageId),
    initialData: languageId === initial.languageId ? initial.vocab : undefined,
    staleTime: Infinity,
    refetchOnMount: false,
  });

  const langLessons = lessons.filter((l) => categories.some((c) => c.id === l.categoryId));
  const doneCount = langLessons.filter((l) => completed[String(l.id)]).length;
  const accuracy =
    Object.values(completed).reduce((acc, r) => acc + (r.total ? r.score / r.total : 0), 0) /
    Math.max(Object.keys(completed).length, 1);
  const mastered = Object.values(learned).filter((v) => v.strength >= 3).length;

  const chart = (() => {
    const days: { date: string; xp: number }[] = [];
    for (let i = 6; i >= 0; i -= 1) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = todayKey(d);
      days.push({
        date: key.slice(5),
        xp: xpLog.find((x) => x.date === key)?.xp ?? 0,
      });
    }
    return days;
  })();

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
          Progreso
        </p>
        <h1 className="font-display text-3xl font-medium">Tu bitácora</h1>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="p-5">
          <p className="text-sm text-muted-foreground">Racha</p>
          <p className="font-display text-3xl tabular-nums">{streak}</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-muted-foreground">XP</p>
          <p className="font-display text-3xl tabular-nums">{xp}</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-muted-foreground">Precisión</p>
          <p className="font-display text-3xl tabular-nums">{Math.round(accuracy * 100)}%</p>
        </Card>
      </div>
      <Card className="p-5">
        <h2 className="font-display text-lg">XP de la semana</h2>
        <div className="mt-4 h-48">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chart}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} width={28} />
              <Tooltip />
              <Area
                type="monotone"
                dataKey="xp"
                stroke="var(--color-primary)"
                fill="var(--color-accent)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>
      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="p-5">
          <p className="text-sm text-muted-foreground">Lecciones</p>
          <p className="font-display text-2xl tabular-nums">
            {doneCount} / {langLessons.length}
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-muted-foreground">Palabras fuertes</p>
          <p className="font-display text-2xl tabular-nums">
            {mastered} / {vocab.length}
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-muted-foreground">Pruebas</p>
          <p className="font-display text-2xl tabular-nums">{testsPassed}</p>
        </Card>
      </div>
      <div>
        <h2 className="font-display text-lg">Por categoría</h2>
        <ul className="mt-3 space-y-2">
          {categories.map((category) => {
            const ids = langLessons.filter((l) => l.categoryId === category.id).map((l) => l.id);
            const pct = lessonProgress(completed, ids);
            return (
              <li key={category.id}>
                <a
                  href={`/category/${category.id}`}
                  className="flex items-center gap-3 rounded-2xl bg-muted px-3 py-3"
                >
                  <span
                    className="flex size-9 items-center justify-center rounded-lg text-white"
                    style={{ backgroundColor: category.color }}
                  >
                    <NamedIcon name={category.icon} className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="truncate text-sm font-medium">{category.name}</p>
                      <span className="text-xs tabular-nums text-muted-foreground">{pct}%</span>
                    </div>
                    <Progress value={pct} className="mt-1.5 h-1.5" />
                  </div>
                </a>
              </li>
            );
          })}
        </ul>
      </div>
      <Button asChild className="rounded-full bg-coral text-coral-foreground hover:bg-coral/90">
        <a href="/daily">Seguir practicando</a>
      </Button>
    </div>
  );
}
