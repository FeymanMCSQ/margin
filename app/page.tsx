"use client";

import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { Dialog } from "./components/dialog";
import { TalkNavigation } from "./components/talk-navigation";
import { SETS } from "@/lib/questions";
import {
  dateLabel,
  ACTIVE_KEY as V1_ACTIVE,
  STORAGE_KEY as V1_STORAGE,
} from "@/lib/people";
import {
  ALL_PROMPTS,
  ARON,
  cardsFor,
  label,
  SECTIONS,
  SOURCES,
  TOPICS,
  type Collection,
  type Prompt,
} from "@/lib/prompts";
import {
  destinationHash,
  parseDestination,
  type Destination,
  type TalkCollection,
} from "@/lib/navigation";
import {
  ACTIVE_KEY,
  STORAGE_KEY,
  PLAN_STATES,
  emptyState,
  isUsed,
  loadState,
  markUsed,
  mergeStates,
  migrateV1,
  newProfile,
  parseImport,
  selectCards,
  updatePlan,
  validateState,
  type Plan,
  type PlanState,
  type Profile,
  type State,
} from "@/lib/state";

type Tab = "people" | "talk" | "plans";
type Overlay = "profile" | "browse" | "options" | "plan" | "sources" | null;
type Session = { skipped: string[] };
const blankSession = (): Session => ({ skipped: [] });

function Brand() {
  return (
    <>
      <span className="brandmark" aria-hidden="true">
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        >
          <path d="M6 7v10M11 6.5v11M16 7v10M6 12c0-3 5-3 5 0s5-3 5 0" />
        </svg>
      </span>
      margin<span className="brand-dot">.</span>
    </>
  );
}
function download(data: string, filename: string) {
  const url = URL.createObjectURL(
    new Blob([data], { type: "application/json" }),
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export default function HomePage() {
  const [state, setState] = useState<State>(emptyState);
  const [hydrated, setHydrated] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("people");
  const [talkCollection, setTalkCollection] = useState<TalkCollection>("open");
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({
    name: "",
    interests: "",
    note: "",
    event: "",
  });
  const [planDraft, setPlanDraft] = useState({
    id: "",
    idea: "",
    state: "considered" as PlanState,
    activity: "",
    date: "",
    promptId: "",
  });
  const [topic, setTopic] = useState("");
  const [directInterest, setDirectInterest] = useState(false);
  const [showUsed, setShowUsed] = useState(false);
  const [browseCollection, setBrowseCollection] = useState<Collection | "all">(
    "open",
  );
  const [browseSearch, setBrowseSearch] = useState("");
  const [browseStatus, setBrowseStatus] = useState<"all" | "unused" | "used">(
    "all",
  );
  const [manualId, setManualId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<Record<string, Session>>({});
  const [storageWarning, setStorageWarning] = useState("");
  const [storageBlocked, setStorageBlocked] = useState(false);
  const [message, setMessage] = useState("");
  const [incoming, setIncoming] = useState<State | null>(null);
  const [importError, setImportError] = useState("");
  const importRef = useRef<HTMLInputElement>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let restored = emptyState();
    try {
      restored = loadState(localStorage);
    } catch (error) {
      setStorageWarning(
        "Saved data could not be loaded safely. Export the saved data in Options before restoring a backup.",
      );
      setStorageBlocked(true);
      try {
        const old = localStorage.getItem(V1_STORAGE);
        if (old && !localStorage.getItem(STORAGE_KEY))
          restored = migrateV1(JSON.parse(old));
      } catch {
        /* Preserve unreadable originals. */
      }
      console.warn(
        "Margin storage:",
        error instanceof Error ? error.message : "Unavailable",
      );
    }
    let initial: Destination = { tab: "people" };
    let resumedId: string | null = null;
    try {
      const id =
        sessionStorage.getItem(ACTIVE_KEY) ?? sessionStorage.getItem(V1_ACTIVE);
      const person = restored.people.find((p) => p.id === id);
      if (person) {
        resumedId = person.id;
        setActiveId(id);
        initial = {
          tab: "talk",
          collection:
            person.lastSection === "plans" ? "open" : person.lastSection,
        };
      }
    } catch {
      /* Quick resume is optional if session storage is disabled. */
    }
    initial = parseDestination(window.location.hash) ?? initial;
    setTab(initial.tab);
    if (initial.tab === "talk") {
      const section = initial.collection;
      setTalkCollection(section);
      restored = {
        ...restored,
        people: restored.people.map((p) =>
          p.id === resumedId ? { ...p, lastSection: section } : p,
        ),
      };
    }
    window.history.scrollRestoration = "manual";
    window.history.replaceState(null, "", destinationHash(initial));
    setState(restored);
    setHydrated(true);
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      if (activeId) sessionStorage.setItem(ACTIVE_KEY, activeId);
      else sessionStorage.removeItem(ACTIVE_KEY);
    } catch {
      /* Histories remain in local storage. */
    }
  }, [activeId, hydrated]);
  useEffect(() => {
    function sync(event: StorageEvent) {
      if (event.key !== STORAGE_KEY) return;
      try {
        if (!event.newValue) throw new Error("Data removed in another tab");
        setState(validateState(JSON.parse(event.newValue)));
        setManualId(null);
        setStorageBlocked(false);
        setStorageWarning("");
      } catch {
        setStorageBlocked(true);
        setStorageWarning(
          "Saved data changed in another tab. Export a backup and reload before continuing.",
        );
      }
    }
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);

  const active = state.people.find((p) => p.id === activeId) ?? null;
  const collection: Collection = tab === "plans" ? "plans" : talkCollection;
  const aronSet = Math.floor((active?.current ?? 0) / 12);
  const sessionKey = `${activeId}:${collection}`;
  const session = sessions[sessionKey] ?? blankSession();
  const bank = collection === "aron" ? ARON : cardsFor(collection);
  const declinedIds = new Set(
    active?.plans
      .filter((p) => p.state === "declined" || p.state === "cancelled")
      .map((p) => p.promptId),
  );
  const automaticBank =
    tab === "plans" ? bank.filter((c) => !declinedIds.has(c.id)) : bank;
  const selection = active
    ? selectCards(
        automaticBank,
        active,
        topic,
        session.skipped,
        showUsed,
        directInterest,
      )
    : { cards: [], fallback: false };
  const remembered =
    collection === "aron"
      ? `aron-${active?.current ?? 0}`
      : active?.positions[collection];
  const currentId =
    manualId && bank.some((c) => c.id === manualId)
      ? manualId
      : (selection.cards.find((c) => c.id === remembered)?.id ??
        selection.cards[0]?.id);
  const card = bank.find((c) => c.id === currentId);
  const used = !!active && !!card && isUsed(active, card.id);
  const currentIndex = bank.findIndex((c) => c.id === card?.id);
  const previousId = currentIndex > 0 ? bank[currentIndex - 1].id : undefined;
  const browseBank =
    browseCollection === "all"
      ? ALL_PROMPTS
      : browseCollection === "aron"
        ? ARON
        : cardsFor(browseCollection);
  const browseResults = active
    ? browseBank.filter(
        (c) =>
          (!browseSearch.trim() ||
            `${c.text} ${c.subcategory}`
              .toLowerCase()
              .includes(browseSearch.trim().toLowerCase())) &&
          (browseStatus === "all" ||
            isUsed(active, c.id) === (browseStatus === "used")),
      )
    : [];

  function present(destination: Destination, push = true) {
    setTab(destination.tab);
    if (destination.tab === "talk") setTalkCollection(destination.collection);
    setManualId(null);
    setTopic("");
    setShowUsed(false);
    setOverlay(null);
    setMessage("");
    const hash = destinationHash(destination);
    if (push && window.location.hash !== hash)
      window.history.pushState(null, "", hash);
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }
  function openBrowser() {
    setBrowseCollection(collection);
    setBrowseSearch("");
    setBrowseStatus("all");
    setOverlay("browse");
  }
  function choosePrompt(prompt: Prompt) {
    if (!active) return;
    const target: Collection = prompt.id.startsWith("aron-")
      ? "aron"
      : prompt.section;
    revise({
      ...active,
      ...(target !== "plans" ? { lastSection: target } : {}),
      positions: { ...active.positions, [target]: prompt.id },
      ...(target === "aron" ? { current: Number(prompt.id.slice(5)) } : {}),
    });
    present(
      target === "plans"
        ? { tab: "plans" }
        : { tab: "talk", collection: target },
    );
    setShowUsed(isUsed(active, prompt.id));
    setManualId(prompt.id);
  }

  function toast(text: string) {
    setMessage(text);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setMessage(""), 3500);
  }
  function commit(next: State, restoring = false): boolean {
    let checked: State;
    try {
      checked = validateState(next);
    } catch {
      toast("This change could not be saved. Check the details and limits.");
      return false;
    }
    try {
      if (storageBlocked && !restoring) {
        setState(checked);
        toast("Kept in this tab. Export a backup to save your changes.");
        return false;
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(checked));
      setState(checked);
      setStorageWarning("");
      setStorageBlocked(false);
      return true;
    } catch {
      setState(checked);
      setStorageWarning(
        "Changes are only in this tab because browser storage is unavailable. Export a backup before leaving.",
      );
      return false;
    }
  }
  function revise(person: Profile) {
    return commit({
      ...state,
      people: state.people.map((p) =>
        p.id === person.id ? { ...person, updated: Date.now() } : p,
      ),
    });
  }
  function position(person: Profile, id?: string): Profile {
    const positions = { ...person.positions };
    if (id) positions[collection] = id;
    else delete positions[collection];
    return {
      ...person,
      positions,
      ...(collection !== "plans" ? { lastSection: collection } : {}),
      ...(collection === "aron" && id ? { current: Number(id.slice(5)) } : {}),
    };
  }
  function go(id?: string, person = active) {
    if (!person || !id) {
      setManualId(null);
      return;
    }
    revise(position(person, id));
    setManualId(id);
  }
  function navigate(action: "next" | "skip" | "used" | "previous") {
    if (!active || !card) return;
    if (action === "previous") {
      if (previousId) go(previousId);
      return;
    }
    const person = action === "used" ? markUsed(active, card.id, true) : active;
    const skipped =
      action === "skip"
        ? [...new Set([...session.skipped, card.id])]
        : session.skipped;
    const candidates = selectCards(
      automaticBank,
      person,
      topic,
      skipped,
      showUsed,
      directInterest,
    ).cards;
    const index = bank.findIndex((c) => c.id === card.id);
    const ordered = [
      ...bank.slice(index + 1),
      ...bank.slice(0, index + 1),
    ].filter((c) => candidates.some((p) => p.id === c.id));
    const next = ordered[0]?.id;
    setSessions((old) => ({
      ...old,
      [sessionKey]: { skipped },
    }));
    const saved = revise(position(person, next));
    setManualId(next ?? null);
    if (action === "used")
      toast(
        saved
          ? "Marked used · saved for this person"
          : "Marked used in this tab · export to keep it",
      );
    if (action === "skip") toast("Skipped for this session");
  }
  function switchCollection(next: TalkCollection) {
    if (!active) return startTemporary(next);
    revise({ ...active, lastSection: next });
    present({ tab: "talk", collection: next });
  }
  function changeTopic(next: string) {
    setTopic(next);
    setManualId(null);
    if (!active) return;
    const candidates = selectCards(
      automaticBank,
      active,
      next,
      session.skipped,
      showUsed,
      directInterest,
    ).cards;
    const selected =
      candidates.find((c) => c.id === remembered)?.id ?? candidates[0]?.id;
    if (selected) revise(position(active, selected));
  }
  function openPerson(person: Profile) {
    setActiveId(person.id);
    present({
      tab: "talk",
      collection: person.lastSection === "plans" ? "open" : person.lastSection,
    });
    revise(person);
  }
  function startTemporary(section: TalkCollection = talkCollection) {
    const person = {
      ...newProfile("Unnamed conversation", true),
      lastSection: section,
    };
    commit({ ...state, people: [person, ...state.people] });
    setActiveId(person.id);
    present({ tab: "talk", collection: section });
  }
  function openProfile(edit: boolean) {
    setEditing(edit);
    setDraft(
      edit && active
        ? {
            name: active.temporary ? "" : active.name,
            interests: active.interests.join(", "),
            note: active.lastDiscussed,
            event: active.upcomingEvent,
          }
        : { name: "", interests: "", note: "", event: "" },
    );
    setOverlay("profile");
  }
  function saveProfile(event: FormEvent) {
    event.preventDefault();
    const name = draft.name.trim();
    if (!name) return;
    const person = editing && active ? active : newProfile(name);
    const updated = {
      ...person,
      name,
      temporary: false,
      interests: [
        ...new Set(
          draft.interests
            .split(",")
            .map((t) => t.trim().slice(0, 60))
            .filter(Boolean),
        ),
      ].slice(0, 30),
      lastDiscussed: draft.note,
      upcomingEvent: draft.event,
      updated: Date.now(),
    };
    if (editing) revise(updated);
    else {
      commit({ ...state, people: [updated, ...state.people] });
      setActiveId(updated.id);
      present({
        tab: "talk",
        collection:
          updated.lastSection === "plans" ? "open" : updated.lastSection,
      });
    }
    setOverlay(null);
  }
  function openPlan(plan?: Plan, suggestion?: Prompt) {
    setPlanDraft(
      plan
        ? { ...plan, promptId: plan.promptId ?? "" }
        : {
            id: "",
            idea:
              suggestion && !/\[.+?\]/.test(suggestion.text)
                ? suggestion.text
                : "",
            state: "considered",
            activity: "",
            date: "",
            promptId: suggestion?.id ?? "",
          },
    );
    setOverlay("plan");
  }
  function savePlan(event: FormEvent) {
    event.preventDefault();
    if (!active || !planDraft.idea.trim()) return;
    const plan: Plan = {
      id: planDraft.id || crypto.randomUUID(),
      idea: planDraft.idea.trim(),
      state: planDraft.state,
      activity: planDraft.activity.trim(),
      date: planDraft.date,
      updatedAt: new Date().toISOString(),
      ...(planDraft.promptId ? { promptId: planDraft.promptId } : {}),
    };
    const saved = revise({
      ...active,
      plans: planDraft.id
        ? active.plans.map((p) => (p.id === plan.id ? plan : p))
        : [...active.plans, plan],
    });
    setOverlay(null);
    toast(saved ? "Plan saved" : "Plan kept in this tab · export to keep it");
  }
  function exportBackup() {
    download(
      JSON.stringify(
        { ...state, exportedAt: new Date().toISOString() },
        null,
        2,
      ),
      `margin-backup-${new Date().toISOString().slice(0, 10)}.json`,
    );
  }
  function exportStored() {
    try {
      const saved: Record<string, string> = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith("margin."))
          saved[key] = localStorage.getItem(key) ?? "";
      }
      download(JSON.stringify(saved, null, 2), "margin-storage-recovery.json");
    } catch {
      toast(
        "Browser storage could not be read. Export the in-tab backup instead.",
      );
    }
  }
  async function readImport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setImportError("");
    setIncoming(null);
    try {
      if (file.size > 2_000_000)
        throw new Error("Choose a backup smaller than 2 MB.");
      setIncoming(parseImport(await file.text()));
    } catch (error) {
      setImportError(
        error instanceof Error ? error.message : "Could not read this backup.",
      );
    }
    event.target.value = "";
  }
  function confirmImport() {
    if (!incoming) return;
    try {
      const merged = mergeStates(state, incoming);
      const snapshot = {
        inTab: state,
        savedV2: localStorage.getItem(STORAGE_KEY),
        savedV1: localStorage.getItem(V1_STORAGE),
      };
      localStorage.setItem(
        `margin.backup.before-import.${crypto.randomUUID()}`,
        JSON.stringify(snapshot),
      );
      if (!commit(merged, true))
        throw new Error(
          "Import is in this tab only. Export a backup before leaving.",
        );
      setIncoming(null);
      setOverlay(null);
      setManualId(null);
      toast("Backup merged · existing histories retained");
    } catch (error) {
      setImportError(
        error instanceof Error
          ? error.message
          : "Import failed; saved data was retained.",
      );
    }
  }

  useEffect(() => {
    const onHistoryChange = () => {
      const destination = parseDestination(window.location.hash);
      if (!destination) return;
      present(destination, false);
      if (destination.tab === "talk" && active)
        revise({ ...active, lastSection: destination.collection });
    };
    window.addEventListener("hashchange", onHistoryChange);
    return () => window.removeEventListener("hashchange", onHistoryChange);
    // Read the latest profile when the browser moves through destinations.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId, state]);

  if (!hydrated)
    return (
      <div className="shell">
        <header className="topbar">
          <span className="wordmark">
            <Brand />
          </span>
        </header>
        <main className="empty-state">
          <p>Loading your conversations…</p>
        </main>
      </div>
    );

  const activePlans =
    active?.plans.filter(
      (p) => !["declined", "completed", "cancelled"].includes(p.state),
    ) ?? [];
  const archivedPlans =
    active?.plans.filter((p) =>
      ["declined", "completed", "cancelled"].includes(p.state),
    ) ?? [];
  const pagingControls = (
    <>
      <button
        className="secondary"
        disabled={!previousId}
        onClick={() => navigate("previous")}
      >
        ← Previous
      </button>
      {collection === "aron" ? (
        <button className="outline-btn browse-button" onClick={openBrowser}>
          Browse all 36
        </button>
      ) : (
        <span className="paging-position">
          {card ? `${currentIndex + 1} / ${bank.length}` : `0 / ${bank.length}`}
        </span>
      )}
      <button
        className="secondary"
        disabled={!card}
        onClick={() => navigate("next")}
      >
        Next →
      </button>
    </>
  );
  const promptView = (
    <>
      {collection !== "aron" && (
        <div className="library-toolbar">
          <details className="topic-filter">
            <summary>
              {topic ? `Topic: ${label(topic)}` : "Filter by topic"}
            </summary>
            <label className="select-label">
              Context{" "}
              <select
                aria-label="Context or topic"
                value={topic}
                onChange={(e) => changeTopic(e.target.value)}
              >
                <option value="">Any context</option>
                {TOPICS.map((t) => (
                  <option key={t} value={t}>
                    {t === "university" ? "Studies / university" : label(t)}
                  </option>
                ))}
              </select>
            </label>
          </details>
          <button className="outline-btn browse-button" onClick={openBrowser}>
            Browse prompts
          </button>
        </div>
      )}
      {selection.fallback && (
        <p className="small muted hint" role="status">
          No cards tagged {label(topic).toLowerCase()} here. Showing this
          collection.
        </p>
      )}
      {collection === "connect" && (
        <p className="small muted hint">
          Follow what they just mentioned. Leave room for your own story.
        </p>
      )}
      {tab === "talk" && (
        <div
          className="prompt-paging"
          role="group"
          aria-label="Question navigation"
        >
          {pagingControls}
        </div>
      )}
      {card ? (
        <article
          className="session-card"
          aria-label="Current prompt"
          aria-live="polite"
        >
          <div className="card-meta">
            <span>
              {card.move === "ask"
                ? "Question"
                : card.move === "say"
                  ? "Share"
                  : "Suggestion"}{" "}
              <span className="meta-divider">/</span>{" "}
              {collection === "aron"
                ? `Question ${Number(card.id.slice(5)) + 1} of 36`
                : `${currentIndex + 1} of ${bank.length} · ${label(card.subcategory)}`}
            </span>
            {used && <span className="asked-label">Used</span>}
          </div>
          <h2 className="question-text">{card.text}</h2>
          {/\[.+?\]/.test(card.text) && (
            <p className="template-note">
              Template · fill the brackets yourself with a real detail.
            </p>
          )}
          <details className="cue">
            <summary>Little cue</summary>
            <p>{card.cue}</p>
          </details>
        </article>
      ) : (
        <section className="session-card completion" aria-live="polite">
          <span className="eyebrow">Room for something else</span>
          <h2>That’s this collection for now.</h2>
          <p>
            You can revisit used cards, clear your filter, or pick another
            category.
          </p>
          <div className="wrap-actions">
            <button
              className="secondary"
              onClick={() => {
                setShowUsed(true);
                setManualId(null);
              }}
            >
              Show used
            </button>
            {topic && (
              <button
                className="secondary"
                onClick={() => {
                  setTopic("");
                  setManualId(null);
                }}
              >
                Clear filter
              </button>
            )}
            {session.skipped.length > 0 && (
              <button
                className="secondary"
                onClick={() => {
                  setSessions((old) => ({
                    ...old,
                    [sessionKey]: { ...session, skipped: [] },
                  }));
                  setManualId(null);
                }}
              >
                Reset session skips
              </button>
            )}
          </div>
        </section>
      )}
      <div className="prompt-actions" role="group" aria-label="Prompt controls">
        {tab === "plans" && <>{pagingControls}</>}
        <button
          className="secondary"
          disabled={!card}
          onClick={() => navigate("skip")}
        >
          Skip for now
        </button>
        <button
          className="primary"
          disabled={!card || used}
          onClick={() => navigate("used")}
        >
          {used ? "Already used" : "Mark used"}
        </button>
      </div>
      <div className="prompt-tools">
        {active && (
          <button className="text-button" onClick={() => openProfile(true)}>
            {active.temporary ? "Add a name" : "Edit notes"}
          </button>
        )}
        <label className="check-label">
          <input
            type="checkbox"
            checked={showUsed}
            onChange={(e) => {
              setShowUsed(e.target.checked);
              setManualId(null);
            }}
          />{" "}
          Show used
        </label>
        {used && card && active && (
          <button
            className="text-button"
            onClick={() => {
              revise(markUsed(active, card.id, false));
              toast("Marked unused");
            }}
          >
            Mark unused
          </button>
        )}
        {card && (
          <button className="text-button" onClick={() => setOverlay("sources")}>
            About this card
          </button>
        )}
      </div>
      {tab === "plans" && card && (
        <button
          className="secondary full-width"
          onClick={() => openPlan(undefined, card)}
        >
          Use as a plan idea
        </button>
      )}
    </>
  );

  return (
    <>
      <div
        className={`shell ${tab === "talk" && active ? "has-conversation" : ""}`}
      >
        <header className="topbar">
          <button
            className="wordmark brand-button"
            aria-label="Margin home"
            onClick={() => present({ tab: "people" })}
          >
            <Brand />
          </button>
          <button
            className="top-action"
            onClick={() => {
              setIncoming(null);
              setImportError("");
              setOverlay("options");
            }}
          >
            Options <span aria-hidden="true">···</span>
          </button>
        </header>
        <nav className="main-nav" aria-label="Main navigation">
          {(["people", "talk", "plans"] as const).map((dest) => (
            <button
              key={dest}
              className={tab === dest ? "active" : ""}
              aria-current={tab === dest ? "page" : undefined}
              onClick={() => {
                present(
                  dest === "talk"
                    ? { tab: "talk", collection: talkCollection }
                    : { tab: dest },
                );
              }}
            >
              {label(dest)}
            </button>
          ))}
        </nav>
        {storageWarning && (
          <aside className="storage-notice" role="alert">
            {storageWarning}{" "}
            <button className="text-button" onClick={exportBackup}>
              Export in-tab backup
            </button>
          </aside>
        )}
        <main id="main-content">
          {tab === "people" ? (
            <>
              <section
                className={`home-hero ${state.people.length ? "returning-hero" : ""}`}
              >
                <div>
                  <div className="eyebrow">A little room to talk</div>
                  <h1>
                    {state.people.length ? (
                      <>
                        Pick up a<br />
                        <em>conversation.</em>
                      </>
                    ) : (
                      <>
                        Good company.
                        <br />
                        <em>A little less guesswork.</em>
                      </>
                    )}
                  </h1>
                  <p className="hero-sub">
                    {state.people.length
                      ? "Choose someone below, or jump straight to the original 36 questions."
                      : "A thought to start with, a thread to follow, a reason to meet again."}
                  </p>
                </div>
                <div className="hero-actions">
                  <button
                    className="primary"
                    onClick={() => openProfile(false)}
                  >
                    + New person
                  </button>
                  <button
                    className="secondary"
                    onClick={() => switchCollection("aron")}
                  >
                    Original 36 questions ↗
                  </button>
                  <button
                    className="text-button"
                    onClick={() => startTemporary("open")}
                  >
                    Start without a name →
                  </button>
                </div>
              </section>
              {active && (
                <button
                  className="resume-card"
                  onClick={() => openPerson(active)}
                >
                  <span>
                    <span className="eyebrow">Pick up where you left off</span>
                    <strong>{active.name}</strong>
                    <span className="small muted">
                      {active.lastSection === "aron"
                        ? "The original 36"
                        : label(active.lastSection)}{" "}
                      · resume conversation
                    </span>
                  </span>
                  <span aria-hidden="true">↗</span>
                </button>
              )}
              <div className="section-head">
                <h2 className="section-title">Your people</h2>
                <span>{state.people.length} on this device</span>
              </div>
              {state.people.length ? (
                <section className="people-list" aria-label="Saved people">
                  {[...state.people]
                    .sort((a, b) => b.updated - a.updated)
                    .map((person) => (
                      <button
                        className="person-card"
                        key={person.id}
                        onClick={() => openPerson(person)}
                        aria-label={`Talk with ${person.name}`}
                      >
                        <div className="person-top">
                          <span className="avatar" aria-hidden="true">
                            {person.temporary
                              ? "…"
                              : person.name.slice(0, 1).toUpperCase()}
                          </span>
                          <span className="person-info">
                            <strong>{person.name}</strong>
                            <span className="subtitle">
                              {person.interests.length
                                ? person.interests.join(" · ")
                                : "Room for a conversation"}
                            </span>
                          </span>
                          <span className="chev" aria-hidden="true">
                            ↗
                          </span>
                        </div>
                        <div className="person-caption">
                          <span>
                            {person.lastSection === "aron"
                              ? "The original 36"
                              : label(person.lastSection)}
                          </span>
                          <span>{dateLabel(person.updated)}</span>
                        </div>
                      </button>
                    ))}
                </section>
              ) : (
                <section className="empty-state">
                  <div className="empty-illustration" aria-hidden="true">
                    ↔
                  </div>
                  <h2>Every conversation starts somewhere.</h2>
                  <p>
                    Add someone to keep your place, or start without a name.
                  </p>
                  <button
                    className="secondary"
                    onClick={() => startTemporary("open")}
                  >
                    Just start talking
                  </button>
                </section>
              )}
              <p className="privacy-note">
                Only on this device. Your notes and conversations stay in your
                browser.
              </p>
            </>
          ) : !active ? (
            <section className="empty-state start-state">
              <span className="eyebrow">
                {tab === "talk"
                  ? "A thought to start with"
                  : "Something to look forward to"}
              </span>
              <h1>
                {tab === "talk"
                  ? "Who’s the company?"
                  : "Make room for a plan."}
              </h1>
              <p>
                Choose a person to keep their cards and ideas together, or start
                an unnamed conversation.
              </p>
              <div className="wrap-actions">
                <button className="primary" onClick={() => startTemporary()}>
                  Start without a name
                </button>
                <button
                  className="secondary"
                  onClick={() => present({ tab: "people" })}
                >
                  Choose a person
                </button>
              </div>
              {tab === "talk" && (
                <button
                  className="secondary original-entry"
                  onClick={() => switchCollection("aron")}
                >
                  Original 36 questions ↗
                </button>
              )}
            </section>
          ) : (
            <div className="session-main">
              <div className="session-head">
                <div>
                  <div className="eyebrow">
                    {tab === "talk"
                      ? "In conversation with"
                      : "Make a little time with"}
                  </div>
                  <h1>{active.temporary ? "Just talking" : active.name}</h1>
                </div>
                <button
                  className="outline-btn"
                  onClick={() => present({ tab: "people" })}
                >
                  Change person
                </button>
              </div>
              {active.lastDiscussed && (
                <details className="private-notes">
                  <summary>Your private notes</summary>
                  <p>{active.lastDiscussed}</p>
                  {active.upcomingEvent && (
                    <p className="small">Coming up: {active.upcomingEvent}</p>
                  )}
                </details>
              )}
              {!active.lastDiscussed && active.upcomingEvent && (
                <details className="private-notes">
                  <summary>Your saved event</summary>
                  <p>{active.upcomingEvent}</p>
                </details>
              )}
              {tab === "talk" ? (
                <>
                  <TalkNavigation
                    collection={talkCollection}
                    activeSet={
                      card?.id.startsWith("aron-")
                        ? Math.floor(Number(card.id.slice(5)) / 12)
                        : aronSet
                    }
                    asked={active.asked}
                    onCollection={switchCollection}
                    onSet={(set) => {
                      const index =
                        Array.from({ length: 12 }, (_, n) => set * 12 + n).find(
                          (n) => !active.asked.includes(n),
                        ) ?? set * 12;
                      go(`aron-${index}`);
                    }}
                  />
                  {promptView}
                  {collection === "open" && (
                    <details className="quiet-details">
                      <summary>More forward openings</summary>
                      <label className="check-label">
                        <input
                          type="checkbox"
                          checked={directInterest}
                          onChange={(e) => {
                            setDirectInterest(e.target.checked);
                            setManualId(null);
                          }}
                        />{" "}
                        Include direct interest
                      </label>
                      <p className="small muted">
                        May signal flirting. Use only when it fits the setting.
                      </p>
                    </details>
                  )}
                </>
              ) : (
                <>
                  <div className="section-head">
                    <h2 className="section-title">Your ideas & plans</h2>
                    <button className="secondary" onClick={() => openPlan()}>
                      + Add idea
                    </button>
                  </div>
                  {!active.plans.length && (
                    <div className="plan-empty">
                      <p>
                        No plans yet. A coffee, a walk, a shared project —
                        whenever it feels right.
                      </p>
                    </div>
                  )}
                  <div className="plan-list">
                    {activePlans.map((plan) => (
                      <PlanCard
                        key={plan.id}
                        plan={plan}
                        onEdit={() => openPlan(plan)}
                        onState={(state) =>
                          revise({
                            ...active,
                            plans: active.plans.map((p) =>
                              p.id === plan.id ? updatePlan(p, state) : p,
                            ),
                          })
                        }
                      />
                    ))}
                  </div>
                  {archivedPlans.length > 0 && (
                    <details className="archived">
                      <summary>
                        Past & set aside ({archivedPlans.length})
                      </summary>
                      <div className="plan-list">
                        {archivedPlans.map((plan) => (
                          <PlanCard
                            key={plan.id}
                            plan={plan}
                            onEdit={() => openPlan(plan)}
                          />
                        ))}
                      </div>
                      <p className="small muted">
                        Declined plans stay here. Only you can edit or reopen
                        them.
                      </p>
                    </details>
                  )}
                  <div className="section-head suggestions-head">
                    <div>
                      <span className="eyebrow">If the moment fits</span>
                      <h2 className="section-title">A way to ask</h2>
                    </div>
                    <span>12 suggestions</span>
                  </div>
                  {active.interests.length > 0 && (
                    <p className="small muted">
                      You saved: {active.interests.join(", ")}. Choose a context
                      below if it is relevant.
                    </p>
                  )}
                  {promptView}
                </>
              )}
            </div>
          )}
        </main>
        <footer className="page-footer">
          <span>A little room for real life.</span>
          <button className="text-button" onClick={() => setOverlay("options")}>
            Privacy & backup
          </button>
        </footer>
      </div>
      {overlay === "profile" && (
        <Dialog
          title={editing ? "A little context" : "Someone to talk with"}
          onClose={() => setOverlay(null)}
        >
          <p className="muted small">
            A name is enough. Everything else can wait.
          </p>
          <form onSubmit={saveProfile}>
            <label>
              Name
              <input
                autoFocus
                required
                maxLength={42}
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                placeholder="Their name"
              />
            </label>
            <label>
              Interests{" "}
              <span className="optional">optional · separate with commas</span>
              <input
                maxLength={1000}
                value={draft.interests}
                onChange={(e) =>
                  setDraft({ ...draft, interests: e.target.value })
                }
                placeholder="Music, food, hiking…"
              />
            </label>
            <label>
              Last discussed <span className="optional">optional</span>
              <textarea
                maxLength={2000}
                value={draft.note}
                onChange={(e) => setDraft({ ...draft, note: e.target.value })}
                placeholder="A detail you want to remember"
                rows={3}
              />
            </label>
            <label>
              Upcoming event <span className="optional">optional</span>
              <input
                maxLength={300}
                value={draft.event}
                onChange={(e) => setDraft({ ...draft, event: e.target.value })}
              />
            </label>
            <div className="dialog-actions">
              <button
                className="secondary"
                type="button"
                onClick={() => setOverlay(null)}
              >
                Cancel
              </button>
              <button className="primary" type="submit">
                {editing ? "Save" : "Start conversation"}
              </button>
            </div>
          </form>
          {editing && (
            <button
              className="text-button danger delete-person"
              onClick={() => {
                if (
                  active &&
                  window.confirm(
                    `Delete ${active.name}, their histories, notes and plans?`,
                  )
                ) {
                  commit({
                    ...state,
                    people: state.people.filter((p) => p.id !== active.id),
                  });
                  setActiveId(null);
                  present({ tab: "people" });
                  setOverlay(null);
                }
              }}
            >
              Delete this person
            </button>
          )}
        </Dialog>
      )}
      {overlay === "browse" && active && (
        <Dialog
          title={
            browseCollection === "aron" ? "All 36 questions" : "Browse prompts"
          }
          wide
          onClose={() => setOverlay(null)}
        >
          <p className="small muted">
            Jump to any card. Browsing never marks it used.
          </p>
          <div className="browser-filters">
            <label>
              Search
              <input
                autoFocus
                type="search"
                placeholder="Search prompts?"
                value={browseSearch}
                onChange={(e) => setBrowseSearch(e.target.value)}
              />
            </label>
            <label>
              Collection
              <select
                value={browseCollection}
                onChange={(e) =>
                  setBrowseCollection(e.target.value as Collection | "all")
                }
              >
                <option value="all">All collections</option>
                <option value="aron">Original 36</option>
                {SECTIONS.map((section) => (
                  <option key={section} value={section}>
                    {label(section)}
                  </option>
                ))}
                <option value="plans">Plans</option>
              </select>
            </label>
          </div>
          <div className="browser-status" role="group" aria-label="Used status">
            {(["all", "unused", "used"] as const).map((status) => (
              <button
                key={status}
                aria-pressed={browseStatus === status}
                onClick={() => setBrowseStatus(status)}
              >
                {label(status)}
              </button>
            ))}
          </div>
          <p className="browser-count small muted" role="status">
            {browseResults.length}{" "}
            {browseCollection === "aron" ? "questions" : "prompts"}
          </p>
          <div className="browse-list">
            {browseResults.map((c) => {
              const original = c.id.startsWith("aron-");
              const index = original ? Number(c.id.slice(5)) : -1;
              return (
                <button
                  key={c.id}
                  className={`prompt-choice ${c.id === card?.id ? "current" : ""}`}
                  aria-label={`${original ? `Question ${index + 1}: ` : ""}${c.text}`}
                  aria-current={c.id === card?.id ? "true" : undefined}
                  onClick={() => choosePrompt(c)}
                >
                  <span className="prompt-choice-meta">
                    {original
                      ? `Set ${SETS[Math.floor(index / 12)]} ? Question ${index + 1}`
                      : label(c.section)}
                    {isUsed(active, c.id) ? " ? Used" : " ? Unused"}
                    {c.id === card?.id ? " ? Current" : ""}
                  </span>
                  <span>{c.text}</span>
                  {c.subcategory === "direct_interest" && (
                    <small className="muted">
                      Direct interest ? more forward
                    </small>
                  )}
                  {declinedIds.has(c.id) && (
                    <small className="muted">
                      Linked to a declined or cancelled plan
                    </small>
                  )}
                </button>
              );
            })}
          </div>
          {!browseResults.length && (
            <div className="browse-empty">
              <p>No matching cards.</p>
              <button
                className="text-button"
                onClick={() => {
                  setBrowseSearch("");
                  setBrowseStatus("all");
                }}
              >
                Clear search & filters
              </button>
            </div>
          )}
        </Dialog>
      )}
      {overlay === "plan" && active && (
        <Dialog
          title={planDraft.id ? "Edit your plan" : "An idea for later"}
          onClose={() => setOverlay(null)}
        >
          {planDraft.promptId && (
            <p className="small muted">
              Suggestion:{" "}
              {ALL_PROMPTS.find((c) => c.id === planDraft.promptId)?.text}
            </p>
          )}
          <form onSubmit={savePlan}>
            <label>
              Idea
              <input
                autoFocus
                required
                maxLength={500}
                value={planDraft.idea}
                onChange={(e) =>
                  setPlanDraft({ ...planDraft, idea: e.target.value })
                }
                placeholder="A walk after class"
              />
            </label>
            <label>
              State
              <select
                value={planDraft.state}
                onChange={(e) =>
                  setPlanDraft({
                    ...planDraft,
                    state: e.target.value as PlanState,
                  })
                }
              >
                {PLAN_STATES.map((s) => (
                  <option key={s} value={s}>
                    {label(s)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Activity <span className="optional">optional</span>
              <input
                maxLength={300}
                value={planDraft.activity}
                onChange={(e) =>
                  setPlanDraft({ ...planDraft, activity: e.target.value })
                }
              />
            </label>
            <label>
              Date <span className="optional">optional</span>
              <input
                type="date"
                value={planDraft.date}
                onChange={(e) =>
                  setPlanDraft({ ...planDraft, date: e.target.value })
                }
              />
            </label>
            {planDraft.state === "declined" && (
              <p className="small muted hint">
                A no is enough. This plan will be set aside without reminders.
              </p>
            )}
            <div className="dialog-actions">
              <button
                type="button"
                className="secondary"
                onClick={() => setOverlay(null)}
              >
                Cancel
              </button>
              <button className="primary" type="submit">
                Save plan
              </button>
            </div>
          </form>
        </Dialog>
      )}
      {overlay === "sources" && card && (
        <Dialog title="Behind this card" onClose={() => setOverlay(null)}>
          <p className="source-copy">{card.evidenceNote}</p>
          <ul className="source-links">
            {card.sourceIds.map((id) => (
              <li key={id}>
                {SOURCES[id].url ? (
                  <a href={SOURCES[id].url} target="_blank" rel="noreferrer">
                    {SOURCES[id].title} ↗
                  </a>
                ) : (
                  SOURCES[id].title
                )}
              </li>
            ))}
          </ul>
          {!card.sourceIds.length && (
            <p className="small muted">
              An editorial suggestion, without item-level research evidence.
            </p>
          )}
          <p className="small muted">
            {card.id} ·{" "}
            {card.evidenceLevel === "design_hypothesis"
              ? "Design hypothesis"
              : "Research-informed mechanism"}
          </p>
        </Dialog>
      )}
      {overlay === "options" && (
        <Dialog title="Keep your place" onClose={() => setOverlay(null)}>
          <p className="small muted">
            Names, notes and plans stay in this browser. Export a backup to move
            devices or keep a spare copy.
          </p>
          <div className="settings-list">
            <button onClick={exportBackup}>
              Export backup<span>All people, progress, notes and plans.</span>
            </button>
            <button onClick={() => importRef.current?.click()}>
              Import backup
              <span>Preview and merge a v1 or v2 Margin backup.</span>
            </button>
            {storageBlocked && (
              <button onClick={exportStored}>
                Export saved data for recovery
                <span>Keep a copy of the original browser storage.</span>
              </button>
            )}
          </div>
          <input
            ref={importRef}
            className="hidden"
            type="file"
            accept=".json,application/json"
            aria-label="Select backup file"
            onChange={readImport}
          />
          {importError && (
            <p className="form-error" role="alert">
              {importError}
            </p>
          )}
          {incoming && (
            <section className="import-preview">
              <h3>Review import</h3>
              <p>
                {incoming.people.length} people ·{" "}
                {
                  incoming.people.filter(
                    (p) => !state.people.some((old) => old.id === p.id),
                  ).length
                }{" "}
                new ·{" "}
                {
                  incoming.people.filter((p) =>
                    state.people.some((old) => old.id === p.id),
                  ).length
                }{" "}
                matching IDs.
              </p>
              <p className="small">
                Matching histories are combined. Newer profile details and plan
                edits win. Existing people are kept. A recovery snapshot is
                saved first.
              </p>
              <button className="primary" onClick={confirmImport}>
                Merge backup
              </button>
              <button className="text-button" onClick={() => setIncoming(null)}>
                Cancel import
              </button>
            </section>
          )}
          <p className="source-note">
            75 original, research-informed cards, plus the existing 36
            independently paraphrased Aron questions. The wording is not
            individually validated and cannot predict friendship. Use what fits
            and leave room to listen.{" "}
            <a
              href="https://doi.org/10.1177/0146167297234003"
              target="_blank"
              rel="noreferrer"
            >
              Aron et al. (1997) ↗
            </a>
          </p>
          <p className="source-note">
            No account or AI service. Hosting still needs a connection; there is
            no offline guarantee. Browser privacy settings and clearing site
            data can erase histories.
          </p>
        </Dialog>
      )}
      {message && (
        <div className="toast" role="status">
          {message}
        </div>
      )}
    </>
  );
}

function PlanCard({
  plan,
  onEdit,
  onState,
}: {
  plan: Plan;
  onEdit: () => void;
  onState?: (state: PlanState) => void;
}) {
  return (
    <article className="plan-card">
      <div className="plan-card-head">
        <span className="state-label">{label(plan.state)}</span>
        <button
          className="text-button"
          aria-label={`Edit plan: ${plan.idea}`}
          onClick={onEdit}
        >
          Edit
        </button>
      </div>
      <h3>{plan.idea}</h3>
      {plan.activity && <p>{plan.activity}</p>}
      {plan.date && (
        <p className="small muted">
          {new Date(`${plan.date}T12:00:00`).toLocaleDateString(undefined, {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
        </p>
      )}
      {onState && (
        <label className="plan-state">
          Update state
          <select
            aria-label={`State for ${plan.idea}`}
            value={plan.state}
            onChange={(e) => onState(e.target.value as PlanState)}
          >
            {PLAN_STATES.map((s) => (
              <option value={s} key={s}>
                {label(s)}
              </option>
            ))}
          </select>
        </label>
      )}
    </article>
  );
}
