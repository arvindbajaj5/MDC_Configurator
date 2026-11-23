import React, { useState } from 'react';
import { Presentation, Sliders, X } from 'lucide-react';
import { PPTX_HOUSE_STYLE } from '../../services/pptxExporter';
import type { DealConfig, FullEngineeringOutput } from '../../types/schema';
import { SliderInput } from '../controls/SliderInput';

interface SplitPreviewPaneProps {
  deal: DealConfig;
  eng: FullEngineeringOutput;
  onPatchDeal: (updater: (d: DealConfig) => DealConfig) => void;
  onCloseMobile?: () => void;
}

export const SplitPreviewPane: React.FC<SplitPreviewPaneProps> = ({
  deal,
  eng,
  onPatchDeal,
  onCloseMobile
}) => {
  const [mode, setMode] = useState<'pptx' | 'whatif'>('pptx');

  return (
    <div className="h-full flex flex-col bg-slate-50 border-l border-slate-200 text-xs">
      <div className="px-3 py-2 bg-white border-b border-slate-200 flex items-center justify-between gap-2 shrink-0">
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => setMode('pptx')}
            className={`px-2 py-1 rounded-cad text-[11px] font-semibold flex items-center gap-1 ${
              mode === 'pptx' ? 'bg-brand-navy text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Presentation className="w-3 h-3" /> PPTX Style
          </button>
          <button
            type="button"
            onClick={() => setMode('whatif')}
            className={`px-2 py-1 rounded-cad text-[11px] font-semibold flex items-center gap-1 ${
              mode === 'whatif' ? 'bg-brand-navy text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Sliders className="w-3 h-3" /> Quick What-If
          </button>
        </div>
        {onCloseMobile && (
          <button type="button" onClick={onCloseMobile} className="p-1 text-slate-500 hover:text-slate-900">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {mode === 'pptx' ? (
          <>
            {/* 16:9 Live Corporate House-Style Slide Preview with Exact 3.1-Inch Blank Footer Band */}
            <div className="bg-white border border-slate-300 shadow-sm aspect-video flex flex-col overflow-hidden relative">
              {/* Top 58.6% Content Zone (4.4" / 7.5") */}
              <div className="h-[58.6%] p-2.5 flex flex-col justify-between bg-white">
                <div className="flex items-center gap-1.5 border-b border-slate-200 pb-1">
                  <span className="w-1 h-4 bg-brand-orange inline-block shrink-0" />
                  <p className="font-display font-black text-[11px] text-brand-navy truncate">
                    {deal.name}
                  </p>
                </div>
                <div className="grid grid-cols-4 gap-1 my-1">
                  <div className="border-t-2 border-brand-orange bg-slate-50 p-1">
                    <p className="text-[7px] text-slate-500">IT LOAD</p>
                    <p className="font-mono font-bold text-[10px] text-brand-orange">{eng.mep.itLoadMw} MW</p>
                  </div>
                  <div className="border-t-2 border-brand-emerald bg-slate-50 p-1">
                    <p className="text-[7px] text-slate-500">PUE</p>
                    <p className="font-mono font-bold text-[10px] text-brand-emerald">{eng.mep.estimatedPue.toFixed(2)}</p>
                  </div>
                  <div className="border-t-2 border-brand-navy bg-slate-50 p-1">
                    <p className="text-[7px] text-slate-500">CAPEX</p>
                    <p className="font-mono font-bold text-[10px] text-brand-navy">₹{eng.commercial.totalCapexInrCr}Cr</p>
                  </div>
                  <div className="border-t-2 border-brand-cobalt bg-slate-50 p-1">
                    <p className="text-[7px] text-slate-500">MII %</p>
                    <p className="font-mono font-bold text-[10px] text-brand-cobalt">{eng.commercial.weightedBoqMiiPercent}%</p>
                  </div>
                </div>
                <p className="text-[8px] text-slate-700 leading-tight truncate">
                  {eng.civil.foundationType} (FoS {eng.civil.bearingFoS}x) • {eng.electrical.incomingVoltageKv} kV • Zero Yard CDUs
                </p>
              </div>

              {/* Bottom 41.4% Strict Blank 3.1-Inch Footer Clearance Zone */}
              <div className="h-[41.4%] border-t border-dashed border-brand-orange/70 bg-white flex items-center justify-center">
                <span className="font-mono text-[8px] uppercase tracking-wider text-brand-orange/80 bg-orange-50 px-1.5 py-0.5 rounded-sm">
                  {PPTX_HOUSE_STYLE.footerClearanceIn}&quot; Blank Footer Clearance Enforced
                </span>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-cad p-2.5 text-[11px] space-y-1">
              <p className="font-bold text-brand-navy">House Style Lock (PptxGenJS)</p>
              <p className="text-slate-600">Canvas: <code className="font-mono">#FFFFFF</code> Pure White</p>
              <p className="text-slate-600">Header: <code className="font-mono">Tosh A Black 24pt</code> | Body: <code className="font-mono">Roboto &le;12pt</code></p>
              <div className="flex items-center gap-1.5 pt-1">
                {['#FF5539', '#002870', '#1C38F5', '#00B290', '#FFB600'].map((hex) => (
                  <span
                    key={hex}
                    className="w-4 h-4 rounded-sm border border-slate-300"
                    style={{ backgroundColor: hex }}
                    title={hex}
                  />
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="space-y-2.5">
            <SliderInput
              label="IT Load (What-If)"
              value={deal.targetItLoadMw}
              min={0.5}
              max={50}
              step={0.5}
              unit="MW"
              onChange={(v) => onPatchDeal((d) => ({ ...d, targetItLoadMw: v }))}
            />
            <SliderInput
              label="DLC Share"
              value={deal.dlcSharePct}
              min={0}
              max={95}
              step={5}
              unit="%"
              onChange={(v) => onPatchDeal((d) => ({ ...d, dlcSharePct: v }))}
            />
            <SliderInput
              label="Soil SBC (<110 = 4.5m Piles)"
              value={deal.civil.soilSbcKpa}
              min={60}
              max={300}
              step={5}
              unit="kPa"
              hint={eng.civil.foundationType}
              onChange={(v) => onPatchDeal((d) => ({ ...d, civil: { ...d.civil, soilSbcKpa: v } }))}
            />
            <SliderInput
              label="Power Tariff"
              value={deal.commercial.powerTariffInrPerKwh}
              min={5}
              max={14}
              step={0.2}
              unit="₹/kWh"
              onChange={(v) => onPatchDeal((d) => ({ ...d, commercial: { ...d.commercial, powerTariffInrPerKwh: v } }))}
            />
          </div>
        )}
      </div>
    </div>
  );
};
