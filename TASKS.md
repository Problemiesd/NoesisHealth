# Tasks

## Completed

- Built a chat-first Next.js + TypeScript app scaffold
- Added deterministic parser for food, sleep, supplement, weight, exercise, note, and unknown logs
- Added local storage state handling for logs, chat history, and AI controls
- Added a single chat surface on `/`
- Added OpenAI chat route gated by feature flags and API key
- Added `AI_PLAN.md` as the source plan for AI behavior
- Added tests for parser behavior and AI cooldown gating
- Added Supabase schema file
- Added project documentation files

## Next

- Wire Supabase reads/writes behind a repository layer
- Add login and per-user isolation
- Persist chat and logs to the backend instead of only local storage
- Expand the food reference table carefully
- Add more parser cases from real user logs
- Add optional summarize flow if you want better AI summaries later

## Not in scope

- Medical diagnosis
- Complex AI agent behavior
- Paid AI calls by default
- Automatic nutrition inference without quantity
- Advanced meal image recognition
