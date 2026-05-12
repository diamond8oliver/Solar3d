import * as Cesium from 'cesium';
import type { AddressRecord, OverlayName, PanelLayout } from '@solar3d/shared';

/**
 * Stub overlays drawn at the home's lat/lng. Real solar panel placement gets
 * wired in later by replacing `panelsOverlay()` with data from /api/projects.
 *
 * Each overlay returns the list of Entities it adds so they can be removed
 * cleanly when toggled off.
 */
function metersToDegrees(meters: number, lat: number) {
  return {
    dLat: meters / 110540,
    dLng: meters / (111320 * Math.cos((lat * Math.PI) / 180)),
  };
}

function rectAround(lat: number, lng: number, halfWidthM: number, halfHeightM: number) {
  const { dLat, dLng } = metersToDegrees(1, lat);
  return Cesium.Rectangle.fromDegrees(
    lng - dLng * halfWidthM, lat - dLat * halfHeightM,
    lng + dLng * halfWidthM, lat + dLat * halfHeightM,
  );
}

export function roofOverlay(viewer: Cesium.Viewer, addr: AddressRecord): Cesium.Entity[] {
  const { lat, lng } = addr.location;
  const ent = viewer.entities.add({
    name: 'home-roof-outline',
    rectangle: {
      coordinates: rectAround(lat, lng, 8, 6),
      material: Cesium.Color.CYAN.withAlpha(0.18),
      outline: true,
      outlineColor: Cesium.Color.CYAN,
      outlineWidth: 2,
      heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
    },
  });
  return [ent];
}

/**
 * Stub panels overlay used when no real PanelLayout is available
 * (e.g. /api/projects errored, or before the request finishes).
 * Renders a 4x3 grid of rectangles around the home as a visual placeholder.
 */
export function panelsOverlay(viewer: Cesium.Viewer, addr: AddressRecord): Cesium.Entity[] {
  const { lat, lng } = addr.location;
  const { dLat, dLng } = metersToDegrees(1, lat);
  const out: Cesium.Entity[] = [];

  const cols = 4;
  const rows = 3;
  const panelW = 1.6;
  const panelH = 1.0;
  const gap = 0.2;
  const totalW = cols * (panelW + gap) - gap;
  const totalH = rows * (panelH + gap) - gap;
  const startX = -totalW / 2;
  const startY = -totalH / 2;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cx = startX + c * (panelW + gap) + panelW / 2;
      const cy = startY + r * (panelH + gap) + panelH / 2;
      out.push(viewer.entities.add({
        name: `panel-stub-${r}-${c}`,
        rectangle: {
          coordinates: Cesium.Rectangle.fromDegrees(
            lng + dLng * (cx - panelW / 2), lat + dLat * (cy - panelH / 2),
            lng + dLng * (cx + panelW / 2), lat + dLat * (cy + panelH / 2),
          ),
          material: Cesium.Color.fromCssColorString('#1e3a8a').withAlpha(0.5),
          outline: true,
          outlineColor: Cesium.Color.fromCssColorString('#60a5fa'),
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
        },
      }));
    }
  }
  return out;
}

/**
 * Real panels overlay backed by the server's PanelLayout. Each PanelPosition
 * is given in local meters relative to the building center. We anchor at
 * `addr.location` (the user's geocoded address) — for mock-API mode this is
 * fine; for real Google Solar the building.center may drift a few meters but
 * the panel cluster still lands on the home.
 *
 * Each panel becomes a 4-corner ground polygon. Pitch is intentionally
 * dropped — we clamp to terrain rather than raise to roof height, which
 * sidesteps having to align with OSM building roof faces.
 */
export function panelsOverlayFromLayout(
  viewer: Cesium.Viewer,
  addr: AddressRecord,
  layout: PanelLayout,
): Cesium.Entity[] {
  const { lat: baseLat, lng: baseLng } = addr.location;
  const cosLat = Math.cos((baseLat * Math.PI) / 180);
  const halfW = layout.panelWidthMeters / 2;
  const halfH = layout.panelHeightMeters / 2;

  const out: Cesium.Entity[] = [];
  for (const p of layout.panels) {
    const r = p.rotationZ;
    const cosR = Math.cos(r);
    const sinR = Math.sin(r);

    const corners: Array<[number, number]> = [
      [-halfW, -halfH],
      [ halfW, -halfH],
      [ halfW,  halfH],
      [-halfW,  halfH],
    ];

    const positions: number[] = [];
    for (const [lx, lz] of corners) {
      const xRot = lx * cosR - lz * sinR;
      const zRot = lx * sinR + lz * cosR;
      const worldX = p.centerX + xRot;
      const worldZ = p.centerZ + zRot;
      const lng = baseLng + worldX / (cosLat * 111320);
      const lat = baseLat + worldZ / 110540;
      positions.push(lng, lat);
    }

    out.push(viewer.entities.add({
      name: `panel-${p.id}`,
      polygon: {
        hierarchy: new Cesium.PolygonHierarchy(
          Cesium.Cartesian3.fromDegreesArray(positions),
        ),
        material: Cesium.Color.fromCssColorString('#1e3a8a').withAlpha(0.9),
        outline: true,
        outlineColor: Cesium.Color.fromCssColorString('#60a5fa'),
        heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
      },
    }));
  }
  return out;
}

export function measurementsOverlay(viewer: Cesium.Viewer, addr: AddressRecord): Cesium.Entity[] {
  const { lat, lng } = addr.location;
  const { dLat, dLng } = metersToDegrees(1, lat);
  const halfW = 8;
  const halfH = 6;
  const corners = [
    [lng - dLng * halfW, lat - dLat * halfH],
    [lng + dLng * halfW, lat - dLat * halfH],
    [lng + dLng * halfW, lat + dLat * halfH],
    [lng - dLng * halfW, lat + dLat * halfH],
  ];
  const ent = viewer.entities.add({
    name: 'home-measurement',
    polyline: {
      positions: Cesium.Cartesian3.fromDegreesArray([
        ...corners[0], ...corners[1],
        ...corners[2], ...corners[3], ...corners[0],
      ]),
      width: 2,
      material: Cesium.Color.YELLOW.withAlpha(0.9),
      clampToGround: true,
    },
  });
  return [ent];
}

export const OVERLAY_FACTORIES: Record<
  OverlayName,
  (viewer: Cesium.Viewer, addr: AddressRecord) => Cesium.Entity[]
> = {
  roof: roofOverlay,
  panels: panelsOverlay,
  measurements: measurementsOverlay,
};
