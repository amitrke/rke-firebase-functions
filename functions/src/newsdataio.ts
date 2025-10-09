import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import {createHash} from "crypto";
import {NewsArticle} from "./model/types";
import {articleMatchesKeywords} from "./utils/filters";
import {isValidNewsDataIOResponse, isValidArticle} from "./utils/validators";
import {KEYWORDS, TIME, TTL, API, COLLECTIONS} from "./config/constants";

const mapToNewsArticle = (articleData: any): NewsArticle => {
  return {
    source: {
      id: articleData.source_id,
      name: articleData.source_id,
    },
    author: articleData.creator ? articleData.creator.join(", ") : null,
    title: articleData.title,
    description: articleData.description,
    url: articleData.link,
    image_url: articleData.image_url,
    publishedAt: articleData.pubDate,
    content: articleData.content,
    apiSource: "newsdata.io",
  };
};

export const updateNewsDataIOUtil = async () => {
  const newsCollection = admin.firestore().collection(COLLECTIONS.NEWS);
  const NEWSDATAIO_API_KEY = process.env.NEWSDATAIO_API_KEY;

  const url =
    `${API.NEWS_DATA_IO.BASE_URL}?q=${API.NEWS_DATA_IO.QUERY}` +
    `&language=${API.NEWS_DATA_IO.LANGUAGE}&apikey=${NEWSDATAIO_API_KEY}`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(
        `NewsData.io API returned ${response.status}: ${response.statusText}`
      );
    }

    const data: any = await response.json();

    // Validate response structure
    if (!isValidNewsDataIOResponse(data)) {
      throw new Error("Invalid response from NewsData.io");
    }

    if (data.status === "success" && data.results) {
      for (const articleData of data.results) {
        // Validate article has required fields
        if (!isValidArticle(articleData)) {
          logger.warn("Skipping invalid article from NewsData.io", {article: articleData});
          continue;
        }

        if (articleMatchesKeywords(articleData, KEYWORDS)) {
          const article = mapToNewsArticle(articleData);
          article.expireAt = admin.firestore.Timestamp.fromMillis(
            Date.now() + TIME.ONE_DAY_MS * TTL.NEWS_ARTICLES_DAYS
          );
          const articleAsString = JSON.stringify({
            title: article.title,
            apiSource: article.apiSource,
          });
          const md5Hash = createHash("md5")
            .update(articleAsString)
            .digest("hex");
          await newsCollection.doc(md5Hash).set(article);
        }
      }
    }
  } catch (error) {
    logger.error("Error fetching news from newsdata.io", error);
  }
};
