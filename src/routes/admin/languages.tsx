import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AdminShell } from "@/components/layout/admin-shell";
import { AdminRow, AdminTable, RowActions, Td } from "@/components/admin/data-table";
import { ActiveField, NumberField, TextField } from "@/components/admin/form-fields";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { deleteLanguage, listLanguages, saveLanguage } from "@/lib/server/queries";
import type { Language } from "@/lib/types";

export const Route = createFileRoute("/admin/languages")({
  loader: () => listLanguages(),
  component: LanguagesAdmin,
});

const empty = {
  code: "",
  name: "",
  nativeName: "",
  sortOrder: 1,
  isActive: true,
};

function LanguagesAdmin() {
  const initial = Route.useLoaderData();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Language | null>(null);
  const [form, setForm] = useState(empty);

  const { data: languages = initial } = useQuery({
    queryKey: ["languages"],
    queryFn: () => listLanguages(),
    initialData: initial,
    staleTime: Infinity,
    refetchOnMount: false,
  });

  const save = useMutation({
    mutationFn: saveLanguage,
    onSuccess: () => {
      toast.success("Idioma guardado");
      void qc.invalidateQueries({ queryKey: ["languages"] });
      setOpen(false);
    },
  });
  const remove = useMutation({
    mutationFn: deleteLanguage,
    onSuccess: () => {
      toast.success("Idioma eliminado");
      void qc.invalidateQueries({ queryKey: ["languages"] });
    },
  });

  function startNew() {
    setEditing(null);
    setForm({ ...empty, sortOrder: languages.length + 1 });
    setOpen(true);
  }
  function startEdit(l: Language) {
    setEditing(l);
    setForm({
      code: l.code,
      name: l.name,
      nativeName: l.nativeName,
      sortOrder: l.sortOrder,
      isActive: l.isActive,
    });
    setOpen(true);
  }

  return (
    <AdminShell title="Idiomas" action={<Button onClick={startNew}>Nuevo idioma</Button>}>
      <AdminTable
        headers={["ID", "Código", "Nombre", "Nativo", "Orden", "Estado", "Acciones"]}
        empty={languages.length === 0}
      >
        {languages.map((l) => (
          <AdminRow key={l.id}>
            <Td className="tabular-nums text-muted-foreground">{l.id}</Td>
            <Td className="uppercase">{l.code}</Td>
            <Td className="font-medium">{l.name}</Td>
            <Td>{l.nativeName}</Td>
            <Td className="tabular-nums">{l.sortOrder}</Td>
            <Td>
              <Badge variant={l.isActive ? "success" : "secondary"}>
                {l.isActive ? "Activo" : "Inactivo"}
              </Badge>
            </Td>
            <Td>
              <RowActions
                onEdit={() => startEdit(l)}
                onDelete={() => {
                  if (confirm("¿Eliminar este idioma y todo su contenido?")) {
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
            <DialogTitle>{editing ? "Editar idioma" : "Nuevo idioma"}</DialogTitle>
          </DialogHeader>
          <form
            className="grid gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              save.mutate({ data: { id: editing?.id, ...form } });
            }}
          >
            <TextField
              label="Código *"
              required
              value={form.code}
              onChange={(code) => setForm({ ...form, code })}
            />
            <TextField
              label="Nombre *"
              required
              value={form.name}
              onChange={(name) => setForm({ ...form, name })}
            />
            <TextField
              label="Nombre nativo"
              value={form.nativeName}
              onChange={(nativeName) => setForm({ ...form, nativeName })}
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
