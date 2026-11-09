import seed from "../content/seed-prompts.json";
import { QUESTIONS } from "./questions";

export const SECTIONS = [
  "open",
  "discover",
  "connect",
  "deepen",
  "reconnect",
] as const;
export type TalkSection = (typeof SECTIONS)[number];
export type Section = TalkSection | "plans";
export type Collection = Section | "aron";
export type Prompt = {
  id: string;
  section: Section;
  subcategory: string;
  move: "ask" | "say" | "invite";
  text: string;
  cue: string;
  contextTags: string[];
  depth: 1 | 2 | 3;
  evidenceLevel:
    "tested_protocol" | "mechanism_supported" | "design_hypothesis";
  sourceIds: string[];
  evidenceNote: string;
  safetyNote?: string;
};
export const SOURCES: Record<string, { title: string; url?: string }> = {
  "book-talk-2025": {
    title: "Alison Wood Brooks · Talk (2025), book synthesis",
  },
  "book-platonic-2022": {
    title: "Marisa G. Franco · Platonic (2022), book synthesis",
  },
  "aron-1997": {
    title: "Aron et al. (1997)",
    url: "https://doi.org/10.1177/0146167297234003",
  },
  "epley-2014": {
    title: "Epley & Schroeder (2014)",
    url: "https://doi.org/10.1037/a0037323",
  },
  "huang-2017": {
    title: "Huang et al. (2017)",
    url: "https://doi.org/10.1037/pspi0000097",
  },
  "sprecher-2013": {
    title: "Sprecher et al. (2013)",
    url: "https://doi.org/10.1016/j.jesp.2013.03.017",
  },
  "laurenceau-1998": {
    title: "Laurenceau et al. (1998)",
    url: "https://doi.org/10.1037/0022-3514.74.5.1238",
  },
  "kardas-2022": {
    title: "Kardas et al. (2022)",
    url: "https://doi.org/10.1037/pspa0000281",
  },
  "hall-2018": {
    title: "Hall (online 2018; journal 2019)",
    url: "https://doi.org/10.1177/0265407518761225",
  },
  "liu-2023": {
    title: "Liu et al. (online 2022; journal 2023)",
    url: "https://doi.org/10.1037/pspi0000402",
  },
  "boothby-2018": {
    title: "Boothby et al. (2018)",
    url: "https://doi.org/10.1177/0956797618783714",
  },
};

export function validatePrompts(value: unknown): Prompt[] {
  if (!Array.isArray(value) || value.length !== 75)
    throw new Error("Expected the complete 75-card library");
  const ids = new Set<string>();
  const texts = new Set<string>();
  const counts: Record<string, number> = {};
  for (const card of value) {
    if (!card || typeof card !== "object") throw new Error("Invalid prompt");
    const p = card as Prompt;
    const textKey =
      typeof p.text === "string" ? p.text.trim().toLowerCase() : "";
    if (
      !/^mgv2-\d{3}$/.test(p.id) ||
      ids.has(p.id) ||
      !textKey ||
      texts.has(textKey) ||
      ![...SECTIONS, "plans"].includes(p.section) ||
      !["ask", "say", "invite"].includes(p.move) ||
      ![1, 2, 3].includes(p.depth) ||
      !["mechanism_supported", "design_hypothesis"].includes(p.evidenceLevel) ||
      typeof p.cue !== "string" ||
      !p.cue ||
      typeof p.subcategory !== "string" ||
      !p.subcategory ||
      typeof p.evidenceNote !== "string" ||
      !p.evidenceNote ||
      !Array.isArray(p.contextTags) ||
      !p.contextTags.every((t) => typeof t === "string" && t.length > 0) ||
      !Array.isArray(p.sourceIds) ||
      !p.sourceIds.every((id) => Object.hasOwn(SOURCES, id)) ||
      (p.evidenceLevel === "mechanism_supported" && !p.sourceIds.length)
    )
      throw new Error(`Invalid prompt: ${p.id}`);
    ids.add(p.id);
    texts.add(textKey);
    counts[p.section] = (counts[p.section] ?? 0) + 1;
  }
  for (const [section, count] of Object.entries({
    open: 16,
    discover: 14,
    connect: 15,
    deepen: 8,
    reconnect: 10,
    plans: 12,
  })) {
    if (counts[section] !== count)
      throw new Error(`Wrong count for ${section}`);
  }
  return value as Prompt[];
}

// Editorial revision is explicit; the supplied seed remains an intact reference.
export const PROMPTS = validatePrompts(seed.items).map((p) =>
  p.id === "mgv2-030"
    ? {
        ...p,
        text: "You mentioned you like [interest]. What do you enjoy most about it?",
        cue: "Template: fill with an interest they actually mentioned.",
      }
    : p,
);
export const ARON: Prompt[] = QUESTIONS.map((text, index) => ({
  id: `aron-${index}`,
  section: "deepen",
  subcategory: `Set ${["I", "II", "III"][Math.floor(index / 12)]}`,
  move: "ask",
  text,
  cue: "Take turns if you both want to. Any question can be skipped.",
  contextTags: [],
  depth: 3,
  evidenceLevel: "mechanism_supported",
  sourceIds: ["aron-1997"],
  evidenceNote:
    "Existing paraphrase in the original sequence. Freely using these cards does not reproduce the studied protocol.",
}));
export const ALL_PROMPTS = [...PROMPTS, ...ARON];
export const PROMPT_IDS = new Set(ALL_PROMPTS.map((p) => p.id));
export function cardsFor(collection: Collection, set = 0): Prompt[] {
  return collection === "aron"
    ? ARON.slice(set * 12, set * 12 + 12)
    : PROMPTS.filter((p) => p.section === collection);
}
export function label(value: string): string {
  return value.replaceAll("_", " ").replace(/^./, (c) => c.toUpperCase());
}
export const TOPICS = [
  "university",
  "work",
  "food",
  "music",
  "travel",
  "hobbies",
  "club",
  "event",
  "message",
  "private",
];
