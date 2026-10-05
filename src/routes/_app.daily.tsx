import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Check,
  Ear,
  Flame,
  MessageCircle,
  Sparkles,
} from "lucide-react";
import { ListenDrill } from "@/components/learn/listen-drill";
import { VocabQuiz } from "@/components/learn/vocab-quiz";
import { NamedIcon } from "@/components/named-icon";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { listCategories, listLanguages, listLessons, listVocabulary } from "@/lib/server/queries";
import { lessonProgress, useProgress } from "@/lib/progress";
import { cn, todayKey } from "@/lib/utils";

const TABS = [
  { id: "hoy", label: "Hoy" },
  { id: "catalogo", label: "Catálogo" },
  { id: "conversar", label: "Conversar" },
  { id: "palabras", label: "Palabras" },
  { id: "pruebas", label: "Pruebas" },
  { id: "escuchar", label: "Escuchar" },
] as const;

type DailyTab = (typeof TABS)[number]["id"];

function isDailyTab(value: unknown): value is DailyTab {
  return TABS.some((tab) => tab.id === value);
}

const WEEKDAYS = ["L", "M", "X", "J", "V", "S", "D"];

export const Route = createFileRoute("/_app/daily")({
  validateSearch: (search: Record<string, unknown>): { tab?: DailyTab } => ({
    tab: isDailyTab(search.tab) ? search.tab : undefined,
  }),
  loader: async () => {
    const languages = await listLanguages();
    const preferred = languages.find((l) => l.code === "en") ?? languages[0];
    const languageId = preferred?.id;
    const [categories, lessons, vocab] = await Promise.all([
      listCategories({ data: { languageId } }),
      listLessons({ data: {} }),
      listVocabulary({ data: { languageId } }),
    ]);
    return { languages, categories, lessons, vocab, languageId };
  },
  component: DailyPage,
});

function DailyPage() {
  const search = Route.useSearch();
  const [tab, setTab] = useState<DailyTab>(search.tab ?? "hoy");
  const initial = Route.useLoaderData();
  const storedId = useProgress((s) => s.targetLanguageId);
  const languageId = storedId ?? initial.languageId;
  const completed = useProgress((s) => s.completedLessons);
  const streak = useProgress((s) => s.streak);
  const xpLog = useProgress((s) => s.xpLog);
  const learned = useProgress((s) => s.learnedVocab);

  const { data: languages = initial.languages } = useQuery({
    queryKey: ["languages"],
    queryFn: () => listLanguages(),
    initialData: initial.languages,
    staleTime: Infinity,
    refetchOnMount: false,
  });
  const language = languages.find((l) => l.id === languageId) ?? languages[0];

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
  const next = langLessons.find((l) => !completed[String(l.id)]);
  const cat = categories.find((c) => c.id === next?.categoryId);
  const doneToday = Object.values(completed).some(
    (r) => r.completedAt.slice(0, 10) === new Date().toISOString().slice(0, 10),
  );
  const conversations = langLessons.filter((l) => l.lessonType === "conversation");

  const week = (() => {
    const days: { key: string; label: string; xp: number; isToday: boolean }[] = [];
    for (let i = 6; i >= 0; i -= 1) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = todayKey(d);
      const dow = (d.getDay() + 6) % 7;
      days.push({
        key,
        label: WEEKDAYS[dow],
        xp: xpLog.find((x) => x.date === key)?.xp ?? 0,
        isToday: i === 0,
      });
    }
    return days;
  })();

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
          Lecciones
        </p>
        <h1 className="font-display text-3xl font-medium">Tu práctica</h1>
      </div>

      <div className="-mx-1 flex gap-1 overflow-x-auto pb-1">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={cn(
              "min-h-10 shrink-0 rounded-full px-3.5 text-sm font-medium",
              tab === item.id
                ? "bg-coral text-coral-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === "hoy" ? (
        <div className="space-y-4">
          <div className="flex items-center gap-3 rounded-2xl bg-muted p-4">
            <div className="flex size-12 items-center justify-center rounded-full bg-coral/15 text-coral">
              <Flame className="size-6" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Racha actual</p>
              <p className="font-display text-3xl tabular-nums">{streak} días</p>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-1.5">
            {week.map((day) => (
              <div key={day.key} className="text-center">
                <p className="text-[10px] font-medium text-muted-foreground">{day.label}</p>
                <span
                  className={cn(
                    "mt-1 inline-flex size-8 items-center justify-center rounded-full text-xs font-semibold",
                    day.xp > 0
                      ? "bg-coral text-coral-foreground"
                      : day.isToday
                        ? "border border-coral text-coral"
                        : "bg-muted text-muted-foreground",
                  )}
                >
                  {day.xp > 0 ? <Check className="size-3.5" /> : null}
                </span>
              </div>
            ))}
          </div>
          {next ? (
            <div className="rounded-2xl border border-border p-5">
              <p className="text-sm text-muted-foreground">
                {doneToday
                  ? "Ya practicaste hoy. Si quieres, adelanta la siguiente lección."
                  : "Una lección corta desbloquea el día."}
              </p>
              <h2 className="mt-2 font-display text-xl">{next.name}</h2>
              <p className="text-sm text-muted-foreground">
                {cat?.name} · {next.estimatedMinutes} min · {next.questionCount ?? 0} ejercicios
              </p>
              <Button asChild className="mt-5 w-full rounded-full bg-coral text-coral-foreground hover:bg-coral/90" size="lg">
                <a href={`/lesson/${next.id}`}>
                  Empezar ahora
                  <ArrowRight className="size-4" />
                </a>
              </Button>
            </div>
          ) : (
            <div className="rounded-2xl border border-border p-5">
              <p className="text-sm text-muted-foreground">
                Completaste el camino de este idioma. Repasa para no olvidar.
              </p>
              <Button asChild className="mt-5 w-full rounded-full" size="lg">
                <a href="/review">Ir al repaso</a>
              </Button>
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="outline"
              className="h-auto rounded-2xl py-3"
              onClick={() => setTab("pruebas")}
            >
              <Sparkles className="size-4" />
              Prueba rápida
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-auto rounded-2xl py-3"
              onClick={() => setTab("escuchar")}
            >
              <Ear className="size-4" />
              Escuchar
            </Button>
          </div>
        </div>
      ) : null}

      {tab === "catalogo" ? (
        <ul className="space-y-2">
          {categories.map((category) => {
            const ids = langLessons.filter((l) => l.categoryId === category.id).map((l) => l.id);
            const pct = lessonProgress(completed, ids);
            const done = ids.filter((id) => completed[String(id)]).length;
            return (
              <li key={category.id}>
                <a
                  href={`/category/${category.id}`}
                  className="flex items-center gap-3 rounded-2xl bg-muted px-4 py-3 hover:bg-secondary"
                >
                  <span
                    className="flex size-10 items-center justify-center rounded-xl text-white"
                    style={{ backgroundColor: category.color }}
                  >
                    <NamedIcon name={category.icon} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{category.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {done}/{ids.length || 0} lecciones
                    </p>
                    <Progress value={pct} className="mt-1.5 h-1.5" />
                  </div>
                </a>
              </li>
            );
          })}
        </ul>
      ) : null}

      {tab === "conversar" ? (
        <div className="space-y-3">
          <a
            href="/chat"
            className="flex items-center gap-3 rounded-2xl bg-navy px-4 py-4 text-white"
          >
            <span className="flex size-10 items-center justify-center rounded-xl bg-gold text-navy">
              <MessageCircle className="size-5" />
            </span>
            <div className="flex-1">
              <p className="font-semibold">Chatbot</p>
              <p className="text-sm text-white/70">Habla en escenas reales</p>
            </div>
            <ArrowRight className="size-4 opacity-70" />
          </a>
          {conversations.map((lesson) => (
            <a
              key={lesson.id}
              href={`/lesson/${lesson.id}`}
              className="flex items-center justify-between rounded-2xl bg-muted px-4 py-3"
            >
              <div>
                <p className="font-medium">{lesson.name}</p>
                <p className="text-xs text-muted-foreground">{lesson.categoryName}</p>
              </div>
              <span className="text-sm font-medium text-coral">
                {completed[String(lesson.id)] ? "Repetir" : "Iniciar"}
              </span>
            </a>
          ))}
        </div>
      ) : null}

      {tab === "palabras" ? (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {Object.keys(learned).length} de {vocab.length} palabras tocadas
          </p>
          <Button asChild className="w-full rounded-full bg-coral text-coral-foreground hover:bg-coral/90">
            <a href="/review">Repasar tarjetas</a>
          </Button>
          <ul className="max-h-80 space-y-1.5 overflow-y-auto">
            {vocab.slice(0, 24).map((item) => {
              const mem = learned[String(item.id)];
              return (
                <li
                  key={item.id}
                  className="flex items-center justify-between rounded-xl bg-muted px-3 py-2.5"
                >
                  <div>
                    <p className="font-medium">{item.term}</p>
                    <p className="text-xs text-muted-foreground">{item.translation}</p>
                  </div>
                  <span className="text-[10px] tabular-nums text-muted-foreground">
                    {mem ? `${mem.strength}/5` : "nueva"}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      {tab === "pruebas" ? <VocabQuiz vocab={vocab} /> : null}

      {tab === "escuchar" ? (
        <ListenDrill vocab={vocab} langCode={language?.code ?? "en"} />
      ) : null}
    </div>
  );
}
