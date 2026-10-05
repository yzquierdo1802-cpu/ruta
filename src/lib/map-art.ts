export type PinArt = {
  photo: string;
  scene: string;
};

const DEFAULT_ART: PinArt = {
  photo: "/map/pin-greet.jpg",
  scene: "/map/scene-airport.jpg",
};

export const ART_BY_ICON: Record<string, PinArt> = {
  hand: { photo: "/map/pin-greet.jpg", scene: "/map/scene-airport.jpg" },
  "book-open": { photo: "/map/pin-vocab.jpg", scene: "/map/scene-class.jpg" },
  users: { photo: "/map/pin-family.jpg", scene: "/map/scene-home.jpg" },
  utensils: { photo: "/map/pin-food.jpg", scene: "/map/scene-cafe.jpg" },
  hash: { photo: "/map/pin-numbers.jpg", scene: "/map/scene-class.jpg" },
  plane: { photo: "/map/pin-travel.jpg", scene: "/map/scene-station.jpg" },
  "shopping-bag": { photo: "/map/pin-shop.jpg", scene: "/map/scene-market.jpg" },
  "cloud-sun": { photo: "/map/pin-weather.jpg", scene: "/map/scene-seasons.jpg" },
  bell: { photo: "/map/pin-hotel.jpg", scene: "/map/scene-hotel.jpg" },
  briefcase: { photo: "/map/pin-office.jpg", scene: "/map/scene-office.jpg" },
  home: { photo: "/map/pin-family.jpg", scene: "/map/scene-home.jpg" },
  "graduation-cap": { photo: "/map/pin-teacher.jpg", scene: "/map/scene-class.jpg" },
  clock: { photo: "/map/pin-clock.jpg", scene: "/map/scene-class.jpg" },
  "spell-check": { photo: "/map/pin-teacher.jpg", scene: "/map/scene-class.jpg" },
  landmark: { photo: "/map/pin-globe.jpg", scene: "/map/scene-station.jpg" },
  stethoscope: { photo: "/map/pin-health.jpg", scene: "/map/scene-clinic.jpg" },
  "paw-print": { photo: "/map/pin-pets.jpg", scene: "/map/scene-pets.jpg" },
  wallet: { photo: "/map/pin-money.jpg", scene: "/map/scene-bank.jpg" },
};

export const WORLD_MAP = "/map/world.jpg";
export const CHAT_PIN = "/map/pin-chat.jpg";
export const TEACHER_PIN = "/map/pin-teacher.jpg";

export function artFor(icon?: string | null): PinArt {
  if (!icon) return DEFAULT_ART;
  return ART_BY_ICON[icon] ?? DEFAULT_ART;
}

const PIN_ORDER = [
  "hand",
  "__daily",
  "hash",
  "plane",
  "cloud-sun",
  "__chat",
  "book-open",
  "users",
  "utensils",
  "shopping-bag",
  "landmark",
  "clock",
  "spell-check",
  "graduation-cap",
  "home",
  "briefcase",
  "stethoscope",
  "paw-print",
  "wallet",
  "bell",
] as const;

export type MapSlot =
  | { kind: "category"; icon: string }
  | { kind: "daily" }
  | { kind: "chat" };

export function mapSlotsFor(icons: string[]): MapSlot[] {
  const remaining = new Set(icons);
  const slots: MapSlot[] = [];
  for (const key of PIN_ORDER) {
    if (key === "__daily") {
      slots.push({ kind: "daily" });
      continue;
    }
    if (key === "__chat") {
      slots.push({ kind: "chat" });
      continue;
    }
    if (remaining.has(key)) {
      slots.push({ kind: "category", icon: key });
      remaining.delete(key);
    }
  }
  for (const icon of icons) {
    if (remaining.has(icon)) {
      slots.push({ kind: "category", icon });
      remaining.delete(icon);
    }
  }
  return slots;
}

export function lessonKicker(lessonType: string, index: number) {
  if (lessonType === "conversation") return "Conversación";
  if (lessonType === "review") return "Vocabulario";
  if (lessonType === "grammar") return `Gramática ${index + 1}`;
  return `Lección ${index + 1}`;
}

export function lessonSubtitle(description: string, fallback: string) {
  const cleaned = description
    .replace(/^practica\s+/i, "")
    .replace(/\s+y más\.?$/i, "")
    .trim();
  if (!cleaned) return fallback;
  const first = cleaned.split(/,\s*/).slice(0, 2).join(", ");
  return first.length > 28 ? `${first.slice(0, 26)}…` : first;
}

export function levelFromXp(xp: number) {
  return Math.floor(Math.max(0, xp) / 80) + 1;
}
