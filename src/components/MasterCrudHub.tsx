import React, { useEffect, useState } from 'react';
import {
  clearCorporatePptxTemplate,
  loadCorporatePptxTemplate,
  saveCorporatePptxTemplate,
  type StoredPptxTemplate
} from '../engine/templateStorage';
import type {
  ContainerSpec,
  MasterStandards,
  NonItCatalogItem,
  RackSku
} from '../types/mdc';

interface MasterCrudHubProps {
  skus: RackSku[];
  containerCatalog: ContainerSpec[];
  nonItCatalog: NonItCatalogItem[];
  standards: MasterStandards;
  logoDataUrl: string;
  onUpdateSkus: (next: RackSku[]) => void;
  onUpdateContainerCatalog: (next: ContainerSpec[]) => void;
  onUpdateNonItCatalog: (next: NonItCatalogItem[]) => void;
  onUpdateStandards: (next: MasterStandards) => void;
  onUpdateLogoDataUrl: (url: string) => void;
  onExportMasterJson: () => void;
  onImportMasterJson: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const TemplateUploaderWidget: React.FC = () => {
  const [tpl, setTpl] = useState<StoredPptxTemplate | null>(null);
  const [status, setStatus] = useState('');

  useEffect(() => {
    loadCorporatePptxTemplate().then(setTpl).catch(() => {});
  }, []);

  const onPickPptx = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = async ev => {
      const dataUrl = String(ev.target?.result || '');
      const b64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
      const item: StoredPptxTemplate = {
        id: `tpl-${Date.now()}`,
        name: f.name,
        sizeBytes: f.size,
        base64Data: b64,
        coverLayoutHint: 'Cover Slide',
        contentLayoutHint: '2-Header Content (Tosh A Black 24B / 22)',
        qaLayoutHint: 'Closing Q&A Slide',
        updatedAt: new Date().toISOString().slice(0, 10)
      };
      await saveCorporatePptxTemplate(item);
      setTpl(item);
      setStatus(`✓ Saved "${f.name}" locally for Cover, 2-Header Content & Q&A slides.`);
    };
    reader.readAsDataURL(f);
    e.target.value = '';
  };

  return (
    <>
      <div>
        <div className="font-bold navy-text">
          Corporate PowerPoint Template (.PPTX) — Cover, 2-Header Content & Q&A Layouts
        </div>
        <div className="text-slate-600">
          {tpl
            ? `Active: ${tpl.name} (${Math.round(tpl.sizeBytes / 1024)} KB, updated ${tpl.updatedAt})`
            : 'No custom .pptx template uploaded — using built-in Sample slide.pptx 2-header consulting spec.'}
          {status && <span className="ml-2 font-bold text-emerald-800">{status}</span>}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <label className="px-3 py-1.5 rounded-lg navy-bg text-white font-bold cursor-pointer">
          Upload Corporate .PPTX
          <input type="file" accept=".pptx" onChange={onPickPptx} className="hidden" />
        </label>
        {tpl && (
          <button
            type="button"
            onClick={async () => {
              await clearCorporatePptxTemplate();
              setTpl(null);
              setStatus('Cleared custom template.');
            }}
            className="px-2.5 py-1.5 rounded-lg bg-red-50 text-red-700 font-bold"
          >
            Remove
          </button>
        )}
      </div>
    </>
  );
};


export const MasterCrudHub: React.FC<MasterCrudHubProps> = ({
  skus,
  containerCatalog,
  nonItCatalog,
  standards,
  logoDataUrl,
  onUpdateSkus,
  onUpdateContainerCatalog,
  onUpdateNonItCatalog,
  onUpdateStandards,
  onUpdateLogoDataUrl,
  onExportMasterJson,
  onImportMasterJson
}) => {
  const [tab, setTab] = useState<'skus' | 'containers' | 'nonit' | 'standards'>('skus');
  const [catFilter, setCatFilter] = useState('ALL');

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = ev => onUpdateLogoDataUrl(String(ev.target?.result || ''));
    reader.readAsDataURL(f);
  };

  const addRackSku = () => {
    const next: RackSku = {
      id: `sku-custom-${Date.now()}`,
      name: 'New High-Density 200 kW DLC Rack',
      coolingType: 'DLC',
      standard: 'OCP ORv3',
      heightMm: 2450,
      widthMm: 800,
      depthMm: 1200,
      weightKg: 1750,
      peakKw: 200,
      continuousFactor: 0.94,
      operatingUtilFactor: 0.85,
      liquidSplitPct: 90,
      maxInletTempC: 35,
      cduIntegrated: false,
      cduTowerHeightMm: 2200,
      cduTowerWidthMm: 600,
      cduTowerDepthMm: 1200,
      flowLpmPerKw: 1.45,
      reqDeltaPBar: 1.8,
      mawpBar: 4,
      powerEntry: 'Top',
      plumbingEntry: 'Bottom'
    };
    onUpdateSkus([...skus, next]);
  };

  const addContainerSpec = () => {
    const next: ContainerSpec = {
      id: `cnt-custom-${Date.now()}`,
      name: 'Custom 14.0m Sovereign AI Pod',
      lengthMm: 14000,
      widthMm: 4200,
      heightMm: 3900,
      metallurgy: 'Corten-A SPA-H',
      wallMm: 2.5,
      roofMm: 3.0,
      floorMm: 5.0,
      plenumMm: 750,
      topClearanceMm: 1000,
      baseCostInr: 8400000
    };
    onUpdateContainerCatalog([...containerCatalog, next]);
  };

  const addNonItItem = () => {
    const next: NonItCatalogItem = {
      id: `nonit-custom-${Date.now()}`,
      group: 'trafo',
      category: 'Power Distribution & Transformation',
      label: 'Custom K-13 Cast-Resin Transformer (2500 kVA)',
      ratedCapacity: 2500,
      capacityUnit: 'kVA',
      footprintSqm: 16,
      unit: 'per 2500kVA',
      cost: 5100000,
      make: 'ABB / Siemens',
      model: 'CRT-2500-K13',
      miiPct: 88
    };
    onUpdateNonItCatalog([next, ...nonItCatalog]);
  };

  const nonItCategories = ['ALL', ...Array.from(new Set(nonItCatalog.map(i => i.category)))];
  const filteredNonIt =
    catFilter === 'ALL' ? nonItCatalog : nonItCatalog.filter(i => i.category === catFilter);

  return (
    <div className="space-y-5 text-xs">
      {/* Top Header + App-Only Logo Upload */}
      <div className="bg-white rounded-2xl card-shadow border border-slate-200 p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
          <div>
            <span className="px-2.5 py-0.5 rounded bg-slate-800 text-amber-300 font-black uppercase text-[10px]">
              Pillar 04 • Master Standards, Racks & App Header Branding
            </span>
            <h2 className="text-xl font-bold navy-text mt-1">
              Master Catalogs CRUD (<code>skus</code>, <code>containerCatalog</code>, <code>nonItCatalog</code>, <code>standards</code>)
            </h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={onExportMasterJson} className="px-3.5 py-2 rounded-lg navy-bg text-white font-bold">
              ⬇ Export mdc_master_catalog.json
            </button>
            <label className="px-3.5 py-2 rounded-lg border border-slate-300 bg-white font-bold navy-text cursor-pointer">
              ⬆ Import Master Catalog .JSON
              <input type="file" accept=".json" onChange={onImportMasterJson} className="hidden" />
            </label>
          </div>
        </div>

        {/* App-Only Logo Section (Strictly App Header Only, Never Rendered on PPTX Slides) */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {logoDataUrl ? (
              <img
                src={logoDataUrl}
                alt="App Header Logo"
                className="h-10 w-auto bg-white border rounded px-2 py-1 object-contain"
              />
            ) : (
              <div className="w-10 h-10 rounded-lg coral-bg text-white font-black flex items-center justify-center">
                MDC
              </div>
            )}
            <div>
              <div className="font-bold navy-text">Application Header Logo (App UI Only — Never on PPTX Slides)</div>
              <div className="text-slate-500">
                Displays in the top navigation bar. Exported PowerPoint decks strictly omit slide logos per deck rules.
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <label className="px-3 py-1.5 rounded-lg navy-bg text-white font-bold cursor-pointer">
              Upload App Logo
              <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
            </label>
            {logoDataUrl && (
              <button
                onClick={() => onUpdateLogoDataUrl('')}
                className="px-2.5 py-1.5 rounded-lg bg-red-50 text-red-700 font-bold"
              >
                Remove
              </button>
            )}
          </div>
        </div>

        {/* Corporate .PPTX Template Upload (Cover, 2-Header Content & Closing Q&A) */}
        <div className="p-3.5 rounded-xl bg-orange-50/50 border border-orange-200 flex flex-wrap items-center justify-between gap-3">
          <TemplateUploaderWidget />
        </div>

        {/* CRUD Navigation Tabs */}
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setTab('skus')}
            className={`px-3.5 py-1.5 rounded-lg font-bold ${
              tab === 'skus' ? 'navy-bg text-white' : 'bg-slate-100 text-slate-700'
            }`}
          >
            1. IT Rack SKUs ({skus.length})
          </button>
          <button
            onClick={() => setTab('containers')}
            className={`px-3.5 py-1.5 rounded-lg font-bold ${
              tab === 'containers' ? 'navy-bg text-white' : 'bg-slate-100 text-slate-700'
            }`}
          >
            2. Container Catalog ({containerCatalog.length})
          </button>
          <button
            onClick={() => setTab('nonit')}
            className={`px-3.5 py-1.5 rounded-lg font-bold ${
              tab === 'nonit' ? 'navy-bg text-white' : 'bg-slate-100 text-slate-700'
            }`}
          >
            3. Non-IT Building Blocks ({nonItCatalog.length})
          </button>
          <button
            onClick={() => setTab('standards')}
            className={`px-3.5 py-1.5 rounded-lg font-bold ${
              tab === 'standards' ? 'navy-bg text-white' : 'bg-slate-100 text-slate-700'
            }`}
          >
            4. Global Engineering & Financial Standards
          </button>
        </div>
      </div>

      {/* TAB 1: RACK SKUS CRUD */}
      {tab === 'skus' && (
        <div className="bg-white rounded-2xl card-shadow border border-slate-200 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold navy-text">Master IT Rack SKUs</h3>
            <button onClick={addRackSku} className="px-3.5 py-1.5 rounded-lg coral-bg text-white font-bold">
              + Add Rack SKU
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="navy-bg text-white text-[11px]">
                  <th className="p-2">Rack SKU Name</th>
                  <th className="p-2">Cooling</th>
                  <th className="p-2">Peak kW</th>
                  <th className="p-2">Liquid %</th>
                  <th className="p-2">Max Inlet °C</th>
                  <th className="p-2">W×D×H (mm)</th>
                  <th className="p-2">Weight kg</th>
                  <th className="p-2">CDU Int.</th>
                  <th className="p-2 text-center">Delete</th>
                </tr>
              </thead>
              <tbody>
                {skus.map((s, idx) => {
                  const updateField = <K extends keyof RackSku>(field: K, val: RackSku[K]) => {
                    const copy = [...skus];
                    copy[idx] = { ...copy[idx], [field]: val };
                    onUpdateSkus(copy);
                  };
                  return (
                    <tr key={s.id} className="border-b">
                      <td className="p-2">
                        <input
                          type="text"
                          value={s.name}
                          onChange={e => updateField('name', e.target.value)}
                          className="w-56 border rounded px-2 py-1 font-bold"
                        />
                      </td>
                      <td className="p-2">
                        <select
                          value={s.coolingType}
                          onChange={e => updateField('coolingType', e.target.value as 'DLC' | 'AC')}
                          className="border rounded px-2 py-1 bg-white font-bold"
                        >
                          <option value="DLC">DLC</option>
                          <option value="AC">AC</option>
                        </select>
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          value={s.peakKw}
                          onChange={e => updateField('peakKw', Number(e.target.value))}
                          className="w-16 border rounded px-2 py-1 font-bold"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          value={s.liquidSplitPct}
                          onChange={e => updateField('liquidSplitPct', Number(e.target.value))}
                          className="w-14 border rounded px-2 py-1"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          value={s.maxInletTempC}
                          onChange={e => updateField('maxInletTempC', Number(e.target.value))}
                          className="w-14 border rounded px-2 py-1 font-bold"
                        />
                      </td>
                      <td className="p-2 whitespace-nowrap">
                        <input
                          type="number"
                          value={s.widthMm}
                          onChange={e => updateField('widthMm', Number(e.target.value))}
                          className="w-14 border rounded px-1 py-1"
                        />
                        ×
                        <input
                          type="number"
                          value={s.depthMm}
                          onChange={e => updateField('depthMm', Number(e.target.value))}
                          className="w-14 border rounded px-1 py-1"
                        />
                        ×
                        <input
                          type="number"
                          value={s.heightMm}
                          onChange={e => updateField('heightMm', Number(e.target.value))}
                          className="w-14 border rounded px-1 py-1"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          value={s.weightKg}
                          onChange={e => updateField('weightKg', Number(e.target.value))}
                          className="w-16 border rounded px-2 py-1"
                        />
                      </td>
                      <td className="p-2 text-center">
                        <input
                          type="checkbox"
                          checked={s.cduIntegrated}
                          onChange={e => updateField('cduIntegrated', e.target.checked)}
                        />
                      </td>
                      <td className="p-2 text-center">
                        <button
                          onClick={() => onUpdateSkus(skus.filter(item => item.id !== s.id))}
                          className="px-2 py-1 rounded bg-red-50 text-red-700 font-bold"
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: CONTAINER CATALOG CRUD */}
      {tab === 'containers' && (
        <div className="bg-white rounded-2xl card-shadow border border-slate-200 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold navy-text">Modular Container Shell Catalog</h3>
            <button onClick={addContainerSpec} className="px-3.5 py-1.5 rounded-lg coral-bg text-white font-bold">
              + Add Container Spec
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="navy-bg text-white text-[11px]">
                  <th className="p-2">Container Name</th>
                  <th className="p-2">Length (mm)</th>
                  <th className="p-2">Width (mm)</th>
                  <th className="p-2">Height (mm)</th>
                  <th className="p-2">Metallurgy</th>
                  <th className="p-2">Plenum (mm)</th>
                  <th className="p-2">Base Cost (INR)</th>
                  <th className="p-2 text-center">Delete</th>
                </tr>
              </thead>
              <tbody>
                {containerCatalog.map((c, idx) => {
                  const updateField = <K extends keyof ContainerSpec>(field: K, val: ContainerSpec[K]) => {
                    const copy = [...containerCatalog];
                    copy[idx] = { ...copy[idx], [field]: val };
                    onUpdateContainerCatalog(copy);
                  };
                  return (
                    <tr key={c.id} className="border-b">
                      <td className="p-2">
                        <input
                          type="text"
                          value={c.name}
                          onChange={e => updateField('name', e.target.value)}
                          className="w-56 border rounded px-2 py-1 font-bold"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          value={c.lengthMm}
                          onChange={e => updateField('lengthMm', Number(e.target.value))}
                          className="w-20 border rounded px-2 py-1"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          value={c.widthMm}
                          onChange={e => updateField('widthMm', Number(e.target.value))}
                          className="w-20 border rounded px-2 py-1"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          value={c.heightMm}
                          onChange={e => updateField('heightMm', Number(e.target.value))}
                          className="w-20 border rounded px-2 py-1"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="text"
                          value={c.metallurgy}
                          onChange={e => updateField('metallurgy', e.target.value)}
                          className="w-32 border rounded px-2 py-1"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          value={c.plenumMm}
                          onChange={e => updateField('plenumMm', Number(e.target.value))}
                          className="w-16 border rounded px-2 py-1"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          value={c.baseCostInr}
                          onChange={e => updateField('baseCostInr', Number(e.target.value))}
                          className="w-28 border rounded px-2 py-1 font-bold"
                        />
                      </td>
                      <td className="p-2 text-center">
                        <button
                          onClick={() =>
                            onUpdateContainerCatalog(containerCatalog.filter(item => item.id !== c.id))
                          }
                          className="px-2 py-1 rounded bg-red-50 text-red-700 font-bold"
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: NON-IT CATALOG CRUD */}
      {tab === 'nonit' && (
        <div className="bg-white rounded-2xl card-shadow border border-slate-200 p-5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold navy-text">Non-IT Building Blocks Catalog</h3>
              <select
                value={catFilter}
                onChange={e => setCatFilter(e.target.value)}
                className="border rounded-lg px-2.5 py-1 bg-white font-bold"
              >
                {nonItCategories.map(c => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <button onClick={addNonItItem} className="px-3.5 py-1.5 rounded-lg coral-bg text-white font-bold">
              + Add Non-IT Block
            </button>
          </div>
          <div className="overflow-x-auto max-h-[500px]">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0">
                <tr className="navy-bg text-white text-[11px]">
                  <th className="p-2">Label</th>
                  <th className="p-2">Group</th>
                  <th className="p-2">Make / Model</th>
                  <th className="p-2">Rating</th>
                  <th className="p-2">Footprint m²</th>
                  <th className="p-2">Unit Cost (INR)</th>
                  <th className="p-2 text-center">Delete</th>
                </tr>
              </thead>
              <tbody>
                {filteredNonIt.map(item => {
                  const realIdx = nonItCatalog.findIndex(x => x.id === item.id);
                  const updateField = <K extends keyof NonItCatalogItem>(
                    field: K,
                    val: NonItCatalogItem[K]
                  ) => {
                    const copy = [...nonItCatalog];
                    copy[realIdx] = { ...copy[realIdx], [field]: val };
                    onUpdateNonItCatalog(copy);
                  };
                  return (
                    <tr key={item.id} className="border-b">
                      <td className="p-2">
                        <input
                          type="text"
                          value={item.label}
                          onChange={e => updateField('label', e.target.value)}
                          className="w-64 border rounded px-2 py-1 font-bold"
                        />
                      </td>
                      <td className="p-2 font-mono">{item.group}</td>
                      <td className="p-2">
                        <input
                          type="text"
                          value={item.make}
                          onChange={e => updateField('make', e.target.value)}
                          className="w-28 border rounded px-1.5 py-1 mr-1"
                        />
                        <input
                          type="text"
                          value={item.model}
                          onChange={e => updateField('model', e.target.value)}
                          className="w-28 border rounded px-1.5 py-1 font-mono"
                        />
                      </td>
                      <td className="p-2 whitespace-nowrap">
                        <input
                          type="number"
                          value={item.ratedCapacity}
                          onChange={e => updateField('ratedCapacity', Number(e.target.value))}
                          className="w-16 border rounded px-1.5 py-1 font-bold"
                        />{' '}
                        {item.capacityUnit}
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          step="0.5"
                          value={item.footprintSqm}
                          onChange={e => updateField('footprintSqm', Number(e.target.value))}
                          className="w-16 border rounded px-1.5 py-1"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          value={item.cost}
                          onChange={e => updateField('cost', Number(e.target.value))}
                          className="w-28 border rounded px-2 py-1 font-bold"
                        />
                      </td>
                      <td className="p-2 text-center">
                        <button
                          onClick={() =>
                            onUpdateNonItCatalog(nonItCatalog.filter(x => x.id !== item.id))
                          }
                          className="px-2 py-1 rounded bg-red-50 text-red-700 font-bold"
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: GLOBAL STANDARDS */}
      {tab === 'standards' && (
        <div className="bg-white rounded-2xl card-shadow border border-slate-200 p-5 space-y-4">
          <h3 className="text-base font-bold navy-text">Global Engineering, Tariff & Commercial Standards</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {(
              [
                ['maxPodPayloadKg', 'Max Pod Payload (kg)'],
                ['maxDlcKwPerPod', 'Max DLC kW per Pod'],
                ['maxAcKwPerPod', 'Max AC kW per Pod'],
                ['buswayAmperageA', 'Busway Rating (A)'],
                ['plenumHeightMm', 'Raised Plenum (mm)'],
                ['topClearanceMm', 'Top Clearance (mm)'],
                ['lfpDoDPct', 'LFP Battery DoD (%)'],
                ['vrlaDoDPct', 'VRLA Battery DoD (%)'],
                ['gridTariffInrKwh', 'Grid Tariff (₹/kWh)'],
                ['waterTariffInrKl', 'Water Tariff (₹/kL)'],
                ['defaultMarginPct', 'Default Margin (%)'],
                ['defaultContingencyPct', 'Default Contingency (%)'],
                ['defaultGstPct', 'Default GST (%)'],
                ['defaultAmcPctOfCapex', 'Default AMC (% CapEx/yr)'],
                ['defaultShellRatePerCumInr', 'Container Fab Rate (₹/m³)'],
                ['usdRate', 'USD Exchange Rate (₹)'],
                ['eurRate', 'EUR Exchange Rate (₹)']
              ] as [keyof MasterStandards, string][]
            ).map(([k, lbl]) => (
              <div key={k}>
                <label className="block font-bold text-slate-700 mb-1">{lbl}</label>
                <input
                  type="number"
                  step="any"
                  value={Number(standards[k])}
                  onChange={e => onUpdateStandards({ ...standards, [k]: Number(e.target.value) })}
                  className="w-full border rounded-lg px-2.5 py-1.5 font-bold"
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
