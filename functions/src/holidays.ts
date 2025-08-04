import * as admin from "firebase-admin";
import fetch from "node-fetch";
import * as functions from "firebase-functions";

const fetchHolidays = async (year: number) => {
  const CALENDARIFIC_API_KEY = process.env.CALENDARIFIC_API_KEY;
  const url = `https://calendarific.com/api/v2/holidays?&api_key=${CALENDARIFIC_API_KEY}&country=IN&year=${year}`;
  const response = await fetch(url);
  const data = await response.json();
  return data;
};

const saveHolidays = async (holidays: any[]) => {
  const eventsCollection = admin.firestore().collection("events");
  const updates = holidays.map(async (holiday: any) => {
    const holidayDate = new Date(holiday.date.iso);
    const expireAt = new Date(holidayDate.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days after holiday
    const id = `${holiday.date.iso}-${holiday.name.toLowerCase().replace(/ /g, "-")}`;

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
    const currentYear = new Date().getFullYear();
    const [holidaysCurrentYear, holidaysNextYear] = await Promise.all([
      fetchHolidays(currentYear),
      fetchHolidays(currentYear + 1),
    ]);

    functions.logger.info("Full API response for current year:", JSON.stringify(holidaysCurrentYear, null, 2));
    functions.logger.info("Full API response for next year:", JSON.stringify(holidaysNextYear, null, 2));

    if (holidaysCurrentYear?.response?.holidays) {
      await saveHolidays(holidaysCurrentYear.response.holidays);
    } else {
      functions.logger.warn("No holidays found for current year. Check full API response above.");
    }

    if (holidaysNextYear?.response?.holidays) {
      await saveHolidays(holidaysNextYear.response.holidays);
    } else {
      functions.logger.warn("No holidays found for next year. Check full API response above.");
    }
  } catch (error) {
    functions.logger.error("Error fetching holidays", error);
  }
};
