# Cloud Functions Guidelines
- Use TypeScript with explicit return types and avoid mutating shared state between invocations.
- Keep business rules in pure helpers so they can be reused in unit tests.
- Document every exported function with JSDoc including trigger details.
