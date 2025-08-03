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

export const updateWeather = onSchedule("every 60 minutes", async () => {
  await updateWeatherUtil();
});

export const updateNews = onSchedule("every 12 hours", async () => {
  await updateNewsUtil();
});

export const updateNewsFromNewsDataIO = onSchedule("every 12 hours",
  async () => {
    await updateNewsDataIOUtil();
  });

export const updateFilesList = listAndInsertFiles;

export const checkFilesBeingUsed = checkFilesBeingUsedFn;

export const onFileCreate = onFileCreateFn;
export const onFileDelete = onFileDeleteFn;
export const deleteUnusedFiles = deleteUnusedFilesFn;
