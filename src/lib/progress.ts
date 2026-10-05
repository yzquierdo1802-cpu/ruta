import { create } from "zustand";
import { persist } from "zustand/middleware";
import { todayKey, yesterdayKey } from "@/lib/utils";

export type LessonResult = {
  score: number;
  total: number;
  xp: number;
  completedAt: string;
};

export type VocabMemory = {
  strength: number;
  lastSeen: string;
  correct: number;
  wrong: number;
};

type XpDay = { date: string; xp: number };

type ProgressState = {
  targetLanguageId: number | null;
  displayName: string;
  xp: number;
  streak: number;
  lastActiveDate: string | null;
  completedLessons: Record<string, LessonResult>;
  learnedVocab: Record<string, VocabMemory>;
  xpLog: XpDay[];
  exclusiveUntil: string | null;
  autoSpeak: boolean;
  testsPassed: number;
  setLanguage: (id: number) => void;
  setDisplayName: (name: string) => void;
  setAutoSpeak: (on: boolean) => void;
  completeLesson: (lessonId: number, result: Omit<LessonResult, "completedAt">) => void;
  markVocab: (vocabId: number, correct: boolean) => void;
  touchStreak: () => void;
  awardXp: (amount: number) => void;
  passTest: (xp: number) => void;
  activateExclusive: (days: number) => void;
  resetProgress: () => void;
};

function addXp(log: XpDay[], amount: number): XpDay[] {
  const today = todayKey();
  const existing = log.find((d) => d.date === today);
  if (existing) {
    return log.map((d) => (d.date === today ? { ...d, xp: d.xp + amount } : d));
  }
  return [...log.slice(-20), { date: today, xp: amount }];
}

function nextStreak(lastActiveDate: string | null, current: number): { streak: number; lastActiveDate: string } {
  const today = todayKey();
  if (lastActiveDate === today) return { streak: Math.max(current, 1), lastActiveDate: today };
  if (lastActiveDate === yesterdayKey()) return { streak: current + 1, lastActiveDate: today };
  return { streak: 1, lastActiveDate: today };
}

export function isExclusive(until: string | null) {
  if (!until) return false;
  return new Date(until).getTime() > Date.now();
}

export function exclusiveUntilLabel(until: string | null) {
  if (!isExclusive(until)) return null;
  return new Date(until as string).toLocaleDateString("es-PE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export const useProgress = create<ProgressState>()(
  persist(
    (set, get) => ({
      targetLanguageId: null,
      displayName: "Ruta",
      xp: 0,
      streak: 0,
      lastActiveDate: null,
      completedLessons: {},
      learnedVocab: {},
      xpLog: [],
      exclusiveUntil: null,
      autoSpeak: true,
      testsPassed: 0,
      setLanguage: (id) => set({ targetLanguageId: id }),
      setDisplayName: (displayName) => set({ displayName: displayName.trim().slice(0, 24) || "Ruta" }),
      setAutoSpeak: (autoSpeak) => set({ autoSpeak }),
      touchStreak: () => {
        const { streak, lastActiveDate } = nextStreak(get().lastActiveDate, get().streak);
        set({ streak, lastActiveDate });
      },
      awardXp: (amount) => {
        const { streak, lastActiveDate } = nextStreak(get().lastActiveDate, get().streak);
        set({
          streak,
          lastActiveDate,
          xp: get().xp + amount,
          xpLog: addXp(get().xpLog, amount),
        });
      },
      passTest: (xp) => {
        const { streak, lastActiveDate } = nextStreak(get().lastActiveDate, get().streak);
        set({
          streak,
          lastActiveDate,
          testsPassed: get().testsPassed + 1,
          xp: get().xp + xp,
          xpLog: addXp(get().xpLog, xp),
        });
      },
      activateExclusive: (days) => {
        const current = get().exclusiveUntil;
        const base = isExclusive(current) ? new Date(current as string) : new Date();
        base.setDate(base.getDate() + days);
        set({ exclusiveUntil: base.toISOString() });
      },
      resetProgress: () =>
        set({
          xp: 0,
          streak: 0,
          lastActiveDate: null,
          completedLessons: {},
          learnedVocab: {},
          xpLog: [],
          testsPassed: 0,
        }),
      completeLesson: (lessonId, result) => {
        const { streak, lastActiveDate } = nextStreak(get().lastActiveDate, get().streak);
        const completedAt = new Date().toISOString();
        set({
          streak,
          lastActiveDate,
          xp: get().xp + result.xp,
          xpLog: addXp(get().xpLog, result.xp),
          completedLessons: {
            ...get().completedLessons,
            [String(lessonId)]: { ...result, completedAt },
          },
        });
      },
      markVocab: (vocabId, correct) => {
        const key = String(vocabId);
        const prev = get().learnedVocab[key] ?? {
          strength: 0,
          lastSeen: todayKey(),
          correct: 0,
          wrong: 0,
        };
        const strength = Math.max(0, Math.min(5, prev.strength + (correct ? 1 : -1)));
        set({
          learnedVocab: {
            ...get().learnedVocab,
            [key]: {
              strength,
              lastSeen: todayKey(),
              correct: prev.correct + (correct ? 1 : 0),
              wrong: prev.wrong + (correct ? 0 : 1),
            },
          },
        });
      },
    }),
    { name: "ruta-progress" },
  ),
);

export function lessonProgress(completed: Record<string, LessonResult>, lessonIds: number[]) {
  if (!lessonIds.length) return 0;
  const done = lessonIds.filter((id) => completed[String(id)]).length;
  return Math.round((done / lessonIds.length) * 100);
}
