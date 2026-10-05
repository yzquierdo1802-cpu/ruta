import { Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function AdminTable({
  headers,
  children,
  empty,
}: {
  headers: string[];
  children: React.ReactNode;
  empty?: boolean;
}) {
  return (
    <div className="overflow-x-auto rounded-xl bg-card shadow-border">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="border-b bg-muted/50 text-muted-foreground">
          <tr>
            {headers.map((h) => (
              <th key={h} className="px-4 py-3 font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{empty ? null : children}</tbody>
      </table>
      {empty ? (
        <p className="px-4 py-12 text-center text-sm text-muted-foreground">
          No hay registros todavía.
        </p>
      ) : null}
    </div>
  );
}

export function AdminRow({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <tr className={cn("border-b last:border-0 hover:bg-muted/40", className)}>
      {children}
    </tr>
  );
}

export function Td({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <td className={cn("px-4 py-3 align-middle", className)}>{children}</td>;
}

export function ActiveBadge({ on }: { on: boolean }) {
  return (
    <Badge variant={on ? "success" : "secondary"}>{on ? "Activo" : "Inactivo"}</Badge>
  );
}

export function RowActions({
  onEdit,
  onDelete,
  extra,
}: {
  onEdit: () => void;
  onDelete: () => void;
  extra?: React.ReactNode;
}) {
  return (
    <div className="flex gap-1">
      {extra}
      <Button
        type="button"
        variant="secondary"
        size="icon"
        className="size-9 bg-warn/15 text-warn hover:bg-warn/25"
        onClick={onEdit}
        aria-label="Editar"
      >
        <Pencil className="size-4" />
      </Button>
      <Button
        type="button"
        variant="destructive"
        size="icon"
        className="size-9"
        onClick={onDelete}
        aria-label="Eliminar"
      >
        <Trash2 className="size-4" />
      </Button>
    </div>
  );
}
