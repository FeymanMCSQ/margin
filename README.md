# Margin

A quiet, mobile-first conversation companion built with Next.js App Router, React and TypeScript. Device-local by default, ready for Vercel.

## Margin V2

- **People:** separate conversation histories, quick resume, optional interests, private notes and upcoming events. Start without a name and name the conversation later.
- **Talk:** Open, Discover, Connect, Deepen and Reconnect. One large card at a time, optional context filtering and a small conversational cue. All 75 supplied seed cards are populated across Talk and Plans.
- **The original 36:** a permanent, direct choice in Talk and on People. Unchanged wording and order, three sets and existing per-person progress. Browse all 36, search, or jump to any question.
- **Distinct actions:** Next advances, Skip omits a card for this page session, Mark used saves history for this person. Previous goes back in collection order, including after reload. The browser allows explicit review of any card. Used cards stay hidden by default.
- **Plans:** your own activity ideas, 12 invitation/response suggestions, and considered/proposed/accepted/declined/completed/cancelled states. Declined invitations are set aside without reminders.
- **Backups:** versioned local-storage migration, original v1 data retained, JSON export and previewed merge import.

These are original, research-informed examples. Individual wordings have not been experimentally validated; the app does not predict social outcomes or prescribe a relationship sequence. Read the [product specification](docs/MARGIN_V2_PRODUCT_SPEC.md), [research register](docs/RESEARCH_SOURCES.md), [implementation notes](docs/V2_IMPLEMENTATION.md), and [navigation review](docs/NAVIGATION_REVIEW.md).

## Run locally

Node.js 20.9+ is required; Node.js 22 is supported.

```sh
npm ci
npm run dev
```

Open http://localhost:3000.

## Verify

```sh
npm test
npm run typecheck
npm run build
npm run test:e2e
```

Browser tests use local Chrome at 360 × 800 and start the production build on port 3100. Build first. To use a different supported browser, change `channel` in `playwright.config.ts`. Screenshots are written to ignored `.dist/`; failure traces go to ignored `test-results/`.

## Deploy on Vercel

Import this repository, use the Next.js preset, and keep the default build command (`next build`). The root directory is the one containing `package.json`. No environment variables, authentication or database are required. Existing manifest, app icons and standalone display settings are retained.

## Data and privacy

V2 stores data under `margin.conversations.v2`. On first upgrade it validates production `margin.conversations.v1`, preserves that key unchanged and writes `margin.backup.before-v2` before saving V2. Per-person original question indices and positions are preserved. Active-person quick resume uses session storage; skips last for the current page session. Named hash destinations support browser Back/Forward and direct links such as `/#talk/36`.

No names, notes or histories are sent to a server. There are no analytics, recordings, runtime LLM calls or cloud sync. Export a JSON backup to transfer data to another browser origin or device. Imports are validated and previewed before merging, with a recovery snapshot saved first. Local browser privacy settings or clearing site data can erase histories, so keep periodic exports.

There is no offline guarantee: a connection is needed to load the hosted application unless its assets are already cached. Reference PDFs and the handoff archive are private local inputs, ignored by Git and never bundled into client assets.

## Research attribution

The original 36 independently paraphrased prompts retain the sequence of Aron et al. (1997), [*The Experimental Generation of Interpersonal Closeness*](https://doi.org/10.1177/0146167297234003). Using individual cards freely does not reproduce the experimental protocol. Source references for new cards describe underlying mechanisms, not proof that a particular line works.
