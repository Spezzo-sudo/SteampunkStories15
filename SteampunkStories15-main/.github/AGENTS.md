# GitHub Automation Guidelines
- Keep workflow files idempotent and guarded behind explicit branch filters.
- Prefer reusable scripts inside `scripts/` rather than duplicating logic in YAML steps.
- Document required secrets in comments at the top of each workflow.
