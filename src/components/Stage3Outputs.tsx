import React, { useState } from 'react';
import {
  build15PointSummaryRows,
  exportEngineeringPdfDossier,
  exportPerUnitDatasheetsPdf
} from '../engine/csvPdfExporters';
import { formatMoney } from '../engine/engineeringEngine';
import {
  export15PointSummaryXlsx,
  exportCommercialPriceXlsx,
  exportEngineeringBomXlsx,
  exportFullProposalWorkbookXlsx,
  exportPartnerRfqXlsx
} from '../engine/excelExporter';
import { exportStrictNativePptxDeck } from '../engine/pptxExporter';
import type { ColorPalette, EngineeringResult, MasterStandards, ProjectDeal } from '../types/mdc';
import { CadBlueprintViewer } from './CadBlueprintViewer';
import { ThreeDStudio } from './ThreeDStudio';

interface Stage3OutputsProps {
  project: ProjectDeal;
  eng: EngineeringResult;
  standards: MasterStandards;
  palette: ColorPalette;
  logoDataUrl?: string;
  onUpdatePalette: (key: keyof Omit<ColorPalette, 'label'>, hex: string) => void;
  onApplyTheme: (themeKey: string) => void;
  onBackToDesign: () => void;
}

type OutputSubView =
  | 'summary_ashrae'
  | 'equip_schedule'
  | 'l1_l5_civil'
  | 'cad_8'
  | 'studio_3d'
  | 'boq_readonly';

export const Stage3Outputs: React.FC<Stage3OutputsProps> = ({
  project,
  eng,
  standards,
  palette,
  logoDataUrl,
  onUpdatePalette,
  onApplyTheme,
  onBackToDesign
}) => {
  const [subView, setSubView] = useState<OutputSubView>('summary_ashrae');
  const [exportingXlsx, setExportingXlsx] = useState(false);
  const summaryRows = build15PointSummaryRows(project, eng);

  const runXlsx = async (fn: () => Promise<void>) => {
    setExportingXlsx(true);
    try {
      await fn();
    } finally {
      setExportingXlsx(false);
    }
  };

  return (
    <div className="space-y-5 text-xs">
      {/* Top Deliverables & Export Action Bar */}
      <div className="bg-white rounded-2xl card-shadow border border-slate-200 p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded bg-teal-100 text-teal-950 font-black uppercase text-[10px]">
                Stage 03 • Executive Deliverables, 8 CAD Sheets, 3D Studio, Styled Excel (.XLSX) & PPTX
              </span>
              {eng.waivedCount > 0 && (
                <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-950 font-bold text-[10px]">
                  {eng.waivedCount} Accepted Deviation(s)
                </span>
              )}
              {eng.unwaivedFailCount > 0 && (
                <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-950 font-bold text-[10px]">
                  {eng.unwaivedFailCount} Unwaived Alert(s) — Soft Gate Open
                </span>
              )}
            </div>
            <h2 className="text-xl font-bold navy-text mt-1">
              Turnkey Proposal Deliverables — {project.name}
            </h2>
            <p className="text-slate-500">
              Non-IT Pre-Tax: <strong>{formatMoney(eng.totals.sellingPreTax, project.currency, standards)}</strong> • Incl.{' '}
              {project.gstPct}% GST: <strong>{formatMoney(eng.totals.grandTotal, project.currency, standards)}</strong> • 5-Yr TCO:{' '}
              <strong>{formatMoney(eng.fiveYearTcoInr, project.currency, standards)}</strong> • MII:{' '}
              <strong className="text-emerald-800">{eng.mii.miiClassLabel}</strong>
            </p>
          </div>

          <button
            onClick={onBackToDesign}
            className="px-3.5 py-2 rounded-lg border border-slate-300 bg-slate-50 hover:bg-slate-100 font-bold navy-text"
          >
            ← Edit in Stage 2 Design
          </button>
        </div>

        {/* Branded Native Export Buttons (.PPTX, .PDF, Styled .XLSX) */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => exportStrictNativePptxDeck(project, eng, standards)}
            className="px-4 py-2 rounded-xl coral-bg hover:opacity-95 text-white font-black shadow"
          >
            Export Engineering Deck (.PPTX)
          </button>
          <button
            disabled={exportingXlsx}
            onClick={() =>
              runXlsx(() => exportFullProposalWorkbookXlsx(project, eng, standards, logoDataUrl))
            }
            className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-black shadow"
          >
            {exportingXlsx ? 'Building Workbook...' : 'Complete Proposal Workbook (.XLSX)'}
          </button>
          <button
            onClick={() => exportEngineeringPdfDossier(project, eng, standards)}
            className="px-3.5 py-2 rounded-xl navy-bg hover:opacity-95 text-white font-bold"
          >
            Engineering Dossier (.PDF)
          </button>
          <button
            onClick={() => exportPerUnitDatasheetsPdf(project, eng)}
            className="px-3.5 py-2 rounded-xl bg-indigo-700 hover:bg-indigo-600 text-white font-bold"
          >
            Per-Unit Datasheets (.PDF)
          </button>
          <button
            disabled={exportingXlsx}
            onClick={() => runXlsx(() => export15PointSummaryXlsx(project, eng, logoDataUrl))}
            className="px-3 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 font-bold navy-text"
          >
            15-Point Summary (.XLSX)
          </button>
          <button
            disabled={exportingXlsx}
            onClick={() => runXlsx(() => exportEngineeringBomXlsx(project, eng, logoDataUrl))}
            className="px-3 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 font-bold navy-text"
          >
            Engineering BOM & Schedule (.XLSX)
          </button>
          <button
            disabled={exportingXlsx}
            onClick={() =>
              runXlsx(() => exportCommercialPriceXlsx(project, eng, standards, logoDataUrl))
            }
            className="px-3 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 font-bold navy-text"
          >
            Commercial Price Sheet (.XLSX)
          </button>
          <button
            disabled={exportingXlsx}
            onClick={() => runXlsx(() => exportPartnerRfqXlsx(project, eng, logoDataUrl))}
            className="px-3 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold"
          >
            Partner RFQ (.XLSX) ({eng.dealPlaceholders.length})
          </button>
        </div>

        {/* Stage 3 Sub-View Switcher */}
        <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-200">
          {(
            [
              ['summary_ashrae', '1. 15-Point Summary & ASHRAE'],
              ['equip_schedule', `2. Equipment Schedule (${eng.equipmentSchedule.length})`],
              ['l1_l5_civil', '3. L1–L5 Matrix & Unit Datasheets'],
              ['cad_8', '4. 8 CAD Sheets (A-101 to M-301)'],
              ['studio_3d', '5. 360° 3D Studio'],
              ['boq_readonly', `6. Consolidated BOQ & 5-Yr TCO (${eng.bomItems.length})`]
            ] as [OutputSubView, string][]
          ).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setSubView(id)}
              className={`px-3.5 py-1.5 rounded-lg font-bold ${
                subView === id ? 'navy-bg text-white' : 'bg-slate-100 text-slate-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* VIEW 1: READ-ONLY 15-POINT SUMMARY + 12-MONTH ASHRAE PROFILE */}
      {subView === 'summary_ashrae' && (
        <div className="space-y-5">
          <div className="bg-white rounded-2xl card-shadow border border-slate-200 overflow-hidden">
            <div className="navy-bg text-white p-4 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-300">
                  Read-Only Engineering & Commercial Specification
                </span>
                <h3 className="text-base font-bold">15-Point Executive Solution Summary</h3>
              </div>
              <span className="px-2.5 py-1 rounded bg-white/15 text-[11px] font-bold">
                {project.shellArchitecture === 'BnM_Hall' ? 'Brick-and-Mortar Hall' : 'ISO Modular Containers'}
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <tbody>
                  {summaryRows.map(([k, v], idx) => (
                    <tr key={idx} className={`border-b border-slate-200 ${idx % 2 === 1 ? 'bg-slate-50/70' : 'bg-white'}`}>
                      <td className="p-2.5 font-bold navy-text w-1/3 sm:w-72 align-top">{k}</td>
                      <td className="p-2.5 text-slate-800">{v}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white rounded-2xl card-shadow border border-slate-200 p-5 space-y-3">
            <div>
              <h3 className="text-base font-bold navy-text">
                12-Month ASHRAE Microclimate & Evaporative Water Profile ({project.cityQuery})
              </h3>
              <p className="text-slate-500">
                Target Supply: <strong>{eng.effectiveSupplyTempC}°C</strong> (Loop Limit:{' '}
                {(eng.effectiveSupplyTempC - 3).toFixed(1)}°C) • Free-Cooling: <strong>{eng.freeCoolMonths} mos</strong> •
                Adiabatic Spray: <strong>{eng.adiabaticMonths} mos</strong> • Trim Chiller:{' '}
                <strong>{eng.trimChillerMonths} mos</strong> • Annual Water:{' '}
                <strong>{eng.annualWaterKl.toLocaleString()} kL</strong>
              </p>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-6 lg:grid-cols-12 gap-2 text-center">
              {eng.monthlyProfile.map(m => (
                <div
                  key={m.month}
                  className={`p-2.5 rounded-xl border ${
                    m.mode === 'FreeCooling'
                      ? 'bg-emerald-50 border-emerald-300'
                      : m.mode === 'AdiabaticSpray'
                        ? 'bg-amber-50 border-amber-300'
                        : 'bg-red-50 border-red-300'
                  }`}
                >
                  <div className="font-black text-slate-900">{m.month}</div>
                  <div className="text-[11px] text-slate-700 mt-0.5">DB: {m.dryBulbC}°</div>
                  <div className="text-[11px] text-slate-700">WB: {m.wetBulbC}°</div>
                  <div className="font-black text-sky-900 mt-1">{m.monthlyWaterKl} kL</div>
                  <div className="text-[9px] font-black uppercase mt-0.5">
                    {m.mode === 'FreeCooling' ? 'Free Cool' : m.mode === 'AdiabaticSpray' ? 'Adiabatic' : 'Trim Chill'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: MASTER EQUIPMENT SCHEDULE (RATINGS, DIMENSIONS, WEIGHTS & ROOMS) */}
      {subView === 'equip_schedule' && (
        <div className="bg-white rounded-2xl card-shadow border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-bold navy-text">
                Master Equipment Schedule — Ratings, Physical Dimensions, Weights & Rooms
              </h3>
              <p className="text-slate-500">
                Includes enclosure, internal CDUs/PACs, coolers/chillers, pumps, tanks, transformers, Form-4B switchgear, UPS, battery banks, DGs, and upper-floor lift.
              </p>
            </div>
            <button
              disabled={exportingXlsx}
              onClick={() => runXlsx(() => exportEngineeringBomXlsx(project, eng, logoDataUrl))}
              className="px-3 py-1.5 rounded-lg bg-emerald-700 text-white font-bold"
            >
              Export Schedule (.XLSX)
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="navy-bg text-white text-[11px]">
                  <th className="p-2.5">Tag</th>
                  <th className="p-2.5">Equipment & Category</th>
                  <th className="p-2.5">Location / Room</th>
                  <th className="p-2.5">OEM Make & Model</th>
                  <th className="p-2.5">Rating & Redundancy</th>
                  <th className="p-2.5">Dimensions (L×W×H)</th>
                  <th className="p-2.5 text-right">Area / Wt</th>
                  <th className="p-2.5">Key Specs</th>
                </tr>
              </thead>
              <tbody>
                {eng.equipmentSchedule.map((eq, idx) => (
                  <tr
                    key={eq.assetTag}
                    className={`border-b border-slate-200 ${idx % 2 === 1 ? 'bg-slate-50/60' : 'bg-white'}`}
                  >
                    <td className="p-2.5 font-mono font-black coral-text">{eq.assetTag}</td>
                    <td className="p-2.5">
                      <div className="font-bold navy-text">{eq.equipmentName}</div>
                      <div className="text-[10px] text-slate-500">{eq.category}</div>
                    </td>
                    <td className="p-2.5 font-semibold text-slate-700">{eq.location}</td>
                    <td className="p-2.5">
                      <div className="font-bold">{eq.make}</div>
                      <div className="text-[10px] font-mono text-slate-500">{eq.model}</div>
                    </td>
                    <td className="p-2.5 font-bold text-slate-800">{eq.ratingAndRedundancy}</td>
                    <td className="p-2.5 font-mono text-[11px]">{eq.dimensionsM}</td>
                    <td className="p-2.5 text-right whitespace-nowrap font-bold">
                      {eq.footprintSqm} m²
                      <span className="block text-[10px] text-slate-500 font-normal">
                        {(eq.operatingWeightKg / 1000).toFixed(1)} T/unit
                      </span>
                    </td>
                    <td className="p-2.5 text-slate-600">{eq.keySpecs}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 3: L1-L5 COMMISSIONING MATRIX & PER-UNIT DATASHEETS */}
      {subView === 'l1_l5_civil' && (
        <div className="space-y-5">
          <div className="bg-white rounded-2xl card-shadow border border-slate-200 p-5 space-y-3">
            <h3 className="text-base font-bold navy-text">L1–L5 Turnkey Commissioning & Load-Bank IST Matrix</h3>
            <table className="w-full text-left border-collapse border border-slate-200">
              <thead>
                <tr className="navy-bg text-white text-[11px]">
                  <th className="p-2.5">Commissioning Level</th>
                  <th className="p-2.5">Engineering Verification & Load-Bank Scope</th>
                  <th className="p-2.5">Sign-Off Gate</th>
                </tr>
              </thead>
              <tbody>
                {eng.commissioningSchedule.map((c, idx) => (
                  <tr key={idx} className="border-b border-slate-200">
                    <td className="p-2.5 font-bold navy-text">{c.level}</td>
                    <td className="p-2.5 text-slate-700">{c.scope}</td>
                    <td className="p-2.5">
                      <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-900 font-bold">{c.gate}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="bg-white rounded-2xl card-shadow border border-slate-200 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold navy-text">
                Per-Unit Container / BnM Bay Technical & Branding Datasheets ({eng.unitDatasheets.length} Units)
              </h3>
              <button
                onClick={() => exportPerUnitDatasheetsPdf(project, eng)}
                className="px-3 py-1.5 rounded-lg navy-bg text-white font-bold"
              >
                Download Per-Unit PDF
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse border border-slate-200">
                <thead>
                  <tr className="bg-slate-100 text-slate-800 text-[11px]">
                    <th className="p-2">Unit ID</th>
                    <th className="p-2">Shell / Bay Spec</th>
                    <th className="p-2">IT Load & Racks</th>
                    <th className="p-2">Internal PAC & CDU</th>
                    <th className="p-2">Gross Mass</th>
                    <th className="p-2">Coating & Rack Finish</th>
                    <th className="p-2">Artwork Status</th>
                  </tr>
                </thead>
                <tbody>
                  {eng.unitDatasheets.map(u => (
                    <tr key={u.unitId} className="border-b border-slate-200">
                      <td className="p-2 font-black navy-text">{u.unitId}</td>
                      <td className="p-2">{u.shellSpec}</td>
                      <td className="p-2 font-bold">
                        {u.itKw} kW ({u.rackCount} Racks)
                      </td>
                      <td className="p-2">{u.internalEquip}</td>
                      <td className="p-2">{u.grossTonnes} T</td>
                      <td className="p-2">
                        {u.coatingSpec} • {u.rackFinish}
                      </td>
                      <td className="p-2 font-bold text-amber-800">{u.artworkStatus}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 4: 8 CAD SHEETS (A-101, A-102, C-101, E-201, E-202, G-101, R-101, M-301) WITH PROPORTIONAL LOGO */}
      {subView === 'cad_8' && (
        <CadBlueprintViewer
          project={project}
          eng={eng}
          standards={standards}
          palette={palette}
          logoDataUrl={logoDataUrl}
          onUpdatePalette={onUpdatePalette}
          onApplyTheme={onApplyTheme}
        />
      )}

      {/* VIEW 5: 360° 3D STUDIO */}
      {subView === 'studio_3d' && (
        <ThreeDStudio
          project={project}
          eng={eng}
          palette={palette}
          onUpdatePalette={onUpdatePalette}
          onApplyTheme={onApplyTheme}
        />
      )}

      {/* VIEW 6: READ-ONLY CONSOLIDATED BOQ & 5-YEAR LIFECYCLE TCO */}
      {subView === 'boq_readonly' && (
        <div className="bg-white rounded-2xl card-shadow border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold navy-text">Consolidated Turnkey BOQ & 5-Year Lifecycle TCO</h3>
              <p className="text-slate-500">
                Annual Power: {formatMoney(eng.annualPowerCostInr, project.currency, standards)} • Annual Water:{' '}
                {formatMoney(eng.annualWaterCostInr, project.currency, standards)} • 5-Year TCO:{' '}
                <strong>{formatMoney(eng.fiveYearTcoInr, project.currency, standards)}</strong>
              </p>
            </div>
            <div className="text-right">
              <div className="font-bold text-slate-600">
                Pre-Tax: {formatMoney(eng.totals.sellingPreTax, project.currency, standards)}
              </div>
              <div className="text-base font-black navy-text">
                Incl. {project.gstPct}% GST: {formatMoney(eng.totals.grandTotal, project.currency, standards)}
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="navy-bg text-white text-[11px]">
                  <th className="p-2.5">Category</th>
                  <th className="p-2.5">Subsystem / Scope</th>
                  <th className="p-2.5">Make & Model</th>
                  <th className="p-2.5 text-center">MII %</th>
                  <th className="p-2.5 text-right">Qty</th>
                  <th className="p-2.5 text-right">Pre-Tax Total</th>
                </tr>
              </thead>
              <tbody>
                {eng.bomItems.map((it, idx) => (
                  <tr
                    key={`${it.key}-${idx}`}
                    className={`border-b border-slate-200 ${idx % 2 === 1 ? 'bg-slate-50/50' : 'bg-white'}`}
                  >
                    <td className="p-2.5 font-semibold text-slate-600">{it.category}</td>
                    <td className="p-2.5">
                      <div className="font-bold text-slate-900">{it.label}</div>
                      <div className="text-[11px] text-slate-500">{it.specs}</div>
                    </td>
                    <td className="p-2.5">
                      <div className="font-bold navy-text">{it.make}</div>
                      <div className="text-[11px] text-slate-500 font-mono">{it.model}</div>
                    </td>
                    <td className="p-2.5 text-center font-bold text-emerald-800">{it.miiPct}%</td>
                    <td className="p-2.5 text-right font-black">{it.qty}</td>
                    <td className="p-2.5 text-right font-black navy-text">
                      {formatMoney(it.sellingPreTax, project.currency, standards)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
