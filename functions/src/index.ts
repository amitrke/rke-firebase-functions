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
import {onSchedule} from "firebase-functions/v2/scheduler";

admin.initializeApp();

export const updateWeather = onSchedule("every 60 minutes", () => {
  return updateWeatherUtil();
});

export const updateNews = onSchedule("every 12 hours", () => {
  return updateNewsUtil();
});

export const updateNewsFromNewsDataIO = onSchedule("every 12 hours",
  () => {
    return updateNewsDataIOUtil();
  });

export const updateFilesList = listAndInsertFiles;

export const checkFilesBeingUsed = checkFilesBeingUsedFn;

export const onFileCreateV2 = onFileCreateFn;
export const onFileDeleteV2 = onFileDeleteFn;
export const deleteUnusedFiles = deleteUnusedFilesFn;
