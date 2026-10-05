import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AdminShell } from "@/components/layout/admin-shell";
import { ActiveBadge, AdminRow, AdminTable, RowActions, Td } from "@/components/admin/data-table";
import {
  ActiveField,
  AreaField,
  ColorField,
  IconField,
  NumberField,
  SelectField,
  TextField,
} from "@/components/admin/form-fields";
import { NamedIcon } from "@/components/named-icon";
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
  deleteCategory,
  listCategories,
  listLanguages,
  saveCategory,
} from "@/lib/server/queries";
import type { Category } from "@/lib/types";

export const Route = createFileRoute("/admin/categories")({
  loader: async () => {
    const [languages, categories] = await Promise.all([
      listLanguages(),
      listCategories({ data: { includeInactive: true } }),
    ]);
    return { languages, categories };
  },
  component: CategoriesAdmin,
});

const empty = {
  languageId: 0,
  name: "",
  description: "",
  color: "#0E7C74",
  icon: "book-open",
  sortOrder: 1,
  isActive: true,
};

function CategoriesAdmin() {
  const initial = Route.useLoaderData();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [langFilter, setLangFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
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

  const save = useMutation({
    mutationFn: saveCategory,
    onSuccess: () => {
      toast.success("Categoría guardada");
      void qc.invalidateQueries({ queryKey: ["admin-categories"] });
      void qc.invalidateQueries({ queryKey: ["categories"] });
      void qc.invalidateQueries({ queryKey: ["dashboard"] });
      setOpen(false);
    },
    onError: () => toast.error("No se pudo guardar"),
  });
  const remove = useMutation({
    mutationFn: deleteCategory,
    onSuccess: () => {
      toast.success("Categoría eliminada");
      void qc.invalidateQueries({ queryKey: ["admin-categories"] });
      void qc.invalidateQueries({ queryKey: ["categories"] });
    },
  });

  const filtered = categories.filter((c) => {
    const matchLang = langFilter === "all" || String(c.languageId) === langFilter;
    const matchText = `${c.name} ${c.description}`.toLowerCase().includes(search.toLowerCase());
    return matchLang && matchText;
  });

  function startNew() {
    setEditing(null);
    setForm({ ...empty, languageId: languages[0]?.id ?? 0, sortOrder: categories.length + 1 });
    setOpen(true);
  }
  function startEdit(c: Category) {
    setEditing(c);
    setForm({
      languageId: c.languageId,
      name: c.name,
      description: c.description,
      color: c.color,
      icon: c.icon,
      sortOrder: c.sortOrder,
      isActive: c.isActive,
    });
    setOpen(true);
  }

  return (
    <AdminShell
      title="Categorías"
      action={
        <>
          <Input
            placeholder="Buscar…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="hidden w-48 sm:block"
          />
          <Button onClick={startNew}>Nueva categoría</Button>
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
        headers={["ID", "Nombre", "Idioma", "Descripción", "Color", "Icono", "Lecciones", "Estado", "Acciones"]}
        empty={filtered.length === 0}
      >
        {filtered.map((c) => (
          <AdminRow key={c.id}>
            <Td className="tabular-nums text-muted-foreground">{c.id}</Td>
            <Td className="font-medium">{c.name}</Td>
            <Td className="text-muted-foreground">{c.languageName ?? "—"}</Td>
            <Td className="max-w-xs truncate text-muted-foreground">{c.description}</Td>
            <Td>
              <span className="inline-flex items-center gap-2">
                <span
                  className="size-4 rounded-full"
                  style={{ backgroundColor: c.color }}
                />
                {c.color}
              </span>
            </Td>
            <Td>
              <span className="inline-flex items-center gap-2">
                <NamedIcon name={c.icon} />
                {c.icon}
              </span>
            </Td>
            <Td className="tabular-nums">{c.lessonCount ?? 0}</Td>
            <Td>
              <ActiveBadge on={c.isActive} />
            </Td>
            <Td>
              <RowActions
                extra={
                  <Button asChild size="sm" variant="outline" className="h-9">
                    <a href={`/admin/lessons?categoryId=${c.id}`}>
                      Ver
                    </a>
                  </Button>
                }
                onEdit={() => startEdit(c)}
                onDelete={() => {
                  if (confirm("¿Eliminar esta categoría y sus lecciones?")) {
                    remove.mutate({ data: { id: c.id } });
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
            <DialogTitle>{editing ? "Editar categoría" : "Nueva categoría"}</DialogTitle>
          </DialogHeader>
          <form
            className="grid gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              save.mutate({
                data: {
                  id: editing?.id,
                  ...form,
                },
              });
            }}
          >
            <SelectField
              label="Idioma"
              value={String(form.languageId)}
              onChange={(v) => setForm({ ...form, languageId: Number(v) })}
              options={languages.map((l) => ({ value: String(l.id), label: l.name }))}
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
            <ColorField
              value={form.color}
              onChange={(color) => setForm({ ...form, color })}
            />
            <IconField value={form.icon} onChange={(icon) => setForm({ ...form, icon })} />
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
