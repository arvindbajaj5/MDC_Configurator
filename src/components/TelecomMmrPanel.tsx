import React from 'react';
import type { EngineeringResult, ProjectDeal } from '../types/mdc';

interface TelecomMmrPanelProps {
  project: ProjectDeal;
  eng: EngineeringResult;
  onUpdateProject: (patch: Partial<ProjectDeal>) => void;
}

export const TelecomMmrPanel: React.FC<TelecomMmrPanelProps> = ({
  project,
  eng,
  onUpdateProject
}) => {
  const vaultCompliant = (project.diverseVaultSeparationM || 0) >= 30;

  return (
    <div className="space-y-5 text-xs">
      <div className="bg-white rounded-2xl card-shadow border border-slate-200 p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
          <div>
            <span className="px-2.5 py-0.5 rounded bg-indigo-100 text-indigo-950 font-black uppercase text-[10px]">
              Module 05 • External Data Center Telecom & Carrier Infrastructure
            </span>
            <h2 className="text-lg font-bold navy-text mt-1">
              Carrier-Neutral Meet-Me Rooms (MMR), Diverse Underground Fiber Vaults & ODF Patching
            </h2>
            <p className="text-slate-600">
              Covers external ISP/telco demarcation, physically diverse campus fiber entries, 48U ODF cross-connect frames, -48V DC telecom power, and structured overhead fiber pathways.
            </p>
          </div>
          <label className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-300 font-bold navy-text cursor-pointer">
            <input
              type="checkbox"
              checked={project.includeTelecomMmr}
              onChange={e => onUpdateProject({ includeTelecomMmr: e.target.checked })}
              className="w-4 h-4"
            />
            Include Telecom & MMR in BOQ
          </label>
        </div>

        {/* Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
          <div>
            <label className="block font-bold text-slate-700 mb-1">External Carriers / ISPs</label>
            <input
              type="number"
              min={1}
              max={16}
              value={project.carrierCount}
              onChange={e => onUpdateProject({ carrierCount: Math.max(1, Number(e.target.value)) })}
              className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white font-bold"
            />
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">48U ODF Patch Density (Cores/Bay)</label>
            <select
              value={project.odfCoreDensity}
              onChange={e => onUpdateProject({ odfCoreDensity: Number(e.target.value) })}
              className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white font-bold"
            >
              <option value={288}>288-Core LC/APC Splice & Patch ODF</option>
              <option value={576}>576-Core High-Density ODF Bay</option>
            </select>
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">Diverse Fiber Vault Separation (m)</label>
            <input
              type="number"
              min={10}
              max={300}
              value={project.diverseVaultSeparationM}
              onChange={e => onUpdateProject({ diverseVaultSeparationM: Number(e.target.value) })}
              className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white font-bold"
            />
            <span className={`text-[10px] font-bold block mt-0.5 ${vaultCompliant ? 'text-emerald-700' : 'text-amber-700'}`}>
              {vaultCompliant ? '✓ Meets ≥ 30m zero single-point-cut separation' : '⚠ Recommended ≥ 30m route separation'}
            </span>
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">MMR Redundancy & DC Plant</label>
            <div className="px-3 py-1.5 bg-white border rounded-lg font-bold text-emerald-800">
              Dual A/B MMR + -48V DC Plant
            </div>
          </div>
        </div>

        {/* Three Telecom Infrastructure Specification Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
            <div className="font-bold navy-text text-sm">1. Carrier-Neutral Meet-Me Room (MMR)</div>
            <div>
              • Biometric-Locked MMR Rooms: <strong>{eng.telecom.mmrRoomsCount} Dedicated MMR(s)</strong>
            </div>
            <div>
              • ISP Demarcation Cages: <strong>{project.carrierCount} Individual Lockable Carrier Racks</strong>
            </div>
            <div>
              • Telecom DC Power: <strong>Dual -48V DC Rectifiers + 8-Hr VRLA/LFP Backup</strong>
            </div>
            <div>
              • Dedicated MMR Cooling: <strong>Redundant Split / PAC Units (22°C ± 1°C)</strong>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
            <div className="font-bold navy-text text-sm">2. Dual Diverse Underground Entry Vaults</div>
            <div>
              • Campus Entry Routes: <strong>2 Opposite Boundary Routes (North & South)</strong>
            </div>
            <div>
              • Physical Vault Separation: <strong>{project.diverseVaultSeparationM} m</strong>
            </div>
            <div>
              • Outside Plant Duct Bank: <strong>Concrete-Encased 4-Way 110mm HDPE Ducts</strong>
            </div>
            <div>
              • Ingress Sealing: <strong>Heavy-Duty CI Manhole Covers + IP68 Roxtec Seals</strong>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
            <div className="font-bold navy-text text-sm">3. ODFs & Structured Backbone Pathways</div>
            <div>
              • Optical Distribution Frames:{' '}
              <strong>
                {eng.telecom.odfBaysCount} × 48U ODF Bays ({eng.telecom.totalFiberStrands.toLocaleString()} Strands)
              </strong>
            </div>
            <div>
              • Overhead Fiber Troughs: <strong>{eng.telecom.overheadFiberMeters} m Yellow LSZH Corrugated Raceways</strong>
            </div>
            <div>
              • EMI Segregation: <strong>300mm Physical & Metallic Separation from Busducts</strong>
            </div>
            <div>
              • Patch Telemetry: <strong>Automated DCIM Port-Level Patch Governance</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
