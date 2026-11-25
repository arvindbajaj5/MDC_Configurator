import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Plus, Sparkles, X } from 'lucide-react';
import {
  classifySeismicZone,
  parseParcelSurveyFile,
  resolveCityClimateERA5,
  searchCitiesOpenMeteo,
  synthesizeMonthlyClimate,
  type GeoCityCandidate
} from '../engine/climateSeismic';
import type {
  ContainerSpec,
  CoolingType,
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
  containerCatalog: ContainerSpec[];
  onUpdateProject: (patch: Partial<ProjectDeal>) => void;
  onAddRackSku: (newSku: RackSku, initialQty: number) => void;
  onGenerateFirstDraft: () => void;
}

const WIZARD_STEPS = [
  { idx: 0, label: '1. Mandate & Site Climate', sub: 'Customer, Container vs. BnM, City & Seismic' },
  { idx: 1, label: '2. Thermal & Rack Mix', sub: 'Catalog Racks, Custom SKUs & Target MW' },
  { idx: 2, label: '3. Container / Hall Baseline', sub: 'Enclosure Preset, Sizing & Topology' },
  { idx: 3, label: '4. Plot, Tier & AMC', sub: 'Land Parcel, Availability & O&M Scope' }
] as const;

export const Stage1Inputs: React.FC<Stage1InputsProps> = ({
  project,
  eng,
  skus,
  containerCatalog,
  onUpdateProject,
  onAddRackSku,
  onGenerateFirstDraft
}) => {
  const [step, setStep] = useState<number>(0);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherMsg, setWeatherMsg] = useState('');
  const [cityMatches, setCityMatches] = useState<GeoCityCandidate[]>([]);
  const [bulkLoadKw, setBulkLoadKw] = useState(220);
  const [parcelStatus, setParcelStatus] = useState('');

  // Inline "+ Add Custom Rack SKU" Modal State (Future-Proof Thermal & Rack Selector)
  const [showCustomRackModal, setShowCustomRackModal] = useState(false);
  const [customRackForm, setCustomRackForm] = useState({
    name: '',
    coolingType: 'DLC' as CoolingType,
    standard: 'OCP ORv3 / Custom',
    peakKw: 350,
    continuousFactor: 0.95,
    operatingUtilFactor: 0.85,
    liquidSplitPct: 92,
    maxInletTempC: 35,
    cduIntegrated: false,
    widthMm: 900,
    depthMm: 1200,
    heightMm: 2500,
    weightKg: 2100,
    flowLpmPerKw: 1.48,
    reqDeltaPBar: 2.0,
    initialQty: 4
  });

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

  const handleSaveCustomRack = () => {
    const label = customRackForm.name.trim() || `${customRackForm.peakKw} kW ${customRackForm.coolingType} Custom Rack`;
    const isDlc = customRackForm.coolingType === 'DLC';
    const created: RackSku = {
      id: `sku-custom-${Date.now()}`,
      name: label,
      coolingType: customRackForm.coolingType,
      standard: customRackForm.standard || 'Custom Rack',
      heightMm: Number(customRackForm.heightMm) || 2500,
      widthMm: Number(customRackForm.widthMm) || 900,
      depthMm: Number(customRackForm.depthMm) || 1200,
      weightKg: Number(customRackForm.weightKg) || 1800,
      peakKw: Number(customRackForm.peakKw) || 200,
      continuousFactor: Number(customRackForm.continuousFactor) || 0.95,
      operatingUtilFactor: Number(customRackForm.operatingUtilFactor) || 0.85,
      liquidSplitPct: isDlc ? Number(customRackForm.liquidSplitPct) || 90 : 0,
      maxInletTempC: Number(customRackForm.maxInletTempC) || (isDlc ? 35 : 27),
      cduIntegrated: isDlc ? customRackForm.cduIntegrated : false,
      cduTowerHeightMm: isDlc ? 2200 : 0,
      cduTowerWidthMm: isDlc ? 600 : 0,
      cduTowerDepthMm: isDlc ? 1200 : 0,
      flowLpmPerKw: isDlc ? Number(customRackForm.flowLpmPerKw) || 1.45 : 0,
      reqDeltaPBar: isDlc ? Number(customRackForm.reqDeltaPBar) || 1.9 : 0,
      mawpBar: isDlc ? 4.2 : 0,
      powerEntry: 'Top',
      plumbingEntry: isDlc ? 'Bottom' : 'None'
    };
    onAddRackSku(created, Math.max(0, Math.round(Number(customRackForm.initialQty) || 0)));
    setShowCustomRackModal(false);
    setCustomRackForm(prev => ({ ...prev, name: '' }));
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
    const updated: Record<string, number | string> = { ...(project.actualRackLoads || {}) };
    eng.activeRacks.forEach(rk => {
      updated[rk.instanceKey] = Math.min(rk.peakKw, Math.max(1, Number(bulkLoadKw) || 0));
    });
    onUpdateProject({ loadingMode: 'ActualPerRack', actualRackLoads: updated });
  };

  const applyContainerPreset = (catalogId: string) => {
    if (catalogId === 'custom') {
      onUpdateProject({ containerCatalogId: 'custom', bespokeContainerPriceInr: '' });
      return;
    }
    const spec = containerCatalog.find(c => c.id === catalogId);
    if (!spec) return;
    onUpdateProject({
      containerCatalogId: spec.id,
      containerLengthMode:
        spec.lengthMm <= 6200 ? 'ISO20' : spec.lengthMm <= 12250 ? 'ISO40' : 'CustomOptimum',
      maxCustomLengthMm: spec.lengthMm,
      containerWidthMm: spec.widthMm,
      containerHeightMm: spec.heightMm,
      metallurgy: spec.metallurgy,
      wallThicknessMm: spec.wallMm,
      roofThicknessMm: spec.roofMm,
      floorThicknessMm: spec.floorMm,
      plenumHeightMm: spec.plenumMm,
      topClearanceMm: spec.topClearanceMm,
      bespokeContainerPriceInr: spec.baseCostInr
    });
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
    e.target.value = '';
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
    <div className="space-y-4 text-xs">
      {/* Guided Wizard Stepper Card */}
      <div className="bg-white rounded-2xl card-shadow border border-slate-200 p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="px-2.5 py-0.5 rounded bg-blue-100 text-blue-950 font-black uppercase text-[10px]">
              Stage 01 • Guided Requirements Wizard
            </span>
            <h2 className="text-lg font-bold navy-text mt-1">
              {WIZARD_STEPS[step].label} — {project.name}
            </h2>
          </div>
          <button
            onClick={onGenerateFirstDraft}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl coral-bg hover:opacity-95 text-white font-black shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Generate First-Draft Design →
          </button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          {WIZARD_STEPS.map(ws => {
            const active = step === ws.idx;
            const completed = ws.idx < step;
            return (
              <button
                key={ws.idx}
                onClick={() => setStep(ws.idx)}
                className={`p-2.5 rounded-xl border text-left transition ${
                  active
                    ? 'navy-bg text-white border-[#002870] shadow-sm'
                    : completed
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center justify-between gap-1 font-bold">
                  <span className="truncate">{ws.label}</span>
                  {completed && <Check className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />}
                </div>
                <div className={`text-[10px] truncate mt-0.5 ${active ? 'text-amber-300' : 'text-slate-500'}`}>
                  {ws.sub}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* STEP 0: MANDATE, ENCLOSURE CHOICE & SITE CLIMATE/SEISMIC */}
      {step === 0 && (
        <div className="space-y-4">
          <section className="bg-white rounded-2xl card-shadow border border-slate-200 p-5 space-y-4">
            <h3 className="text-base font-bold navy-text">Customer Mandate & Enclosure Architecture</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {(
                [
                  {
                    val: 'Container' as ShellArchitecture,
                    badge: 'MODULAR PREFAB',
                    title: 'ISO Corten-A Modular Container Pods',
                    desc: 'Factory-integrated 20ft / 40ft / 13.5m Corten-A pods on raised RCC flood plinths with M30 seismic anchors.'
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
                      <span className="font-black text-xs navy-text">{active ? '● Selected' : '○ Choose'}</span>
                    </div>
                    <div className="font-bold text-sm navy-text mt-1.5">{opt.title}</div>
                    <p className="text-slate-600 mt-1 leading-relaxed">{opt.desc}</p>
                  </div>
                );
              })}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Project / Deal Name</label>
                <input
                  type="text"
                  value={project.name}
                  onChange={e => onUpdateProject({ name: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 font-bold navy-text"
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

          <section className="bg-white rounded-2xl card-shadow border border-slate-200 p-5 space-y-3">
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex-1 min-w-[240px]">
                <label className="block font-bold navy-text mb-1">
                  Any-City Search (Open-Meteo ERA5 Summer Peak + 12-Month ASHRAE + IS 1893 Seismic)
                </label>
                <input
                  type="text"
                  value={project.cityQuery}
                  onChange={e => onUpdateProject({ cityQuery: e.target.value })}
                  onKeyDown={e => e.key === 'Enter' && handleCitySearch()}
                  placeholder="Enter any city e.g. Navi Mumbai, Guwahati, Leh, Pune, Chennai..."
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white font-semibold"
                />
              </div>
              <button
                onClick={handleCitySearch}
                disabled={weatherLoading}
                className="px-4 py-2 rounded-xl navy-bg text-white font-bold"
              >
                {weatherLoading ? 'Resolving...' : 'Lookup City Climate & Seismic'}
              </button>
            </div>

            {weatherMsg && (
              <div className="bg-blue-50 border border-blue-200 text-blue-950 font-semibold px-3 py-2 rounded-lg">
                {weatherMsg}
              </div>
            )}

            {cityMatches.length > 1 && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="font-bold text-slate-600">Select exact match:</span>
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
        </div>
      )}

      {/* STEP 1: CATALOG-DRIVEN THERMAL & RACK MIX + INLINE CUSTOM RACK SKU */}
      {step === 1 && (
        <section className="bg-white rounded-2xl card-shadow border border-slate-200 p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
            <div>
              <h3 className="text-base font-bold navy-text">
                Catalog-Driven Rack Mix & Thermal Envelope ({skus.length} Active SKUs)
              </h3>
              <p className="text-slate-500">
                Racks load dynamically from your Master Rack Catalog. Add any new GPU/DLC/AC rack type on the fly below.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-xl">
                <label className="font-bold navy-text">Target IT (MW):</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={project.targetItMw || ''}
                  onChange={e => onUpdateProject({ targetItMw: Number(e.target.value) })}
                  placeholder="15.0"
                  className="w-20 border border-blue-300 rounded px-2 py-1 bg-white font-black navy-text"
                />
                <button
                  onClick={handleAutoFitRacks}
                  className="px-2.5 py-1 rounded-lg navy-bg text-white font-bold"
                >
                  Auto-Fit
                </button>
              </div>
              <button
                onClick={() => setShowCustomRackModal(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl coral-bg text-white font-bold shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Custom Rack SKU
              </button>
            </div>
          </div>

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
                        {isDlc && (
                          <span> • {sku.cduIntegrated ? 'Int. CDU' : 'Ext. White-Space CDU'}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
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
              <label className="block font-bold navy-text mb-1">Rack Power Loading Mode (Mode A / Mode B)</label>
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
                Coolant Supply Temp (°C) — Limit: {eng.governingMaxInletTempC}°C
              </label>
              <input
                type="number"
                min={18}
                max={45}
                placeholder={`Auto (${eng.governingMaxInletTempC}°C)`}
                value={project.targetSupplyTempC}
                onChange={e =>
                  onUpdateProject({ targetSupplyTempC: e.target.value === '' ? '' : Number(e.target.value) })
                }
                className="w-full border rounded-lg px-3 py-1.5 bg-white font-bold"
              />
              <span className="text-[11px] text-slate-500 block mt-0.5">
                Blank auto-tracks lowest active DLC rack ceiling ({eng.governingMaxInletTempC}°C).
              </span>
            </div>
          </div>
        </section>
      )}

      {/* STEP 2: CONTAINER / HALL BASELINE */}
      {step === 2 && (
        <section className="bg-white rounded-2xl card-shadow border border-slate-200 p-5 space-y-4">
          <div>
            <h3 className="text-base font-bold navy-text">
              {project.shellArchitecture === 'BnM_Hall'
                ? 'Brick-and-Mortar (BnM) Structural Hall Baseline'
                : 'Modular Container Sizing, Catalog Preset & Hall Topology'}
            </h3>
            <p className="text-slate-500">
              Set the starting enclosure geometry here; fine-tune metallurgy, PAC/CDUs, and branding anytime inside Module 2 (Container & White-Space).
            </p>
          </div>

          {project.shellArchitecture === 'BnM_Hall' ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div>
                <label className="block font-bold text-slate-700 mb-1">BnM Structural Column Grid</label>
                <select
                  value={project.bnmColumnGridM}
                  onChange={e => onUpdateProject({ bnmColumnGridM: e.target.value })}
                  className="w-full border rounded-lg px-2.5 py-2 bg-white font-bold"
                >
                  <option value="8m x 8m">8m × 8m Wide-Span AI Hall Grid</option>
                  <option value="6m x 6m">6m × 6m Standard RCC Column Grid</option>
                </select>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">RCC Slab Thickness (mm)</label>
                <input
                  type="number"
                  step={25}
                  value={project.bnmSlabThicknessMm}
                  onChange={e => onUpdateProject({ bnmSlabThicknessMm: Number(e.target.value) })}
                  className="w-full border rounded-lg px-2.5 py-2 bg-white font-bold"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Clear Slab-to-Soffit Height (m)</label>
                <input
                  type="number"
                  step={0.2}
                  value={project.bnmClearSoffitM}
                  onChange={e => onUpdateProject({ bnmClearSoffitM: Number(e.target.value) })}
                  className="w-full border rounded-lg px-2.5 py-2 bg-white font-bold"
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Standard Container Catalog Preset</label>
                <select
                  value={project.containerCatalogId}
                  onChange={e => applyContainerPreset(e.target.value)}
                  className="w-full border rounded-lg px-2.5 py-2 bg-white font-bold navy-text"
                >
                  <option value="custom">Custom Parametric Sizing</option>
                  {containerCatalog.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Container Sizing Mode</label>
                <select
                  value={project.containerLengthMode}
                  onChange={e =>
                    onUpdateProject({
                      containerLengthMode: e.target.value as ProjectDeal['containerLengthMode']
                    })
                  }
                  className="w-full border rounded-lg px-2.5 py-2 bg-white font-bold"
                >
                  <option value="CustomOptimum">Custom Optimum (up to 13.5m)</option>
                  <option value="ISO40">40 ft ISO High-Cube (12.19m)</option>
                  <option value="ISO20">20 ft ISO Edge Pod (6.06m)</option>
                  <option value="AllInOne">All-in-One Integrated Pod (12.19m)</option>
                </select>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Hall Topology</label>
                <select
                  value={project.hallTopology}
                  onChange={e =>
                    onUpdateProject({ hallTopology: e.target.value as ProjectDeal['hallTopology'] })
                  }
                  className="w-full border rounded-lg px-2.5 py-2 bg-white font-bold"
                >
                  <option value="GangedLinear">Ganged Linear Modular Hall</option>
                  <option value="GangedUShaped">Ganged U-Shaped Courtyard</option>
                  <option value="Isolated">Isolated Standalone Pods</option>
                </select>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Rack Packing Strategy</label>
                <select
                  value={project.packingStrategy}
                  onChange={e =>
                    onUpdateProject({ packingStrategy: e.target.value as ProjectDeal['packingStrategy'] })
                  }
                  className="w-full border rounded-lg px-2.5 py-2 bg-white font-bold"
                >
                  <option value="MinCapex">Min CapEx (Mixed High-Density)</option>
                  <option value="Segregated">Segregated (1 SKU per Pod)</option>
                </select>
              </div>
            </div>
          )}

          <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200 flex flex-wrap items-center justify-between gap-2">
            <div>
              <strong>Live Enclosure Sizing Preview:</strong> {eng.pods.length}{' '}
              {project.shellArchitecture === 'BnM_Hall' ? 'BnM Bays' : 'IT Pods'} •{' '}
              <strong>{eng.totalItWhiteSpaceSqm} m²</strong> Total White-Space ({eng.whiteSpace.internalCduCount} Internal Floor CDUs +{' '}
              {eng.whiteSpace.mandatoryPacCount} × 80kW PACs)
            </div>
            <div className="font-bold navy-text">
              Loaded Unit Mass: {eng.civil.unitGrossTonnes} Tonnes • Flood Plinth: +{eng.civil.floodPlinthMm}mm
            </div>
          </div>
        </section>
      )}

      {/* STEP 3: PLOT AREA, UPTIME TIER, STATUTORY RULEBOOK & AMC HORIZON */}
      {step === 3 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <section className="bg-white rounded-2xl card-shadow border border-slate-200 p-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-base font-bold navy-text">Plot Area & Survey Shape (.KML / .GeoJSON)</h3>
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

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 flex items-center justify-between">
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

          <section className="bg-white rounded-2xl card-shadow border border-slate-200 p-5 space-y-3">
            <h3 className="text-base font-bold navy-text">Availability Tier, Statutory Rulebook & AMC</h3>

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
                <span className="font-bold text-slate-600">Horizon: {project.amcYears} Yrs</span>
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
          </section>
        </div>
      )}

      {/* Wizard Footer Controls */}
      <div className="bg-white rounded-2xl card-shadow border border-slate-200 p-3.5 flex items-center justify-between gap-3">
        <button
          onClick={() => setStep(s => Math.max(0, s - 1))}
          disabled={step === 0}
          className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold border ${
            step === 0
              ? 'border-slate-200 text-slate-300 cursor-not-allowed'
              : 'border-slate-300 bg-white hover:bg-slate-50 navy-text'
          }`}
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Previous Step
        </button>

        <div className="text-slate-500 font-semibold hidden sm:block">
          Step {step + 1} of {WIZARD_STEPS.length} • All edits auto-saved
        </div>

        {step < WIZARD_STEPS.length - 1 ? (
          <button
            onClick={() => setStep(s => Math.min(WIZARD_STEPS.length - 1, s + 1))}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl navy-bg text-white font-bold"
          >
            Next Step
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        ) : (
          <button
            onClick={onGenerateFirstDraft}
            className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl coral-bg text-white font-black shadow"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Generate First-Draft Design →
          </button>
        )}
      </div>

      {/* INLINE CUSTOM RACK SKU MODAL */}
      {showCustomRackModal && (
        <div className="fixed inset-0 bg-slate-950/65 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-5 shadow-2xl border border-slate-200 space-y-4 text-xs max-h-[90dvh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
              <div>
                <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-950 font-black uppercase text-[10px]">
                  Future-Proof Master Rack Catalog
                </span>
                <h3 className="text-base font-bold navy-text mt-1">Add Custom GPU / DLC / AC Rack SKU</h3>
              </div>
              <button
                onClick={() => setShowCustomRackModal(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="block font-bold text-slate-700 mb-1">Rack SKU Name / Generation</label>
                <input
                  type="text"
                  placeholder="e.g., Next-Gen 600 kW Rubin Ultra Liquid Rack"
                  value={customRackForm.name}
                  onChange={e => setCustomRackForm(p => ({ ...p, name: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-1.5 font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Cooling Architecture</label>
                <select
                  value={customRackForm.coolingType}
                  onChange={e =>
                    setCustomRackForm(p => ({
                      ...p,
                      coolingType: e.target.value as CoolingType,
                      liquidSplitPct: e.target.value === 'DLC' ? 92 : 0,
                      maxInletTempC: e.target.value === 'DLC' ? 35 : 27
                    }))
                  }
                  className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white font-bold"
                >
                  <option value="DLC">Direct Liquid Cooled (DLC)</option>
                  <option value="AC">Air Cooled (AC)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Rack Standard / Form Factor</label>
                <input
                  type="text"
                  value={customRackForm.standard}
                  onChange={e => setCustomRackForm(p => ({ ...p, standard: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Peak Power Rating (kW)</label>
                <input
                  type="number"
                  min={5}
                  value={customRackForm.peakKw}
                  onChange={e => setCustomRackForm(p => ({ ...p, peakKw: Number(e.target.value) }))}
                  className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Max Inlet Temp (°C)</label>
                <input
                  type="number"
                  min={18}
                  max={50}
                  value={customRackForm.maxInletTempC}
                  onChange={e => setCustomRackForm(p => ({ ...p, maxInletTempC: Number(e.target.value) }))}
                  className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 font-bold"
                />
              </div>

              {customRackForm.coolingType === 'DLC' && (
                <>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Liquid Heat Capture (%)</label>
                    <input
                      type="number"
                      min={50}
                      max={100}
                      value={customRackForm.liquidSplitPct}
                      onChange={e => setCustomRackForm(p => ({ ...p, liquidSplitPct: Number(e.target.value) }))}
                      className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 font-bold"
                    />
                  </div>
                  <div className="flex items-end pb-1.5">
                    <label className="inline-flex items-center gap-2 font-bold navy-text cursor-pointer">
                      <input
                        type="checkbox"
                        checked={customRackForm.cduIntegrated}
                        onChange={e => setCustomRackForm(p => ({ ...p, cduIntegrated: e.target.checked }))}
                        className="w-4 h-4"
                      />
                      In-Rack Integrated CDU
                    </label>
                  </div>
                </>
              )}

              <div>
                <label className="block font-bold text-slate-700 mb-1">Width × Depth × Height (mm)</label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={customRackForm.widthMm}
                    onChange={e => setCustomRackForm(p => ({ ...p, widthMm: Number(e.target.value) }))}
                    className="w-1/3 border rounded px-1.5 py-1"
                  />
                  <input
                    type="number"
                    value={customRackForm.depthMm}
                    onChange={e => setCustomRackForm(p => ({ ...p, depthMm: Number(e.target.value) }))}
                    className="w-1/3 border rounded px-1.5 py-1"
                  />
                  <input
                    type="number"
                    value={customRackForm.heightMm}
                    onChange={e => setCustomRackForm(p => ({ ...p, heightMm: Number(e.target.value) }))}
                    className="w-1/3 border rounded px-1.5 py-1"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Loaded Weight (kg) & Initial Qty</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={customRackForm.weightKg}
                    onChange={e => setCustomRackForm(p => ({ ...p, weightKg: Number(e.target.value) }))}
                    className="w-1/2 border rounded px-2 py-1 font-bold"
                    placeholder="Weight kg"
                  />
                  <input
                    type="number"
                    min={0}
                    value={customRackForm.initialQty}
                    onChange={e => setCustomRackForm(p => ({ ...p, initialQty: Number(e.target.value) }))}
                    className="w-1/2 border border-blue-400 rounded px-2 py-1 font-black navy-text"
                    placeholder="Qty"
                  />
                </div>
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900">
              This SKU will be added to your persistent <strong>Master Rack Catalog</strong> immediately and populated with <strong>{customRackForm.initialQty} rack(s)</strong> in the current deal.
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={() => setShowCustomRackModal(false)}
                className="px-3.5 py-2 rounded-lg border border-slate-300 font-bold"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveCustomRack}
                className="px-4 py-2 rounded-lg coral-bg text-white font-bold"
              >
                Save Rack SKU & Add to Deal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
