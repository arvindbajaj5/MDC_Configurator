import React from 'react';
import type { EngineeringResult, ProjectDeal, ShellArchitecture } from '../types/mdc';

interface CivilPlinthPanelProps {
  project: ProjectDeal;
  eng: EngineeringResult;
  onUpdateProject: (patch: Partial<ProjectDeal>) => void;
}

export const CivilPlinthPanel: React.FC<CivilPlinthPanelProps> = ({
  project,
  eng,
  onUpdateProject
}) => {
  const isBnM = project.shellArchitecture === 'BnM_Hall';
  const pod0 = eng.pods?.[0];
  const podDimStr = pod0
    ? `${(pod0.extLengthMm / 1000).toFixed(2)}m L × ${(pod0.extWidthMm / 1000).toFixed(2)}m W × ${(pod0.extHeightMm / 1000).toFixed(2)}m H`
    : `${(project.maxCustomLengthMm / 1000).toFixed(2)}m L × ${(project.containerWidthMm / 1000).toFixed(2)}m W × ${(project.containerHeightMm / 1000).toFixed(2)}m H`;

  const sbcSafe = eng.civil.bearingSafetyFactor >= 2.0;

  return (
    <div className="space-y-5 text-xs">
      <div className="bg-white rounded-2xl card-shadow border border-slate-200 p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
          <div>
            <span className="px-2.5 py-0.5 rounded bg-amber-100 text-amber-950 font-black uppercase text-[10px]">
              Module 03 • Civil, Plinth & Structural Engineering — {project.cityQuery || 'Site Location'}
            </span>
            <h2 className="text-lg font-bold navy-text mt-1">
              {isBnM
                ? 'Brick-and-Mortar (BnM) Structural Hall & Slab Engineering'
                : 'Container Raised RCC Plinth, Soil Bearing & Foundation Engineering'}
            </h2>
            <p className="text-slate-600">
              Correlated directly to <strong>{eng.pods.length || 1} × {podDimStr}</strong> ({project.metallurgy}) • Loaded Unit Mass:{' '}
              <strong>{eng.civil.unitGrossTonnes} Tonnes</strong>
            </p>
          </div>
          <select
            value={project.shellArchitecture}
            onChange={e => onUpdateProject({ shellArchitecture: e.target.value as ShellArchitecture })}
            className="border-2 border-[#002870] rounded-xl px-3 py-1.5 bg-white font-bold navy-text"
          >
            <option value="Container">Enclosure Mode: Modular ISO Corten-A Containers</option>
            <option value="BnM_Hall">Enclosure Mode: Brick-and-Mortar (BnM) Structural Hall</option>
          </select>
        </div>

        {/* City Site Baseline (Editable Overrides) */}
        <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200 grid grid-cols-2 md:grid-cols-5 gap-3">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Deployment City & Elev</span>
            <span className="font-bold navy-text">
              {project.cityQuery} ({project.elevationM || 14}m ASL)
            </span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Peak Site Climate</span>
            <span className="font-bold text-slate-800">
              {project.peakDryBulb}°C DB / {project.peakWetBulb}°C WB ({project.relHumidityPct}% RH)
            </span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500 block">IS 1893 Seismic Zone</span>
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
              className="mt-0.5 w-full border rounded-lg px-2 py-1 bg-white font-bold navy-text"
            >
              <option>Zone II</option>
              <option>Zone III</option>
              <option>Zone IV</option>
              <option>Zone V</option>
            </select>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500 block">
              100-Yr Historical Flood Mark (mm)
            </span>
            <input
              type="number"
              step={50}
              min={0}
              value={project.historicalFloodLevelMm}
              onChange={e => onUpdateProject({ historicalFloodLevelMm: Number(e.target.value) })}
              className="mt-0.5 w-full border rounded-lg px-2 py-1 bg-white font-bold"
            />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500 block">
              Site Soil Bearing SBC (kN/m²)
            </span>
            <input
              type="number"
              step={10}
              min={20}
              value={project.soilBearingCapacityKpa}
              onChange={e => onUpdateProject({ soilBearingCapacityKpa: Number(e.target.value) })}
              className="mt-0.5 w-full border rounded-lg px-2 py-1 bg-white font-bold"
            />
          </div>
        </div>

        {/* Structural Foundation & Plinth Engineering Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
          {isBnM ? (
            <>
              <div>
                <label className="block font-bold text-slate-700 mb-1">BnM Structural Column Grid</label>
                <select
                  value={project.bnmColumnGridM}
                  onChange={e => onUpdateProject({ bnmColumnGridM: e.target.value })}
                  className="w-full border rounded-lg px-2.5 py-1.5 bg-white font-bold"
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
                  className="w-full border rounded-lg px-2.5 py-1.5 bg-white font-bold"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Clear Slab-to-Soffit Height (m)</label>
                <input
                  type="number"
                  step={0.2}
                  value={project.bnmClearSoffitM}
                  onChange={e => onUpdateProject({ bnmClearSoffitM: Number(e.target.value) })}
                  className="w-full border rounded-lg px-2.5 py-1.5 bg-white font-bold"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Fire & Floor Finish Spec</label>
                <div className="px-3 py-1.5 bg-white border rounded-lg font-bold text-emerald-800">
                  2-Hr Fire Wall + ESD Epoxy
                </div>
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Plinth Clear Flood Margin</label>
                <div className="px-3 py-1.5 bg-white border rounded-lg font-black coral-text">
                  +{eng.civil.floodPlinthMm} mm Top-of-Plinth
                </div>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">8-Point ISO Corner Reaction</label>
                <div className="px-3 py-1.5 bg-white border rounded-lg font-black navy-text">
                  {eng.civil.cornerNodeKn} kN / corner casting
                </div>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Uniform Floor Pressure</label>
                <div className="px-3 py-1.5 bg-white border rounded-lg font-bold">
                  {eng.civil.floorPressureKpa} kN/m² ({eng.civil.unitGrossTonnes}T/pod)
                </div>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Anchor & Drainage Spec</label>
                <div className="px-3 py-1.5 bg-white border rounded-lg font-bold text-emerald-800">
                  M30 Shear Bolts + 1:50 Apron
                </div>
              </div>
            </>
          )}
        </div>

        {/* Foundation Depth & Allowable vs Imposed Bearing Capacity Verification */}
        <div
          className={`p-4 rounded-xl border space-y-2.5 ${
            sbcSafe ? 'bg-emerald-50/70 border-emerald-200' : 'bg-amber-50 border-amber-300'
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <strong>Engineered Sub-Structure Design ({project.cityQuery}):</strong>{' '}
              {eng.civil.foundationType} • Total Civil Plinth & Apron Area: <strong>{eng.plinthSqm} m²</strong>
            </div>
            <span
              className={`px-2.5 py-0.5 rounded-full text-[11px] font-black ${
                sbcSafe ? 'bg-emerald-700 text-white' : 'bg-amber-500 text-slate-950'
              }`}
            >
              FoS {eng.civil.bearingSafetyFactor}× ({sbcSafe ? 'Safe ≥ 2.0×' : 'Review Footing / Piles'})
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-emerald-200/80 text-[11px]">
            <div className="bg-white/80 rounded-lg p-2.5 border border-slate-200">
              <span className="text-slate-500 block">Foundation / Embedment Depth</span>
              <strong className="navy-text text-xs">
                {eng.civil.isWeakSoil
                  ? `${eng.civil.embedmentDepthM} m Pile Cap Depth (SBC < 110 kN/m²)`
                  : `${eng.civil.embedmentDepthM} m Below Grade (IS 1904 Pad)`}
              </strong>
            </div>
            <div className="bg-white/80 rounded-lg p-2.5 border border-slate-200">
              <span className="text-slate-500 block">Allowable SBC vs. Imposed Load</span>
              <strong className="text-slate-900 text-xs">
                {eng.civil.sbc} kN/m² allowable vs. {eng.civil.imposedBearingKpa} kN/m² imposed
              </strong>
            </div>
            <div className="bg-white/80 rounded-lg p-2.5 border border-slate-200">
              <span className="text-slate-500 block">Bearing Safety Factor (FoS)</span>
              <strong className={`text-xs ${sbcSafe ? 'text-emerald-800' : 'text-amber-800'}`}>
                {eng.civil.bearingSafetyFactor}× ({sbcSafe ? 'Pass — Meets IS 1904 ≥ 2.0×' : 'Increase Footing Area / Pile Depth'})
              </strong>
            </div>
          </div>
        </div>

        {/* Live Sheet C-101 Structural Plinth / 4.5m Pile Cap Cross-Section Preview */}
        <div className="overflow-x-auto">
          <svg viewBox="0 0 1100 420" className="w-full min-w-[680px] max-w-5xl mx-auto border border-slate-300 rounded-xl bg-white">
            <rect x="0" y="0" width="1100" height="420" fill="#FFFFFF" />
            <rect x="14" y="14" width="1072" height="392" fill="none" stroke="#002870" strokeWidth="2" />
            <text x="32" y="40" fill="#FF5539" fontSize="13.5" fontWeight="bold">
              SHEET C-101 LIVE PREVIEW: {eng.civil.isWeakSoil ? '4.5m PILE CAP & RAISED PLINTH' : 'IS 1904 PAD FOOTING & RAISED PLINTH'} — {project.seismicLabel}
            </text>

            <rect
              x="160"
              y="66"
              width="500"
              height="122"
              fill={project.exteriorColorHex || '#002870'}
              fillOpacity="0.14"
              stroke={project.exteriorColorHex || '#002870'}
              strokeWidth="2.5"
            />
            <text x="410" y="114" fill="#002870" fontSize="12.5" fontWeight="bold" textAnchor="middle">
              {isBnM
                ? `BRICK-AND-MORTAR (${project.bnmColumnGridM} GRID • ${project.bnmSlabThicknessMm}mm SLAB)`
                : `MODULAR CORTEN-A POD (${podDimStr})`}
            </text>
            <text x="410" y="136" fill="#334155" fontSize="10.5" textAnchor="middle">
              Loaded Mass: {eng.civil.unitGrossTonnes} T • Floor Load: {eng.civil.floorPressureKpa} kN/m² • Corner Reaction: {eng.civil.cornerNodeKn} kN/node
            </text>
            <text x="410" y="156" fill="#00B290" fontSize="10" fontWeight="bold" textAnchor="middle">
              Finish: {project.brandingMode === 'standard' ? 'RAL 7035 OEM Standard' : `${project.exteriorRalLabel} / ${project.interiorRalLabel}`}
            </text>

            <rect x="155" y="178" width="26" height="14" fill="#FF5539" />
            <rect x="639" y="178" width="26" height="14" fill="#FF5539" />

            <rect x="135" y="192" width="550" height="48" fill="#CBD5E1" stroke="#334155" strokeWidth="2" />
            <text x="410" y="220" fill="#0F172A" fontSize="11" fontWeight="bold" textAnchor="middle">
              M35 REINFORCED CONCRETE PLINTH (+{eng.civil.floodPlinthMm} mm FLOOD LIFT)
            </text>

            <line x1="112" y1="192" x2="112" y2="240" stroke="#FF5539" strokeWidth="2.2" />
            <text x="104" y="220" fill="#FF5539" fontSize="10.5" fontWeight="bold" textAnchor="end">
              +{eng.civil.floodPlinthMm}mm
            </text>

            <line x1="40" y1="248" x2="135" y2="240" stroke="#00B290" strokeWidth="2.5" />
            <line x1="685" y1="240" x2="765" y2="248" stroke="#00B290" strokeWidth="2.5" />

            {eng.civil.isWeakSoil ? (
              <g>
                <rect x="155" y="240" width="510" height="30" fill="#94A3B8" stroke="#1E293B" strokeWidth="1.5" />
                <text x="410" y="259" fill="#0F172A" fontSize="10" fontWeight="bold" textAnchor="middle">
                  RCC PILE CAP BEAM ({eng.civil.embedmentDepthM}m EMBEDMENT • WEAK SOIL SBC {eng.civil.sbc} kN/m²)
                </text>
                {[200, 340, 480, 620].map((px, i) => (
                  <g key={i}>
                    <rect x={px - 12} y="270" width="24" height="90" fill="#64748B" stroke="#0F172A" />
                    <text x={px} y="320" fill="#FFFFFF" fontSize="8.5" fontWeight="bold" textAnchor="middle">
                      4.5m
                    </text>
                  </g>
                ))}
              </g>
            ) : (
              <g>
                <rect x="125" y="240" width="570" height="44" fill="#E2E8F0" stroke="#64748B" strokeDasharray="4" />
                <text x="410" y="266" fill="#334155" fontSize="10" textAnchor="middle">
                  Isolated M35 Pad Footing ({eng.civil.embedmentDepthM}m Below Grade) + Compacted WMM Sub-Base
                </text>
              </g>
            )}

            <rect x="785" y="66" width="280" height="205" rx="8" fill="#F8FAFC" stroke="#CBD5E1" />
            <text x="802" y="92" fill="#002870" fontSize="11.5" fontWeight="bold">
              Bearing & Foundation Audit
            </text>
            <text x="802" y="118" fill="#334155" fontSize="10.5">
              • Site SBC: {eng.civil.sbc} kN/m²
            </text>
            <text x="802" y="140" fill="#334155" fontSize="10.5">
              • Imposed Load: {eng.civil.imposedBearingKpa} kN/m²
            </text>
            <text x="802" y="162" fill={sbcSafe ? '#059669' : '#D97706'} fontSize="10.5" fontWeight="bold">
              • Safety Factor (FoS): {eng.civil.bearingSafetyFactor}×
            </text>
            <text x="802" y="184" fill="#334155" fontSize="10.5">
              • Embedment: {eng.civil.embedmentDepthM} m ({eng.civil.isWeakSoil ? 'Piles' : 'Pad'})
            </text>
            <text x="802" y="206" fill="#334155" fontSize="10.5">
              • 100-Yr Flood Mark: {project.historicalFloodLevelMm} mm
            </text>
            <text x="802" y="228" fill="#334155" fontSize="10.5">
              • Crane Outrigger: {eng.logistics.outriggerGroundKpa} kN/m²
            </text>
            <text x="802" y="250" fill="#002870" fontSize="10.5" fontWeight="bold">
              • Civil Plinth Area: {eng.plinthSqm} m²
            </text>
          </svg>
        </div>
      </div>
    </div>
  );
};
