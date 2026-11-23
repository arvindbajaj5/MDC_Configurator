import React, { useState } from 'react';
import { BadgeIndianRupee, Tag } from 'lucide-react';
import type {
  BoqLineItem,
  DealConfig,
  FullEngineeringOutput,
  SpecialVendorQuote
} from '../../types/schema';
import { SlideOverDrawer } from '../controls/SlideOverDrawer';
import { SliderInput } from '../controls/SliderInput';

interface CommercialBoqModuleProps {
  deal: DealConfig;
  eng: FullEngineeringOutput;
  onPatchDeal: (updater: (d: DealConfig) => DealConfig) => void;
  onNotify: (tone: 'success' | 'info', title: string, detail?: string) => void;
}

export const CommercialBoqModule: React.FC<CommercialBoqModuleProps> = ({
  deal,
  eng,
  onPatchDeal,
  onNotify
}) => {
  const [quoteLine, setQuoteLine] = useState<BoqLineItem | null>(null);
  const [draftQuote, setDraftQuote] = useState<SpecialVendorQuote | null>(null);

  const openQuoteDrawer = (line: BoqLineItem) => {
    setQuoteLine(line);
    setDraftQuote(
      line.specialQuote
        ? { ...line.specialQuote }
        : {
            lineId: line.lineId,
            vendorName: 'Tier-1 Strategic OEM Partner',
            quoteRef: `SQ-2026-${line.lineId}`,
            discountPct: 5,
            leadTimeWeeks: 14,
            notes: ''
          }
    );
  };

  const saveQuote = () => {
    if (!draftQuote) return;
    onPatchDeal((d) => ({
      ...d,
      specialQuotes: {
        ...d.specialQuotes,
        [draftQuote.lineId]: draftQuote
      }
    }));
    onNotify('success', `Special Quote Applied (${draftQuote.lineId})`, `${draftQuote.vendorName} • ${draftQuote.quoteRef}`);
    setQuoteLine(null);
    setDraftQuote(null);
  };

  const clearQuote = (lineId: string) => {
    onPatchDeal((d) => {
      const next = { ...d.specialQuotes };
      delete next[lineId];
      return { ...d, specialQuotes: next };
    });
    onNotify('info', `Cleared Special Quote on ${lineId}`);
    setQuoteLine(null);
    setDraftQuote(null);
  };

  const maxYrTco = Math.max(...eng.commercial.schedule.map((r) => r.cumulativeTcoInrCr), 1);

  return (
    <div className="space-y-3 text-xs">
      {/* KPI Ribbon */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        <div className="bg-white border border-slate-200 rounded-cad p-2.5">
          <p className="text-[10px] uppercase text-slate-500">Turnkey CapEx (incl. GST)</p>
          <p className="font-mono text-base font-bold text-brand-navy">₹{eng.commercial.totalCapexInrCr} Cr</p>
          <p className="text-[10px] font-mono text-slate-500">₹{eng.commercial.capexPerMwInrCr} Cr / MW</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-cad p-2.5">
          <p className="text-[10px] uppercase text-slate-500">{deal.commercial.tcoYears}-Yr Total OpEx</p>
          <p className="font-mono text-base font-bold text-brand-cobalt">₹{eng.commercial.totalOpex5YrInrCr} Cr</p>
          <p className="text-[10px] font-mono text-slate-500">Power + O&amp;M + AMC + Water</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-cad p-2.5">
          <p className="text-[10px] uppercase text-slate-500">{deal.commercial.tcoYears}-Yr Total TCO</p>
          <p className="font-mono text-base font-bold text-brand-orange">₹{eng.commercial.totalTco5YrInrCr} Cr</p>
          <p className="text-[10px] font-mono text-slate-500">₹{eng.commercial.inrPerItKwh5Yr} / IT kWh</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-cad p-2.5">
          <p className="text-[10px] uppercase text-slate-500">BOQ MII Local Content</p>
          <p className="font-mono text-base font-bold text-brand-emerald">{eng.commercial.weightedBoqMiiPercent}%</p>
          <p className="text-[10px] text-slate-500">{eng.supplyChain.pppMiiClass}</p>
        </div>
      </div>

      {/* Interactive Commercial Sensitivity Sliders */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 bg-white border border-slate-200 rounded-cad p-3">
        <SliderInput
          label="Power Tariff"
          value={deal.commercial.powerTariffInrPerKwh}
          min={5}
          max={14}
          step={0.2}
          unit="₹/kWh"
          onChange={(v) => onPatchDeal((d) => ({ ...d, commercial: { ...d.commercial, powerTariffInrPerKwh: v } }))}
        />
        <SliderInput
          label="Tariff Escalation"
          value={deal.commercial.tariffEscalationPct}
          min={0}
          max={10}
          step={0.5}
          unit="%"
          onChange={(v) => onPatchDeal((d) => ({ ...d, commercial: { ...d.commercial, tariffEscalationPct: v } }))}
        />
        <SliderInput
          label="SI Margin"
          value={deal.commercial.marginPct}
          min={4}
          max={25}
          step={0.5}
          unit="%"
          onChange={(v) => onPatchDeal((d) => ({ ...d, commercial: { ...d.commercial, marginPct: v } }))}
        />
        <SliderInput
          label="Contingency"
          value={deal.commercial.contingencyPct}
          min={0}
          max={15}
          step={0.5}
          unit="%"
          onChange={(v) => onPatchDeal((d) => ({ ...d, commercial: { ...d.commercial, contingencyPct: v } }))}
        />
      </div>

      {/* Turnkey BOQ Table with Special Quote Action */}
      <div className="bg-white border border-slate-200 rounded-cad overflow-x-auto">
        <div className="px-3 py-2 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <h3 className="font-bold uppercase tracking-wider text-brand-navy flex items-center gap-1.5">
            <BadgeIndianRupee className="w-3.5 h-3.5 text-brand-orange" />
            Engineering-Linked Commercial BOQ (Click Quote to Override)
          </h3>
          <span className="font-mono text-[11px] text-slate-600">
            Subtotal ₹{eng.commercial.equipmentSubtotalInrCr} Cr + Cont ₹{eng.commercial.contingencyInrCr} Cr + Margin ₹{eng.commercial.marginInrCr} Cr + GST ₹{eng.commercial.gstInrCr} Cr
          </span>
        </div>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase text-slate-600">
              <th className="px-2.5 py-2">Code</th>
              <th className="px-2.5 py-2">Scope Package</th>
              <th className="px-2.5 py-2 text-right">Qty</th>
              <th className="px-2.5 py-2 text-right">MII %</th>
              <th className="px-2.5 py-2 text-right">Extended (₹ Cr)</th>
              <th className="px-2.5 py-2 text-right">Special Quote</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {eng.commercial.boqLines.map((line) => (
              <tr key={line.lineId} className="hover:bg-slate-50">
                <td className="px-2.5 py-2 font-mono font-semibold text-brand-navy">{line.lineId}</td>
                <td className="px-2.5 py-2">
                  <p className="font-medium text-slate-900">{line.description}</p>
                  {line.hasSpecialQuote && line.specialQuote && (
                    <p className="text-[10px] font-mono text-brand-orange">
                      Quote {line.specialQuote.quoteRef} ({line.specialQuote.vendorName})
                    </p>
                  )}
                </td>
                <td className="px-2.5 py-2 text-right font-mono">{line.quantity} {line.unit}</td>
                <td className="px-2.5 py-2 text-right font-mono text-brand-emerald">{line.miiPercent}%</td>
                <td className="px-2.5 py-2 text-right font-mono font-bold">₹{line.extendedCostInrCr.toFixed(2)}</td>
                <td className="px-2.5 py-2 text-right">
                  <button
                    type="button"
                    onClick={() => openQuoteDrawer(line)}
                    className={`px-2 py-1 rounded-cad text-[10px] font-semibold border inline-flex items-center gap-1 ${
                      line.hasSpecialQuote
                        ? 'bg-brand-orange text-white border-brand-orange'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <Tag className="w-3 h-3" />
                    {line.hasSpecialQuote ? 'Edit Quote' : 'Special Quote'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 5-Year TCO Schedule & Cumulative Bar Visual */}
      <div className="bg-white border border-slate-200 rounded-cad p-3 space-y-2.5">
        <h3 className="text-xs font-bold uppercase tracking-wider text-brand-navy">
          {deal.commercial.tcoYears}-Year TCO Escalation Schedule (85% AI Utilization @ PUE {eng.mep.estimatedPue.toFixed(2)})
        </h3>
        <div className="space-y-1.5">
          {eng.commercial.schedule.map((row) => {
            const pct = Math.min(100, (row.cumulativeTcoInrCr / maxYrTco) * 100);
            return (
              <div key={row.year} className="grid grid-cols-12 items-center gap-2 text-[11px] font-mono">
                <span className="col-span-2 font-bold text-brand-navy">Year {row.year}</span>
                <div className="col-span-6 bg-slate-100 h-4 rounded-cad overflow-hidden border border-slate-200">
                  <div className="bg-brand-navy h-full" style={{ width: `${pct}%` }} />
                </div>
                <span className="col-span-2 text-right text-slate-600">OpEx ₹{row.totalOpexInrCr}</span>
                <span className="col-span-2 text-right font-bold text-brand-orange">₹{row.cumulativeTcoInrCr} Cr</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Special Vendor Quote Slide-Over Drawer */}
      <SlideOverDrawer
        open={Boolean(quoteLine && draftQuote)}
        title={quoteLine ? `Special Vendor Quote — ${quoteLine.lineId}` : ''}
        subtitle={quoteLine?.description}
        onClose={() => {
          setQuoteLine(null);
          setDraftQuote(null);
        }}
        footer={
          <>
            {quoteLine?.hasSpecialQuote && (
              <button
                type="button"
                onClick={() => clearQuote(quoteLine.lineId)}
                className="px-3 py-1.5 border border-red-300 text-red-700 rounded-cad bg-white text-xs font-semibold mr-auto"
              >
                Remove Override
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setQuoteLine(null);
                setDraftQuote(null);
              }}
              className="px-3 py-1.5 border border-slate-300 rounded-cad bg-white text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={saveQuote}
              className="px-3 py-1.5 bg-brand-orange text-white rounded-cad text-xs font-semibold"
            >
              Apply Quote
            </button>
          </>
        }
      >
        {quoteLine && draftQuote && (
          <div className="space-y-3 text-xs">
            <div className="border border-slate-200 bg-slate-50 rounded-cad p-2.5 font-mono">
              Base Catalog Unit Rate: <strong>₹{quoteLine.baseUnitCostInrCr.toFixed(3)} Cr</strong> × {quoteLine.quantity} {quoteLine.unit}
            </div>
            <label className="block">
              <span className="text-[10px] font-semibold uppercase text-slate-500">Vendor / Partner Name</span>
              <input
                type="text"
                value={draftQuote.vendorName}
                onChange={(e) => setDraftQuote({ ...draftQuote, vendorName: e.target.value })}
                className="mt-1 w-full border border-slate-300 rounded-cad px-2.5 py-1.5"
              />
            </label>
            <label className="block">
              <span className="text-[10px] font-semibold uppercase text-slate-500">Quote Reference #</span>
              <input
                type="text"
                value={draftQuote.quoteRef}
                onChange={(e) => setDraftQuote({ ...draftQuote, quoteRef: e.target.value })}
                className="mt-1 w-full border border-slate-300 rounded-cad px-2.5 py-1.5 font-mono"
              />
            </label>
            <SliderInput
              label="Negotiated Vendor Discount"
              value={draftQuote.discountPct ?? 0}
              min={0}
              max={30}
              step={1}
              unit="%"
              onChange={(v) => setDraftQuote({ ...draftQuote, discountPct: v, overrideUnitCostInrCr: undefined })}
            />
            <label className="block">
              <span className="text-[10px] font-semibold uppercase text-slate-500">
                Or Direct Override Unit Price (₹ Cr, optional)
              </span>
              <input
                type="number"
                step={0.05}
                value={draftQuote.overrideUnitCostInrCr ?? ''}
                placeholder="Leave blank to use discount %"
                onChange={(e) =>
                  setDraftQuote({
                    ...draftQuote,
                    overrideUnitCostInrCr: e.target.value === '' ? undefined : Number(e.target.value)
                  })
                }
                className="mt-1 w-full border border-slate-300 rounded-cad px-2.5 py-1.5 font-mono"
              />
            </label>
          </div>
        )}
      </SlideOverDrawer>
    </div>
  );
};
