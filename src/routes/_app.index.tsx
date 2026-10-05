import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CategoryMap } from "@/components/map/category-map";
import { WORLD_MAP } from "@/lib/map-art";
import { listCategories, listLanguages, listLessons } from "@/lib/server/queries";
import { useProgress } from "@/lib/progress";

export const Route = createFileRoute("/_app/")({
  loader: async () => {
    const languages = await listLanguages();
    const preferred = languages.find((l) => l.code === "en") ?? languages[0];
    const languageId = preferred?.id;
    const [categories, lessons] = await Promise.all([
      listCategories({ data: { languageId } }),
      listLessons({ data: {} }),
    ]);
    return { categories, lessons, languageId };
  },
  component: HomePage,
});

function HomePage() {
  const initial = Route.useLoaderData();
  const storedId = useProgress((s) => s.targetLanguageId);
  const languageId = storedId ?? initial.languageId;
  const completed = useProgress((s) => s.completedLessons);

  const { data: categories = initial.categories } = useQuery({
    queryKey: ["categories", languageId],
    queryFn: () => listCategories({ data: { languageId: languageId ?? undefined } }),
    enabled: Boolean(languageId),
    initialData: languageId === initial.languageId ? initial.categories : undefined,
  });

  const { data: lessons = initial.lessons } = useQuery({
    queryKey: ["lessons"],
    queryFn: () => listLessons({ data: {} }),
    initialData: initial.lessons,
  });

  const progressByCat: Record<number, { done: number; total: number }> = {};
  for (const lesson of lessons) {
    const stats = progressByCat[lesson.categoryId] ?? { done: 0, total: 0 };
    stats.total += 1;
    if (completed[String(lesson.id)]) stats.done += 1;
    progressByCat[lesson.categoryId] = stats;
  }

  return (
    <div className="relative min-h-dvh">
      <div
        className="pointer-events-none absolute inset-0 bg-sky bg-cover bg-center"
        style={{ backgroundImage: `url(${WORLD_MAP})` }}
      />
      <div className="pointer-events-none absolute inset-0 bg-sky/10" />
      <div className="relative z-10">
        <CategoryMap categories={categories} progressByCat={progressByCat} />
      </div>
    </div>
  );
}
