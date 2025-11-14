# Auth Components Guidelines
- Keep components fully controlled via props and avoid Zustand imports directly; let containers orchestrate state.
- Document each exported component with a brief JSDoc comment including event semantics.
- Use accessible form markup and ensure keyboard navigation works without relying on pointer interactions.
