import { useEffect, useRef, useState } from 'react';
import type { AddressRecord, CameraPreset, OverlayName } from '@solar3d/shared';
import { initViewer, type ViewerHandle } from '../cesium/viewer';
import { HomeScene } from '../cesium/homeScene';

interface Props {
  address: AddressRecord;
  preset: CameraPreset;
  overlays: Record<OverlayName, boolean>;
  timeOfDayHours: number;
  onReady: (scene: HomeScene, ionTokenAvailable: boolean) => void;
}

export default function HomeViewer({
  address, preset, overlays, timeOfDayHours, onReady,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const handleRef = useRef<ViewerHandle | null>(null);
  const sceneRef = useRef<HomeScene | null>(null);
  const [bootError, setBootError] = useState<string | null>(null);

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

        await scene.focusHome(address, preset);
        scene.setTimeOfDay(timeOfDayHours);
        for (const name of Object.keys(overlays) as OverlayName[]) {
          scene.toggleOverlay(name, overlays[name]);
        }
        onReady(scene, handle.ionTokenAvailable);
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

  // Re-focus on address change (after first mount).
  useEffect(() => {
    if (sceneRef.current) sceneRef.current.focusHome(address, preset);
  }, [address.placeId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (bootError) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-card text-sm text-destructive p-6 text-center">
        3D viewer failed to load: {bootError}
      </div>
    );
  }

  return <div ref={containerRef} className="absolute inset-0" />;
}
