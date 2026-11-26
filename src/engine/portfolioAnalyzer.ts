import type {
  CostPerMwDrivers,
  CostVarianceAnalysis,
  CostVarianceDriverItem,
  EngineeringResult,
  MasterStandards,
  NonItCatalogItem,
  ProjectBenchmarkRow,
  ProjectDeal,
  RackSku,
  SupplyChainSku
} from '../types/mdc';
import { computeEngineeringV13, formatMoney } from './engineeringEngine';
import { sanitizeProject } from './storageAdapter';

export function computeCostPerMwDrivers(project: ProjectDeal, eng: EngineeringResult): CostPerMwDrivers {
  const mw = Math.max(0.05, eng.totalDesignContKw / 1000);
  let enclosureCivilRaw = 0;
  let powerRedundancyRaw = 0;
  let thermalCoolingRaw = 0;
  let optionalScopeRaw = 0;

  for (const it of eng.bomItems) {
    const cat = (it.category || '').toLowerCase();
    if (cat.includes('enclosure') || cat.includes('civil') || cat.includes('non-standard')) {
      enclosureCivilRaw += it.rawCostTotal;
    } else if (cat.includes('power') || cat.includes('backup') || cat.includes('bms')) {
      powerRedundancyRaw += it.rawCostTotal;
    } else if (cat.includes('cooling') || cat.includes('hydraulics') || cat.includes('environmental') || cat.includes('consumables')) {
      thermalCoolingRaw += it.rawCostTotal;
    } else {
      optionalScopeRaw += it.rawCostTotal;
    }
  }

  const totalRaw = Math.max(1, eng.totals.rawCost);
  const preTax = eng.totals.sellingPreTax;
  const scaleToPreTax = (rawBucket: number) => (rawBucket / totalRaw) * preTax;

  const enclosureCivilPerMw = Math.round(scaleToPreTax(enclosureCivilRaw) / mw);
  const powerRedundancyPerMw = Math.round(scaleToPreTax(powerRedundancyRaw) / mw);
  const thermalCoolingPerMw = Math.round(scaleToPreTax(thermalCoolingRaw) / mw);
  const optionalScopePerMw = Math.round(scaleToPreTax(optionalScopeRaw) / mw);
  const totalPreTaxPerMw = Math.round(preTax / mw);
  const commercialOverheadPerMw = Math.max(
    0,
    totalPreTaxPerMw - (enclosureCivilPerMw + powerRedundancyPerMw + thermalCoolingPerMw + optionalScopePerMw)
  );

  return {
    enclosureCivilPerMw,
    powerRedundancyPerMw,
    thermalCoolingPerMw,
    optionalScopePerMw,
    commercialOverheadPerMw,
    totalPreTaxPerMw
  };
}

export function buildPortfolioBenchmarks(
  projects: ProjectDeal[],
  skus: RackSku[],
  nonItCatalog: NonItCatalogItem[],
  standards: MasterStandards,
  supplyItems: SupplyChainSku[]
): ProjectBenchmarkRow[] {
  return projects.map(raw => {
    const p = sanitizeProject(raw, standards);
    const eng = computeEngineeringV13(p, skus, nonItCatalog, standards, supplyItems);
    const mwContinuous = Number((eng.totalDesignContKw / 1000).toFixed(2));
    const drivers = computeCostPerMwDrivers(p, eng);
    return {
      project: p,
      eng,
      mwContinuous,
      totalAreaSqm: eng.totalCampusOccupiedSqm,
      preTaxCapexInr: eng.totals.sellingPreTax,
      grandTotalInclGstInr: eng.totals.grandTotal,
      costPerMwInr: drivers.totalPreTaxPerMw,
      tco5YrPerMwInr: Math.round(eng.fiveYearTcoInr / Math.max(0.05, mwContinuous || 0.1)),
      drivers
    };
  });
}

export function analyzeCostPerMwDeviation(
  baseRow: ProjectBenchmarkRow,
  targetRow: ProjectBenchmarkRow,
  standards: MasterStandards
): CostVarianceAnalysis {
  const cur = targetRow.project.currency || 'INR';
  const fmtDelta = (v: number) =>
    `${v >= 0 ? '+' : '-'}${formatMoney(Math.abs(v), cur, standards)}/MW`;

  const dEnclosure = targetRow.drivers.enclosureCivilPerMw - baseRow.drivers.enclosureCivilPerMw;
  const dPower = targetRow.drivers.powerRedundancyPerMw - baseRow.drivers.powerRedundancyPerMw;
  const dThermal = targetRow.drivers.thermalCoolingPerMw - baseRow.drivers.thermalCoolingPerMw;
  const dScope = targetRow.drivers.optionalScopePerMw - baseRow.drivers.optionalScopePerMw;
  const dCommercial = targetRow.drivers.commercialOverheadPerMw - baseRow.drivers.commercialOverheadPerMw;
  const totalDelta = targetRow.drivers.totalPreTaxPerMw - baseRow.drivers.totalPreTaxPerMw;
  const denom = Math.max(1, Math.abs(totalDelta));

  const pct = (v: number) => Math.round((v / denom) * 100);

  const items: CostVarianceDriverItem[] = [
    {
      driver: 'Thermal Envelope & City Climate',
      deltaPerMwInr: dThermal,
      pctOfTotalDelta: pct(dThermal),
      explanation: `${targetRow.project.cityQuery} (${targetRow.project.peakDryBulb}°C DB / ${targetRow.project.peakWetBulb}°C WB, governing inlet ${targetRow.eng.governingMaxInletTempC}°C, ${targetRow.eng.coolingMode.split('(')[0].trim()}) vs. ${baseRow.project.cityQuery} (governing inlet ${baseRow.eng.governingMaxInletTempC}°C, PUE ${baseRow.eng.pueAnnualized} vs ${targetRow.eng.pueAnnualized}).`
    },
    {
      driver: 'Power Redundancy, Sizing & Derating',
      deltaPerMwInr: dPower,
      pctOfTotalDelta: pct(dPower),
      explanation: `${targetRow.project.uptimeTier} (Trafo ${targetRow.eng.trafoCalc.activeN}+${targetRow.eng.trafoCalc.redundantR}, UPS ${targetRow.eng.upsCalc.activeN}+${targetRow.eng.upsCalc.redundantR}, DG ${targetRow.eng.dgCalc.activeN}+${targetRow.eng.dgCalc.redundantR} @ ${targetRow.eng.dgDerateFactor}× derate) vs. ${baseRow.project.uptimeTier}.`
    },
    {
      driver: 'Enclosure, Raised Floor, Civil & Scale',
      deltaPerMwInr: dEnclosure,
      pctOfTotalDelta: pct(dEnclosure),
      explanation: `${targetRow.project.shellArchitecture === 'BnM_Hall' ? `BnM Hall (${targetRow.project.bnmHallLengthM}×${targetRow.project.bnmHallWidthM}m, Fl #${targetRow.project.bnmFloorLevel})` : `${targetRow.eng.pods.length} Pods (${targetRow.eng.containerTotalVolumeCum} m³)`}, ${targetRow.eng.raisedFloor.heightMm}mm false floor, ${targetRow.eng.civil.foundationType.split('(')[0].trim()}, scale ${targetRow.mwContinuous} MW vs ${baseRow.mwContinuous} MW.`
    },
    {
      driver: 'Optional Scope (Telecom / Logistics / AMC)',
      deltaPerMwInr: dScope,
      pctOfTotalDelta: pct(dScope),
      explanation: `Telecom MMR: ${targetRow.project.includeTelecomMmr ? 'Yes' : 'No'}, Rental Logistics: ${targetRow.project.includeLogisticsRigging ? 'Yes' : 'No'}, AMC: ${targetRow.project.includeAmcContract ? `${targetRow.project.amcYears}y @ ${targetRow.project.amcPctOfCapex}%` : 'No'}.`
    },
    {
      driver: 'Commercial Margin, Contingency & Quotes',
      deltaPerMwInr: dCommercial,
      pctOfTotalDelta: pct(dCommercial),
      explanation: `Margin ${targetRow.project.marginPct}% vs ${baseRow.project.marginPct}%, Contingency ${targetRow.project.contingencyPct}% vs ${baseRow.project.contingencyPct}%, Special Quotes: ${targetRow.eng.bomItems.filter(b => b.isOverridden).length}.`
    }
  ];

  const sorted = [...items].sort((a, b) => Math.abs(b.deltaPerMwInr) - Math.abs(a.deltaPerMwInr));
  const topTwo = sorted
    .slice(0, 2)
    .map(s => `${s.driver} (${fmtDelta(s.deltaPerMwInr)})`)
    .join(' and ');

  const headlineSummary = `${targetRow.project.name} vs. ${baseRow.project.name}: net Cost/MW is ${fmtDelta(totalDelta)} (${formatMoney(targetRow.drivers.totalPreTaxPerMw, cur, standards)}/MW vs ${formatMoney(baseRow.drivers.totalPreTaxPerMw, cur, standards)}/MW), primarily driven by ${topTwo || 'balanced specs'}.`;

  return {
    baseProjectName: baseRow.project.name,
    targetProjectName: targetRow.project.name,
    baseCostPerMwInr: baseRow.drivers.totalPreTaxPerMw,
    targetCostPerMwInr: targetRow.drivers.totalPreTaxPerMw,
    deltaPerMwInr: totalDelta,
    items,
    headlineSummary
  };
}

export async function runAiPortfolioRootCauseDiagnosis(
  apiKey: string,
  analysis: CostVarianceAnalysis,
  baseRow: ProjectBenchmarkRow,
  targetRow: ProjectBenchmarkRow,
  customQuestion?: string
): Promise<string> {
  const trimmed = apiKey.trim();
  if (!trimmed) {
    throw new Error('Enter a session-only BYOK Gemini API key to run AI root-cause diagnosis.');
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(trimmed)}`;
  const prompt = `You are a Principal Data Center & Sovereign AI Infrastructure Advisor. Analyze why two projects have different Cost/MW and explain the engineering physics, weather/site factors, redundancy/block thresholds, and commercial tradeoffs clearly and concisely.

Comparison Headline: ${analysis.headlineSummary}

Project A (Baseline): ${baseRow.project.name} | ${baseRow.mwContinuous} MW | ${baseRow.project.cityQuery} (${baseRow.project.peakDryBulb}°C DB / ${baseRow.project.peakWetBulb}°C WB) | ${baseRow.project.uptimeTier} | Governing Inlet ${baseRow.eng.governingMaxInletTempC}°C | PUE ${baseRow.eng.pueAnnualized} | Pre-Tax Cost/MW: ₹${baseRow.costPerMwInr.toLocaleString('en-IN')}

Project B (Target): ${targetRow.project.name} | ${targetRow.mwContinuous} MW | ${targetRow.project.cityQuery} (${targetRow.project.peakDryBulb}°C DB / ${targetRow.project.peakWetBulb}°C WB) | ${targetRow.project.uptimeTier} | Governing Inlet ${targetRow.eng.governingMaxInletTempC}°C | PUE ${targetRow.eng.pueAnnualized} | Pre-Tax Cost/MW: ₹${targetRow.costPerMwInr.toLocaleString('en-IN')}

Driver Breakdown (Project B minus Project A per MW):
${analysis.items.map(i => `- ${i.driver}: ₹${i.deltaPerMwInr.toLocaleString('en-IN')}/MW (${i.pctOfTotalDelta}% of delta) — ${i.explanation}`).join('\n')}

${customQuestion ? `Specific Question from Executive: ${customQuestion}` : 'Provide: (1) Top root causes beyond raw component price (thermal/weather, rack inlet temperature ceiling, redundancy/block steps, civil/BnM, scale), (2) Tradeoffs accepted, and (3) 2 concrete value-engineering actions.'}`;

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.25 }
    })
  });
  if (!res.ok) {
    throw new Error(`Gemini API HTTP ${res.status}. Check your BYOK API key or quota.`);
  }
  const data = await res.json();
  return (
    data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text || '').join('').trim() ||
    analysis.headlineSummary
  );
}
