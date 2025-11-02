# Copilot & contributor instructions (short)

Monorepo: `frontend/` (React + Vite + TS), `backend/` (NestJS).

Shared rules (placeholders):

-   Use repo root scripts for install/build/lint.
-   Keep commits small and descriptive.

Frontend rules:

-   Keep feature folders in `src/features/*`.
-   Put shared UI in `src/components/*` and hooks in `src/hooks/*` etc.
-   Use absolute imports from `src` for anything outside the current feature (e.g. `components/ui/Button/Button`).

Backend rules:

-   Keep API modules in `backend/src/*`.
-   Shared server utilities go in `backend/src/lib/*`.
-   Follow NestJS module boundaries; keep controllers/services small.

How to extend:

-   Add new bullets under the appropriate section for project-specific rules.

Quick commands:

-   npm install
-   npm --prefix frontend run dev
-   npm --prefix frontend run lint
