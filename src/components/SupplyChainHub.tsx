import React, { useMemo, useState } from 'react';
import { formatMoney } from '../engine/engineeringEngine';
import { extractQuotesWithByokGemini } from '../engine/geminiExtractor';
import {
  generatePartnerRfqCsv,
  mergeSupplyChainWithDedup,
  parseSupplyChainCsv
} from '../engine/supplyMatcher';
import type {
  ConfidenceLevel,
  EngineeringResult,
  MasterStandards,
  PlaceholderSku,
  ProjectDeal,
  SupplyChainDataset,
  SupplyChainSku,
  SupplyTier
} from '../types/mdc';

interface SupplyChainHubProps {
  supplyIntel: SupplyChainDataset;
  currentProject: ProjectDeal;
  eng: EngineeringResult;
  standards: MasterStandards;
  onUpdateSupplyIntel: (next: SupplyChainDataset) => void;
}

export const SupplyChainHub: React.FC<SupplyChainHubProps> = ({
  supplyIntel,
  currentProject,
  eng,
  standards,
  onUpdateSupplyIntel
}) => {
  const [activeTab, setActiveTab] = useState<'db' | 'placeholders' | 'feedback' | 'byok'>('db');
  const [catFilter, setCatFilter] = useState('ALL');
  const [tierFilter, setTierFilter] = useState<'ALL' | SupplyTier>('ALL');
  const [searchText, setSearchText] = useState('');
  const [statusBanner, setStatusBanner] = useState('');

  // BYOK Gemini Quote / Datasheet Extractor state (API key kept in session memory only)
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [rawQuoteText, setRawQuoteText] = useState('');
  const [extracting, setExtracting] = useState(false);
  const [extractedPreview, setExtractedPreview] = useState<SupplyChainSku[]>([]);

  // New Manual SKU Modal
  const [showAddSku, setShowAddSku] = useState(false);
  const [newSku, setNewSku] = useState<Partial<SupplyChainSku>>({
    group: 'trafo',
    category: 'Transformers (K-Factor)',
    vendor: '',
    tier: 'Tier-1',
    family: '',
    sku: '',
    rating: 2000,
    unit: 'kVA',
    footprintSqm: 14,
    basis: 'Ex-Works India',
    lead: '12 Wks',
    baseLow: 4000000,
    baseHigh: 4500000,
    miiPct: 88,
    confidence: 'Verified'
  });

  const categories = useMemo(() => {
    return ['ALL', ...Array.from(new Set((supplyIntel.items || []).map(i => i.category)))];
  }, [supplyIntel]);

  const filteredItems = useMemo(() => {
    const q = searchText.toLowerCase().trim();
    return (supplyIntel.items || []).filter(it => {
      if (catFilter !== 'ALL' && it.category !== catFilter) return false;
      if (tierFilter !== 'ALL' && it.tier !== tierFilter) return false;
      if (!q) return true;
      return (
        it.vendor.toLowerCase().includes(q) ||
        it.sku.toLowerCase().includes(q) ||
        it.family.toLowerCase().includes(q) ||
        it.category.toLowerCase().includes(q)
      );
    });
  }, [supplyIntel, catFilter, tierFilter, searchText]);

  const dealQuotes = useMemo(() => {
    return eng.bomItems.filter(it => it.isOverridden);
  }, [eng]);

  const handleExportPartnerRfq = () => {
    if (eng.dealPlaceholders.length === 0) {
      setStatusBanner('No active [PLACEHOLDER] items in the current deal to export.');
      return;
    }
    const csv = generatePartnerRfqCsv(currentProject.name, currentProject.cityQuery, eng.dealPlaceholders);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentProject.name.replace(/[^a-zA-Z0-9_-]+/g, '_')}_Partner_RFQ_Placeholders.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setStatusBanner(`✓ Exported Partner RFQ CSV for ${eng.dealPlaceholders.length} placeholder subsystem(s).`);
  };

  const promotePlaceholderToDb = (ph: PlaceholderSku) => {
    const today = new Date().toISOString().slice(0, 10);
    const candidate: SupplyChainSku = {
      id: `SI-RFQ-${Date.now()}`,
      group: ph.group,
      category: ph.category,
      vendor: 'Partner RFQ Qualified OEM',
      tier: 'Tier-1',
      family: ph.builtUpName.replace('[PLACEHOLDER] ', ''),
      sku: `OEM-${ph.group.toUpperCase()}-${ph.synthesizedRating}`,
      rating: ph.synthesizedRating,
      unit: ph.capacityUnit,
      footprintSqm: ph.scaledFootprintSqm,
      basis: 'Partner RFQ Quote',
      lead: '14 Wks',
      baseLow: ph.romUnitPriceInr,
      baseHigh: Math.round(ph.romUnitPriceInr * 1.08),
      miiClass: 'Class-I',
      miiPct: 80,
      confidence: 'Medium',
      trustSource: 'PartnerRFQ',
      lastSeen: today
    };
    const res = mergeSupplyChainWithDedup(supplyIntel.items || [], [candidate]);
    onUpdateSupplyIntel({
      ...supplyIntel,
      lastRefreshed: today,
      items: res.merged
    });
    setStatusBanner(`✓ Added "${candidate.sku}" to Supply Chain DB via 2-stage deduplication.`);
  };

  const promoteDealQuoteToSupplyDb = (bomItem: (typeof dealQuotes)[number]) => {
    const today = new Date().toISOString().slice(0, 10);
    const candidate: SupplyChainSku = {
      id: `SI-DEAL-${Date.now()}`,
      group: bomItem.group || 'trafo',
      category: bomItem.category,
      vendor: bomItem.make,
      tier: 'Tier-1',
      family: bomItem.label,
      sku: bomItem.model,
      rating: 1,
      unit: bomItem.unit,
      footprintSqm: 12,
      basis: `Deal Quote (${currentProject.name})`,
      lead: '10 Wks',
      baseLow: bomItem.unitCost,
      baseHigh: bomItem.unitCost,
      miiClass: (bomItem.miiPct || 85) >= 50 ? 'Class-I' : 'Class-II',
      miiPct: bomItem.miiPct || 85,
      confidence: 'Verified',
      trustSource: 'DealVerifiedQuote',
      lastSeen: today
    };
    const res = mergeSupplyChainWithDedup(supplyIntel.items || [], [candidate]);
    onUpdateSupplyIntel({
      ...supplyIntel,
      lastRefreshed: today,
      items: res.merged
    });
    setStatusBanner(
      `✓ Merged Deal-Verified Quote (${bomItem.make} ${bomItem.model} @ ₹${bomItem.unitCost.toLocaleString('en-IN')}) with highest trust priority.`
    );
  };

  const handleCsvBulkImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const parsed = parseSupplyChainCsv(String(ev.target?.result || ''));
      if (parsed.length === 0) {
        setStatusBanner('No valid rows found in CSV. Ensure headers include Vendor, SKU, Rating, BaseLow.');
        return;
      }
      const res = mergeSupplyChainWithDedup(supplyIntel.items || [], parsed);
      onUpdateSupplyIntel({
        ...supplyIntel,
        lastRefreshed: new Date().toISOString().slice(0, 10),
        items: res.merged
      });
      setStatusBanner(
        `✓ CSV Bulk Import complete: +${res.addedCount} added, ${res.updatedCount} updated, ${res.preservedHigherTrustCount} higher-trust quotes preserved.`
      );
    };
    reader.readAsText(f);
  };

  const downloadCsvTemplate = () => {
    const rows = [
      ['Vendor', 'Tier', 'Group', 'Category', 'Family', 'SKU', 'Rating', 'Unit', 'FootprintSqm', 'Basis', 'Lead', 'BaseLow', 'BaseHigh', 'MiiPct'],
      ['ABB India', 'Tier-1', 'trafo', 'Transformers (K-Factor)', 'Resibloc Dry-Type K-13', 'RESI-2500-K13', '2500', 'kVA', '16', 'Ex-Works Vadodara', '14 Wks', '5100000', '5800000', '88']
    ];
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mdc_supply_chain_import_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleRunByokExtractor = async () => {
    setExtracting(true);
    setStatusBanner('');
    try {
      const res = await extractQuotesWithByokGemini(geminiApiKey, rawQuoteText);
      setExtractedPreview(res.items);
      setStatusBanner(`✓ ${res.rawSummary} Review and click "Merge into Supply DB" below.`);
    } catch (err: unknown) {
      setStatusBanner(`⚠ ${(err as Error)?.message || 'Extraction failed.'}`);
    } finally {
      setExtracting(false);
    }
  };

  const commitExtractedItems = () => {
    if (extractedPreview.length === 0) return;
    const res = mergeSupplyChainWithDedup(supplyIntel.items || [], extractedPreview);
    onUpdateSupplyIntel({
      ...supplyIntel,
      lastRefreshed: new Date().toISOString().slice(0, 10),
      items: res.merged
    });
    setExtractedPreview([]);
    setStatusBanner(
      `✓ Merged ${extractedPreview.length} BYOK Gemini extracted SKU(s): +${res.addedCount} new, ${res.updatedCount} updated.`
    );
  };

  const handleSaveManualSku = () => {
    if (!newSku.vendor || !newSku.sku) return;
    const today = new Date().toISOString().slice(0, 10);
    const miiPct = Number(newSku.miiPct) || 85;
    const item: SupplyChainSku = {
      id: `SI-MAN-${Date.now()}`,
      group: newSku.group || 'trafo',
      category: newSku.category || 'Custom OEM',
      vendor: newSku.vendor,
      tier: newSku.tier || 'Tier-1',
      family: newSku.family || newSku.sku,
      sku: newSku.sku,
      rating: Number(newSku.rating) || 1000,
      unit: newSku.unit || 'kVA',
      footprintSqm: Number(newSku.footprintSqm) || 12,
      basis: newSku.basis || 'Ex-Works India',
      lead: newSku.lead || '12 Wks',
      baseLow: Number(newSku.baseLow) || 1000000,
      baseHigh: Number(newSku.baseHigh) || Number(newSku.baseLow) || 1100000,
      miiClass: miiPct >= 50 ? 'Class-I' : 'Class-II',
      miiPct,
      confidence: (newSku.confidence as ConfidenceLevel) || 'Verified',
      trustSource: 'ManualMaster',
      lastSeen: today
    };
    const res = mergeSupplyChainWithDedup(supplyIntel.items || [], [item]);
    onUpdateSupplyIntel({
      ...supplyIntel,
      lastRefreshed: today,
      items: res.merged
    });
    setShowAddSku(false);
    setStatusBanner(`✓ Saved ${item.vendor} ${item.sku} into Supply Chain Intelligence DB.`);
  };

  const reloadBundledSupplyJson = async () => {
    try {
      const res = await fetch(`./mdc_supply_intel.json?t=${Date.now()}`);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      if (Array.isArray(data.items)) {
        const mergedRes = mergeSupplyChainWithDedup(supplyIntel.items || [], data.items);
        onUpdateSupplyIntel({
          ...supplyIntel,
          lastRefreshed: data.lastRefreshed || new Date().toISOString().slice(0, 10),
          items: mergedRes.merged
        });
        setStatusBanner(
          `✓ Synced from public/mdc_supply_intel.json (+${mergedRes.addedCount} added, ${mergedRes.preservedHigherTrustCount} higher-trust quotes preserved).`
        );
      }
    } catch {
      setStatusBanner('Could not fetch ./mdc_supply_intel.json; using local pre-seeded 56-SKU database.');
    }
  };

  return (
    <div className="space-y-5 text-xs">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl card-shadow border border-slate-200 p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="px-2.5 py-0.5 rounded bg-sky-100 text-sky-950 font-black uppercase text-[10px]">
              Pillar 03 • India OEM Supply Chain Intelligence & Market-Scout Engine
            </span>
            <h2 className="text-xl font-bold navy-text mt-1">
              Unified OEM SKU Database ({supplyIntel.items?.length || 0} Tier-1 & Tier-2 India SKUs)
            </h2>
            <p className="text-slate-500">
              Last Refreshed: <strong>{supplyIntel.lastRefreshed}</strong> • Trust Hierarchy:{' '}
              <code>DealVerifiedQuote &gt; PartnerRFQ &gt; ManualMaster &gt; GeminiSearchRefresh &gt; SeedCatalog</code>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowAddSku(true)}
              className="px-3.5 py-2 rounded-lg coral-bg text-white font-bold"
            >
              + Add OEM SKU
            </button>
            <label className="px-3.5 py-2 rounded-lg navy-bg text-white font-bold cursor-pointer">
              📥 CSV Bulk Import
              <input type="file" accept=".csv" onChange={handleCsvBulkImport} className="hidden" />
            </label>
            <button
              onClick={downloadCsvTemplate}
              className="px-3 py-2 rounded-lg border border-slate-300 bg-white font-bold text-slate-700"
            >
              CSV Template
            </button>
            <button
              onClick={reloadBundledSupplyJson}
              className="px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-300 text-emerald-900 font-bold"
              title="Sync latest monthly GitHub Actions Gemini Search-grounded refresh file"
            >
              ↻ Sync Monthly CI/CD Feed
            </button>
          </div>
        </div>

        {statusBanner && (
          <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-950 font-bold">
            {statusBanner}
          </div>
        )}

        {/* Sub-Tabs */}
        <div className="flex flex-wrap gap-1.5 pt-1 border-t border-slate-200">
          <button
            onClick={() => setActiveTab('db')}
            className={`px-3.5 py-1.5 rounded-lg font-bold ${
              activeTab === 'db' ? 'navy-bg text-white' : 'bg-slate-100 text-slate-700'
            }`}
          >
            1. India OEM SKU Catalog ({supplyIntel.items?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('placeholders')}
            className={`px-3.5 py-1.5 rounded-lg font-bold ${
              activeTab === 'placeholders' ? 'navy-bg text-white' : 'bg-slate-100 text-slate-700'
            }`}
          >
            2. Market-Scout Placeholder Queue ({eng.dealPlaceholders.length}) & Partner RFQ
          </button>
          <button
            onClick={() => setActiveTab('feedback')}
            className={`px-3.5 py-1.5 rounded-lg font-bold ${
              activeTab === 'feedback' ? 'navy-bg text-white' : 'bg-slate-100 text-slate-700'
            }`}
          >
            3. Deal-to-Supply Quote Feedback ({dealQuotes.length})
          </button>
          <button
            onClick={() => setActiveTab('byok')}
            className={`px-3.5 py-1.5 rounded-lg font-bold ${
              activeTab === 'byok' ? 'navy-bg text-white' : 'bg-slate-100 text-slate-700'
            }`}
          >
            4. BYOK Gemini Quote / Datasheet Extractor
          </button>
        </div>
      </div>

      {/* TAB 1: UNIFIED OEM SKU DATABASE */}
      {activeTab === 'db' && (
        <div className="bg-white rounded-2xl card-shadow border border-slate-200 p-5 space-y-4">
          <div className="flex flex-wrap items-center gap-2.5">
            <select
              value={catFilter}
              onChange={e => setCatFilter(e.target.value)}
              className="border border-slate-300 rounded-lg px-3 py-1.5 bg-white font-bold navy-text"
            >
              {categories.map(c => (
                <option key={c} value={c}>
                  {c === 'ALL' ? 'All Equipment Categories' : c}
                </option>
              ))}
            </select>
            <select
              value={tierFilter}
              onChange={e => setTierFilter(e.target.value as 'ALL' | SupplyTier)}
              className="border border-slate-300 rounded-lg px-3 py-1.5 bg-white font-bold"
            >
              <option value="ALL">All Tiers (Tier-1 & Tier-2)</option>
              <option value="Tier-1">Tier-1 Global/National OEMs</option>
              <option value="Tier-2">Tier-2 Specialist India OEMs</option>
            </select>
            <input
              type="text"
              placeholder="Search OEM vendor, model/SKU, or family..."
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              className="flex-1 min-w-[200px] border border-slate-300 rounded-lg px-3 py-1.5"
            />
            <span className="font-bold text-slate-500">{filteredItems.length} SKUs</span>
          </div>

          <div className="overflow-x-auto max-h-[540px]">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 z-10">
                <tr className="navy-bg text-white text-[11px]">
                  <th className="p-2.5">Vendor & Tier</th>
                  <th className="p-2.5">Category & Family</th>
                  <th className="p-2.5">SKU / Model</th>
                  <th className="p-2.5 text-right">Rating</th>
                  <th className="p-2.5 text-right">Price Range (INR)</th>
                  <th className="p-2.5 text-center">MII Class</th>
                  <th className="p-2.5 text-center">Confidence & Trust</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((it, idx) => (
                  <tr
                    key={it.id}
                    className={`border-b border-slate-200 ${idx % 2 === 1 ? 'bg-slate-50/60' : 'bg-white'}`}
                  >
                    <td className="p-2.5">
                      <div className="font-bold navy-text">{it.vendor}</div>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-black ${
                          it.tier === 'Tier-1'
                            ? 'bg-blue-100 text-blue-900'
                            : 'bg-purple-100 text-purple-900'
                        }`}
                      >
                        {it.tier}
                      </span>
                    </td>
                    <td className="p-2.5">
                      <div className="font-semibold text-slate-800">{it.family}</div>
                      <div className="text-[11px] text-slate-500">{it.category}</div>
                    </td>
                    <td className="p-2.5 font-mono font-bold text-slate-800">
                      {it.sku}
                      <span className="block font-sans font-normal text-[10px] text-slate-500">
                        Lead: {it.lead} • {it.basis}
                      </span>
                    </td>
                    <td className="p-2.5 text-right font-black">
                      {it.rating} {it.unit}
                    </td>
                    <td className="p-2.5 text-right font-bold text-emerald-900">
                      {formatMoney(it.baseLow, 'INR', standards)} – {formatMoney(it.baseHigh, 'INR', standards)}
                    </td>
                    <td className="p-2.5 text-center">
                      <span className="px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-900 font-bold text-[10px]">
                        {it.miiClass} ({it.miiPct}%)
                      </span>
                    </td>
                    <td className="p-2.5 text-center">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-black ${
                          it.confidence === 'Verified'
                            ? 'bg-emerald-600 text-white'
                            : it.confidence === 'High'
                              ? 'bg-sky-600 text-white'
                              : 'bg-amber-400 text-slate-950'
                        }`}
                      >
                        {it.confidence}
                      </span>
                      <div className="text-[10px] text-slate-500 mt-0.5">{it.trustSource}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: MARKET-SCOUT PLACEHOLDER QUEUE + PARTNER RFQ EXPORT */}
      {activeTab === 'placeholders' && (
        <div className="bg-white rounded-2xl card-shadow border border-slate-200 p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
            <div>
              <h3 className="text-base font-bold navy-text">
                Market-Scout Placeholder Queue — Active Deal ({currentProject.name})
              </h3>
              <p className="text-slate-500">
                Subsystems where no Supply DB SKU matched within ±20% / ≤8 active units. Export Partner RFQ CSV or qualify into Supply DB.
              </p>
            </div>
            <button
              onClick={handleExportPartnerRfq}
              className="px-4 py-2 rounded-lg coral-bg text-white font-bold"
            >
              ⬇ Export Partner RFQ / Market-Scout (.CSV)
            </button>
          </div>

          {eng.dealPlaceholders.length === 0 ? (
            <div className="p-6 text-center bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 font-bold">
              ✓ Zero active [PLACEHOLDER] items in "{currentProject.name}" — all subsystems matched verified India OEM SKUs.
            </div>
          ) : (
            <div className="space-y-3">
              {eng.dealPlaceholders.map(ph => (
                <div
                  key={ph.id}
                  className="p-4 rounded-xl bg-amber-50/70 border border-amber-300 flex flex-wrap items-center justify-between gap-3"
                >
                  <div className="space-y-1 max-w-2xl">
                    <div className="font-black text-amber-950 text-sm">{ph.builtUpName}</div>
                    <div className="text-slate-700">{ph.marketScoutRemark}</div>
                    <div className="font-bold text-slate-800">
                      Qty Required: {ph.totalUnits} ({ph.activeN}+{ph.redundantR}) • ROM Unit Budget:{' '}
                      {formatMoney(ph.romUnitPriceInr, 'INR', standards)} • Nearest OEM: {ph.nearestOemRef}
                    </div>
                  </div>
                  <button
                    onClick={() => promotePlaceholderToDb(ph)}
                    className="px-3.5 py-2 rounded-lg navy-bg text-white font-bold"
                  >
                    + Qualify into Supply DB
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: DEAL-TO-SUPPLY QUOTE FEEDBACK */}
      {activeTab === 'feedback' && (
        <div className="bg-white rounded-2xl card-shadow border border-slate-200 p-5 space-y-4">
          <div>
            <h3 className="text-base font-bold navy-text">
              Deal-to-Supply Quote Feedback Loop (Highest Trust Rank: DealVerifiedQuote)
            </h3>
            <p className="text-slate-500">
              Promote special vendor quotes entered in Stage 2 DESIGN back into the central Supply Chain DB with 2-stage deduplication.
            </p>
          </div>

          {dealQuotes.length === 0 ? (
            <div className="p-6 text-center bg-slate-50 border border-slate-200 rounded-xl text-slate-600 font-medium">
              No deal-specific Special Vendor Quotes entered in "{currentProject.name}" yet. Add quotes in Stage 2 DESIGN.
            </div>
          ) : (
            <div className="space-y-2.5">
              {dealQuotes.map(q => (
                <div
                  key={q.key}
                  className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-200 flex flex-wrap items-center justify-between gap-3"
                >
                  <div>
                    <div className="font-bold navy-text">
                      {q.make} — {q.model} ({q.label})
                    </div>
                    <div className="text-slate-600">
                      Negotiated Rate: <strong>₹{q.unitCost.toLocaleString('en-IN')}</strong> (vs Master ₹
                      {q.masterUnitCost.toLocaleString('en-IN')}) • Note: {q.comments || 'Deal Quote'}
                    </div>
                  </div>
                  <button
                    onClick={() => promoteDealQuoteToSupplyDb(q)}
                    className="px-3.5 py-1.5 rounded-lg bg-emerald-700 text-white font-bold"
                  >
                    ↑ Push to Supply DB (Verified)
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: OPTIONAL CLIENT-SIDE BYOK GEMINI QUOTE / DATASHEET EXTRACTOR */}
      {activeTab === 'byok' && (
        <div className="bg-white rounded-2xl card-shadow border border-slate-200 p-5 space-y-4">
          <div>
            <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-950 font-black uppercase text-[10px]">
              Optional Client-Side BYOK AI Parser
            </span>
            <h3 className="text-base font-bold navy-text mt-1">
              BYOK Gemini Vendor Quote & Datasheet Extractor
            </h3>
            <p className="text-slate-500">
              Your Gemini API key stays strictly in browser session memory and is never saved to deal JSONs. Extracted SKUs merge through 2-stage vendor/spec deduplication.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Gemini API Key (Session-Only BYOK)</label>
              <input
                type="password"
                value={geminiApiKey}
                onChange={e => setGeminiApiKey(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full border border-slate-300 rounded-lg px-3 py-2 font-mono"
              />
            </div>
            <div className="md:col-span-2 flex items-end">
              <button
                onClick={handleRunByokExtractor}
                disabled={extracting}
                className="px-4 py-2 rounded-lg navy-bg text-white font-bold"
              >
                {extracting ? 'Extracting with Gemini 2.5 Flash...' : '✨ Extract Structured OEM SKUs'}
              </button>
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Paste Vendor Offer Table, Email Quote, or OEM Datasheet Text
            </label>
            <textarea
              rows={5}
              value={rawQuoteText}
              onChange={e => setRawQuoteText(e.target.value)}
              placeholder="Paste vendor quote text e.g.: Vertiv Liebert XDU-1350 Liquid-to-Liquid CDU 1350 kW, Landed India Rs. 65,50,000, lead time 10 weeks..."
              className="w-full border border-slate-300 rounded-lg p-3 font-mono text-xs"
            />
          </div>

          {extractedPreview.length > 0 && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-300 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-emerald-950">
                  Extracted {extractedPreview.length} OEM Line Item(s):
                </span>
                <button
                  onClick={commitExtractedItems}
                  className="px-4 py-1.5 rounded-lg coral-bg text-white font-bold"
                >
                  ✓ Merge into Supply DB (2-Stage Dedup)
                </button>
              </div>
              <div className="space-y-1.5">
                {extractedPreview.map(it => (
                  <div key={it.id} className="bg-white p-2.5 rounded border border-emerald-200 flex justify-between">
                    <span>
                      <strong>{it.vendor}</strong> — {it.sku} ({it.rating} {it.unit})
                    </span>
                    <span className="font-bold text-emerald-900">
                      ₹{it.baseLow.toLocaleString('en-IN')} – ₹{it.baseHigh.toLocaleString('en-IN')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add Manual OEM SKU Modal */}
      {showAddSku && (
        <div className="fixed inset-0 bg-slate-950/65 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-2xl border border-slate-200 space-y-3 text-xs">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="text-base font-bold navy-text">Add India OEM SKU to Supply Chain DB</h3>
              <button onClick={() => setShowAddSku(false)} className="font-bold text-slate-500 text-base">
                ✕
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block font-bold mb-1">OEM Vendor Name</label>
                <input
                  type="text"
                  value={newSku.vendor || ''}
                  onChange={e => setNewSku(p => ({ ...p, vendor: e.target.value }))}
                  className="w-full border rounded px-2.5 py-1.5"
                />
              </div>
              <div>
                <label className="block font-bold mb-1">Tier</label>
                <select
                  value={newSku.tier}
                  onChange={e => setNewSku(p => ({ ...p, tier: e.target.value as SupplyTier }))}
                  className="w-full border rounded px-2.5 py-1.5 bg-white"
                >
                  <option value="Tier-1">Tier-1</option>
                  <option value="Tier-2">Tier-2</option>
                </select>
              </div>
              <div>
                <label className="block font-bold mb-1">Equipment Group</label>
                <select
                  value={newSku.group}
                  onChange={e => setNewSku(p => ({ ...p, group: e.target.value }))}
                  className="w-full border rounded px-2.5 py-1.5 bg-white"
                >
                  <option value="trafo">trafo (Transformer)</option>
                  <option value="ups">ups (Modular UPS)</option>
                  <option value="bess">bess (Battery Pod)</option>
                  <option value="dg">dg (CPCB IV+ DG)</option>
                  <option value="cdu">cdu (Liquid CDU)</option>
                  <option value="cooler">cooler (Adiabatic Cooler)</option>
                  <option value="chiller">chiller (Chiller)</option>
                  <option value="pac">pac (Precision Air Cooler)</option>
                  <option value="pump">pump (Pump Skid)</option>
                  <option value="tank">tank (Water Tank)</option>
                </select>
              </div>
              <div>
                <label className="block font-bold mb-1">SKU / Model Code</label>
                <input
                  type="text"
                  value={newSku.sku || ''}
                  onChange={e => setNewSku(p => ({ ...p, sku: e.target.value }))}
                  className="w-full border rounded px-2.5 py-1.5 font-mono"
                />
              </div>
              <div>
                <label className="block font-bold mb-1">Capacity Rating</label>
                <input
                  type="number"
                  value={newSku.rating || 0}
                  onChange={e => setNewSku(p => ({ ...p, rating: Number(e.target.value) }))}
                  className="w-full border rounded px-2.5 py-1.5"
                />
              </div>
              <div>
                <label className="block font-bold mb-1">Unit (kVA / kW / kL)</label>
                <input
                  type="text"
                  value={newSku.unit || 'kVA'}
                  onChange={e => setNewSku(p => ({ ...p, unit: e.target.value }))}
                  className="w-full border rounded px-2.5 py-1.5"
                />
              </div>
              <div>
                <label className="block font-bold mb-1">Base Low Price (INR)</label>
                <input
                  type="number"
                  value={newSku.baseLow || 0}
                  onChange={e => setNewSku(p => ({ ...p, baseLow: Number(e.target.value) }))}
                  className="w-full border rounded px-2.5 py-1.5"
                />
              </div>
              <div>
                <label className="block font-bold mb-1">Base High Price (INR)</label>
                <input
                  type="number"
                  value={newSku.baseHigh || 0}
                  onChange={e => setNewSku(p => ({ ...p, baseHigh: Number(e.target.value) }))}
                  className="w-full border rounded px-2.5 py-1.5"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setShowAddSku(false)} className="px-3 py-1.5 rounded border font-bold">
                Cancel
              </button>
              <button onClick={handleSaveManualSku} className="px-4 py-1.5 rounded coral-bg text-white font-bold">
                Save SKU
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
