export type Language = {
  id: number;
  code: string;
  name: string;
  nativeName: string;
  sortOrder: number;
  isActive: boolean;
};

export type Category = {
  id: number;
  languageId: number;
  name: string;
  description: string;
  color: string;
  icon: string;
  sortOrder: number;
  isActive: boolean;
  lessonCount?: number;
  questionCount?: number;
  languageName?: string;
};

export type Lesson = {
  id: number;
  categoryId: number;
  name: string;
  description: string;
  lessonType: string;
  sortOrder: number;
  estimatedMinutes: number;
  isActive: boolean;
  questionCount?: number;
  categoryName?: string;
};

export type Answer = {
  id: number;
  questionId: number;
  answerText: string;
  isCorrect: boolean;
  sortOrder: number;
};

export type Question = {
  id: number;
  lessonId: number;
  prompt: string;
  promptNative: string;
  questionType: string;
  points: number;
  sortOrder: number;
  explanation: string;
  audioText: string;
  isActive: boolean;
  lessonName?: string;
  categoryName?: string;
  answerCount?: number;
  answers?: Answer[];
};

export type VocabItem = {
  id: number;
  languageId: number;
  categoryId: number | null;
  lessonId: number | null;
  term: string;
  translation: string;
  phonetic: string;
  example: string;
  exampleTranslation: string;
  sortOrder: number;
  isActive: boolean;
  categoryName?: string;
};

export type CmsUser = {
  id: number;
  alias: string;
  role: string;
  languageId: number | null;
  xp: number;
  streak: number;
  isActive: boolean;
  notes: string;
  sortOrder: number;
  languageName?: string;
};

export type DashboardStats = {
  languages: number;
  categories: number;
  lessons: number;
  questions: number;
  answers: number;
  vocabulary: number;
  users: number;
  lessonsEmpty: number;
  questionsEmpty: number;
  byCategory: { name: string; lessons: number; color: string }[];
};

export type LessonPlay = {
  lesson: Lesson;
  category: Category;
  language: Language;
  questions: Question[];
  vocabulary: VocabItem[];
};

export const CMS_ROLES = [
  { value: "administrador", label: "Administrador" },
  { value: "editor", label: "Editor" },
  { value: "aprendiz", label: "Aprendiz" },
] as const;

export function cmsRoleLabel(value: string) {
  return CMS_ROLES.find((r) => r.value === value)?.label ?? value;
}
