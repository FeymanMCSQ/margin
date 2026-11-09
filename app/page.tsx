"use client";

import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { Dialog } from "./components/dialog";
import { SETS } from "@/lib/questions";
import {
  dateLabel,
  ACTIVE_KEY as V1_ACTIVE,
  STORAGE_KEY as V1_STORAGE,
} from "@/lib/people";
import {
  ALL_PROMPTS,
  cardsFor,
  label,
  SECTIONS,
  SOURCES,
  TOPICS,
  type Collection,
  type Prompt,
} from "@/lib/prompts";
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
type Session = { skipped: string[]; history: string[] };
const blankSession = (): Session => ({ skipped: [], history: [] });

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
    setState(restored);
    try {
      const id =
        sessionStorage.getItem(ACTIVE_KEY) ?? sessionStorage.getItem(V1_ACTIVE);
      if (restored.people.some((p) => p.id === id)) {
        setActiveId(id);
        setTab("talk");
      }
    } catch {
      /* Quick resume is optional if session storage is disabled. */
    }
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
  const collection: Collection =
    tab === "plans"
      ? "plans"
      : active?.lastSection === "plans"
        ? "open"
        : (active?.lastSection ?? "open");
  const aronSet = Math.floor((active?.current ?? 0) / 12);
  const sessionKey = `${activeId}:${collection}:${collection === "aron" ? aronSet : ""}`;
  const session = sessions[sessionKey] ?? blankSession();
  const bank = cardsFor(collection, aronSet);
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
      ...(collection === "aron" && id ? { current: Number(id.slice(5)) } : {}),
    };
  }
  function go(id?: string, person = active, previous = false) {
    if (!person || !id) {
      setManualId(null);
      return;
    }
    if (!previous && card)
      setSessions((old) => ({
        ...old,
        [sessionKey]: { ...session, history: [...session.history, card.id] },
      }));
    revise(position(person, id));
    setManualId(id);
  }
  function navigate(action: "next" | "skip" | "used" | "previous") {
    if (!active || !card) return;
    if (action === "previous") {
      const previous = session.history.at(-1);
      if (!previous) return;
      setSessions((old) => ({
        ...old,
        [sessionKey]: { ...session, history: session.history.slice(0, -1) },
      }));
      go(previous, active, true);
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
      [sessionKey]: { skipped, history: [...session.history, card.id] },
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
  function switchCollection(next: Collection) {
    if (!active) return;
    revise({ ...active, lastSection: next });
    setManualId(null);
    setShowUsed(false);
    setTopic("");
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
    setTab("talk");
    setManualId(null);
    setTopic("");
    setShowUsed(false);
    revise(person);
    window.scrollTo(0, 0);
  }
  function startTemporary() {
    const person = newProfile("Unnamed conversation", true);
    commit({ ...state, people: [person, ...state.people] });
    setActiveId(person.id);
    setTab("talk");
    setManualId(null);
    setTopic("");
    setShowUsed(false);
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
      setTab("talk");
      setManualId(null);
      setTopic("");
      setShowUsed(false);
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
  const promptView = (
    <>
      <div className="filter-row">
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
        <button className="text-button" onClick={() => setOverlay("browse")}>
          Choose a prompt
        </button>
      </div>
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
                ? `No. ${Number(card.id.slice(5)) + 1}`
                : label(card.subcategory)}
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
      <div className="prompt-actions">
        <button
          className="secondary"
          disabled={!session.history.length}
          onClick={() => {
            if (!card && session.history.length) {
              const previous = session.history.at(-1)!;
              setSessions((old) => ({
                ...old,
                [sessionKey]: {
                  ...session,
                  history: session.history.slice(0, -1),
                },
              }));
              go(previous, active, true);
            } else navigate("previous");
          }}
        >
          ← Previous
        </button>
        <button
          className="secondary"
          disabled={!card}
          onClick={() => navigate("next")}
        >
          Next →
        </button>
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
      <div className="shell">
        <header className="topbar">
          <button
            className="wordmark brand-button"
            aria-label="Margin home"
            onClick={() => setTab("people")}
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
                setTab(dest);
                setManualId(null);
                setTopic("");
                setShowUsed(false);
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
              <section className="home-hero">
                <div>
                  <div className="eyebrow">A little room to talk</div>
                  <h1>
                    Good company.
                    <br />
                    <em>A little less guesswork.</em>
                  </h1>
                  <p className="hero-sub">
                    A thought to start with, a thread to follow, a reason to
                    meet again. Leave the rest to the conversation.
                  </p>
                </div>
                <div className="hero-actions">
                  <button
                    className="primary"
                    onClick={() => openProfile(false)}
                  >
                    + New person
                  </button>
                  <button className="text-button" onClick={startTemporary}>
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
                  <button className="secondary" onClick={startTemporary}>
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
                <button className="primary" onClick={startTemporary}>
                  Start without a name
                </button>
                <button className="secondary" onClick={() => setTab("people")}>
                  Choose a person
                </button>
              </div>
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
                  <h1>{active.name}</h1>
                </div>
                <button
                  className="outline-btn"
                  onClick={() => openProfile(true)}
                >
                  {active.temporary ? "Add a name" : "Edit notes"}
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
                  <div
                    className="category-desktop"
                    role="group"
                    aria-label="Talk categories"
                  >
                    {SECTIONS.map((section) => (
                      <button
                        key={section}
                        className={
                          collection === section ||
                          (section === "deepen" && collection === "aron")
                            ? "active"
                            : ""
                        }
                        aria-pressed={
                          collection === section ||
                          (section === "deepen" && collection === "aron")
                        }
                        onClick={() => switchCollection(section)}
                      >
                        {label(section)}
                      </button>
                    ))}
                  </div>
                  <label className="category-mobile">
                    Talk category
                    <select
                      aria-label="Talk category"
                      value={collection === "aron" ? "deepen" : collection}
                      onChange={(e) =>
                        switchCollection(e.target.value as Collection)
                      }
                    >
                      {SECTIONS.map((s) => (
                        <option value={s} key={s}>
                          {label(s)}
                        </option>
                      ))}
                    </select>
                  </label>
                  {(collection === "deepen" || collection === "aron") && (
                    <>
                      <div className="collection-switch">
                        <button
                          aria-pressed={collection === "deepen"}
                          onClick={() => switchCollection("deepen")}
                        >
                          Everyday depth
                        </button>
                        <button
                          aria-pressed={collection === "aron"}
                          onClick={() => switchCollection("aron")}
                        >
                          The original 36
                        </button>
                      </div>
                      {collection === "aron" && (
                        <nav
                          className="set-nav"
                          aria-label="Original question sets"
                        >
                          {SETS.map((set, i) => (
                            <button
                              key={set}
                              className={`set-tab ${aronSet === i ? "active" : ""}`}
                              aria-pressed={aronSet === i}
                              onClick={() => {
                                const index =
                                  Array.from(
                                    { length: 12 },
                                    (_, n) => i * 12 + n,
                                  ).find((n) => !active.asked.includes(n)) ??
                                  i * 12;
                                revise({
                                  ...active,
                                  current: index,
                                  positions: {
                                    ...active.positions,
                                    aron: `aron-${index}`,
                                  },
                                });
                                setManualId(null);
                                setShowUsed(false);
                              }}
                            >
                              <strong>Set {set}</strong>
                              <small>
                                {
                                  active.asked.filter(
                                    (n) => Math.floor(n / 12) === i,
                                  ).length
                                }
                                /12 used
                              </small>
                            </button>
                          ))}
                        </nav>
                      )}
                    </>
                  )}
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
                  setTab("people");
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
        <Dialog title="Choose a prompt" wide onClose={() => setOverlay(null)}>
          <p className="small muted">
            {collection === "aron"
              ? `The original 36 · Set ${SETS[aronSet]}`
              : label(collection)}
            . Choose any card to review it.
          </p>
          <label className="check-label browse-check">
            <input
              type="checkbox"
              checked={showUsed}
              onChange={(e) => setShowUsed(e.target.checked)}
            />{" "}
            Include used cards
          </label>
          <div className="browse-list">
            {bank
              .filter((c) => showUsed || !isUsed(active, c.id))
              .map((c) => (
                <div className="browse-item" key={c.id}>
                  <button
                    className="browse-jump"
                    onClick={() => {
                      go(c.id);
                      setOverlay(null);
                    }}
                  >
                    <span className="browse-desc">
                      {c.text}
                      {c.subcategory === "direct_interest" && (
                        <small className="block muted">
                          Direct interest · more forward
                        </small>
                      )}
                      {declinedIds.has(c.id) && (
                        <small className="block muted">
                          Linked to a declined or cancelled plan
                        </small>
                      )}
                    </span>
                  </button>
                  <button
                    className={`browse-done ${isUsed(active, c.id) ? "asked" : ""}`}
                    aria-label={`${isUsed(active, c.id) ? "Mark unused" : "Mark used"}: ${c.text}`}
                    onClick={() =>
                      revise(markUsed(active, c.id, !isUsed(active, c.id)))
                    }
                  >
                    {isUsed(active, c.id) ? "✓" : "+"}
                  </button>
                </div>
              ))}
            {bank.every((c) => isUsed(active, c.id)) && !showUsed && (
              <p className="browse-empty">
                All used. Include used cards to revisit them.
              </p>
            )}
          </div>
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
