/**
 * Application-wide constants and configuration
 */

/**
 * Time constants in milliseconds
 */
export const TIME = {
  ONE_MINUTE_MS: 60 * 1000,
  ONE_HOUR_MS: 60 * 60 * 1000,
  ONE_DAY_MS: 24 * 60 * 60 * 1000,
  ONE_WEEK_MS: 7 * 24 * 60 * 60 * 1000,
} as const;

/**
 * Cloud Function schedule configurations
 */
export const SCHEDULES = {
  WEATHER_UPDATE: "every 60 minutes",
  NEWS_UPDATE: "every 12 hours",
  FILE_SYNC: "every 168 hours", // Weekly
  FILE_USAGE_CHECK: "every 170 hours",
  FILE_CLEANUP: "every 172 hours",
  FILE_MAINTENANCE: "every 168 hours", // Weekly - orchestrator
  HOLIDAYS_UPDATE: "0 0 1 1 *", // January 1st annually
} as const;

/**
 * Time-to-Live (TTL) configurations in days
 */
export const TTL = {
  NEWS_ARTICLES_DAYS: 7,
  HOLIDAYS_DAYS_AFTER: 30,
} as const;

/**
 * Image size mappings
 */
export const IMAGE_SIZES = {
  SMALL: {
    dimension: "200x200",
    code: "s",
  },
  MEDIUM: {
    dimension: "680x680",
    code: "m",
  },
  LARGE: {
    dimension: "1920x1080",
    code: "l",
  },
} as const;

/**
 * Valid image dimensions
 */
export const VALID_IMAGE_DIMENSIONS = [
  IMAGE_SIZES.SMALL.dimension,
  IMAGE_SIZES.MEDIUM.dimension,
  IMAGE_SIZES.LARGE.dimension,
] as const;

/**
 * Location configurations
 */
export const LOCATIONS = {
  ROORKEE: {
    name: "roorkee-in",
    lat: 29.8667,
    lon: 77.8833,
    displayName: "Roorkee, India",
  },
} as const;

/**
 * Search keywords for news filtering
 */
export const KEYWORDS = ["roorkee"];

/**
 * Firestore collection names
 */
export const COLLECTIONS = {
  WEATHER: "weather",
  NEWS: "news",
  EVENTS: "events",
  FILES: "files",
  POSTS: "posts",
  ALBUMS: "albums",
} as const;

/**
 * Cloud Storage prefixes
 */
export const STORAGE = {
  USERS_PREFIX: "users",
  IMAGES_FOLDER: "images",
} as const;

/**
 * Firestore batch operation limits
 */
export const FIRESTORE = {
  MAX_BATCH_SIZE: 500,
} as const;

/**
 * API endpoints and configurations
 */
export const API = {
  WEATHER: {
    BASE_URL: "http://api.openweathermap.org/data/3.0/onecall",
    EXCLUDE: "minutely",
    UNITS: "metric",
  },
  NEWS_API: {
    BASE_URL: "https://newsapi.org/v2/everything",
    QUERY: "Roorkee",
  },
  NEWS_DATA_IO: {
    BASE_URL: "https://newsdata.io/api/1/news",
    QUERY: "Roorkee",
    LANGUAGE: "en",
  },
  CALENDARIFIC: {
    BASE_URL: "https://calendarific.com/api/v2/holidays",
    COUNTRY: "IN",
  },
} as const;
