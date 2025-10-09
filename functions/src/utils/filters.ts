/**
 * Utility functions for filtering and matching content
 */

/**
 * Check if an article matches any of the provided keywords
 * @param {object} article - Article object with title, description, and content
 * @param {string[]} keywords - Array of keywords to search for
 * @return {boolean} true if any keyword is found in title, description, or content
 */
export const articleMatchesKeywords = (
  article: { title?: string; description?: string; content?: string },
  keywords: string[]
): boolean => {
  const title = article.title?.toLowerCase() || "";
  const description = article.description?.toLowerCase() || "";
  const content = article.content?.toLowerCase() || "";

  return keywords.some((keyword) => {
    const lowerKeyword = keyword.toLowerCase();
    return (
      title.includes(lowerKeyword) ||
      description.includes(lowerKeyword) ||
      content.includes(lowerKeyword)
    );
  });
};
