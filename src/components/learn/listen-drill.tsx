import { useEffect, useMemo, useRef, useState } from "react";
import { Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useProgress } from "@/lib/progress";
import { cn, shuffle, speak, speechLang } from "@/lib/utils";

export function ListenDrill({
  vocab,
  langCode = "en",
}: {
  vocab: { id: number; term: string; translation: string }[];
  langCode?: string;
}) {
  const markVocab = useProgress((s) => s.markVocab);
  const awardXp = useProgress((s) => s.awardXp);
  const autoSpeak = useProgress((s) => s.autoSpeak);
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
  const current = deck[index];
  const lang = speechLang(langCode);

  const options = useMemo(() => {
    if (!current) return [];
    const others = vocab.filter((v) => v.id !== current.id).slice(0, 3);
    return mounted ? shuffle([current, ...shuffle(others)]) : [current, ...others];
  }, [current, mounted, vocab]);

  useEffect(() => {
    if (!autoSpeak || !current || done) return;
    speak(current.term, lang);
  }, [autoSpeak, current?.id, done, lang]);

  if (!vocab.length) {
    return (
      <p className="text-center text-sm text-muted-foreground">
        Aún no hay audio para este idioma.
      </p>
    );
  }

  if (done) {
    return (
      <div className="rounded-3xl bg-muted px-6 py-10 text-center">
        <h2 className="text-2xl font-bold">Oído afinado</h2>
        <p className="mt-2 text-muted-foreground">
          {score} de {deck.length} · +{score * 6} XP
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
          Otra ronda
        </Button>
      </div>
    );
  }

  function choose(id: number) {
    if (!current || picked || lock.current) return;
    lock.current = true;
    const ok = id === current.id;
    setPicked(String(id));
    markVocab(current.id, ok);
    if (ok) setScore((s) => s + 1);
  }

  function next() {
    lock.current = false;
    if (index >= deck.length - 1) {
      awardXp(score * 6);
      setDone(true);
      return;
    }
    setIndex((i) => i + 1);
    setPicked(null);
  }

  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
        Escuchar · {index + 1}/{deck.length}
      </p>
      <Button
        type="button"
        size="lg"
        className="mt-4 w-full rounded-full"
        onClick={() => current && speak(current.term, lang)}
      >
        <Volume2 className="size-5" />
        Reproducir
      </Button>
      <p className="mt-4 text-sm text-muted-foreground">Elige lo que escuchaste</p>
      <div className="mt-3 grid gap-2">
        {options.map((opt) => {
          const selected = picked === String(opt.id);
          const correct = opt.id === current?.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => choose(opt.id)}
              className={cn(
                "min-h-14 w-full cursor-pointer touch-manipulation rounded-2xl px-4 py-3 text-left text-base font-semibold",
                !picked && "bg-muted hover:bg-secondary",
                picked && correct && "bg-primary text-primary-foreground",
                picked && selected && !correct && "bg-destructive text-destructive-foreground",
                picked && !selected && !correct && "bg-muted opacity-60",
              )}
            >
              {opt.term}
              <span className="mt-0.5 block text-xs opacity-70">{opt.translation}</span>
            </button>
          );
        })}
      </div>
      {picked ? (
        <Button
          className="mt-5 w-full rounded-full bg-coral text-coral-foreground hover:bg-coral/90"
          onClick={next}
        >
          Continuar
        </Button>
      ) : null}
    </div>
  );
}
