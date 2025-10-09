import {Weather} from "./model/types";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import fetch from "node-fetch";
import {isValidWeatherResponse} from "./utils/validators";
import {LOCATIONS, API, COLLECTIONS} from "./config/constants";

export const updateWeatherUtil = async () => {
  try {
    logger.info("Starting weather update");

    const WEATHER_APPID = process.env.WEATHER_API_KEY;
    if (!WEATHER_APPID) {
      throw new Error("WEATHER_API_KEY environment variable not set");
    }

    const {lat, lon} = LOCATIONS.ROORKEE;
    const response = await fetch(
      `${API.WEATHER.BASE_URL}?lat=${lat}&lon=${lon}` +
          `&appid=${WEATHER_APPID}` +
          `&units=${API.WEATHER.UNITS}&exclude=${API.WEATHER.EXCLUDE}`
    );

    if (!response.ok) {
      throw new Error(
        `Weather API returned ${response.status}: ${response.statusText}`
      );
    }

    const body = await response.json();

    // Validate response structure
    if (!isValidWeatherResponse(body)) {
      throw new Error("Invalid weather data received from API");
    }

    const weatherData: Weather = body;

    const weatherCollection = admin.firestore().collection(COLLECTIONS.WEATHER);
    await weatherCollection.doc(LOCATIONS.ROORKEE.name).set(weatherData);

    logger.info("Weather updated successfully");
  } catch (error) {
    logger.error("Error updating weather", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
};
