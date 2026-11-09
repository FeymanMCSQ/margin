# Margin V2 implementation

## Architecture

- Next.js App Router, React and TypeScript remain in place. The existing ivory, sage and charcoal design is retained. There are three primary destinations: People, Talk and Plans. At phone widths a native category selector gives access to all five Talk categories in two taps.
- `lib/prompts.ts` validates and types the full supplied 75-card seed, its category counts, IDs, copy and source references. The existing `lib/questions.ts` is unchanged; `aron-0` through `aron-35` are display adapters over the existing numeric indices, not replacements for saved question IDs.
- `lib/state.ts` holds validation, migration, import merging, card selection, used history and plan states as independently tested functions. `app/page.tsx` owns the browser state and explicit UI actions; the native dialog component supplies focus containment and Escape handling.
- No accounts, database, recording, analytics or runtime AI/research calls. The manifest and install icons remain in place. Hosting requires a connection; no offline service worker has been added.

## Content and editorial review

All 75 cards ship: 16 Open, 14 Discover, 15 Connect, 8 everyday Deepen, 10 Reconnect and 12 Plans. The original 36 remain separate within Deepen, in Set I/II/III and their exact original wording and order.

Reviewed the whole seed for duplicate text, neighboring overlap, naturalness, inappropriate assumptions, context, reciprocal sharing, boundaries, and evidence inflation. No cards or IDs were removed. Similar opener/follow-up moves are retained because they cover different settings. Direct-interest card `mgv2-016` is excluded from automatic selection unless explicitly enabled; it is still manually available and labelled more forward.

One editorial revision, applied as an explicit adapter so the supplied seed is preserved intact:

| ID | Supplied text | Shipped text | Reason |
| --- | --- | --- | --- |
| mgv2-030 | You mentioned you like hiking. What kind of trails do you enjoy most? | You mentioned you like [interest]. What do you enjoy most about it? | The supplied cue calls this a template, but the supplied text asserted a specific fact. Visible brackets now require real, manually supplied context. |

Its cue is now “Template: fill with an interest they actually mentioned.” All bracketed cards visibly explain that the user fills them with a real detail. Notes never populate cards automatically. A plan created from a bracketed card starts with a blank idea instead of saving unresolved placeholders as a personal plan.

No new candidate cards were added. Research supports mechanisms under particular study conditions, not the exact wording of these cards. New cards are never labelled `tested_protocol`. The existing paraphrased 36-question browser does not reproduce the experimental protocol.

## Research consultation

Consulted the supplied local *Talk* PDF, pp. 97–101, for balance between following a topic and switching topics, and *Platonic*, pp. 92–96, for initiative, repeated contact and low-pressure opportunities to meet. These are book syntheses; no book passages were copied into production. The source PDFs and handoff archive are ignored by Git and are outside `public/`.

Checked the following primary records during implementation:

- [Huang et al. (2017), author-hosted article](https://www.hbs.edu/ris/Publication%20Files/Huang%20et%20al%202017_6945bc5e-3b3e-4c0a-addd-254c9e603c60.pdf): two controlled get-acquainted studies plus an observational speed-dating study. This does not establish an optimal quota of questions or validate Margin's copy. The literature includes a subsequent methodological exchange; no universal outcome is claimed.
- [Hall, publisher article](https://journals.sagepub.com/doi/10.1177/0265407518761225): online 2018, journal volume 2019. Study 1 used retrospective reports from recently relocated adults; Study 2 followed first-year students over nine weeks. Associations are not an invitation schedule. The stable source ID `hall-2018` is retained; the UI clarifies both years.
- [Liu et al., PubMed record](https://pubmed.ncbi.nlm.nih.gov/35816566/): online 2022, journal 2023, preregistered experiments on reach-out appreciation. No implication that silence or a decline justifies repeated outreach.

Other source IDs and evidence descriptions come from the supplied register; they are retained rather than presented as independently re-audited here.

## Storage and recovery

- Reads production `margin.conversations.v1` arrays and exported v1 envelopes. Preserves names, IDs, created/updated times, all asked indices and current numeric position for every person. Migrated people resume the original 36.
- Saves a validated versioned envelope at `margin.conversations.v2`. The original v1 key is never changed or deleted; `margin.backup.before-v2` is written before the first v2 save. Existing snapshots are never overwritten. Loading valid v2 is idempotent.
- New cards use a separate per-person ID-to-ISO-time used history. Original 36 used state remains `asked: number[]`. Talk and Plans have separate remembered positions. Used cards are hidden on reload, while the original stored position is retained.
- Next only advances; Skip additionally excludes the card for this page session. Neither marks used. Previous explicitly reviews navigation history, including used/skipped cards. Session skips reset on reload. The browser can manually review used cards and toggle them unused.
- Corrupt, unsupported or partially invalid saved data is not replaced with an empty store. The app displays a warning and blocks writes over the original. In-tab changes can still be exported. Options can download raw saved keys for recovery. Storage/quota failures are disclosed rather than reported as saved.
- Import accepts v1/v2 Margin exports up to 2 MB and rejects the entire file if any profile, history, position or plan is invalid. Matching IDs and new-person counts are previewed before merging. Histories are combined, existing profiles are retained, newer profile fields and individually timestamped plan edits win. A uniquely named snapshot of both in-tab and persisted state is saved before import. If that snapshot cannot be written, import stops. React renders strings as text, never imported HTML.
- Storage events synchronize valid updates from other tabs. This is device-local storage, not a multi-device conflict-resolution service. Exports remain the backup/transfer mechanism.

## Plans

Plans are explicitly created and may be considered, proposed, accepted, declined, completed or cancelled. Declined/completed/cancelled records move to a collapsed past section. The exact invitation linked to a declined/cancelled plan is excluded from automatic suggestions. Reopening takes an explicit Edit action; there are no reminders or count-triggered invitations.

## Validation

Run `npm test`, `npm run typecheck`, `npm run build` and `npm run test:e2e`. Browser tests use installed Chrome at 360 × 800 against a production server on port 3100. Install Chrome, or change the channel in `playwright.config.ts` for another Playwright-supported browser.

The unit suite covers complete content, immutable original question order, production-v1 upgrades, idempotence, backup order, corrupt/future state, quota failure, history isolation, filtering/exhaustion, session skip semantics, strict imports, merge behavior and all plan states. Browser tests cover reload, set selection, navigation, previous/used review, profile separation, notes, unfilled templates, plan states/decline suppression, import preview, backup download, dialog focus/Escape, corruption protection and horizontal overflow. Axe checks the mobile conversation, People, Plans and plan dialog for WCAG A/AA issues.

Human live-use testing still matters: test comfort and usefulness of the wording in real conversations, large OS text settings, VoiceOver/TalkBack, installed iOS/Android behavior, real production-browser data, and backup transfer between actual devices. Automated checks cannot establish social outcomes or certify full accessibility.

Verified on 10 November 2026: dependency installation succeeded with zero reported vulnerabilities; TypeScript passed; all 12 unit tests passed; the Next.js 16.4.5 production build succeeded; all four Chrome browser scenarios passed at 360 × 800. Axe reported no WCAG A/AA violations in the checked views. Mobile People, Talk and Plans screenshots and a desktop People screenshot were inspected. This verifies the local production build, not a completed Vercel deployment.
