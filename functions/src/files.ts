import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

const imageSizeMap = {
  "200x200": "s",
  "680x680": "m",
  "1920x1080": "l",
};

// Parse file path
// users/MvOomgxG3GaGR7dWvqnsz1G5Jk23/images/sample_1920×1280_680x680.jpeg
// Get the user id and file name
export const parseFilePath = (filePath: string) => {
  const pathArray = filePath.split("/");
  const fileName = pathArray[pathArray.length - 1];
  const userId = pathArray[1];
  const fileNameArray = fileName.split("_");
  const imageDimensionsStr = fileNameArray[fileNameArray.length - 1];
  const imageDimensions = imageDimensionsStr.split(".")[0];
  let imageSize = "";
  if (imageDimensions !== "200x200" && imageDimensions !== "680x680" &&
      imageDimensions !== "1920x1080") {
    imageSize = "";
  } else {
    imageSize = imageSizeMap[imageDimensions];
  }

  return {userId, fileName, imageSize, imageDimensions};
};

export const listAndInsertFiles = functions
  .region("us-east1")
  .pubsub
  .schedule("every 24 hours")
  .onRun(async () => {
    // Get the storage bucket reference
    const bucket = admin.storage().bucket();

    // Get all files in the storage location
    const [files] = await bucket.getFiles({
      prefix: "users",
    });

    const processedFiles = [];
    for (const file of files) {
      const imageDetails = parseFilePath(file.name);
      const id = `${imageDetails.userId}-${imageDetails.fileName}-${imageDetails.imageSize}`;
      processedFiles.push({
        ...imageDetails,
        id,
        timeCreated: file.metadata.timeCreated,
      });
    }

    // Get a Firestore reference to the "files" collection
    const filesCollection = admin.firestore().collection("files");

    // Iterate over the file names and insert them into the Firestore
    // collection if they don't already exist
    const insertions = processedFiles.map(async (file) => {
      const docRef = filesCollection.doc(file.id);
      const doc = await docRef.get();
      if (!doc.exists) {
        await docRef.set(file);
      }
    });

    // // Wait for all insertions to complete
    await Promise.all(insertions);

    // Return the list of file names
    return processedFiles;
  });
