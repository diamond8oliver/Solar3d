import * as Cesium from 'cesium';
import type {
  AddressRecord, CameraPreset, OverlayName, PanelLayout,
} from '@solar3d/shared';
import type { ViewerHandle } from './viewer';
import { OVERLAY_FACTORIES, panelsOverlayFromLayout } from './overlays';
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
  private currentLayout: PanelLayout | null = null;

  constructor(private handle: ViewerHandle) {}

  /**
   * Attach the server-computed PanelLayout. If "panels" overlay is currently
   * visible, redraw it with the real layout instead of the stub.
   */
  setLayout(layout: PanelLayout | null) {
    this.currentLayout = layout;
    if (this.overlayEntities.panels.length > 0) {
      this.redrawOverlay('panels');
    }
  }

  private redrawOverlay(name: OverlayName) {
    if (!this.currentAddress) return;
    for (const ent of this.overlayEntities[name]) {
      this.handle.viewer.entities.remove(ent);
    }
    this.overlayEntities[name] = this.buildOverlay(name);
  }

  private buildOverlay(name: OverlayName): Cesium.Entity[] {
    if (!this.currentAddress) return [];
    if (name === 'panels' && this.currentLayout) {
      return panelsOverlayFromLayout(
        this.handle.viewer,
        this.currentAddress,
        this.currentLayout,
        this.targetGroundHeight,
      );
    }
    return OVERLAY_FACTORIES[name](this.handle.viewer, this.currentAddress);
  }

  /**
   * Identify the home uniquely by `placeId + lat/lng` (set on the AddressRecord
   * upstream). Two "123 Main St" entries in different cities resolve to
   * different lat/lngs, so the camera always lands on the right house.
   */
  /**
   * Override for the camera focus point. Set from the server's
   * `Project.buildingCenter` (Google Solar's rooftop centroid) — more accurate
   * than the geocoded address lat/lng, which can land on the street or a
   * neighbor's parcel.
   */
  private cameraTarget: { lat: number; lng: number } | null = null;

  /** Cached terrain height at the current target, in meters above ellipsoid. */
  private targetGroundHeight = 0;

  setCameraTarget(target: { lat: number; lng: number } | null) {
    this.cameraTarget = target;
  }

  async focusHome(addr: AddressRecord, preset: CameraPreset = 'oblique-front-left') {
    this.currentAddress = addr;
    this.highlightHomeBuilding(addr);
    await this.refreshGroundHeight();
    await this.flyCameraToPreset(addr, preset);
  }

  /**
   * Sample terrain at the camera target so the bounding sphere sits on the
   * actual rooftop level instead of the WGS84 ellipsoid (which can be tens of
   * meters below ground — that's why low-angle presets used to fly through
   * the earth).
   */
  private async refreshGroundHeight() {
    const target = this.resolveTarget();
    if (!target) return;
    if (!this.handle.viewer.terrainProvider
        || this.handle.viewer.terrainProvider instanceof Cesium.EllipsoidTerrainProvider) {
      this.targetGroundHeight = 0;
      return;
    }
    try {
      const [sample] = await Cesium.sampleTerrainMostDetailed(
        this.handle.viewer.terrainProvider,
        [Cesium.Cartographic.fromDegrees(target.lng, target.lat)],
      );
      this.targetGroundHeight = sample.height ?? 0;
    } catch (err) {
      console.warn('[cesium] sampleTerrainMostDetailed failed', err);
      this.targetGroundHeight = 0;
    }
  }

  private resolveTarget(): { lat: number; lng: number } | null {
    if (this.cameraTarget) return this.cameraTarget;
    if (this.currentAddress) return this.currentAddress.location;
    return null;
  }

  flyCameraToPreset(_addr: AddressRecord, preset: CameraPreset): Promise<void> {
    const target = this.resolveTarget();
    if (!target) return Promise.resolve();
    const { lat, lng } = target;

    // Presets pitch steeply enough that camera altitude (range × |sin pitch|)
    // is always above terrain. Street view used to be -8°/60m which put the
    // camera 8m above the sphere centre — below the rooftop. -25°/80m clears
    // a typical residence and still feels like a sidewalk perspective.
    const presets: Record<CameraPreset, { offset: Cesium.HeadingPitchRange }> = {
      'top-down': {
        offset: new Cesium.HeadingPitchRange(0, Cesium.Math.toRadians(-89), 180),
      },
      'oblique-front-left': {
        offset: new Cesium.HeadingPitchRange(
          Cesium.Math.toRadians(45), Cesium.Math.toRadians(-30), 160,
        ),
      },
      'oblique-back-right': {
        offset: new Cesium.HeadingPitchRange(
          Cesium.Math.toRadians(225), Cesium.Math.toRadians(-30), 160,
        ),
      },
      street: {
        offset: new Cesium.HeadingPitchRange(
          Cesium.Math.toRadians(0), Cesium.Math.toRadians(-25), 80,
        ),
      },
    };

    return new Promise((resolve) => {
      this.handle.viewer.camera.flyToBoundingSphere(
        new Cesium.BoundingSphere(
          Cesium.Cartesian3.fromDegrees(lng, lat, this.targetGroundHeight),
          20,
        ),
        {
          offset: presets[preset].offset,
          duration: 2.5,
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
    // Tinting the OSM Buildings feature for the home is disabled — OSM Buildings
    // features do not expose `feature.longitude`/`latitude` properties, so any
    // proximity expression hits "Operator '-' requires vector or number" at
    // evaluateMinus. The ground ellipse below marks the home regardless.
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
      this.overlayEntities[name] = this.buildOverlay(name);
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
