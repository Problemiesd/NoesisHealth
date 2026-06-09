# Optional Functions

This file lists functions that are likely to be useful in future iterations of NoesisHealth.
They are optional by design. The core app can stay simple without them.

## 1. Chat

**What it does**
- Lets the user ask questions in a single chat surface.
- Supports both health questions and natural-language logs.

**Why it is useful**
- Keeps the UI simple.
- Matches the user's preferred interaction style.
- Makes it easy to add AI later without changing the whole layout.

**When to use**
- Default interaction mode.
- Best for daily logging and quick follow-up questions.

## 2. Deterministic Log Parser

**What it does**
- Converts raw text into structured log entries.
- Detects food, sleep, supplement, weight, exercise, note, and unknown entries.

**Why it is useful**
- Avoids guessing.
- Keeps health data consistent.
- Makes totals and summaries more reliable.

**When to use**
- Always on for log capture.
- Should be the first pass before any AI interpretation.

## 3. Clarification Questions

**What it does**
- Asks the user for missing details instead of guessing.
- Example: missing quantity, missing time range, missing exercise amount.

**Why it is useful**
- Prevents bad data from entering the log.
- Reduces false calories or protein estimates.

**When to use**
- Whenever a log cannot be completed safely.

## 4. AI Toggle

**What it does**
- Enables or disables OpenAI chat behavior.
- Keeps AI off by default.

**Why it is useful**
- Controls cost.
- Lets the app work deterministically when AI is not needed.

**When to use**
- Only when the user actively wants AI help.

## 5. AI Cooldown

**What it does**
- Prevents repeated AI replies too quickly.
- In the current plan, the app waits 30 minutes if the previous AI reply was not read.

**Why it is useful**
- Reduces spam.
- Lowers token usage.
- Encourages the user to read the last response first.

**When to use**
- When AI responses are enabled.

## 6. Summary Flow

**What it does**
- Produces a higher-level summary of the current logs and plan.
- Can be optional and user-triggered only.

**Why it is useful**
- Helps when the user wants a daily overview.
- Useful for end-of-day review and weekly check-ins.

**When to use**
- Only if the user explicitly asks for it.
- Can stay disabled in the early version.

## 7. State Sync

**What it does**
- Saves the app state to Supabase.
- Loads the latest state back into the chat UI.

**Why it is useful**
- Avoids losing logs between refreshes.
- Makes future cross-device support possible.

**When to use**
- When local-only state is no longer enough.

## 8. Reset Demo Data

**What it does**
- Restores default state for testing or onboarding.

**Why it is useful**
- Speeds up development.
- Makes it easier to verify parser and AI behavior from a clean slate.

**When to use**
- During local testing.
- Not required in a production-only build.

## 9. Plan File

**What it does**
- Stores AI behavior rules in `AI_PLAN.md`.

**Why it is useful**
- Keeps AI instructions separate from code.
- Makes prompt updates easier to review and version.

**When to use**
- Always, if OpenAI is enabled.

## Recommended Default Set

Keep these enabled by default:
- Chat
- Deterministic log parser
- Clarification questions
- State sync

Keep these optional:
- AI toggle
- AI cooldown
- Summary flow
- Reset demo data

