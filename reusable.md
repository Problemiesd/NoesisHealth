# Reuse Guide

This project is intentionally small and can be reused in several directions.
The main idea is to keep the chat-first shell, the deterministic parser, and the plan-driven rules, then swap the domain.

## What Can Be Reused

### 1. Chat-first UI

The current layout is a single conversation surface.

Reuse value:
- Good for any task where the user enters short natural-language updates.
- Works for journaling, habit tracking, support intake, and command-style assistants.

### 2. Deterministic Parsing

The parser turns raw text into structured entries before any AI call.

Reuse value:
- Keeps data reliable.
- Lets you support new entry types without rewriting the whole app.
- Makes summaries and analytics easier later.

### 3. AI Plan File

`AI_PLAN.md` stores the behavioral rules for AI.

Reuse value:
- You can replace the content without touching the UI.
- Good for any app where prompt rules need to stay reviewable.

### 4. Supabase State Sync

The current backend sync stores app state remotely.

Reuse value:
- Easy to replace the storage model.
- Useful if you want to keep per-device state, per-user state, or audit logs.

### 5. Cooldown and Read-State Logic

The app tracks whether an AI reply was read and delays repeat replies.

Reuse value:
- Can be reused in any chat product that needs rate control.
- Helps reduce cost and repeated answers.

## What Must Change Before Reuse

### 1. Identity Model

Current state:
- Uses a local device id.

If you reuse it:
- Replace `device_id` with real user identity if you want multi-device sync.
- Add auth and row-level security if more than one person will use it.

### 2. Schema

Current state:
- Health-specific tables and a JSON-based app state record.

If you reuse it:
- Split or rename tables for the new domain.
- Add new entities only when you need them.
- Remove health-only fields if the new project is not health-related.

### 3. Prompt Rules

Current state:
- Prompt rules are written for fat loss, protein tracking, and log clarification.

If you reuse it:
- Rewrite `AI_PLAN.md` for the new use case.
- Keep the same separation between code and prompt text.

### 4. Parser Vocabulary

Current state:
- Parser understands food, sleep, supplements, weight, exercise, and notes.

If you reuse it:
- Replace keywords, aliases, and rules with the new domain vocabulary.
- Update tests so parsing remains deterministic.

### 5. UI Labels

Current state:
- The interface speaks health and logging language.

If you reuse it:
- Rename labels, placeholders, and help text.
- Keep the single chat surface if the new product still fits that interaction style.

### 6. Metrics and Summaries

Current state:
- Summary logic is health-oriented.

If you reuse it:
- Replace calories/protein metrics with the new domain's metrics.
- Keep the same dashboard pattern if it still makes sense.

## Best Reuse Directions

### Direction A: General Personal Assistant

Good fit if the next product is a private chat tool.

Keep:
- Chat UI
- AI toggle
- cooldown logic
- state sync

Change:
- AI_PLAN.md
- parser rules
- storage schema

### Direction B: Habit Tracker

Good fit if the next product tracks daily routines instead of nutrition.

Keep:
- one-line logging
- clarification questions
- daily summaries
- Supabase persistence

Change:
- log categories
- summary metrics
- labels and prompts

### Direction C: Journaling App

Good fit if the next product is for personal reflection or note-taking.

Keep:
- chat-first entry flow
- local-first behavior with backend sync
- optional AI summary

Change:
- parser to extract journal topics
- summary outputs
- plan rules

### Direction D: Task or Case Intake Tool

Good fit if users submit short requests and the app asks follow-up questions.

Keep:
- clarification engine
- structured logs
- optional AI answer mode

Change:
- domain entities
- priorities
- approval or assignment flow

## How To Reuse Cleanly

1. Extract the domain rules into the plan file.
2. Keep parser logic deterministic.
3. Keep AI optional, not required for core operation.
4. Keep state sync behind a small API layer.
5. Add tests for any new categories or summary rules.
6. Replace health-specific text last, after the new data model is stable.

## Short Version

The project is most reusable as:
- a chat-first logging shell
- a deterministic parser app
- a prompt-driven assistant with optional AI
- a state-synced personal tool

The main things to replace are:
- user identity
- schema
- parser vocabulary
- prompt rules
- metrics

