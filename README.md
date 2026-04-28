# Solar3d

3D Solar Preview tool for local solar installers. Generates interactive 3D roof visualizations with proposed solar panels and production analytics.

## Quick Start

```bash
npm install
cp .env.example .env
npm run dev
```

This starts the backend (port 3001) and frontend (port 5173) concurrently.

## Routes

- **`/`, `/quote`** — Homeowner-facing. Type a US address (Photon autocomplete). Cesium globe flies you to your home with terrain + 3D buildings; toggle roof / panels / measurement overlays, swap camera presets, and drag the time-of-day slider. See [`HOME_3D_VIEWER.md`](./HOME_3D_VIEWER.md) for the full design contract.
- **`/sales`** — Rep-facing. View and manage projects, adjust parameters, generate shareable links. (Still uses the legacy R3F roof viewer — Cesium pivot is scoped to the quote flow only.)

## Mock Mode

By default, `USE_MOCK_APIS=true` in `.env` uses fixture data instead of calling Google Solar API and NREL PVWatts. To use real APIs, set:

```
GOOGLE_SOLAR_API_KEY=your_real_key
NREL_API_KEY=your_real_key
USE_MOCK_APIS=false
```

## Project Structure

- `shared/` — TypeScript types shared between server and client
- `server/` — Express API with solar data clients, layout engine, and project storage
- `client/` — React + Vite frontend with Three.js 3D viewer and Tailwind CSS

## Tech Stack

- Node.js + Express + TypeScript (backend)
- React + Vite + TypeScript (frontend)
- **CesiumJS** with World Terrain + OSM Buildings (home preview 3D viewer)
- Three.js via @react-three/fiber (legacy roof viewer on `/sales`)
- **Photon** (free, OSM-backed) for US address autocomplete; swappable for Google Places
- shadcn/ui + Tailwind + Motion (UI + animation polish)
- Google Solar API + NREL PVWatts (data, mocked for MVP)

### Optional setup

- **Cesium ion token** — free at [cesium.com/ion](https://cesium.com/ion). Drop into `client/.env` as `VITE_CESIUM_ION_TOKEN=…`. Without it the globe still renders, just no terrain or 3D buildings.
- **Autocomplete provider** — `VITE_AUTOCOMPLETE_PROVIDER=photon` (default), or `mock` for fully offline dev.

## Next Steps (TODO)

> Handoff notes for any AI or contributor resuming work. Update before context runs out.

**Just shipped (2026-04-27):**
- Pivoted homeowner flow from synthetic R3F roof rectangles → Cesium globe + World Terrain + OSM Buildings.
- Photon address autocomplete (free, US-only post-filtered) behind a swappable `AutocompleteProvider` interface.
- New components: `AddressSearch`, `HomeViewer`, `HomeScenePanel`, `ThreeLayoutShell`. New modules: `client/src/cesium/`, `client/src/maps/`.
- Camera presets (top-down / front-left / back-right / street), overlay toggles (roof / panels / measurements), time-of-day sun slider.
- Feature doc: [`HOME_3D_VIEWER.md`](./HOME_3D_VIEWER.md).

**Immediate:**
- Drop a free [Cesium ion token](https://cesium.com/ion) into `client/.env` to light up terrain + 3D buildings (the viewer works without it but looks flat).
- Tighten OSM Buildings highlight: current style condition is loose — pick the building under the hit point with `viewer.scene.pick` instead of bbox math.
- Wire panel overlay to the existing `/api/projects` `PanelLayout` so the "panels" toggle shows the real layout-engine output instead of stub rectangles.
- Mobile: Cesium is desktop-only right now. Add a "best on desktop" notice for `<lg` viewports.

**Short-term:**
- Migrate `/sales` page off the legacy `components/three/` viewer onto a Cesium-rendered project list with thumbnails — then delete `components/three/`.
- Persist `AddressRecord` on the server (extend `ProjectRepository`) so `/quote/:id` can restore a saved scene.
- Real Google Solar API + PVWatts integration behind `USE_MOCK_APIS=false`.
- Auth + multi-tenancy (currently zero — every endpoint public).
- Tests: Vitest for `server/src/engine/layout.ts` (math-heavy, currently zero coverage).

**Blockers / open questions:**
- Google Places vs Photon long-term — Places has paid API but nicer suggestion ranking. Decide before scaling user input.
- Cesium ion free tier quota — fine for dev, need to check at production traffic.

**Environment setup required:**
- Node 20+, run `npm install` from repo root.
- `cp .env.example .env` (server) — fill in API keys or leave `USE_MOCK_APIS=true` for demo mode.
- `cp client/.env.example client/.env` and add a free `VITE_CESIUM_ION_TOKEN` for full terrain + buildings.

