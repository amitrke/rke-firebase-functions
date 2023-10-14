import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import {checkFilesBeingUsedFn, deleteUnusedFilesFn, listAndInsertFiles, onFileCreateFn, onFileDeleteFn} from "./files";
import {updateWeatherUtil} from "./weather";
import {updateNewsUtil} from "./news";

admin.initializeApp();

export const updateWeather = functions
  .region("us-east1")
  .pubsub.schedule("every 60 minutes").onRun(async () => {
    // functions.logger.info(
    //   "Function updateWhether triggered", {structuredData: true});
    await updateWeatherUtil();
  });

export const updateNews = functions
  .region("us-east1")
  .pubsub.schedule("every 4 hours").onRun(async () => {
    await updateNewsUtil();
  });

export const updateFilesList = listAndInsertFiles;

export const checkFilesBeingUsed = checkFilesBeingUsedFn;

export const onFileCreate = onFileCreateFn;
export const onFileDelete = onFileDeleteFn;
export const deleteUnusedFiles = deleteUnusedFilesFn;
