import React, { useState } from 'react';
import { formatMoney } from '../engine/engineeringEngine';
import type {
  BomLineItem,
  ColorPalette,
  DealPriceOverride,
  EngineeringResult,
  InlineSkuOverride,
  MasterStandards,
  NonItCatalogItem,
  ProjectDeal,
  SupplyChainSku
} from '../types/mdc';
import { ThreeDStudio } from './ThreeDStudio';

interface Stage2DesignProps {
  project: ProjectDeal;
  eng: EngineeringResult;
  standards: MasterStandards;
  supplyItems: SupplyChainSku[];
  nonItCatalog: NonItCatalogItem[];
  palette: ColorPalette;
  onUpdateProject: (patch: Partial<ProjectDeal>) => void;
  onPromoteSkuToMaster: (newItem: NonItCatalogItem, newSupplySku: SupplyChainSku) => void;
  onUpdatePalette: (key: keyof Omit<ColorPalette, 'label'>, hex: string) => void;
  onApplyTheme: (themeKey: string) => void;
  onProceedToOutputs: () => void;
}

export const Stage2Design: React.FC<Stage2DesignProps> = ({
  project,
  eng,
  standards,
  supplyItems,
  nonItCatalog,
  palette,
  onUpdateProject,
  onPromoteSkuToMaster,
  onUpdatePalette,
  onApplyTheme,
  onProceedToOutputs
}) => {
  const [show3DModeling, setShow3DModeling] = useState(true);
  const [designSubTab, setDesignSubTab] = useState<'mep_bom' | 'whitespace_civil' | 'validation'>('mep_bom');

  // Inline SKU Replacement Modal state ("This Deal Only" vs "Promote to Master")
  const [replaceGroup, setReplaceGroup] = useState<string | null>(null);
  const [replaceForm, setReplaceForm] = useState({
    selectedSupplyId: '',
    make: '',
    model: '',
    label: '',
    ratedCapacity: 1000,
    capacityUnit: 'kVA',
    footprintSqm: 14,
    unitCostInr: 4200000,
    miiPct: 85,
    scope: 'deal_only' as 'deal_only' | 'promoted_master'
  });

  // Special Vendor Quote Modal state
  const [quoteItem, setQuoteItem] = useState<BomLineItem | null>(null);
  const [quoteForm, setQuoteForm] = useState<DealPriceOverride>({
    mode: 'price',
    discountPct: 0,
    specialPrice: 0,
    validUntil: new Date(Date.now() + 60 * 86400000).toISOString().slice(0, 10),
    comments: '',
    vendorName: '',
    vendorSku: ''
  });

  // Soft Validation Gate Waiver Draft Notes
  const [waiverNotes, setWaiverNotes] = useState<Record<string, string>>({});

  const openInlineReplace = (group: string) => {
    const currentMatch = eng.supplyMatches[group];
    const matchingSupply = supplyItems.filter(s => s.group === group);
    const first = matchingSupply[0];
    setReplaceGroup(group);
    setReplaceForm({
      selectedSupplyId: first?.id || '',
      make: currentMatch?.vendor || first?.vendor || 'OEM Vendor',
      model: currentMatch?.model || first?.sku || 'SKU-01',
      label: currentMatch?.label || (first ? `${first.vendor} ${first.family} (${first.rating} ${first.unit})` : ''),
      ratedCapacity: currentMatch?.ratedCapacity || first?.rating || 1000,
      capacityUnit: currentMatch?.demandUnit || first?.unit || 'kVA',
      footprintSqm: currentMatch?.footprintSqm || first?.footprintSqm || 14,
      unitCostInr: currentMatch?.unitPriceInr || (first ? Math.round((first.baseLow + first.baseHigh) / 2) : 4000000),
      miiPct: currentMatch?.miiPct || first?.miiPct || 85,
      scope: 'deal_only'
    });
  };

  const applyInlineReplacement = () => {
    if (!replaceGroup) return;
    const newSkuId = `custom-${replaceGroup}-${Date.now()}`;
    const overrideObj: InlineSkuOverride = {
      group: replaceGroup,
      skuId: newSkuId,
      label: replaceForm.label || `${replaceForm.make} ${replaceForm.model} (${replaceForm.ratedCapacity} ${replaceForm.capacityUnit})`,
      make: replaceForm.make,
      model: replaceForm.model,
      ratedCapacity: Number(replaceForm.ratedCapacity) || 1000,
      capacityUnit: replaceForm.capacityUnit,
      footprintSqm: Number(replaceForm.footprintSqm) || 12,
      unitCostInr: Number(replaceForm.unitCostInr) || 1000000,
      miiPct: Number(replaceForm.miiPct) || 85,
      scope: replaceForm.scope
    };

    const nextInline = { ...(project.inlineSkuOverrides || {}), [replaceGroup]: overrideObj };
    const nextQtyOv = { ...(project.solutionQtyOverrides || {}) };
    delete nextQtyOv[replaceGroup];
    onUpdateProject({ inlineSkuOverrides: nextInline, solutionQtyOverrides: nextQtyOv });

    if (replaceForm.scope === 'promoted_master') {
      const catItem: NonItCatalogItem = {
        id: newSkuId,
        group: replaceGroup,
        category: nonItCatalog.find(i => i.group === replaceGroup)?.category || 'Promoted OEM Equipment',
        label: overrideObj.label,
        ratedCapacity: overrideObj.ratedCapacity,
        capacityUnit: overrideObj.capacityUnit,
        footprintSqm: overrideObj.footprintSqm,
        unit: `per ${overrideObj.ratedCapacity}${overrideObj.capacityUnit}`,
        cost: overrideObj.unitCostInr,
        make: overrideObj.make,
        model: overrideObj.model,
        miiPct: overrideObj.miiPct,
        origin: 'India'
      };
      const supplyItem: SupplyChainSku = {
        id: `SI-PROM-${Date.now()}`,
        group: replaceGroup,
        category: catItem.category,
        vendor: overrideObj.make,
        tier: 'Tier-1',
        family: overrideObj.label,
        sku: overrideObj.model,
        rating: overrideObj.ratedCapacity,
        unit: overrideObj.capacityUnit,
        footprintSqm: overrideObj.footprintSqm,
        basis: 'Promoted from Deal Studio',
        lead: '10 Wks',
        baseLow: overrideObj.unitCostInr,
        baseHigh: overrideObj.unitCostInr,
        miiClass: overrideObj.miiPct >= 50 ? 'Class-I' : 'Class-II',
        miiPct: overrideObj.miiPct,
        confidence: 'Verified',
        trustSource: 'ManualMaster',
        lastSeen: new Date().toISOString().slice(0, 10)
      };
      onPromoteSkuToMaster(catItem, supplyItem);
    }

    setReplaceGroup(null);
  };

  const clearInlineReplacement = (group: string) => {
    const next = { ...(project.inlineSkuOverrides || {}) };
    delete next[group];
    onUpdateProject({ inlineSkuOverrides: next });
  };

  const openQuoteModal = (item: BomLineItem) => {
    const existing = project.dealOverrides?.[item.key];
    setQuoteItem(item);
    setQuoteForm({
      mode: existing?.mode || 'price',
      discountPct: existing?.discountPct ?? 0,
      specialPrice: existing?.specialPrice ?? item.unitCost,
      validUntil: existing?.validUntil || new Date(Date.now() + 60 * 86400000).toISOString().slice(0, 10),
      comments: existing?.comments || '',
      vendorName: existing?.vendorName || item.make,
      vendorSku: existing?.vendorSku || item.model
    });
  };

  const saveQuoteOverride = () => {
    if (!quoteItem) return;
    onUpdateProject({
      dealOverrides: {
        ...(project.dealOverrides || {}),
        [quoteItem.key]: {
          mode: quoteForm.mode,
          discountPct: Number(quoteForm.discountPct) || 0,
          specialPrice: Number(quoteForm.specialPrice) || 0,
          validUntil: quoteForm.validUntil,
          comments: quoteForm.comments,
          vendorName: quoteForm.vendorName,
          vendorSku: quoteForm.vendorSku
        }
      }
    });
    setQuoteItem(null);
  };

  const toggleWaiver = (code: string, waive: boolean) => {
    const note = (waiverNotes[code] || project.validationWaivers?.[code]?.note || 'Accepted by Lead Engineer').trim();
    onUpdateProject({
      validationWaivers: {
        ...(project.validationWaivers || {}),
        [code]: {
          code,
          waived: waive,
          note,
          waivedAt: new Date().toISOString().slice(0, 10)
        }
      }
    });
  };

  const majorGroups: [string, string][] = [
    ['trafo', 'MV/LV K-Factor Transformers'],
    ['ups', 'Containerized Modular UPS'],
    ['dg', 'CPCB IV+ Diesel Generators'],
    ['cooler', 'Adiabatic / Dry Fluid Coolers'],
    ['cdu', 'Internal White-Space Liquid CDUs'],
    ['tank', 'SS316L Water Storage Tanks']
  ];

  return (
    <div className="space-y-5 text-xs">
      {/* Top Design Control Header */}
      <div className="bg-white rounded-2xl card-shadow border border-slate-200 p-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="px-2.5 py-0.5 rounded bg-sky-100 text-sky-950 font-black uppercase text-[10px]">
            Stage 02 • Supply-Chain Synthesis, Inline Overrides & Soft Validation Gate
          </span>
          <h2 className="text-lg font-bold navy-text mt-1">
            Engineering & Commercial Solution Design — {project.name}
          </h2>
          <p className="text-slate-500">
            Auto-drafted from Supply Chain DB (±20% / ≤8 active unit rule). Override any qty/spec, replace SKUs inline, inspect 3D, or waive deviations.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShow3DModeling(!show3DModeling)}
            className={`px-3 py-2 rounded-lg font-bold border ${
              show3DModeling ? 'bg-indigo-50 border-indigo-400 text-indigo-950' : 'bg-white border-slate-300 text-slate-700'
            }`}
          >
            {show3DModeling ? '🧊 Hide Live 3D' : '🧊 Inspect Live 360° 3D'}
          </button>
          <button
            onClick={onProceedToOutputs}
            className="px-4 py-2 rounded-xl coral-bg hover:opacity-95 text-white font-black shadow"
          >
            Proceed to Stage 3 Outputs →
          </button>
        </div>
      </div>

      {/* Collapsible Live 360° 3D Studio while Modeling */}
      {show3DModeling && (
        <ThreeDStudio
          project={project}
          eng={eng}
          palette={palette}
          onUpdatePalette={onUpdatePalette}
          onApplyTheme={onApplyTheme}
          compact
        />
      )}

      {/* Sub-navigation inside Stage 2 */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-white p-2.5 rounded-xl border border-slate-200">
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setDesignSubTab('mep_bom')}
            className={`px-3.5 py-1.5 rounded-lg font-bold ${
              designSubTab === 'mep_bom' ? 'navy-bg text-white' : 'bg-slate-100 text-slate-700'
            }`}
          >
            1. Supply-Chain Synthesis & BOQ ({eng.bomItems.length})
          </button>
          <button
            onClick={() => setDesignSubTab('whitespace_civil')}
            className={`px-3.5 py-1.5 rounded-lg font-bold ${
              designSubTab === 'whitespace_civil' ? 'navy-bg text-white' : 'bg-slate-100 text-slate-700'
            }`}
          >
            2. White-Space, Civil (4.5m Pile Cap) & Telecom
          </button>
          <button
            onClick={() => setDesignSubTab('validation')}
            className={`px-3.5 py-1.5 rounded-lg font-bold ${
              designSubTab === 'validation' ? 'navy-bg text-white' : 'bg-slate-100 text-slate-700'
            }`}
          >
            3. SOFT Validation Gate ({eng.unwaivedFailCount} Fail / {eng.warnCount} Warn / {eng.waivedCount} Waived)
          </button>
        </div>
        <div className="font-bold navy-text px-2">
          Pre-Tax: {formatMoney(eng.totals.sellingPreTax, project.currency, standards)} • MII:{' '}
          <span className="text-emerald-700">{eng.mii.miiClassLabel}</span>
        </div>
      </div>

      {/* TAB 1: SUPPLY-CHAIN SYNTHESIS (±20% AUTO-PLACEHOLDER) + INLINE SKU REPLACE + SPECIAL QUOTES */}
      {designSubTab === 'mep_bom' && (
        <div className="space-y-5">
          {/* Deal-Local [PLACEHOLDER] Alert Banner */}
          {eng.dealPlaceholders.length > 0 && (
            <div className="bg-amber-50 border-2 border-amber-400 rounded-2xl p-4 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="font-black text-amber-950 text-sm">
                  ⚠ {eng.dealPlaceholders.length} Deal-Local [PLACEHOLDER] SKU(s) Synthesized (±20% / ≤8 Active Units Rule)
                </div>
                <span className="px-2.5 py-0.5 rounded bg-amber-200 text-amber-950 font-bold text-[11px]">
                  Isolated to This Deal — Never Written to Master Catalog
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {eng.dealPlaceholders.map(ph => (
                  <div key={ph.id} className="bg-white border border-amber-300 rounded-xl p-3 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-black text-amber-900">{ph.builtUpName}</span>
                      <button
                        onClick={() => openInlineReplace(ph.group)}
                        className="px-2 py-0.5 rounded navy-bg text-white font-bold text-[10px]"
                      >
                        Replace Inline
                      </button>
                    </div>
                    <div className="text-slate-600">{ph.marketScoutRemark}</div>
                    <div className="font-bold text-slate-800">
                      Qty: {ph.totalUnits} ({ph.activeN}+{ph.redundantR}) • ROM Unit:{' '}
                      {formatMoney(ph.romUnitPriceInr, project.currency, standards)} • Footprint:{' '}
                      {ph.scaledFootprintSqm} m²
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Major Subsystem Synthesis & Inline SKU Replacement Cards */}
          <div className="bg-white rounded-2xl card-shadow border border-slate-200 p-5 space-y-3">
            <h3 className="text-base font-bold navy-text">
              Major MEP Subsystem Synthesis (Override Qty or Replace SKU Inline)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {majorGroups.map(([grp, title]) => {
                const match = eng.supplyMatches[grp];
                const hasInline = Boolean(project.inlineSkuOverrides?.[grp]);
                const curQty =
                  project.solutionQtyOverrides?.[grp] !== undefined && project.solutionQtyOverrides?.[grp] !== ''
                    ? Number(project.solutionQtyOverrides[grp])
                    : match?.totalUnits || 0;

                return (
                  <div
                    key={grp}
                    className={`p-3.5 rounded-xl border space-y-2 ${
                      match?.isPlaceholder
                        ? 'bg-amber-50/70 border-amber-400'
                        : hasInline
                          ? 'bg-blue-50/60 border-blue-400'
                          : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-[10px] font-black uppercase text-slate-500">{title}</div>
                        <div className="font-bold navy-text mt-0.5">
                          {match ? match.label : 'Disabled / Zero Load'}
                        </div>
                      </div>
                      {match?.isPlaceholder && (
                        <span className="px-2 py-0.5 rounded bg-amber-500 text-slate-950 font-black text-[10px]">
                          [PLACEHOLDER]
                        </span>
                      )}
                      {hasInline && (
                        <span className="px-2 py-0.5 rounded bg-blue-700 text-white font-black text-[10px]">
                          {project.inlineSkuOverrides?.[grp]?.scope === 'promoted_master'
                            ? 'PROMOTED'
                            : 'DEAL OVERRIDE'}
                        </span>
                      )}
                    </div>

                    {match && (
                      <div className="text-[11px] text-slate-600 space-y-0.5">
                        <div>
                          Demand: <strong>{Math.round(match.demand).toLocaleString()} {match.demandUnit}</strong> • Sizing:{' '}
                          <strong>
                            {match.activeN}+{match.redundantR}
                          </strong>{' '}
                          ({match.utilizationPct}% load)
                        </div>
                        <div>
                          Unit Base: <strong>{formatMoney(match.unitPriceInr, project.currency, standards)}</strong> • MII:{' '}
                          <strong>{match.miiPct}%</strong>
                        </div>
                      </div>
                    )}

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5 border-t border-slate-200">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-bold text-slate-600">Qty:</span>
                        <input
                          type="number"
                          min={0}
                          value={curQty}
                          onChange={e =>
                            onUpdateProject({
                              solutionQtyOverrides: {
                                ...(project.solutionQtyOverrides || {}),
                                [grp]: e.target.value === '' ? '' : Number(e.target.value)
                              }
                            })
                          }
                          className="w-16 border rounded px-2 py-1 bg-white font-black text-center"
                        />
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openInlineReplace(grp)}
                          className="px-2.5 py-1 rounded navy-bg text-white font-bold text-[11px]"
                        >
                          ⇄ Replace SKU
                        </button>
                        {hasInline && (
                          <button
                            onClick={() => clearInlineReplacement(grp)}
                            className="px-2 py-1 rounded bg-slate-200 text-slate-700 font-bold text-[11px]"
                            title="Revert inline SKU replacement"
                          >
                            ↺
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Full Categorized BOQ Table with Special Vendor Quotes */}
          <div className="bg-white rounded-2xl card-shadow border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-bold navy-text">
                  Categorized Engineering & Commercial BOQ (Special Vendor Quotes)
                </h3>
                <p className="text-slate-500">
                  Click "Quote / Override" on any line item to enter deal-specific OEM discounts, special prices, and validity dates.
                </p>
              </div>
              <div className="text-right">
                <span className="text-slate-500 block">Grand Total (Incl. {project.gstPct}% GST)</span>
                <span className="text-base font-black navy-text">
                  {formatMoney(eng.totals.grandTotal, project.currency, standards)}
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="navy-bg text-white text-[11px]">
                    <th className="p-2.5">Category</th>
                    <th className="p-2.5">Subsystem / Scope</th>
                    <th className="p-2.5">OEM Make & Model</th>
                    <th className="p-2.5 text-right">Qty</th>
                    <th className="p-2.5 text-right">Unit Rate</th>
                    <th className="p-2.5 text-right">Pre-Tax Total</th>
                    <th className="p-2.5 text-center">Special Quote</th>
                  </tr>
                </thead>
                <tbody>
                  {eng.bomItems.map((it, idx) => (
                    <tr
                      key={`${it.key}-${idx}`}
                      className={`border-b border-slate-200 ${
                        it.isPlaceholder
                          ? 'bg-amber-50/70'
                          : it.isOverridden
                            ? 'bg-emerald-50/50'
                            : idx % 2 === 1
                              ? 'bg-slate-50/50'
                              : 'bg-white'
                      }`}
                    >
                      <td className="p-2.5 font-semibold text-slate-600">{it.category}</td>
                      <td className="p-2.5">
                        <div className="font-bold text-slate-900">{it.label}</div>
                        <div className="text-[11px] text-slate-500">{it.specs}</div>
                        {it.comments && (
                          <div className="text-[10px] font-bold text-emerald-800 mt-0.5">
                            Quote Note: {it.comments} {it.validUntil ? `(Valid till ${it.validUntil})` : ''}
                          </div>
                        )}
                      </td>
                      <td className="p-2.5">
                        <div className="font-bold navy-text">{it.make}</div>
                        <div className="text-[11px] text-slate-500 font-mono">{it.model}</div>
                      </td>
                      <td className="p-2.5 text-right font-black">{it.qty}</td>
                      <td className="p-2.5 text-right font-semibold">
                        {formatMoney(it.unitCost, project.currency, standards)}
                        {it.isOverridden && (
                          <span className="block text-[10px] text-emerald-700 font-bold">
                            ({it.discountPct > 0 ? `-${it.discountPct}%` : 'Special'})
                          </span>
                        )}
                      </td>
                      <td className="p-2.5 text-right font-black navy-text">
                        {formatMoney(it.sellingPreTax, project.currency, standards)}
                      </td>
                      <td className="p-2.5 text-center">
                        <button
                          onClick={() => openQuoteModal(it)}
                          className={`px-2.5 py-1 rounded font-bold text-[11px] ${
                            it.isOverridden
                              ? 'bg-emerald-600 text-white'
                              : 'bg-slate-100 hover:bg-slate-200 navy-text border border-slate-300'
                          }`}
                        >
                          {it.isOverridden ? '✓ Quoted' : '+ Quote'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: WHITE-SPACE, CIVIL PLINTH / 4.5m PILE CAP & TELECOM PARAMETERS */}
      {designSubTab === 'whitespace_civil' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* White-Space & Container/BnM Controls */}
          <div className="bg-white rounded-2xl card-shadow border border-slate-200 p-5 space-y-3">
            <h3 className="text-base font-bold navy-text">White-Space Airflow, PAC/CDU & Enclosure Specs</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Aisle Containment</label>
                <select
                  value={project.containmentType}
                  onChange={e =>
                    onUpdateProject({ containmentType: e.target.value as ProjectDeal['containmentType'] })
                  }
                  className="w-full border rounded-lg px-2.5 py-1.5 bg-white font-bold"
                >
                  <option value="ColdAisleContainment">Cold Aisle Containment (CAC)</option>
                  <option value="HotAisleContainment">Hot Aisle Containment (HAC)</option>
                </select>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Chiller Placement</label>
                <select
                  value={project.chillerPlacement}
                  onChange={e =>
                    onUpdateProject({ chillerPlacement: e.target.value as ProjectDeal['chillerPlacement'] })
                  }
                  className="w-full border rounded-lg px-2.5 py-1.5 bg-white font-bold"
                >
                  <option value="ContainerRoof">Container Roof-Mounted</option>
                  <option value="DedicatedYardPad">Dedicated Yard Chiller Pad</option>
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
                  className="w-full border rounded-lg px-2.5 py-1.5 bg-white font-bold"
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
                  className="w-full border rounded-lg px-2.5 py-1.5 bg-white font-bold"
                >
                  <option value="GangedLinear">Ganged Linear Modular Hall</option>
                  <option value="GangedUShaped">Ganged U-Shaped Courtyard</option>
                  <option value="Isolated">Isolated Standalone Pods</option>
                </select>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200 space-y-1">
              <div>
                <strong>White-Space Breakdown:</strong> {eng.totalItWhiteSpaceSqm} m² Total (Internal Floor CDUs:{' '}
                {eng.whiteSpace.internalCduCount} units / {eng.whiteSpace.internalCduFootprintSqm} m² • Mandatory PACs:{' '}
                {eng.whiteSpace.mandatoryPacCount} × 80kW / {eng.whiteSpace.pacFootprintSqm} m²)
              </div>
            </div>
          </div>

          {/* Civil Plinth / 4.5m Pile Cap & Telecom MMR */}
          <div className="bg-white rounded-2xl card-shadow border border-slate-200 p-5 space-y-3">
            <h3 className="text-base font-bold navy-text">
              Civil Plinth / 4.5m Pile Cap & Telecom MMR Parameters
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Soil Bearing Capacity (SBC kN/m²)
                </label>
                <input
                  type="number"
                  step="10"
                  value={project.soilBearingCapacityKpa}
                  onChange={e => onUpdateProject({ soilBearingCapacityKpa: Number(e.target.value) })}
                  className="w-full border rounded-lg px-2.5 py-1.5 font-bold"
                />
                <span className="text-[10px] text-slate-500">
                  &lt; 110 kN/m² automatically triggers 4.5m Pile Cap depth
                </span>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  100-Yr Historical Flood Mark (mm)
                </label>
                <input
                  type="number"
                  step="50"
                  value={project.historicalFloodLevelMm}
                  onChange={e => onUpdateProject({ historicalFloodLevelMm: Number(e.target.value) })}
                  className="w-full border rounded-lg px-2.5 py-1.5 font-bold"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">External Telecom Carriers</label>
                <input
                  type="number"
                  min={1}
                  max={16}
                  value={project.carrierCount}
                  onChange={e => onUpdateProject({ carrierCount: Number(e.target.value) })}
                  className="w-full border rounded-lg px-2.5 py-1.5 font-bold"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Crane Working Radius (m)</label>
                <input
                  type="number"
                  min={6}
                  max={35}
                  value={project.craneWorkingRadiusM}
                  onChange={e => onUpdateProject({ craneWorkingRadiusM: Number(e.target.value) })}
                  className="w-full border rounded-lg px-2.5 py-1.5 font-bold"
                />
              </div>
            </div>

            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 space-y-1">
              <div>
                <strong>Sub-Structure:</strong> {eng.civil.foundationType}
              </div>
              <div>
                <strong>Embedment Depth:</strong> {eng.civil.embedmentDepthM}m •{' '}
                <strong>Bearing FoS:</strong> {eng.civil.bearingSafetyFactor}× •{' '}
                <strong>Flood Plinth:</strong> +{eng.civil.floodPlinthMm}mm •{' '}
                <strong>Crane:</strong> {eng.logistics.craneTonnage}T
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: SOFT VALIDATION GATE (PASS / WARN / FAIL WITH ACCEPT DEVIATION / WAIVE NOTES; NEVER HARD-BLOCKS OUTPUTS) */}
      {designSubTab === 'validation' && (
        <div className="bg-white rounded-2xl card-shadow border border-slate-200 p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
            <div>
              <span className="px-2.5 py-0.5 rounded bg-teal-100 text-teal-950 font-black uppercase text-[10px]">
                Non-Blocking Engineering Governance
              </span>
              <h3 className="text-base font-bold navy-text mt-1">
                SOFT Validation Gate — Accept Deviation / Waive Notes (Never Hard-Blocks Stage 3 Outputs)
              </h3>
            </div>
            <button
              onClick={onProceedToOutputs}
              className="px-4 py-2 rounded-xl coral-bg text-white font-black shadow"
            >
              Generate Stage 3 Outputs & PPTX Now →
            </button>
          </div>

          <div className="space-y-2.5">
            {eng.validations.map(v => {
              const isActionable = v.status === 'FAIL' || v.status === 'WARNING';
              const badgeStyle = v.waived
                ? 'bg-indigo-600 text-white'
                : v.status === 'FAIL'
                  ? 'bg-red-600 text-white'
                  : v.status === 'WARNING'
                    ? 'bg-amber-400 text-slate-950'
                    : 'bg-emerald-600 text-white';

              return (
                <div
                  key={v.code}
                  className={`p-3.5 rounded-xl border space-y-2 ${
                    v.waived
                      ? 'bg-indigo-50/60 border-indigo-300'
                      : v.status === 'FAIL'
                        ? 'bg-red-50 border-red-300'
                        : v.status === 'WARNING'
                          ? 'bg-amber-50 border-amber-300'
                          : 'bg-emerald-50/60 border-emerald-200'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black ${badgeStyle}`}>
                        {v.waived ? `WAIVED (${v.status})` : v.status}
                      </span>
                      <span className="font-bold text-slate-900">
                        {v.code}: {v.title}
                      </span>
                    </div>
                    {isActionable && (
                      <div className="flex items-center gap-1.5">
                        {!v.waived ? (
                          <>
                            <input
                              type="text"
                              placeholder="Enter engineering deviation / waiver note..."
                              value={waiverNotes[v.code] ?? v.waiverNote ?? ''}
                              onChange={e =>
                                setWaiverNotes(prev => ({ ...prev, [v.code]: e.target.value }))
                              }
                              className="w-64 border border-slate-300 rounded px-2.5 py-1 bg-white text-xs"
                            />
                            <button
                              onClick={() => toggleWaiver(v.code, true)}
                              className="px-3 py-1 rounded navy-bg text-white font-bold text-[11px]"
                            >
                              ✓ Accept Deviation / Waive
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => toggleWaiver(v.code, false)}
                            className="px-2.5 py-1 rounded bg-white border border-indigo-300 text-indigo-900 font-bold text-[11px]"
                          >
                            Revoke Waiver
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="text-slate-700">{v.msg}</div>
                  {v.waived && v.waiverNote && (
                    <div className="text-[11px] font-bold text-indigo-950 bg-white/80 px-2.5 py-1 rounded border border-indigo-200">
                      Waiver Recorded ({v.waivedAt}): "{v.waiverNote}"
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MODAL 1: INLINE SKU REPLACEMENT ("THIS DEAL ONLY" OR "PROMOTE TO MASTER") */}
      {replaceGroup && (
        <div className="fixed inset-0 bg-slate-950/65 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-5 shadow-2xl border border-slate-200 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b pb-2.5">
              <div>
                <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-950 font-black uppercase text-[10px]">
                  Inline Subsystem SKU Replacement
                </span>
                <h3 className="text-base font-bold navy-text mt-1">
                  Replace "{replaceGroup.toUpperCase()}" SKU
                </h3>
              </div>
              <button onClick={() => setReplaceGroup(null)} className="font-bold text-slate-500 text-base">
                ✕
              </button>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Pick from India Supply Chain DB (or edit specs below)
              </label>
              <select
                value={replaceForm.selectedSupplyId}
                onChange={e => {
                  const found = supplyItems.find(s => s.id === e.target.value);
                  if (found) {
                    setReplaceForm(prev => ({
                      ...prev,
                      selectedSupplyId: found.id,
                      make: found.vendor,
                      model: found.sku,
                      label: `${found.vendor} ${found.family} (${found.rating} ${found.unit})`,
                      ratedCapacity: found.rating,
                      capacityUnit: found.unit,
                      footprintSqm: found.footprintSqm || 12,
                      unitCostInr: Math.round((found.baseLow + found.baseHigh) / 2),
                      miiPct: found.miiPct || 85
                    }));
                  }
                }}
                className="w-full border rounded-lg px-2.5 py-2 bg-white font-bold"
              >
                <option value="">-- Custom / Manual OEM Entry --</option>
                {supplyItems
                  .filter(s => s.group === replaceGroup)
                  .map(s => (
                    <option key={s.id} value={s.id}>
                      [{s.tier}] {s.vendor} — {s.sku} ({s.rating} {s.unit} • ₹
                      {Math.round((s.baseLow + s.baseHigh) / 2).toLocaleString('en-IN')})
                    </option>
                  ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">OEM Make / Vendor</label>
                <input
                  type="text"
                  value={replaceForm.make}
                  onChange={e => setReplaceForm(p => ({ ...p, make: e.target.value }))}
                  className="w-full border rounded-lg px-2.5 py-1.5 font-bold"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Model / SKU Code</label>
                <input
                  type="text"
                  value={replaceForm.model}
                  onChange={e => setReplaceForm(p => ({ ...p, model: e.target.value }))}
                  className="w-full border rounded-lg px-2.5 py-1.5 font-mono font-bold"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Rated Capacity ({replaceForm.capacityUnit})
                </label>
                <input
                  type="number"
                  value={replaceForm.ratedCapacity}
                  onChange={e => setReplaceForm(p => ({ ...p, ratedCapacity: Number(e.target.value) }))}
                  className="w-full border rounded-lg px-2.5 py-1.5 font-bold"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Unit Base Price (INR)</label>
                <input
                  type="number"
                  value={replaceForm.unitCostInr}
                  onChange={e => setReplaceForm(p => ({ ...p, unitCostInr: Number(e.target.value) }))}
                  className="w-full border rounded-lg px-2.5 py-1.5 font-bold"
                />
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="font-bold navy-text">Replacement Scope:</div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setReplaceForm(p => ({ ...p, scope: 'deal_only' }))}
                  className={`p-2.5 rounded-lg border text-left font-bold ${
                    replaceForm.scope === 'deal_only'
                      ? 'navy-bg text-white border-[#002870]'
                      : 'bg-white text-slate-700 border-slate-300'
                  }`}
                >
                  <div>This Deal Only</div>
                  <div className="text-[10px] font-normal opacity-80">
                    Keeps Master Catalog & Supply DB unchanged
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setReplaceForm(p => ({ ...p, scope: 'promoted_master' }))}
                  className={`p-2.5 rounded-lg border text-left font-bold ${
                    replaceForm.scope === 'promoted_master'
                      ? 'coral-bg text-white border-[#FF5539]'
                      : 'bg-white text-slate-700 border-slate-300'
                  }`}
                >
                  <div>Promote to Master</div>
                  <div className="text-[10px] font-normal opacity-80">
                    Saves into Master Catalog & Supply Chain DB
                  </div>
                </button>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={() => setReplaceGroup(null)}
                className="px-3.5 py-2 rounded-lg border border-slate-300 font-bold"
              >
                Cancel
              </button>
              <button onClick={applyInlineReplacement} className="px-4 py-2 rounded-lg coral-bg text-white font-bold">
                Apply Replacement
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: SPECIAL VENDOR QUOTE OVERRIDE */}
      {quoteItem && (
        <div className="fixed inset-0 bg-slate-950/65 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-2xl border border-slate-200 space-y-3.5 text-xs">
            <div className="flex items-center justify-between border-b pb-2.5">
              <div>
                <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-950 font-black uppercase text-[10px]">
                  Deal-Specific Special Vendor Quote
                </span>
                <h3 className="text-base font-bold navy-text mt-1">{quoteItem.label}</h3>
              </div>
              <button onClick={() => setQuoteItem(null)} className="font-bold text-slate-500 text-base">
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Pricing Mode</label>
                <select
                  value={quoteForm.mode}
                  onChange={e =>
                    setQuoteForm(p => ({ ...p, mode: e.target.value as 'discount' | 'price' }))
                  }
                  className="w-full border rounded-lg px-2.5 py-1.5 bg-white font-bold"
                >
                  <option value="price">Negotiated Net Unit Price (INR)</option>
                  <option value="discount">Percentage Discount (% off Base)</option>
                </select>
              </div>
              <div>
                {quoteForm.mode === 'price' ? (
                  <>
                    <label className="block font-bold text-slate-700 mb-1">Special Unit Price (INR)</label>
                    <input
                      type="number"
                      value={quoteForm.specialPrice}
                      onChange={e => setQuoteForm(p => ({ ...p, specialPrice: Number(e.target.value) }))}
                      className="w-full border rounded-lg px-2.5 py-1.5 font-bold"
                    />
                  </>
                ) : (
                  <>
                    <label className="block font-bold text-slate-700 mb-1">Vendor Discount (%)</label>
                    <input
                      type="number"
                      step="0.5"
                      value={quoteForm.discountPct}
                      onChange={e => setQuoteForm(p => ({ ...p, discountPct: Number(e.target.value) }))}
                      className="w-full border rounded-lg px-2.5 py-1.5 font-bold"
                    />
                  </>
                )}
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Quoted Vendor Make</label>
                <input
                  type="text"
                  value={quoteForm.vendorName || ''}
                  onChange={e => setQuoteForm(p => ({ ...p, vendorName: e.target.value }))}
                  className="w-full border rounded-lg px-2.5 py-1.5"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Quote Valid Until</label>
                <input
                  type="date"
                  value={quoteForm.validUntil || ''}
                  onChange={e => setQuoteForm(p => ({ ...p, validUntil: e.target.value }))}
                  className="w-full border rounded-lg px-2.5 py-1.5"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Commercial / Partner RFQ Reference Note</label>
              <input
                type="text"
                placeholder="e.g., OEM Bid Quote #QT-2026-884 Ex-Works Pune"
                value={quoteForm.comments || ''}
                onChange={e => setQuoteForm(p => ({ ...p, comments: e.target.value }))}
                className="w-full border rounded-lg px-2.5 py-1.5"
              />
            </div>

            <div className="flex justify-between pt-1">
              <button
                onClick={() => {
                  const next = { ...(project.dealOverrides || {}) };
                  delete next[quoteItem.key];
                  onUpdateProject({ dealOverrides: next });
                  setQuoteItem(null);
                }}
                className="px-3 py-1.5 rounded-lg bg-red-50 text-red-700 font-bold"
              >
                Reset to Base
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => setQuoteItem(null)}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-300 font-bold"
                >
                  Cancel
                </button>
                <button onClick={saveQuoteOverride} className="px-4 py-1.5 rounded-lg navy-bg text-white font-bold">
                  Save Special Quote
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
