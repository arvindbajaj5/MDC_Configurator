import type { MonthlyClimatePoint, ParcelVertex } from '../types/mdc';

export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;

export interface GeoCityCandidate {
  id: number;
  name: string;
  admin1?: string;
  country?: string;
  country_code?: string;
  latitude: number;
  longitude: number;
  elevation?: number;
  feature_code?: string;
  population?: number;
}

export interface ResolvedCityClimate {
  cityQuery: string;
  lat: number;
  lon: number;
  elevationM: number;
  peakDryBulb: number;
  peakWetBulb: number;
  relHumidityPct: number;
  monthlyClimate: MonthlyClimatePoint[];
  seismicZone: 'Zone II' | 'Zone III' | 'Zone IV' | 'Zone V';
  seismicZFactor: number;
  seismicLabel: string;
  climateSource: string;
  recommendedGasScrubber: boolean;
  isCoastalMarine: boolean;
}

export function synthesizeMonthlyClimate(peakDb = 38.0, peakWb = 29.0, _rh = 72): MonthlyClimatePoint[] {
  const dbOffsets = [-8.5, -6.0, -2.5, 0.0, 0.5, -2.0, -5.0, -5.5, -4.5, -3.5, -5.5, -7.8];
  const wbOffsets = [-7.5, -5.8, -3.2, -1.2, -0.3, 0.0, -0.4, -0.6, -1.0, -2.2, -4.8, -6.8];
  return MONTHS.map((m, idx) => {
    const db = Number(Math.max(12, peakDb + dbOffsets[idx]).toFixed(1));
    const wb = Number(Math.max(8, Math.min(db - 1.5, peakWb + wbOffsets[idx])).toFixed(1));
    return { month: m, dryBulbC: db, wetBulbC: wb };
  });
}

export function computeWetBulbStull(dryBulbC: number, rhPct: number): number {
  const T = dryBulbC;
  const rh = Math.max(5, Math.min(100, rhPct));
  const tw =
    T * Math.atan(0.151977 * Math.pow(rh + 8.313659, 0.5)) +
    Math.atan(T + rh) -
    Math.atan(rh - 1.676331) +
    0.00391838 * Math.pow(rh, 1.5) * Math.atan(0.023101 * rh) -
    4.686035;
  return Number(Math.max(10.0, Math.min(dryBulbC - 2.0, tw)).toFixed(1));
}

export function estimateSummerDesignClimate(lat = 19.0, lon = 73.0, elevationM = 14) {
  const absLat = Math.abs(Number(lat) || 19.0);
  const elev = Math.max(0, Number(elevationM) || 0);
  let peakDb = 41.5 - (elev / 1000) * 6.5;
  if (absLat < 15) peakDb -= 2.0;
  if (elev >= 1200 && elev < 2500) peakDb = Math.max(25.0, Math.min(31.5, peakDb));
  if (elev >= 2500) peakDb = Math.max(18.0, Math.min(25.0, peakDb));
  peakDb = Number(Math.max(18.0, Math.min(47.0, peakDb)).toFixed(1));
  const isCoastal = (lon < 74.5 && lat < 23.5) || (lon > 79.5 && lat < 22.5);
  const rh = elev > 1200 ? 64 : isCoastal ? 76 : 48;
  const peakWb = computeWetBulbStull(peakDb, rh);
  return { peakDryBulb: peakDb, peakWetBulb: peakWb, relHumidityPct: rh };
}

export function classifySeismicZone(
  cityName = '',
  lat = 19.0,
  lon = 73.0
): { zone: 'Zone II' | 'Zone III' | 'Zone IV' | 'Zone V'; zFactor: number; label: string } {
  const c = cityName.toLowerCase();
  if (
    c.includes('guwahati') || c.includes('shillong') || c.includes('imphal') ||
    c.includes('itanagar') || c.includes('kohima') || c.includes('agartala') ||
    c.includes('aizawl') || c.includes('gangtok') || c.includes('bhuj') ||
    c.includes('srinagar') || c.includes('leh') || c.includes('dehradun') ||
    c.includes('shimla') || c.includes('dharamshala') || c.includes('dharamsala') ||
    c.includes('kangra') || c.includes('port blair') || (lon > 89 && lat > 22) || lat > 30
  ) {
    return { zone: 'Zone V', zFactor: 0.36, label: 'IS 1893 Zone V (Very High Seismicity — 0.36g)' };
  }
  if (
    c.includes('delhi') || c.includes('noida') || c.includes('gurgaon') ||
    c.includes('gurugram') || c.includes('patna') || c.includes('lucknow') ||
    c.includes('chandigarh') || c.includes('amritsar') || c.includes('kolkata') ||
    c.includes('siliguri') || lat > 25.5
  ) {
    return { zone: 'Zone IV', zFactor: 0.24, label: 'IS 1893 Zone IV (High Seismicity — 0.24g)' };
  }
  if (
    c.includes('mumbai') || c.includes('thane') || c.includes('navi mumbai') ||
    c.includes('pune') || c.includes('chennai') || c.includes('ahmedabad') ||
    c.includes('surat') || c.includes('bhubaneswar') || c.includes('visakhapatnam') ||
    c.includes('kochi') || c.includes('mangalore')
  ) {
    return { zone: 'Zone III', zFactor: 0.16, label: 'IS 1893 Zone III (Moderate Seismicity — 0.16g)' };
  }
  return { zone: 'Zone II', zFactor: 0.10, label: 'IS 1893 Zone II (Low Seismicity — 0.10g)' };
}

export async function searchCitiesOpenMeteo(rawQuery: string): Promise<GeoCityCandidate[]> {
  const cleanQ = rawQuery.split(',')[0].trim();
  if (!cleanQ) return [];
  const lowerQ = cleanQ.toLowerCase();
  const queries = [cleanQ];
  if (lowerQ === 'dharamshala' || lowerQ === 'dharamsala') {
    queries.push('Dharamsala', 'Dharamshala');
  }
  let combined: GeoCityCandidate[] = [];
  for (const qItem of Array.from(new Set(queries))) {
    const res = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(qItem)}&count=10&language=en&format=json`
    );
    if (!res.ok) continue;
    const data = await res.json();
    if (Array.isArray(data.results)) combined = combined.concat(data.results);
  }
  const seen = new Set<number>();
  const unique = combined.filter(p => {
    if (seen.has(p.id)) return false;
    seen.add(p.id);
    return true;
  });

  const featureRank = (fc = '') => {
    if (fc === 'PPLC') return 5;
    if (fc === 'PPLA') return 4;
    if (fc === 'PPLA2') return 3;
    if (fc === 'PPL' || fc === 'PPLA3') return 2;
    return 1;
  };
  unique.sort((a, b) => {
    const aIn = a.country_code === 'IN' ? 1 : 0;
    const bIn = b.country_code === 'IN' ? 1 : 0;
    if (aIn !== bIn) return bIn - aIn;
    const fDiff = featureRank(b.feature_code) - featureRank(a.feature_code);
    if (fDiff !== 0) return fDiff;
    const pDiff = (b.population || 0) - (a.population || 0);
    if (pDiff !== 0) return pDiff;
    return (a.id || 0) - (b.id || 0);
  });
  return unique;
}

export async function resolveCityClimateERA5(place: GeoCityCandidate): Promise<ResolvedCityClimate> {
  const elev = Math.round(place.elevation || 0);
  const est = estimateSummerDesignClimate(place.latitude, place.longitude, elev);
  const seis = classifySeismicZone(`${place.name} ${place.admin1 || ''}`, place.latitude, place.longitude);

  let finalDb = est.peakDryBulb;
  let finalWb = est.peakWetBulb;
  let finalRh = est.relHumidityPct;
  let climateSource = 'ASHRAE Elevation/Latitude Model';

  try {
    const archUrl = `https://archive-api.open-meteo.com/v1/archive?latitude=${place.latitude.toFixed(4)}&longitude=${place.longitude.toFixed(4)}&start_date=2025-05-01&end_date=2025-06-30&daily=temperature_2m_max,relative_humidity_2m_mean&timezone=auto`;
    const aRes = await fetch(archUrl);
    if (aRes.ok) {
      const aData = await aRes.json();
      const maxTemps: number[] = (aData.daily?.temperature_2m_max || []).filter((v: unknown) => typeof v === 'number');
      const rhs: number[] = (aData.daily?.relative_humidity_2m_mean || []).filter((v: unknown) => typeof v === 'number');
      if (maxTemps.length > 10) {
        maxTemps.sort((a, b) => b - a);
        finalDb = Number(Math.max(18, maxTemps[1] || maxTemps[0]).toFixed(1));
        finalRh = rhs.length ? Math.round(rhs.reduce((a, b) => a + b, 0) / rhs.length) : est.relHumidityPct;
        finalWb = computeWetBulbStull(finalDb, finalRh);
        climateSource = 'Open-Meteo ERA5 Summer Peak';
      }
    }
  } catch {
    // Fallback to elevation/latitude model offline
  }

  return {
    cityQuery: `${place.name}${place.admin1 ? ', ' + place.admin1 : ''}${place.country ? ' (' + place.country + ')' : ''}`,
    lat: Number(place.latitude.toFixed(2)),
    lon: Number(place.longitude.toFixed(2)),
    elevationM: elev,
    peakDryBulb: finalDb,
    peakWetBulb: finalWb,
    relHumidityPct: finalRh,
    monthlyClimate: synthesizeMonthlyClimate(finalDb, finalWb, finalRh),
    seismicZone: seis.zone,
    seismicZFactor: seis.zFactor,
    seismicLabel: seis.label,
    climateSource,
    recommendedGasScrubber: /delhi|noida|gurgaon|gurugram|vadodara|ahmedabad|mumbai|chennai|kolkata/i.test(place.name),
    isCoastalMarine: /mumbai|chennai|kolkata|kochi|mangalore|visakhapatnam|surat/i.test(place.name)
  };
}

export function parseParcelSurveyFile(fileName: string, content: string): ParcelVertex[] | null {
  try {
    const lower = fileName.toLowerCase();
    if (lower.endsWith('.json') || lower.endsWith('.geojson')) {
      const gj = JSON.parse(content);
      const coords = gj.features?.[0]?.geometry?.coordinates?.[0] || gj.geometry?.coordinates?.[0];
      if (!Array.isArray(coords) || coords.length < 3) return null;
      const lon0 = Number(coords[0][0]);
      const lat0 = Number(coords[0][1]);
      const pts = coords.slice(0, coords.length > 3 ? -1 : coords.length).map(([lon, lat]: [number, number]) => ({
        x: Math.round((lon - lon0) * 111320 * Math.cos((lat0 * Math.PI) / 180)),
        y: Math.round((lat - lat0) * 110540)
      }));
      const offX = Math.min(...pts.map(p => p.x));
      const offY = Math.min(...pts.map(p => p.y));
      return pts.map(p => ({ x: p.x - offX, y: p.y - offY }));
    }
    if (lower.endsWith('.kml')) {
      const match = content.match(/<coordinates>([\s\S]*?)<\/coordinates>/i);
      if (!match) return null;
      const rawPts = match[1].trim().split(/\s+/).map(pair => pair.split(',').map(Number));
      if (rawPts.length < 3) return null;
      const lon0 = rawPts[0][0];
      const lat0 = rawPts[0][1];
      const pts = rawPts.slice(0, rawPts.length > 3 ? -1 : rawPts.length).map(([lon, lat]) => ({
        x: Math.round((lon - lon0) * 111320 * Math.cos((lat0 * Math.PI) / 180)),
        y: Math.round((lat - lat0) * 110540)
      }));
      const offX = Math.min(...pts.map(p => p.x));
      const offY = Math.min(...pts.map(p => p.y));
      return pts.map(p => ({ x: p.x - offX, y: p.y - offY }));
    }
  } catch {
    return null;
  }
  return null;
}
