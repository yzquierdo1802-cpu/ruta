import { artFor, CHAT_PIN, mapSlotsFor } from "@/lib/map-art";
import type { Category } from "@/lib/types";
import { TeardropPin } from "./teardrop-pin";

export function CategoryMap({
  categories,
  progressByCat,
}: {
  categories: Category[];
  progressByCat: Record<number, { done: number; total: number }>;
}) {
  const byIcon = new Map<string, Category[]>();
  for (const cat of categories) {
    const list = byIcon.get(cat.icon) ?? [];
    list.push(cat);
    byIcon.set(cat.icon, list);
  }
  const slots = mapSlotsFor(categories.map((c) => c.icon));
  const used = new Set<number>();

  const nodes = slots
    .map((slot, index) => {
      if (slot.kind === "daily") {
        return (
          <TeardropPin
            key="daily"
            to="/daily"
            label="Lección Diaria"
            photo="/map/pin-daily.jpg"
            rim="daily"
          />
        );
      }
      if (slot.kind === "chat") {
        return (
          <TeardropPin
            key="chat"
            to="/chat"
            label="Chatbot"
            photo={CHAT_PIN}
            rim="gold"
            progress="0/5"
            isNew
          />
        );
      }
      const pool = byIcon.get(slot.icon) ?? [];
      const cat = pool.find((c) => !used.has(c.id));
      if (!cat) return null;
      used.add(cat.id);
      const stats = progressByCat[cat.id] ?? { done: 0, total: 0 };
      const art = artFor(cat.icon);
      return (
        <TeardropPin
          key={cat.id}
          to="/category/$id"
          params={{ id: String(cat.id) }}
          label={cat.name}
          photo={art.photo}
          progress={`${stats.done}/${stats.total || 0}`}
          isNew={stats.done === 0 && index < 6}
        />
      );
    })
    .filter(Boolean);

  for (const cat of categories) {
    if (used.has(cat.id)) continue;
    const stats = progressByCat[cat.id] ?? { done: 0, total: 0 };
    const art = artFor(cat.icon);
    nodes.push(
      <TeardropPin
        key={cat.id}
        to="/category/$id"
        params={{ id: String(cat.id) }}
        label={cat.name}
        photo={art.photo}
        progress={`${stats.done}/${stats.total || 0}`}
      />,
    );
  }

  return (
    <div className="relative mx-auto w-full max-w-6xl px-3 pb-36 pt-16 sm:px-8 sm:pt-20">
      <svg
        className="pointer-events-none absolute inset-x-[8%] top-[28%] hidden h-[48%] w-[84%] md:block"
        viewBox="0 0 100 40"
        preserveAspectRatio="none"
        aria-hidden
      >
        <path
          d="M2 8 H98 C99 14 99 18 90 22 H10 C2 26 2 30 10 32 H98"
          fill="none"
          stroke="white"
          strokeWidth="0.45"
          strokeDasharray="1.6 1.8"
          opacity="0.55"
        />
      </svg>
      <div className="relative grid grid-cols-2 justify-items-center gap-x-2 gap-y-10 sm:grid-cols-3 md:grid-cols-5 md:gap-y-16">
        {nodes}
      </div>
    </div>
  );
}
