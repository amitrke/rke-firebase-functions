import { updateWeatherUtil } from '../src/weather';

const mockSet = jest.fn();
const mockDoc = jest.fn(() => ({ set: mockSet }));
const mockCollection = jest.fn(() => ({ doc: mockDoc }));

jest.mock('firebase-admin/firestore', () => ({
  getFirestore: jest.fn(() => ({ collection: mockCollection })),
}));
jest.mock('firebase-functions/logger', () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn() }));

const mockFetch = jest.fn();
Object.defineProperty(global, 'fetch', { value: mockFetch, writable: true });

const weather = {
  lat: 29.8667,
  lon: 77.8833,
  timezone: 'Asia/Kolkata',
  timezone_offset: 19800,
  current: { dt: 1_000_000, temp: 24 },
};

const air = {
  ok: true,
  json: async () => ({
    coord: { lat: 29.87, lon: 77.88 },
    list: [
      {
        dt: 1_000_000,
        main: { aqi: 3 },
        components: { co: 400, no: 0, no2: 20, o3: 30, so2: 5, pm2_5: 75, pm10: 120, nh3: 5 },
      },
    ],
  }),
};

describe('updateWeatherUtil', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.WEATHER_API_KEY = 'test-key';
  });

  it('writes weather and air quality to the same document in one run', async () => {
    mockFetch.mockImplementation(async (url: string) =>
      url.includes('onecall') ? { ok: true, json: async () => weather } : air,
    );

    await updateWeatherUtil();

    expect(mockCollection).toHaveBeenCalledWith('weather');
    expect(mockDoc).toHaveBeenCalledWith('roorkee-in');
    expect(mockSet).toHaveBeenCalledTimes(1);
    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({
        timezone: 'Asia/Kolkata',
        airQuality: expect.objectContaining({ aqi: 150, category: 'Moderate', dominantPollutant: 'pm2_5' }),
      }),
    );
  });

  it('still writes the weather when the air pollution API is down', async () => {
    mockFetch.mockImplementation(async (url: string) =>
      url.includes('onecall')
        ? { ok: true, json: async () => weather }
        : { ok: false, status: 503, statusText: 'Unavailable' },
    );

    await updateWeatherUtil();

    expect(mockSet).toHaveBeenCalledTimes(1);
    const written = mockSet.mock.calls[0][0];
    expect(written.timezone).toBe('Asia/Kolkata');
    expect(written).not.toHaveProperty('airQuality');
  });
});
