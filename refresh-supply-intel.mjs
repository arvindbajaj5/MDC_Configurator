#!/usr/bin/env node
/**
 * Monthly India OEM Supply Chain Intelligence Refresh (V13.1)
 * - Uses Gemini 2.5 Flash with Google Search grounding when GEMINI_API_KEY is present.
 * - Executes 2-stage deduplication:
 *     Stage 1: Exact normalized vendor + model/SKU key match.
 *     Stage 2: Fuzzy canonical vendor + equipment group + ±5% capacity rating match.
 * - Enforces Trust-Hierarchy Merge:
 *     DealVerifiedQuote (5) > PartnerRFQ (4) > ManualMaster (3) > GeminiSearchRefresh (2) > SeedCatalog (1)
 */
import fs from 'node:fs';
import path from 'node:path';

const TARGET_FILE = path.resolve(process.cwd(), 'public/mdc_supply_intel.json');
const TRUST_RANK = {
  DealVerifiedQuote: 5,
  PartnerRFQ: 4,
  ManualMaster: 3,
  GeminiSearchRefresh: 2,
  SeedCatalog: 1
};

const VENDOR_ALIASES = {
  'abb': 'abb india',
  'abb india ltd': 'abb india',
  'siemens': 'siemens energy india',
  'siemens india': 'siemens energy india',
  'schneider': 'schneider electric india',
  'schneider electric': 'schneider electric india',
  'vertiv': 'vertiv energy india',
  'cummins': 'cummins india',
  'koel': 'kirloskar oil engines (koel)',
  'kirloskar': 'kirloskar oil engines (koel)',
  'eaton': 'eaton power quality',
  'l&t': 'l&t electrical & automation (lauritz knudsen)',
  'voltamp': 'voltamp transformers',
  'trane': 'trane technologies india',
  'stulz': 'stulz chvac india'
};

function normalizeVendor(v = '') {
  const clean = v.toLowerCase().replace(/[^a-z0-9& ]+/g, ' ').replace(/\s+/g, ' ').trim();
  return VENDOR_ALIASES[clean] || clean;
}

function normalizeSku(s = '') {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function trustScore(src = 'SeedCatalog') {
  return TRUST_RANK[src] ?? 1;
}

export function mergeWithDedupAndTrust(existingItems, incomingItems) {
  const result = existingItems.map(item => ({ ...item }));

  for (const inc of incomingItems) {
    const incVendor = normalizeVendor(inc.vendor);
    const incSkuKey = normalizeSku(inc.sku || inc.model);
    const incGroup = (inc.group || '').toLowerCase();
    const incRating = Number(inc.rating) || 0;

    // Stage 1: Exact normalized vendor + SKU match
    let matchIdx = result.findIndex(ex =>
      normalizeVendor(ex.vendor) === incVendor &&
      normalizeSku(ex.sku || ex.model) === incSkuKey
    );

    // Stage 2: Same canonical vendor + equipment group + within ±5% rating
    if (matchIdx === -1 && incGroup && incRating > 0) {
      matchIdx = result.findIndex(ex => {
        if (normalizeVendor(ex.vendor) !== incVendor) return false;
        if ((ex.group || '').toLowerCase() !== incGroup) return false;
        const exRating = Number(ex.rating) || 0;
        if (exRating <= 0) return false;
        return Math.abs(exRating - incRating) / exRating <= 0.05;
      });
    }

    if (matchIdx === -1) {
      result.push({ ...inc });
      continue;
    }

    const existing = result[matchIdx];
    const exTrust = trustScore(existing.trustSource);
    const inTrust = trustScore(inc.trustSource);

    if (inTrust >= exTrust) {
      result[matchIdx] = {
        ...existing,
        ...inc,
        id: existing.id,
        lastSeen: inc.lastSeen || new Date().toISOString().slice(0, 10)
      };
    } else {
      // Lower-trust refresh never overwrites a verified deal/partner quote price,
      // but may update freshness metadata and lead-time advisory if absent.
      result[matchIdx] = {
        ...existing,
        lead: existing.lead || inc.lead,
        marketRefreshNote: `Checked ${inc.lastSeen || new Date().toISOString().slice(0, 10)}; preserved higher-trust ${existing.trustSource} rate`
      };
    }
  }
  return result;
}

async function fetchGeminiGroundedBatch(apiKey, focusCategory) {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
  const prompt = `Search current 2026 India data center OEM market pricing (INR, Ex-Works/Landed India) and Make-in-India (MII) local content for category: ${focusCategory}.
Return STRICT JSON array of up to 4 objects with keys:
vendor, tier ("Tier-1" or "Tier-2"), group, category, family, sku, rating (number), unit, footprintSqm (number), basis, lead, baseLow (INR number), baseHigh (INR number), miiClass ("Class-I" or "Class-II"), miiPct (number), confidence ("High" or "Medium").`;

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      tools: [{ google_search: {} }],
      generationConfig: { temperature: 0.2 }
    })
  });
  if (!res.ok) throw new Error(`Gemini API HTTP ${res.status}`);
  const data = await res.json();
  const rawText = data?.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('') || '';
  const match = rawText.match(/\[[\s\S]*\]/);
  if (!match) return [];
  const parsed = JSON.parse(match[0]);
  const today = new Date().toISOString().slice(0, 10);
  return parsed.map((row, idx) => ({
    id: `SI-GSR-${Date.now()}-${idx}`,
    ...row,
    trustSource: 'GeminiSearchRefresh',
    lastSeen: today
  }));
}

async function main() {
  const existingPayload = fs.existsSync(TARGET_FILE)
    ? JSON.parse(fs.readFileSync(TARGET_FILE, 'utf8'))
    : { schemaVersion: 'MDC_SUPPLY_INTEL_V13', lastRefreshed: new Date().toISOString().slice(0, 10), items: [] };

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.log('GEMINI_API_KEY not set; performing offline freshness validation & deduplication only.');
    const deduped = mergeWithDedupAndTrust([], existingPayload.items || []);
    existingPayload.items = deduped;
    fs.mkdirSync(path.dirname(TARGET_FILE), { recursive: true });
    fs.writeFileSync(TARGET_FILE, JSON.stringify(existingPayload, null, 2));
    console.log(`Validated ${deduped.length} SKUs in ${TARGET_FILE}.`);
    return;
  }

  const categories = [
    'Transformers (K-Factor)',
    'Modular UPS & BESS',
    'CPCB IV+ Diesel Generators',
    'Liquid CDUs (White-Space)',
    'Adiabatic Coolers & Chillers'
  ];
  let incoming = [];
  for (const cat of categories) {
    try {
      const batch = await fetchGeminiGroundedBatch(apiKey, cat);
      incoming = incoming.concat(batch);
    } catch (err) {
      console.warn(`Skipping ${cat}: ${err.message}`);
    }
  }

  const merged = mergeWithDedupAndTrust(existingPayload.items || [], incoming);
  const nextPayload = {
    schemaVersion: 'MDC_SUPPLY_INTEL_V13',
    lastRefreshed: new Date().toISOString().slice(0, 10),
    refreshSource: 'GitHub Actions Gemini Search-Grounded Pipeline',
    items: merged
  };
  fs.mkdirSync(path.dirname(TARGET_FILE), { recursive: true });
  fs.writeFileSync(TARGET_FILE, JSON.stringify(nextPayload, null, 2));
  console.log(`Merged ${incoming.length} incoming items -> ${merged.length} total deduplicated SKUs.`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(err => {
    console.error(err);
    process.exit(1);
  });
}
