import * as Cesium from 'cesium';
import type { AddressRecord, CameraPreset, OverlayName } from '@solar3d/shared';
import type { ViewerHandle } from './viewer';
import { OVERLAY_FACTORIES } from './overlays';
import { setTimeOfDay } from './sun';

/**
 * Higher-level scene controller. Holds Cesium handles and the per-address
 * highlight + overlay state. React components call methods here through a ref
 * so React state never has to round-trip through Cesium internals.
 */
export class HomeScene {
  private highlightEntity: Cesium.Entity | null = null;
  private overlayEntities: Record<OverlayName, Cesium.Entity[]> = {
    roof: [], panels: [], measurements: [],
  };
  private currentAddress: AddressRecord | null = null;

  constructor(private handle: ViewerHandle) {}

  /**
   * Identify the home uniquely by `placeId + lat/lng` (set on the AddressRecord
   * upstream). Two "123 Main St" entries in different cities resolve to
   * different lat/lngs, so the camera always lands on the right house.
   */
  async focusHome(addr: AddressRecord, preset: CameraPreset = 'oblique-front-left') {
    this.currentAddress = addr;
    this.highlightHomeBuilding(addr);
    await this.flyCameraToPreset(addr, preset);
  }

  flyCameraToPreset(addr: AddressRecord, preset: CameraPreset): Promise<void> {
    const { lat, lng } = addr.location;
    const presets: Record<CameraPreset, { offset: Cesium.HeadingPitchRange }> = {
      'top-down': {
        offset: new Cesium.HeadingPitchRange(0, Cesium.Math.toRadians(-89), 250),
      },
      'oblique-front-left': {
        offset: new Cesium.HeadingPitchRange(
          Cesium.Math.toRadians(45), Cesium.Math.toRadians(-30), 220,
        ),
      },
      'oblique-back-right': {
        offset: new Cesium.HeadingPitchRange(
          Cesium.Math.toRadians(225), Cesium.Math.toRadians(-30), 220,
        ),
      },
      street: {
        offset: new Cesium.HeadingPitchRange(
          Cesium.Math.toRadians(0), Cesium.Math.toRadians(-8), 60,
        ),
      },
    };

    return new Promise((resolve) => {
      this.handle.viewer.camera.flyToBoundingSphere(
        new Cesium.BoundingSphere(Cesium.Cartesian3.fromDegrees(lng, lat, 0), 25),
        {
          offset: presets[preset].offset,
          duration: 3.0,
          complete: () => resolve(),
        },
      );
    });
  }

  /**
   * Highlight: pick the OSM Buildings feature near (lat, lng) and tint it,
   * or fall back to a translucent ground polygon if no feature was hit.
   */
  highlightHomeBuilding(addr: AddressRecord) {
    if (this.highlightEntity) {
      this.handle.viewer.entities.remove(this.highlightEntity);
      this.highlightEntity = null;
    }

    const { lat, lng } = addr.location;
    const tileset = this.handle.osmBuildingsTileset;
    if (tileset) {
      tileset.style = new Cesium.Cesium3DTileStyle({
        color: {
          conditions: [
            // Within ~12m of the home → highlight color.
            [`distance(\${feature['cesium#estimatedHeight']}, 0) >= 0 && \
              abs($\{feature.longitude} - ${lng}) < 0.00012 && \
              abs($\{feature.latitude} - ${lat}) < 0.00010`,
              'color("#22d3ee", 0.85)'],
            ['true', 'color("white")'],
          ],
        },
      });
    }

    // Always also draw the fallback footprint glow — works without ion too.
    this.highlightEntity = this.handle.viewer.entities.add({
      name: 'home-highlight',
      position: Cesium.Cartesian3.fromDegrees(lng, lat, 0),
      ellipse: {
        semiMinorAxis: 12,
        semiMajorAxis: 14,
        material: Cesium.Color.fromCssColorString('#22d3ee').withAlpha(0.25),
        outline: true,
        outlineColor: Cesium.Color.fromCssColorString('#22d3ee'),
        heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
      },
    });
  }

  toggleOverlay(name: OverlayName, enabled: boolean) {
    if (!this.currentAddress) return;
    const existing = this.overlayEntities[name];
    if (enabled && existing.length === 0) {
      this.overlayEntities[name] =
        OVERLAY_FACTORIES[name](this.handle.viewer, this.currentAddress);
    } else if (!enabled && existing.length > 0) {
      for (const ent of existing) this.handle.viewer.entities.remove(ent);
      this.overlayEntities[name] = [];
    }
  }

  setTimeOfDay(hours: number) {
    if (!this.currentAddress) return;
    setTimeOfDay(this.handle.viewer, hours, this.currentAddress.location.lng);
  }

  /** Reset camera to the current home — the "focus home" button. */
  refocus(preset: CameraPreset = 'oblique-front-left'): Promise<void> {
    if (!this.currentAddress) return Promise.resolve();
    return this.flyCameraToPreset(this.currentAddress, preset);
  }
}
