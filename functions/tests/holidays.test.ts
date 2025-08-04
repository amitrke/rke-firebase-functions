import { updateHolidaysUtil } from '../src/holidays';
import * as admin from 'firebase-admin';
import fetch from 'node-fetch';
import mockHolidays from './mocks/holidays.json';

jest.mock('node-fetch');
const { Response } = jest.requireActual('node-fetch');

const mockSet = jest.fn();
const mockDoc = jest.fn(() => ({ set: mockSet }));
const mockCollection = jest.fn(() => ({ doc: mockDoc }));

jest.mock('firebase-admin', () => ({
  initializeApp: jest.fn(),
  firestore: jest.fn(() => ({
    collection: mockCollection,
  })),
}));

(admin.firestore as any).Timestamp = {
    fromDate: (date: Date) => date,
};

describe('updateHolidaysUtil', () => {
  const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockImplementation(() => {
      return Promise.resolve(new Response(JSON.stringify(mockHolidays)));
    });
  });

  it('should fetch holidays and save them to Firestore', async () => {
    await updateHolidaysUtil();

    const currentYear = new Date().getFullYear();
    expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining(`year=${currentYear}`));
    expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining(`year=${currentYear + 1}`));

    expect(mockCollection).toHaveBeenCalledWith('events');
    
    const holiday1 = mockHolidays.response.holidays[0];
    const holiday2 = mockHolidays.response.holidays[1];

    const expectedHoliday1 = {
        type: 'holiday',
        name: holiday1.name,
        description: holiday1.description,
        date: holiday1.date.iso,
        holidayTypes: holiday1.type,
        locations: holiday1.locations,
        states: holiday1.states,
        url: holiday1.canonical_url,
        expireAt: expect.any(Date),
    };

    const expectedHoliday2 = {
        type: 'holiday',
        name: holiday2.name,
        description: holiday2.description,
        date: holiday2.date.iso,
        holidayTypes: holiday2.type,
        locations: holiday2.locations,
        states: holiday2.states,
        url: holiday2.canonical_url,
        expireAt: expect.any(Date),
    };

    // It's called twice for current year and twice for next year
    expect(mockSet).toHaveBeenCalledTimes(4);
    expect(mockSet).toHaveBeenCalledWith(expectedHoliday1);
    expect(mockSet).toHaveBeenCalledWith(expectedHoliday2);
  });
});
