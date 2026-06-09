# Decisions

- Rule-based first: parsing and advice are deterministic in v0.
- OpenAI API is optional and disabled by default.
- No hallucination policy: missing food quantities stay incomplete.
- Do not calculate food nutrition when quantity or food reference is missing.
- Local storage is acceptable for v0 UI state until Supabase wiring is added.
- Simple CSS is preferred over adding Tailwind when the repo does not already use it.
- Timezone defaults to `Asia/Bangkok`.
