import * as admin from "firebase-admin";
import {
  checkFilesBeingUsedFn,
  deleteUnusedFilesFn,
  listAndInsertFiles,
  fileMaintenanceOrchestrator,
  onFileCreateFn,
  onFileDeleteFn,
} from "./files";
import {updateWeatherUtil} from "./weather";
import {updateNewsUtil} from "./news";
import {updateNewsDataIOUtil} from "./newsdataio";
import {updateHolidaysUtil} from "./holidays";
import {onSchedule} from "firebase-functions/v2/scheduler";
import {SCHEDULES} from "./config/constants";

admin.initializeApp();

export const updateWeather = onSchedule({schedule: SCHEDULES.WEATHER_UPDATE, region: "us-east1"}, () => {
  return updateWeatherUtil();
});

export const updateNews = onSchedule({schedule: SCHEDULES.NEWS_UPDATE, region: "us-east1"}, () => {
  return updateNewsUtil();
});

export const updateNewsFromNewsDataIO = onSchedule({schedule: SCHEDULES.NEWS_UPDATE, region: "us-east1"},
  () => {
    return updateNewsDataIOUtil();
  });

export const updateHolidays = onSchedule({schedule: SCHEDULES.HOLIDAYS_UPDATE, region: "us-east1"}, () => {
  return updateHolidaysUtil();
});

// File management functions
// NOTE: Use fileMaintenanceOrchestrator for production to avoid race conditions
// The individual functions below are kept for backwards compatibility and testing
export const updateFilesList = listAndInsertFiles;
export const checkFilesBeingUsed = checkFilesBeingUsedFn;
export const deleteUnusedFiles = deleteUnusedFilesFn;

// Recommended: Use this orchestrator instead of the individual functions above
export const fileMaintenance = fileMaintenanceOrchestrator;

// Cloud Storage triggers
export const onFileCreateV2 = onFileCreateFn;
export const onFileDeleteV2 = onFileDeleteFn;
