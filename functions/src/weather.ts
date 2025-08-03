import {Weather} from "./model/types";
import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import fetch from "node-fetch";

export const updateWeatherUtil = async () => {
  const WEATHER_APPID = process.env.WEATHER_API_KEY;
  const response = await fetch(
    "http://api.openweathermap.org/data/3.0/onecall?lat=29.8667"+
        `&lon=77.8833&appid=${WEATHER_APPID}`+
        "&units=metric&exclude=minutely"
  );
  const body: Weather = <Weather> await response.json();
  const weatherCollection = admin.firestore().collection("weather");
  await weatherCollection.doc("roorkee-in").set(body);
};
