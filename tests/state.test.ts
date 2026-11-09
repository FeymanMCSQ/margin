import test from "node:test";
import assert from "node:assert/strict";
import { PROMPTS, ARON, cardsFor, validatePrompts } from "../lib/prompts";
import {
  STORAGE_KEY,
  BACKUP_KEY,
  PLAN_STATES,
  loadState,
  migrateV1,
  markUsed,
  selectCards,
  parseImport,
  validateState,
  mergeStates,
  updatePlan,
  type Profile,
  type State,
  type Plan,
} from "../lib/state";
import { QUESTIONS } from "../lib/questions";
import { STORAGE_KEY as V1_KEY } from "../lib/people";

const legacy = [
  {
    id: "person-a",
    name: "Ari",
    asked: [0, 3, 12, 35],
    current: 17,
    created: 1000,
    updated: 2000,
  },
  {
    id: "person-b",
    name: "Sam",
    asked: [1],
    current: 2,
    created: 1100,
    updated: 2200,
  },
];
const state = () => migrateV1(structuredClone(legacy));
const profile = () => state().people[0];
const at = "2026-11-10T00:00:00.000Z";
class MemoryStore {
  data = new Map<string, string>();
  writes = 0;
  getItem(key: string) {
    return this.data.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.data.set(key, value);
    this.writes++;
  }
}

test("complete seed has correct counts, unique IDs, sources and distinct wording", () => {
  assert.equal(validatePrompts(PROMPTS).length, 75);
  assert.deepEqual(
    ["open", "discover", "connect", "deepen", "reconnect", "plans"].map(
      (s) => PROMPTS.filter((p) => p.section === s).length,
    ),
    [16, 14, 15, 8, 10, 12],
  );
  assert.equal(new Set(PROMPTS.map((p) => p.id)).size, 75);
  assert.throws(() => validatePrompts([...PROMPTS.slice(1), PROMPTS[1]]));
  assert.throws(() =>
    validatePrompts(
      PROMPTS.map((p, i) => (i === 0 ? { ...p, sourceIds: ["invented"] } : p)),
    ),
  );
});
test("original questions retain numeric IDs, exact wording and original order", () => {
  assert.equal(ARON.length, 36);
  assert.deepEqual(
    ARON.map((p) => p.text),
    QUESTIONS,
  );
  assert.deepEqual(
    ARON.map((p) => p.id),
    Array.from({ length: 36 }, (_, i) => `aron-${i}`),
  );
  assert.deepEqual(
    cardsFor("aron", 2).map((p) => p.id),
    Array.from({ length: 12 }, (_, i) => `aron-${24 + i}`),
  );
});
test("production v1 arrays and v1 exports preserve every field and separate histories", () => {
  const migrated = state();
  migrated.people.forEach((person, i) => {
    for (const key of [
      "id",
      "name",
      "asked",
      "current",
      "created",
      "updated",
    ] as const)
      assert.deepEqual(person[key], legacy[i][key]);
    assert.equal(person.positions.aron, `aron-${legacy[i].current}`);
    assert.equal(person.lastSection, "aron");
  });
  assert.deepEqual(
    parseImport(JSON.stringify({ app: "margin", version: 1, people: legacy })),
    migrated,
  );
});
test("migration backs up before writing, never mutates v1, and is idempotent", () => {
  const storage = new MemoryStore();
  const original = JSON.stringify(legacy);
  storage.data.set(V1_KEY, original);
  const once = loadState(storage);
  assert.equal(storage.getItem(V1_KEY), original);
  assert.equal(storage.getItem(BACKUP_KEY), original);
  assert.equal(storage.writes, 2);
  const twice = loadState(storage);
  assert.deepEqual(twice, once);
  assert.equal(storage.writes, 2);
  once.people[0].lastSection = "connect";
  once.people[0].positions.connect = "mgv2-033";
  storage.setItem(STORAGE_KEY, JSON.stringify(once));
  assert.deepEqual(loadState(storage), once);
});
test("corrupt legacy/v2 and future versions are not silently replaced", () => {
  const storage = new MemoryStore();
  storage.data.set(V1_KEY, "{broken");
  assert.throws(() => loadState(storage));
  assert.equal(storage.writes, 0);
  storage.data.set(V1_KEY, JSON.stringify(legacy));
  storage.data.set(STORAGE_KEY, "broken");
  assert.throws(() => loadState(storage));
  assert.equal(storage.writes, 0);
  assert.throws(() => validateState({ ...state(), version: 3 }));
});
test("quota failure keeps original data and migration snapshot", () => {
  const storage = new MemoryStore();
  storage.data.set(V1_KEY, JSON.stringify(legacy));
  storage.setItem = (key, value) => {
    if (key === STORAGE_KEY) throw new Error("Quota");
    storage.data.set(key, value);
  };
  assert.throws(() => loadState(storage), /Quota/);
  assert.equal(storage.getItem(V1_KEY), JSON.stringify(legacy));
  assert.equal(storage.getItem(BACKUP_KEY), JSON.stringify(legacy));
});
test("used timestamps and original flags remain independent per profile", () => {
  const s = state();
  const a = markUsed(s.people[0], "mgv2-001", true, at);
  assert.equal(a.usedPrompts["mgv2-001"], at);
  assert.deepEqual(s.people[1].usedPrompts, {});
  assert.deepEqual(s.people[0].usedPrompts, {});
  assert.equal(
    markUsed(a, "mgv2-001", false).usedPrompts["mgv2-001"],
    undefined,
  );
  assert.ok(markUsed(a, "aron-5", true).asked.includes(5));
  assert.ok(!s.people[1].asked.includes(5));
  assert.ok(!markUsed(a, "aron-0", false).asked.includes(0));
  assert.throws(() => markUsed(a, "unknown", true));
});
test("skip is session-only; used hidden by default, explicit review available", () => {
  const p = markUsed(profile(), "mgv2-001", true, at);
  const open = cardsFor("open");
  assert.ok(
    !selectCards(open, p, "", ["mgv2-002"], false).cards.some((c) =>
      ["mgv2-001", "mgv2-002"].includes(c.id),
    ),
  );
  assert.ok(
    selectCards(open, p, "", [], false).cards.some((c) => c.id === "mgv2-002"),
  );
  assert.ok(
    selectCards(open, p, "", [], true).cards.some((c) => c.id === "mgv2-001"),
  );
  assert.equal(p.usedPrompts["mgv2-002"], undefined);
  assert.ok(
    !selectCards(open, p, "", [], false).cards.some(
      (c) => c.subcategory === "direct_interest",
    ),
  );
  assert.ok(
    selectCards(open, p, "", [], false, true).cards.some(
      (c) => c.subcategory === "direct_interest",
    ),
  );
});
test("context matches before unused filtering; exhausted topic does not repeat used or unrelated cards", () => {
  const discover = cardsFor("discover");
  const p = profile();
  const music = selectCards(discover, p, "music", [], false);
  assert.ok(music.cards.length);
  assert.ok(music.cards.every((c) => c.contextTags.includes("music")));
  const used = music.cards.reduce(
    (person, c) => markUsed(person, c.id, true, at),
    p,
  );
  assert.deepEqual(selectCards(discover, used, "music", [], false).cards, []);
  assert.ok(selectCards(discover, p, "nonexistent", [], false).fallback);
  assert.ok(
    selectCards(discover, p, "nonexistent", [], false).cards.length > 1,
  );
});
test("strict import validation rejects partial corruption, duplicate IDs, excessive data and invalid plan states", () => {
  assert.throws(() =>
    parseImport(JSON.stringify({ app: "other", version: 1, people: legacy })),
  );
  assert.throws(() => parseImport("x".repeat(2_000_001)));
  assert.throws(() => migrateV1([legacy[0], { ...legacy[1], asked: [40] }]));
  assert.throws(() => migrateV1([legacy[0], legacy[0]]));
  assert.throws(() =>
    validateState({
      ...state(),
      people: [{ ...profile(), usedPrompts: { unknown: at } }],
    }),
  );
  assert.throws(() =>
    validateState({
      ...state(),
      people: [{ ...profile(), positions: { open: "mgv2-020" } }],
    }),
  );
  assert.throws(() =>
    validateState({
      ...state(),
      people: [
        {
          ...profile(),
          plans: [
            {
              id: "p",
              idea: "Walk",
              state: "guessed",
              updatedAt: at,
              date: "",
              activity: "",
            },
          ],
        },
      ],
    }),
  );
  assert.doesNotThrow(() =>
    validateState({
      ...state(),
      people: [
        { ...profile(), lastDiscussed: "<script>alert('never html')</script>" },
      ],
    }),
  );
});
test("all six plan states round-trip; declined is retained unless explicitly edited", () => {
  const plan: Plan = {
    id: "walk",
    idea: "Walk",
    state: "considered",
    activity: "",
    date: "",
    updatedAt: at,
    promptId: "mgv2-064",
  };
  for (const status of PLAN_STATES) {
    const revised = updatePlan(plan, status, at);
    const s = state();
    s.people[0].plans = [revised];
    assert.equal(
      validateState(JSON.parse(JSON.stringify(s))).people[0].plans[0].state,
      status,
    );
  }
  const declined = updatePlan(plan, "declined", "2026-11-10T02:00:00Z");
  const badDate = state();
  badDate.people[0].plans = [{ ...plan, date: "2026-02-31" }];
  assert.throws(() => validateState(badDate));
  const current = state();
  current.people[0].plans = [declined];
  const old = state();
  old.people[0].plans = [plan];
  assert.equal(mergeStates(current, old).people[0].plans[0].state, "declined");
  assert.equal(updatePlan(declined, "proposed").state, "proposed");
});
test("merge combines histories and plans, retains existing people, uses newer profile, and exports round-trip", () => {
  const current = state();
  const incoming = state();
  current.people[0] = {
    ...markUsed(current.people[0], "mgv2-001", true, at),
    interests: ["music"],
    lastDiscussed: "Newer note",
    updated: 5000,
  };
  incoming.people = [
    {
      ...markUsed(incoming.people[0], "mgv2-002", true, at),
      asked: [2],
      interests: ["food"],
      lastDiscussed: "Older note",
    },
  ];
  const merged = mergeStates(current, incoming);
  assert.equal(merged.people.length, 2);
  assert.equal(merged.people[0].lastDiscussed, "Newer note");
  assert.deepEqual(merged.people[0].interests, ["music", "food"]);
  assert.equal(Object.keys(merged.people[0].usedPrompts).length, 2);
  assert.deepEqual(merged.people[0].asked, [0, 3, 12, 35, 2]);
  assert.deepEqual(parseImport(JSON.stringify(merged)), merged);
  assert.deepEqual(mergeStates(merged, incoming), merged);
});
