import { create } from "zustand";

type ChromeMode = "main" | "category";

type ChromeState = {
  title: string;
  mode: ChromeMode;
  setTitle: (title: string) => void;
  setMode: (mode: ChromeMode) => void;
};

export const useLearnerChrome = create<ChromeState>((set) => ({
  title: "",
  mode: "main",
  setTitle: (title) => set({ title }),
  setMode: (mode) => set({ mode }),
}));
