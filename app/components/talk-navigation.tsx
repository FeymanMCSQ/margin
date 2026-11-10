import { SETS } from "@/lib/questions";
import { label, SECTIONS } from "@/lib/prompts";
import type { TalkCollection } from "@/lib/navigation";

export function TalkNavigation({
  collection,
  activeSet,
  asked,
  onCollection,
  onSet,
}: {
  collection: TalkCollection;
  activeSet: number;
  asked: number[];
  onCollection: (collection: TalkCollection) => void;
  onSet: (set: number) => void;
}) {
  return (
    <>
      <nav className="talk-collections" aria-label="Talk collections">
        <button
          aria-pressed={collection !== "aron"}
          onClick={() =>
            onCollection(collection === "aron" ? "open" : collection)
          }
        >
          Conversation prompts
        </button>
        <button
          aria-pressed={collection === "aron"}
          onClick={() => onCollection("aron")}
        >
          Original 36
        </button>
      </nav>
      {collection === "aron" ? (
        <nav className="set-nav" aria-label="Original question sets">
          {SETS.map((set, index) => (
            <button
              key={set}
              className={`set-tab ${activeSet === index ? "active" : ""}`}
              aria-pressed={activeSet === index}
              onClick={() => onSet(index)}
            >
              <strong>Set {set}</strong>
              <small>
                {index * 12 + 1}–{index * 12 + 12} ·{" "}
                {asked.filter((n) => Math.floor(n / 12) === index).length}/12
                used
              </small>
            </button>
          ))}
        </nav>
      ) : (
        <nav className="talk-categories" aria-label="Talk categories">
          {SECTIONS.map((section) => (
            <button
              key={section}
              aria-pressed={collection === section}
              onClick={() => onCollection(section)}
            >
              {label(section)}
            </button>
          ))}
        </nav>
      )}
    </>
  );
}
