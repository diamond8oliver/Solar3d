import * as Cesium from 'cesium';

/**
 * StrictMode mounts components twice in dev, which would race two concurrent
 * `createGooglePhotorealistic3DTileset()` calls. The second errors with
 * "Resource is already being fetched" and we'd fall back to the white-block
 * OSM Buildings tileset. We dedupe via a module-level promise: every concurrent
 * caller gets a freshly-created tileset using the already-completed metadata
 * fetch (Cesium's internal cache makes the retry effectively free).
 */
let photorealLock: Promise<unknown> | null = null;
async function createPhotorealTilesetDeduped(): Promise<Cesium.Cesium3DTileset> {
  if (photorealLock) {
    try { await photorealLock; } catch { /* swallow — we'll retry */ }
  }
  const p = Cesium.createGooglePhotorealistic3DTileset();
  photorealLock = p;
  try {
    return await p;
  } finally {
    if (photorealLock === p) photorealLock = null;
  }
}

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
  // Two viable paths to Google Photorealistic 3D Tiles:
  //   1. Direct via Map Tiles API — set VITE_GOOGLE_MAPS_API_KEY and Cesium
  //      streams tiles straight from Google. Requires a domain-restricted key
  //      with "Map Tiles API" enabled in Google Cloud Console.
  //   2. Cesium ion proxy — default when no Google key. Requires the asset
  //      "Google Photorealistic 3D Tiles" to be added to your ion account
  //      (free at https://cesium.com/ion/assetdepot/2275207).
  // We try direct first (more reliable, no ion asset-quota gate), then ion,
  // then OSM Buildings, then nothing. Each failure logs its full reason so
  // it's obvious which provider needs configuring.
  const googleKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;
  let photorealisticTileset: Cesium.Cesium3DTileset | null = null;
  let osmBuildingsTileset: Cesium.Cesium3DTileset | null = null;
  const tryAddPhotoreal = async () => {
    if (googleKey && googleKey.length > 0) {
      Cesium.GoogleMaps.defaultApiKey = googleKey;
      console.info('[cesium] using direct Google Map Tiles key');
    } else {
      console.info('[cesium] no VITE_GOOGLE_MAPS_API_KEY — falling back to Cesium ion proxy for 3D tiles');
    }
    photorealisticTileset = await createPhotorealTilesetDeduped();
    viewer.scene.primitives.add(photorealisticTileset);
    console.info('[cesium] Google Photorealistic 3D Tiles loaded');
  };
  try {
    await tryAddPhotoreal();
  } catch (err) {
    const msg = (err as Error)?.message ?? String(err);
    console.warn('[cesium] Google Photorealistic 3D Tiles failed:', msg, err);
    if (ionTokenAvailable) {
      try {
        osmBuildingsTileset = await Cesium.createOsmBuildingsAsync();
        viewer.scene.primitives.add(osmBuildingsTileset);
        console.info('[cesium] OSM Buildings fallback loaded (white block geometry)');
      } catch (err2) {
        console.warn('[cesium] OSM Buildings also failed:', (err2 as Error)?.message ?? String(err2));
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
