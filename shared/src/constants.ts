/** Standard residential panel dimensions (meters). */
export const DEFAULT_PANEL_WIDTH = 1.045;
export const DEFAULT_PANEL_HEIGHT = 1.879;

/** Panel wattage (DC). */
export const DEFAULT_PANEL_WATTAGE = 400;

/** Gap between adjacent panels (meters). */
export const PANEL_GAP = 0.02;

/** Minimum setback from roof edges (meters). */
export const ROOF_SETBACK = 0.3;

/**
 * Default utility rate ($/kWh).
 *
 * Calibrated to PG&E NEM 3.0 blended rates (Bay Area, 2026). The previous
 * 0.15 value matched the US average but was off by ~2.5x for California
 * customers, which made the bill→kWh inversion produce systems 2-3x too
 * large for the user's actual consumption.
 */
export const DEFAULT_UTILITY_RATE = 0.40;

/** Target percentage of annual consumption to offset (NEM 3.0 sweet spot). */
export const DEFAULT_OFFSET_TARGET = 0.85;

/** Annual energy yield per kW installed in the Bay Area (kWh/kW/yr). */
export const BAY_AREA_PRODUCTION_RATIO = 1500;

/** Panel surface offset above roof plane (meters) to avoid z-fighting. */
export const PANEL_ROOF_OFFSET = 0.05;

/** Default system loss percentage for PVWatts. */
export const DEFAULT_SYSTEM_LOSSES = 14.08;
