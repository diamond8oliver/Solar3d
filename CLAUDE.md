# Solar3d — CLAUDE.md

**Purpose:** 3D solar preview tool for installers. Roof visualization + panel layout + production analytics for sales / planning.

## Build & Development Commands
- `npm install` (from repo root — npm workspaces).
- `npm run dev` — concurrently starts client + server.
- `npm run dev:client` / `npm run dev:server` — individually.
- `npm run build` — builds shared → server → client (in order — DO NOT parallelize).
- `npm run typecheck` — TypeScript build across workspaces.
- ALWAYS run from repo root.

## Architecture
- npm workspaces monorepo with 3 packages:
  - `shared/` — types and utilities shared between client and server.
  - `server/` — backend API.
  - `client/` — Next.js frontend with 3D rendering.
- Build order: shared → server → client (server consumes shared types).

## Key directories
- `client/` — Next.js + React 3D viewer (likely react-three-fiber).
- `server/` — backend API endpoints, solar production calculations.
- `shared/` — common types (panels, roofs, production models).

## Architecture decisions
- Monorepo to share types between viewer and API without duplication.
- 3D rendering client-side only — performance + interactivity. Server does math, not rendering.

## Code style
- TypeScript strict mode across all workspaces.
- Workspace boundaries enforced — `client/` does not import from `server/` directly, only via shared types or HTTP.

## Skills
This project follows `~/Documents/Ollies Vault/Meta/Skill-Invocation-Rules.md`. **Mandatory triggers:**
- Any UI work → `ui-ux-pro-max` + `web-design-guidelines` + `vercel-react-best-practices` + `vercel-composition-patterns`.
- Animation / transitions / camera moves → `motion` (Framer Motion / Motion lib only — no hand-rolled CSS keyframes).
- 3D-specific work (R3F) → spike the domain if skill set lacks coverage; default to React Three Fiber community patterns.
- Pre-deploy → `vercel:deploy` + verify in browser before declaring done.

## Testing
- `npm run typecheck` is the current safety net. Add unit tests for production-calculation logic — math errors compound silently.

## Known warts
- npm-only — `package-lock.json` at root. Do NOT switch to pnpm/yarn (breaks workspaces).

## Next Steps
See `Projects/Solar3d/README.md` in the vault.
