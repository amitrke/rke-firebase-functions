import {Weather} from "./model/types";
import * as admin from "firebase-admin";
import * as functions from "firebase-functions";

export const updateWeatherUtil = async () => {
  const WEATHER_APPID = functions.config().config.WEATHER_APPID;
  const response = await fetch(
    "http://api.openweathermap.org/data/2.5/onecall?lat=29.8667"+
        `&lon=77.8833&appid=${WEATHER_APPID}`+
        "&units=metric&exclude=minutely,hourly"
  );
  const body: Weather = await response.json();
  const db = admin.database();
  const ref = db.ref("weather").child("roorkee-in");
  await ref.set(body);
  console.log(body);
};
