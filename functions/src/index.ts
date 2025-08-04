import * as admin from "firebase-admin";
import {
  checkFilesBeingUsedFn,
  deleteUnusedFilesFn,
  listAndInsertFiles,
  onFileCreateFn,
  onFileDeleteFn,
} from "./files";
import {updateWeatherUtil} from "./weather";
import {updateNewsUtil} from "./news";
import {updateNewsDataIOUtil} from "./newsdataio";
import {updateHolidaysUtil} from "./holidays";
import {onSchedule} from "firebase-functions/v2/scheduler";

admin.initializeApp();

export const updateWeather = onSchedule({schedule: "every 60 minutes", region: "us-east1"}, () => {
  return updateWeatherUtil();
});

export const updateNews = onSchedule({schedule: "every 12 hours", region: "us-east1"}, () => {
  return updateNewsUtil();
});

export const updateNewsFromNewsDataIO = onSchedule({schedule: "every 12 hours", region: "us-east1"},
  () => {
    return updateNewsDataIOUtil();
  });

export const updateHolidays = onSchedule({schedule: "0 0 1 1 *", region: "us-east1"}, () => {
  return updateHolidaysUtil();
});

export const updateFilesList = listAndInsertFiles;

export const checkFilesBeingUsed = checkFilesBeingUsedFn;

export const onFileCreateV2 = onFileCreateFn;
export const onFileDeleteV2 = onFileDeleteFn;
export const deleteUnusedFiles = deleteUnusedFilesFn;
