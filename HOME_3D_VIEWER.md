# HOME_3D_VIEWER

Interactive Google-Earth-style preview of a user's home, anchored on a US street address. Replaces the legacy synthetic Three.js roof viewer.

## Entry point

`client/src/pages/QuotePage.tsx` — route `/` and `/quote`.

1. Landing state: hero + `<AddressSearch />` (autocomplete, US-only).
2. On selection: address summary card + "View in 3D" button.
3. On confirm: scene swaps to `<HomeViewer />` (Cesium canvas) + `<HomeScenePanel />` (overlay controls).

## Data flow

```
[user types]
  → AddressSearch
  → useAddressAutocomplete hook
  → AutocompleteProvider.search(query)              [Photon | Mock | Google later]
  → returns AddressSuggestion[]
[user picks]
  → AutocompleteProvider.resolve(suggestion)
  → returns AddressRecord { fullAddress, placeId, location, addressComponents }
[user clicks "View in 3D"]
  → HomeSceneState.address = AddressRecord
  → HomeViewer mounts
  → cesium/viewer.ts initViewer(container, ionToken?)
  → cesium/homeScene.ts focusHome(address)
      ├ camera.flyTo(lat, lng, alt:300m, pitch:-30°, duration:3s)
      ├ highlightHomeBuilding(address)              [pick OSM building under coord OR fallback polygon]
      └ enabled overlays render
```

Server (`/api/projects`) is **not** in v1 flow. Solar layout / PVWatts becomes the data source for the "panels" overlay in a later iteration.

## Failure modes

| Failure | UX |
|---|---|
| Photon network error | Inline error under input, retry button. Address still typeable. |
| Suggestion has no geometry | Disable "View in 3D", show "address could not be located". |
| Cesium ion token missing | Viewer loads with default Bing imagery, no terrain or 3D buildings. Banner: "Add `VITE_CESIUM_ION_TOKEN` to `.env` for terrain + 3D buildings." |
| Cesium init throws | Error boundary, fallback "3D viewer failed to load" + retry. |
| OSM Buildings has no feature near coord | `highlightHomeBuilding` falls back to a translucent ground polygon at the lat/lng. |
| User on slow network | Skeleton loader on hero, spinner overlay on Cesium canvas during fly-to. |

## Acceptance criteria

1. Type "1600 Amphitheatre" → see ≥3 US suggestions in <1s (Photon live, mock in dev).
2. Pick a suggestion → address summary shows full formatted address + city/state/ZIP confirmation.
3. Click "View in 3D" → Cesium canvas mounts, camera flies smoothly from globe to the address (≤4s).
4. With ion token: terrain visible, 3D buildings visible, target building highlighted with glow/outline.
5. Without ion token: viewer still loads, banner shown, no crash.
6. Orbit (drag), zoom (scroll), tilt (right-drag) all work.
7. "Focus home" button re-centers camera on the address regardless of current position.
8. Camera presets (top-down, oblique-front-left, oblique-back-right) animate smoothly.
9. Overlay toggles (roof outline, panels mock, measurements) hide/show without remounting Cesium.
10. Time-of-day slider visibly shifts sun position via Cesium's lighting.
11. Refresh on `/quote/:id` (future) restores the same scene from the persisted address.
12. `npm run typecheck` clean. `npm run build` clean.

## Non-goals (v1)

- Persisting the address to the server. (In-memory React state only.)
- Auth / multi-tenancy.
- Real solar layout overlay backed by Google Solar API. (Mock rectangular panels only.)
- Mobile responsive 3D. (Desktop-first; mobile shows a "best on desktop" notice.)
- Indoor / interior view. Roof + exterior only.
- International addresses. Photon supports them but UI restricts to `country:US`.
- Replacing existing `/sales`, `/pricing` routes.

## Architecture

```
client/src/
  cesium/
    viewer.ts         # initViewer(container, opts) → Viewer instance
    homeScene.ts      # focusHome, highlightHomeBuilding, toggleOverlay, flyCameraToPreset
    overlays.ts       # roof / panels / measurement layer factories (Cesium Entities)
    sun.ts            # time-of-day → JulianDate lighting
  maps/
    autocomplete.ts   # AutocompleteProvider interface
    photon.ts         # PhotonProvider impl (free, OSM-based)
    mock.ts           # MockProvider for offline dev
    index.ts          # selects provider via env
  components/
    AddressSearch.tsx       # input + dropdown, uses useAddressAutocomplete
    HomeViewer.tsx          # mounts Cesium, owns viewer ref
    HomeScenePanel.tsx      # overlay toggles, presets, sun slider (Motion-animated)
    ThreeLayoutShell.tsx    # animated edge-panel layout wrapper
  hooks/
    useAddressAutocomplete.ts   # debounced search, suggestions state
    useHomeScene.ts             # bridges React state ↔ cesium/homeScene
shared/src/types/
  address.ts          # AddressRecord, AddressComponents, AddressSuggestion
  scene.ts            # HomeSceneState, OverlayName, CameraPreset
```

## Plug-in points for future work

- **Real Google Places**: drop a `GoogleProvider` next to `photon.ts` implementing the same `AutocompleteProvider` interface. Switch via `VITE_AUTOCOMPLETE_PROVIDER=google` + `VITE_GOOGLE_MAPS_API_KEY`.
- **Real solar layout**: `cesium/overlays.ts` `panelsOverlay()` currently draws stub rectangles. Swap its data source to `POST /api/projects` response (`PanelLayout.panels`) — convert local meters to Cesium Cartesian via the building anchor.
- **Persistence**: server already has `ProjectRepository` interface. Add an endpoint to save `AddressRecord`, then load it on `/quote/:id`.

## Env

```
# client/.env (gitignored)
VITE_CESIUM_ION_TOKEN=eyJ...        # optional, free at cesium.com/ion
VITE_AUTOCOMPLETE_PROVIDER=photon   # photon | mock | google (future)
VITE_GOOGLE_MAPS_API_KEY=           # only if provider=google
```
