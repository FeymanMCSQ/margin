"use client";

import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { QUESTIONS, SETS } from "@/lib/questions";
import {
  ACTIVE_KEY,
  STORAGE_KEY,
  askedInSet,
  dateLabel,
  firstUnasked,
  nextUnasked,
  normalizePerson,
  type Person,
} from "@/lib/people";

type Overlay = "person" | "browse" | "settings" | null;
type PersonMode = "create" | "edit";
type BrowseFilter = "all" | "unasked";

function MarkIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
      <path d="M6 7v10M11 6.5v11M16 7v10" />
      <path d="M6 12c0-3 5-3 5 0s5-3 5 0" />
    </svg>
  );
}

function EmptyIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 11.5a7.5 7.5 0 0 1-7.5 7.5H5l2-3.5A7.5 7.5 0 1 1 20 11.5Z" />
      <path d="M8 11.5h8M8 14.5h5" />
    </svg>
  );
}

export default function HomePage() {
  const [people, setPeople] = useState<Person[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [personMode, setPersonMode] = useState<PersonMode>("create");
  const [nameDraft, setNameDraft] = useState("");
  const [browseFilter, setBrowseFilter] = useState<BrowseFilter>("all");
  const [showCompletion, setShowCompletion] = useState(false);
  const [message, setMessage] = useState("");
  const [storageEnabled, setStorageEnabled] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);
  const importRef = useRef<HTMLInputElement>(null);
  const toastTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Hydrate local data only in the browser; no person's data is sent to the server.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      let restored: Person[] = [];
      if (saved) {
        const parsed: unknown = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          restored = parsed.map(normalizePerson).filter((p): p is Person => p !== null);
        }
      }
      setPeople(restored);
      const lastId = sessionStorage.getItem(ACTIVE_KEY);
      const last = restored.find(p => p.id === lastId);
      if (last) {
        setActiveId(last.id);
        setShowCompletion(last.asked.length === 36);
      }
    } catch {
      setStorageEnabled(false);
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(people));
      setStorageEnabled(true);
    } catch {
      setStorageEnabled(false);
    }
  }, [people, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      if (activeId) sessionStorage.setItem(ACTIVE_KEY, activeId);
      else sessionStorage.removeItem(ACTIVE_KEY);
    } catch {
      // Private browsing may disable sessionStorage; local question history still works.
    }
  }, [activeId, hydrated]);

  useEffect(() => {
    if (!overlay) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOverlay(null);
    };
    document.addEventListener("keydown", onEscape);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onEscape);
    };
  }, [overlay]);

  useEffect(() => {
    return () => {
      if (toastTimeout.current) clearTimeout(toastTimeout.current);
    };
  }, []);

  const active = people.find(p => p.id === activeId) ?? null;
  const count = active?.asked.length ?? 0;
  const current = active?.current ?? 0;
  const currentSet = Math.floor(current / 12);
  const askedAlready = !!active?.asked.includes(current);

  function toast(text: string) {
    setMessage(text);
    if (toastTimeout.current) clearTimeout(toastTimeout.current);
    toastTimeout.current = setTimeout(() => setMessage(""), 2900);
  }

  function updatePerson(next: Person) {
    setPeople(old => old.map(p => p.id === next.id ? { ...next, updated: Date.now() } : p));
  }

  function goHome() {
    setActiveId(null);
    setOverlay(null);
    setShowCompletion(false);
    window.scrollTo(0, 0);
  }

  function openPerson(person: Person) {
    setActiveId(person.id);
    setShowCompletion(person.asked.length === 36);
    updatePerson(person);
    window.scrollTo(0, 0);
  }

  function goToQuestion(n: number) {
    if (!active) return;
    setShowCompletion(false);
    updatePerson({ ...active, current: (n + 36) % 36 });
  }

  function selectSet(set: number) {
    if (!active) return;
    goToQuestion(firstUnasked(active, set));
  }

  function markAsked() {
    if (!active) return;
    const wasAsked = active.asked.includes(active.current);
    const asked = wasAsked ? active.asked : [...active.asked, active.current];
    const revised = { ...active, asked };
    const next = nextUnasked(revised, active.current);
    setShowCompletion(asked.length === 36);
    updatePerson({ ...revised, current: next ?? active.current });
    if (!wasAsked) toast("Marked as asked · saved");
  }

  function skip() {
    if (!active) return;
    const next = nextUnasked(active, active.current);
    if (next === null) return toast("All questions have been asked");
    if (next === active.current) return toast("This is the last unanswered question");
    goToQuestion(next);
  }

  function unmark() {
    if (!active) return;
    setShowCompletion(false);
    updatePerson({ ...active, asked: active.asked.filter(n => n !== active.current) });
    toast("Marked as not yet asked");
  }

  function toggleAsked(n: number) {
    if (!active) return;
    const asked = active.asked.includes(n) ? active.asked.filter(x => x !== n) : [...active.asked, n];
    setShowCompletion(false);
    updatePerson({ ...active, asked });
  }

  // Desktop keyboard convenience. On mobile, the large controls remain the primary interaction.
  useEffect(() => {
    if (!active || overlay) return;
    const keydown = (event: KeyboardEvent) => {
      const element = document.activeElement;
      if (element instanceof HTMLElement && ["INPUT", "TEXTAREA", "SELECT"].includes(element.tagName)) return;
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        goToQuestion(active.current - 1);
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        skip();
      }
    };
    document.addEventListener("keydown", keydown);
    return () => document.removeEventListener("keydown", keydown);
    // goToQuestion and skip use the current active state from this render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, overlay]);

  function showPersonModal(mode: PersonMode) {
    setPersonMode(mode);
    setNameDraft(mode === "edit" ? active?.name ?? "" : "");
    setOverlay("person");
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  function savePerson(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = nameDraft.trim().slice(0, 42);
    if (!name) return;
    if (personMode === "edit") {
      if (active) updatePerson({ ...active, name });
      toast("Name updated");
    } else {
      const now = Date.now();
      const person: Person = {
        id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `p-${now}-${Math.random().toString(36).slice(2)}`,
        name, asked: [], current: 0, created: now, updated: now,
      };
      setPeople(old => [person, ...old]);
      setActiveId(person.id);
      setShowCompletion(false);
    }
    setOverlay(null);
  }

  function exportBackup() {
    const backup = {
      app: "margin", version: 1, exportedAt: new Date().toISOString(),
      people: people.map(p => ({ ...p, asked: [...p.asked].sort((a, b) => a - b) })),
    };
    const url = URL.createObjectURL(new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `margin-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    toast("Backup downloaded");
  }

  async function importBackup(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      if (file.size > 2_000_000) throw new Error("File too large");
      const obj: unknown = JSON.parse(await file.text());
      if (!obj || typeof obj !== "object") throw new Error("Invalid backup");
      const data = obj as Record<string, unknown>;
      if (data.app !== "margin" || data.version !== 1 || !Array.isArray(data.people)) throw new Error("Not a Margin backup");
      const incoming = data.people.map(normalizePerson).filter((p): p is Person => p !== null);
      if (data.people.length && !incoming.length) throw new Error("No valid people");
      const byId = new Map(people.map(person => [person.id, person]));
      let added = 0;
      let merged = 0;
      for (const person of incoming) {
        const previous = byId.get(person.id);
        if (!previous) {
          byId.set(person.id, person);
          added++;
        } else {
          byId.set(person.id, {
            ...previous,
            name: person.updated > previous.updated ? person.name : previous.name,
            current: person.updated > previous.updated ? person.current : previous.current,
            asked: [...new Set([...previous.asked, ...person.asked])],
            updated: Math.max(person.updated, previous.updated),
            created: Math.min(person.created, previous.created),
          });
          merged++;
        }
      }
      setPeople([...byId.values()]);
      setOverlay(null);
      toast(`Imported: ${added} added, ${merged} merged`);
    } catch {
      toast("Could not read that Margin backup");
    } finally {
      event.target.value = "";
    }
  }

  function deletePerson() {
    if (!active || !window.confirm(`Delete ${active.name} and their saved question history? This cannot be undone.`)) return;
    setPeople(old => old.filter(p => p.id !== active.id));
    goHome();
    toast("Conversation deleted");
  }

  if (!hydrated) {
    return (
      <div className="shell">
        <header className="topbar"><span className="wordmark"><span className="brandmark"><MarkIcon /></span>margin<span style={{ color: "#9CAE9E", marginLeft: -9 }}>.</span></span></header>
        <main className="empty-state" aria-label="Loading saved conversations"><p>Loading your conversations…</p></main>
      </div>
    );
  }

  const sortedPeople = [...people].sort((a, b) => b.updated - a.updated);
  const browsing = active && overlay === "browse";
  const completed = count === 36 && showCompletion;

  return (
    <>
      <div className="shell">
        <header className="topbar">
          <button className="wordmark brand-button" type="button" onClick={goHome} aria-label="Margin home">
            <span className="brandmark"><MarkIcon /></span>
            margin<span style={{ color: "#9CAE9E", marginLeft: -9 }}>.</span>
          </button>
          <div className="top-actions">
            {active && <button className="top-action" type="button" onClick={goHome}>← <span>People</span></button>}
            <button className="top-action" type="button" onClick={() => setOverlay("settings")}>Options <span style={{ fontSize: 18, lineHeight: "10px" }} aria-hidden="true">⋯</span></button>
          </div>
        </header>

        {!active ? (
          <main>
            <section className="home-hero">
              <div>
                <div className="eyebrow">A little room to talk</div>
                <h1>Pick up where<br /><em style={{ fontWeight: 400 }}>you left off.</em></h1>
                <p className="hero-sub">Good conversations aren&apos;t always finished in one sitting. Keep your place and come back whenever.</p>
              </div>
              <button className="primary" type="button" onClick={() => showPersonModal("create")}><span style={{ fontSize: 24, fontWeight: 300, lineHeight: "15px" }}>+</span> New person</button>
            </section>
            <div className="section-head"><h3>People</h3><span>{people.length} saved</span></div>
            {people.length > 0 ? (
              <section className="people-list" aria-label="Saved people">
                {sortedPeople.map(person => (
                  <button key={person.id} className="person-card" type="button" onClick={() => openPerson(person)} aria-label={`Open conversation with ${person.name}, ${person.asked.length} of 36 asked`}>
                    <div className="person-top">
                      <div style={{ display: "flex", alignItems: "center", gap: 13, minWidth: 0 }}>
                        <div className="avatar">{person.name.charAt(0).toUpperCase()}</div>
                        <div style={{ minWidth: 0 }}>
                          <strong>{person.name}</strong>
                          <div className="subtitle">{person.asked.length ? `Last opened ${dateLabel(person.updated)}` : "Ready when you are"}</div>
                        </div>
                      </div>
                      <span className="chev" aria-hidden="true">›</span>
                    </div>
                    <div className="person-bottom">
                      <div className="person-progress"><span style={{ width: `${person.asked.length / 36 * 100}%` }} /></div>
                      <div className="person-caption"><span>{person.asked.length} of 36 asked</span><span>{person.asked.length === 36 ? "Complete" : "Continue →"}</span></div>
                    </div>
                  </button>
                ))}
              </section>
            ) : (
              <section className="empty-state">
                <div className="empty-illustration"><EmptyIcon /></div>
                <h3>Start with a name.</h3>
                <p>One person, one conversation history. Your progress stays on this device.</p>
                <button className="primary" type="button" onClick={() => showPersonModal("create")}>Add someone <span aria-hidden="true">→</span></button>
              </section>
            )}
            <p className="privacy-note"><span aria-hidden="true">◌</span> Names and progress stay in this browser. Nothing is uploaded.</p>
          </main>
        ) : (
          <main className="session-main">
            <section className="session-head">
              <div><div className="eyebrow">Conversation with</div><h2>{active.name}</h2><p className="session-meta">{count} of 36 asked · Saved on this device</p></div>
              <button className="outline-btn" type="button" onClick={() => { setBrowseFilter("all"); setOverlay("browse"); }}>☷ &nbsp; Browse all</button>
            </section>
            <nav className="set-nav" aria-label="Question sets">
              {SETS.map((label, set) => (
                <button key={label} className={`set-tab ${currentSet === set ? "active" : ""}`} type="button" onClick={() => selectSet(set)} aria-current={currentSet === set ? "true" : undefined} aria-label={`Go to set ${set + 1}, ${askedInSet(active, set)} of 12 asked`}>
                  <strong>Set {label}</strong><small>{askedInSet(active, set)} of 12 asked</small>
                </button>
              ))}
            </nav>
            {completed ? (
              <section className="session-card completion" aria-live="polite">
                <div className="empty-illustration">✓</div>
                <h2>All caught up.</h2>
                <p>You&apos;ve covered all 36 prompts with this person. You can still revisit any of them.</p>
                <button className="secondary" type="button" onClick={() => { setBrowseFilter("all"); setOverlay("browse"); }}>Browse previous questions →</button>
              </section>
            ) : (
              <>
                <section className="session-card" aria-live="polite">
                  <div className="card-meta"><span>Question {String(current + 1).padStart(2, "0")} · Set {SETS[currentSet]}</span>{askedAlready && <span className="asked-label">Already asked ✓</span>}</div>
                  <h1 className="question-text">{QUESTIONS[current]}</h1>
                  <div className="card-foot"><span>Take turns answering · Passing is fine</span>{askedAlready && <button type="button" className="inline-button" onClick={unmark}>Mark unasked</button>}</div>
                </section>
                <section>
                  <div className="under-card"><p className="tiny">No rush. Both answer.</p><button type="button" className="inline-button" onClick={() => { setBrowseFilter("all"); setOverlay("browse"); }}>Browse 36 ↗</button></div>
                  <div className="bottom-actions">
                    <button type="button" className="secondary back-btn" onClick={() => goToQuestion(current - 1)} aria-label="Previous question">←</button>
                    <button type="button" className="secondary" onClick={skip}>Not now →</button>
                    <button type="button" className="primary" onClick={markAsked}>{askedAlready ? "Find next unasked" : "Mark asked"} <span aria-hidden="true">→</span></button>
                  </div>
                  <div className="progress-area"><span>{count} of 36 asked</span><div className="mini-progress" aria-hidden="true">{QUESTIONS.map((_, i) => <span key={i} className={active.asked.includes(i) ? "filled" : ""} />)}</div></div>
                </section>
              </>
            )}
          </main>
        )}
      </div>

      {overlay === "person" && (
        <div className="overlay" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) setOverlay(null); }}>
          <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="personTitle">
            <div className="eyebrow">Your conversations</div><h2 id="personTitle">{personMode === "edit" ? "Rename person" : "New person"}</h2>
            <p>Just a name. There are no accounts and nothing to fill out after each question.</p>
            <form onSubmit={savePerson}>
              <label htmlFor="personName">Name</label>
              <input ref={inputRef} className="text-input" id="personName" value={nameDraft} onChange={e => setNameDraft(e.target.value)} maxLength={42} autoComplete="off" placeholder="e.g. Alex" required />
              <div className="dialog-actions"><button className="secondary" type="button" onClick={() => setOverlay(null)}>Cancel</button><button className="primary" type="submit">{personMode === "edit" ? "Save changes →" : "Save person →"}</button></div>
            </form>
          </div>
        </div>
      )}

      {browsing && (
        <div className="overlay drawer-overlay" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) setOverlay(null); }}>
          <aside className="drawer" role="dialog" aria-modal="true" aria-label="Browse all questions">
            <div className="drawer-top">
              <div className="drawer-title"><div><div className="eyebrow">Question library</div><h2>All 36</h2></div><button type="button" className="close-btn" onClick={() => setOverlay(null)} aria-label="Close question browser">×</button></div>
              <div className="browse-switch" role="group" aria-label="Question filter">
                <button className={browseFilter === "all" ? "active" : ""} type="button" onClick={() => setBrowseFilter("all")}>All questions</button>
                <button className={browseFilter === "unasked" ? "active" : ""} type="button" onClick={() => setBrowseFilter("unasked")}>Not yet asked</button>
              </div>
            </div>
            <div className="drawer-scroll">
              {SETS.map((setLabel, set) => {
                const indexes = QUESTIONS.map((_, index) => index).filter(index => Math.floor(index / 12) === set && (browseFilter === "all" || !active.asked.includes(index)));
                if (!indexes.length) return null;
                return (
                  <section key={setLabel} className="browse-section">
                    <div className="browse-section-head"><span>Set {setLabel}</span><span>{askedInSet(active, set)} / 12 asked</span></div>
                    {indexes.map(n => (
                      <div key={n} className={`browse-item ${current === n ? "active" : ""}`} style={{ padding: 0 }}>
                        <button type="button" className="browse-jump" onClick={() => { goToQuestion(n); setOverlay(null); }} aria-label={`Go to question ${n + 1}`}>
                          <span className="browse-number">{String(n + 1).padStart(2, "0")}</span>
                          <span className="browse-desc">{QUESTIONS[n].length > 105 ? `${QUESTIONS[n].slice(0, 104)}…` : QUESTIONS[n]}</span>
                        </button>
                        <button type="button" className={`browse-done ${active.asked.includes(n) ? "asked" : ""}`} onClick={() => toggleAsked(n)} aria-label={active.asked.includes(n) ? `Mark question ${n + 1} as not asked` : `Mark question ${n + 1} as asked`}>
                          {active.asked.includes(n) ? "✓" : "○"}
                        </button>
                      </div>
                    ))}
                  </section>
                );
              })}
              {browseFilter === "unasked" && active.asked.length === 36 && <p className="browse-empty">No unanswered questions remain.</p>}
            </div>
          </aside>
        </div>
      )}

      {overlay === "settings" && (
        <div className="overlay" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) setOverlay(null); }}>
          <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="optionsTitle">
            <div className="eyebrow">Margin</div><h2 id="optionsTitle">Options</h2><p>Your conversations live only in this browser. Export a backup before clearing site data or switching phones.</p>
            <div className="settings-list">
              <button type="button" onClick={exportBackup}>Export backup <span>Download a JSON file with names and completed questions.</span></button>
              <button type="button" onClick={() => importRef.current?.click()}>Import backup <span>Restore or merge from an exported Margin file.</span></button>
              {active && <button type="button" onClick={() => showPersonModal("edit")}>Rename this person <span>Change the saved name without losing any progress.</span></button>}
              {active && <button type="button" className="danger" onClick={deletePerson}>Delete this person <span>Remove this name and their question history.</span></button>}
            </div>
            <p className="source-note">Inspired by the 36-question interpersonal closeness procedure from Aron et al. (1997). Prompts are independently paraphrased, in the original sequence. <a href="https://doi.org/10.1177/0146167297234003" target="_blank" rel="noopener noreferrer">Research paper ↗</a></p>
            <div className="dialog-actions"><button className="secondary" type="button" onClick={() => setOverlay(null)}>Close</button></div>
            <input ref={importRef} type="file" accept=".json,application/json" className="hidden" onChange={importBackup} aria-label="Select backup file" />
          </div>
        </div>
      )}
      {!storageEnabled && <div className="storage-warning" role="alert">Browser storage is unavailable. Export a backup before leaving.</div>}
      {message && <div className="toast" role="status">{message}</div>}
    </>
  );
}
