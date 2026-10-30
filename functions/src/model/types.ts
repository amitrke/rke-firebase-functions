import type { Timestamp } from "firebase-admin/firestore";

export interface NewsArticle {
  source: {
    id: string | null;
    name: string;
  };
  source_id?: string | null;
  author: string | null;
  title: string;
  description: string | null;
  url: string;
  image_url: string | null;
  publishedAt: string;
  content: string | null;
  apiSource: "newsapi" | "newsdata.io" | "serpapi";
  expireAt?: Timestamp;
}

export interface NewsApiResponse {
  status: "ok";
  articles: Record<string, unknown>[];
}

export interface NewsDataIoResponse {
  status: "success";
  results: Record<string, unknown>[];
}

export interface SerpApiResponse {
  news_results: Record<string, unknown>[];
}

export interface HolidayData {
  name: string;
  description: string;
  date: {
    iso: string;
  };
  type: string[];
  locations: string;
  states: string;
  canonical_url: string;
}

export interface HolidaysResponse {
  response: {
    holidays: HolidayData[];
  };
}

export interface Weather {
  lat: number;
  lon: number;
  timezone: string;
  timezone_offset: number;
  current: Current;
  minutely?: MinutelyEntity[] | null;
  hourly?: HourlyEntity[] | null;
  daily?: DailyEntity[] | null;
  alerts?: AlertsEntity[] | null;
}

/** Pollutant concentrations as OpenWeatherMap reports them, all in µg/m³. */
export interface AirComponents {
  co: number;
  no: number;
  no2: number;
  o3: number;
  so2: number;
  pm2_5: number;
  pm10: number;
  nh3: number;
}

export interface AirPollutionEntry {
  dt: number;
  main: { aqi: number };
  components: AirComponents;
}

export interface AirPollutionResponse {
  coord: { lon: number; lat: number };
  list: AirPollutionEntry[];
}

export type NaqiPollutant = "pm2_5" | "pm10" | "no2" | "o3" | "co" | "so2" | "nh3";

export type NaqiCategory = "Good" | "Satisfactory" | "Moderate" | "Poor" | "Very Poor" | "Severe";

/** Stored as `airQuality` on the weather document. */
export interface AirQuality {
  /** Unix seconds of the latest reading. */
  dt: number;
  /** India's National AQI (CPCB), 0–500. */
  aqi: number;
  category: NaqiCategory;
  /** The pollutant whose sub-index set the AQI. */
  dominantPollutant: NaqiPollutant;
  subIndices: Partial<Record<NaqiPollutant, number>>;
  /** "24h" when built from the last day's readings, "current" when history was unavailable. */
  basis: "24h" | "current";
  /** OpenWeatherMap's own 1–5 index, kept for reference. */
  owmIndex: number;
  /** Latest concentrations, µg/m³. */
  components: AirComponents;
}

export interface WeatherDocument extends Weather {
  airQuality?: AirQuality;
}
export interface Current {
  dt: number;
  sunrise: number;
  sunset: number;
  temp: number;
  feels_like: number;
  pressure: number;
  humidity: number;
  dew_point: number;
  uvi: number;
  clouds: number;
  visibility: number;
  wind_speed: number;
  wind_deg: number;
  weather?: WeatherEntity[] | null;
}
export interface WeatherEntity {
  id: number;
  main: string;
  description: string;
  icon: string;
}
export interface MinutelyEntity {
  dt: number;
  precipitation: number;
}
export interface HourlyEntity {
  dt: number;
  temp: number;
  feels_like: number;
  pressure: number;
  humidity: number;
  dew_point: number;
  uvi: number;
  clouds: number;
  visibility: number;
  wind_speed: number;
  wind_deg: number;
  weather?: WeatherEntity[] | null;
  pop: number;
}
export interface DailyEntity {
  dt: number;
  sunrise: number;
  sunset: number;
  temp: Temp;
  feels_like: FeelsLike;
  pressure: number;
  humidity: number;
  dew_point: number;
  wind_speed: number;
  wind_deg: number;
  weather?: WeatherEntity[] | null;
  clouds: number;
  pop: number;
  uvi: number;
}
export interface Temp {
  day: number;
  min: number;
  max: number;
  night: number;
  eve: number;
  morn: number;
}
export interface FeelsLike {
  day: number;
  night: number;
  eve: number;
  morn: number;
}
export interface AlertsEntity {
  sender_name: string;
  event: string;
  start: number;
  end: number;
  description: string;
}
