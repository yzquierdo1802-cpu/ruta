import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AdminShell } from "@/components/layout/admin-shell";
import { AdminRow, AdminTable, RowActions, Td } from "@/components/admin/data-table";
import {
  ActiveField,
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
  deleteAnswer,
  listAnswers,
  listQuestions,
  saveAnswer,
} from "@/lib/server/queries";
import type { Answer } from "@/lib/types";

export const Route = createFileRoute("/admin/answers")({
  validateSearch: (search: Record<string, unknown>): { questionId?: string } => ({
    questionId: typeof search.questionId === "string" ? search.questionId : undefined,
  }),
  loader: async () => {
    const [questions, answers] = await Promise.all([
      listQuestions({ data: { includeInactive: true } }),
      listAnswers({ data: {} }),
    ]);
    return { questions, answers };
  },
  component: AnswersAdmin,
});

const empty = {
  questionId: 0,
  answerText: "",
  isCorrect: false,
  sortOrder: 1,
};

function AnswersAdmin() {
  const initial = Route.useLoaderData();
  const searchParams = Route.useSearch();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [questionFilter, setQuestionFilter] = useState(searchParams.questionId ?? "all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Answer | null>(null);
  const [form, setForm] = useState(empty);

  const { data: questions = initial.questions } = useQuery({
    queryKey: ["admin-questions"],
    queryFn: () => listQuestions({ data: { includeInactive: true } }),
    initialData: initial.questions,
    staleTime: Infinity,
    refetchOnMount: false,
  });
  const { data: answers = initial.answers } = useQuery({
    queryKey: ["admin-answers"],
    queryFn: () => listAnswers({ data: {} }),
    initialData: initial.answers,
    staleTime: Infinity,
    refetchOnMount: false,
  });

  const save = useMutation({
    mutationFn: saveAnswer,
    onSuccess: () => {
      toast.success("Respuesta guardada");
      void qc.invalidateQueries({ queryKey: ["admin-answers"] });
      void qc.invalidateQueries({ queryKey: ["admin-questions"] });
      void qc.invalidateQueries({ queryKey: ["dashboard"] });
      setOpen(false);
    },
  });
  const remove = useMutation({
    mutationFn: deleteAnswer,
    onSuccess: () => {
      toast.success("Respuesta eliminada");
      void qc.invalidateQueries({ queryKey: ["admin-answers"] });
      void qc.invalidateQueries({ queryKey: ["admin-questions"] });
    },
  });

  const qLabel = (id: number) =>
    questions.find((item) => item.id === id)?.prompt.slice(0, 48) ?? `#${id}`;

  const filtered = answers.filter((a) => {
    if (questionFilter !== "all" && String(a.questionId) !== questionFilter) return false;
    return a.answerText.toLowerCase().includes(search.toLowerCase());
  });

  function startNew() {
    setEditing(null);
    setForm({
      ...empty,
      questionId: Number(questionFilter === "all" ? questions[0]?.id ?? 0 : questionFilter),
    });
    setOpen(true);
  }
  function startEdit(a: Answer) {
    setEditing(a);
    setForm({
      questionId: a.questionId,
      answerText: a.answerText,
      isCorrect: a.isCorrect,
      sortOrder: a.sortOrder,
    });
    setOpen(true);
  }

  return (
    <AdminShell
      title="Respuestas"
      action={
        <>
          <Input
            placeholder="Buscar…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="hidden w-48 sm:block"
          />
          <Button onClick={startNew}>Nueva respuesta</Button>
        </>
      }
    >
      <div className="mb-4 max-w-lg">
        <SelectField
          label="Filtrar por pregunta"
          value={questionFilter}
          onChange={setQuestionFilter}
          options={[
            { value: "all", label: "Todas (recientes)" },
            ...questions.slice(0, 120).map((item) => ({
              value: String(item.id),
              label: `${item.id} · ${item.prompt.slice(0, 50)}`,
            })),
          ]}
        />
      </div>
      <AdminTable
        headers={["ID", "Respuesta", "Pregunta", "Correcta", "Orden", "Acciones"]}
        empty={filtered.length === 0}
      >
        {filtered.map((a) => (
          <AdminRow key={a.id}>
            <Td className="tabular-nums text-muted-foreground">{a.id}</Td>
            <Td className="font-medium">{a.answerText}</Td>
            <Td className="max-w-xs truncate text-muted-foreground">{qLabel(a.questionId)}</Td>
            <Td>
              <Badge variant={a.isCorrect ? "success" : "secondary"}>
                {a.isCorrect ? "Sí" : "No"}
              </Badge>
            </Td>
            <Td className="tabular-nums">{a.sortOrder}</Td>
            <Td>
              <RowActions
                onEdit={() => startEdit(a)}
                onDelete={() => {
                  if (confirm("¿Eliminar esta respuesta?")) {
                    remove.mutate({ data: { id: a.id } });
                  }
                }}
              />
            </Td>
          </AdminRow>
        ))}
      </AdminTable>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Editar respuesta" : "Nueva respuesta"}</DialogTitle>
          </DialogHeader>
          <form
            className="grid gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              save.mutate({ data: { id: editing?.id, ...form } });
            }}
          >
            <SelectField
              label="Pregunta *"
              value={String(form.questionId)}
              onChange={(v) => setForm({ ...form, questionId: Number(v) })}
              options={questions.slice(0, 120).map((item) => ({
                value: String(item.id),
                label: `${item.id} · ${item.prompt.slice(0, 50)}`,
              }))}
            />
            <TextField
              label="Respuesta *"
              required
              value={form.answerText}
              onChange={(answerText) => setForm({ ...form, answerText })}
            />
            <NumberField
              label="Orden"
              value={form.sortOrder}
              onChange={(sortOrder) => setForm({ ...form, sortOrder })}
            />
            <ActiveField
              label="Correcta"
              checked={form.isCorrect}
              onChange={(isCorrect) => setForm({ ...form, isCorrect })}
            />
            <p className="text-xs text-muted-foreground">
              Marca esta opción si es la respuesta correcta.
            </p>
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
