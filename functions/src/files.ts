import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import {Storage} from "@google-cloud/storage";

const storage = new Storage();

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
  const fileNameWithDim = pathArray[pathArray.length - 1];
  const userId = pathArray[1];
  const fileNameArray = fileNameWithDim.split("_");
  const fileNameExtArray = fileNameWithDim.split(".");
  const fileName = fileNameArray[0] + "." + fileNameExtArray[1];
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

export const parsePosts = (posts: any, userFiles: any) => {
  for (const post of posts) {
    const postFiles: Array<string> = post.data().images;
    functions.logger.info("postFiles", JSON.stringify(postFiles));
    const userId = post.data().userId;
    functions.logger.info("userId", userId);
    if (!userFiles[userId]) {
      functions.logger.info("map missing userId", userId);
      userFiles[userId] = postFiles;
    } else {
      functions.logger.info("map has userId", userId);
      const userFileList = userFiles[userId];
      if (!userFileList) {
        functions.logger.info("userFileList is missing");
        userFiles[userId] = postFiles;
      } else {
        functions.logger.info("userFileList has items");
        userFileList.push(...postFiles);
      }
    }
    functions.logger.info(
      "userFiles interim", JSON.stringify(userFiles));
  }
};

export const fileBeingUsed = (file: any, userFiles: any) => {
  if (userFiles[file.userId] &&
    userFiles[file.userId].includes(file.fileName)) {
    return true;
  } else {
    return false;
  }
};

export const checkFilesBeingUsedFn = functions
  .region("us-east1")
  .pubsub
  .schedule("every 24 hours")
  .onRun(async () => {
    const userFiles: any = {};

    const postsCollection = admin.firestore().collection("posts");
    const posts = await postsCollection.get();

    for (const post of posts.docs) {
      const postFiles: Array<string> = post.data().images;
      const userId = post.data().userId;
      if (!userFiles[userId]) {
        userFiles[userId] = postFiles;
      } else {
        const userFileList = userFiles[userId];
        if (!userFileList) {
          userFiles[userId] = postFiles;
        } else {
          userFileList.push(...postFiles);
        }
      }
    }

    const albumsCollection = admin.firestore().collection("albums");
    const albums = await albumsCollection.get();

    for (const album of albums.docs) {
      const albumFiles: Array<string> = album.data().images;
      const userId = album.data().userId;
      if (!userFiles[userId]) {
        userFiles[userId] = albumFiles;
      } else {
        const userFileList = userFiles[userId];
        if (!userFileList) {
          userFiles[userId] = albumFiles;
        } else {
          userFileList.push(...albumFiles);
        }
      }
    }

    functions.logger.info(
      "userFiles", JSON.stringify(userFiles));

    const filesCollection = admin.firestore().collection("files");
    const files = await filesCollection.get();

    const processedFiles: any[] = [];
    for (const file of files.docs) {
      const imageDetails = file.data();
      imageDetails.isBeingUsed = fileBeingUsed(imageDetails, userFiles);
      functions.logger.info(
        "imageDetails", JSON.stringify(imageDetails));
      processedFiles.push(imageDetails);
    }

    // Iterate over the file names and insert them into the Firestore
    // collection if they don't already exist
    const updates = processedFiles.map(async (file) => {
      const docRef = filesCollection.doc(file.id);
      await docRef.set(file);
    });

    // // Wait for all insertions to complete
    await Promise.all(updates);

    return userFiles;
  });

export const deleteUnusedFilesFn = functions
  .region("us-east1")
  .pubsub
  .schedule("every 24 hours")
  .onRun(async () => {
    const userFiles: any = {};

    const filesCollection = admin.firestore().collection("files");
    // Get all files that are not being used
    const files = await filesCollection.where("isBeingUsed", "==", false).get();

    // Delete files from storage
    const bucket = admin.storage().bucket();
    const deleteFiles = files.docs.map(async (file) => {
      const imageDetails = file.data();
      const fileName = imageDetails.fileName;
      const userId = imageDetails.userId;
      const imageSize = imageDetails.imageSize;
      const filePath = `users/${userId}/${fileName}.${imageSize}.jpg`;
      functions.logger.info("filePath", filePath);
      await bucket.file(filePath).delete();
    });

    // Delete files from firestore
    const deleteFirestoreFiles = files.docs.map(async (file) => {
      const imageDetails = file.data();
      const id = imageDetails.id;
      await filesCollection.doc(id).delete();
    });

    await Promise.all(deleteFiles);
    await Promise.all(deleteFirestoreFiles);

    return userFiles;
  });

export const onFileCreateFn = functions
  .region("us-east1")
  .storage.object().onFinalize(async (object) => {
    const fileBucket = object.bucket;
    if (!object.name) return;
    const filePath = object.name;
    const bucket = storage.bucket(fileBucket);
    const file = bucket.file(filePath);

    const [metadata] = await file.getMetadata();

    console.log(`File ${metadata.name} uploaded.`);
  });

export const onFileDeleteFn = functions
  .region("us-east1")
  .storage.object().onDelete(async (object) => {
    if (!object.name) return;
    const filePath: string = object.name;
    console.log(`File ${filePath} deleted.`);
  });
