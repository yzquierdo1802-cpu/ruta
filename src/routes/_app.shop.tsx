import { createFileRoute } from "@tanstack/react-router";
import { Check, Crown } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  exclusiveUntilLabel,
  isExclusive,
  useProgress,
} from "@/lib/progress";

export const Route = createFileRoute("/_app/shop")({
  component: ShopPage,
});

const PERKS = [
  "Lecciones ilimitadas cada día",
  "Escenas extra en el chatbot",
  "Repaso de vocabulario con audio",
  "Estadísticas y racha protegida",
];

const PACKS = [
  { id: "week", days: 7, label: "7 días", price: "Gratis en la demo", highlight: true },
  { id: "month", days: 30, label: "1 mes", price: "S/ 19.90", highlight: false },
  { id: "year", days: 365, label: "1 año", price: "S/ 99.90", highlight: false },
] as const;

function ShopPage() {
  const exclusiveUntil = useProgress((s) => s.exclusiveUntil);
  const activateExclusive = useProgress((s) => s.activateExclusive);
  const exclusive = isExclusive(exclusiveUntil);
  const until = exclusiveUntilLabel(exclusiveUntil);

  function buy(days: number, label: string) {
    activateExclusive(days);
    toast.success(`Exclusivo activado: ${label}`, {
      description: "No hay cobro real. Es una muestra para probar las escenas extra.",
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <span className="flex size-12 items-center justify-center rounded-2xl bg-coral text-coral-foreground">
          <Crown className="size-6" />
        </span>
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
            Exclusivo
          </p>
          <h1 className="font-display text-3xl font-medium">Ruta Exclusivo</h1>
        </div>
      </div>
      <p className="text-muted-foreground">
        {exclusive
          ? `Tu plan está activo hasta el ${until}. Puedes extenderlo cuando quieras.`
          : "Desbloquea escenas extra del chatbot y práctica cuando quieras. Esta vista es una muestra: no hay cobro real."}
      </p>
      <ul className="space-y-2">
        {PERKS.map((perk) => (
          <li key={perk} className="flex items-center gap-2 text-sm">
            <Check className="size-4 text-coral" />
            {perk}
          </li>
        ))}
      </ul>
      <div className="grid gap-3">
        {PACKS.map((pack) => (
          <button
            key={pack.id}
            type="button"
            onClick={() => buy(pack.days, pack.label)}
            className={`flex items-center justify-between rounded-2xl px-4 py-4 text-left ${
              pack.highlight
                ? "bg-coral text-coral-foreground"
                : "bg-muted text-foreground"
            }`}
          >
            <span>
              <span className="block font-semibold">{pack.label}</span>
              <span className={`text-sm ${pack.highlight ? "text-coral-foreground/80" : "text-muted-foreground"}`}>
                {pack.price}
              </span>
            </span>
            <span className="text-sm font-medium">{exclusive ? "Extender" : "Activar"}</span>
          </button>
        ))}
      </div>
      <Button variant="outline" className="w-full rounded-full" asChild>
        <a href="/">Volver al mapa</a>
      </Button>
    </div>
  );
}
