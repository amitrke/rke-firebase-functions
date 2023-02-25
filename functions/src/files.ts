import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

export const listAndInsertFiles = functions
  .region("us-east1")
  .pubsub
  .schedule("every 1 weeks")
  .onRun(async (context) => {
    // Get the storage bucket reference
    const bucket = admin.storage().bucket();

    // Get all files in the storage location
    const [files] = await bucket.getFiles({
      prefix: "users/MvOomgxG3GaGR7dWvqnsz1G5Jk23",
    });

    // Map the file metadata to an array of file names
    const fileNames = files.map((file) => file.name);

    // Get a Firestore reference to the "files" collection
    const filesCollection = admin.firestore().collection("files");

    // Iterate over the file names and insert them into the Firestore
    // collection if they don't already exist
    const insertions = fileNames.map(async (fileName) => {
      const docRef = filesCollection.doc(fileName);
      const doc = await docRef.get();
      if (!doc.exists) {
        await docRef.set({});
      }
    });

    // Wait for all insertions to complete
    await Promise.all(insertions);

    // Return the list of file names
    return fileNames;
  });
