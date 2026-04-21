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

- **`/quote`** — Homeowner-facing. Enter an address to get an instant solar preview with 3D visualization and energy estimates.
- **`/sales`** — Rep-facing. View and manage projects, adjust parameters, generate shareable links.

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
- Three.js via @react-three/fiber (3D rendering)
- Tailwind CSS (styling)
- Google Solar API + NREL PVWatts (data, mocked for MVP)

## Next Steps (TODO)

> Handoff notes for any AI or contributor resuming work. Update before context runs out.

**Immediate:**
- Wire live Google Solar API calls behind the `USE_MOCK_APIS=false` flag and validate response shape against the shared types
- Validate NREL PVWatts energy estimates against independent calculation
- Add basic e2e: address → 3D render → downloadable PDF quote

**Short-term:**
- Roof detection accuracy: handle edge cases (multiple buildings, obstructions, skylights)
- Layout engine: optimize panel placement for max production subject to setback rules
- Rep `/sales` dashboard: save/load quotes, CRM-style project list, branded shareable URLs
- Payment / financing calculator integration for proposal output

**Blockers / open questions:**
- Google Solar API quota + pricing tier — need to confirm sustainable cost per quote
- State-by-state setback rules — where to source the rule set?
- Which CRMs do installers actually use (Salesforce? Aurora? Native-only)?

**Environment setup required:**
- Node 20+
- `cp .env.example .env` — fill in `GOOGLE_SOLAR_API_KEY` and `NREL_API_KEY` from your own accounts, or leave `USE_MOCK_APIS=true` for demo mode

