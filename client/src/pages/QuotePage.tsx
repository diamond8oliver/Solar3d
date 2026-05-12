import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  AddressRecord, CameraPreset, HomeSceneState, OverlayName, Project,
} from '@solar3d/shared';
import { DEFAULT_SCENE_STATE } from '@solar3d/shared';
import AddressSearch from '../components/AddressSearch';
import HomeViewer from '../components/HomeViewer';
import HomeScenePanel from '../components/HomeScenePanel';
import ThreeLayoutShell from '../components/ThreeLayoutShell';
import type { HomeScene } from '../cesium/homeScene';
import { createProject } from '../api/projects';

const DEFAULT_MONTHLY_BILL_USD = 150;

export default function QuotePage() {
  const [state, setState] = useState<HomeSceneState>(DEFAULT_SCENE_STATE);
  const [project, setProject] = useState<Project | null>(null);
  const [projectError, setProjectError] = useState<string | null>(null);
  const sceneRef = useRef<HomeScene | null>(null);

  const handleConfirm = (address: AddressRecord) => {
    setProject(null);
    setProjectError(null);
    setState((s) => ({ ...s, address, loading: true }));
  };

  // Fire `/api/projects` whenever a new address is confirmed.
  useEffect(() => {
    if (!state.address) return;
    const controller = new AbortController();
    createProject(state.address, DEFAULT_MONTHLY_BILL_USD, controller.signal)
      .then((p) => {
        if (!controller.signal.aborted) setProject(p);
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        console.error('createProject failed', err);
        setProjectError(
          err instanceof Error ? err.message : 'Failed to fetch project layout',
        );
      });
    return () => controller.abort();
  }, [state.address?.placeId]); // eslint-disable-line react-hooks/exhaustive-deps

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
    setProject(null);
    setProjectError(null);
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
        panelLayout={project?.panelLayout ?? null}
        onReady={handleReady}
      />
      <HomeScenePanel
        address={state.address}
        overlays={state.overlaysEnabled}
        preset={state.cameraPreset}
        timeOfDayHours={state.timeOfDayHours}
        ionTokenAvailable={state.ionTokenAvailable}
        project={project}
        projectError={projectError}
        onToggleOverlay={handleToggleOverlay}
        onSetPreset={handleSetPreset}
        onSetTimeOfDay={handleSetTimeOfDay}
        onRefocus={handleRefocus}
        onChangeAddress={handleChangeAddress}
      />
    </ThreeLayoutShell>
  );
}
