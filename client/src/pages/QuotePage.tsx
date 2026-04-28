import { useCallback, useRef, useState } from 'react';
import type {
  AddressRecord, CameraPreset, HomeSceneState, OverlayName,
} from '@solar3d/shared';
import { DEFAULT_SCENE_STATE } from '@solar3d/shared';
import AddressSearch from '../components/AddressSearch';
import HomeViewer from '../components/HomeViewer';
import HomeScenePanel from '../components/HomeScenePanel';
import ThreeLayoutShell from '../components/ThreeLayoutShell';
import type { HomeScene } from '../cesium/homeScene';

export default function QuotePage() {
  const [state, setState] = useState<HomeSceneState>(DEFAULT_SCENE_STATE);
  const sceneRef = useRef<HomeScene | null>(null);

  const handleConfirm = (address: AddressRecord) => {
    setState((s) => ({ ...s, address, loading: true }));
  };

  const handleReady = useCallback((scene: HomeScene, ionTokenAvailable: boolean) => {
    sceneRef.current = scene;
    setState((s) => ({ ...s, loading: false, ionTokenAvailable }));
  }, []);

  const handleToggleOverlay = (name: OverlayName, enabled: boolean) => {
    sceneRef.current?.toggleOverlay(name, enabled);
    setState((s) => ({
      ...s,
      overlaysEnabled: { ...s.overlaysEnabled, [name]: enabled },
    }));
  };

  const handleSetPreset = (preset: CameraPreset) => {
    if (!state.address) return;
    sceneRef.current?.flyCameraToPreset(state.address, preset);
    setState((s) => ({ ...s, cameraPreset: preset }));
  };

  const handleSetTimeOfDay = (hours: number) => {
    sceneRef.current?.setTimeOfDay(hours);
    setState((s) => ({ ...s, timeOfDayHours: hours }));
  };

  const handleRefocus = () => sceneRef.current?.refocus(state.cameraPreset);

  const handleChangeAddress = () => {
    sceneRef.current = null;
    setState(DEFAULT_SCENE_STATE);
  };

  if (!state.address) {
    return <AddressSearch onConfirm={handleConfirm} />;
  }

  return (
    <ThreeLayoutShell>
      <HomeViewer
        address={state.address}
        preset={state.cameraPreset}
        overlays={state.overlaysEnabled}
        timeOfDayHours={state.timeOfDayHours}
        onReady={handleReady}
      />
      <HomeScenePanel
        address={state.address}
        overlays={state.overlaysEnabled}
        preset={state.cameraPreset}
        timeOfDayHours={state.timeOfDayHours}
        ionTokenAvailable={state.ionTokenAvailable}
        onToggleOverlay={handleToggleOverlay}
        onSetPreset={handleSetPreset}
        onSetTimeOfDay={handleSetTimeOfDay}
        onRefocus={handleRefocus}
        onChangeAddress={handleChangeAddress}
      />
    </ThreeLayoutShell>
  );
}
