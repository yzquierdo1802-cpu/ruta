import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  BookOpen,
  ChevronLeft,
  ListChecks,
  MessageCircle,
  Volume2,
} from "lucide-react";
import { VocabQuiz } from "@/components/learn/vocab-quiz";
import { Button } from "@/components/ui/button";
import { artFor, lessonKicker, lessonSubtitle } from "@/lib/map-art";
import { useLearnerChrome } from "@/lib/learner-chrome";
import { listCategories, listLessons, listVocabulary } from "@/lib/server/queries";
import { useProgress } from "@/lib/progress";
import { cn, speak, speechLang } from "@/lib/utils";

export const Route = createFileRoute("/_app/category/$id")({
  loader: async ({ params }) => {
    const categoryId = Number(params.id);
    if (!Number.isFinite(categoryId)) {
      return { categoryId, category: null, lessons: [], vocab: [] };
    }
    const [categories, lessons, vocab] = await Promise.all([
      listCategories({ data: {} }),
      listLessons({ data: { categoryId } }),
      listVocabulary({ data: { categoryId } }),
    ]);
    const category = categories.find((c) => c.id === categoryId) ?? null;
    return { categoryId, category, lessons, vocab };
  },
  component: CategoryPage,
});

type Tab = "lesson" | "conversation" | "vocab" | "quiz";

const TABS: { id: Tab; label: string; icon: typeof BookOpen }[] = [
  { id: "lesson", label: "Lección", icon: BookOpen },
  { id: "conversation", label: "Conversación", icon: MessageCircle },
  { id: "vocab", label: "Vocabulario", icon: BookOpen },
  { id: "quiz", label: "Prueba", icon: ListChecks },
];

function CategoryPage() {
  const { id } = Route.useParams();
  const initial = Route.useLoaderData();
  const categoryId = Number(id);
  const completed = useProgress((s) => s.completedLessons);
  const setTitle = useLearnerChrome((s) => s.setTitle);
  const [tab, setTab] = useState<Tab>("lesson");

  const { data: lessons = initial.lessons } = useQuery({
    queryKey: ["lessons", categoryId],
    queryFn: () => listLessons({ data: { categoryId } }),
    enabled: Number.isFinite(categoryId),
    initialData: initial.categoryId === categoryId ? initial.lessons : undefined,
    staleTime: Infinity,
    refetchOnMount: false,
  });

  const { data: vocab = initial.vocab } = useQuery({
    queryKey: ["vocab", categoryId],
    queryFn: () => listVocabulary({ data: { categoryId } }),
    enabled: Number.isFinite(categoryId),
    initialData: initial.categoryId === categoryId ? initial.vocab : undefined,
    staleTime: Infinity,
    refetchOnMount: false,
  });

  const category = initial.category;
  const art = artFor(category?.icon);

  useEffect(() => {
    setTitle(category?.name ?? "");
    return () => setTitle("");
  }, [category?.name, setTitle]);

  useEffect(() => {
    setTab("lesson");
  }, [categoryId]);

  const numbered = lessons.filter((l) => l.lessonType !== "conversation");
  const conversations = lessons.filter((l) => l.lessonType === "conversation");

  return (
    <div className="relative min-h-svh">
      <div
        className="pointer-events-none absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${art.scene})` }}
      />
      <div className="pointer-events-none absolute inset-0 bg-navy/45" />

      <div className="relative z-20 px-4 pb-28 pt-16">
        <button
          type="button"
          onClick={() => {
            window.location.assign("/");
          }}
          className="mb-3 flex size-11 items-center justify-center rounded-full bg-coral text-coral-foreground shadow-md"
          aria-label="Volver al mapa"
        >
          <ChevronLeft className="size-5" />
        </button>
        <h1 className="text-center text-xl font-bold text-white text-shadow-label">
          {category?.name ?? "Categoría"}
        </h1>
        {category?.description ? (
          <p className="mx-auto mt-1 max-w-lg text-center text-sm text-white/85 text-shadow-label">
            {category.description}
          </p>
        ) : null}

        <div className="mx-auto mt-5 w-full max-w-lg">
        {tab === "lesson" ? (
          numbered.length || conversations.length ? (
            <ul className="flex flex-col gap-2">
              {numbered.map((lesson, index) => {
                const done = Boolean(completed[String(lesson.id)]);
                return (
                  <li key={lesson.id}>
                    <a
                      href={`/lesson/${lesson.id}`}
                      className="flex min-h-16 w-full items-center justify-between gap-3 rounded-2xl bg-navy/90 px-4 py-3 text-left text-white shadow-lg"
                    >
                      <span className="min-w-0">
                        <span className="block font-bold">{lessonKicker(lesson.lessonType, index)}</span>
                        <span className="block truncate text-sm text-white/70">
                          {lessonSubtitle(lesson.description, lesson.name)}
                        </span>
                      </span>
                      <span className="inline-flex h-11 shrink-0 items-center rounded-full bg-coral px-4 text-sm font-semibold text-coral-foreground">
                        {done ? "Repetir" : "Iniciar"}
                      </span>
                    </a>
                  </li>
                );
              })}
              {conversations.map((lesson) => (
                <li key={lesson.id}>
                  <a
                    href={`/lesson/${lesson.id}`}
                    className="flex min-h-16 w-full items-center justify-between gap-3 rounded-2xl bg-navy/90 px-4 py-3 text-left text-white shadow-lg"
                  >
                    <span className="min-w-0">
                      <span className="block font-bold">Conversación</span>
                      <span className="block truncate text-sm text-white/70">{category?.name ?? "Diálogo"}</span>
                    </span>
                    <span className="inline-flex h-11 shrink-0 items-center rounded-full bg-coral px-4 text-sm font-semibold text-coral-foreground">
                      Iniciar
                    </span>
                  </a>
                </li>
              ))}
              <li>
                <button
                  type="button"
                  onClick={() => setTab("vocab")}
                  className="flex min-h-16 w-full items-center justify-between gap-3 rounded-2xl bg-navy/90 px-4 py-3 text-left text-white shadow-lg"
                >
                  <span className="min-w-0">
                    <span className="block font-bold">Vocabulario</span>
                    <span className="block truncate text-sm text-white/70">Repasa las palabras aprendidas</span>
                  </span>
                  <span className="inline-flex h-11 shrink-0 items-center rounded-full bg-coral px-4 text-sm font-semibold text-coral-foreground">
                    Abrir
                  </span>
                </button>
              </li>
            </ul>
          ) : (
            <p className="pt-6 text-center text-white text-shadow-label">
              Esta categoría aún no tiene lecciones.
            </p>
          )
        ) : null}

        {tab === "conversation" ? (
          <ul className="flex flex-col gap-2">
            <li>
              <a
                href="/chat"
                className="flex min-h-16 w-full items-center justify-between gap-3 rounded-2xl bg-navy/90 px-4 py-3 text-white shadow-lg"
              >
                <span>
                  <span className="block font-bold">Chatbot</span>
                  <span className="block text-sm text-white/70">Habla en esta escena</span>
                </span>
                <span className="inline-flex h-11 items-center rounded-full bg-coral px-4 text-sm font-semibold text-coral-foreground">
                  Abrir
                </span>
              </a>
            </li>
            {conversations.map((lesson) => (
              <li key={lesson.id}>
                <a
                  href={`/lesson/${lesson.id}`}
                  className="flex min-h-16 w-full items-center justify-between gap-3 rounded-2xl bg-navy/90 px-4 py-3 text-white shadow-lg"
                >
                  <span>
                    <span className="block font-bold">Conversación</span>
                    <span className="block text-sm text-white/70">{category?.name ?? "Diálogo"}</span>
                  </span>
                  <span className="inline-flex h-11 items-center rounded-full bg-coral px-4 text-sm font-semibold text-coral-foreground">
                    Iniciar
                  </span>
                </a>
              </li>
            ))}
          </ul>
        ) : null}

        {tab === "vocab" ? <VocabPanel vocab={vocab} /> : null}

        {tab === "quiz" ? (
          <div className="w-full">
            <VocabQuiz vocab={vocab} tone="glass" />
          </div>
        ) : null}
        </div>
      </div>

      <nav className="fixed inset-x-0 bottom-4 z-30 flex justify-center px-3 pb-[env(safe-area-inset-bottom)]">
        <ul className="flex items-stretch gap-1 rounded-full bg-navy/92 px-3 py-1.5 text-white shadow-lg backdrop-blur-md sm:gap-2 sm:px-5">
          {TABS.map((item) => {
            const Icon = item.icon;
            const active = tab === item.id;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => setTab(item.id)}
                  className={cn(
                    "flex min-h-12 min-w-16 flex-col items-center justify-center gap-0.5 rounded-full px-3 text-[10px] font-medium sm:text-[11px]",
                    active ? "text-white" : "text-white/55 hover:text-white",
                  )}
                >
                  <Icon className={cn("size-5", active && "text-coral")} />
                  {item.label}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}

function VocabPanel({
  vocab,
}: {
  vocab: { id: number; term: string; translation: string; phonetic: string }[];
}) {
  if (!vocab.length) {
    return (
      <p className="mx-auto px-6 pt-8 text-center text-white text-shadow-label">
        Todavía no hay palabras en esta categoría.
      </p>
    );
  }
  return (
    <ul className="mx-auto grid w-full max-w-2xl gap-2 px-4 pb-4 sm:grid-cols-2">
      {vocab.map((item) => (
        <li
          key={item.id}
          className="flex items-center justify-between rounded-2xl bg-navy/70 px-4 py-3 text-white backdrop-blur-sm"
        >
          <div>
            <p className="font-semibold">{item.term}</p>
            <p className="text-sm text-white/70">{item.translation}</p>
          </div>
          <Button
            type="button"
            size="icon"
            className="text-white hover:bg-white/10 hover:text-white"
            variant="ghost"
            aria-label={`Escuchar ${item.term}`}
            onClick={() => speak(item.term, speechLang("en"))}
          >
            <Volume2 className="size-4" />
          </Button>
        </li>
      ))}
    </ul>
  );
}
