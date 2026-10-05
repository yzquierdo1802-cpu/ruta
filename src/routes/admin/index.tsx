import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AdminShell } from "@/components/layout/admin-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getDashboard } from "@/lib/server/queries";

export const Route = createFileRoute("/admin/")({
  loader: async () => getDashboard(),
  component: AdminHome,
});

function AdminHome() {
  const initial = Route.useLoaderData();
  const { data = initial } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => getDashboard(),
    initialData: initial,
    staleTime: Infinity,
    refetchOnMount: false,
  });

  const stats = [
    { label: "Idiomas", value: data?.languages ?? 0, to: "/admin/languages" },
    { label: "Categorías", value: data?.categories ?? 0, to: "/admin/categories" },
    { label: "Lecciones", value: data?.lessons ?? 0, to: "/admin/lessons" },
    { label: "Preguntas", value: data?.questions ?? 0, to: "/admin/questions" },
    { label: "Respuestas", value: data?.answers ?? 0, to: "/admin/answers" },
    { label: "Vocabulario", value: data?.vocabulary ?? 0, to: "/admin/vocabulary" },
    { label: "Usuarios", value: data?.users ?? 0, to: "/admin/users" },
  ];

  return (
    <AdminShell title="Dashboard">
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {stats.map((s) => (
          <a key={s.label} href={s.to}>
            <Card className="p-5">
              <p className="text-sm text-muted-foreground">{s.label}</p>
              <p className="font-display text-3xl tabular-nums">{s.value}</p>
            </Card>
          </a>
        ))}
      </div>

      {(data?.lessonsEmpty || data?.questionsEmpty) ? (
        <Card className="mt-4 border-warn/30 bg-warn/10 p-5">
          <h2 className="font-display text-lg">Pendiente de completar</h2>
          <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
            {data.lessonsEmpty > 0 ? (
              <li>
                {data.lessonsEmpty} lección{data.lessonsEmpty === 1 ? "" : "es"} sin preguntas.{" "}
                <a href="/admin/lessons" className="font-medium text-foreground underline">
                  Revisar lecciones
                </a>
              </li>
            ) : null}
            {data.questionsEmpty > 0 ? (
              <li>
                {data.questionsEmpty} pregunta{data.questionsEmpty === 1 ? "" : "s"} sin respuestas.{" "}
                <a href="/admin/questions" className="font-medium text-foreground underline">
                  Revisar preguntas
                </a>
              </li>
            ) : null}
          </ul>
        </Card>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <Button asChild>
          <a href="/admin/categories">Nueva categoría</a>
        </Button>
        <Button asChild variant="outline">
          <a href="/admin/lessons">Nueva lección</a>
        </Button>
        <Button asChild variant="outline">
          <a href="/admin/questions">Nueva pregunta</a>
        </Button>
        <Button asChild variant="outline">
          <a href="/admin/users">Nuevo usuario</a>
        </Button>
      </div>

      <Card className="mt-6 p-5">
        <h2 className="font-display text-lg">Lecciones por categoría</h2>
        <div className="mt-4 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={(data?.byCategory ?? []).slice(0, 8)}
              layout="vertical"
              margin={{ left: 8, right: 8 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis type="number" allowDecimals={false} />
              <YAxis type="category" dataKey="name" width={118} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="lessons" fill="var(--color-primary)" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </AdminShell>
  );
}
