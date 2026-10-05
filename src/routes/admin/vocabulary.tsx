import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AdminShell } from "@/components/layout/admin-shell";
import { ActiveBadge, AdminRow, AdminTable, RowActions, Td } from "@/components/admin/data-table";
import {
  ActiveField,
  NumberField,
  SelectField,
  TextField,
} from "@/components/admin/form-fields";
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
  deleteVocabulary,
  listCategories,
  listLanguages,
  listVocabulary,
  saveVocabulary,
} from "@/lib/server/queries";
import type { VocabItem } from "@/lib/types";

export const Route = createFileRoute("/admin/vocabulary")({
  loader: async () => {
    const [languages, categories, vocab] = await Promise.all([
      listLanguages(),
      listCategories({ data: { includeInactive: true } }),
      listVocabulary({ data: {} }),
    ]);
    return { languages, categories, vocab };
  },
  component: VocabAdmin,
});

const empty = {
  languageId: 0,
  categoryId: null as number | null,
  lessonId: null as number | null,
  term: "",
  translation: "",
  phonetic: "",
  example: "",
  exampleTranslation: "",
  sortOrder: 1,
  isActive: true,
};

function VocabAdmin() {
  const initial = Route.useLoaderData();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [langFilter, setLangFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<VocabItem | null>(null);
  const [form, setForm] = useState(empty);

  const { data: languages = initial.languages } = useQuery({
    queryKey: ["languages"],
    queryFn: () => listLanguages(),
    initialData: initial.languages,
    staleTime: Infinity,
    refetchOnMount: false,
  });
  const { data: categories = initial.categories } = useQuery({
    queryKey: ["admin-categories"],
    queryFn: () => listCategories({ data: { includeInactive: true } }),
    initialData: initial.categories,
    staleTime: Infinity,
    refetchOnMount: false,
  });
  const { data: vocab = initial.vocab } = useQuery({
    queryKey: ["admin-vocab"],
    queryFn: () => listVocabulary({ data: {} }),
    initialData: initial.vocab,
    staleTime: Infinity,
    refetchOnMount: false,
  });

  const save = useMutation({
    mutationFn: saveVocabulary,
    onSuccess: () => {
      toast.success("Palabra guardada");
      void qc.invalidateQueries({ queryKey: ["admin-vocab"] });
      void qc.invalidateQueries({ queryKey: ["vocab"] });
      setOpen(false);
    },
  });
  const remove = useMutation({
    mutationFn: deleteVocabulary,
    onSuccess: () => {
      toast.success("Palabra eliminada");
      void qc.invalidateQueries({ queryKey: ["admin-vocab"] });
    },
  });

  const filtered = vocab.filter((v) => {
    const matchLang = langFilter === "all" || String(v.languageId) === langFilter;
    const matchText = `${v.term} ${v.translation}`.toLowerCase().includes(search.toLowerCase());
    return matchLang && matchText;
  });

  function startNew() {
    setEditing(null);
    setForm({ ...empty, languageId: languages[0]?.id ?? 0 });
    setOpen(true);
  }
  function startEdit(v: VocabItem) {
    setEditing(v);
    setForm({
      languageId: v.languageId,
      categoryId: v.categoryId,
      lessonId: v.lessonId,
      term: v.term,
      translation: v.translation,
      phonetic: v.phonetic,
      example: v.example,
      exampleTranslation: v.exampleTranslation,
      sortOrder: v.sortOrder,
      isActive: v.isActive,
    });
    setOpen(true);
  }

  return (
    <AdminShell
      title="Vocabulario"
      action={
        <>
          <Input
            placeholder="Buscar…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="hidden w-48 sm:block"
          />
          <Button onClick={startNew}>Nueva palabra</Button>
        </>
      }
    >
      <div className="mb-4 max-w-xs">
        <SelectField
          label="Filtrar por idioma"
          value={langFilter}
          onChange={setLangFilter}
          options={[
            { value: "all", label: "Todos" },
            ...languages.map((l) => ({ value: String(l.id), label: l.name })),
          ]}
        />
      </div>
      <AdminTable
        headers={["ID", "Término", "Traducción", "Categoría", "Estado", "Acciones"]}
        empty={filtered.length === 0}
      >
        {filtered.map((v) => (
          <AdminRow key={v.id}>
            <Td className="tabular-nums text-muted-foreground">{v.id}</Td>
            <Td className="font-medium">{v.term}</Td>
            <Td>{v.translation}</Td>
            <Td className="text-muted-foreground">{v.categoryName ?? "—"}</Td>
            <Td>
              <ActiveBadge on={v.isActive} />
            </Td>
            <Td>
              <RowActions
                onEdit={() => startEdit(v)}
                onDelete={() => {
                  if (confirm("¿Eliminar esta palabra?")) {
                    remove.mutate({ data: { id: v.id } });
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
            <DialogTitle>{editing ? "Editar palabra" : "Nueva palabra"}</DialogTitle>
          </DialogHeader>
          <form
            className="grid gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              save.mutate({ data: { id: editing?.id, ...form } });
            }}
          >
            <SelectField
              label="Idioma"
              value={String(form.languageId)}
              onChange={(v) => setForm({ ...form, languageId: Number(v) })}
              options={languages.map((l) => ({ value: String(l.id), label: l.name }))}
            />
            <SelectField
              label="Categoría"
              value={form.categoryId ? String(form.categoryId) : "none"}
              onChange={(v) =>
                setForm({ ...form, categoryId: v === "none" ? null : Number(v) })
              }
              options={[
                { value: "none", label: "Sin categoría" },
                ...categories
                  .filter((c) => c.languageId === form.languageId)
                  .map((c) => ({ value: String(c.id), label: c.name })),
              ]}
            />
            <TextField
              label="Término *"
              required
              value={form.term}
              onChange={(term) => setForm({ ...form, term })}
            />
            <TextField
              label="Traducción *"
              required
              value={form.translation}
              onChange={(translation) => setForm({ ...form, translation })}
            />
            <TextField
              label="Fonética"
              value={form.phonetic}
              onChange={(phonetic) => setForm({ ...form, phonetic })}
            />
            <TextField
              label="Ejemplo"
              value={form.example}
              onChange={(example) => setForm({ ...form, example })}
            />
            <TextField
              label="Traducción del ejemplo"
              value={form.exampleTranslation}
              onChange={(exampleTranslation) => setForm({ ...form, exampleTranslation })}
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
