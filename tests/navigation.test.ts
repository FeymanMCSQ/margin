import test from "node:test";
import assert from "node:assert/strict";
import {
  destinationHash,
  parseDestination,
  type Destination,
} from "../lib/navigation";
import { SECTIONS } from "../lib/prompts";

test("all destinations round-trip through browser history URLs", () => {
  const destinations: Destination[] = [
    { tab: "people" },
    { tab: "plans" },
    { tab: "talk", collection: "aron" },
    ...SECTIONS.map((collection) => ({ tab: "talk" as const, collection })),
  ];
  for (const destination of destinations)
    assert.deepEqual(
      parseDestination(destinationHash(destination)),
      destination,
    );
  assert.equal(
    destinationHash({ tab: "talk", collection: "aron" }),
    "#talk/36",
  );
});
test("unknown destinations are ignored without inventing a collection", () => {
  for (const hash of [
    "",
    "#",
    "#talk",
    "#talk/plans",
    "#talk/missing",
    "#talk/36/missing",
    "open",
    "#people?x=1",
    "#talk/__proto__",
  ])
    assert.equal(parseDestination(hash), null);
});
