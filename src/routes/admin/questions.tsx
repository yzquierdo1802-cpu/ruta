import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AdminShell } from "@/components/layout/admin-shell";
import { ActiveBadge, AdminRow, AdminTable, RowActions, Td } from "@/components/admin/data-table";
import {
  ActiveField,
  AreaField,
  NumberField,
  SelectField,
  TextField,
} from "@/components/admin/form-fields";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  deleteQuestion,
  listAnswers,
  listLessons,
  listQuestions,
  saveQuestion,
} from "@/lib/server/queries";
import type { Question } from "@/lib/types";
import { QUESTION_TYPES, questionTypeLabel } from "@/lib/utils";

export const Route = createFileRoute("/admin/questions")({
  validateSearch: (search: Record<string, unknown>): { lessonId?: string } => ({
    lessonId: typeof search.lessonId === "string" ? search.lessonId : undefined,
  }),
  loader: async () => {
    const [lessons, questions, answers] = await Promise.all([
      listLessons({ data: { includeInactive: true } }),
      listQuestions({ data: { includeInactive: true } }),
      listAnswers({ data: {} }),
    ]);
    return { lessons, questions, answers };
  },
  component: QuestionsAdmin,
});

type DraftAnswer = { answerText: string; isCorrect: boolean };

function blankAnswers(type: string): DraftAnswer[] {
  if (type === "true_false") {
    return [
      { answerText: "True", isCorrect: true },
      { answerText: "False", isCorrect: false },
    ];
  }
  return [
    { answerText: "", isCorrect: true },
    { answerText: "", isCorrect: false },
    { answerText: "", isCorrect: false },
    { answerText: "", isCorrect: false },
  ];
}

const empty = {
  lessonId: 0,
  prompt: "",
  promptNative: "",
  questionType: "multiple_choice",
  points: 10,
  sortOrder: 1,
  explanation: "",
  audioText: "",
  isActive: true,
  answers: blankAnswers("multiple_choice"),
};

function QuestionsAdmin() {
  const initial = Route.useLoaderData();
  const search = Route.useSearch();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [lessonFilter, setLessonFilter] = useState<string>(search.lessonId ?? "all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Question | null>(null);
  const [form, setForm] = useState(empty);

  const { data: lessons = initial.lessons } = useQuery({
    queryKey: ["admin-lessons"],
    queryFn: () => listLessons({ data: { includeInactive: true } }),
    initialData: initial.lessons,
    staleTime: Infinity,
    refetchOnMount: false,
  });
  const { data: questions = initial.questions } = useQuery({
    queryKey: ["admin-questions"],
    queryFn: () => listQuestions({ data: { includeInactive: true } }),
    initialData: initial.questions,
    staleTime: Infinity,
    refetchOnMount: false,
  });
  const { data: answerBank = initial.answers } = useQuery({
    queryKey: ["admin-answers"],
    queryFn: () => listAnswers({ data: {} }),
    initialData: initial.answers,
    staleTime: Infinity,
    refetchOnMount: false,
  });

  const save = useMutation({
    mutationFn: saveQuestion,
    onSuccess: () => {
      toast.success("Pregunta y respuestas guardadas");
      void qc.invalidateQueries({ queryKey: ["admin-questions"] });
      void qc.invalidateQueries({ queryKey: ["admin-answers"] });
      void qc.invalidateQueries({ queryKey: ["dashboard"] });
      setOpen(false);
    },
    onError: () => toast.error("No se pudo guardar"),
  });
  const remove = useMutation({
    mutationFn: deleteQuestion,
    onSuccess: () => {
      toast.success("Pregunta eliminada");
      void qc.invalidateQueries({ queryKey: ["admin-questions"] });
      void qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  const filtered = questions.filter((item) => {
    if (lessonFilter !== "all" && String(item.lessonId) !== lessonFilter) return false;
    return `${item.prompt} ${item.lessonName} ${item.categoryName}`
      .toLowerCase()
      .includes(q.toLowerCase());
  });

  function startNew() {
    setEditing(null);
    setForm({
      ...empty,
      lessonId: Number(lessonFilter === "all" ? lessons[0]?.id ?? 0 : lessonFilter),
      answers: blankAnswers("multiple_choice"),
    });
    setOpen(true);
  }

  function startEdit(item: Question) {
    const rows = answerBank
      .filter((a) => a.questionId === item.id)
      .slice()
      .sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id);
    setEditing(item);
    setForm({
      lessonId: item.lessonId,
      prompt: item.prompt,
      promptNative: item.promptNative,
      questionType: item.questionType,
      points: item.points,
      sortOrder: item.sortOrder,
      explanation: item.explanation,
      audioText: item.audioText,
      isActive: item.isActive,
      answers: rows.length
        ? rows.map((a) => ({ answerText: a.answerText, isCorrect: a.isCorrect }))
        : blankAnswers(item.questionType),
    });
    setOpen(true);
  }

  function setAnswer(index: number, patch: Partial<DraftAnswer>) {
    setForm((prev) => ({
      ...prev,
      answers: prev.answers.map((a, i) => (i === index ? { ...a, ...patch } : a)),
    }));
  }

  return (
    <AdminShell
      title="Preguntas"
      action={
        <>
          <Input
            placeholder="Buscar…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="hidden w-48 sm:block"
          />
          <Button onClick={startNew}>Nueva pregunta</Button>
        </>
      }
    >
      <div className="mb-4 grid gap-3 sm:max-w-md">
        <Input
          placeholder="Buscar…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="sm:hidden"
        />
        <SelectField
          label="Filtrar por lección"
          value={lessonFilter}
          onChange={setLessonFilter}
          options={[
            { value: "all", label: "Todas" },
            ...lessons.map((l) => ({
              value: String(l.id),
              label: `${l.categoryName} · ${l.name}`,
            })),
          ]}
        />
      </div>
      <AdminTable
        headers={["ID", "Pregunta", "Lección", "Tipo", "Puntos", "Opciones", "Estado", "Acciones"]}
        empty={filtered.length === 0}
      >
        {filtered.map((item) => (
          <AdminRow key={item.id}>
            <Td className="tabular-nums text-muted-foreground">{item.id}</Td>
            <Td className="max-w-sm truncate font-medium">{item.prompt}</Td>
            <Td>
              <span className="block text-xs text-muted-foreground">{item.categoryName}</span>
              {item.lessonName}
            </Td>
            <Td>
              <Badge variant="secondary">{questionTypeLabel(item.questionType)}</Badge>
            </Td>
            <Td className="tabular-nums">{item.points}</Td>
            <Td className="tabular-nums">{item.answerCount ?? 0}</Td>
            <Td>
              <ActiveBadge on={item.isActive} />
            </Td>
            <Td>
              <RowActions
                extra={
                  <Button asChild size="sm" variant="outline" className="h-9">
                    <a href={`/admin/answers?questionId=${item.id}`}>
                      Ver
                    </a>
                  </Button>
                }
                onEdit={() => void startEdit(item)}
                onDelete={() => {
                  if (confirm("¿Eliminar esta pregunta y sus respuestas?")) {
                    remove.mutate({ data: { id: item.id } });
                  }
                }}
              />
            </Td>
          </AdminRow>
        ))}
      </AdminTable>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar pregunta" : "Nueva pregunta"}</DialogTitle>
          </DialogHeader>
          <form
            className="grid gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              save.mutate({
                data: {
                  id: editing?.id,
                  lessonId: form.lessonId,
                  prompt: form.prompt,
                  promptNative: form.promptNative,
                  questionType: form.questionType,
                  points: form.points,
                  sortOrder: form.sortOrder,
                  explanation: form.explanation,
                  audioText: form.audioText,
                  isActive: form.isActive,
                  answers: form.answers.map((a, i) => ({
                    answerText: a.answerText,
                    isCorrect: a.isCorrect,
                    sortOrder: i + 1,
                  })),
                },
              });
            }}
          >
            <SelectField
              label="Lección *"
              value={String(form.lessonId)}
              onChange={(v) => setForm({ ...form, lessonId: Number(v) })}
              options={lessons.map((l) => ({
                value: String(l.id),
                label: `${l.categoryName} · ${l.name}`,
              }))}
            />
            <SelectField
              label="Tipo *"
              value={form.questionType}
              onChange={(questionType) =>
                setForm({
                  ...form,
                  questionType,
                  answers:
                    questionType === "true_false" ? blankAnswers("true_false") : form.answers,
                })
              }
              options={QUESTION_TYPES.map((t) => ({ value: t.value, label: t.label }))}
            />
            <AreaField
              label="Pregunta *"
              value={form.prompt}
              onChange={(prompt) => setForm({ ...form, prompt })}
            />
            <TextField
              label="Instrucción (español)"
              value={form.promptNative}
              onChange={(promptNative) => setForm({ ...form, promptNative })}
            />
            <TextField
              label="Audio (texto a voz)"
              value={form.audioText}
              onChange={(audioText) => setForm({ ...form, audioText })}
            />
            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Respuestas</p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setForm({
                      ...form,
                      answers: [...form.answers, { answerText: "", isCorrect: false }],
                    })
                  }
                >
                  <Plus className="size-4" />
                  Opción
                </Button>
              </div>
              <ul className="grid gap-2">
                {form.answers.map((answer, index) => (
                  <li key={index} className="flex items-center gap-2">
                    <Input
                      required={index < 2}
                      placeholder={`Opción ${index + 1}`}
                      value={answer.answerText}
                      onChange={(e) => setAnswer(index, { answerText: e.target.value })}
                    />
                    <label className="flex shrink-0 items-center gap-1 text-xs">
                      <input
                        type="checkbox"
                        checked={answer.isCorrect}
                        onChange={(e) => setAnswer(index, { isCorrect: e.target.checked })}
                      />
                      Correcta
                    </label>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="size-9 shrink-0"
                      aria-label="Quitar opción"
                      onClick={() =>
                        setForm({
                          ...form,
                          answers: form.answers.filter((_, i) => i !== index),
                        })
                      }
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
            <NumberField
              label="Puntos"
              value={form.points}
              onChange={(points) => setForm({ ...form, points })}
            />
            <NumberField
              label="Orden"
              value={form.sortOrder}
              onChange={(sortOrder) => setForm({ ...form, sortOrder })}
            />
            <AreaField
              label="Explicación"
              value={form.explanation}
              onChange={(explanation) => setForm({ ...form, explanation })}
            />
            <ActiveField
              checked={form.isActive}
              onChange={(isActive) => setForm({ ...form, isActive })}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={save.isPending}>
                Guardar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
}
