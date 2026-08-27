import { articleMatchesKeywords } from "../src/utils/filters";
import { KEYWORDS, EXCLUDE_KEYWORDS } from "../src/config/constants";

describe("articleMatchesKeywords", () => {
  it("matches an article about Roorkee", () => {
    const article = { title: "IIT Roorkee signs new MoU", description: null, content: null };
    expect(articleMatchesKeywords(article, KEYWORDS)).toBe(true);
  });

  it("flags templated vehicle-pricing spam via EXCLUDE_KEYWORDS", () => {
    const article = {
      title: "Maruti Suzuki Baleno On Road Price Roorkee Aug 2026 - ₹7.22L",
      description: null,
      content: null,
    };
    expect(articleMatchesKeywords(article, KEYWORDS)).toBe(true);
    expect(articleMatchesKeywords(article, EXCLUDE_KEYWORDS)).toBe(true);
  });

  it("does not flag a genuine article as spam", () => {
    const article = { title: "IIT Roorkee Celebrates 80th Independence Day", description: null, content: null };
    expect(articleMatchesKeywords(article, EXCLUDE_KEYWORDS)).toBe(false);
  });
});
