import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import fetch from "node-fetch";
import * as crypto from "crypto";

import {NewsArticle} from "./model/types";

// Add your keywords here
const KEYWORDS = ["roorkee"];

export const updateNewsUtil = async () => {
  const newsCollection = admin.firestore().collection("news");
  const NEWS_API_KEY = process.env.NEWS_API_KEY;
  const response = await fetch(
    "https://newsapi.org/v2/everything?q=Roorkee&apiKey=" + NEWS_API_KEY,
  );
  const body = await response.json();

  if (body && body["articles"]) {
    const updates = body["articles"].map(async (articleData: any) => {
      const title = articleData.title?.toLowerCase() || "";
      const description = articleData.description?.toLowerCase() || "";
      const content = articleData.content?.toLowerCase() || "";

      const hasKeyword = KEYWORDS.some((keyword) => {
        return title.includes(keyword) ||
          description.includes(keyword) ||
          content.includes(keyword);
      });

      if (hasKeyword) {
        const {urlToImage, ...restOfArticle} = articleData;
        const article: NewsArticle = {
          ...restOfArticle,
          image_url: urlToImage,
          apiSource: "newsapi",
          expireAt: admin.firestore.Timestamp.fromMillis(
            Date.now() + 1000 * 60 * 60 * 24 * 7, // 7 days from now
          ),
        };

        const articleAsString = JSON.stringify({
          title: article.title,
          apiSource: article.apiSource,
        });
        const hash = crypto.createHash("md5");
        hash.update(articleAsString);
        const md5Hash = hash.digest("hex");
        await newsCollection.doc(md5Hash).set(article);
      }
    });

    await Promise.all(updates);
  }

  return body;
};
