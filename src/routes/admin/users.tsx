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
import { deleteCmsUser, listCmsUsers, listLanguages, saveCmsUser } from "@/lib/server/queries";
import { CMS_ROLES, cmsRoleLabel, type CmsUser } from "@/lib/types";

export const Route = createFileRoute("/admin/users")({
  loader: async () => {
    const [languages, users] = await Promise.all([listLanguages(), listCmsUsers()]);
    return { languages, users };
  },
  component: UsersAdmin,
});

const empty = {
  alias: "",
  role: "aprendiz",
  languageId: null as number | null,
  xp: 0,
  streak: 0,
  isActive: true,
  notes: "",
  sortOrder: 1,
};

function UsersAdmin() {
  const initial = Route.useLoaderData();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CmsUser | null>(null);
  const [form, setForm] = useState(empty);

  const { data: languages = initial.languages } = useQuery({
    queryKey: ["languages"],
    queryFn: () => listLanguages(),
    initialData: initial.languages,
    staleTime: Infinity,
    refetchOnMount: false,
  });
  const { data: users = initial.users } = useQuery({
    queryKey: ["cms-users"],
    queryFn: () => listCmsUsers(),
    initialData: initial.users,
    staleTime: Infinity,
    refetchOnMount: false,
  });

  const save = useMutation({
    mutationFn: saveCmsUser,
    onSuccess: () => {
      toast.success("Usuario guardado");
      void qc.invalidateQueries({ queryKey: ["cms-users"] });
      void qc.invalidateQueries({ queryKey: ["dashboard"] });
      setOpen(false);
    },
    onError: () => toast.error("No se pudo guardar"),
  });
  const remove = useMutation({
    mutationFn: deleteCmsUser,
    onSuccess: () => {
      toast.success("Usuario eliminado");
      void qc.invalidateQueries({ queryKey: ["cms-users"] });
      void qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  const filtered = users.filter((u) =>
    `${u.alias} ${u.role} ${u.notes}`.toLowerCase().includes(search.toLowerCase()),
  );

  function startNew() {
    setEditing(null);
    setForm({
      ...empty,
      languageId: languages.find((l) => l.code === "en")?.id ?? languages[0]?.id ?? null,
      sortOrder: users.length + 1,
    });
    setOpen(true);
  }
  function startEdit(u: CmsUser) {
    setEditing(u);
    setForm({
      alias: u.alias,
      role: u.role,
      languageId: u.languageId,
      xp: u.xp,
      streak: u.streak,
      isActive: u.isActive,
      notes: u.notes,
      sortOrder: u.sortOrder,
    });
    setOpen(true);
  }

  return (
    <AdminShell
      title="Usuarios"
      action={
        <>
          <Input
            placeholder="Buscar…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="hidden w-48 sm:block"
          />
          <Button onClick={startNew}>Nuevo usuario</Button>
        </>
      }
    >
      <Input
        placeholder="Buscar…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-4 sm:hidden"
      />
      <p className="mb-4 text-sm text-muted-foreground">
        Directorio del CMS y del marcador. Son alias del curso, no cuentas con contraseña.
      </p>
      <AdminTable
        headers={["ID", "Alias", "Rol", "Idioma", "XP", "Racha", "Estado", "Acciones"]}
        empty={filtered.length === 0}
      >
        {filtered.map((u) => (
          <AdminRow key={u.id}>
            <Td className="tabular-nums text-muted-foreground">{u.id}</Td>
            <Td className="font-medium">{u.alias}</Td>
            <Td>
              <Badge variant="secondary">{cmsRoleLabel(u.role)}</Badge>
            </Td>
            <Td>{u.languageName ?? "—"}</Td>
            <Td className="tabular-nums">{u.xp}</Td>
            <Td className="tabular-nums">{u.streak}</Td>
            <Td>
              <ActiveBadge on={u.isActive} />
            </Td>
            <Td>
              <RowActions
                onEdit={() => startEdit(u)}
                onDelete={() => {
                  if (confirm("¿Eliminar este usuario del directorio?")) {
                    remove.mutate({ data: { id: u.id } });
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
            <DialogTitle>{editing ? "Editar usuario" : "Nuevo usuario"}</DialogTitle>
          </DialogHeader>
          <form
            className="grid gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              save.mutate({ data: { id: editing?.id, ...form } });
            }}
          >
            <TextField
              label="Alias *"
              required
              value={form.alias}
              onChange={(alias) => setForm({ ...form, alias })}
            />
            <SelectField
              label="Rol"
              value={form.role}
              onChange={(role) => setForm({ ...form, role })}
              options={CMS_ROLES.map((r) => ({ value: r.value, label: r.label }))}
            />
            <SelectField
              label="Idioma"
              value={form.languageId ? String(form.languageId) : "none"}
              onChange={(v) =>
                setForm({ ...form, languageId: v === "none" ? null : Number(v) })
              }
              options={[
                { value: "none", label: "Sin idioma" },
                ...languages.map((l) => ({ value: String(l.id), label: l.name })),
              ]}
            />
            <NumberField
              label="XP (marcador)"
              value={form.xp}
              onChange={(xp) => setForm({ ...form, xp })}
            />
            <NumberField
              label="Racha"
              value={form.streak}
              onChange={(streak) => setForm({ ...form, streak })}
            />
            <NumberField
              label="Orden"
              value={form.sortOrder}
              onChange={(sortOrder) => setForm({ ...form, sortOrder })}
            />
            <AreaField
              label="Notas de rol"
              value={form.notes}
              onChange={(notes) => setForm({ ...form, notes })}
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
