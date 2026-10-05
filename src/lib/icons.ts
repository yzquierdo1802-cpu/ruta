import type { LucideIcon } from "lucide-react";
import {
  BookOpen,
  Hand,
  Users,
  UtensilsCrossed,
  Hash,
  Plane,
  ShoppingBag,
  CloudSun,
  ConciergeBell,
  Siren,
  Heart,
  Briefcase,
  Home,
  GraduationCap,
  PawPrint,
  Landmark,
  MapPin,
  Wallet,
  Music,
  Stethoscope,
  Palette,
  MessageCircle,
  Languages,
  Clock,
  SpellCheck,
} from "lucide-react";

export const CATEGORY_ICONS: { name: string; label: string; Icon: LucideIcon }[] = [
  { name: "hand", label: "Saludo", Icon: Hand },
  { name: "book-open", label: "Libro", Icon: BookOpen },
  { name: "users", label: "Personas", Icon: Users },
  { name: "utensils", label: "Comida", Icon: UtensilsCrossed },
  { name: "hash", label: "Números", Icon: Hash },
  { name: "plane", label: "Viaje", Icon: Plane },
  { name: "shopping-bag", label: "Compras", Icon: ShoppingBag },
  { name: "cloud-sun", label: "Clima", Icon: CloudSun },
  { name: "bell", label: "Hotel", Icon: ConciergeBell },
  { name: "siren", label: "Alerta", Icon: Siren },
  { name: "heart", label: "Corazón", Icon: Heart },
  { name: "briefcase", label: "Trabajo", Icon: Briefcase },
  { name: "home", label: "Casa", Icon: Home },
  { name: "graduation-cap", label: "Escuela", Icon: GraduationCap },
  { name: "paw-print", label: "Mascotas", Icon: PawPrint },
  { name: "landmark", label: "Ciudad", Icon: Landmark },
  { name: "map-pin", label: "Lugar", Icon: MapPin },
  { name: "wallet", label: "Dinero", Icon: Wallet },
  { name: "music", label: "Música", Icon: Music },
  { name: "stethoscope", label: "Salud", Icon: Stethoscope },
  { name: "palette", label: "Colores", Icon: Palette },
  { name: "message-circle", label: "Charla", Icon: MessageCircle },
  { name: "languages", label: "Idiomas", Icon: Languages },
  { name: "clock", label: "Hora", Icon: Clock },
  { name: "spell-check", label: "Gramática", Icon: SpellCheck },
];

const ICON_MAP = Object.fromEntries(
  CATEGORY_ICONS.map((item) => [item.name, item.Icon]),
) as Record<string, LucideIcon>;

export function getCategoryIcon(name: string): LucideIcon {
  return ICON_MAP[name] ?? BookOpen;
}
