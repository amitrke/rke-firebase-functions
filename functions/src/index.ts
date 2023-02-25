import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import {listAndInsertFiles} from "./files";
import {updateWeatherUtil} from "./weather";

admin.initializeApp();

export const updateWeather = functions
  .region("us-east1")
  .pubsub.schedule("every 120 minutes").onRun(async () => {
    functions.logger.info(
      "Function updateWhether triggered", {structuredData: true});
    await updateWeatherUtil();
  });

export const updateFilesList = listAndInsertFiles;
