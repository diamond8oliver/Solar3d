import * as Cesium from 'cesium';

export interface ViewerHandle {
  viewer: Cesium.Viewer;
  osmBuildingsTileset: Cesium.Cesium3DTileset | null;
  ionTokenAvailable: boolean;
  destroy: () => void;
}

/**
 * Initialize a Cesium viewer inside `container`. If a Cesium ion token is
 * provided, we attach World Terrain + OSM Buildings (real 3D buildings).
 * Without a token we still render — just the default Bing imagery + flat globe.
 */
export async function initViewer(container: HTMLElement): Promise<ViewerHandle> {
  const ionToken = import.meta.env.VITE_CESIUM_ION_TOKEN as string | undefined;
  const ionTokenAvailable = Boolean(ionToken && ionToken.length > 20);
  if (ionTokenAvailable) Cesium.Ion.defaultAccessToken = ionToken!;

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
    terrain: ionTokenAvailable ? Cesium.Terrain.fromWorldTerrain() : undefined,
  });

  viewer.scene.globe.enableLighting = true;
  if (viewer.scene.skyAtmosphere) viewer.scene.skyAtmosphere.show = true;
  viewer.scene.fog.enabled = true;
  // Hide Cesium logo overlay (still attribution-compliant via credit container).
  (viewer.cesiumWidget.creditContainer as HTMLElement).style.display = 'none';

  let osmBuildingsTileset: Cesium.Cesium3DTileset | null = null;
  if (ionTokenAvailable) {
    try {
      osmBuildingsTileset = await Cesium.createOsmBuildingsAsync();
      viewer.scene.primitives.add(osmBuildingsTileset);
    } catch (err) {
      console.warn('OSM Buildings failed to load', err);
    }
  }

  return {
    viewer,
    osmBuildingsTileset,
    ionTokenAvailable,
    destroy: () => {
      if (!viewer.isDestroyed()) viewer.destroy();
    },
  };
}
