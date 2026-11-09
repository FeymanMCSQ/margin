export type Person = {
  id: string;
  name: string;
  asked: number[];
  current: number;
  created: number;
  updated: number;
};

export const STORAGE_KEY = "margin.conversations.v1";
export const ACTIVE_KEY = "margin.active.v1";

export function normalizePerson(value: unknown): Person | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  if (typeof raw.id !== "string" || !raw.id || typeof raw.name !== "string") return null;
  const name = raw.name.trim().slice(0, 42);
  if (!name) return null;
  const asked = Array.isArray(raw.asked)
    ? [...new Set(raw.asked.filter((n): n is number => Number.isInteger(n) && n >= 0 && n < 36))]
    : [];
  const current = typeof raw.current === "number" && Number.isInteger(raw.current) && raw.current >= 0 && raw.current < 36 ? raw.current : 0;
  const created = typeof raw.created === "number" && Number.isFinite(raw.created) ? raw.created : Date.now();
  const updated = typeof raw.updated === "number" && Number.isFinite(raw.updated) ? raw.updated : created;
  return { id: raw.id.slice(0, 100), name, asked, current, created, updated };
}

export function askedInSet(person: Person, set: number): number {
  return person.asked.filter(n => Math.floor(n / 12) === set).length;
}

export function firstUnasked(person: Person, set: number): number {
  for (let n = set * 12; n < set * 12 + 12; n++) {
    if (!person.asked.includes(n)) return n;
  }
  return set * 12;
}

export function nextUnasked(person: Person, from: number): number | null {
  for (let offset = 1; offset <= 36; offset++) {
    const n = (from + offset) % 36;
    if (!person.asked.includes(n)) return n;
  }
  return null;
}

export function dateLabel(time: number): string {
  const day = new Date(time);
  if (Number.isNaN(day.getTime())) return "Recently";
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const then = new Date(day.getFullYear(), day.getMonth(), day.getDate()).getTime();
  const delta = Math.round((start - then) / 86400000);
  if (delta === 0) return "Today";
  if (delta === 1) return "Yesterday";
  return day.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
