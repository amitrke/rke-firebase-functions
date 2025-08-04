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
  functions.logger.info(`Verifying API Key. First 5 chars: ${process.env.CALENDARIFIC_API_KEY?.substring(0, 5)}`);
  try {
    const currentYear = new Date().getFullYear();
    const [holidaysCurrentYear, holidaysNextYear] = await Promise.all([
      fetchHolidays(currentYear),
      fetchHolidays(currentYear + 1),
    ]);

    if (holidaysCurrentYear?.response?.holidays) {
      await saveHolidays(holidaysCurrentYear.response.holidays);
    }

    if (holidaysNextYear?.response?.holidays) {
      await saveHolidays(holidaysNextYear.response.holidays);
    }
  } catch (error) {
    functions.logger.error("Error fetching holidays", error);
  }
};
