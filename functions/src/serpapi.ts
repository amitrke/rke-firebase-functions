import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import {createHash} from "crypto";

import {NewsArticle, SerpApiResponse} from "./model/types";
import {articleMatchesKeywords} from "./utils/filters";
import {isValidSerpApiResponse} from "./utils/validators";
import {KEYWORDS, TIME, TTL, API, COLLECTIONS} from "./config/constants";

type SerpApiNewsResult = {
  title?: string;
  link?: string;
  snippet?: string;
  date?: string;
  thumbnail?: string;
  source?: {
    name?: string;
  };
};

const resolveSourceId = (result: SerpApiNewsResult): string => {
  const sourceName = result.source?.name?.trim();
  if (sourceName) {
    return sourceName;
  }

  if (typeof result.link === "string" && result.link.trim() !== "") {
    try {
      const hostname = new URL(result.link).hostname.replace(/^www\./, "");
      if (hostname) {
        return hostname;
      }
    } catch {
      // Ignore malformed URLs and use fallback source id.
    }
  }

  return "serpapi";
};

const mapToNewsArticle = (result: SerpApiNewsResult): NewsArticle => {
  const sourceId = resolveSourceId(result);
  const snippet = typeof result.snippet === "string" ? result.snippet.trim() : "";
  const title = typeof result.title === "string" ? result.title.trim() : "";
  const description = snippet || title || null;

  return {
    source: {
      id: sourceId,
      name: sourceId,
    },
    source_id: sourceId,
    author: null,
    title: title || "",
    description,
    url: result.link || "",
    image_url: typeof result.thumbnail === "string" ? result.thumbnail : null,
    publishedAt: typeof result.date === "string" && result.date.trim() !== "" ?
      result.date :
      new Date().toISOString(),
    content: description,
    apiSource: "serpapi",
  };
};

export const updateSerpApiNewsUtil = async () => {
  try {
    logger.info("Starting news update from SerpApi Google News");

    const newsCollection = admin.firestore().collection(COLLECTIONS.NEWS);
    const SERPAPI_API_KEY = process.env.SERPAPI_API_KEY;

    if (!SERPAPI_API_KEY) {
      throw new Error("SERPAPI_API_KEY environment variable not set");
    }

    const queryParams = new URLSearchParams({
      engine: API.SERP_API.ENGINE,
      q: API.SERP_API.QUERY,
      hl: API.SERP_API.LANGUAGE,
      gl: API.SERP_API.COUNTRY,
      api_key: SERPAPI_API_KEY,
    });

    const response = await fetch(`${API.SERP_API.BASE_URL}?${queryParams.toString()}`);

    if (!response.ok) {
      throw new Error(
        `SerpApi returned ${response.status}: ${response.statusText}`
      );
    }

    const body: unknown = await response.json();

    if (!isValidSerpApiResponse(body)) {
      throw new Error("Invalid response from SerpApi Google News API");
    }

    const newsData: SerpApiResponse = body;

    if (newsData.news_results.length === 0) {
      logger.warn("No articles found in SerpApi response");
      return;
    }

    const updates = newsData.news_results.map(async (rawArticle) => {
      const articleData = rawArticle as SerpApiNewsResult;

      if (typeof articleData.title !== "string" || articleData.title.trim() === "") {
        logger.warn("Skipping article with invalid title from SerpApi", {article: rawArticle});
        return;
      }

      if (typeof articleData.link !== "string" || articleData.link.trim() === "") {
        logger.warn("Skipping article with invalid link from SerpApi", {article: rawArticle});
        return;
      }

      const article = mapToNewsArticle(articleData);

      if (!articleMatchesKeywords(article, KEYWORDS)) {
        return;
      }

      article.expireAt = admin.firestore.Timestamp.fromMillis(
        Date.now() + TIME.ONE_DAY_MS * TTL.NEWS_ARTICLES_DAYS
      );

      const articleAsString = JSON.stringify({
        title: article.title,
        url: article.url,
        apiSource: article.apiSource,
      });

      const md5Hash = createHash("md5")
        .update(articleAsString)
        .digest("hex");

      await newsCollection.doc(md5Hash).set(article);
    });

    await Promise.all(updates);
    logger.info(`SerpApi news update completed, processed ${newsData.news_results.length} articles`);
  } catch (error) {
    logger.error("Error updating news from SerpApi", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
};
