import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { listCategories, listLanguages, listVocabulary } from "@/lib/server/queries";
import { useProgress } from "@/lib/progress";
import { speak, speechLang } from "@/lib/utils";

export const Route = createFileRoute("/_app/review")({
  loader: async () => {
    const languages = await listLanguages();
    const preferred = languages.find((l) => l.code === "en") ?? languages[0];
    const languageId = preferred?.id;
    const [categories, vocab] = await Promise.all([
      listCategories({ data: { languageId } }),
      listVocabulary({ data: { languageId } }),
    ]);
    return { languages, categories, vocab, languageId };
  },
  component: ReviewPage,
});

function ReviewPage() {
  const initial = Route.useLoaderData();
  const storedId = useProgress((s) => s.targetLanguageId);
  const languageId = storedId ?? initial.languageId;
  const markVocab = useProgress((s) => s.markVocab);
  const learned = useProgress((s) => s.learnedVocab);
  const autoSpeak = useProgress((s) => s.autoSpeak);
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  const { data: languages = initial.languages } = useQuery({
    queryKey: ["languages"],
    queryFn: () => listLanguages(),
    initialData: initial.languages,
    staleTime: Infinity,
    refetchOnMount: false,
  });
  const language = languages.find((l) => l.id === languageId) ?? languages[0];
  const lang = speechLang(language?.code ?? "en");

  const { data: categories = initial.categories } = useQuery({
    queryKey: ["categories", languageId],
    queryFn: () => listCategories({ data: { languageId: languageId ?? undefined } }),
    enabled: Boolean(languageId),
    initialData: languageId === initial.languageId ? initial.categories : undefined,
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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return vocab.filter((item) => {
      if (categoryFilter !== "all" && String(item.categoryId) !== categoryFilter) return false;
      if (!q) return true;
      return (
        item.term.toLowerCase().includes(q) ||
        item.translation.toLowerCase().includes(q)
      );
    });
  }, [vocab, query, categoryFilter]);

  const deck = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const sa = learned[String(a.id)]?.strength ?? 0;
      const sb = learned[String(b.id)]?.strength ?? 0;
      return sa - sb;
    }).slice(0, 40);
  }, [filtered, learned]);

  const card = deck[index] ?? deck[0];

  function grade(ok: boolean) {
    if (!card) return;
    markVocab(card.id, ok);
    setFlipped(false);
    setIndex((i) => (i + 1) % Math.max(deck.length, 1));
  }

  function flip() {
    setFlipped((f) => !f);
    if (!flipped && autoSpeak && card) speak(card.term, lang);
  }

  if (!vocab.length) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <h1 className="font-display text-2xl">Aún no hay palabras</h1>
        <p className="mt-2 text-muted-foreground">Completa una lección para llenar tu mazo.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md space-y-5">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
          Repaso
        </p>
        <h1 className="font-display text-3xl font-medium">Tarjetas</h1>
        <p className="text-sm text-muted-foreground">
          {deck.length ? `${Math.min(index + 1, deck.length)} / ${deck.length}` : "0"} · toca la carta para girarla
        </p>
      </div>
      <Input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setIndex(0);
          setFlipped(false);
        }}
        placeholder="Buscar palabra o traducción"
      />
      <Select
        value={categoryFilter}
        onValueChange={(value) => {
          setCategoryFilter(value);
          setIndex(0);
          setFlipped(false);
        }}
      >
        <SelectTrigger>
          <SelectValue placeholder="Todas las categorías" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas las categorías</SelectItem>
          {categories.map((category) => (
            <SelectItem key={category.id} value={String(category.id)}>
              {category.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {!card ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          Nada coincide con ese filtro.
        </p>
      ) : (
        <>
          <button type="button" onClick={flip} className="block w-full text-left">
            <Card className="flex min-h-56 flex-col items-center justify-center p-8 text-center">
              {!flipped ? (
                <>
                  <p className="font-display text-4xl font-medium">{card.term}</p>
                  {card.phonetic ? (
                    <p className="mt-2 text-sm text-muted-foreground">{card.phonetic}</p>
                  ) : null}
                </>
              ) : (
                <>
                  <p className="font-display text-3xl font-medium">{card.translation}</p>
                  {card.example ? (
                    <p className="mt-4 text-sm text-muted-foreground">
                      {card.example}
                      {card.exampleTranslation ? ` — ${card.exampleTranslation}` : ""}
                    </p>
                  ) : null}
                </>
              )}
            </Card>
          </button>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => speak(card.term, lang)}
            >
              <Volume2 className="size-4" />
              Escuchar
            </Button>
            <Button type="button" variant="outline" className="flex-1" onClick={() => grade(false)}>
              La olvidé
            </Button>
            <Button type="button" className="flex-1" onClick={() => grade(true)}>
              La sé
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
