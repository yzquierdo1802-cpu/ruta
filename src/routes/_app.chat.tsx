import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Crown, Send, Volume2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { listLanguages } from "@/lib/server/queries";
import { chatTurn, type ChatMessage } from "@/lib/server/chat";
import { isExclusive, useProgress } from "@/lib/progress";
import { speak, speechLang, cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/chat")({
  loader: () => listLanguages(),
  component: ChatPage,
});

const SCENES = [
  { id: "intro", label: "Presentaciones", exclusive: false },
  { id: "cafe", label: "En el café", exclusive: false },
  { id: "hotel", label: "En el hotel", exclusive: false },
  { id: "airport", label: "Aeropuerto", exclusive: false },
  { id: "shop", label: "Tienda", exclusive: false },
  { id: "doctor", label: "Médico", exclusive: true },
  { id: "office", label: "Entrevista", exclusive: true },
  { id: "date", label: "Cita", exclusive: true },
  { id: "phone", label: "Por teléfono", exclusive: true },
  { id: "weather", label: "El clima", exclusive: true },
  { id: "school", label: "Escuela", exclusive: true },
  { id: "home", label: "En casa", exclusive: true },
] as const;

type SceneId = (typeof SCENES)[number]["id"];
type Bubble = ChatMessage & { translation?: string; correction?: string | null };

function ChatPage() {
  const initialLanguages = Route.useLoaderData();
  const languageId = useProgress((s) => s.targetLanguageId);
  const exclusiveUntil = useProgress((s) => s.exclusiveUntil);
  const autoSpeak = useProgress((s) => s.autoSpeak);
  const awardXp = useProgress((s) => s.awardXp);
  const exclusive = isExclusive(exclusiveUntil);
  const { data: languages = initialLanguages } = useQuery({
    queryKey: ["languages"],
    queryFn: () => listLanguages(),
    initialData: initialLanguages,
    staleTime: Infinity,
    refetchOnMount: false,
  });
  const language = languages.find((l) => l.id === languageId) ?? languages[0];
  const [scenario, setScenario] = useState<SceneId>("intro");
  const [history, setHistory] = useState<Bubble[]>([]);
  const [draft, setDraft] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lang = speechLang(language?.code ?? "en");

  async function send(text: string) {
    if (!language || pending) return;
    const message = text.trim();
    if (!message) return;
    setDraft("");
    setError(null);
    const nextHistory: Bubble[] = [...history, { role: "user", content: message }];
    setHistory(nextHistory);
    setPending(true);
    try {
      const result = await chatTurn({
        data: {
          languageName: language.nativeName,
          languageCode: language.code,
          scenario,
          history: nextHistory.map(({ role, content }) => ({ role, content })),
          message,
        },
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setHistory((h) => [
        ...h,
        {
          role: "assistant",
          content: result.reply,
          translation: result.translation,
          correction: result.correction,
        },
      ]);
      setSuggestions(result.suggestions);
      awardXp(3);
      if (autoSpeak) speak(result.reply, lang);
    } catch {
      setError("No se pudo enviar el mensaje.");
    } finally {
      setPending(false);
    }
  }

  function resetScene(id: SceneId) {
    const scene = SCENES.find((s) => s.id === id);
    if (scene?.exclusive && !exclusive) {
      toast.message("Escena exclusiva", {
        description: "Activa Ruta Exclusivo para hablar en esta escena.",
      });
      return;
    }
    setScenario(id);
    setHistory([]);
    setSuggestions([]);
    setError(null);
  }

  return (
    <div className="mx-auto flex min-h-[70dvh] max-w-2xl flex-col gap-4">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
          Conversación
        </p>
        <h1 className="font-display text-3xl font-medium">Habla de verdad</h1>
        <p className="text-sm text-muted-foreground">
          Un compañero de práctica en {language?.name ?? "tu idioma"}. Tú escribes; la escena responde.
        </p>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {SCENES.map((scene) => {
          const locked = scene.exclusive && !exclusive;
          return (
            <Button
              key={scene.id}
              type="button"
              size="sm"
              variant={scenario === scene.id ? "default" : "outline"}
              className="rounded-full"
              onClick={() => resetScene(scene.id)}
            >
              {locked ? <Crown className="size-3.5 text-gold" /> : null}
              {scene.label}
            </Button>
          );
        })}
      </div>
      {!exclusive ? (
        <p className="text-xs text-muted-foreground">
          Las escenas con corona piden{" "}
          <a href="/shop" className="font-medium text-coral underline-offset-2 hover:underline">
            Ruta Exclusivo
          </a>
          .
        </p>
      ) : null}
      <Card className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex-1 space-y-3 overflow-y-auto">
          {history.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Escribe un saludo para entrar en la escena.
            </p>
          ) : (
            history.map((msg, i) => (
              <div
                key={`${msg.role}-${i}`}
                className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}
              >
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm",
                    msg.role === "user"
                      ? "rounded-br-md bg-primary text-primary-foreground"
                      : "rounded-bl-md bg-muted text-foreground",
                  )}
                >
                  <p>{msg.content}</p>
                  {msg.translation ? (
                    <p className="mt-1 text-xs opacity-70">{msg.translation}</p>
                  ) : null}
                  {msg.correction ? (
                    <p className="mt-1 text-xs">Corrección: {msg.correction}</p>
                  ) : null}
                  {msg.role === "assistant" ? (
                    <button
                      type="button"
                      className="mt-1 inline-flex min-h-8 items-center gap-1 text-xs opacity-70"
                      onClick={() => speak(msg.content, lang)}
                    >
                      <Volume2 className="size-3" />
                      Escuchar
                    </button>
                  ) : null}
                </div>
              </div>
            ))
          )}
          {pending ? (
            <p className="text-sm text-muted-foreground">Escribiendo…</p>
          ) : null}
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>
        {suggestions.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {suggestions.map((s) => (
              <Button key={s} type="button" size="sm" variant="secondary" onClick={() => send(s)}>
                {s}
              </Button>
            ))}
          </div>
        ) : null}
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void send(draft);
          }}
        >
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Escribe en el idioma que aprendes…"
            disabled={pending}
          />
          <Button type="submit" size="icon" disabled={pending || !draft.trim()} aria-label="Enviar">
            <Send className="size-4" />
          </Button>
        </form>
      </Card>
    </div>
  );
}
