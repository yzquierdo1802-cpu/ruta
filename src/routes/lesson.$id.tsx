import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Volume2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { getLessonPlay } from "@/lib/server/queries";
import { useProgress } from "@/lib/progress";
import type { Question } from "@/lib/types";
import { cn, normalizeAnswer, speak, speechLang } from "@/lib/utils";

export const Route = createFileRoute("/lesson/$id")({
  loader: async ({ params }) => {
    const lessonId = Number(params.id);
    if (!Number.isFinite(lessonId)) return { lessonId, play: null };
    const play = await getLessonPlay({ data: { lessonId } });
    return { lessonId, play };
  },
  component: LessonPage,
});

type Phase = "intro" | "play" | "done";

const TYPE_LABEL: Record<string, string> = {
  multiple_choice: "Elige",
  translation: "Traduce",
  listen: "Escucha",
  fill_blank: "Completa",
  type_answer: "Escribe",
  true_false: "Verdadero o falso",
  conversation: "Conversación",
};

function LessonPage() {
  const { id } = Route.useParams();
  const lessonId = Number(id);
  const initial = Route.useLoaderData();
  const loaderPlay = initial.lessonId === lessonId ? initial.play : null;
  const { data, isPending, isError } = useQuery({
    queryKey: ["lesson-play", lessonId],
    queryFn: () => getLessonPlay({ data: { lessonId } }),
    enabled: Number.isFinite(lessonId) && !loaderPlay,
    initialData: loaderPlay ?? undefined,
    staleTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    retry: false,
  });
  const play = data ?? loaderPlay;

  const completeLesson = useProgress((s) => s.completeLesson);
  const markVocab = useProgress((s) => s.markVocab);

  const [phase, setPhase] = useState<Phase>("play");
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [typed, setTyped] = useState("");
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const [score, setScore] = useState(0);
  const [xp, setXp] = useState(0);
  const lock = useRef(false);
  const busy = useRef(false);
  const advanceRef = useRef<() => void>(() => {});

  const questions = play?.questions ?? [];
  const question = questions[index];
  const lang = speechLang(play?.language.code ?? "en");
  const answers = question?.answers ?? [];

  function correctAnswers(q: Question): string[] {
    return (q.answers ?? []).filter((a) => a.isCorrect).map((a) => a.answerText);
  }

  function isRight(q: Question, value: string): boolean {
    const answers = correctAnswers(q);
    const n = normalizeAnswer(value);
    return answers.some((a) => normalizeAnswer(a) === n);
  }

  function submit(value: string) {
    if (!question || feedback || lock.current) return;
    lock.current = true;
    const ok = isRight(question, value);
    setSelected(value);
    setFeedback(ok ? "correct" : "wrong");
    if (ok) {
      setScore((s) => s + 1);
      setXp((x) => x + question.points);
    }
  }

  function next() {
    if (!question || busy.current) return;
    busy.current = true;
    const last = index >= questions.length - 1;
    if (last) {
      const total = questions.length;
      completeLesson(lessonId, {
        score,
        total,
        xp: Math.max(xp, score * 8),
      });
      for (const v of play?.vocabulary ?? []) {
        markVocab(v.id, true);
      }
      setPhase("done");
      return;
    }
    lock.current = false;
    setIndex((i) => i + 1);
    setSelected(null);
    setTyped("");
    setFeedback(null);
  }

  advanceRef.current = next;

  useEffect(() => {
    busy.current = false;
  }, [index, phase]);

  useEffect(() => {
    if (phase !== "play" || !feedback) return;
    const wait = feedback === "correct" ? 850 : 1400;
    const timer = window.setTimeout(() => advanceRef.current(), wait);
    const node = document.getElementById("lesson-next");
    node?.scrollIntoView({ block: "nearest" });
    return () => window.clearTimeout(timer);
  }, [feedback, phase, question?.id]);

  useEffect(() => {
    if (phase !== "play" || question?.questionType !== "listen" || !question.audioText) return;
    const timer = window.setTimeout(() => speak(question.audioText, lang), 280);
    return () => window.clearTimeout(timer);
  }, [phase, question?.id, question?.questionType, question?.audioText, lang]);

  if ((isPending || !play) && !isError) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background text-muted-foreground">
        Cargando lección…
      </div>
    );
  }

  if (!play) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-3 bg-background px-4 text-center">
        <p>No encontramos esa lección o sus preguntas.</p>
        <Button asChild>
          <a href="/">Volver</a>
        </Button>
      </div>
    );
  }

  if (phase === "intro") {
    return (
      <div className="mx-auto flex min-h-svh max-w-lg flex-col bg-background px-4 py-6">
        <a href={`/category/${play.category.id}`} className="self-start text-sm text-muted-foreground">
          Cerrar
        </a>
        <p className="mt-8 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
          {play.category.name}
        </p>
        <h1 className="mt-2 font-display text-3xl font-medium">{play.lesson.name}</h1>
        <p className="mt-2 text-muted-foreground">{play.lesson.description}</p>
        {play.vocabulary.length > 0 ? (
          <div className="mt-4 space-y-2">
            {play.vocabulary.map((v) => (
              <div key={v.id} className="flex items-center justify-between rounded-xl bg-card px-4 py-3 shadow-border">
                <div>
                  <p className="font-medium">{v.term}</p>
                  <p className="text-sm text-muted-foreground">{v.translation}</p>
                </div>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={() => speak(v.term, lang)}
                  aria-label={`Escuchar ${v.term}`}
                >
                  <Volume2 className="size-4" />
                </Button>
              </div>
            ))}
          </div>
        ) : null}
        <Button
          className="mt-4 shrink-0 rounded-full bg-coral text-coral-foreground hover:bg-coral/90"
          size="lg"
          onClick={() => setPhase("play")}
          disabled={!questions.length}
        >
          {questions.length ? `Empezar ${questions.length} ejercicios` : "Sin preguntas todavía"}
        </Button>
      </div>
    );
  }

  if (phase === "done") {
    const total = questions.length || 1;
    const pct = Math.round((score / total) * 100);
    return (
      <div className="mx-auto flex min-h-svh max-w-lg flex-col items-center justify-center bg-background px-4 text-center">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
          Lección completa
        </p>
        <h1 className="mt-2 font-display text-4xl font-medium">Bien hecho</h1>
        <p className="mt-3 text-muted-foreground">
          {score} de {questions.length} correctas · +{xp} XP
        </p>
        <div className="mt-6 h-2 w-48 overflow-hidden rounded-full bg-muted">
          <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
        </div>
        <div className="mt-8 flex w-full flex-col gap-2">
          <Button asChild size="lg">
            <a href={`/category/${play.category.id}`}>Seguir el camino</a>
          </Button>
          <Button variant="outline" asChild>
            <a href="/">Inicio</a>
          </Button>
        </div>
      </div>
    );
  }

  if (!question) {
    return (
      <div className="mx-auto flex min-h-svh max-w-lg flex-col items-center justify-center gap-3 bg-background px-4 text-center">
        <p>Esta lección no tiene preguntas.</p>
        <Button asChild>
          <a href={`/category/${play.category.id}`}>Volver</a>
        </Button>
      </div>
    );
  }

  const prompt = question.prompt;
  const native = question.promptNative ?? "";
  const typedMode =
    question.questionType === "type_answer" ||
    (question.questionType === "fill_blank" && answers.every((a) => a.isCorrect));
  const kicker = TYPE_LABEL[question.questionType] ?? "Pregunta";

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col bg-background px-4 py-3 pb-24">
      <div className="flex items-center gap-3">
        <a href={`/category/${play.category.id}`} className="shrink-0 text-sm text-muted-foreground">
          Salir
        </a>
        <Progress value={((index + (feedback ? 1 : 0)) / Math.max(questions.length, 1)) * 100} />
        <span className="tabular-nums text-xs text-muted-foreground">
          {index + 1}/{questions.length}
        </span>
      </div>

      <p className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-coral">{kicker}</p>
      <p className="mt-1 text-sm text-muted-foreground">{native}</p>
      <div className="mt-2 flex items-start gap-2">
        <h2 className="font-display text-2xl font-medium leading-snug">{prompt}</h2>
        {question.audioText && question.questionType !== "listen" ? (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={() => speak(question.audioText, lang)}
            aria-label="Escuchar"
          >
            <Volume2 className="size-5" />
          </Button>
        ) : null}
      </div>

      {question.questionType === "listen" && question.audioText ? (
        <button
          type="button"
          className="mt-4 flex min-h-16 w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-navy text-lg font-bold text-white"
          onClick={() => speak(question.audioText, lang)}
        >
          <Volume2 className="size-6" />
          Reproducir audio
        </button>
      ) : null}

      {typedMode && !feedback ? (
        <form
          className="mt-6 flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            submit(typed);
          }}
        >
          <Input
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder="Escribe tu respuesta"
            autoFocus
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            className="h-14 text-lg"
          />
          <Button
            type="submit"
            disabled={!typed.trim()}
            className="h-14 rounded-full bg-coral text-base font-bold text-coral-foreground hover:bg-coral/90"
          >
            Comprobar
          </Button>
        </form>
      ) : null}

      {!typedMode && answers.length ? (
        <div className="mt-6 grid gap-2">
          {answers.map((opt) => {
            const chosen = selected === opt.answerText;
            const showCorrect = Boolean(feedback) && opt.isCorrect;
            const showWrong = Boolean(feedback) && chosen && !opt.isCorrect;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => submit(opt.answerText)}
                className={cn(
                  "min-h-14 w-full cursor-pointer touch-manipulation select-none rounded-xl border bg-card px-4 py-3 text-left text-base font-semibold shadow-border",
                  showCorrect && "border-primary bg-accent text-accent-foreground",
                  showWrong && "border-destructive bg-destructive/10",
                  !feedback && "hover:bg-muted active:bg-muted",
                )}
              >
                {opt.answerText}
              </button>
            );
          })}
        </div>
      ) : null}

      {!typedMode && !feedback && !answers.length ? (
        <p className="mt-6 text-sm text-muted-foreground">Esta pregunta todavía no tiene respuestas.</p>
      ) : null}

      {feedback ? (
        <div
          id="lesson-next"
          className={cn(
            "mt-6 rounded-2xl border bg-card p-4",
            feedback === "correct" ? "border-primary" : "border-destructive",
          )}
        >
          <p className="text-lg font-bold">
            {feedback === "correct" ? "Correcto" : "Casi"}
          </p>
          {selected ? (
            <p className="mt-1 text-sm">
              Tu respuesta: <span className="font-semibold">{selected}</span>
            </p>
          ) : null}
          {feedback === "wrong" ? (
            <p className="mt-1 text-sm text-muted-foreground">
              Respuesta: {correctAnswers(question).join(" / ")}
            </p>
          ) : null}
          {question.explanation ? (
            <p className="mt-1 text-sm text-muted-foreground">{question.explanation}</p>
          ) : null}
          <button
            type="button"
            className="mt-4 flex h-14 w-full cursor-pointer touch-manipulation items-center justify-center gap-2 rounded-full bg-coral text-base font-bold text-coral-foreground"
            onClick={next}
          >
            {index >= questions.length - 1 ? "Ver resultado" : "Siguiente"}
            <ArrowRight className="size-4" />
          </button>
        </div>
      ) : null}
    </div>
  );
}
