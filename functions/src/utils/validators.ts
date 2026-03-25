/**
 * Validation utilities for API responses and data structures
 */

import {HolidaysResponse, NewsApiResponse, NewsDataIoResponse, Weather} from "../model/types";

type ValidArticle = {
  title: string;
  url: string;
  publishedAt: string;
  author?: string | null;
  description?: string | null;
  content?: string | null;
  urlToImage?: string | null;
};

/**
 * Check if weather API response is valid
 * @param {any} data - Response data to validate
 * @return {boolean} True if valid weather data
 */
export const isValidWeatherResponse = (data: any): data is Weather => {
  return (
    data &&
    typeof data === "object" &&
    typeof data.lat === "number" &&
    typeof data.lon === "number" &&
    typeof data.timezone === "string" &&
    data.current &&
    typeof data.current === "object" &&
    typeof data.current.temp === "number" &&
    typeof data.current.dt === "number"
  );
};

/**
 * Check if NewsAPI response is valid
 * @param {any} data - Response data to validate
 * @return {boolean} True if valid NewsAPI response
 */
export const isValidNewsAPIResponse = (data: any): data is NewsApiResponse => {
  return (
    data &&
    typeof data === "object" &&
    data.status === "ok" &&
    Array.isArray(data.articles)
  );
};

/**
 * Check if NewsData.io response is valid
 * @param {any} data - Response data to validate
 * @return {boolean} True if valid NewsData.io response
 */
export const isValidNewsDataIOResponse = (data: any): data is NewsDataIoResponse => {
  return (
    data &&
    typeof data === "object" &&
    data.status === "success" &&
    Array.isArray(data.results)
  );
};

/**
 * Check if Calendarific holidays response is valid
 * @param {any} data - Response data to validate
 * @return {boolean} True if valid holidays response
 */
export const isValidHolidaysResponse = (data: any): data is HolidaysResponse => {
  return (
    data &&
    typeof data === "object" &&
    data.response &&
    typeof data.response === "object" &&
    Array.isArray(data.response.holidays)
  );
};

/**
 * Check if a news article has required fields
 * @param {any} article - Article to validate
 * @return {boolean} True if article has required fields
 */
export const isValidArticle = (article: any): article is ValidArticle => {
  return (
    article &&
    typeof article === "object" &&
    typeof article.title === "string" &&
    typeof article.url === "string" &&
    typeof article.publishedAt === "string" &&
    (article.urlToImage === null || article.urlToImage === undefined || typeof article.urlToImage === "string") &&
    article.title.trim() !== ""
  );
};
