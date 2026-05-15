import { useEffect, useRef, useState } from 'react';
import type {
  AddressRecord, CameraPreset, OverlayName, PanelLayout,
} from '@solar3d/shared';
import { initViewer, type ViewerHandle } from '../cesium/viewer';
import { HomeScene } from '../cesium/homeScene';

interface Props {
  address: AddressRecord;
  preset: CameraPreset;
  overlays: Record<OverlayName, boolean>;
  timeOfDayHours: number;
  panelLayout: PanelLayout | null;
  /**
   * Server-resolved rooftop centroid (from Google Solar `building.center`).
   * When available the camera targets this instead of the geocoded address
   * lat/lng, which can otherwise land on the street or a neighbor's parcel.
   */
  buildingCenter: { lat: number; lng: number } | null;
  onReady: (scene: HomeScene, ionTokenAvailable: boolean) => void;
}

export default function HomeViewer({
  address, preset, overlays, timeOfDayHours, panelLayout, buildingCenter, onReady,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const handleRef = useRef<ViewerHandle | null>(null);
  const sceneRef = useRef<HomeScene | null>(null);
  const [bootError, setBootError] = useState<string | null>(null);
  const [renderError, setRenderError] = useState<string | null>(null);

  // Boot Cesium once. The component is keyed on the page so a new address
  // does not remount — homeScene.focusHome() handles re-targeting in place.
  useEffect(() => {
    let cancelled = false;
    if (!containerRef.current) return;

    initViewer(containerRef.current)
      .then(async (handle) => {
        if (cancelled) {
          handle.destroy();
          return;
        }
        handleRef.current = handle;
        const scene = new HomeScene(handle);
        sceneRef.current = scene;

        // Surface ionTokenAvailable immediately so the panel banner reflects
        // real state even if a later step throws.
        onReady(scene, handle.ionTokenAvailable);
        handle.onRenderError((err) => {
          setRenderError(err.message || 'Render failed');
        });

        try {
          scene.setCameraTarget(buildingCenter);
          await scene.focusHome(address, preset);
          scene.setTimeOfDay(timeOfDayHours);
          scene.setLayout(panelLayout);
          for (const name of Object.keys(overlays) as OverlayName[]) {
            scene.toggleOverlay(name, overlays[name]);
          }
        } catch (err) {
          console.error('[cesium] post-init step failed', err);
          if (!cancelled) {
            setRenderError((err as Error).message ?? 'Scene setup failed');
          }
        }
      })
      .catch((err) => {
        console.error('Cesium init failed', err);
        if (!cancelled) setBootError((err as Error).message ?? 'Failed to load 3D viewer');
      });

    return () => {
      cancelled = true;
      handleRef.current?.destroy();
      handleRef.current = null;
      sceneRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-focus on address change (after first mount). buildingCenter usually
  // arrives slightly after the address (it's resolved server-side from Google
  // Solar), so we also re-target whenever it lands.
  useEffect(() => {
    if (!sceneRef.current) return;
    sceneRef.current.setCameraTarget(buildingCenter);
    sceneRef.current.focusHome(address, preset);
  }, [address.placeId, buildingCenter?.lat, buildingCenter?.lng]); // eslint-disable-line react-hooks/exhaustive-deps

  // Push the latest server-computed layout into the scene whenever it changes.
  useEffect(() => {
    sceneRef.current?.setLayout(panelLayout);
  }, [panelLayout]);

  if (bootError) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-card text-sm text-destructive p-6 text-center">
        3D viewer failed to load: {bootError}
      </div>
    );
  }

  return (
    <>
      <div ref={containerRef} className="absolute inset-0" />
      {renderError && (
        <div className="absolute top-4 left-4 max-w-[28rem] rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs font-mono text-destructive">
          Cesium render error: {renderError}
        </div>
      )}
    </>
  );
}
