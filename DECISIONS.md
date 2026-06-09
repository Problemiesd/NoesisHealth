# Decisions

- Chat-first: the app opens to a single chat surface.
- Rule-based first: parsing and log capture stay deterministic in v1.
- OpenAI chat is optional and disabled by default.
- No hallucination policy: missing food quantities stay incomplete.
- Do not calculate food nutrition when quantity or food reference is missing.
- `AI_PLAN.md` is the source of truth for AI behavior.
- Summary is optional and off by default.
- Local storage is acceptable for v1 UI state until Supabase wiring is added.
