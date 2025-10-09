import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import fetch from "node-fetch";
import {createHash} from "crypto";

import {NewsArticle} from "./model/types";
import {articleMatchesKeywords} from "./utils/filters";
import {isValidNewsAPIResponse, isValidArticle} from "./utils/validators";
import {KEYWORDS, TIME, TTL, API, COLLECTIONS} from "./config/constants";

export const updateNewsUtil = async () => {
  try {
    logger.info("Starting news update from NewsAPI");

    const newsCollection = admin.firestore().collection(COLLECTIONS.NEWS);
    const NEWS_API_KEY = process.env.NEWS_API_KEY;

    if (!NEWS_API_KEY) {
      throw new Error("NEWS_API_KEY environment variable not set");
    }

    const response = await fetch(
      `${API.NEWS_API.BASE_URL}?q=${API.NEWS_API.QUERY}&apiKey=${NEWS_API_KEY}`
    );

    if (!response.ok) {
      throw new Error(
        `NewsAPI returned ${response.status}: ${response.statusText}`
      );
    }

    const body = await response.json();

    // Validate response structure
    if (!isValidNewsAPIResponse(body)) {
      throw new Error("Invalid response from NewsAPI");
    }

    if (body && body["articles"]) {
      const updates = body["articles"].map(async (articleData: any) => {
        // Validate article has required fields
        if (!isValidArticle(articleData)) {
          logger.warn("Skipping invalid article", {article: articleData});
          return;
        }

        if (articleMatchesKeywords(articleData, KEYWORDS)) {
          const {urlToImage, ...restOfArticle} = articleData;
          const article: NewsArticle = {
            ...restOfArticle,
            image_url: urlToImage,
            apiSource: "newsapi",
            expireAt: admin.firestore.Timestamp.fromMillis(
              Date.now() + TIME.ONE_DAY_MS * TTL.NEWS_ARTICLES_DAYS
            ),
          };

          const articleAsString = JSON.stringify({
            title: article.title,
            apiSource: article.apiSource,
          });
          const md5Hash = createHash("md5")
            .update(articleAsString)
            .digest("hex");
          await newsCollection.doc(md5Hash).set(article);
        }
      });

      await Promise.all(updates);
      logger.info(`News update completed, processed ${body["articles"].length} articles`);
    } else {
      logger.warn("No articles found in NewsAPI response");
    }

    return body;
  } catch (error) {
    logger.error("Error updating news from NewsAPI", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
};
