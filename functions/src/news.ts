import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import fetch from "node-fetch";
import * as crypto from "crypto";

export const updateNewsUtil = async () => {
  const newsCollection = admin.firestore().collection("news");
  const NEWS_API_KEY = functions.config().config.newskey;
  const response = await fetch(
    "https://newsapi.org/v2/everything?q=Roorkee&apiKey=" + NEWS_API_KEY
  );
  const body = await response.json();

  if (body && body["articles"]) {
    const updates = body["articles"].map(async (article: any) => {
      article["apiSource"] = "newsapi";

      article["expireAt"] = admin.firestore.Timestamp.fromMillis(
        Date.now() + 1000 * 60 * 60 * 24 * 7 // 7 days from now
      );

      const articleAsString = JSON.stringify(article);
      const hash = crypto.createHash("md5");
      hash.update(articleAsString);
      const md5Hash = hash.digest("hex");
      await newsCollection.doc(md5Hash).set(article);
    });

    await Promise.all(updates);
  }

  return body;
};
