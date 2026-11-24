import type { SupplyChainSku } from '../types/mdc';

export interface ExtractedVendorQuoteResult {
  items: SupplyChainSku[];
  rawSummary: string;
}

/**
 * Optional client-side BYOK Gemini Quote / Datasheet Extractor.
 * API key stays strictly in browser session memory and is never persisted to deal JSONs.
 */
export async function extractQuotesWithByokGemini(
  apiKey: string,
  rawQuoteOrDatasheetText: string
): Promise<ExtractedVendorQuoteResult> {
  const trimmedKey = apiKey.trim();
  if (!trimmedKey) throw new Error('Enter a valid Gemini API key (BYOK) first.');
  if (!rawQuoteOrDatasheetText.trim()) throw new Error('Paste vendor quote text, email table, or datasheet specs.');

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(trimmedKey)}`;
  const prompt = `Extract all data center infrastructure equipment line items from the following vendor quote / datasheet text.
Return STRICT JSON with keys:
{
  "rawSummary": "1-sentence summary of the vendor quote",
  "items": [
    {
      "vendor": "OEM vendor name",
      "tier": "Tier-1" or "Tier-2",
      "group": one of ["trafo","htvcb","lvacb","busway","apfc","mcc","ups","bess","dg","grid_shield","cdu","cooler","chiller","pac","pump","tank","zld","fire","scrubber","telecom_mmr","bnm_shell","logistics_crane"],
      "category": "Readable category name",
      "family": "Product family",
      "sku": "Model / SKU code",
      "rating": numeric rating (e.g. 2000),
      "unit": "kVA" | "kW" | "LPM" | "kL" | "kWh" | "pod",
      "footprintSqm": numeric footprint in m2,
      "basis": "Ex-Works / Landed India",
      "lead": "e.g. 12 Wks",
      "baseLow": numeric INR price,
      "baseHigh": numeric INR price,
      "miiPct": numeric 0-100,
      "confidence": "Verified" | "High" | "Medium"
    }
  ]
}

TEXT TO EXTRACT:
${rawQuoteOrDatasheetText.slice(0, 14000)}`;

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.1 }
    })
  });

  if (!res.ok) {
    throw new Error(`Gemini API returned HTTP ${res.status}. Verify your BYOK key and quota.`);
  }
  const data = await res.json();
  const text: string = data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text || '').join('') || '';
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('Gemini did not return structured JSON. Try pasting cleaner line-item text.');

  const parsed = JSON.parse(match[0]);
  const today = new Date().toISOString().slice(0, 10);
  const items: SupplyChainSku[] = (Array.isArray(parsed.items) ? parsed.items : []).map(
    (it: Partial<SupplyChainSku>, idx: number) => {
      const low = Number(it.baseLow) || 1000000;
      const high = Number(it.baseHigh) || Math.round(low * 1.05);
      const miiPct = Number(it.miiPct) || 80;
      return {
        id: `SI-BYOK-${Date.now()}-${idx}`,
        group: it.group || 'trafo',
        category: it.category || 'Vendor Quote Extract',
        vendor: it.vendor || 'Unknown Vendor',
        tier: it.tier === 'Tier-2' ? 'Tier-2' : 'Tier-1',
        family: it.family || it.sku || 'Quoted Equipment',
        sku: it.sku || `QUOTE-${idx + 1}`,
        rating: Number(it.rating) || 1,
        unit: it.unit || 'kVA',
        footprintSqm: Number(it.footprintSqm) || 12,
        basis: it.basis || 'Quoted India',
        lead: it.lead || '12 Wks',
        baseLow: low,
        baseHigh: high,
        miiClass: miiPct >= 50 ? 'Class-I' : 'Class-II',
        miiPct,
        confidence: 'Verified',
        trustSource: 'PartnerRFQ',
        lastSeen: today
      };
    }
  );

  return {
    items,
    rawSummary: parsed.rawSummary || `Extracted ${items.length} vendor SKU(s).`
  };
}
