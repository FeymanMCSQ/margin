# Margin V2 — Product and Content Specification

**Status:** implementation handoff, 10 November 2026

**Target:** existing private GitHub repository; Next.js (App Router), TypeScript, deployed on Vercel

**Product:** a discreet, mobile-first conversational companion for meeting people, developing rapport, reconnecting, and turning mutually enjoyable interactions into opportunities to spend time together.

## 0. Why this document exists

The prior ChatGPT conversation contains requirements that Codex cannot assume it can see. This file is the canonical written handoff. Treat the PDF books already in the private repository as optional research inputs, not as runtime assets or a substitute for this specification. If the codebase contradicts an implementation detail here, inspect the repository, preserve user data, and document the difference rather than discarding existing functionality.

## 1. Non-negotiable product principles

1. **The phone is secondary to the person.** One prompt occupies the main screen; its navigation must be obvious without reading instructions.
2. **Do not build an interrogation script.** The main moves are ASK, SHARE, SWITCH, and INVITE. Each has a place; none should monopolize the flow.
3. **No forced ladder.** Open → Discover → Connect → Deepen → Reconnect is a *navigation model*, not a compulsory relationship sequence. A user can jump between sections at any time. Deepen is not an achievement to unlock.
4. **No numerical friendship score, compulsory timers, closeness classifier, or algorithmically inferred attraction.** The app cannot determine what the other person feels.
5. **Invitations are suggestions, not mandates.** Suggest a relevant low-pressure shared activity when a mutual interest or suitable occasion is known. No automatic invitations after X questions or hours.
6. **Respect a refusal or lack of interest.** Never automatically surface repeated invitations after a decline; avoid nudges that pressure another person.
7. **Original example content, not book transcription.** Study and cite the PDFs, then write original prompts. Don't reproduce long passages, entire inventories, or book exercises verbatim. Existing Aron content stays separate.
8. **Preserve existing Margin data.** Names, 36-question completion histories, current positions, and existing localStorage user records must survive migration.
9. **Device-local by default.** No accounts, AI API calls, CRM service, recording, transcription, analytics, cloud database, contact-list access, or mandatory note-taking. Preserve existing JSON export/import.
10. **Design:** existing subdued ivory/sage/charcoal aesthetic. Avoid visual language signaling a dating app or a gamified social score.

## 2. Research-to-product model

Source evidence supports **mechanisms**, not precise magic lines or stage thresholds. The 1997 Aron task is an experimentally studied *protocol*, not evidence that every individual paraphrase works equally or that a 36-question tracker alone creates lasting friendship. Other research supports follow-up questions, responsive listening, mutual disclosure, reconnecting, and time together. Specific Margin prompts are original design instances of those mechanisms and must not be advertised as scientifically tested word-for-word.

Evidence levels:

- `tested_protocol`: Reserved for an established protocol reproduced under properly sourced circumstances (e.g. the original Aron procedure, with caveats and permissions). Do not assign to newly invented lines.
- `mechanism_supported`: An original line that operationalizes a research-supported mechanism; the line itself is not validated.
- `design_hypothesis`: A practical suggestion grounded in product judgment rather than evidence about that particular move.

See `docs/RESEARCH_SOURCES.md` for source IDs, paper links, book chapter/page locations, and limitations.

## 3. What actually populates the app

**The initial bank is already written:** `content/seed-prompts.json` contains 75 original example cards, with IDs, categories, subcategories, move types, context tags, depth, cues, and evidence/source references. Load these as the first real content release; don't leave every category populated by 2–3 mock questions. Separately preserve the existing 36 Aron cards from the current app. V2 therefore starts with the existing 36 + 75 new example cards, subject to QA and deduplication.

The 75 seed cards are distributed as follows:

| Area | Seed cards | Intended use |
|---|---:|---|
| Open | 16 | Situational, shared-context, observational, direct, compliment, playful, and explicitly direct-interest openings |
| Discover | 14 | Broad familiarity: life, study, work, hobbies, music, food, places, travel, preferences |
| Connect | 15 | Follow-ups, personal stories, reflecting, reciprocal sharing, topic switching |
| Deepen (additional) | 8 | Original gradual-depth questions; **separate** from the 36-question Aron collection |
| Reconnect | 10 | Remembering previous events, checking in, shared memories |
| Plans | 12 | Invitations, group/low-pressure activities, follow-ups, respecting declined invitations |

Content policy:

- Prompt text is **standalone** unless explicitly shown as a template with `[bracketed placeholders]`.
- **Never** fill bracketed placeholders automatically with invented information.
- Do not generate dynamic live questions by pretending to know what the other person said.
- When possible, a user can manually choose a one-tap *topic tag* such as hobbies, study, work, food, music or travel; this filters relevant prompts without needing note entry.
- Preserve all original 36 questions in three sets with their stable existing IDs and positions. Do not fold them into a randomizer; do not change their completion state.
- Seed is curated, deterministic and offline. Codex should not rely on an LLM or web search *at runtime* to populate the mobile app.

## 4. The real conversation model

Margin offers short **moves** as options, not a locked step-by-step decision tree.

| Move | Description | Example |
|---|---|---|
| `ask` | Open, explore, clarify, follow up, or broaden | “How did you get into that?” |
| `say` | Share a relevant personal experience, reflect their point, or acknowledge | “That reminds me of something similar…” |
| `invite` | Suggest a mutually relevant activity, or acknowledge a decline | “Want to grab lunch after our next class?” |

`switch` is a subcategory of `say` or `ask`, not a separate compulsory interaction. The content bank also includes reflective statements and decline-respecting exits.

### Suggested flow—not a stage requirement

**Example A — first meeting at a university club**

- Context: club. Start with Open / shared context: “How long have you been part of this group?”
- They say they joined because of live music. Move to Discover / music: “What have you been listening to on repeat lately?”
- They mention an artist they enjoy. Move to Connect / origin: “How did you first get into that?”
- Share something relevant about your own music taste if appropriate.
- If shared enthusiasm develops, optionally visit Plans / shared interest and suggest an upcoming gig. If there is no clear mutual interest, don't suggest it.

**Example B — seeing someone again**

- Select person and Reconnect; show manually saved conversation context only if the user supplied it.
- “How did the [event] you mentioned end up going?” is a template; don't invent the event.
- Based on reply, select Connect or Discover. If they mention wanting to try an activity and the user is interested too, optionally open Plans.

**Example C — someone responds briefly**

- Do not recommend “more intense questions” as an automatic fix.
- Try an easier shared topic, share a small appropriate experience, or end the interaction politely.
- The app cannot diagnose their interest from no data. Avoid “they like you” labels.

### Different kinds of openers

The opening taxonomies are **product categories, not validated scientific classes**:

- Situational: event, venue, queue, class, activity in the immediate environment.
- Shared context: studies, work, same community, mutual acquaintance.
- Observation + question: small observation then low-pressure invitation to respond.
- Direct introduction: name and reason to say hello.
- Compliment: specific, genuine, non-demanding.
- Playful: light, informal, not reliant on a rehearsed joke.
- Direct interest: deliberately more forward, optional, never the default; may signal flirting rather than friendship.
- Re-entry: callback to earlier chat, handled under Reconnect.

## 5. Information architecture and UI

Three top-level destinations:

### People

- Profiles with a manually entered name; quick-start anonymous temporary conversation may later be named.
- Per-person used-prompt history and legacy 36-question progress.
- Optional freeform `interests` tags, `lastDiscussed` note, relevant upcoming event, and activity plans.
- Do not require note entry during a live conversation. When notes exist, display privately; do not automatically project the content into questions without an explicit template fill.
- Save the last viewed category and card for quick resumption.

### Talk

- One large prompt per screen, a tiny category label, and an optional collapsible one-line cue.
- Five quick-switch categories: Open, Discover, Connect, Deepen, Reconnect.
- Horizontal tabs or bottom drawer, reachable within <=2 taps. On narrow phones, prioritise visible selected category and a one-tap switcher over microscopic tabs.
- The current card's move type is clear (Question / Share / Suggestion) without loud coloring.
- Controls: `Previous`, `Next`, `Mark used`, `Skip for now`; an overflow for `Choose a prompt`, `Show used`, `Mark unused`, and `Edit note`.
- `Next` moves to the next *unused* card within current category respecting optional filters. `Skip for now` should omit a card only for the current session, **not** mark it as asked. `Mark used` persists per person.
- Manual selection of any card in any category, even if used. Previously used cards show a quiet indicator.
- A separate Aron sub-view inside Deepen retains Set I, II, III navigation and exact completion tracking.

### Plans

- Suggestions from `section=plans` in the seed content.
- Per-person optional plan records: `idea`, `state = considered | proposed | accepted | declined | completed | cancelled`, `lastUpdatedAt`, optional user-entered activity and date.
- Plans are not automatically created based on question counts; users must explicitly choose to add them.
- If declined, suppress automatic reminders for that invitation. Only user-initiated editing should resurrect it.
- No social-pressure notifications. No “you must invite them now” badges.

## 6. Selection and transition rules

Pure deterministic content selection is sufficient for V2.

1. User selects person (or starts temporary session) and selects a category.
2. Show next unused card from that category. If context/topic filter selected, prefer tags that match; fall back to all category items if no match.
3. Users can tap `Next` or `Skip for now` without recording the prompt as used.
4. `Mark used` persists a card ID and timestamp in that person's history. It does **not** mean the other person answered, consented to more questions, or liked the conversation.
5. If the user switches from Discover to Connect, present a short optional hint (“Follow what they just mentioned”) and a relevant follow-up card. Never claim to know what they mentioned without an explicit tag or note.
6. When a shared interest is explicitly noted (through a tag or note), the Plans section can surface a relevant optional invitation. This is a UI suggestion, not a recommendation to pressure someone.
7. No automatic elevation from Open to Deepen. No default trigger tied to 5 questions, 3 meetings, or Hall's hours thresholds.
8. Reconnect cards are available whenever the user chooses a saved person. Template placeholders require manual filling.
9. If no unused cards remain in a filtered category, offer: `Show used`, `Clear filter`, or `Pick another category`, rather than silently repeating used prompts.
10. Avoid duplicate questions across categories and semantically redundant questions within adjacent cards. Retain stable IDs through content revisions.

### A feasible optional context gesture

A compact drawer: **What did they mention?** [Studies] [Work] [Food] [Music] [Travel] [Hobbies] [Other] [None]. Tapping a chip filters card suggestions for the current session. No transcription, AI listening, or personal inference required. This drawer must be optional; it should never block `Next`.

## 7. Data model and migration

Match existing data structures only after inspecting the current code. Suggested V2 additions:

```ts
type EvidenceLevel = 'tested_protocol' | 'mechanism_supported' | 'design_hypothesis';
type Section = 'open' | 'discover' | 'connect' | 'deepen' | 'reconnect' | 'plans';
type Move = 'ask' | 'say' | 'invite';
type PlanState = 'considered' | 'proposed' | 'accepted' | 'declined' | 'completed' | 'cancelled';

type Prompt = {
  id: string;
  section: Section;
  subcategory: string;
  move: Move;
  text: string;
  cue: string;
  contextTags: string[];
  depth: 1 | 2 | 3;
  evidenceLevel: EvidenceLevel;
  sourceIds: string[];
  evidenceNote: string;
  safetyNote?: string;
};

type ConversationV2 = {
  id: string;
  name: string;
  usedPrompts: Record<string, string>; // prompt id -> marked-used ISO timestamp
  lastActive: string;
  lastSection?: Section;
  lastPromptId?: string;
  interests?: string[];
  lastDiscussed?: string;
  plans?: Array<{id: string; idea: string; state: PlanState; updatedAt: string}>;
  // Keep existing Aron question progress in its legacy-compatible form;
  // migrate only after inspecting the actual app schema.
};
```

Rules: version stored state, use an idempotent migration, preserve old localStorage until successful validation, and migrate both direction-specific last positions and Aron per-person tracking. Provide JSON export/import with versioning, a preview, and guard against destructive merges. Do not trust imported JSON as HTML. Sanitize display strings and reject invalid shapes.

## 8. Validation and acceptance tests

- All legacy people and all 36-question flags remain after V2 install and refresh.
- Existing conversations retain separate histories even when the same prompt is marked used for one person only.
- New prompt sections contain the real 75-item seed bank, not placeholders.
- A user can start from home, select a person and see a question in <=3 taps; switching between Open and Reconnect takes <=2 taps.
- `Next`, `Mark used`, and `Skip for now` do three distinct things, including after page reload.
- Same used item not reoffered by default, but review is possible.
- Aron Set I/II/III history unchanged; user can jump directly to any set.
- User can create, accept, decline, complete and cancel a plan; decline disables unsolicited repeat nudges.
- Missing context does not generate fabricated personalized details.
- Fully usable at 360px viewport with a large font, mobile touch targets, readable contrast, screen-reader labels, and keyboard support.
- All interaction works without an AI service or internet research at runtime (web hosting still requires access unless service worker/offline caching is implemented).
- App runs under Vercel's Next.js build process with verified typecheck, unit tests and production build; report failures rather than inventing results.

## 9. What NOT to do in this pass

No autonomous 'relationship stage' prediction, daily streaks, contact importing, AI-generated personal replies, push reminders, notification spam, mandatory diaries, calendar integrations, animated gamification, social network features, or psychological scoring. These can be evaluated later after live-use testing.

## 10. How to extend the bank later

Codex may research more primary studies **for content governance**. It may draft candidate content into a review file. Do not ship unsupported generated prompts without QA. Review each candidate for naturalness, applicability, duplication, non-coercion, false personalization, research-evidence inflation, and clear context. Expand only categories observed to lack coverage after usage testing.
