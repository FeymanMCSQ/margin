import { normalizePerson, STORAGE_KEY as V1_KEY, type Person } from "./people";
import {
  ALL_PROMPTS,
  PROMPT_IDS,
  SECTIONS,
  type Collection,
  type Prompt,
} from "./prompts";

export const STORAGE_KEY = "margin.conversations.v2";
export const BACKUP_KEY = "margin.backup.before-v2";
export const ACTIVE_KEY = "margin.active.v2";
export const PLAN_STATES = [
  "considered",
  "proposed",
  "accepted",
  "declined",
  "completed",
  "cancelled",
] as const;
export type PlanState = (typeof PLAN_STATES)[number];
export type Plan = {
  id: string;
  idea: string;
  state: PlanState;
  updatedAt: string;
  activity: string;
  date: string;
  promptId?: string;
};
export type Profile = Person & {
  temporary: boolean;
  usedPrompts: Record<string, string>;
  lastSection: Collection;
  positions: Partial<Record<Collection, string>>;
  interests: string[];
  lastDiscussed: string;
  upcomingEvent: string;
  plans: Plan[];
};
export type State = { app: "margin"; version: 2; people: Profile[] };
export const emptyState = (): State => ({
  app: "margin",
  version: 2,
  people: [],
});
type Store = Pick<Storage, "getItem" | "setItem">;
const object = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);
const safeId = (v: unknown): v is string =>
  typeof v === "string" &&
  /^[a-zA-Z0-9_-]{1,100}$/.test(v) &&
  !["__proto__", "constructor", "prototype"].includes(v);
const string = (v: unknown, max: number): v is string =>
  typeof v === "string" &&
  v.length <= max &&
  !/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(v);
const iso = (v: unknown): v is string =>
  typeof v === "string" && Number.isFinite(Date.parse(v)) && v.length <= 40;
const collections: Collection[] = [...SECTIONS, "plans", "aron"];
const unique = <T>(items: T[]) => [...new Set(items)];
function fail(): never {
  throw new Error(
    "Invalid Margin data. Your saved data has not been replaced.",
  );
}

export function upgradePerson(raw: unknown): Profile {
  if (
    !object(raw) ||
    !safeId(raw.id) ||
    !string(raw.name, 42) ||
    !raw.name.trim() ||
    !Array.isArray(raw.asked) ||
    !raw.asked.every((n) => Number.isInteger(n) && n >= 0 && n < 36) ||
    !Number.isInteger(raw.current) ||
    (raw.current as number) < 0 ||
    (raw.current as number) >= 36 ||
    typeof raw.created !== "number" ||
    !Number.isFinite(raw.created) ||
    typeof raw.updated !== "number" ||
    !Number.isFinite(raw.updated)
  )
    return fail();
  const old = normalizePerson(raw)!;
  return {
    ...old,
    temporary: false,
    usedPrompts: {},
    lastSection: "aron",
    positions: { aron: `aron-${old.current}` },
    interests: [],
    lastDiscussed: "",
    upcomingEvent: "",
    plans: [],
  };
}
export function newProfile(name: string, temporary = false): Profile {
  const now = Date.now();
  return {
    ...upgradePerson({
      id: crypto.randomUUID(),
      name,
      asked: [],
      current: 0,
      created: now,
      updated: now,
    }),
    temporary,
    lastSection: "open",
    positions: {},
  };
}
export function validateState(raw: unknown): State {
  if (
    !object(raw) ||
    raw.app !== "margin" ||
    raw.version !== 2 ||
    !Array.isArray(raw.people) ||
    raw.people.length > 1000
  )
    return fail();
  const ids = new Set<string>();
  const people = raw.people.map((value: unknown) => {
    const base = upgradePerson(value);
    const p = value as Record<string, unknown>;
    if (
      ids.has(base.id) ||
      typeof p.temporary !== "boolean" ||
      !collections.includes(p.lastSection as Collection) ||
      !object(p.positions) ||
      !object(p.usedPrompts) ||
      !Array.isArray(p.interests) ||
      p.interests.length > 30 ||
      !p.interests.every((t) => string(t, 60)) ||
      !string(p.lastDiscussed, 2000) ||
      !string(p.upcomingEvent, 300) ||
      !Array.isArray(p.plans) ||
      p.plans.length > 1000
    )
      return fail();
    ids.add(base.id);
    const usedPrompts: Record<string, string> = {};
    for (const [id, at] of Object.entries(p.usedPrompts)) {
      if (!PROMPT_IDS.has(id) || id.startsWith("aron-") || !iso(at))
        return fail();
      usedPrompts[id] = at;
    }
    const positions: Profile["positions"] = {};
    for (const [section, id] of Object.entries(p.positions)) {
      const card = ALL_PROMPTS.find((c) => c.id === id);
      if (
        !collections.includes(section as Collection) ||
        !card ||
        (section === "aron"
          ? !card.id.startsWith("aron-")
          : card.id.startsWith("aron-") || card.section !== section)
      )
        return fail();
      positions[section as Collection] = id as string;
    }
    const planIds = new Set<string>();
    const plans: Plan[] = p.plans.map((plan: unknown) => {
      if (
        !object(plan) ||
        !safeId(plan.id) ||
        planIds.has(plan.id) ||
        !string(plan.idea, 500) ||
        !plan.idea.trim() ||
        !PLAN_STATES.includes(plan.state as PlanState) ||
        !iso(plan.updatedAt) ||
        !string(plan.activity, 300) ||
        !string(plan.date, 10) ||
        (plan.date !== "" &&
          (!/^\d{4}-\d{2}-\d{2}$/.test(plan.date) ||
            !Number.isFinite(Date.parse(plan.date)) ||
            new Date(plan.date).toISOString().slice(0, 10) !== plan.date)) ||
        (plan.promptId !== undefined &&
          !ALL_PROMPTS.some(
            (c) => c.section === "plans" && c.id === plan.promptId,
          ))
      )
        return fail();
      planIds.add(plan.id);
      return {
        id: plan.id,
        idea: plan.idea,
        state: plan.state as PlanState,
        updatedAt: plan.updatedAt,
        activity: plan.activity,
        date: plan.date,
        ...(plan.promptId ? { promptId: plan.promptId as string } : {}),
      };
    });
    return {
      ...base,
      temporary: p.temporary,
      usedPrompts,
      positions,
      lastSection: p.lastSection as Collection,
      interests: unique(p.interests as string[]),
      lastDiscussed: p.lastDiscussed,
      upcomingEvent: p.upcomingEvent,
      plans,
    };
  });
  return { app: "margin", version: 2, people };
}
export function migrateV1(raw: unknown): State {
  const items = Array.isArray(raw)
    ? raw
    : object(raw) && raw.app === "margin" && raw.version === 1
      ? raw.people
      : null;
  if (!Array.isArray(items) || items.length > 1000) return fail();
  return validateState({
    app: "margin",
    version: 2,
    people: items.map(upgradePerson),
  });
}
export function loadState(storage: Store): State {
  const saved = storage.getItem(STORAGE_KEY);
  if (saved !== null) return validateState(JSON.parse(saved));
  const legacy = storage.getItem(V1_KEY);
  if (legacy === null) return emptyState();
  const upgraded = migrateV1(JSON.parse(legacy));
  if (storage.getItem(BACKUP_KEY) === null) storage.setItem(BACKUP_KEY, legacy);
  storage.setItem(STORAGE_KEY, JSON.stringify(upgraded));
  return upgraded;
}
export function parseImport(text: string): State {
  if (text.length > 2_000_000)
    throw new Error("Backup is too large (maximum 2 MB).");
  const raw: unknown = JSON.parse(text);
  if (!object(raw) || raw.app !== "margin") return fail();
  return raw.version === 1 ? migrateV1(raw) : validateState(raw);
}
export function mergeStates(current: State, incoming: State): State {
  const byId = new Map(current.people.map((p) => [p.id, p]));
  for (const person of incoming.people) {
    const prev = byId.get(person.id);
    if (!prev) {
      byId.set(person.id, person);
      continue;
    }
    const newer = person.updated > prev.updated ? person : prev;
    const older = newer === person ? prev : person;
    const plans = new Map(prev.plans.map((p) => [p.id, p]));
    for (const plan of person.plans) {
      const previous = plans.get(plan.id);
      if (
        !previous ||
        Date.parse(plan.updatedAt) > Date.parse(previous.updatedAt)
      )
        plans.set(plan.id, plan);
    }
    byId.set(person.id, {
      ...newer,
      asked: unique([...prev.asked, ...person.asked]),
      usedPrompts: { ...older.usedPrompts, ...newer.usedPrompts },
      interests: unique([...newer.interests, ...older.interests]),
      plans: [...plans.values()],
      created: Math.min(prev.created, person.created),
    });
  }
  return validateState({
    app: "margin",
    version: 2,
    people: [...byId.values()],
  });
}
export function isUsed(person: Profile, id: string): boolean {
  return id.startsWith("aron-")
    ? person.asked.includes(Number(id.slice(5)))
    : Object.hasOwn(person.usedPrompts, id);
}
export function markUsed(
  person: Profile,
  id: string,
  used: boolean,
  now = new Date().toISOString(),
): Profile {
  if (!PROMPT_IDS.has(id)) throw new Error("Unknown prompt");
  if (id.startsWith("aron-")) {
    const index = Number(id.slice(5));
    return {
      ...person,
      asked: used
        ? unique([...person.asked, index])
        : person.asked.filter((n) => n !== index),
    };
  }
  const history = { ...person.usedPrompts };
  if (used) history[id] = now;
  else delete history[id];
  return { ...person, usedPrompts: history };
}
export function selectCards(
  cards: Prompt[],
  person: Profile,
  topic: string,
  skipped: string[],
  showUsed: boolean,
  directInterest = false,
): { cards: Prompt[]; fallback: boolean } {
  let available = cards.filter(
    (c) => directInterest || c.subcategory !== "direct_interest",
  );
  const matches = topic
    ? available.filter(
        (c) => c.contextTags.includes(topic) || c.subcategory === topic,
      )
    : available;
  const fallback = !!topic && matches.length === 0;
  if (!fallback) available = matches;
  return {
    cards: available.filter(
      (c) => (showUsed || !isUsed(person, c.id)) && !skipped.includes(c.id),
    ),
    fallback,
  };
}
export function nextCard(
  cards: Prompt[],
  currentId?: string,
): string | undefined {
  if (!cards.length) return undefined;
  const index = cards.findIndex((c) => c.id === currentId);
  return cards[(index + 1) % cards.length].id;
}
export function updatePlan(
  plan: Plan,
  state: PlanState,
  now = new Date().toISOString(),
): Plan {
  if (!PLAN_STATES.includes(state)) throw new Error("Unknown plan state");
  return { ...plan, state, updatedAt: now };
}
