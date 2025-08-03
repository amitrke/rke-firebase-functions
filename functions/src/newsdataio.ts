import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import {createHash} from "crypto";
import {NewsArticle} from "./model/types";

const KEYWORDS = ["roorkee"];

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
  const newsCollection = admin.firestore().collection("news");
  const NEWSDATAIO_API_KEY = process.env.NEWSDATAIO_API_KEY;

  const url =
    "https://newsdata.io/api/1/news?q=Roorkee&language=en&apikey=" +
    NEWSDATAIO_API_KEY;

  try {
    const response = await fetch(url);
    const data: any = await response.json();

    if (data.status === "success" && data.results) {
      for (const articleData of data.results) {
        const title = articleData.title?.toLowerCase() || "";
        const description = articleData.description?.toLowerCase() || "";
        const content = articleData.content?.toLowerCase() || "";

        const hasKeyword = KEYWORDS.some((keyword) => {
          return title.includes(keyword) ||
            description.includes(keyword) ||
            content.includes(keyword);
        });

        if (hasKeyword) {
          const article = mapToNewsArticle(articleData);
          article.expireAt = admin.firestore.Timestamp.fromMillis(
            Date.now() + 1000 * 60 * 60 * 24 * 7, // 7 days from now
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
    functions.logger.error("Error fetching news from newsdata.io", error);
  }
};
