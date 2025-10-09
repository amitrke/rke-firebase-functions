import * as admin from "firebase-admin";
import {Storage} from "@google-cloud/storage";
import {onSchedule} from "firebase-functions/v2/scheduler";
import {onObjectFinalized, onObjectDeleted} from "firebase-functions/v2/storage";
import * as logger from "firebase-functions/logger";
import {SCHEDULES, COLLECTIONS, STORAGE, FIRESTORE} from "./config/constants";

const storage = new Storage();

const imageSizeMap = {
  "200x200": "s",
  "680x680": "m",
  "1920x1080": "l",
};

/**
 * Parse file path to extract user ID, file name, and image dimensions
 * Expected format: users/{userId}/images/{fileName}_{dimensions}.{ext}
 * Example: users/MvOomgxG3GaGR7dWvqnsz1G5Jk23/images/sample_1920x1280_680x680.jpeg
 * @param {string} filePath - Full file path in Cloud Storage
 * @return {object|null} Parsed file details or null if invalid
 */
export const parseFilePath = (filePath: string): {
  userId: string;
  fileName: string;
  imageSize: string;
  imageDimensions: string;
} | null => {
  // Validate input
  if (!filePath || typeof filePath !== "string") {
    logger.warn("Invalid file path provided", {filePath});
    return null;
  }

  const pathArray = filePath.split("/");

  // Expected: users/{userId}/images/{fileName}_{dimensions}.{ext}
  if (pathArray.length < 4 || pathArray[0] !== STORAGE.USERS_PREFIX || pathArray[2] !== STORAGE.IMAGES_FOLDER) {
    logger.warn("File path doesn't match expected pattern", {filePath});
    return null;
  }

  const fileNameWithDim = pathArray[pathArray.length - 1];
  const userId = pathArray[1];

  // Validate userId exists
  if (!userId || userId.trim() === "") {
    logger.warn("Missing or empty userId in file path", {filePath});
    return null;
  }

  // Validate filename exists
  if (!fileNameWithDim || fileNameWithDim.trim() === "") {
    logger.warn("Missing or empty filename in file path", {filePath});
    return null;
  }

  const fileNameArray = fileNameWithDim.split("_");
  const dimWithExt = fileNameArray.pop();

  if (!dimWithExt) {
    logger.warn("Missing dimensions in filename", {filePath, fileNameWithDim});
    return null;
  }

  const fileNameExtArray = dimWithExt.split(".");

  // Should have at least dimension and extension
  if (fileNameExtArray.length < 2) {
    logger.warn("Missing file extension", {filePath, dimWithExt});
    return null;
  }

  const fileExtension = fileNameExtArray[fileNameExtArray.length - 1];
  const fileName = fileNameArray.join("_") + "." + fileExtension;
  const imageDimensions = dimWithExt.split(".")[0];

  // Map dimensions to size code
  let imageSize = "";
  if (imageDimensions === "200x200") {
    imageSize = imageSizeMap["200x200"];
  } else if (imageDimensions === "680x680") {
    imageSize = imageSizeMap["680x680"];
  } else if (imageDimensions === "1920x1080") {
    imageSize = imageSizeMap["1920x1080"];
  } else {
    logger.info("Unrecognized image dimensions", {imageDimensions, filePath});
    imageSize = "";
  }

  return {userId, fileName, imageSize, imageDimensions};
};

/**
 * Parse date format 2022-09-11T21:09:48.568Z to timestamp
 * @param {string} date - ISO 8601 date string
 * @return {number} Unix timestamp in milliseconds
 */
export const parseDate = (date: string): number => {
  return new Date(date).getTime();
};

export const listAndInsertFilesUtil = async () => {
  try {
    logger.info("Starting file list sync");

    // Get the storage bucket reference
    const bucket = admin.storage().bucket();

    // Get all files in the storage location
    const [files] = await bucket.getFiles({
      prefix: STORAGE.USERS_PREFIX,
    });

    const processedFiles = [];
    for (const file of files) {
      if (!file.name || !file.metadata.timeCreated) continue;
      const imageDetails = parseFilePath(file.name);
      if (!imageDetails) continue;
      const id = `${imageDetails.userId}-${imageDetails.fileName}-${imageDetails.imageSize}`;
      processedFiles.push({
        ...imageDetails,
        id,
        timeCreated: parseDate(file.metadata.timeCreated),
      });
    }

    // Get a Firestore reference to the "files" collection
    const filesCollection = admin.firestore().collection(COLLECTIONS.FILES);

    // Use batch writes to efficiently insert files (max 500 per batch)
    const BATCH_SIZE = FIRESTORE.MAX_BATCH_SIZE;
    for (let i = 0; i < processedFiles.length; i += BATCH_SIZE) {
      const batch = admin.firestore().batch();
      const batchFiles = processedFiles.slice(i, i + BATCH_SIZE);

      for (const file of batchFiles) {
        const docRef = filesCollection.doc(file.id);
        // Use set with merge to avoid reading first - will create if doesn't exist
        batch.set(docRef, file, {merge: true});
      }

      await batch.commit();
      logger.info(`Committed batch ${Math.floor(i / BATCH_SIZE) + 1}, files: ${batchFiles.length}`);
    }

    logger.info(`File list sync completed, processed ${processedFiles.length} files`);
  } catch (error) {
    logger.error("Error in file list sync", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
};

export const listAndInsertFiles = onSchedule({schedule: SCHEDULES.FILE_SYNC, region: "us-east1"}, async () => {
  return listAndInsertFilesUtil();
});

export const parsePosts = (posts: any, userFiles: any) => {
  for (const post of posts) {
    const postFiles: Array<string> = post.data().images;
    logger.info("postFiles", JSON.stringify(postFiles));
    const userId = post.data().userId;
    logger.info("userId", userId);
    if (!userFiles[userId]) {
      logger.info("map missing userId", userId);
      userFiles[userId] = postFiles;
    } else {
      logger.info("map has userId", userId);
      const userFileList = userFiles[userId];
      if (!userFileList) {
        logger.info("userFileList is missing");
        userFiles[userId] = postFiles;
      } else {
        logger.info("userFileList has items");
        userFileList.push(...postFiles);
      }
    }
    logger.info(
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

export const checkFilesBeingUsedUtil = async () => {
  try {
    logger.info("Starting file usage check");

    const userFiles: any = {};

    const postsCollection = admin.firestore().collection(COLLECTIONS.POSTS);
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

    const albumsCollection = admin.firestore().collection(COLLECTIONS.ALBUMS);
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

    logger.info(
      "userFiles", JSON.stringify(userFiles));

    const filesCollection = admin.firestore().collection(COLLECTIONS.FILES);
    const files = await filesCollection.get();

    const processedFiles: any[] = [];
    for (const file of files.docs) {
      const imageDetails = file.data();
      imageDetails.isBeingUsed = fileBeingUsed(imageDetails, userFiles);
      logger.info(
        "imageDetails", JSON.stringify(imageDetails));
      processedFiles.push(imageDetails);
    }

    // Use batch writes to efficiently update files (max 500 per batch)
    const BATCH_SIZE = FIRESTORE.MAX_BATCH_SIZE;
    for (let i = 0; i < processedFiles.length; i += BATCH_SIZE) {
      const batch = admin.firestore().batch();
      const batchFiles = processedFiles.slice(i, i + BATCH_SIZE);

      for (const file of batchFiles) {
        const docRef = filesCollection.doc(file.id);
        batch.set(docRef, file);
      }

      await batch.commit();
      logger.info(`Updated batch ${Math.floor(i / BATCH_SIZE) + 1}, files: ${batchFiles.length}`);
    }

    logger.info(`File usage check completed, processed ${processedFiles.length} files`);
  } catch (error) {
    logger.error("Error in file usage check", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
};

export const checkFilesBeingUsedFn = onSchedule(
  {schedule: SCHEDULES.FILE_USAGE_CHECK, region: "us-east1"},
  async () => {
    return checkFilesBeingUsedUtil();
  }
);

// imagDetails: {userId: string, fileName: string, imageSize: string} to fileName with path
export const getFilePath = (imageDetails: any) => {
  const {userId, fileName, imageDimensions} = imageDetails;
  const fileNameArray = fileName.split(".");
  const fileExtension = fileNameArray.pop();
  const baseName = fileNameArray[0];
  return `${STORAGE.USERS_PREFIX}/${userId}/${STORAGE.IMAGES_FOLDER}/${baseName}_${imageDimensions}.${fileExtension}`;
};

export const deleteUnusedFilesUtil = async () => {
  try {
    logger.info("Starting unused files deletion");

    const filesCollection = admin.firestore().collection(COLLECTIONS.FILES);
    // Get all files that are not being used
    const files = await filesCollection.where("isBeingUsed", "==", false).get();

    if (files.empty) {
      logger.info("No unused files to delete");
      return;
    }

    logger.info(`Found ${files.docs.length} unused files to delete`);

    // Delete files from storage
    const bucket = admin.storage().bucket();
    const deleteFiles = files.docs.map(async (file) => {
      const imageDetails = file.data();
      const filePath = getFilePath(imageDetails);
      logger.info("Deleting file", {filePath});
      try {
        await bucket.file(filePath).delete();
      } catch (error) {
        logger.error(`Failed to delete file: ${filePath}`, {
          error: error instanceof Error ? error.message : String(error),
        });
        // Continue with other deletions even if one fails
      }
    });

    await Promise.all(deleteFiles);
    logger.info("Unused files deletion completed");
  } catch (error) {
    logger.error("Error in unused files deletion", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
};

export const deleteUnusedFilesFn = onSchedule({schedule: SCHEDULES.FILE_CLEANUP, region: "us-east1"}, async () => {
  return deleteUnusedFilesUtil();
});

/**
 * File Maintenance Orchestrator
 * Runs all file maintenance tasks in the correct order to prevent race conditions
 */
export const fileMaintenanceOrchestrator = onSchedule(
  {schedule: SCHEDULES.FILE_MAINTENANCE, region: "us-east1"},
  async () => {
    try {
      logger.info("Starting file maintenance orchestration");

      // Step 1: Sync files from Cloud Storage to Firestore
      await listAndInsertFilesUtil();
      logger.info("Step 1/3: File sync complete");

      // Step 2: Check which files are being used in posts and albums
      await checkFilesBeingUsedUtil();
      logger.info("Step 2/3: File usage check complete");

      // Step 3: Delete unused files from Cloud Storage
      await deleteUnusedFilesUtil();
      logger.info("Step 3/3: Unused files deleted");

      logger.info("File maintenance orchestration completed successfully");
    } catch (error) {
      logger.error("File maintenance orchestration failed", {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }
);

const addFileToDb = async (filePath: string) => {
  const imageDetails = parseFilePath(filePath);
  if (!imageDetails) return;
  const id = `${imageDetails.userId}-${imageDetails.fileName}-${imageDetails.imageSize}`;
  const filesCollection = admin.firestore().collection(COLLECTIONS.FILES);
  await filesCollection.doc(id).set({
    ...imageDetails,
    timeCreated: admin.firestore.FieldValue.serverTimestamp(),
  });
};

export const onFileCreateFn = onObjectFinalized({region: "us-east1"}, async ({data}) => {
  const fileBucket = data.bucket;
  if (!data.name) return;
  const filePath = data.name;
  const bucket = storage.bucket(fileBucket);
  const file = bucket.file(filePath);

  const [metadata] = await file.getMetadata();

  console.log(`File ${metadata.name} uploaded.`);
  await addFileToDb(filePath);
});

const deleteFileFromDb = async (filePath: string) => {
  const imageDetails = parseFilePath(filePath);
  if (!imageDetails) return;
  const id = `${imageDetails.userId}-${imageDetails.fileName}-${imageDetails.imageSize}`;
  const filesCollection = admin.firestore().collection(COLLECTIONS.FILES);
  await filesCollection.doc(id).delete();
};

export const onFileDeleteFn = onObjectDeleted({region: "us-east1"}, async ({data}) => {
  if (!data.name) return;
  const filePath: string = data.name;
  console.log(`File ${filePath} deleted.`);
  await deleteFileFromDb(filePath);
});

// On post collection update, update the files collection
// export const onPostUpdateFn = functions
//   .region("us-east1")
//   .firestore.document("posts/{postId}")
//   .onUpdate(async (change, context) => {
//     const postBefore = change.before.data();
//     const postAfter = change.after.data();
//     // const postBeforeFiles = postBefore.images;
//     const postAfterFiles = postAfter.images;
//     const filesCollection = admin.firestore().collection("files");
//     const updates = postAfterFiles.map(async (file: any) => {
//       const docRef = filesCollection.doc(file);
//       await docRef.update({isBeingUsed: true});
//     });
//     await Promise.all(updates);
//   }
//   );
