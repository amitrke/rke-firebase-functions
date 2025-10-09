import * as admin from "firebase-admin";
import fetch from "node-fetch";
import * as logger from "firebase-functions/logger";
import {isValidHolidaysResponse} from "./utils/validators";
import {TIME, TTL, API, COLLECTIONS} from "./config/constants";

const fetchHolidays = async (year: number, apiKey: string) => {
  const url = `${API.CALENDARIFIC.BASE_URL}?api_key=${apiKey}&country=${API.CALENDARIFIC.COUNTRY}&year=${year}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      `Calendarific API returned ${response.status}: ${response.statusText}`
    );
  }

  const data = await response.json();

  // Validate response structure
  if (!isValidHolidaysResponse(data)) {
    throw new Error("Invalid response from Calendarific API");
  }

  return data;
};

const saveHolidays = async (holidays: any[]) => {
  const eventsCollection = admin.firestore().collection(COLLECTIONS.EVENTS);
  const updates = holidays.map(async (holiday: any) => {
    const holidayDate = new Date(holiday.date.iso);
    const expireAt = new Date(holidayDate.getTime() + TIME.ONE_DAY_MS * TTL.HOLIDAYS_DAYS_AFTER);
    const id = `${holiday.date.iso}-${holiday.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")}`;

    await eventsCollection.doc(id).set({
      type: "holiday",
      name: holiday.name,
      description: holiday.description,
      date: holiday.date.iso,
      holidayTypes: holiday.type,
      locations: holiday.locations,
      states: holiday.states,
      url: holiday.canonical_url,
      expireAt: admin.firestore.Timestamp.fromDate(expireAt),
    });
  });
  await Promise.all(updates);
};

export const updateHolidaysUtil = async () => {
  try {
    logger.info("Starting holidays update");

    const CALENDARIFIC_API_KEY = process.env.CALENDARIFIC_API_KEY;
    if (!CALENDARIFIC_API_KEY) {
      throw new Error("CALENDARIFIC_API_KEY environment variable not set");
    }

    const currentYear = new Date().getFullYear();
    const [holidaysCurrentYear, holidaysNextYear] = await Promise.all([
      fetchHolidays(currentYear, CALENDARIFIC_API_KEY),
      fetchHolidays(currentYear + 1, CALENDARIFIC_API_KEY),
    ]);

    if (holidaysCurrentYear?.response?.holidays) {
      await saveHolidays(holidaysCurrentYear.response.holidays);
    }

    if (holidaysNextYear?.response?.holidays) {
      await saveHolidays(holidaysNextYear.response.holidays);
    }

    logger.info("Holidays update completed successfully");
  } catch (error) {
    logger.error("Error fetching holidays", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
};
