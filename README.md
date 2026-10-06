# pyq_upsc

Next.js clone of [The PYQ Project](https://pyq-project.in) — search and practice UPSC/State PSC previous year questions — plus a **Weak / Fix** revision mode.

## Features

- Full local question bank (**8,039 PYQs**) with explanations
- Search, subject/topic filters, exam & year filters, UPSC-only toggle
- Interactive quiz cards with correct/incorrect feedback + explanations
- **Weak / Fix** (`/weak`): every wrong attempt is saved in the browser
  - Review wrong vs correct answers
  - Mark questions as fixed / remove them
  - **Retake test** on your weak set — correct answers auto-mark fixed
- Light / dark theme
- Deploy-ready for **Vercel** (static data, no external DB)

## Stack

- Next.js 15 (App Router)
- TypeScript
- Tailwind CSS v4
- Local JSON data (`public/questions.json`)

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000

## Data source

Question bank was extracted from the client-rendered API of pyq-project.in into:

- `public/questions.json`
- `src/data/filters.json`

Scraper helpers live in `scripts/`.

## Deploy on Vercel

```bash
npm i -g vercel
vercel
```

Or import the GitHub repo in Vercel — no extra env vars required.

## Weak / Fix storage

Wrong attempts are stored in `localStorage` under `pyq_weak_attempts` (per browser/device).
