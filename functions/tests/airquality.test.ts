import { categoryFor, computeNaqi, fetchAirQuality, subIndex } from '../src/airquality';
import { AirComponents, AirPollutionEntry } from '../src/model/types';

jest.mock('firebase-functions/logger', () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn() }));

const mockFetch = jest.fn();
Object.defineProperty(global, 'fetch', { value: mockFetch, writable: true });

const clean: AirComponents = { co: 200, no: 0, no2: 10, o3: 20, so2: 5, pm2_5: 10, pm10: 20, nh3: 5 };

const reading = (dt: number, overrides: Partial<AirComponents> = {}, owm = 1): AirPollutionEntry => ({
  dt,
  main: { aqi: owm },
  components: { ...clean, ...overrides },
});

/** `count` hourly readings ending at `endDt`, oldest first. */
const hours = (count: number, endDt: number, overrides: Partial<AirComponents> = {}) =>
  Array.from({ length: count }, (_, i) => reading(endDt - (count - 1 - i) * 3600, overrides));

const okResponse = (list: AirPollutionEntry[]) => ({
  ok: true,
  json: async () => ({ coord: { lat: 29.87, lon: 77.88 }, list }),
});

describe('subIndex', () => {
  it('hits the band edges exactly', () => {
    expect(subIndex('pm2_5', 30)).toBe(50);
    expect(subIndex('pm2_5', 60)).toBe(100);
    expect(subIndex('pm2_5', 90)).toBe(200);
    expect(subIndex('pm10', 100)).toBe(100);
    expect(subIndex('pm10', 250)).toBe(200);
    expect(subIndex('co', 2)).toBe(100);
  });

  it('interpolates inside a band', () => {
    // PM2.5 75 µg/m³ is halfway through Moderate (60–90 → 100–200).
    expect(subIndex('pm2_5', 75)).toBe(150);
    // PM10 175 µg/m³ is halfway through Moderate (100–250 → 100–200).
    expect(subIndex('pm10', 175)).toBe(150);
  });

  it('caps at 500 and floors at 0', () => {
    expect(subIndex('pm2_5', 1000)).toBe(500);
    expect(subIndex('pm2_5', 0)).toBe(0);
    expect(subIndex('pm2_5', -3)).toBe(0);
  });
});

describe('categoryFor', () => {
  it('uses the CPCB category names', () => {
    expect(categoryFor(50)).toBe('Good');
    expect(categoryFor(51)).toBe('Satisfactory');
    expect(categoryFor(168)).toBe('Moderate');
    expect(categoryFor(201)).toBe('Poor');
    expect(categoryFor(350)).toBe('Very Poor');
    expect(categoryFor(450)).toBe('Severe');
  });
});

describe('computeNaqi', () => {
  it('uses 24-hour means for PM with a full day of readings', () => {
    // 12 hours at PM2.5 60 and 12 at 90: mean 75 → 150, Moderate.
    const day = [...hours(12, 1_000_000 - 12 * 3600, { pm2_5: 60 }), ...hours(12, 1_000_000, { pm2_5: 90 })];
    const result = computeNaqi(day);
    expect(result.basis).toBe('24h');
    expect(result.aqi).toBe(150);
    expect(result.category).toBe('Moderate');
    expect(result.dominantPollutant).toBe('pm2_5');
    expect(result.dt).toBe(1_000_000);
  });

  it('uses the last 8 hours for ozone', () => {
    // Low ozone for 16 hours, then 8 hours at 168 µg/m³ (top of Moderate → 200).
    const day = [...hours(16, 1_000_000 - 8 * 3600), ...hours(8, 1_000_000, { o3: 168 })];
    const result = computeNaqi(day);
    expect(result.subIndices.o3).toBe(200);
    expect(result.dominantPollutant).toBe('o3');
  });

  it('converts CO from µg/m³ to mg/m³', () => {
    const result = computeNaqi(hours(24, 1_000_000, { co: 2000 }));
    expect(result.subIndices.co).toBe(100);
  });

  it('falls back to the latest reading when history is short', () => {
    const result = computeNaqi([reading(10, { pm2_5: 30 }), reading(20, { pm2_5: 75 })]);
    expect(result.basis).toBe('current');
    expect(result.aqi).toBe(150);
  });

  it('refuses an empty list', () => {
    expect(() => computeNaqi([])).toThrow();
  });
});

describe('fetchAirQuality', () => {
  const now = new Date(1_000_000 * 1000);

  beforeEach(() => mockFetch.mockReset());

  it('combines history and the current reading', async () => {
    mockFetch.mockImplementation(async (url: string) =>
      url.includes('/history')
        ? okResponse(hours(23, 1_000_000 - 3600, { pm2_5: 75 }))
        : okResponse([reading(1_000_000, { pm2_5: 75 }, 3)]),
    );

    const result = await fetchAirQuality(29.8667, 77.8833, 'key', now);

    expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/air_pollution?lat=29.8667&lon=77.8833&appid=key'));
    expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining(`start=${1_000_000 - 86400}&end=1000000`));
    expect(result).toMatchObject({ aqi: 150, basis: '24h', owmIndex: 3, dt: 1_000_000 });
  });

  it('uses the current reading alone when history fails', async () => {
    mockFetch.mockImplementation(async (url: string) =>
      url.includes('/history')
        ? { ok: false, status: 401, statusText: 'Unauthorized' }
        : okResponse([reading(1_000_000, { pm2_5: 75 })]),
    );

    const result = await fetchAirQuality(29.8667, 77.8833, 'key', now);
    expect(result).toMatchObject({ aqi: 150, basis: 'current' });
  });

  it('returns null instead of throwing when the current reading fails', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 500, statusText: 'Server Error' });
    await expect(fetchAirQuality(29.8667, 77.8833, 'key', now)).resolves.toBeNull();
  });

  it('returns null on a malformed response', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ list: [] }) });
    await expect(fetchAirQuality(29.8667, 77.8833, 'key', now)).resolves.toBeNull();
  });
});
