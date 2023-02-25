import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import {listAndInsertFiles} from "./files";
admin.initializeApp();

export const helloWorld = functions
  .region("us-east1")
  .https.onRequest((request, response) => {
    functions.logger.info("Hello logs!", {structuredData: true});
    response.send("Hello from Firebase!");
  }
  );

export const updateFilesList = listAndInsertFiles;
