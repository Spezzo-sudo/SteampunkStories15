# Firebase Services Guidelines
- Keep modules free of React imports; expose typed helpers returning Promises or unsubscribe handlers.
- Document each exported symbol with concise JSDoc including references to required environment variables.
- Prefer lazy initialization so tests can stub Firebase when needed.
