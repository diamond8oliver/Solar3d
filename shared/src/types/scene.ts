import type { AddressRecord } from './address';

export type OverlayName = 'roof' | 'panels' | 'measurements';

export type CameraPreset = 'top-down' | 'oblique-front-left' | 'oblique-back-right' | 'street';

export interface CameraState {
  longitude: number;
  latitude: number;
  height: number;
  heading: number;
  pitch: number;
}

export interface HomeSceneState {
  address: AddressRecord | null;
  overlaysEnabled: Record<OverlayName, boolean>;
  cameraPreset: CameraPreset;
  timeOfDayHours: number;
  loading: boolean;
  ionTokenAvailable: boolean;
}

export const DEFAULT_OVERLAYS: Record<OverlayName, boolean> = {
  roof: true,
  panels: false,
  measurements: false,
};

export const DEFAULT_SCENE_STATE: HomeSceneState = {
  address: null,
  overlaysEnabled: DEFAULT_OVERLAYS,
  cameraPreset: 'oblique-front-left',
  timeOfDayHours: 14,
  loading: false,
  ionTokenAvailable: false,
};
