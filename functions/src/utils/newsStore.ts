/**
 * Utility functions for persisting news articles
 */
import { DocumentReference } from "firebase-admin/firestore";

import { NewsArticle } from "../model/types";

// gRPC status code returned by Firestore when create() targets an existing document
const ALREADY_EXISTS = 6;

/**
 * Store an article only if it isn't already stored. Existing articles are left
 * untouched so re-fetching them doesn't push their expireAt forward, which would
 * make old stories look fresh and keep them from ever expiring.
 * @param {DocumentReference} docRef - Reference to the article document
 * @param {NewsArticle} article - Article to store
 * @return {Promise<boolean>} true if the article was created, false if it already existed
 */
export const saveNewsArticleIfNew = async (docRef: DocumentReference, article: NewsArticle): Promise<boolean> => {
  try {
    await docRef.create(article);
    return true;
  } catch (error) {
    if ((error as { code?: number }).code === ALREADY_EXISTS) {
      return false;
    }
    throw error;
  }
};
