import * as Cesium from 'cesium';

/**
 * Set Cesium's clock to a given local hour today. The globe's lighting is
 * driven by the clock, so this visibly moves the sun.
 *
 * `lon` is used as a rough timezone proxy (15° = 1hr) so noon at lat/lng
 * looks like noon, not UTC noon. Good enough for a slider, not a planetarium.
 */
export function setTimeOfDay(viewer: Cesium.Viewer, hours: number, lon: number): void {
  const now = new Date();
  const utcOffsetHours = -lon / 15;
  const utcHours = hours + utcOffsetHours;

  const date = new Date(Date.UTC(
    now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(),
    Math.floor(utcHours),
    Math.round((utcHours % 1) * 60),
    0,
  ));
  viewer.clock.currentTime = Cesium.JulianDate.fromDate(date);
}
