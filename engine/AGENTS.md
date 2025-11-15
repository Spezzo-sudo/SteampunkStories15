# Engine Module Guidelines
- Prefer pure and deterministic helpers; if a side effect (like analytics logging) is unavoidable, keep it encapsulated and documented.
- Use descriptive TypeScript types for gameplay state and keep them colocated with the logic that consumes them.
- Always document exported APIs (functions, constants, types) with short JSDoc blocks.
