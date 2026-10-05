import { useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Layers,
  BookOpen,
  CircleHelp,
  ListChecks,
  Users,
  Library,
  Languages,
  Menu,
  ArrowLeft,
} from "lucide-react";
import { useState } from "react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const LINKS = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { to: "/admin/categories", label: "Categorías", icon: Layers },
  { to: "/admin/lessons", label: "Lecciones", icon: BookOpen },
  { to: "/admin/questions", label: "Preguntas", icon: CircleHelp },
  { to: "/admin/answers", label: "Respuestas", icon: ListChecks },
  { to: "/admin/users", label: "Usuarios", icon: Users },
  { to: "/admin/vocabulary", label: "Vocabulario", icon: Library },
  { to: "/admin/languages", label: "Idiomas", icon: Languages },
] as const;

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="flex flex-1 flex-col gap-1 px-3">
      {LINKS.map((item) => {
        const Icon = item.icon;
        const active =
          item.to === "/admin"
            ? pathname === "/admin"
            : pathname.startsWith(item.to);
        return (
          <a
            key={item.to}
            href={item.to}
            onClick={onNavigate}
            className={cn(
              "flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors",
              active
                ? "bg-admin-muted text-admin-foreground"
                : "text-admin-foreground/70 hover:bg-admin-muted/60 hover:text-admin-foreground",
            )}
          >
            <Icon className="size-4" />
            {item.label}
          </a>
        );
      })}
    </nav>
  );
}

function SidebarBody({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <>
      <div className="flex items-center gap-2 px-5 py-5 text-admin-foreground">
        <Logo className="text-admin-foreground" />
      </div>
      <NavLinks onNavigate={onNavigate} />
      <div className="mt-auto border-t border-white/10 p-4">
        <p className="text-xs uppercase tracking-wide text-admin-foreground/50">Sesión</p>
        <p className="mt-1 text-sm font-medium text-admin-foreground">Administrador</p>
        <a
          href="/"
          onClick={onNavigate}
          className="mt-3 inline-flex h-8 w-full items-center justify-start gap-2 rounded-md px-3 text-sm text-admin-foreground/80 hover:bg-admin-muted hover:text-admin-foreground"
        >
          <ArrowLeft className="size-4" />
          Volver al curso
        </a>
      </div>
    </>
  );
}

export function AdminShell({
  title,
  children,
  action,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="min-h-dvh bg-muted/40 text-foreground">
      <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col bg-admin text-admin-foreground lg:flex">
        <SidebarBody />
      </aside>
      <div className="lg:pl-60">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b bg-card px-4">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Menú">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-60 p-0">
              <SidebarBody onNavigate={() => setOpen(false)} />
            </SheetContent>
          </Sheet>
          <h1 className="font-display text-lg font-medium sm:text-xl">{title}</h1>
          <div className="ml-auto flex items-center gap-2">{action}</div>
        </header>
        <div className="p-4 sm:p-6">{children}</div>
      </div>
    </div>
  );
}
