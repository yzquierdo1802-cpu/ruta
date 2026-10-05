import { useEffect, useMemo, useRef, useState } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useProgress } from "@/lib/progress";
import { cn, shuffle } from "@/lib/utils";

export function VocabQuiz({
  vocab,
  tone = "light",
  onDone,
}: {
  vocab: { id: number; term: string; translation: string }[];
  tone?: "light" | "glass";
  onDone?: (score: number, total: number) => void;
}) {
  const markVocab = useProgress((s) => s.markVocab);
  const passTest = useProgress((s) => s.passTest);
  const vocabKey = vocab.map((v) => v.id).join(",");
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const deck = useMemo(() => {
    const source = mounted ? shuffle(vocab) : vocab;
    return source.slice(0, 8);
  }, [vocabKey, mounted, vocab]);
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const lock = useRef(false);
  const busy = useRef(false);
  const glass = tone === "glass";

  const current = deck[index];
  const options = useMemo(() => {
    if (!current) return [];
    const others = vocab.filter((v) => v.id !== current.id).slice(0, 3);
    const pool = mounted ? shuffle([current, ...shuffle(others)]) : [current, ...others];
    return pool.map((v) => v.translation);
  }, [current, mounted, vocab]);

  if (!vocab.length) {
    return (
      <p className={cn("text-center text-sm", glass ? "text-white/80" : "text-muted-foreground")}>
        Completa una lección para desbloquear esta prueba.
      </p>
    );
  }

  if (done) {
    return (
      <div
        className={cn(
          "rounded-3xl px-6 py-10 text-center",
          glass ? "bg-navy/75 text-white backdrop-blur-sm" : "bg-muted",
        )}
      >
        <Check className="mx-auto size-10 text-coral" />
        <h2 className="mt-3 text-2xl font-bold">Prueba lista</h2>
        <p className={cn("mt-2", glass ? "text-white/75" : "text-muted-foreground")}>
          {score} de {deck.length} correctas
        </p>
        <Button
          className="mt-6 rounded-full bg-coral text-coral-foreground hover:bg-coral/90"
          onClick={() => {
            setIndex(0);
            setPicked(null);
            setScore(0);
            setDone(false);
          }}
        >
          Repetir
        </Button>
      </div>
    );
  }

  function choose(value: string) {
    if (!current || picked || lock.current) return;
    lock.current = true;
    const ok = value === current.translation;
    setPicked(value);
    if (ok) {
      setScore((s) => s + 1);
      markVocab(current.id, true);
    } else {
      markVocab(current.id, false);
    }
  }

  function next() {
    if (busy.current) return;
    busy.current = true;
    lock.current = false;
    if (index >= deck.length - 1) {
      passTest(score * 8);
      onDone?.(score, deck.length);
      setDone(true);
      return;
    }
    setIndex((i) => i + 1);
    setPicked(null);
    queueMicrotask(() => {
      busy.current = false;
    });
  }

  return (
    <div className={cn(glass && "rounded-3xl bg-navy/75 px-5 py-6 text-white backdrop-blur-sm")}>
      <p
        className={cn(
          "text-xs font-medium uppercase tracking-widest",
          glass ? "text-white/60" : "text-muted-foreground",
        )}
      >
        Prueba · {index + 1}/{deck.length}
      </p>
      <h2 className="mt-3 text-3xl font-bold">{current?.term}</h2>
      <p className={cn("mt-1 text-sm", glass ? "text-white/70" : "text-muted-foreground")}>
        ¿Qué significa?
      </p>
      <div className="mt-5 grid gap-2">
        {options.map((opt) => {
          const selected = picked === opt;
          const correct = opt === current?.translation;
          return (
            <button
              key={opt}
              type="button"
              onClick={() => choose(opt)}
              className={cn(
                "min-h-14 w-full cursor-pointer touch-manipulation rounded-2xl px-4 py-3 text-left text-base font-semibold",
                !picked && (glass ? "bg-white/10 hover:bg-white/16" : "bg-muted hover:bg-secondary"),
                picked && correct && (glass ? "bg-emerald-500/80" : "bg-primary text-primary-foreground"),
                picked && selected && !correct && "bg-destructive text-destructive-foreground",
                picked && !selected && !correct && (glass ? "bg-white/10 opacity-60" : "bg-muted opacity-60"),
              )}
            >
              {opt}
            </button>
          );
        })}
      </div>
      {picked ? (
        <Button
          className="mt-5 h-14 w-full rounded-full bg-coral text-base font-bold text-coral-foreground hover:bg-coral/90"
          onClick={next}
        >
          Continuar
        </Button>
      ) : null}
    </div>
  );
}
