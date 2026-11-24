import React, { useState } from 'react';
import {
  classifySeismicZone,
  parseParcelSurveyFile,
  resolveCityClimateERA5,
  searchCitiesOpenMeteo,
  synthesizeMonthlyClimate,
  type GeoCityCandidate
} from '../engine/climateSeismic';
import type {
  CurrencyCode,
  EngineeringResult,
  ProjectDeal,
  RackSku,
  ShellArchitecture,
  UptimeTier
} from '../types/mdc';

interface Stage1InputsProps {
  project: ProjectDeal;
  eng: EngineeringResult;
  skus: RackSku[];
  onUpdateProject: (patch: Partial<ProjectDeal>) => void;
  onGenerateFirstDraft: () => void;
}

export const Stage1Inputs: React.FC<Stage1InputsProps> = ({
  project,
  eng,
  skus,
  onUpdateProject,
  onGenerateFirstDraft
}) => {
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherMsg, setWeatherMsg] = useState('');
  const [cityMatches, setCityMatches] = useState<GeoCityCandidate[]>([]);
  const [bulkLoadKw, setBulkLoadKw] = useState(220);
  const [parcelStatus, setParcelStatus] = useState('');

  const applyCityCandidate = async (place: GeoCityCandidate) => {
    setWeatherLoading(true);
    try {
      const resolved = await resolveCityClimateERA5(place);
      onUpdateProject({
        cityQuery: resolved.cityQuery,
        lat: resolved.lat,
        lon: resolved.lon,
        elevationM: resolved.elevationM,
        peakDryBulb: resolved.peakDryBulb,
        peakWetBulb: resolved.peakWetBulb,
        relHumidityPct: resolved.relHumidityPct,
        monthlyClimate: resolved.monthlyClimate,
        seismicZone: resolved.seismicZone,
        seismicZFactor: resolved.seismicZFactor,
        seismicLabel: resolved.seismicLabel,
        includeGasScrubber: resolved.recommendedGasScrubber,
        exteriorRalLabel: resolved.isCoastalMarine
          ? 'RAL 5002 Marine C5-M Coating'
          : project.exteriorRalLabel
      });
      setCityMatches([]);
      setWeatherMsg(
        `✓ Resolved ${resolved.cityQuery}: ${resolved.peakDryBulb}°C DB / ${resolved.peakWetBulb}°C WB (${resolved.climateSource}), Elev ${resolved.elevationM}m, ${resolved.seismicLabel}`
      );
    } finally {
      setWeatherLoading(false);
    }
  };

  const handleCitySearch = async () => {
    const rawQ = (project.cityQuery || '').trim();
    if (!rawQ) return;
    setWeatherLoading(true);
    setWeatherMsg('Searching Open-Meteo geocoding & ERA5 summer peak...');
    setCityMatches([]);
    try {
      const candidates = await searchCitiesOpenMeteo(rawQ);
      if (candidates.length === 0) {
        const seis = classifySeismicZone(rawQ, 20, 78);
        onUpdateProject({
          seismicZone: seis.zone,
          seismicZFactor: seis.zFactor,
          seismicLabel: seis.label
        });
        setWeatherMsg(`City not found in geocoder; applied ${seis.label}. Adjust Dry/Wet Bulb manually.`);
        setWeatherLoading(false);
        return;
      }
      await applyCityCandidate(candidates[0]);
      if (candidates.length > 1) setCityMatches(candidates.slice(0, 5));
    } catch {
      const seis = classifySeismicZone(rawQ, 20, 78);
      onUpdateProject({
        seismicZone: seis.zone,
        seismicZFactor: seis.zFactor,
        seismicLabel: seis.label
      });
      setWeatherMsg(`Offline mode: Applied ${seis.label}. Adjust Dry/Wet Bulb manually.`);
      setWeatherLoading(false);
    }
  };

  const updateRackQty = (skuId: string, qty: number) => {
    const next = { ...(project.rackQuantities || {}), [skuId]: Math.max(0, Math.round(qty)) };
    const skuMap = Object.fromEntries(skus.map(s => [s.id, s]));
    let anyRacks = false;
    let anyDlc = false;
    let anyExtCdu = false;
    Object.entries(next).forEach(([id, q]) => {
      const s = skuMap[id];
      if (s && q > 0) {
        anyRacks = true;
        const isDlc = s.coolingType === 'DLC' || (Number(s.liquidSplitPct) || 0) > 0;
        if (isDlc) anyDlc = true;
        if (isDlc && !s.cduIntegrated) anyExtCdu = true;
      }
    });
    onUpdateProject({
      rackQuantities: next,
      includeLiquidLoop: anyDlc,
      includePumpSkids: anyDlc,
      includeWaterTanks: anyDlc,
      includeGlycolDosing: anyDlc,
      includeExtCdu: anyExtCdu,
      includeRoomDehum: anyRacks
    });
  };

  const handleAutoFitRacks = () => {
    const targetKw = (Number(project.targetItMw) || 1.5) * 1000;
    const dlcList = skus.filter(s => s.coolingType === 'DLC');
    const primaryDlc = dlcList[0];
    const secondaryDlc = dlcList[1];
    const acSku = skus.find(s => s.coolingType === 'AC');
    const nextQty: Record<string, number> = {};
    skus.forEach(s => {
      nextQty[s.id] = 0;
    });

    if (primaryDlc) {
      const dlcShareKw = acSku ? targetKw * 0.94 : targetKw;
      const pKw = primaryDlc.peakKw * (primaryDlc.continuousFactor || 0.94);
      if (secondaryDlc && targetKw >= 6000) {
        nextQty[primaryDlc.id] = Math.max(1, Math.round((dlcShareKw * 0.68) / pKw));
        const sKw = secondaryDlc.peakKw * (secondaryDlc.continuousFactor || 0.94);
        nextQty[secondaryDlc.id] = Math.max(1, Math.round((dlcShareKw * 0.32) / sKw));
      } else {
        nextQty[primaryDlc.id] = Math.max(1, Math.round(dlcShareKw / pKw));
      }
    }
    if (acSku) {
      const acShareKw = Math.max(50, targetKw * 0.06);
      const aKw = acSku.peakKw * (acSku.continuousFactor || 0.9);
      nextQty[acSku.id] = Math.max(2, Math.round(acShareKw / aKw));
    }

    const skuMap = Object.fromEntries(skus.map(s => [s.id, s]));
    let anyDlc = false;
    let anyExtCdu = false;
    Object.entries(nextQty).forEach(([id, q]) => {
      const s = skuMap[id];
      if (s && q > 0) {
        if (s.coolingType === 'DLC') anyDlc = true;
        if (s.coolingType === 'DLC' && !s.cduIntegrated) anyExtCdu = true;
      }
    });

    onUpdateProject({
      rackQuantities: nextQty,
      includeLiquidLoop: anyDlc,
      includePumpSkids: anyDlc,
      includeWaterTanks: anyDlc,
      includeGlycolDosing: anyDlc,
      includeExtCdu: anyExtCdu,
      includeRoomDehum: true
    });
  };

  const applyBulkActualLoad = () => {
    const updated: Record<string, number> = { ...(project.actualRackLoads || {}) };
    eng.activeRacks.forEach(rk => {
      updated[rk.instanceKey] = Math.min(rk.peakKw, Math.max(1, Number(bulkLoadKw) || 0));
    });
    onUpdateProject({ loadingMode: 'ActualPerRack', actualRackLoads: updated });
  };

  const loadPresetShape = (shape: string) => {
    if (shape === 'IrregularTrapezoid') {
      onUpdateProject({
        parcelShape: shape,
        parcelVertices: [
          { x: 0, y: 0 },
          { x: 110, y: 0 },
          { x: 128, y: 78 },
          { x: 16, y: 92 }
        ]
      });
    } else if (shape === 'LShaped') {
      onUpdateProject({
        parcelShape: shape,
        parcelVertices: [
          { x: 0, y: 0 },
          { x: 125, y: 0 },
          { x: 125, y: 48 },
          { x: 64, y: 48 },
          { x: 64, y: 95 },
          { x: 0, y: 95 }
        ]
      });
    } else if (shape === 'PentagonPlot') {
      onUpdateProject({
        parcelShape: shape,
        parcelVertices: [
          { x: 10, y: 0 },
          { x: 105, y: 5 },
          { x: 125, y: 55 },
          { x: 68, y: 96 },
          { x: 0, y: 62 }
        ]
      });
    }
  };

  const handleParcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const pts = parseParcelSurveyFile(f.name, String(ev.target?.result || ''));
      if (pts && pts.length >= 3) {
        onUpdateProject({
          parcelShape: f.name.toLowerCase().endsWith('.kml') ? 'CustomKML' : 'CustomGeoJSON',
          plotAreaInput: '',
          parcelVertices: pts
        });
        setParcelStatus(`✓ Imported ${pts.length} boundary vertices from ${f.name}`);
      } else {
        setParcelStatus('Could not parse coordinates from file. Use valid .KML or .GeoJSON.');
      }
    };
    reader.readAsText(f);
  };

  const targetMw = Number(project.targetItMw) || 0;
  const selectedMw = Number((eng.totalDesignContKw / 1000).toFixed(2));
  const diffKw = Math.round(eng.totalDesignContKw - targetMw * 1000);
  const pctMatch = targetMw > 0 ? Math.round((selectedMw / targetMw) * 100) : 100;

  const verts = project.parcelVertices || [];
  const minX = Math.min(...verts.map(v => v.x), 0);
  const maxX = Math.max(...verts.map(v => v.x), 110);
  const minY = Math.min(...verts.map(v => v.y), 0);
  const maxY = Math.max(...verts.map(v => v.y), 90);
  const polyStr = verts.map(v => `${v.x},${v.y}`).join(' ');

  return (
    <div className="space-y-5 text-xs">
      {/* 1. CUSTOMER DETAILS & UPFRONT CONTAINER VS. BnM HALL CHOICE */}
      <section className="bg-white rounded-2xl card-shadow border border-slate-200 p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
          <div>
            <span className="px-2.5 py-0.5 rounded bg-blue-100 text-blue-950 font-black uppercase text-[10px]">
              Stage 01 • Inputs & Mandate
            </span>
            <h2 className="text-lg font-bold navy-text mt-1">
              1. Customer Mandate & Enclosure Architecture (Container vs. BnM Hall Upfront)
            </h2>
          </div>
          <button
            onClick={onGenerateFirstDraft}
            className="px-4 py-2.5 rounded-xl coral-bg hover:opacity-95 text-white font-black text-xs shadow-md"
          >
            ⚡ Generate First-Draft Design →
          </button>
        </div>

        {/* Upfront Container vs BnM Hall Selector Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {(
            [
              {
                val: 'Container' as ShellArchitecture,
                badge: 'MODULAR PREFAB',
                title: 'ISO Corten-A Modular Container Pods',
                desc: 'Factory-integrated 20ft / 40ft / 13.5m Corten-A SPA-H pods on raised RCC flood plinths with M30 seismic shear anchors.'
              },
              {
                val: 'BnM_Hall' as ShellArchitecture,
                badge: 'BRICK & MORTAR',
                title: 'Brick-and-Mortar (BnM) Fire-Rated Technical Hall',
                desc: 'Civil RCC column-grid building (8m×8m grid, 2-hr fire-rated walls, 5.8m clear soffit) housing high-density DLC/AC rows.'
              }
            ] as const
          ).map(opt => {
            const active = project.shellArchitecture === opt.val;
            return (
              <div
                key={opt.val}
                onClick={() => onUpdateProject({ shellArchitecture: opt.val })}
                className={`cursor-pointer p-4 rounded-xl border-2 transition ${
                  active
                    ? 'border-[#002870] bg-blue-50/60 shadow-sm'
                    : 'border-slate-200 bg-slate-50/50 hover:border-slate-400'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-black ${
                      active ? 'navy-bg text-white' : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {opt.badge}
                  </span>
                  <span className="font-black text-sm navy-text">{active ? '● Selected' : '○ Choose'}</span>
                </div>
                <div className="font-bold text-sm navy-text mt-1.5">{opt.title}</div>
                <p className="text-slate-600 mt-1 leading-relaxed">{opt.desc}</p>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-1">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Project / Deal Name</label>
            <input
              type="text"
              value={project.name}
              onChange={e => onUpdateProject({ name: e.target.value })}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 font-bold navy-text"
              placeholder="e.g., 15 MW Sovereign AI Cluster"
            />
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">Customer / Authority</label>
            <input
              type="text"
              value={project.client}
              onChange={e => onUpdateProject({ client: e.target.value })}
              className="w-full border border-slate-300 rounded-lg px-3 py-2"
              placeholder="Enterprise / PSU Authority"
            />
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">Execution Strategy</label>
            <select
              value={project.deploymentMode}
              onChange={e =>
                onUpdateProject({ deploymentMode: e.target.value as 'OneShot' | 'Phased' })
              }
              className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white font-semibold"
            >
              <option value="OneShot">One-Shot Turnkey Execution</option>
              <option value="Phased">Phased Rollout (Day-1 + Day-N)</option>
            </select>
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">Commercial Currency</label>
            <select
              value={project.currency}
              onChange={e => onUpdateProject({ currency: e.target.value as CurrencyCode })}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white font-semibold"
            >
              <option value="INR">INR (₹ Crores / Lakhs)</option>
              <option value="USD">USD ($ Millions)</option>
              <option value="EUR">EUR (€ Millions)</option>
            </select>
          </div>
        </div>
      </section>

      {/* 2. ANY-CITY SEARCH (OPEN-METEO GEOCODING + ERA5 SUMMER PEAK + 12-MONTH ASHRAE + IS 1893 SEISMIC) */}
      <section className="bg-white rounded-2xl card-shadow border border-slate-200 p-5 space-y-3">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[240px]">
            <span className="px-2 py-0.5 rounded bg-sky-100 text-sky-950 font-black uppercase text-[10px]">
              2. Site Microclimate & Seismic
            </span>
            <label className="block font-bold navy-text mt-1 mb-1">
              Any-City Search (Open-Meteo Geocoding + ERA5 Summer Peak + 12-Month ASHRAE + IS 1893 Seismic)
            </label>
            <input
              type="text"
              value={project.cityQuery}
              onChange={e => onUpdateProject({ cityQuery: e.target.value })}
              onKeyDown={e => e.key === 'Enter' && handleCitySearch()}
              placeholder="Enter any city e.g. Navi Mumbai, Guwahati, Leh, Pune, Chennai, Delhi..."
              className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white font-semibold"
            />
          </div>
          <button
            onClick={handleCitySearch}
            disabled={weatherLoading}
            className="px-4 py-2 rounded-lg navy-bg text-white font-bold"
          >
            {weatherLoading ? 'Resolving Climate...' : '🌐 Lookup City Climate & Seismic'}
          </button>
        </div>

        {weatherMsg && (
          <div className="bg-blue-50 border border-blue-200 text-blue-950 font-semibold px-3 py-2 rounded-lg">
            {weatherMsg}
          </div>
        )}

        {cityMatches.length > 1 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-bold text-slate-600">Select exact city match:</span>
            {cityMatches.map(cm => (
              <button
                key={cm.id}
                onClick={() => applyCityCandidate(cm)}
                className="px-2.5 py-1 rounded-lg bg-slate-50 border border-blue-300 hover:bg-blue-600 hover:text-white font-semibold navy-text"
              >
                {cm.name}
                {cm.admin1 ? `, ${cm.admin1}` : ''} ({cm.country_code}) • {Math.round(cm.elevation || 0)}m
              </button>
            ))}
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div>
            <label className="block text-slate-500 font-bold mb-1">Peak Dry Bulb (°C)</label>
            <input
              type="number"
              step="0.5"
              value={project.peakDryBulb}
              onChange={e => {
                const db = Number(e.target.value);
                onUpdateProject({
                  peakDryBulb: db,
                  monthlyClimate: synthesizeMonthlyClimate(db, project.peakWetBulb, project.relHumidityPct)
                });
              }}
              className="w-full border rounded-lg px-2.5 py-1.5 font-bold"
            />
          </div>
          <div>
            <label className="block text-slate-500 font-bold mb-1">Peak Wet Bulb (°C)</label>
            <input
              type="number"
              step="0.5"
              value={project.peakWetBulb}
              onChange={e => {
                const wb = Number(e.target.value);
                onUpdateProject({
                  peakWetBulb: wb,
                  monthlyClimate: synthesizeMonthlyClimate(project.peakDryBulb, wb, project.relHumidityPct)
                });
              }}
              className="w-full border rounded-lg px-2.5 py-1.5 font-bold"
            />
          </div>
          <div>
            <label className="block text-slate-500 font-bold mb-1">Elevation (m ASL)</label>
            <input
              type="number"
              value={project.elevationM}
              onChange={e => onUpdateProject({ elevationM: Number(e.target.value) })}
              className="w-full border rounded-lg px-2.5 py-1.5 font-bold"
            />
          </div>
          <div>
            <label className="block text-slate-500 font-bold mb-1">IS 1893 Seismic Zone</label>
            <select
              value={project.seismicZone}
              onChange={e => {
                const z = e.target.value as ProjectDeal['seismicZone'];
                const zMap = { 'Zone II': 0.1, 'Zone III': 0.16, 'Zone IV': 0.24, 'Zone V': 0.36 };
                onUpdateProject({
                  seismicZone: z,
                  seismicZFactor: zMap[z],
                  seismicLabel: `IS 1893 ${z} (${zMap[z]}g)`
                });
              }}
              className="w-full border rounded-lg px-2.5 py-1.5 bg-white font-bold"
            >
              <option>Zone II</option>
              <option>Zone III</option>
              <option>Zone IV</option>
              <option>Zone V</option>
            </select>
          </div>
          <div>
            <label className="block text-slate-500 font-bold mb-1">Site Water Availability</label>
            <select
              value={project.waterAvailability}
              onChange={e =>
                onUpdateProject({ waterAvailability: e.target.value as ProjectDeal['waterAvailability'] })
              }
              className="w-full border rounded-lg px-2.5 py-1.5 bg-white font-bold"
            >
              <option value="Abundant">Abundant Water</option>
              <option value="Constrained">Constrained / Seasonal</option>
              <option value="Zero">Zero-Water Dry Site</option>
            </select>
          </div>
        </div>

        {/* Compact 12-Month ASHRAE Preview Strip */}
        <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-12 gap-1.5 pt-1 text-center">
          {eng.monthlyProfile.map(m => (
            <div
              key={m.month}
              className={`p-1.5 rounded border text-[10px] ${
                m.mode === 'FreeCooling'
                  ? 'bg-emerald-50 border-emerald-200'
                  : m.mode === 'AdiabaticSpray'
                    ? 'bg-amber-50 border-amber-200'
                    : 'bg-red-50 border-red-200'
              }`}
            >
              <div className="font-black">{m.month}</div>
              <div>{m.dryBulbC}°/{m.wetBulbC}°</div>
              <div className="font-bold text-slate-600">{m.monthlyWaterKl}kL</div>
            </div>
          ))}
        </div>
      </section>

      {/* 3. BOTTOM-UP RACK QUANTITIES (MW SANITY CHECK, AUTO-FIT, GROWTH %, MODE A/B, MAX INLET TEMP) */}
      <section className="bg-white rounded-2xl card-shadow border border-slate-200 p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
          <div>
            <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-950 font-black uppercase text-[10px]">
              3. Bottom-Up IT Rack Mix & Thermal Envelope
            </span>
            <h3 className="text-base font-bold navy-text mt-1">
              Master Rack SKUs, Target MW Sanity Check, Growth Reserve & Mode A/B Loading
            </h3>
          </div>

          {/* Target IT MW + Auto-Fit */}
          <div className="flex flex-wrap items-center gap-2 bg-blue-50 border border-blue-200 px-3 py-2 rounded-xl">
            <label className="font-bold navy-text">Target IT Load (MW):</label>
            <input
              type="number"
              step="0.1"
              min="0"
              value={project.targetItMw || ''}
              onChange={e => onUpdateProject({ targetItMw: Number(e.target.value) })}
              placeholder="e.g. 15.0"
              className="w-24 border border-blue-300 rounded px-2 py-1 bg-white font-black navy-text"
            />
            <button
              onClick={handleAutoFitRacks}
              className="px-3 py-1 rounded-lg navy-bg text-white font-bold"
              title="Automatically balance DLC & AC racks from master SKUs to match Target MW"
            >
              ✨ Auto-Fit Racks
            </button>
          </div>
        </div>

        {/* Live MW Sanity Check Banner */}
        <div
          className={`p-3 rounded-xl border flex flex-wrap items-center justify-between gap-2 ${
            targetMw > 0 && Math.abs(diffKw) > targetMw * 100
              ? 'bg-amber-50 border-amber-300 text-amber-950'
              : 'bg-emerald-50 border-emerald-300 text-emerald-950'
          }`}
        >
          <div>
            <strong>MW Sanity Check:</strong> Bottom-Up Racks ={' '}
            <strong>
              {selectedMw} MW Continuous ({(eng.totalNameplatePeakKw / 1000).toFixed(2)} MW Peak)
            </strong>{' '}
            across <strong>{eng.activeRacks.length} Racks</strong> ({eng.dlcRacks.length} DLC + {eng.acRacks.length} AC)
            {targetMw > 0 && (
              <span>
                {' '}
                • Target: <strong>{targetMw} MW</strong> ({pctMatch}% match, delta{' '}
                <strong>
                  {diffKw >= 0 ? '+' : ''}
                  {diffKw} kW
                </strong>
                )
              </span>
            )}
          </div>
          <div className="font-bold">
            Governing Max Inlet Temp: <span className="navy-text">{eng.governingMaxInletTempC}°C</span> (Supply:{' '}
            <span className={eng.inletTempViolation ? 'text-red-700 underline' : 'text-emerald-800'}>
              {eng.effectiveSupplyTempC}°C
            </span>
            )
          </div>
        </div>

        {/* Rack Quantity Cards from Master skus[] */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {skus.map(sku => {
            const qty = Number(project.rackQuantities?.[sku.id] || 0);
            const isDlc = sku.coolingType === 'DLC';
            return (
              <div
                key={sku.id}
                className={`p-3.5 rounded-xl border transition ${
                  qty > 0 ? 'border-blue-500 bg-blue-50/40' : 'border-slate-200 bg-slate-50/50'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-black ${
                        isDlc ? 'bg-blue-700 text-white' : 'bg-amber-600 text-white'
                      }`}
                    >
                      {sku.coolingType} • {sku.peakKw} kW Peak
                    </span>
                    <div className="font-bold navy-text mt-1">{sku.name}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      {sku.standard} • {sku.widthMm}×{sku.depthMm}×{sku.heightMm}mm • Max Inlet:{' '}
                      <strong>{sku.maxInletTempC}°C</strong>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => updateRackQty(sku.id, qty - 1)}
                      className="w-7 h-7 rounded bg-white border border-slate-300 font-black"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min={0}
                      value={qty}
                      onChange={e => updateRackQty(sku.id, Number(e.target.value))}
                      className="w-14 text-center border border-slate-300 rounded py-1 bg-white font-black navy-text"
                    />
                    <button
                      onClick={() => updateRackQty(sku.id, qty + 1)}
                      className="w-7 h-7 rounded navy-bg text-white font-black"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Growth Reserve %, Mode A/B Loading & Governing Max Inlet Temp */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
          <div>
            <label className="block font-bold navy-text mb-1">Future Growth Reserve (% White-Space)</label>
            <input
              type="number"
              min={0}
              max={50}
              step={5}
              value={project.futureGrowthReservePct}
              onChange={e => onUpdateProject({ futureGrowthReservePct: Number(e.target.value) })}
              className="w-full border rounded-lg px-3 py-1.5 bg-white font-bold"
            />
            <span className="text-[11px] text-slate-500 block mt-0.5">
              Reserves {Math.round(eng.futureGrowthAreaSqm)} m² expansion bay inside pods/hall.
            </span>
          </div>

          <div>
            <label className="block font-bold navy-text mb-1">Rack Power Loading Mode (Mode A vs. Mode B)</label>
            <select
              value={project.loadingMode}
              onChange={e =>
                onUpdateProject({ loadingMode: e.target.value as 'Standard' | 'ActualPerRack' })
              }
              className="w-full border rounded-lg px-3 py-1.5 bg-white font-bold"
            >
              <option value="Standard">Mode A: Standard Nameplate & Continuous TDP</option>
              <option value="ActualPerRack">Mode B: Custom Actual kW Per Rack Instance</option>
            </select>
            {project.loadingMode === 'ActualPerRack' && eng.activeRacks.length > 0 && (
              <div className="flex items-center gap-1.5 mt-1.5">
                <input
                  type="number"
                  value={bulkLoadKw}
                  onChange={e => setBulkLoadKw(Number(e.target.value))}
                  className="w-20 border rounded px-2 py-1 bg-white font-bold"
                />
                <button
                  onClick={applyBulkActualLoad}
                  className="px-2.5 py-1 rounded navy-bg text-white font-bold text-[11px]"
                >
                  Apply kW to All ({eng.activeRacks.length})
                </button>
              </div>
            )}
          </div>

          <div>
            <label className="block font-bold navy-text mb-1">
              Coolant Supply Temp (°C) — Governing Limit: {eng.governingMaxInletTempC}°C
            </label>
            <input
              type="number"
              min={18}
              max={45}
              placeholder={`Auto (${eng.governingMaxInletTempC}°C from active SKUs)`}
              value={project.targetSupplyTempC}
              onChange={e =>
                onUpdateProject({ targetSupplyTempC: e.target.value === '' ? '' : Number(e.target.value) })
              }
              className="w-full border rounded-lg px-3 py-1.5 bg-white font-bold"
            />
            <span className="text-[11px] text-slate-500 block mt-0.5">
              Leave blank to auto-track lowest active DLC rack ceiling ({eng.governingMaxInletTempC}°C).
            </span>
          </div>
        </div>
      </section>

      {/* 4. PLOT AREA / SHAPE (.KML / .GEOJSON), UPTIME TIER, STATUTORY RULEBOOK & AMC HORIZON */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Plot Area & Shape */}
        <section className="bg-white rounded-2xl card-shadow border border-slate-200 p-5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-950 font-black uppercase text-[10px]">
                4. Land Parcel & Survey Shape
              </span>
              <h3 className="text-base font-bold navy-text mt-1">Plot Area & Shape (.KML / .GeoJSON)</h3>
            </div>
            <div className="flex flex-wrap gap-1">
              <button
                onClick={() => loadPresetShape('IrregularTrapezoid')}
                className="px-2 py-1 rounded border text-[11px] font-bold"
              >
                Trapezoid
              </button>
              <button
                onClick={() => loadPresetShape('LShaped')}
                className="px-2 py-1 rounded border text-[11px] font-bold"
              >
                L-Shape
              </button>
              <button
                onClick={() => loadPresetShape('PentagonPlot')}
                className="px-2 py-1 rounded border text-[11px] font-bold"
              >
                5-Sided
              </button>
              <label className="px-2.5 py-1 rounded navy-bg text-white text-[11px] font-bold cursor-pointer">
                Upload .KML / .GeoJSON
                <input type="file" accept=".kml,.json,.geojson" onChange={handleParcelUpload} className="hidden" />
              </label>
            </div>
          </div>

          {parcelStatus && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 px-3 py-1.5 rounded font-semibold">
              {parcelStatus}
            </div>
          )}

          <div className="grid grid-cols-3 gap-2.5">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Plot Size</label>
              <input
                type="number"
                step="0.1"
                value={project.plotAreaInput}
                onChange={e => onUpdateProject({ plotAreaInput: e.target.value })}
                className="w-full border rounded-lg px-2.5 py-1.5 font-bold"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Unit</label>
              <select
                value={project.plotAreaUnit}
                onChange={e =>
                  onUpdateProject({ plotAreaUnit: e.target.value as 'acres' | 'sqm' })
                }
                className="w-full border rounded-lg px-2.5 py-1.5 bg-white font-bold"
              >
                <option value="acres">Acres</option>
                <option value="sqm">Square Meters (m²)</option>
              </select>
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Fire Setback (m)</label>
              <input
                type="number"
                step="0.5"
                value={project.setbackMeters}
                onChange={e => onUpdateProject({ setbackMeters: Number(e.target.value) })}
                className="w-full border rounded-lg px-2.5 py-1.5 font-bold"
              />
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-2 flex items-center justify-between">
            <div className="space-y-1">
              <div>
                Gross Plot: <strong>{Math.round(eng.grossPlotSqm).toLocaleString()} m²</strong> (
                {(eng.grossPlotSqm / 4046.8564).toFixed(2)} Acres)
              </div>
              <div>
                Est. Campus Utilization: <strong>{eng.plotUtilizationPct}%</strong> of Net Buildable Area
              </div>
            </div>
            <svg
              viewBox={`${minX - 10} ${minY - 10} ${maxX - minX + 20} ${maxY - minY + 20}`}
              className="w-36 h-24 bg-white border border-slate-300 rounded"
            >
              <polygon points={polyStr} fill="#DBEAFE" stroke="#002870" strokeWidth="2" />
            </svg>
          </div>
        </section>

        {/* Uptime Tier, Statutory Rulebook & AMC Horizon */}
        <section className="bg-white rounded-2xl card-shadow border border-slate-200 p-5 space-y-3">
          <div>
            <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-950 font-black uppercase text-[10px]">
              5. Uptime Tier, Statutory Rulebook & AMC Horizon
            </span>
            <h3 className="text-base font-bold navy-text mt-1">Availability, Compliance & Lifecycle O&M Scope</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Uptime Redundancy Tier</label>
              <select
                value={project.uptimeTier}
                onChange={e => onUpdateProject({ uptimeTier: e.target.value as UptimeTier })}
                className="w-full border rounded-lg px-2.5 py-1.5 bg-white font-bold navy-text"
              >
                <option value="None">None (Basic N / Pilot)</option>
                <option value="Tier II">Tier II (Partial Redundancy)</option>
                <option value="Tier III">Tier III (N+1 Concurrently Maintainable)</option>
                <option value="Tier IV">Tier IV (2N Fault-Tolerant)</option>
              </select>
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Statutory & Safety Rulebook</label>
              <select
                value={project.regulatoryCode}
                onChange={e => onUpdateProject({ regulatoryCode: e.target.value })}
                className="w-full border rounded-lg px-2.5 py-1.5 bg-white font-bold"
              >
                <option value="India BIS / CEA / CPCB IV+ / PESO / NBC / IS 1893">
                  India BIS / CEA / CPCB IV+ / PESO / NBC / IS 1893
                </option>
                <option value="TIA-942-C Rated + NFPA 75/76 + ASHRAE TC 9.9">
                  TIA-942-C Rated + NFPA 75/76 + ASHRAE TC 9.9
                </option>
                <option value="No Specific Compliance Mandates (Pilot)">
                  No Specific Compliance Mandates (Pilot)
                </option>
              </select>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="inline-flex items-center gap-2 font-bold navy-text cursor-pointer">
                <input
                  type="checkbox"
                  checked={project.includeAmcContract}
                  onChange={e => onUpdateProject({ includeAmcContract: e.target.checked })}
                  className="w-4 h-4"
                />
                Include Turnkey Multi-Year AMC & Resident O&M
              </label>
              <span className="font-bold text-slate-600">Horizon: {project.amcYears} Years</span>
            </div>

            {project.includeAmcContract && (
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] text-slate-500">AMC Horizon (Yrs)</label>
                  <input
                    type="number"
                    min={1}
                    max={15}
                    value={project.amcYears}
                    onChange={e => onUpdateProject({ amcYears: Number(e.target.value) })}
                    className="w-full border rounded px-2 py-1 bg-white font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500">AMC Rate (% CapEx/yr)</label>
                  <input
                    type="number"
                    step="0.5"
                    min={1}
                    max={12}
                    value={project.amcPctOfCapex}
                    onChange={e => onUpdateProject({ amcPctOfCapex: Number(e.target.value) })}
                    className="w-full border rounded px-2 py-1 bg-white font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500">Resident Staff</label>
                  <input
                    type="number"
                    min={1}
                    max={60}
                    value={project.residentHeadcount}
                    onChange={e => onUpdateProject({ residentHeadcount: Number(e.target.value) })}
                    className="w-full border rounded px-2 py-1 bg-white font-bold"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="pt-1 flex justify-end">
            <button
              onClick={onGenerateFirstDraft}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl coral-bg hover:opacity-95 text-white font-black text-xs shadow-lg"
            >
              ⚡ Generate First-Draft Design (Stage 2) →
            </button>
          </div>
        </section>
      </div>
    </div>
  );
};
