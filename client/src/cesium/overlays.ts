import * as Cesium from 'cesium';
import type { AddressRecord, OverlayName } from '@solar3d/shared';

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
        name: `panel-${r}-${c}`,
        rectangle: {
          coordinates: Cesium.Rectangle.fromDegrees(
            lng + dLng * (cx - panelW / 2), lat + dLat * (cy - panelH / 2),
            lng + dLng * (cx + panelW / 2), lat + dLat * (cy + panelH / 2),
          ),
          material: Cesium.Color.fromCssColorString('#1e3a8a').withAlpha(0.85),
          outline: true,
          outlineColor: Cesium.Color.fromCssColorString('#60a5fa'),
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
        },
      }));
    }
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
