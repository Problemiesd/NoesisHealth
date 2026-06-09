# NoesisHealth

Chat-first health logging app with deterministic log capture and optional OpenAI chat.

## What v1 does

- Single chat surface for questions and logging
- Saves food, sleep, supplements, weight, exercise, notes, and unknown entries
- Adds automatic timestamps on save
- Parses simple natural-language logs deterministically
- Refuses to calculate food calories or protein when quantity is missing
- Keeps a plan file at `AI_PLAN.md` for AI instructions
- Lets OpenAI answer only when you switch chat on
- Blocks repeat AI replies for 30 minutes if the last AI reply is unread

## What v1 does not do

- No medical advice
- No paid AI calls unless you actively enable chat
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

3. Set the OpenAI flags if you want AI chat to work

- `ENABLE_OPENAI_CHAT=true`
- `NEXT_PUBLIC_ENABLE_OPENAI_CHAT=true`
- `OPENAI_API_KEY=...`

4. Run the app

```bash
npm run dev
```

5. Run tests

```bash
npm run test
```

## Environment variables

- `ENABLE_OPENAI_CHAT=false`
- `NEXT_PUBLIC_ENABLE_OPENAI_CHAT=false`
- `OPENAI_API_KEY=` your key when you want AI chat
- `OPENAI_CHAT_MODEL=gpt-4.1-mini`

## Supabase setup

1. Create a Supabase project
2. Run the SQL in `supabase/schema.sql`
3. Add Supabase auth and data access later when you are ready

## Routes

- `/` chat and logging
- `/log`, `/dashboard`, `/settings` redirect to `/`

## Notes

- Food entries with missing amounts are saved as incomplete
- Only complete food logs count toward kcal and protein totals
- `AI_PLAN.md` is the source of truth for OpenAI behavior
- Summarize is optional and off by default
