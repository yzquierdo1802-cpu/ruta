import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import { deleteLesson, listCategories, listLessons, saveLesson } from "@/lib/server/queries";
import type { Lesson } from "@/lib/types";
import { LESSON_TYPES, lessonTypeLabel } from "@/lib/utils";

export const Route = createFileRoute("/admin/lessons")({
  validateSearch: (search: Record<string, unknown>): { categoryId?: string } => ({
    categoryId: typeof search.categoryId === "string" ? search.categoryId : undefined,
  }),
  loader: async () => {
    const [categories, lessons] = await Promise.all([
      listCategories({ data: { includeInactive: true } }),
      listLessons({ data: { includeInactive: true } }),
    ]);
    return { categories, lessons };
  },
  component: LessonsAdmin,
});

const empty = {
  categoryId: 0,
  name: "",
  description: "",
  lessonType: "vocabulary",
  sortOrder: 1,
  estimatedMinutes: 5,
  isActive: true,
};

function LessonsAdmin() {
  const initial = Route.useLoaderData();
  const searchParams = Route.useSearch();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState(searchParams.categoryId ?? "all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Lesson | null>(null);
  const [form, setForm] = useState(empty);

  const { data: categories = initial.categories } = useQuery({
    queryKey: ["admin-categories"],
    queryFn: () => listCategories({ data: { includeInactive: true } }),
    initialData: initial.categories,
    staleTime: Infinity,
    refetchOnMount: false,
  });
  const { data: lessons = initial.lessons } = useQuery({
    queryKey: ["admin-lessons"],
    queryFn: () => listLessons({ data: { includeInactive: true } }),
    initialData: initial.lessons,
    staleTime: Infinity,
    refetchOnMount: false,
  });

  const save = useMutation({
    mutationFn: saveLesson,
    onSuccess: () => {
      toast.success("Lección guardada");
      void qc.invalidateQueries({ queryKey: ["admin-lessons"] });
      void qc.invalidateQueries({ queryKey: ["lessons"] });
      void qc.invalidateQueries({ queryKey: ["dashboard"] });
      setOpen(false);
    },
  });
  const remove = useMutation({
    mutationFn: deleteLesson,
    onSuccess: () => {
      toast.success("Lección eliminada");
      void qc.invalidateQueries({ queryKey: ["admin-lessons"] });
      void qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  const filtered = lessons.filter((l) => {
    const matchCat = catFilter === "all" || String(l.categoryId) === catFilter;
    const matchText = `${l.name} ${l.categoryName}`.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchText;
  });

  function startNew() {
    setEditing(null);
    setForm({
      ...empty,
      categoryId: Number(catFilter === "all" ? categories[0]?.id ?? 0 : catFilter),
      sortOrder: lessons.length + 1,
    });
    setOpen(true);
  }
  function startEdit(l: Lesson) {
    setEditing(l);
    setForm({
      categoryId: l.categoryId,
      name: l.name,
      description: l.description,
      lessonType: l.lessonType,
      sortOrder: l.sortOrder,
      estimatedMinutes: l.estimatedMinutes,
      isActive: l.isActive,
    });
    setOpen(true);
  }

  return (
    <AdminShell
      title="Lecciones"
      action={
        <>
          <Input
            placeholder="Buscar…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="hidden w-48 sm:block"
          />
          <Button onClick={startNew}>Nueva lección</Button>
        </>
      }
    >
      <div className="mb-4 max-w-xs">
        <SelectField
          label="Filtrar por categoría"
          value={catFilter}
          onChange={setCatFilter}
          options={[
            { value: "all", label: "Todas" },
            ...categories.map((c) => ({ value: String(c.id), label: c.name })),
          ]}
        />
      </div>
      <AdminTable
        headers={["ID", "Nombre", "Categoría", "Tipo", "Preguntas", "Estado", "Acciones"]}
        empty={filtered.length === 0}
      >
        {filtered.map((l) => (
          <AdminRow key={l.id}>
            <Td className="tabular-nums text-muted-foreground">{l.id}</Td>
            <Td className="font-medium">{l.name}</Td>
            <Td>{l.categoryName}</Td>
            <Td>
              <Badge variant="secondary">{lessonTypeLabel(l.lessonType)}</Badge>
            </Td>
            <Td className="tabular-nums">{l.questionCount ?? 0}</Td>
            <Td>
              <ActiveBadge on={l.isActive} />
            </Td>
            <Td>
              <RowActions
                extra={
                  <Button asChild size="sm" variant="outline" className="h-9">
                    <a href={`/admin/questions?lessonId=${l.id}`}>
                      Ver
                    </a>
                  </Button>
                }
                onEdit={() => startEdit(l)}
                onDelete={() => {
                  if (confirm("¿Eliminar esta lección y sus preguntas?")) {
                    remove.mutate({ data: { id: l.id } });
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
            <DialogTitle>{editing ? "Editar lección" : "Nueva lección"}</DialogTitle>
          </DialogHeader>
          <form
            className="grid gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              save.mutate({ data: { id: editing?.id, ...form } });
            }}
          >
            <SelectField
              label="Categoría *"
              value={String(form.categoryId)}
              onChange={(v) => setForm({ ...form, categoryId: Number(v) })}
              options={categories.map((c) => ({ value: String(c.id), label: c.name }))}
            />
            <TextField
              label="Nombre *"
              required
              value={form.name}
              onChange={(name) => setForm({ ...form, name })}
            />
            <AreaField
              label="Descripción"
              value={form.description}
              onChange={(description) => setForm({ ...form, description })}
            />
            <SelectField
              label="Tipo"
              value={form.lessonType}
              onChange={(lessonType) => setForm({ ...form, lessonType })}
              options={LESSON_TYPES.map((t) => ({ value: t.value, label: t.label }))}
            />
            <NumberField
              label="Minutos"
              value={form.estimatedMinutes}
              onChange={(estimatedMinutes) => setForm({ ...form, estimatedMinutes })}
            />
            <NumberField
              label="Orden"
              value={form.sortOrder}
              onChange={(sortOrder) => setForm({ ...form, sortOrder })}
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
