export interface LatLng {
  latitude: number;
  longitude: number;
}

export interface BoundingBox {
  sw: LatLng;
  ne: LatLng;
}

/** Raw roof segment data as returned by the Google Solar API. */
export interface RoofSegmentStats {
  pitchDegrees: number;
  azimuthDegrees: number;
  stats: {
    areaMeters2: number;
    groundAreaMeters2: number;
    sunshineQuantiles: number[];
  };
  center: LatLng;
  boundingBox: BoundingBox;
  planeHeightAtCenterMeters: number;
}

/** Normalized roof plane in local 3D coordinates (meters from building center). */
export interface RoofPlane {
  segmentIndex: number;
  pitchDegrees: number;
  azimuthDegrees: number;
  areaMeters2: number;
  centerX: number;
  centerY: number;
  centerZ: number;
  widthMeters: number;
  heightMeters: number;
}
