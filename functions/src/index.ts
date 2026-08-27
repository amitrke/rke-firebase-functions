import { initializeApp } from "firebase-admin/app";
import { fileMaintenanceOrchestrator, onFileCreateFn, onFileDeleteFn } from "./files";
import { updateWeatherUtil } from "./weather";
import { updateNewsUtil } from "./news";
import { updateNewsDataIOUtil } from "./newsdataio";
import { updateSerpApiNewsUtil } from "./serpapi";
import { updateHolidaysUtil } from "./holidays";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { SCHEDULES } from "./config/constants";
import * as logger from "firebase-functions/logger";

initializeApp();

export const updateWeather = onSchedule({ schedule: SCHEDULES.WEATHER_UPDATE, region: "us-east1" }, async () => {
  await updateWeatherUtil();
});

// Each source is independent - one failing shouldn't stop the others from running
export const updateNews = onSchedule({ schedule: SCHEDULES.NEWS_UPDATE, region: "us-east1" }, async () => {
  const results = await Promise.allSettled([updateNewsUtil(), updateNewsDataIOUtil(), updateSerpApiNewsUtil()]);
  const failures = results.filter((r): r is PromiseRejectedResult => r.status === "rejected");
  if (failures.length > 0) {
    logger.error(`${failures.length}/${results.length} news sources failed`, {
      errors: failures.map((f) => (f.reason instanceof Error ? f.reason.message : String(f.reason))),
    });
  }
});

export const updateHolidays = onSchedule({ schedule: SCHEDULES.HOLIDAYS_UPDATE, region: "us-east1" }, async () => {
  await updateHolidaysUtil();
});

// File management: fileMaintenanceOrchestrator runs sync -> usage check -> cleanup in order
export const fileMaintenance = fileMaintenanceOrchestrator;

// Cloud Storage triggers
export const onFileCreateV2 = onFileCreateFn;
export const onFileDeleteV2 = onFileDeleteFn;
