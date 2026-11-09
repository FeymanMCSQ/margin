# Paste this task into Codex in the existing Margin GitHub repository

You are implementing **Margin V2** in this existing private Next.js + TypeScript App Router project, deployed to Vercel.

Read these repo-local handoff files FIRST:

1. `docs/MARGIN_V2_PRODUCT_SPEC.md` — canonical requirements, navigation and state transitions
2. `docs/RESEARCH_SOURCES.md` — verified primary studies, book chapter references, and evidence limits
3. `content/seed-prompts.json` — **75 fully written, original, structured seed cards**

The private repository already contains PDF copies of Alison Wood Brooks's *Talk* (2025) and Marisa Franco's *Platonic* (2022). Locate and consult relevant chapters cited in the research register rather than reading them unselectively. Do not add more PDF copies, publish their text, or bundle them into client assets. Research outside the books is allowed: verify claims against primary scholarly sources and check DOI, year, and study design, but do not claim invented prompt wording has been tested.

## Why we're expanding

The existing app presents the 36 questions to develop interpersonal closeness and records which have already been asked to each saved person. That misses the *rest of* the social relationship process: opening interactions, finding interests, conversational follow-ups, reciprocal sharing, reconnecting, and low-pressure invitations to spend time together. We are building a **conversation companion**, not a pickup script, AI social coach, gamified friendship tracker, or forced stage progression. The phone must not dominate the actual conversation.

## Specific implementation tasks

1. Inspect current components, state storage schema, question records, styles and routing. Write a short architecture plan in your response.
2. Implement three primary destinations **People**, **Talk**, **Plans**. Match the existing quiet design rather than changing the brand.
3. For Talk, implement **Open**, **Discover**, **Connect**, **Deepen**, **Reconnect** categories. Add an optional quick context filter and a one-line conversational cue. Each category must be reachable within 1–2 taps; present one large prompt at a time.
4. Import the complete 75-item seed content into a typed, validated library. There is *no need to ask an AI to generate prompts at runtime*, and no need to scrape prompt-list websites. The content and source IDs are already supplied. Provide editorial QA for duplicates/awkward phrasing before shipping; document any edits rather than silently losing cards.
5. Preserve the existing original 36 questions as a separate sub-collection in Deepen, with the previous three sets, stable IDs, last positions, and individual per-person used histories. Do NOT rebuild the 36 items from generic memory, replace existing wording, or lose data.
6. Track `Mark used`, `Next`, `Skip for now`, and `Previous` distinctly. `Skip` is not a permanent used mark. Previously used cards should be hidden by default (except when explicitly reviewing them), independently for each person.
7. Add People optional interests and brief notes; notes are never mandatory during an active conversation. No automatic fabricated callbacks from blank notes. Keep existing quick resume.
8. Add Plans with user-created activity ideas and states considered/proposed/accepted/declined/completed/cancelled. Use 12 provided invitation/response cards as suggestions. Do **not** show rule-based “you have completed five questions, invite them now”. No pressure after a decline.
9. Write a careful localStorage migration (versioning, idempotent, preserve backups); maintain JSON export/import with safeguards and test schema upgrade from current production state.
10. Keep Next.js + React + TS and Vercel setup. No Supabase/Firebase/auth/LLM calls at runtime. Avoid breaking the PWA manifest and installability.
11. Test interactive behavior and accessibility at 360px. Run dependency install if possible, typecheck, tests, `next build`, and report actual status. Include a short change summary and any evidence-related limitations.

## Research and further content work

Do not rely on yourself to make up all the new content from scratch: 75 seed cards and their sources already exist. First implement and QA those. If research suggests an especially important missing conversational move, draft it in a separate candidate file with a rationale and verified source; do not dump hundreds of new cards into production unreviewed. Follow the evidence classification in the spec. Retain all original content; any expansion must remain discreet, natural, and suitable for real-time use.

## Acceptance criteria

- Existing 36-question progress survives upgrade and page reload for each person.
- New 75 cards appear in the correct sections, with unique IDs and stable source attribution.
- 3 main tabs; 5 Talk categories; <=2 taps to switch.
- No invented personal context and no inferred relationship-stage “confidence”.
- No compulsory form, AI call, timer, or intrusive notifications.
- Plans are explicitly user-managed and respond appropriately to declined invitations.
- Unit tests cover migration, used/skip semantics, cross-profile isolation, filtering, and plan states.
- Vercel production build succeeds or the exact blocker is disclosed.

When done, explain: (a) what was built, (b) whether the 75 prompts are actually populated, (c) migration safety, (d) tests run and real outcomes, (e) what still requires human live-use testing.
