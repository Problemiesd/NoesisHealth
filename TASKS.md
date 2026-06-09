# Tasks

## Completed

- Scaffolded a Next.js + TypeScript app structure
- Added deterministic parser for food, sleep, supplement, weight, exercise, note, and unknown logs
- Added rule-based daily summary logic
- Added local storage state handling for the v0 UI
- Added dashboard, quick log, and settings screens
- Added placeholder AI analysis route gated by a feature flag
- Added Supabase schema file
- Added tests for parser and summary behavior
- Added project documentation files

## Next

- Wire Supabase reads/writes behind a repository layer
- Add login and per-user isolation
- Persist daily summaries from the backend instead of only local storage
- Expand the food reference table carefully
- Add more parser cases from real user logs

## Not in scope

- Medical diagnosis
- Complex AI agent behavior
- Paid AI calls by default
- Automatic nutrition inference without quantity
- Advanced meal image recognition
