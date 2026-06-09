# NoesisHealth

Minimal v0 health and diet logging app with deterministic parsing and rule-based summaries.

## What v0 does

- Logs food, sleep, supplements, weight, exercise, notes, and unknown entries
- Adds automatic timestamps on save
- Parses simple natural-language logs deterministically
- Refuses to calculate food calories or protein when quantity is missing
- Shows today totals, incomplete logs, latest weight, and next-action advice
- Keeps OpenAI analysis disabled by default

## What v0 does not do

- No medical advice
- No paid AI calls by default
- No automatic hallucinated nutrition estimates
- No complex NLP pipeline
- No cross-device sync yet

## Setup

1. Install dependencies

```bash
npm install
```

2. Create your env file

```bash
cp .env.example .env.local
```

3. Run the app

```bash
npm run dev
```

4. Run tests

```bash
npm run test
```

## Environment variables

- `ENABLE_AI_ANALYSIS=false`
- `OPENAI_API_KEY=` optional placeholder for later work
- `NEXT_PUBLIC_ENABLE_AI_ANALYSIS=false` if you want the UI button enabled locally

## Supabase setup

1. Create a Supabase project
2. Run the SQL in `supabase/schema.sql`
3. Add Supabase auth and data access later when you are ready

## Routes

- `/` redirects to `/dashboard`
- `/log` quick log input and recent logs
- `/dashboard` today summary and rule output
- `/settings` targets and defaults

## Notes

- Food entries with missing amounts are saved as incomplete
- Only complete food logs count toward kcal and protein totals
- AI analysis is a placeholder and does nothing unless the feature flag is enabled
