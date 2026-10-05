import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Crown, RotateCcw, Settings2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  exclusiveUntilLabel,
  isExclusive,
  useProgress,
} from "@/lib/progress";

export const Route = createFileRoute("/_app/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const displayName = useProgress((s) => s.displayName);
  const setDisplayName = useProgress((s) => s.setDisplayName);
  const autoSpeak = useProgress((s) => s.autoSpeak);
  const setAutoSpeak = useProgress((s) => s.setAutoSpeak);
  const exclusiveUntil = useProgress((s) => s.exclusiveUntil);
  const resetProgress = useProgress((s) => s.resetProgress);
  const [name, setName] = useState(displayName);
  const exclusive = isExclusive(exclusiveUntil);
  const until = exclusiveUntilLabel(exclusiveUntil);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
          Ajustes
        </p>
        <h1 className="font-display text-3xl font-medium">Tu cuenta local</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          El progreso se guarda en este dispositivo. No hay inicio de sesión.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="display-name">Nombre en el marcador</Label>
        <div className="flex gap-2">
          <Input
            id="display-name"
            value={name}
            maxLength={24}
            onChange={(e) => setName(e.target.value)}
          />
          <Button
            type="button"
            onClick={() => setDisplayName(name)}
            className="rounded-full"
          >
            Guardar
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between rounded-2xl bg-muted px-4 py-3">
        <div>
          <p className="font-medium">Leer en voz alta</p>
          <p className="text-sm text-muted-foreground">
            Reproduce el audio al abrir cada ejercicio de escuchar
          </p>
        </div>
        <Switch checked={autoSpeak} onCheckedChange={setAutoSpeak} />
      </div>

      <div className="rounded-2xl bg-muted px-4 py-4">
        <div className="flex items-center gap-2">
          <Crown className={exclusive ? "size-4 text-gold" : "size-4 text-muted-foreground"} />
          <p className="font-medium">Ruta Exclusivo</p>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {exclusive ? `Activo hasta el ${until}` : "Sin plan activo. Desbloquea escenas extra en el chat."}
        </p>
        <Button asChild className="mt-3 rounded-full bg-coral text-coral-foreground hover:bg-coral/90">
          <a href="/shop">{exclusive ? "Extender" : "Ver planes"}</a>
        </Button>
      </div>

      <div className="rounded-2xl border border-border px-4 py-4">
        <div className="flex items-center gap-2">
          <Settings2 className="size-4 text-muted-foreground" />
          <p className="font-medium">Contenido</p>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Categorías, lecciones, preguntas y respuestas se editan en el panel.
        </p>
        <Button asChild variant="outline" className="mt-3 rounded-full">
          <a href="/admin">Abrir panel de contenidos</a>
        </Button>
      </div>

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="outline" className="w-full rounded-full text-destructive">
            <RotateCcw className="size-4" />
            Reiniciar progreso
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Borrar tu racha y XP?</AlertDialogTitle>
            <AlertDialogDescription>
              Se ponen a cero lecciones, palabras y puntos de este dispositivo. El contenido del curso no se toca.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => resetProgress()}>Reiniciar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
