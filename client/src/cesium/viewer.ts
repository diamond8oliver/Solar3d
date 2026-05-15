import * as Cesium from 'cesium';

export interface ViewerHandle {
  viewer: Cesium.Viewer;
  /** Google Photorealistic 3D Tiles tileset (real photogrammetry of the home). */
  photorealisticTileset: Cesium.Cesium3DTileset | null;
  /** Fallback OSM Buildings — only loaded if Google 3D Tiles fail. */
  osmBuildingsTileset: Cesium.Cesium3DTileset | null;
  ionTokenAvailable: boolean;
  destroy: () => void;
  onRenderError: (cb: (err: Error) => void) => () => void;
}

/**
 * Initialize a Cesium viewer inside `container`. With a Cesium ion token, we
 * attach Google Photorealistic 3D Tiles (real photogrammetry meshes of the
 * neighborhood — this is what lets the user actually see their house).
 * Without a token we fall back to ESRI satellite imagery + flat globe.
 */
export async function initViewer(container: HTMLElement): Promise<ViewerHandle> {
  const ionToken = import.meta.env.VITE_CESIUM_ION_TOKEN as string | undefined;
  const ionTokenAvailable = Boolean(ionToken && ionToken.length > 20);
  if (ionTokenAvailable) Cesium.Ion.defaultAccessToken = ionToken!;

  // ESRI World Imagery as the ground texture under Google 3D Tiles (and the
  // sole imagery when no ion token is configured).
  const esriImagery = new Cesium.UrlTemplateImageryProvider({
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    maximumLevel: 19,
    credit: 'Tiles © Esri — Source: Esri, Maxar, Earthstar Geographics, CNES/Airbus DS, USDA, USGS, AeroGRID, IGN, and the GIS User Community',
  });
  esriImagery.errorEvent.addEventListener((err) => {
    console.error('[cesium] ESRI tile error', err);
  });

  const viewer = new Cesium.Viewer(container, {
    animation: false,
    timeline: false,
    geocoder: false,
    homeButton: false,
    sceneModePicker: false,
    baseLayerPicker: false,
    navigationHelpButton: false,
    fullscreenButton: false,
    selectionIndicator: false,
    infoBox: false,
    baseLayer: new Cesium.ImageryLayer(esriImagery, {}),
    terrain: ionTokenAvailable ? Cesium.Terrain.fromWorldTerrain() : undefined,
    showRenderLoopErrors: false,
  });

  viewer.scene.globe.enableLighting = true;
  if (viewer.scene.skyAtmosphere) viewer.scene.skyAtmosphere.show = true;
  viewer.scene.fog.enabled = true;
  (viewer.cesiumWidget.creditContainer as HTMLElement).style.display = 'none';

  // Keep the camera above ground and bounded so users can't fly through the
  // earth or out to space. enableCollisionDetection makes the screen-space
  // camera controller stop at terrain on tilt/pan.
  const camCtl = viewer.scene.screenSpaceCameraController;
  camCtl.enableCollisionDetection = true;
  camCtl.minimumZoomDistance = 5;     // ~5m from target
  camCtl.maximumZoomDistance = 3000;  // 3km cap

  // Attach Google Photorealistic 3D Tiles (Cesium ion asset 2275207). This is
  // the real-world photogrammetry mesh — the user's actual house with textures.
  // Falls back to OSM Buildings (white meshes) if the asset fails to load.
  let photorealisticTileset: Cesium.Cesium3DTileset | null = null;
  let osmBuildingsTileset: Cesium.Cesium3DTileset | null = null;
  if (ionTokenAvailable) {
    try {
      photorealisticTileset = await Cesium.createGooglePhotorealistic3DTileset();
      viewer.scene.primitives.add(photorealisticTileset);
    } catch (err) {
      console.warn('[cesium] Google Photorealistic 3D Tiles failed; falling back to OSM Buildings', err);
      try {
        osmBuildingsTileset = await Cesium.createOsmBuildingsAsync();
        viewer.scene.primitives.add(osmBuildingsTileset);
      } catch (err2) {
        console.warn('[cesium] OSM Buildings also failed to load', err2);
      }
    }
  }

  const renderErrorListeners: ((err: Error) => void)[] = [];
  viewer.scene.renderError.addEventListener((_scene, error) => {
    const e = error instanceof Error ? error : new Error(String(error));
    console.error('[cesium] renderError', e);
    for (const cb of renderErrorListeners) cb(e);
  });

  return {
    viewer,
    photorealisticTileset,
    osmBuildingsTileset,
    ionTokenAvailable,
    destroy: () => {
      if (!viewer.isDestroyed()) viewer.destroy();
    },
    onRenderError: (cb) => {
      renderErrorListeners.push(cb);
      return () => {
        const i = renderErrorListeners.indexOf(cb);
        if (i >= 0) renderErrorListeners.splice(i, 1);
      };
    },
  };
}
