import React from 'react';
import { RotateCcw } from 'lucide-react';
import type { EngineeringResult, LogisticsOverrides, ProjectDeal } from '../types/mdc';

interface LogisticsRiggingPanelProps {
  project: ProjectDeal;
  eng: EngineeringResult;
  onUpdateProject: (patch: Partial<ProjectDeal>) => void;
}

export const LogisticsRiggingPanel: React.FC<LogisticsRiggingPanelProps> = ({
  project,
  eng,
  onUpdateProject
}) => {
  const fullPodTonnes = eng.civil.unitGrossTonnes || 32.0;
  const podCount = Math.max(1, eng.pods.length);
  const ov: LogisticsOverrides = project.logisticsOverrides || {};

  const setLogOv = <K extends keyof LogisticsOverrides>(key: K, val: LogisticsOverrides[K]) => {
    onUpdateProject({
      logisticsOverrides: {
        ...(project.logisticsOverrides || {}),
        [key]: val
      }
    });
  };

  const resetOverrides = () => {
    onUpdateProject({ logisticsOverrides: {} });
  };

  return (
    <div className="space-y-5 text-xs">
      {/* SECTION A: TEMPORARY RENTAL / MOBILIZATION (OPT-IN — EXCLUDED BY DEFAULT) */}
      <div className="bg-white rounded-2xl card-shadow border border-slate-200 p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
          <div>
            <span className="px-2.5 py-0.5 rounded bg-orange-100 text-orange-950 font-black uppercase text-[10px]">
              Module 06A • Temporary Heavy-Lift Logistics & Rigging (RENTAL / MOBILIZATION)
            </span>
            <h2 className="text-lg font-bold navy-text mt-1">
              Route Survey, Full-Load Crane Sizing & Rental Mobilization Manifest
            </h2>
            <p className="text-slate-600">
              Cranes, low-bed trucks, spreader mats & rigging gear are temporary rentals — <strong>excluded from BOM & cost by default</strong> unless explicitly checked below. Calculated from{' '}
              <strong>{podCount} Unit(s) × {fullPodTonnes} Tonnes</strong> loaded mass.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-50 border border-amber-300 font-bold text-amber-950 cursor-pointer">
              <input
                type="checkbox"
                checked={project.includeLogisticsRigging}
                onChange={e => onUpdateProject({ includeLogisticsRigging: e.target.checked })}
                className="w-4 h-4"
              />
              Include Rental Logistics in BOM & Cost
            </label>
            <button
              onClick={resetOverrides}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 font-bold text-slate-700"
              title="Reset manual logistics overrides back to auto-calculated values"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Overrides
            </button>
          </div>
        </div>

        {/* Direct Numeric Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Approach Road Width (m)</label>
            <input
              type="number"
              step={0.5}
              min={4}
              max={30}
              value={project.approachRoadWidthM}
              onChange={e => onUpdateProject({ approachRoadWidthM: Number(e.target.value) })}
              className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white font-bold"
            />
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">Overhead Bridge / Line Clearance (m)</label>
            <input
              type="number"
              step={0.1}
              min={4.0}
              max={12.0}
              value={project.overheadClearanceM}
              onChange={e => onUpdateProject({ overheadClearanceM: Number(e.target.value) })}
              className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white font-bold"
            />
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">Crane Working Radius (m)</label>
            <input
              type="number"
              step={1}
              min={6}
              max={40}
              value={project.craneWorkingRadiusM}
              onChange={e => onUpdateProject({ craneWorkingRadiusM: Number(e.target.value) })}
              className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white font-bold"
            />
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">Crane Pad Ground Surface</label>
            <input
              type="text"
              value={project.groundSurfaceType}
              onChange={e => onUpdateProject({ groundSurfaceType: e.target.value })}
              className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white font-bold"
            />
          </div>
        </div>

        {/* Live Full-Load KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
            <span className="text-slate-500 block">Low-Bed Trailers (Rental)</span>
            <input
              type="number"
              min={1}
              value={eng.logistics.trailerCount}
              onChange={e => setLogOv('trailers', e.target.value === '' ? '' : Number(e.target.value))}
              className="w-24 border rounded-lg px-2 py-1 font-black navy-text bg-white"
            />
          </div>
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
            <span className="text-slate-500 block">Swept Turning Circle (m)</span>
            <div className="text-base font-black text-blue-700">{eng.logistics.minTurningRadiusM} m Radius</div>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
            <span className="text-slate-500 block">Mobile Crane Tonnage (Rental)</span>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                step={50}
                min={100}
                value={eng.logistics.craneTonnage}
                onChange={e =>
                  setLogOv('craneTonnage', e.target.value === '' ? '' : Number(e.target.value))
                }
                className="w-20 border rounded-lg px-2 py-1 font-black coral-text bg-white"
              />
              <span className="text-[11px] font-bold text-slate-600">
                T ({eng.logistics.outriggerGroundKpa} kN/m²)
              </span>
            </div>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
            <span className="text-slate-500 block">Laydown & Staging Yard (m²)</span>
            <input
              type="number"
              step={20}
              min={100}
              value={eng.logistics.laydownStagingSqm}
              onChange={e => setLogOv('stagingSqm', e.target.value === '' ? '' : Number(e.target.value))}
              className="w-24 border rounded-lg px-2 py-1 font-black text-teal-800 bg-white"
            />
          </div>
        </div>

        {/* Editable Rental Mobilization Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse border border-slate-200">
            <thead>
              <tr className="navy-bg text-white text-[11px]">
                <th className="p-2.5">Temporary Site Rigging & Heavy-Lift Equipment</th>
                <th className="p-2.5">Commercial Basis</th>
                <th className="p-2.5">Engineering Specification (Full Load: {fullPodTonnes}T/unit)</th>
                <th className="p-2.5 text-right">Editable Qty</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-slate-200">
                <td className="p-2.5 font-bold navy-text">Mobile Telescopic Crane</td>
                <td className="p-2.5">
                  <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-950 font-black text-[10px]">
                    RENTAL
                  </span>
                </td>
                <td className="p-2.5">
                  {eng.logistics.craneTonnage}T Capacity @ {project.craneWorkingRadiusM}m radius • Outrigger bearing{' '}
                  {eng.logistics.outriggerGroundKpa} kN/m²
                </td>
                <td className="p-2.5 text-right">
                  <input
                    type="number"
                    min={1}
                    value={ov.cranes ?? 1}
                    onChange={e => setLogOv('cranes', Number(e.target.value))}
                    className="w-16 border rounded-lg px-2 py-1 text-right font-bold"
                  />
                </td>
              </tr>
              <tr className="border-b border-slate-200 bg-slate-50/50">
                <td className="p-2.5 font-bold navy-text">Azobe Hardwood Spreader Mats</td>
                <td className="p-2.5">
                  <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-950 font-black text-[10px]">
                    RENTAL
                  </span>
                </td>
                <td className="p-2.5">
                  2.0m × 1.0m × 150mm outrigger load-distribution mats ({project.groundSurfaceType})
                </td>
                <td className="p-2.5 text-right">
                  <input
                    type="number"
                    min={4}
                    value={ov.mats ?? 8}
                    onChange={e => setLogOv('mats', Number(e.target.value))}
                    className="w-16 border rounded-lg px-2 py-1 text-right font-bold"
                  />
                </td>
              </tr>
              <tr className="border-b border-slate-200">
                <td className="p-2.5 font-bold navy-text">Counterbalance Heavy Forklifts</td>
                <td className="p-2.5">
                  <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-950 font-black text-[10px]">
                    RENTAL
                  </span>
                </td>
                <td className="p-2.5">
                  5-Tonne & 10-Tonne low-mast forklifts for palletized CDU/PAC/UPS unloading
                </td>
                <td className="p-2.5 text-right">
                  <input
                    type="number"
                    min={1}
                    value={ov.forklifts ?? 2}
                    onChange={e => setLogOv('forklifts', Number(e.target.value))}
                    className="w-16 border rounded-lg px-2 py-1 text-right font-bold"
                  />
                </td>
              </tr>
              <tr className="border-b border-slate-200 bg-slate-50/50">
                <td className="p-2.5 font-bold navy-text">Steerable Hydraulic Roller Skates & Toe Jacks</td>
                <td className="p-2.5">
                  <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-950 font-black text-[10px]">
                    RENTAL
                  </span>
                </td>
                <td className="p-2.5">
                  15-Tonne heavy machinery skates + 10T hydraulic toe jacks + SS316 shims ({podCount * 16} plates)
                </td>
                <td className="p-2.5 text-right">
                  <input
                    type="number"
                    min={2}
                    value={ov.skates ?? 4}
                    onChange={e => setLogOv('skates', Number(e.target.value))}
                    className="w-16 border rounded-lg px-2 py-1 text-right font-bold"
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION B: OWNED PERMANENT INSIDE-DC OPERATIONS EQUIPMENT (CAPEX) */}
      <div className="bg-white rounded-2xl card-shadow border border-slate-200 p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
          <div>
            <span className="px-2.5 py-0.5 rounded bg-emerald-100 text-emerald-950 font-black uppercase text-[10px]">
              Module 06B • Permanent Inside-DC Handling Equipment (OWNED CAPEX)
            </span>
            <h3 className="text-base font-bold navy-text mt-1">
              Heavy-Duty Electric Server Lifts, Rolling Safety Ladders & White-Space Tools
            </h3>
            <p className="text-slate-600">
              Permanently stationed inside the data center for ongoing AI GPU node stacking, manifold servicing, and high-rack maintenance.
            </p>
          </div>
          <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-300 font-bold text-emerald-950 cursor-pointer">
            <input
              type="checkbox"
              checked={project.includeOwnedDcTools}
              onChange={e => onUpdateProject({ includeOwnedDcTools: e.target.checked })}
              className="w-4 h-4"
            />
            Include Owned Inside-DC Gear in BOM
          </label>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse border border-slate-200">
            <thead>
              <tr className="bg-emerald-900 text-white text-[11px]">
                <th className="p-2.5">Permanent Inside-DC Operations Gear</th>
                <th className="p-2.5">Commercial Basis</th>
                <th className="p-2.5">Technical Specification</th>
                <th className="p-2.5 text-right">Editable Qty</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-slate-200">
                <td className="p-2.5 font-bold navy-text">Heavy-Duty Electric Server Lift (Rack Stacker)</td>
                <td className="p-2.5">
                  <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-950 font-black text-[10px]">
                    OWNED CAPEX
                  </span>
                </td>
                <td className="p-2.5">
                  450 kg Motorized ServerLIFT (up to 52U height, narrow 600mm aisle width, side-loading shelf for GPU trays)
                </td>
                <td className="p-2.5 text-right">
                  <input
                    type="number"
                    min={1}
                    value={eng.logistics.ownedServerLifts}
                    onChange={e => setLogOv('serverLifts', Number(e.target.value))}
                    className="w-16 border rounded-lg px-2 py-1 text-right font-bold"
                  />
                </td>
              </tr>
              <tr>
                <td className="p-2.5 font-bold navy-text">Fiberglass Insulated Rolling Safety Ladders & ESD Carts</td>
                <td className="p-2.5">
                  <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-950 font-black text-[10px]">
                    OWNED CAPEX
                  </span>
                </td>
                <td className="p-2.5">
                  Non-conductive rolling cage ladders (for overhead busways/fiber trays) + torque wrench & quick-disconnect manifold kit
                </td>
                <td className="p-2.5 text-right">
                  <input
                    type="number"
                    min={1}
                    value={eng.logistics.ownedSafetyLadders}
                    onChange={e => setLogOv('safetyLadders', Number(e.target.value))}
                    className="w-16 border rounded-lg px-2 py-1 text-right font-bold"
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
