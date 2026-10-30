import * as logger from "firebase-functions/logger";
import { API } from "./config/constants";
import { AirComponents, AirPollutionEntry, AirQuality, NaqiCategory, NaqiPollutant } from "./model/types";
import { isValidAirPollutionResponse } from "./utils/validators";

/**
 * India's National Air Quality Index (CPCB, 2014).
 *
 * Each row is the concentration at the edges of the six bands
 * (Good, Satisfactory, Moderate, Poor, Very Poor, Severe), which map to index
 * 0, 50, 100, 200, 300, 400, 500. CPCB leaves the top of "Severe" open; the
 * last value is the conventional cap used by CPCB's own calculator, beyond
 * which the index stays at 500.
 *
 * Units are µg/m³ except CO, which is mg/m³. PM, NO2, SO2 and NH3 are 24-hour
 * averages; O3 and CO are 8-hour averages.
 */
const BREAKPOINTS: Record<NaqiPollutant, number[]> = {
  pm10: [0, 50, 100, 250, 350, 430, 510],
  pm2_5: [0, 30, 60, 90, 120, 250, 380],
  no2: [0, 40, 80, 180, 280, 400, 520],
  o3: [0, 50, 100, 168, 208, 748, 1000],
  co: [0, 1, 2, 10, 17, 34, 46],
  so2: [0, 40, 80, 380, 800, 1600, 2100],
  nh3: [0, 200, 400, 800, 1200, 1800, 2400],
};
const INDEX_EDGES = [0, 50, 100, 200, 300, 400, 500];

const DAY_POLLUTANTS: NaqiPollutant[] = ["pm2_5", "pm10", "no2", "so2", "nh3"];
const EIGHT_HOUR_POLLUTANTS: NaqiPollutant[] = ["o3", "co"];

// CPCB needs 16 of 24 hourly readings for a valid 24-hour average.
const MIN_DAY_READINGS = 16;

/** Sub-index for one pollutant, by linear interpolation within its band. */
export const subIndex = (pollutant: NaqiPollutant, concentration: number): number => {
  const bp = BREAKPOINTS[pollutant];
  if (!(concentration > 0)) return 0;
  for (let i = 1; i < bp.length; i++) {
    if (concentration <= bp[i]) {
      const [cLo, cHi] = [bp[i - 1], bp[i]];
      const [iLo, iHi] = [INDEX_EDGES[i - 1], INDEX_EDGES[i]];
      return Math.round(iLo + ((concentration - cLo) * (iHi - iLo)) / (cHi - cLo));
    }
  }
  return 500;
};

export const categoryFor = (aqi: number): NaqiCategory => {
  if (aqi <= 50) return "Good";
  if (aqi <= 100) return "Satisfactory";
  if (aqi <= 200) return "Moderate";
  if (aqi <= 300) return "Poor";
  if (aqi <= 400) return "Very Poor";
  return "Severe";
};

/** OpenWeatherMap reports CO in µg/m³; the index uses mg/m³. */
const inIndexUnits = (pollutant: NaqiPollutant, value: number): number => (pollutant === "co" ? value / 1000 : value);

const mean = (entries: AirPollutionEntry[], pollutant: NaqiPollutant): number =>
  entries.reduce((sum, e) => sum + e.components[pollutant], 0) / entries.length;

/**
 * Computes the National AQI from hourly readings, oldest first.
 *
 * With a day of readings it follows CPCB's averaging periods. With fewer
 * (history unavailable) it falls back to the latest reading for every
 * pollutant, which tracks the official figure less closely.
 */
export const computeNaqi = (readings: AirPollutionEntry[]): AirQuality => {
  if (readings.length === 0) throw new Error("No air pollution readings to compute AQI from");
  const sorted = [...readings].sort((a, b) => a.dt - b.dt);
  const latest = sorted[sorted.length - 1];
  const hasDay = sorted.length >= MIN_DAY_READINGS;
  const lastEight = sorted.slice(-8);

  const subIndices: Partial<Record<NaqiPollutant, number>> = {};
  for (const pollutant of [...DAY_POLLUTANTS, ...EIGHT_HOUR_POLLUTANTS]) {
    const window = !hasDay ? [latest] : DAY_POLLUTANTS.includes(pollutant) ? sorted : lastEight;
    const value = mean(window, pollutant);
    if (Number.isFinite(value)) subIndices[pollutant] = subIndex(pollutant, inIndexUnits(pollutant, value));
  }

  let dominantPollutant: NaqiPollutant = "pm2_5";
  let aqi = -1;
  for (const [pollutant, index] of Object.entries(subIndices) as [NaqiPollutant, number][]) {
    if (index > aqi) {
      aqi = index;
      dominantPollutant = pollutant;
    }
  }

  return {
    dt: latest.dt,
    aqi,
    category: categoryFor(aqi),
    dominantPollutant,
    subIndices,
    basis: hasDay ? "24h" : "current",
    owmIndex: latest.main?.aqi ?? 0,
    components: latest.components as AirComponents,
  };
};

const fetchReadings = async (url: string): Promise<AirPollutionEntry[]> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Air pollution API returned ${response.status}: ${response.statusText}`);
  }
  const body = await response.json();
  if (!isValidAirPollutionResponse(body)) {
    throw new Error("Invalid air pollution data received from API");
  }
  return body.list;
};

/**
 * Fetches the last 24 hours plus the current reading and returns the AQI, or
 * null if the current reading can't be had. Never throws: air quality is an
 * extra on the weather document and must not fail the weather update.
 */
export const fetchAirQuality = async (
  lat: number,
  lon: number,
  appId: string,
  now: Date = new Date(),
): Promise<AirQuality | null> => {
  const query = `lat=${lat}&lon=${lon}&appid=${appId}`;
  const end = Math.floor(now.getTime() / 1000);
  const start = end - 24 * 60 * 60;

  const [current, history] = await Promise.allSettled([
    fetchReadings(`${API.AIR_POLLUTION.CURRENT_URL}?${query}`),
    fetchReadings(`${API.AIR_POLLUTION.HISTORY_URL}?${query}&start=${start}&end=${end}`),
  ]);

  if (current.status === "rejected") {
    logger.warn("Skipping air quality: current reading unavailable", {
      error: current.reason instanceof Error ? current.reason.message : String(current.reason),
    });
    return null;
  }
  if (history.status === "rejected") {
    logger.warn("Air quality history unavailable, using the current reading only", {
      error: history.reason instanceof Error ? history.reason.message : String(history.reason),
    });
  }

  // History and current can overlap on the latest hour; keep one per timestamp.
  const byTime = new Map<number, AirPollutionEntry>();
  for (const entry of history.status === "fulfilled" ? history.value : []) byTime.set(entry.dt, entry);
  for (const entry of current.value) byTime.set(entry.dt, entry);

  return computeNaqi([...byTime.values()]);
};
