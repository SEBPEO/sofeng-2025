# Copilot & contributor instructions (short)

Monorepo: `frontend/` (React + Vite + TS), `backend/` (NestJS).

Shared rules (placeholders):

-   There are no scripts in root.
-   Keep commits small and descriptive.

Frontend rules:

-   Keep new features in `src/features/*`.
-   Put shared UI in `src/components/*` and hooks in `src/hooks/*` etc.
-   Use absolute imports from `src` for anything outside the current feature (e.g. `@/components/Button`).
-   Create and use barrel-style exports (index.ts). Keep barrels small and explicit, and avoid creating circular dependencies. Group and comment exports.
-   Prefer using `react-hook-form` for form state and validation across the frontend. Use it for all form management unless there's a strong reason not to.
-   Do NOT override styles of reusable components (e.g. `Button`) in feature/page CSS. Use component variants/props instead. If a new look is required, add a new variant in `src/components/*` rather than per-page overrides.

Backend rules:

-   Keep API modules in `backend/src/*`.
-   Follow NestJS module boundaries; keep controllers/services small.

How to extend:

-   Add new bullets under the appropriate section for project-specific rules.

IMPORTANT:
Before making any changes to an app, ensure your location is correct (frontend/ or backend/)
