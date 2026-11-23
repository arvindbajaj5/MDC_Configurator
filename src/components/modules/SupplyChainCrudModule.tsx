import React, { useState } from 'react';
import { Download, Edit3, Package, Plus, Trash2 } from 'lucide-react';
import { triggerJsonDownload } from '../../services/storageAdapter';
import type {
  FullEngineeringOutput,
  MasterCatalogItem,
  SupplyCategory,
  SupplyIntelSku
} from '../../types/schema';
import { SlideOverDrawer } from '../controls/SlideOverDrawer';

interface SupplyChainCrudModuleProps {
  supplyIntel: SupplyIntelSku[];
  catalog: MasterCatalogItem[];
  eng: FullEngineeringOutput;
  onSaveSupplyIntel: (next: SupplyIntelSku[]) => void;
  onSaveCatalog: (next: MasterCatalogItem[]) => void;
  onNotify: (tone: 'success' | 'info', title: string, detail?: string) => void;
}

const SUPPLY_CATEGORIES: SupplyCategory[] = [
  'Power & Switchgear',
  'Transformers',
  'Cooling & Chillers',
  'Internal CDU & PAC',
  'Busducts & PDUs',
  'Modular Enclosures',
  'BESS & UPS',
  'DG Backup Power',
  'Compliance & Safety',
  'Telecom & MMR',
  'Consumables & Spares'
];

export const SupplyChainCrudModule: React.FC<SupplyChainCrudModuleProps> = ({
  supplyIntel,
  catalog,
  eng,
  onSaveSupplyIntel,
  onSaveCatalog,
  onNotify
}) => {
  const [tab, setTab] = useState<'supply' | 'catalog'>('supply');
  const [editingSku, setEditingSku] = useState<SupplyIntelSku | null>(null);
  const [editingCat, setEditingCat] = useState<MasterCatalogItem | null>(null);

  const openNewSku = () => {
    setEditingSku({
      skuId: `IND-CUSTOM-${String(supplyIntel.length + 1).padStart(2, '0')}`,
      name: '',
      category: 'Power & Switchgear',
      oemTier: 'Tier-1 India',
      vendorArchetype: 'Domestic India OEM Partner',
      miiPercent: 75,
      unit: 'Unit',
      unitPriceInrLakhs: 25,
      leadTimeWeeks: 10,
      certifications: ['BIS', 'IEC']
    });
  };

  const openNewCatalogItem = () => {
    setEditingCat({
      id: `CAT-CUSTOM-${Date.now().toString().slice(-4)}`,
      code: `CUSTOM-${catalog.length + 1}`,
      name: '',
      category: 'Modular Pod',
      ratingKw: 1000,
      footprintM2: 40,
      weightTons: 20,
      unitCostInrLakhs: 100,
      miiPercent: 80,
      active: true
    });
  };

  const commitSku = () => {
    if (!editingSku || !editingSku.name.trim()) return;
    const exists = supplyIntel.some((s) => s.skuId === editingSku.skuId);
    const next = exists
      ? supplyIntel.map((s) => (s.skuId === editingSku.skuId ? editingSku : s))
      : [...supplyIntel, editingSku];
    onSaveSupplyIntel(next);
    onNotify('success', exists ? `Updated SKU ${editingSku.skuId}` : `Added SKU ${editingSku.skuId}`, editingSku.name);
    setEditingSku(null);
  };

  const commitCat = () => {
    if (!editingCat || !editingCat.name.trim()) return;
    const exists = catalog.some((c) => c.id === editingCat.id);
    const next = exists
      ? catalog.map((c) => (c.id === editingCat.id ? editingCat : c))
      : [...catalog, editingCat];
    onSaveCatalog(next);
    onNotify('success', exists ? `Updated Catalog ${editingCat.code}` : `Added Catalog ${editingCat.code}`, editingCat.name);
    setEditingCat(null);
  };

  return (
    <div className="space-y-3 text-xs">
      {/* Top Scorecard */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        <div className="bg-white border border-slate-200 rounded-cad p-2.5">
          <p className="text-[10px] uppercase text-slate-500">PPP-MII Classification</p>
          <p className="text-xs font-bold text-brand-emerald mt-0.5">{eng.supplyChain.pppMiiClass}</p>
          <p className="text-[10px] font-mono text-slate-500">Catalog Weighted: {eng.supplyChain.weightedMiiPercent}%</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-cad p-2.5">
          <p className="text-[10px] uppercase text-slate-500">BOQ CapEx-Weighted MII</p>
          <p className="font-mono text-base font-bold text-brand-cobalt">{eng.commercial.weightedBoqMiiPercent}%</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-cad p-2.5">
          <p className="text-[10px] uppercase text-slate-500">Active India OEM SKUs</p>
          <p className="font-mono text-base font-bold text-brand-navy">{supplyIntel.length} SKUs</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-cad p-2.5">
          <p className="text-[10px] uppercase text-slate-500">Longest Critical Lead</p>
          <p className="font-mono text-base font-bold text-brand-orange">{eng.supplyChain.longestLeadTimeWeeks} Weeks</p>
        </div>
      </div>

      {/* Sub-Tabs & Actions */}
      <div className="bg-white border border-slate-200 rounded-cad p-2.5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={() => setTab('supply')}
            className={`px-3 py-1 rounded-cad font-semibold border ${
              tab === 'supply' ? 'bg-brand-navy text-white border-brand-navy' : 'bg-slate-50 text-slate-700 border-slate-200'
            }`}
          >
            India Supply Intel ({supplyIntel.length} SKUs)
          </button>
          <button
            type="button"
            onClick={() => setTab('catalog')}
            className={`px-3 py-1 rounded-cad font-semibold border ${
              tab === 'catalog' ? 'bg-brand-navy text-white border-brand-navy' : 'bg-slate-50 text-slate-700 border-slate-200'
            }`}
          >
            Master Catalog CRUD ({catalog.length} Items)
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              if (tab === 'supply') {
                triggerJsonDownload('mdc_supply_intel.json', { schemaVersion: '12.4', skus: supplyIntel });
              } else {
                triggerJsonDownload('mdc_master_catalog.json', { schemaVersion: '12.4', items: catalog });
              }
              onNotify('info', `Exported ${tab === 'supply' ? 'mdc_supply_intel.json' : 'mdc_master_catalog.json'}`);
            }}
            className="px-2.5 py-1 border border-slate-300 rounded-cad bg-white hover:bg-slate-50 font-semibold flex items-center gap-1"
          >
            <Download className="w-3 h-3" /> Export JSON
          </button>
          <button
            type="button"
            onClick={tab === 'supply' ? openNewSku : openNewCatalogItem}
            className="px-2.5 py-1 bg-brand-orange text-white rounded-cad font-semibold flex items-center gap-1"
          >
            <Plus className="w-3 h-3" /> Add {tab === 'supply' ? 'SKU' : 'Item'}
          </button>
        </div>
      </div>

      {/* Data Table */}
      {tab === 'supply' ? (
        <div className="bg-white border border-slate-200 rounded-cad overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase text-slate-600">
                <th className="px-2.5 py-2">SKU ID</th>
                <th className="px-2.5 py-2">Equipment &amp; Vendor Archetype</th>
                <th className="px-2.5 py-2">Category</th>
                <th className="px-2.5 py-2 text-right">MII %</th>
                <th className="px-2.5 py-2 text-right">₹ Lakhs</th>
                <th className="px-2.5 py-2 text-right">Lead</th>
                <th className="px-2.5 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {supplyIntel.map((sku) => (
                <tr key={sku.skuId} className="hover:bg-slate-50">
                  <td className="px-2.5 py-2 font-mono text-[11px] font-semibold text-brand-navy">{sku.skuId}</td>
                  <td className="px-2.5 py-2">
                    <p className="font-semibold text-slate-900">{sku.name}</p>
                    <p className="text-[10px] text-slate-500">{sku.vendorArchetype} • {sku.oemTier}</p>
                  </td>
                  <td className="px-2.5 py-2 text-[11px] text-slate-600">{sku.category}</td>
                  <td className="px-2.5 py-2 text-right font-mono font-bold text-brand-emerald">{sku.miiPercent}%</td>
                  <td className="px-2.5 py-2 text-right font-mono">{sku.unitPriceInrLakhs.toFixed(1)}</td>
                  <td className="px-2.5 py-2 text-right font-mono">{sku.leadTimeWeeks}w</td>
                  <td className="px-2.5 py-2 text-right">
                    <div className="inline-flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setEditingSku({ ...sku })}
                        className="p-1 text-slate-500 hover:text-brand-navy"
                        title="Edit SKU"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onSaveSupplyIntel(supplyIntel.filter((s) => s.skuId !== sku.skuId))}
                        className="p-1 text-slate-400 hover:text-red-600"
                        title="Delete SKU"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-cad overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase text-slate-600">
                <th className="px-2.5 py-2">Code</th>
                <th className="px-2.5 py-2">Master Catalog Item</th>
                <th className="px-2.5 py-2 text-right">Rating kW</th>
                <th className="px-2.5 py-2 text-right">MII %</th>
                <th className="px-2.5 py-2 text-right">₹ Lakhs</th>
                <th className="px-2.5 py-2 text-right">Status</th>
                <th className="px-2.5 py-2 text-right">Edit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {catalog.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50">
                  <td className="px-2.5 py-2 font-mono text-[11px] font-semibold text-brand-navy">{item.code}</td>
                  <td className="px-2.5 py-2">
                    <p className="font-semibold text-slate-900 flex items-center gap-1.5">
                      <Package className="w-3 h-3 text-slate-400" />
                      {item.name}
                    </p>
                    <p className="text-[10px] text-slate-500">{item.category}</p>
                  </td>
                  <td className="px-2.5 py-2 text-right font-mono">{item.ratingKw ?? '-'}</td>
                  <td className="px-2.5 py-2 text-right font-mono text-brand-emerald font-bold">{item.miiPercent}%</td>
                  <td className="px-2.5 py-2 text-right font-mono">{item.unitCostInrLakhs}</td>
                  <td className="px-2.5 py-2 text-right">
                    <span
                      className={`px-1.5 py-0.5 rounded-cad font-mono text-[10px] font-bold ${
                        item.active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {item.active ? 'ACTIVE' : 'ARCHIVED'}
                    </span>
                  </td>
                  <td className="px-2.5 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => setEditingCat({ ...item })}
                      className="p-1 text-slate-500 hover:text-brand-navy"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* SKU Slide-Over Drawer */}
      <SlideOverDrawer
        open={Boolean(editingSku)}
        title={editingSku ? `Edit Supply Intel SKU: ${editingSku.skuId}` : ''}
        subtitle="Changes recalculate MII %, Lead Time, and Commercial BOQ immediately"
        onClose={() => setEditingSku(null)}
        footer={
          <>
            <button
              type="button"
              onClick={() => setEditingSku(null)}
              className="px-3 py-1.5 border border-slate-300 rounded-cad bg-white text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={commitSku}
              className="px-3 py-1.5 bg-brand-orange text-white rounded-cad text-xs font-semibold"
            >
              Save SKU
            </button>
          </>
        }
      >
        {editingSku && (
          <div className="space-y-2.5 text-xs">
            <label className="block">
              <span className="text-[10px] font-semibold uppercase text-slate-500">SKU ID</span>
              <input
                type="text"
                value={editingSku.skuId}
                onChange={(e) => setEditingSku({ ...editingSku, skuId: e.target.value })}
                className="mt-1 w-full border border-slate-300 rounded-cad px-2.5 py-1.5 font-mono"
              />
            </label>
            <label className="block">
              <span className="text-[10px] font-semibold uppercase text-slate-500">SKU Name</span>
              <input
                type="text"
                value={editingSku.name}
                onChange={(e) => setEditingSku({ ...editingSku, name: e.target.value })}
                className="mt-1 w-full border border-slate-300 rounded-cad px-2.5 py-1.5"
              />
            </label>
            <label className="block">
              <span className="text-[10px] font-semibold uppercase text-slate-500">Category</span>
              <select
                value={editingSku.category}
                onChange={(e) => setEditingSku({ ...editingSku, category: e.target.value as SupplyCategory })}
                className="mt-1 w-full border border-slate-300 rounded-cad px-2.5 py-1.5 bg-white"
              >
                {SUPPLY_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </label>
            <div className="grid grid-cols-3 gap-2">
              <label className="block">
                <span className="text-[10px] font-semibold uppercase text-slate-500">MII %</span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={editingSku.miiPercent}
                  onChange={(e) => setEditingSku({ ...editingSku, miiPercent: Number(e.target.value) || 0 })}
                  className="mt-1 w-full border border-slate-300 rounded-cad px-2 py-1.5 font-mono"
                />
              </label>
              <label className="block">
                <span className="text-[10px] font-semibold uppercase text-slate-500">₹ Lakhs</span>
                <input
                  type="number"
                  min={0}
                  step={0.5}
                  value={editingSku.unitPriceInrLakhs}
                  onChange={(e) => setEditingSku({ ...editingSku, unitPriceInrLakhs: Number(e.target.value) || 0 })}
                  className="mt-1 w-full border border-slate-300 rounded-cad px-2 py-1.5 font-mono"
                />
              </label>
              <label className="block">
                <span className="text-[10px] font-semibold uppercase text-slate-500">Lead (wks)</span>
                <input
                  type="number"
                  min={1}
                  max={52}
                  value={editingSku.leadTimeWeeks}
                  onChange={(e) => setEditingSku({ ...editingSku, leadTimeWeeks: Number(e.target.value) || 1 })}
                  className="mt-1 w-full border border-slate-300 rounded-cad px-2 py-1.5 font-mono"
                />
              </label>
            </div>
          </div>
        )}
      </SlideOverDrawer>

      {/* Master Catalog Slide-Over Drawer */}
      <SlideOverDrawer
        open={Boolean(editingCat)}
        title={editingCat ? `Master Catalog Item: ${editingCat.code}` : ''}
        onClose={() => setEditingCat(null)}
        footer={
          <>
            <button
              type="button"
              onClick={() => setEditingCat(null)}
              className="px-3 py-1.5 border border-slate-300 rounded-cad bg-white text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={commitCat}
              className="px-3 py-1.5 bg-brand-orange text-white rounded-cad text-xs font-semibold"
            >
              Save Item
            </button>
          </>
        }
      >
        {editingCat && (
          <div className="space-y-2.5 text-xs">
            <label className="block">
              <span className="text-[10px] font-semibold uppercase text-slate-500">Code</span>
              <input
                type="text"
                value={editingCat.code}
                onChange={(e) => setEditingCat({ ...editingCat, code: e.target.value })}
                className="mt-1 w-full border border-slate-300 rounded-cad px-2.5 py-1.5 font-mono"
              />
            </label>
            <label className="block">
              <span className="text-[10px] font-semibold uppercase text-slate-500">Description</span>
              <input
                type="text"
                value={editingCat.name}
                onChange={(e) => setEditingCat({ ...editingCat, name: e.target.value })}
                className="mt-1 w-full border border-slate-300 rounded-cad px-2.5 py-1.5"
              />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="block">
                <span className="text-[10px] font-semibold uppercase text-slate-500">Unit Cost (₹ Lakhs)</span>
                <input
                  type="number"
                  value={editingCat.unitCostInrLakhs}
                  onChange={(e) => setEditingCat({ ...editingCat, unitCostInrLakhs: Number(e.target.value) || 0 })}
                  className="mt-1 w-full border border-slate-300 rounded-cad px-2 py-1.5 font-mono"
                />
              </label>
              <label className="block">
                <span className="text-[10px] font-semibold uppercase text-slate-500">MII %</span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={editingCat.miiPercent}
                  onChange={(e) => setEditingCat({ ...editingCat, miiPercent: Number(e.target.value) || 0 })}
                  className="mt-1 w-full border border-slate-300 rounded-cad px-2 py-1.5 font-mono"
                />
              </label>
            </div>
            <label className="flex items-center gap-2 pt-1 cursor-pointer">
              <input
                type="checkbox"
                checked={editingCat.active}
                onChange={(e) => setEditingCat({ ...editingCat, active: e.target.checked })}
                className="accent-brand-orange"
              />
              Active in Configurator Catalog
            </label>
          </div>
        )}
      </SlideOverDrawer>
    </div>
  );
};
