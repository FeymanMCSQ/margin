import { SECTIONS, type Collection } from "./prompts";

export type TalkCollection = Exclude<Collection, "plans">;
export type Destination =
  { tab: "people" | "plans" } | { tab: "talk"; collection: TalkCollection };

export function destinationHash(destination: Destination): string {
  return destination.tab === "talk"
    ? `#talk/${destination.collection === "aron" ? "36" : destination.collection}`
    : `#${destination.tab}`;
}

export function parseDestination(hash: string): Destination | null {
  if (hash === "#people" || hash === "#plans")
    return { tab: hash.slice(1) as "people" | "plans" };
  const section = hash.replace(/^#talk\//, "");
  if (
    hash.startsWith("#talk/") &&
    (section === "36" || SECTIONS.some((s) => s === section))
  ) {
    return {
      tab: "talk",
      collection: section === "36" ? "aron" : (section as TalkCollection),
    };
  }
  return null;
}
