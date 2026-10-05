import { useEffect } from "react";
import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { LearnerShell } from "@/components/layout/learner-shell";
import { listLanguages } from "@/lib/server/queries";
import { useProgress } from "@/lib/progress";

export const Route = createFileRoute("/_app")({
  loader: async () => ({ languages: await listLanguages() }),
  component: AppLayout,
});

function AppLayout() {
  const { languages: initial } = Route.useLoaderData();
  const { data: languages = initial } = useQuery({
    queryKey: ["languages"],
    queryFn: () => listLanguages(),
    initialData: initial,
    staleTime: Infinity,
    refetchOnMount: false,
  });
  const languageId = useProgress((s) => s.targetLanguageId);
  const setLanguage = useProgress((s) => s.setLanguage);

  useEffect(() => {
    if (languageId || !languages.length) return;
    const preferred = languages.find((l) => l.code === "en") ?? languages[0];
    setLanguage(preferred.id);
  }, [languageId, languages, setLanguage]);

  return (
    <LearnerShell languages={languages}>
      <Outlet />
    </LearnerShell>
  );
}
