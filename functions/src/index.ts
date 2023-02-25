import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import {listAndInsertFiles} from "./files";
import {updateWeatherUtil} from "./weather";
admin.initializeApp();

export const helloWorld = functions
  .region("us-east1")
  .https.onRequest((request, response) => {
    functions.logger.info("Hello logs!", {structuredData: true});
    response.send("Hello from Firebase!");
  }
  );

export const updateWeather = functions
  .pubsub.schedule("every 120 minutes").onRun(async () => {
    functions.logger.info(
      "Function updateWhether triggered", {structuredData: true});
    await updateWeatherUtil();
  });

export const updateFilesList = listAndInsertFiles;
