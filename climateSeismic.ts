import type { SeismicZone, SiteClimateProfile } from '../types/schema';

export interface SeismicLookupResult {
  zone: SeismicZone;
  factorZ: number;
  basis: string;
}

const CITY_SEISMIC_MAP: Record<string, SeismicLookupResult> = {
  'navi mumbai': { zone: 'Zone III', factorZ: 0.16, basis: 'IS 1893:2016 Part 1 — Mumbai Metropolitan Region' },
  mumbai: { zone: 'Zone III', factorZ: 0.16, basis: 'IS 1893:2016 Part 1 — Mumbai' },
  pune: { zone: 'Zone III', factorZ: 0.16, basis: 'IS 1893:2016 Part 1 — Pune' },
  delhi: { zone: 'Zone IV', factorZ: 0.24, basis: 'IS 1893:2016 Part 1 — NCT Delhi' },
  noida: { zone: 'Zone IV', factorZ: 0.24, basis: 'IS 1893:2016 Part 1 — NCR Noida' },
  gurugram: { zone: 'Zone IV', factorZ: 0.24, basis: 'IS 1893:2016 Part 1 — NCR Gurugram' },
  chennai: { zone: 'Zone III', factorZ: 0.16, basis: 'IS 1893:2016 Part 1 — Chennai' },
  bengaluru: { zone: 'Zone II', factorZ: 0.10, basis: 'IS 1893:2016 Part 1 — Bengaluru' },
  hyderabad: { zone: 'Zone II', factorZ: 0.10, basis: 'IS 1893:2016 Part 1 — Hyderabad' },
  kolkata: { zone: 'Zone III', factorZ: 0.16, basis: 'IS 1893:2016 Part 1 — Kolkata' },
  ahmedabad: { zone: 'Zone III', factorZ: 0.16, basis: 'IS 1893:2016 Part 1 — Ahmedabad' },
  guwahati: { zone: 'Zone V', factorZ: 0.36, basis: 'IS 1893:2016 Part 1 — Northeast Belt' },
  srinagar: { zone: 'Zone V', factorZ: 0.36, basis: 'IS 1893:2016 Part 1 — Himalayan Arc' },
  bhuj: { zone: 'Zone V', factorZ: 0.36, basis: 'IS 1893:2016 Part 1 — Kutch' }
};

export function lookupIs1893SeismicZone(city: string, lat: number, lon: number): SeismicLookupResult {
  const key = city.trim().toLowerCase();
  if (CITY_SEISMIC_MAP[key]) {
    return CITY_SEISMIC_MAP[key];
  }
  // Geographic heuristic fallback for India lat/lon bounding regions
  if (lat >= 25.5 && lon >= 88.0) {
    return { zone: 'Zone V', factorZ: 0.36, basis: 'IS 1893 Geographic Heuristic (Northeast India)' };
  }
  if (lat >= 30.0) {
    return { zone: 'Zone V', factorZ: 0.36, basis: 'IS 1893 Geographic Heuristic (Himalayan Belt)' };
  }
  if (lat >= 27.0 && lon >= 75.5 && lon <= 84.0) {
    return { zone: 'Zone IV', factorZ: 0.24, basis: 'IS 1893 Geographic Heuristic (Indo-Gangetic Basin)' };
  }
  if (lat <= 17.5 && lon >= 75.0 && lon <= 79.5) {
    return { zone: 'Zone II', factorZ: 0.10, basis: 'IS 1893 Geographic Heuristic (Deccan Shield)' };
  }
  return { zone: 'Zone III', factorZ: 0.16, basis: 'IS 1893 Geographic Heuristic (Moderate Seismic Zone)' };
}

function percentile(sortedAsc: number[], p: number): number {
  if (sortedAsc.length === 0) return 35;
  const idx = Math.min(sortedAsc.length - 1, Math.max(0, Math.floor((p / 100) * sortedAsc.length)));
  return sortedAsc[idx];
}

/**
 * Fetches 3-year historical ERA5 reanalysis weather from Open-Meteo Archive API
 * and computes ASHRAE design dry-bulb, wet-bulb approximation, rainfall & IS 1893 zone.
 */
export async function fetchOpenMeteoEra5Climate(
  city: string,
  state: string,
  latitude: number,
  longitude: number
): Promise<SiteClimateProfile> {
  const endDate = new Date();
  endDate.setDate(endDate.getDate() - 7);
  const startDate = new Date(endDate);
  startDate.setFullYear(startDate.getFullYear() - 3);

  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  const url =
    `https://archive-api.open-meteo.com/v1/archive` +
    `?latitude=${latitude.toFixed(4)}&longitude=${longitude.toFixed(4)}` +
    `&start_date=${fmt(startDate)}&end_date=${fmt(endDate)}` +
    `&daily=temperature_2m_max,temperature_2m_mean,precipitation_sum` +
    `&timezone=Asia%2FKolkata`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Open-Meteo ERA5 API failed with HTTP ${response.status}: ${response.statusText}`);
  }

  const data = (await response.json()) as {
    daily?: {
      temperature_2m_max?: Array<number | null>;
      temperature_2m_mean?: Array<number | null>;
      precipitation_sum?: Array<number | null>;
    };
  };

  const maxTemps = (data.daily?.temperature_2m_max ?? []).filter((v): v is number => typeof v === 'number');
  const meanTemps = (data.daily?.temperature_2m_mean ?? []).filter((v): v is number => typeof v === 'number');
  const precip = (data.daily?.precipitation_sum ?? []).filter((v): v is number => typeof v === 'number');

  if (maxTemps.length < 30) {
    throw new Error('Open-Meteo ERA5 returned insufficient historical daily temperature records.');
  }

  const sortedMax = [...maxTemps].sort((a, b) => a - b);
  const designDryBulbC = Number(percentile(sortedMax, 99.0).toFixed(1));
  const peakAmbientC = Number(sortedMax[sortedMax.length - 1].toFixed(1));
  const annualAvgTempC = Number((meanTemps.reduce((a, b) => a + b, 0) / Math.max(1, meanTemps.length)).toFixed(1));
  const annualRainfallMm = Math.round(precip.reduce((a, b) => a + b, 0) / 3);

  // Coastal monsoon humidity proxy vs dry inland wet-bulb depression
  const isHighRainfall = annualRainfallMm > 1400;
  const wetBulbDepression = isHighRainfall ? 10.5 : 14.2;
  const designWetBulbC = Number(Math.max(18, designDryBulbC - wetBulbDepression).toFixed(1));

  const seismic = lookupIs1893SeismicZone(city, latitude, longitude);

  return {
    city,
    state,
    latitude,
    longitude,
    designDryBulbC,
    designWetBulbC,
    peakAmbientC,
    annualAvgTempC,
    ashraeClass: designDryBulbC > 40 ? 'A3' : 'A2',
    seismicZone: seismic.zone,
    seismicZoneFactorZ: seismic.factorZ,
    annualRainfallMm,
    source: 'Open-Meteo ERA5',
    fetchedAt: new Date().toISOString()
  };
}
