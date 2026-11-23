import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  Building2,
  ChevronLeft,
  ChevronRight,
  Cloud,
  Cpu,
  Download,
  FileSpreadsheet,
  HardHat,
  Layers,
  MapPin,
  RefreshCw,
  ShieldCheck,
  Sliders,
  Upload,
  Zap
} from 'lucide-react';
import { SliderInput } from './components/controls/SliderInput';
import { DriveSyncModal } from './components/drive/DriveSyncModal';
import { useToast } from './components/layout/ToastProvider';
import {
  computeSiteEngineering,
  fetchOpenMeteoEra5Climate
} from './engines';
import {
  importJsonFileInput,
  loadWorkspaceState,
  mergeImportedJsonPayload,
  saveWorkspaceState,
  triggerJsonDownload
} from './services/storageAdapter';
import type { DealConfig, WorkspaceState } from './types/schema';

type PhaseId = 'configure' | 'site_civil' | 'engineering' | 'commercials';

const PHASES: Array<{ id: PhaseId; label: string; short: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: 'configure', label: '1. Configure', short: 'Config', icon: Sliders },
  { id: 'site_civil', label: '2. Civil & Site', short: 'Site', icon: HardHat },
  { id: 'engineering', label: '3. MEP & SLD', short: 'Eng/CAD', icon: Zap },
  { id: 'commercials', label: '4. BOQ & Supply', short: 'BOQ/MII', icon: FileSpreadsheet }
];

export const App: React.FC = () => {
  const { pushToast } = useToast();
  const [workspace, setWorkspace] = useState<WorkspaceState>(() => loadWorkspaceState());
  const [phase, setPhase] = useState<PhaseId>('configure');
  const [railCollapsed, setRailCollapsed] = useState(false);
  const [driveOpen, setDriveOpen] = useState(false);
  const [fetchingClimate, setFetchingClimate] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    saveWorkspaceState(workspace);
  }, [workspace]);

  useEffect(() => {
    if (workspace.lastMigratedFrom && workspace.lastMigratedFrom.length > 0) {
      pushToast(
        'info',
        'V12 Legacy Storage Auto-Merged',
        `Recovered state from: ${workspace.lastMigratedFrom.join(', ')}`
      );
    }
    // Run once on initial mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeDeal: DealConfig = useMemo(() => {
    return workspace.deals.find((d) => d.id === workspace.activeDealId) ?? workspace.deals[0];
  }, [workspace]);

  const engineering = useMemo(
    () => computeSiteEngineering(activeDeal, workspace.supplyIntel),
    [activeDeal, workspace.supplyIntel]
  );

  const patchDeal = (updater: (d: DealConfig) => DealConfig) => {
    setWorkspace((prev) => ({
      ...prev,
      deals: prev.deals.map((d) =>
        d.id === activeDeal.id ? { ...updater(d), updatedAt: new Date().toISOString() } : d
      )
    }));
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { nextState, summary } = await importJsonFileInput(file, workspace, fileInputRef.current);
      setWorkspace(nextState);
      pushToast(
        'success',
        `Imported ${file.name} (${summary.detectedKind})`,
        `Deals: ${summary.dealsImported} | Catalog: ${summary.catalogItemsImported} | Supply SKUs: ${summary.supplySkusImported}`
      );
    } catch (err) {
      pushToast('error', 'JSON Import Failed', err instanceof Error ? err.message : String(err));
    }
  };

  const handleFetchEra5 = async () => {
    setFetchingClimate(true);
    try {
      const profile = await fetchOpenMeteoEra5Climate(
        activeDeal.climate.city,
        activeDeal.climate.state,
        activeDeal.climate.latitude,
        activeDeal.climate.longitude
      );
      patchDeal((d) => ({ ...d, climate: profile }));
      pushToast(
        'success',
        `Open-Meteo ERA5 Updated (${profile.city})`,
        `99% Dry-Bulb ${profile.designDryBulbC}°C | ${profile.seismicZone} (Z=${profile.seismicZoneFactorZ})`
      );
    } catch (err) {
      pushToast('error', 'ERA5 Weather Lookup Failed', err instanceof Error ? err.message : String(err));
    } finally {
      setFetchingClimate(false);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-slate-100 text-slate-900 overflow-hidden">
      {/* Minimal Sharp Top Bar */}
      <header className="h-11 bg-brand-navy text-white border-b border-slate-800 px-3 flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 rounded-cad bg-brand-orange flex items-center justify-center shrink-0">
            <Cpu className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-bold text-xs sm:text-sm tracking-tight truncate">
            MDC Configurator <span className="text-brand-orange font-mono">V13</span>
          </span>
          <span className="hidden md:inline-block text-[11px] text-slate-300 border-l border-white/20 pl-2 truncate">
            {activeDeal.name}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleImportFile}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-2 py-1 text-[11px] font-semibold bg-white/10 hover:bg-white/20 rounded-cad flex items-center gap-1"
          >
            <Upload className="w-3 h-3" />
            <span className="hidden sm:inline">Import V12/V13 JSON</span>
          </button>
          <button
            type="button"
            onClick={() => {
              triggerJsonDownload(`${activeDeal.id}.json`, activeDeal);
              pushToast('success', 'Exported Deal JSON', `${activeDeal.id}.json`);
            }}
            className="px-2 py-1 text-[11px] font-semibold bg-white/10 hover:bg-white/20 rounded-cad flex items-center gap-1"
          >
            <Download className="w-3 h-3" />
            <span className="hidden sm:inline">Export</span>
          </button>
          <button
            type="button"
            onClick={() => setDriveOpen(true)}
            className="px-2.5 py-1 text-[11px] font-semibold bg-brand-orange hover:bg-brand-orange/90 rounded-cad flex items-center gap-1"
          >
            <Cloud className="w-3 h-3" />
            <span>Drive Picker</span>
          </button>
        </div>
      </header>

      {/* Persistent Live Telemetry Ribbon */}
      <div className="bg-white border-b border-slate-200 px-3 py-1.5 flex items-center gap-3 overflow-x-auto text-[11px] shrink-0">
        <div className="flex items-center gap-1.5 shrink-0">
          <Activity className="w-3.5 h-3.5 text-brand-orange" />
          <span className="text-slate-500">IT Load:</span>
          <strong className="font-mono text-brand-navy">{engineering.mep.itLoadMw.toFixed(1)} MW</strong>
        </div>
        <div className="h-3.5 w-px bg-slate-200 shrink-0" />
        <div className="shrink-0">
          <span className="text-slate-500">PUE:</span>{' '}
          <strong className="font-mono text-brand-emerald">{engineering.mep.estimatedPue.toFixed(2)}</strong>
        </div>
        <div className="h-3.5 w-px bg-slate-200 shrink-0" />
        <div className="shrink-0">
          <span className="text-slate-500">Site Area:</span>{' '}
          <strong className="font-mono">{engineering.mep.totalSiteAreaM2.toLocaleString()} m²</strong>
        </div>
        <div className="h-3.5 w-px bg-slate-200 shrink-0" />
        <div className="shrink-0">
          <span className="text-slate-500">BOQ MII:</span>{' '}
          <strong className="font-mono text-brand-cobalt">{engineering.commercial.weightedBoqMiiPercent}%</strong>
        </div>
        <div className="h-3.5 w-px bg-slate-200 shrink-0" />
        <div className="shrink-0">
          <span className="text-slate-500">Turnkey CapEx:</span>{' '}
          <strong className="font-mono text-brand-navy">₹{engineering.commercial.totalCapexInrCr} Cr</strong>
        </div>
        <div className="h-3.5 w-px bg-slate-200 shrink-0" />
        <div className="shrink-0">
          <span className="text-slate-500">Foundation:</span>{' '}
          <strong className={`font-mono ${engineering.civil.requiresPiling ? 'text-brand-orange' : 'text-brand-emerald'}`}>
            {engineering.civil.requiresPiling ? '4.5m Pile Cap' : `${engineering.civil.embedmentDepthM}m RCC Plinth`} (FoS {engineering.civil.bearingFoS})
          </strong>
        </div>
      </div>

      {/* Main Workspace: Collapsible Left Rail + Content */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        <aside
          className={`hidden md:flex flex-col bg-white border-r border-slate-200 transition-all shrink-0 ${
            railCollapsed ? 'w-14' : 'w-52'
          }`}
        >
          <div className="p-2 flex-1 space-y-1">
            {PHASES.map((p) => {
              const Icon = p.icon;
              const active = phase === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPhase(p.id)}
                  className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-cad text-xs font-semibold transition-colors ${
                    active
                      ? 'bg-brand-navy text-white'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-brand-orange' : 'text-slate-500'}`} />
                  {!railCollapsed && <span className="truncate">{p.label}</span>}
                </button>
              );
            })}
          </div>
          <div className="p-2 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setRailCollapsed((c) => !c)}
              className="w-full flex items-center justify-center gap-1 py-1.5 text-[11px] text-slate-600 hover:bg-slate-100 rounded-cad"
            >
              {railCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
              {!railCollapsed && <span>Collapse Rail</span>}
            </button>
          </div>
        </aside>

        {/* Active Phase Workspace */}
        <main className="flex-1 overflow-y-auto p-3 pb-20 md:pb-4">
          <div className="max-w-6xl mx-auto space-y-3">
            {phase === 'configure' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                <section className="bg-white border border-slate-200 rounded-cad p-3 space-y-2.5">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-brand-navy flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5 text-brand-orange" />
                      Core AI Compute & Thermal Parameters
                    </h2>
                    <div className="flex border border-slate-300 rounded-cad overflow-hidden text-[11px] font-semibold">
                      {(['Container', 'BnM'] as const).map((arch) => (
                        <button
                          key={arch}
                          type="button"
                          onClick={() => patchDeal((d) => ({ ...d, architecture: arch }))}
                          className={`px-2.5 py-1 ${
                            activeDeal.architecture === arch
                              ? 'bg-brand-navy text-white'
                              : 'bg-white text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          {arch === 'Container' ? 'Modular Pod' : 'BnM Hall'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <SliderInput
                    label="Target IT Load"
                    value={activeDeal.targetItLoadMw}
                    min={0.5}
                    max={50}
                    step={0.5}
                    unit="MW"
                    hint={`${engineering.mep.totalRacks} Racks | ${engineering.mep.podCount} Pods/Bays`}
                    onChange={(v) => patchDeal((d) => ({ ...d, targetItLoadMw: v }))}
                  />
                  <SliderInput
                    label="Direct Liquid Cooling (DLC) Share"
                    value={activeDeal.dlcSharePct}
                    min={0}
                    max={95}
                    step={5}
                    unit="%"
                    hint={`${engineering.mep.dlcHeatLoadMw} MW DLC / ${engineering.mep.airHeatLoadMw} MW Air`}
                    onChange={(v) => patchDeal((d) => ({ ...d, dlcSharePct: v }))}
                  />
                  <SliderInput
                    label="Average AI Rack Density"
                    value={activeDeal.avgRackKw}
                    min={30}
                    max={140}
                    step={5}
                    unit="kW"
                    hint="2.5m H × 900mm W × 1200mm D"
                    onChange={(v) => patchDeal((d) => ({ ...d, avgRackKw: v }))}
                  />
                  <SliderInput
                    label="Max White-Space Air Inlet Temp"
                    value={activeDeal.maxInletTempC}
                    min={20}
                    max={40}
                    step={1}
                    unit="°C"
                    hint={engineering.mep.inletTempWarning ?? 'Within ASHRAE A2 envelope'}
                    onChange={(v) => patchDeal((d) => ({ ...d, maxInletTempC: v }))}
                  />
                </section>

                <section className="bg-white border border-slate-200 rounded-cad p-3 space-y-2.5">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-brand-navy flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-brand-orange" />
                      Site Climate (Open-Meteo ERA5) & IS 1893 Seismic
                    </h2>
                    <button
                      type="button"
                      disabled={fetchingClimate}
                      onClick={handleFetchEra5}
                      className="px-2.5 py-1 text-[11px] font-semibold bg-brand-navy text-white rounded-cad flex items-center gap-1 hover:bg-brand-navy/90 disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3 h-3 ${fetchingClimate ? 'animate-spin' : ''}`} />
                      Fetch Live ERA5
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="border border-slate-200 rounded-cad p-2">
                      <span className="text-[10px] text-slate-500 uppercase">City / State</span>
                      <p className="font-semibold text-brand-navy">
                        {activeDeal.climate.city}, {activeDeal.climate.state}
                      </p>
                      <p className="text-[10px] font-mono text-slate-500">
                        {activeDeal.climate.latitude.toFixed(3)}°N, {activeDeal.climate.longitude.toFixed(3)}°E
                      </p>
                    </div>
                    <div className="border border-slate-200 rounded-cad p-2">
                      <span className="text-[10px] text-slate-500 uppercase">IS 1893 Seismic Zone</span>
                      <p className="font-semibold text-brand-navy">
                        {activeDeal.climate.seismicZone} (Z = {activeDeal.climate.seismicZoneFactorZ})
                      </p>
                      <p className="text-[10px] text-slate-500">Source: {activeDeal.climate.source}</p>
                    </div>
                    <div className="border border-slate-200 rounded-cad p-2">
                      <span className="text-[10px] text-slate-500 uppercase">Design Dry / Wet Bulb</span>
                      <p className="font-mono font-semibold text-brand-orange">
                        {activeDeal.climate.designDryBulbC}°C / {activeDeal.climate.designWetBulbC}°C
                      </p>
                    </div>
                    <div className="border border-slate-200 rounded-cad p-2">
                      <span className="text-[10px] text-slate-500 uppercase">Annual Monsoon Rain</span>
                      <p className="font-mono font-semibold text-brand-navy">
                        {activeDeal.climate.annualRainfallMm} mm/yr
                      </p>
                    </div>
                  </div>

                  <div className="border border-emerald-200 bg-emerald-50 rounded-cad p-2.5 text-[11px] text-emerald-950">
                    <p className="font-semibold flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-brand-emerald" />
                      Zero Yard CDUs Invariant Active
                    </p>
                    <p className="mt-0.5">
                      Yard CDUs: <strong className="font-mono">{engineering.mep.yardCduCount}</strong> | Internal CDU Towers:{' '}
                      <strong className="font-mono">{engineering.mep.internalCduCountTotal}</strong> | Mandatory 80 kW PACs:{' '}
                      <strong className="font-mono">{engineering.mep.pacCountTotal}</strong> | {activeDeal.chillerPlacement} Chillers:{' '}
                      <strong className="font-mono">{engineering.mep.chillerCountTotal}</strong>
                    </p>
                  </div>
                </section>
              </div>
            )}

            {phase === 'site_civil' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                <section className="bg-white border border-slate-200 rounded-cad p-3 space-y-2.5">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-brand-navy border-b border-slate-100 pb-2 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-brand-orange" />
                    Civil Plinth & Soil Bearing (C-101 Typed Engine)
                  </h2>
                  <SliderInput
                    label="Soil Safe Bearing Capacity (SBC)"
                    value={activeDeal.civil.soilSbcKpa}
                    min={60}
                    max={300}
                    step={5}
                    unit="kPa"
                    hint="< 110 kPa triggers 4.5m RCC Pile Cap"
                    onChange={(v) => patchDeal((d) => ({ ...d, civil: { ...d.civil, soilSbcKpa: v } }))}
                  />
                  <SliderInput
                    label="Plinth Height Above FGL"
                    value={activeDeal.civil.plinthClearHeightM}
                    min={0.45}
                    max={1.8}
                    step={0.05}
                    unit="m"
                    hint={`Yard Drainage Slope: ${engineering.civil.drainageSlope}`}
                    onChange={(v) => patchDeal((d) => ({ ...d, civil: { ...d.civil, plinthClearHeightM: v } }))}
                  />
                  <SliderInput
                    label="Groundwater Table Depth"
                    value={activeDeal.civil.groundwaterDepthM}
                    min={1.0}
                    max={12.0}
                    step={0.5}
                    unit="m"
                    onChange={(v) => patchDeal((d) => ({ ...d, civil: { ...d.civil, groundwaterDepthM: v } }))}
                  />
                </section>

                <section className="bg-cad-bg text-slate-100 border border-slate-800 rounded-cad p-3 space-y-2.5">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <h3 className="font-mono text-xs font-semibold text-sky-400">
                      C-101 STRUCTURAL & GEOTECHNICAL READOUT
                    </h3>
                    <span
                      className={`px-2 py-0.5 rounded-cad font-mono text-[10px] font-bold ${
                        engineering.civil.requiresPiling
                          ? 'bg-brand-orange text-white'
                          : 'bg-brand-emerald text-white'
                      }`}
                    >
                      {engineering.civil.foundationType}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 font-mono text-xs">
                    <div className="bg-slate-900/80 border border-slate-800 p-2 rounded-cad">
                      <div className="text-[10px] text-slate-400">Embedment Depth</div>
                      <div className="text-sm font-bold text-white">{engineering.civil.embedmentDepthM} m</div>
                    </div>
                    <div className="bg-slate-900/80 border border-slate-800 p-2 rounded-cad">
                      <div className="text-[10px] text-slate-400">Imposed Bearing</div>
                      <div className="text-sm font-bold text-sky-300">{engineering.civil.imposedBearingKpa} kN/m²</div>
                    </div>
                    <div className="bg-slate-900/80 border border-slate-800 p-2 rounded-cad">
                      <div className="text-[10px] text-slate-400">Bearing FoS</div>
                      <div className="text-sm font-bold text-emerald-400">{engineering.civil.bearingFoS}x</div>
                    </div>
                    <div className="bg-slate-900/80 border border-slate-800 p-2 rounded-cad">
                      <div className="text-[10px] text-slate-400">M35 Concrete / Rebar</div>
                      <div className="text-sm font-bold">
                        {engineering.civil.concreteVolumeM3} m³ / {engineering.civil.rebarTonnageMt} MT
                      </div>
                    </div>
                    <div className="bg-slate-900/80 border border-slate-800 p-2 rounded-cad">
                      <div className="text-[10px] text-slate-400">Bored Piles (450mm)</div>
                      <div className="text-sm font-bold">{engineering.civil.pileCount} Nos</div>
                    </div>
                    <div className="bg-slate-900/80 border border-slate-800 p-2 rounded-cad">
                      <div className="text-[10px] text-slate-400">Civil BOQ Total</div>
                      <div className="text-sm font-bold text-brand-amber">₹{engineering.civil.civilTotalCostInrCr} Cr</div>
                    </div>
                  </div>
                  <div className="space-y-1 text-[11px] text-slate-300 border-t border-slate-800 pt-2">
                    <p className="font-mono text-sky-300">{engineering.civil.anchorBoltSpec}</p>
                    {engineering.civil.advisoryNotes.map((note, idx) => (
                      <p key={idx}>• {note}</p>
                    ))}
                  </div>
                </section>
              </div>
            )}

            {phase === 'engineering' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                <section className="bg-cad-bg text-slate-100 border border-slate-800 rounded-cad p-3 space-y-2.5">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <h2 className="font-mono text-xs font-bold text-sky-400">
                      E-201 ELECTRICAL SLD — TYPED STANDARDS GUARD ACTIVE
                    </h2>
                    <span className="font-mono text-[10px] px-2 py-0.5 rounded-cad bg-emerald-600/30 border border-emerald-500/40 text-emerald-300">
                      {engineering.electrical.standards.wiringCode} | {engineering.electrical.standards.kFactorRating}
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {engineering.electrical.nodes.map((node) => (
                      <div
                        key={node.id}
                        className="bg-slate-900/80 border border-slate-800 rounded-cad px-2.5 py-2 flex items-center justify-between text-xs"
                      >
                        <div>
                          <span className="font-mono text-[10px] text-sky-400">{node.zone}</span>
                          <p className="font-semibold text-white">{node.label}</p>
                        </div>
                        <div className="text-right font-mono">
                          <p className="text-brand-amber font-semibold">{node.ratingLabel}</p>
                          <p className="text-[10px] text-slate-400">{node.redundancy}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="bg-white border border-slate-200 rounded-cad p-3 space-y-2.5">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-brand-navy border-b border-slate-100 pb-2 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-brand-orange" />
                    3-Zone MEP Isolation & Electrical Compliance
                  </h2>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="border border-slate-200 rounded-cad p-2">
                      <p className="text-[10px] text-slate-500">Zone 1 White Space</p>
                      <p className="font-mono text-sm font-bold text-brand-navy">
                        {engineering.mep.threeZoneIsolation.zone1WhiteSpaceM2} m²
                      </p>
                    </div>
                    <div className="border border-slate-200 rounded-cad p-2">
                      <p className="text-[10px] text-slate-500">Zone 2 Cooling Yard</p>
                      <p className="font-mono text-sm font-bold text-brand-cobalt">
                        {engineering.mep.threeZoneIsolation.zone2HeatRejectionYardM2} m²
                      </p>
                    </div>
                    <div className="border border-slate-200 rounded-cad p-2">
                      <p className="text-[10px] text-slate-500">Zone 3 Power Yard</p>
                      <p className="font-mono text-sm font-bold text-brand-orange">
                        {engineering.mep.threeZoneIsolation.zone3ElectricalPowerYardM2} m²
                      </p>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    {engineering.electrical.validationChecks.map((chk) => (
                      <div
                        key={chk.code}
                        className="border border-slate-200 rounded-cad px-2.5 py-2 flex items-start justify-between gap-2 text-xs"
                      >
                        <div>
                          <p className="font-semibold text-slate-900">
                            {chk.label} <span className="font-mono text-[10px] text-slate-500">({chk.code})</span>
                          </p>
                          <p className="text-[11px] text-slate-600">{chk.detail}</p>
                        </div>
                        <span
                          className={`px-1.5 py-0.5 rounded-cad font-mono text-[10px] font-bold shrink-0 ${
                            chk.passed ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {chk.passed ? 'PASS' : 'CHECK'}
                        </span>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            )}

            {phase === 'commercials' && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                  <div className="bg-white border border-slate-200 rounded-cad p-2.5">
                    <p className="text-[10px] uppercase text-slate-500">Turnkey CapEx (incl. GST)</p>
                    <p className="font-mono text-base font-bold text-brand-navy">
                      ₹{engineering.commercial.totalCapexInrCr} Cr
                    </p>
                    <p className="text-[10px] font-mono text-slate-500">
                      ₹{engineering.commercial.capexPerMwInrCr} Cr / MW
                    </p>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-cad p-2.5">
                    <p className="text-[10px] uppercase text-slate-500">5-Year Total TCO</p>
                    <p className="font-mono text-base font-bold text-brand-orange">
                      ₹{engineering.commercial.totalTco5YrInrCr} Cr
                    </p>
                    <p className="text-[10px] font-mono text-slate-500">
                      ₹{engineering.commercial.inrPerItKwh5Yr} / IT kWh
                    </p>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-cad p-2.5">
                    <p className="text-[10px] uppercase text-slate-500">PPP-MII Classification</p>
                    <p className="text-xs font-bold text-brand-emerald mt-0.5">
                      {engineering.supplyChain.pppMiiClass}
                    </p>
                    <p className="text-[10px] font-mono text-slate-500">
                      BOQ MII: {engineering.commercial.weightedBoqMiiPercent}% | Catalog: {engineering.supplyChain.weightedMiiPercent}%
                    </p>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-cad p-2.5">
                    <p className="text-[10px] uppercase text-slate-500">Critical Path Lead Time</p>
                    <p className="font-mono text-base font-bold text-brand-navy">
                      {engineering.supplyChain.longestLeadTimeWeeks} Weeks
                    </p>
                    <p className="text-[10px] text-slate-500 truncate">{engineering.supplyChain.criticalPathSku}</p>
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-cad overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase tracking-wider text-slate-600">
                        <th className="px-3 py-2">Code</th>
                        <th className="px-3 py-2">BOQ Scope Description</th>
                        <th className="px-3 py-2 text-right">Qty</th>
                        <th className="px-3 py-2 text-right">MII %</th>
                        <th className="px-3 py-2 text-right">Extended (₹ Cr)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {engineering.commercial.boqLines.map((line) => (
                        <tr key={line.lineId} className="hover:bg-slate-50">
                          <td className="px-3 py-2 font-mono text-[11px] font-semibold text-brand-navy">
                            {line.lineId}
                          </td>
                          <td className="px-3 py-2">
                            <span className="font-medium text-slate-900">{line.description}</span>
                          </td>
                          <td className="px-3 py-2 text-right font-mono">
                            {line.quantity} {line.unit}
                          </td>
                          <td className="px-3 py-2 text-right font-mono text-brand-emerald">{line.miiPercent}%</td>
                          <td className="px-3 py-2 text-right font-mono font-semibold">
                            ₹{line.extendedCostInrCr.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Narrow-Viewport / Folded Phone Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 grid grid-cols-4 z-40">
        {PHASES.map((p) => {
          const Icon = p.icon;
          const active = phase === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => setPhase(p.id)}
              className={`py-2 flex flex-col items-center gap-0.5 text-[10px] font-semibold ${
                active ? 'text-brand-orange border-t-2 border-brand-orange' : 'text-slate-600'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{p.short}</span>
            </button>
          );
        })}
      </nav>

      {/* Real Google Drive Picker Modal */}
      <DriveSyncModal
        open={driveOpen}
        onClose={() => setDriveOpen(false)}
        activeDeal={activeDeal}
        selectedFolderId={workspace.driveConfig.selectedFolderId}
        selectedFolderPath={workspace.driveConfig.selectedFolderPath}
        includeReadonlyScope={workspace.driveConfig.includeReadonlyScope}
        onUpdateDriveConfig={(patch) =>
          setWorkspace((prev) => ({
            ...prev,
            driveConfig: { ...prev.driveConfig, ...patch }
          }))
        }
        onImportPayloadFromDrive={(payload, filename) => {
          const { nextState, summary } = mergeImportedJsonPayload(workspace, payload);
          setWorkspace(nextState);
          pushToast(
            'success',
            `Loaded ${filename} from Google Drive`,
            `Deals: ${summary.dealsImported} | Catalog: ${summary.catalogItemsImported} | SKUs: ${summary.supplySkusImported}`
          );
        }}
        onNotify={pushToast}
      />
    </div>
  );
};
