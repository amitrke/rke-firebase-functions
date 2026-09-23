import { DocumentReference } from "firebase-admin/firestore";

import { saveNewsArticleIfNew } from "../src/utils/newsStore";
import { NewsArticle } from "../src/model/types";

const article = { title: "IIT Roorkee signs new MoU", apiSource: "serpapi" } as NewsArticle;

const docRefWith = (create: jest.Mock) => ({ create } as unknown as DocumentReference);

describe("saveNewsArticleIfNew", () => {
  it("creates the article when it doesn't exist", async () => {
    const create = jest.fn().mockResolvedValue(undefined);
    await expect(saveNewsArticleIfNew(docRefWith(create), article)).resolves.toBe(true);
    expect(create).toHaveBeenCalledWith(article);
  });

  it("leaves an existing article untouched", async () => {
    const create = jest.fn().mockRejectedValue(Object.assign(new Error("exists"), { code: 6 }));
    await expect(saveNewsArticleIfNew(docRefWith(create), article)).resolves.toBe(false);
  });

  it("rethrows other errors", async () => {
    const create = jest.fn().mockRejectedValue(Object.assign(new Error("denied"), { code: 7 }));
    await expect(saveNewsArticleIfNew(docRefWith(create), article)).rejects.toThrow("denied");
  });
});
