import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function shuffle<T>(items: T[]): T[] {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

export function todayKey(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function yesterdayKey(date = new Date()): string {
  const prior = new Date(date);
  prior.setDate(prior.getDate() - 1);
  return todayKey(prior);
}

export function normalizeAnswer(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ");
}

export function speechLang(code: string): string {
  const map: Record<string, string> = {
    en: "en-US",
    fr: "fr-FR",
    pt: "pt-BR",
    it: "it-IT",
    de: "de-DE",
    es: "es-PE",
  };
  return map[code] ?? "en-US";
}

let heldUtterance: SpeechSynthesisUtterance | null = null;

export function speak(text: string, lang = "en-US") {
  if (typeof window === "undefined" || !text.trim() || !window.speechSynthesis) return;
  const synth = window.speechSynthesis;
  // Defer and keep the utterance alive. cancel()+speak() on the click path
  // deadlocks some browsers and freezes the page.
  window.setTimeout(() => {
    try {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      utterance.rate = 0.92;
      heldUtterance = utterance;
      synth.speak(utterance);
    } catch {
      // audio is optional
    }
  }, 0);
}

export const QUESTION_TYPES = [
  { value: "multiple_choice", label: "Opción múltiple" },
  { value: "translation", label: "Traducción" },
  { value: "listen", label: "Escuchar" },
  { value: "fill_blank", label: "Completar" },
  { value: "type_answer", label: "Escribir" },
  { value: "true_false", label: "Verdadero o falso" },
  { value: "conversation", label: "Conversación" },
] as const;

export const LESSON_TYPES = [
  { value: "vocabulary", label: "Vocabulario" },
  { value: "conversation", label: "Conversación" },
  { value: "grammar", label: "Gramática" },
  { value: "review", label: "Repaso" },
] as const;

export function questionTypeLabel(value: string): string {
  return QUESTION_TYPES.find((t) => t.value === value)?.label ?? value;
}

export function lessonTypeLabel(value: string): string {
  return LESSON_TYPES.find((t) => t.value === value)?.label ?? value;
}
