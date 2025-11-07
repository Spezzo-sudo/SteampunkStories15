# Hexgrid Module Guidelines
- Keep helpers deterministic and free of implicit global state; pass all required values via arguments.
- Document every exported symbol with JSDoc, including shared configuration constants.
- Prefer small, reusable utilities and keep rendering functions pure aside from drawing onto the provided context.
