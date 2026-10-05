import { createServerFn } from "@tanstack/react-start";

export type ChatMessage = { role: "user" | "assistant"; content: string };

export type ChatReply = {
  ok: true;
  reply: string;
  translation: string;
  suggestions: string[];
  correction: string | null;
} | { ok: false; error: string };

const SCENARIOS: Record<string, string> = {
  intro: "You just met the learner at a friendly gathering. Exchange names, origins, and small talk.",
  cafe: "You are a barista in a café. Keep the conversation about ordering drinks and food.",
  hotel: "You are a hotel receptionist. Help with check-in, the room, and local tips.",
  airport: "You are an airport staff member. Help with boarding, gates, and luggage.",
  shop: "You work in a clothing store. Help the learner find sizes, prices, and pay.",
  doctor: "You are a clinic receptionist. Help with symptoms, appointments, and simple medical small talk.",
  office: "You are a hiring manager. Run a friendly job interview about experience and strengths.",
  date: "You are on a casual first date at a park café. Keep it warm, curious, and appropriate.",
  phone: "You are a friend calling on the phone. Catch up, make plans, and confirm times.",
  weather: "You are a neighbor chatting about the weather, weekend plans, and seasons.",
  school: "You are a classmate. Talk about classes, homework, and after-school plans.",
  home: "You are a host showing the learner around your home. Rooms, furniture, and household routines.",
};

export const chatTurn = createServerFn({ method: "POST" })
  .validator((input: {
    languageName: string;
    languageCode: string;
    scenario: string;
    history: ChatMessage[];
    message: string;
  }) => input)
  .handler(async ({ data }): Promise<ChatReply> => {
    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) return { ok: false, error: "La conversación con IA no está disponible ahora." };

    const message = data.message.trim().slice(0, 400);
    if (!message) return { ok: false, error: "Escribe un mensaje." };

    const scenario = SCENARIOS[data.scenario] ?? SCENARIOS.intro;
    const history = data.history.slice(-8);

    const res = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "grok-4.5",
        max_tokens: 280,
        temperature: 0.7,
        messages: [
          {
            role: "system",
            content: `You are a patient conversation partner helping a Spanish speaker learn ${data.languageName}.
${scenario}
Rules:
- Reply primarily in ${data.languageName}, 1-3 short sentences.
- Stay in character. Do not break the scene.
- If the learner writes in Spanish, answer in ${data.languageName} and gently continue.
- If they make a clear mistake, note a brief correction.
- Always propose 3 short suggested replies the learner could say next, in ${data.languageName}.
Return ONLY compact JSON:
{"reply":"...","translation":"Spanish translation of your reply","suggestions":["...","...","..."],"correction":null or a short Spanish note}`,
          },
          ...history.map((m) => ({ role: m.role, content: m.content })),
          { role: "user", content: message },
        ],
      }),
    });

    if (!res.ok) return { ok: false, error: "No se pudo completar el turno. Inténtalo de nuevo." };

    const body = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const raw = body.choices?.[0]?.message?.content ?? "";
    const jsonText = raw.replace(/^```json\s*|\s*```$/g, "").trim();
    try {
      const parsed = JSON.parse(jsonText) as {
        reply?: string;
        translation?: string;
        suggestions?: string[];
        correction?: string | null;
      };
      const reply = String(parsed.reply ?? "").trim();
      if (!reply) return { ok: false, error: "Respuesta vacía." };
      return {
        ok: true,
        reply,
        translation: String(parsed.translation ?? ""),
        suggestions: Array.isArray(parsed.suggestions)
          ? parsed.suggestions.map(String).slice(0, 3)
          : [],
        correction: parsed.correction ? String(parsed.correction) : null,
      };
    } catch {
      return {
        ok: true,
        reply: raw.slice(0, 400),
        translation: "",
        suggestions: [],
        correction: null,
      };
    }
  });
