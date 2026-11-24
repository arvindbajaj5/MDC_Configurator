import type {
  NonItCatalogItem,
  PlaceholderSku,
  RedundancySizing,
  SupplyChainSku,
  SupplySynthesisMatch,
  TrustSource,
  UptimeTier
} from '../types/mdc';

export const TRUST_HIERARCHY: Record<TrustSource, number> = {
  DealVerifiedQuote: 5,
  PartnerRFQ: 4,
  ManualMaster: 3,
  GeminiSearchRefresh: 2,
  SeedCatalog: 1
};

const VENDOR_ALIAS_MAP: Record<string, string> = {
  abb: 'abb india',
  'abb india ltd': 'abb india',
  siemens: 'siemens energy india',
  'siemens india': 'siemens energy india',
  schneider: 'schneider electric india',
  'schneider electric': 'schneider electric india',
  vertiv: 'vertiv energy india',
  cummins: 'cummins india',
  koel: 'kirloskar oil engines (koel)',
  kirloskar: 'kirloskar oil engines (koel)',
  eaton: 'eaton power quality',
  'l&t': 'l&t electrical & automation (lauritz knudsen)',
  voltamp: 'voltamp transformers',
  trane: 'trane technologies india',
  stulz: 'stulz chvac india'
};

export function calcRedundantUnits(
  totalDemand: number,
  unitRating: number,
  tier: UptimeTier
): RedundancySizing {
  if (totalDemand <= 0 || unitRating <= 0) return { activeN: 0, redundantR: 0, total: 0 };
  const activeN = Math.max(1, Math.ceil(totalDemand / unitRating));
  if (tier === 'None') return { activeN, redundantR: 0, total: activeN };
  if (tier === 'Tier IV') return { activeN, redundantR: activeN, total: activeN * 2 };
  if (tier === 'Tier III') return { activeN, redundantR: 1, total: activeN + 1 };
  const redundantR = activeN >= 3 ? 1 : 0;
  return { activeN, redundantR, total: activeN + redundantR };
}

export function normalizeVendorName(v = ''): string {
  const clean = v.toLowerCase().replace(/[^a-z0-9& ]+/g, ' ').replace(/\s+/g, ' ').trim();
  return VENDOR_ALIAS_MAP[clean] || clean;
}

export function normalizeSkuKey(s = ''): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

/**
 * 2-Stage Vendor/Spec Deduplication & Trust-Hierarchy Merge
 * Stage 1: Exact normalized vendor + SKU match
 * Stage 2: Same canonical vendor + equipment group + ±5% capacity rating match
 */
export function mergeSupplyChainWithDedup(
  existingItems: SupplyChainSku[],
  incomingItems: SupplyChainSku[]
): { merged: SupplyChainSku[]; addedCount: number; updatedCount: number; preservedHigherTrustCount: number } {
  const result = existingItems.map(item => ({ ...item }));
  let addedCount = 0;
  let updatedCount = 0;
  let preservedHigherTrustCount = 0;

  for (const inc of incomingItems) {
    const incVendor = normalizeVendorName(inc.vendor);
    const incSku = normalizeSkuKey(inc.sku);
    const incGroup = (inc.group || '').toLowerCase();
    const incRating = Number(inc.rating) || 0;

    let matchIdx = result.findIndex(
      ex => normalizeVendorName(ex.vendor) === incVendor && normalizeSkuKey(ex.sku) === incSku
    );

    if (matchIdx === -1 && incGroup && incRating > 0) {
      matchIdx = result.findIndex(ex => {
        if (normalizeVendorName(ex.vendor) !== incVendor) return false;
        if ((ex.group || '').toLowerCase() !== incGroup) return false;
        const exRating = Number(ex.rating) || 0;
        if (exRating <= 0) return false;
        return Math.abs(exRating - incRating) / exRating <= 0.05;
      });
    }

    if (matchIdx === -1) {
      result.push({ ...inc });
      addedCount++;
      continue;
    }

    const existing = result[matchIdx];
    const exRank = TRUST_HIERARCHY[existing.trustSource] ?? 1;
    const inRank = TRUST_HIERARCHY[inc.trustSource] ?? 1;

    if (inRank >= exRank) {
      result[matchIdx] = {
        ...existing,
        ...inc,
        id: existing.id,
        lastSeen: inc.lastSeen || new Date().toISOString().slice(0, 10)
      };
      updatedCount++;
    } else {
      result[matchIdx] = {
        ...existing,
        lead: existing.lead || inc.lead,
        marketRefreshNote: `Checked ${inc.lastSeen || new Date().toISOString().slice(0, 10)}; preserved ${existing.trustSource}`
      };
      preservedHigherTrustCount++;
    }
  }

  return { merged: result, addedCount, updatedCount, preservedHigherTrustCount };
}

/**
 * V13.1 ±20% Auto-Placeholder Synthesis Engine
 * - Evaluates Supply Chain DB SKUs (and Master Non-IT fallbacks) for a subsystem group.
 * - Valid OEM Fit Rule:
 *     1) Active unit count 1 <= activeN <= 8
 *     2) Oversize / fit margin within ±20% (i.e. utilization ratio demand / (activeN * rating) >= 0.80,
 *        or installed capacity <= 1.20 * demand)
 * - If NO OEM SKU satisfies both <= 8 active units AND ±20% capacity fit,
 *   synthesizes a deal-local [PLACEHOLDER] SKU with built-up name, power-law ROM price,
 *   scaled footprint, and market-scout remark. NEVER written to Master Catalog.
 */
export function matchOrSynthesizeSubsystem(params: {
  dealId: string;
  group: string;
  categoryLabel: string;
  demand: number;
  demandUnit: string;
  uptimeTier: UptimeTier;
  supplyItems: SupplyChainSku[];
  masterFallbacks: NonItCatalogItem[];
  minUnits?: number;
  maxActiveUnits?: number;
  tolerancePct?: number;
}): SupplySynthesisMatch | null {
  const {
    dealId,
    group,
    categoryLabel,
    demand,
    demandUnit,
    uptimeTier,
    supplyItems,
    masterFallbacks,
    minUnits = 1,
    maxActiveUnits = 8,
    tolerancePct = 20
  } = params;

  if (demand <= 0) return null;

  interface Candidate {
    id: string;
    vendor: string;
    model: string;
    label: string;
    rating: number;
    unit: string;
    priceInr: number;
    footprintSqm: number;
    miiPct: number;
    tier?: 'Tier-1' | 'Tier-2';
    confidence?: 'Verified' | 'High' | 'Medium' | 'ROM';
  }

  const dbCandidates: Candidate[] = supplyItems
    .filter(s => s.group === group && s.rating > 0)
    .map(s => ({
      id: s.id,
      vendor: s.vendor,
      model: s.sku,
      label: `${s.vendor} ${s.family} (${s.rating} ${s.unit})`,
      rating: s.rating,
      unit: s.unit,
      priceInr: Math.round((s.baseLow + s.baseHigh) / 2),
      footprintSqm: s.footprintSqm || 12,
      miiPct: s.miiPct || 80,
      tier: s.tier,
      confidence: s.confidence
    }));

  const fallbackCandidates: Candidate[] =
    dbCandidates.length > 0
      ? dbCandidates
      : masterFallbacks
          .filter(m => m.group === group && m.ratedCapacity > 0)
          .map(m => ({
            id: m.id,
            vendor: m.make,
            model: m.model,
            label: m.label,
            rating: m.ratedCapacity,
            unit: m.capacityUnit,
            priceInr: m.cost,
            footprintSqm: m.footprintSqm || 12,
            miiPct: m.miiPct ?? 82,
            tier: 'Tier-1',
            confidence: 'High'
          }));

  const maxRatio = 1 + tolerancePct / 100; // 1.20 (i.e. at most 20% oversized)
  let bestFit: {
    cand: Candidate;
    calc: RedundancySizing;
    totalUnits: number;
    score: number;
    utilPct: number;
  } | null = null;

  for (const cand of fallbackCandidates) {
    const calc = calcRedundantUnits(demand, cand.rating, uptimeTier);
    const totalUnits = Math.max(minUnits, calc.total);
    const activeCapacity = calc.activeN * cand.rating;
    const oversizeRatio = activeCapacity / demand;
    const utilPct = Number(((demand / activeCapacity) * 100).toFixed(1));

    if (calc.activeN <= maxActiveUnits && oversizeRatio <= maxRatio) {
      // Prefer Tier-1 verified OEMs with lowest combined CAPEX + footprint penalty
      const tierPenalty = cand.tier === 'Tier-2' ? 1.03 : 1.0;
      const score = (totalUnits * cand.priceInr + totalUnits * cand.footprintSqm * 25000) * tierPenalty;
      if (!bestFit || score < bestFit.score) {
        bestFit = { cand, calc, totalUnits, score, utilPct };
      }
    }
  }

  if (bestFit) {
    return {
      group,
      demand,
      demandUnit,
      matchedSkuId: bestFit.cand.id,
      vendor: bestFit.cand.vendor,
      model: bestFit.cand.model,
      label: bestFit.cand.label,
      ratedCapacity: bestFit.cand.rating,
      activeN: bestFit.calc.activeN,
      redundantR: bestFit.calc.redundantR,
      totalUnits: bestFit.totalUnits,
      unitPriceInr: bestFit.cand.priceInr,
      footprintSqm: bestFit.cand.footprintSqm,
      miiPct: bestFit.cand.miiPct,
      tier: bestFit.cand.tier,
      confidence: bestFit.cand.confidence,
      utilizationPct: bestFit.utilPct,
      isPlaceholder: false
    };
  }

  // NO OEM FITS WITHIN ±20% AND <= 8 ACTIVE UNITS -> SYNTHESIZE DEAL-LOCAL [PLACEHOLDER] SKU
  const sortedRefs = [...fallbackCandidates].sort((a, b) => a.rating - b.rating);
  const largestRef = sortedRefs[sortedRefs.length - 1];
  const smallestRef = sortedRefs[0];

  // Choose target active unit count between 1 and maxActiveUnits (aiming for clean block size)
  let targetActiveN = 1;
  if (largestRef && demand > largestRef.rating * maxActiveUnits) {
    targetActiveN = Math.min(maxActiveUnits, Math.max(4, Math.ceil(demand / (largestRef.rating * 1.5))));
  } else if (smallestRef && demand < smallestRef.rating * 0.8) {
    targetActiveN = 1;
  } else {
    targetActiveN = Math.min(maxActiveUnits, Math.max(2, Math.ceil(demand / ((largestRef?.rating || demand) * 0.9))));
  }

  const rawUnitRating = demand / targetActiveN;
  const roundStep = rawUnitRating >= 1000 ? 100 : rawUnitRating >= 100 ? 25 : 10;
  const synthesizedRating = Math.max(roundStep, Math.ceil(rawUnitRating / roundStep) * roundStep);

  const calc = calcRedundantUnits(demand, synthesizedRating, uptimeTier);
  const totalUnits = Math.max(minUnits, calc.total);

  // Pick closest reference SKU for power-law ROM price & footprint scaling
  const nearestRef =
    sortedRefs.reduce<Candidate | null>((best, curr) => {
      if (!best) return curr;
      return Math.abs(curr.rating - synthesizedRating) < Math.abs(best.rating - synthesizedRating) ? curr : best;
    }, null) || {
      id: 'ref-generic',
      vendor: 'Market Benchmark',
      model: 'STD-REF',
      label: categoryLabel,
      rating: synthesizedRating,
      unit: demandUnit,
      priceInr: 4500000,
      footprintSqm: 20,
      miiPct: 75
    };

  const scaleRatio = synthesizedRating / Math.max(1, nearestRef.rating);
  const romUnitPriceInr = Math.round((nearestRef.priceInr * Math.pow(scaleRatio, 0.72)) / 10000) * 10000;
  const scaledFootprintSqm = Number(Math.max(2, nearestRef.footprintSqm * Math.pow(scaleRatio, 0.62)).toFixed(1));
  const builtUpName = `[PLACEHOLDER] ${categoryLabel} (${synthesizedRating} ${demandUnit})`;
  const reason =
    largestRef && demand > largestRef.rating * maxActiveUnits
      ? `Demand ${Math.round(demand)} ${demandUnit} requires >${maxActiveUnits} active units of largest OEM (${largestRef.vendor} ${largestRef.rating} ${demandUnit})`
      : `No Supply DB OEM fits ${Math.round(demand)} ${demandUnit} within ±${tolerancePct}% capacity tolerance (nearest: ${nearestRef.vendor} ${nearestRef.rating} ${demandUnit})`;

  const placeholder: PlaceholderSku = {
    id: `ph-${dealId}-${group}-${synthesizedRating}`,
    isPlaceholder: true,
    dealId,
    group,
    category: categoryLabel,
    builtUpName,
    synthesizedRating,
    capacityUnit: demandUnit,
    activeN: calc.activeN,
    redundantR: calc.redundantR,
    totalUnits,
    romUnitPriceInr,
    scaledFootprintSqm,
    nearestOemRef: `${nearestRef.vendor} ${nearestRef.model} (${nearestRef.rating} ${demandUnit})`,
    marketScoutRemark: `Market-Scout Required: ${reason}. Synthesized ROM block (${calc.activeN}+${calc.redundantR}) — issue Partner RFQ to replace.`,
    createdAt: new Date().toISOString().slice(0, 10)
  };

  return {
    group,
    demand,
    demandUnit,
    matchedSkuId: placeholder.id,
    vendor: 'TBD — Market Scout',
    model: `PH-${group.toUpperCase()}-${synthesizedRating}`,
    label: builtUpName,
    ratedCapacity: synthesizedRating,
    activeN: calc.activeN,
    redundantR: calc.redundantR,
    totalUnits,
    unitPriceInr: romUnitPriceInr,
    footprintSqm: scaledFootprintSqm,
    miiPct: nearestRef.miiPct,
    confidence: 'ROM',
    utilizationPct: Number(((demand / (calc.activeN * synthesizedRating)) * 100).toFixed(1)),
    isPlaceholder: true,
    placeholder
  };
}

export function generatePartnerRfqCsv(dealName: string, city: string, placeholders: PlaceholderSku[]): string {
  const headers = [
    'Deal Name',
    'Site Location',
    'Placeholder ID',
    'Subsystem Group',
    'Category',
    'Synthesized Equipment Spec',
    'Target Unit Rating',
    'Unit',
    'Qty Required (N+R)',
    'ROM Unit Budget (INR)',
    'Estimated Footprint (m2)',
    'Nearest OEM Reference',
    'Market-Scout Engineering Remark'
  ];
  const rows = placeholders.map(p => [
    dealName,
    city,
    p.id,
    p.group,
    p.category,
    p.builtUpName,
    String(p.synthesizedRating),
    p.capacityUnit,
    `${p.totalUnits} (${p.activeN}+${p.redundantR})`,
    String(p.romUnitPriceInr),
    String(p.scaledFootprintSqm),
    p.nearestOemRef,
    p.marketScoutRemark
  ]);
  return [headers, ...rows]
    .map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\n');
}

export function parseSupplyChainCsv(csvText: string): SupplyChainSku[] {
  const lines = csvText
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(Boolean);
  if (lines.length < 2) return [];
  const headerCols = lines[0].split(',').map(c => c.replace(/^"|"$/g, '').trim().toLowerCase());
  const idx = (name: string) => headerCols.findIndex(h => h.includes(name));

  const today = new Date().toISOString().slice(0, 10);
  const parsed: SupplyChainSku[] = [];

  for (let i = 1; i < lines.length; i++) {
    const rawCols = lines[i].match(/("([^"]|"")*"|[^,]+)/g) || [];
    const cols = rawCols.map(c => c.replace(/^"|"$/g, '').replace(/""/g, '"').trim());
    const vendor = cols[idx('vendor')] || '';
    const sku = cols[idx('sku')] || cols[idx('model')] || '';
    if (!vendor || !sku) continue;

    const baseLow = Number(cols[idx('low')] || cols[idx('price')] || 0) || 1000000;
    const baseHigh = Number(cols[idx('high')] || 0) || Math.round(baseLow * 1.1);
    const miiPct = Number(cols[idx('mii')] || 80) || 80;
    parsed.push({
      id: `SI-CSV-${Date.now()}-${i}`,
      group: cols[idx('group')] || 'trafo',
      category: cols[idx('category')] || 'Custom Imported OEM',
      vendor,
      tier: (cols[idx('tier')] || '').toLowerCase().includes('2') ? 'Tier-2' : 'Tier-1',
      family: cols[idx('family')] || sku,
      sku,
      rating: Number(cols[idx('rating')] || 1) || 1,
      unit: cols[idx('unit')] || 'kVA',
      footprintSqm: Number(cols[idx('footprint')] || 10) || 10,
      basis: cols[idx('basis')] || 'Ex-Works India',
      lead: cols[idx('lead')] || '12 Wks',
      baseLow,
      baseHigh,
      miiClass: miiPct >= 50 ? 'Class-I' : 'Class-II',
      miiPct,
      confidence: 'High',
      trustSource: 'PartnerRFQ',
      lastSeen: today
    });
  }
  return parsed;
}
