# Margin

A discreet mobile-first 36-question conversation tracker built with **Next.js App Router**, **TypeScript**, and **React**. Designed for deployment on **Vercel**.

## Run locally

Requires Node.js 20.9+ (Node.js 22 recommended).

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Deploy on Vercel

1. Extract this folder and push its contents to a GitHub repository (or import the project directly into Vercel).
2. In Vercel, choose **Add New → Project** and import the repository.
3. The framework preset should autodetect **Next.js**. Root directory should point to the folder containing `package.json`.
4. Use the default build command (`next build`), then select **Deploy**. No environment variables, database, or server-side configuration are needed.

This **is a real Next.js app**, not a standalone HTML file uploaded to a static site. Vercel serves the Next.js app; conversation histories remain client-side only.

## Features

- 36 independently paraphrased questions divided into three sets, in original Aron et al. sequence.
- A separate named history for each person.
- One-tap **Mark asked**, **Not now**, **Previous**, and direct question selection.
- Set tabs and full 36-question browser with asked/unasked filter and history toggles.
- Automatic localStorage persistence and same-tab refresh recovery.
- Rename/delete profiles, JSON backup export and merge import.
- No account, server-side person data, analytics, API keys, or database.

## Data and privacy

This version uses `localStorage` key `margin.conversations.v1` and stores the active person ID in `sessionStorage`. The key matches the older static prototype, so histories **can be reused if the new app is served under the same browser origin**. Data does **not** sync across different domains or devices automatically. Browser privacy modes or clearing site data can erase it; download a JSON backup periodically.

No offline guarantee: the app needs an internet connection to load unless the browser has cached its assets. The Next.js version intentionally does not install the earlier prototype's simplistic service worker.

## Research attribution

Based on Arthur Aron et al. (1997), *The Experimental Generation of Interpersonal Closeness: A Procedure and Some Preliminary Findings* (https://doi.org/10.1177/0146167297234003). Prompts are paraphrased, not verbatim.
