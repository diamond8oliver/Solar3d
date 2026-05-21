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

**Just shipped (2026-05-20):**
- **Homes-not-loading rendering fix.** React StrictMode double-mounted `HomeViewer`, so the second concurrent call to `Cesium.createGooglePhotorealistic3DTileset()` errored with "Resource is already being fetched" and the catch silently fell back to the white-block OSM Buildings tileset. Added a module-level promise lock in `client/src/cesium/viewer.ts` so both StrictMode mounts now load real Google photoreal tiles. Verified end-to-end via headless Chromium probe.
- **Panel altitude double-count fixed.** `overlays.ts` was computing `groundHeight + p.centerY + 0.3` for panel polygons, but `p.centerY` (Google Solar `planeHeightAtCenterMeters`) is already absolute meters above the WGS84 ellipsoid. Panels were floating ~30m above the roof. Now uses `p.centerY + 0.3` directly.
- **Panel count calibration.** `DEFAULT_UTILITY_RATE` reverted from $0.40 (PG&E NEM 3.0) to $0.15 (US national avg). The CA-only rate was undersizing systems by ~2.5x everywhere else. State-aware rate is a future enrichment step.
- **Autocomplete densified.** Photon `layer=house` filter dropped — many US street addresses aren't OSM-tagged as houses. Server limit raised 8→40 with post-filter cap at 10 US results.
- **Optional direct-Google path.** `viewer.ts` reads `VITE_GOOGLE_MAPS_API_KEY` and uses `Cesium.GoogleMaps.defaultApiKey` for direct Map Tiles API streaming as an alternative to the Cesium ion proxy.

**Previously shipped (2026-05-14):**
- **Camera + sizing batch.** `HomeScene.setCameraTarget` + `refreshGroundHeight` (sampleTerrainMostDetailed) so low-angle presets sit on the rooftop. Threaded `Project.buildingCenter` (Google Solar `building.center`) end-to-end so the camera lands on the actual roof, not the geocoded street point. `pickPanelCountForBill` sizes the array to ~85% of annual consumption (was using `maxArrayPanelsCount` → 77 panels for a $150 bill). Calibrated `DEFAULT_UTILITY_RATE` to PG&E NEM 3.0 ($0.40/kWh).
- **Switched viewer to Google Photorealistic 3D Tiles** (real photogrammetry of the home) with ESRI imagery + OSM Buildings as fallback when ion token absent. Resolved cesium Build dir from workspace root so `/cesium/*` assets stop falling through to the SPA HTML.
- **Backend infra batch.** zod env validation in `server/src/config.ts`. New `server/src/utils/fetch.ts` (`fetchWithRetry` — per-attempt timeout, exponential backoff + jitter, retries on 429 + 5xx, labeled `FetchError`). Refactored google-solar + pvwatts clients to use it.
- **Apify async enrichment layer.** `ApifyActorRunner` interface + `HttpApifyActorRunner` (run-sync-get-dataset-items via fetchWithRetry) + `NoopApifyActorRunner`. `EnrichmentEngine` with per-dimension `safeRun` so one bad actor cannot kill siblings. Adapter functions normalize vendor payloads into internal `IncentiveProgram` / `LocalInstaller` / `MarketSignal` types. Fire-and-forget from `ProjectService.createProject` after `repo.save` — quote-critical path is untouched. New route `GET /api/projects/:id/enrichment` for frontend polling.

**Immediate (next session):**
- **Finish the `/sales/:id` flythrough page** (the dashboard's destination after picking a project). Currently still uses the legacy R3F `SolarViewer` + `components/three/CameraFlythrough`. Rebuild on Cesium: Cesium-rendered project list with thumbnails on `/sales`, then a Cesium-driven flythrough on `/sales/:id` that reuses `HomeScene` + scripted camera path (orbit + low-angle pass over the panel array). Then delete `components/three/`.
- Drop a free [Cesium ion token](https://cesium.com/ion) into `client/.env` as `VITE_CESIUM_ION_TOKEN=…` to light up Google Photorealistic 3D Tiles. Without it the globe falls back to ESRI imagery + OSM Buildings.
- Set `APIFY_TOKEN` in `.env` and swap the placeholder actor IDs in `server/src/services/enrichmentEngine.ts` (`'placeholder/incentives'` etc.) for real Apify actor IDs.
- Replace `InMemoryEnrichmentRepository` with a durable adapter (SQLite for single-instance, Postgres for multi-instance). Same `EnrichmentRepository` interface — mechanical swap.
- Frontend: poll `GET /api/projects/:id/enrichment` and render incentives / installers / market signals once the status flips to `succeeded`. Surface `disabled` and `failed` states explicitly.
- Tighten OSM Buildings highlight: current style condition is loose — pick the building under the hit point with `viewer.scene.pick` instead of bbox math.
- Mobile: Cesium is desktop-only right now. Add a "best on desktop" notice for `<lg` viewports.

**Short-term:**
- Caching layer for Google Solar + PVWatts keyed on normalized address + assumptions hash (per `integration-architecture.md`). Repeated identical addresses currently re-hit the providers.
- Migrate `/sales` page off the legacy `components/three/` viewer onto a Cesium-rendered project list with thumbnails — then delete `components/three/`.
- Persist `AddressRecord` on the server (extend `ProjectRepository`) so `/quote/:id` can restore a saved scene.
- Auth + multi-tenancy (currently zero — every endpoint public).
- Tests: Vitest for `server/src/engine/layout.ts` (math-heavy, zero coverage). Add adapter tests for `enrichmentEngine.ts` so future actor swaps don't silently regress normalization.

**Blockers / open questions:**
- Google Places vs Photon long-term — Places has paid API but nicer suggestion ranking. Decide before scaling user input.
- Cesium ion free tier quota — fine for dev, need to check at production traffic.
- Real Apify actor selection — `placeholder/*` IDs need to be replaced with vetted actors per dimension before enrichment produces real data.

**Environment setup required:**
- Node 20+, run `npm install` from repo root.
- `cp .env.example .env` (server) — fill in API keys or leave `USE_MOCK_APIS=true` for demo mode.
- `cp client/.env.example client/.env` and add a free `VITE_CESIUM_ION_TOKEN` for full terrain + buildings.

