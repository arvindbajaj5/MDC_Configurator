import React, { useMemo, useState } from 'react';
import { BarChart3, Sparkles } from 'lucide-react';
import { formatMoney } from '../engine/engineeringEngine';
import { exportFullProposalWorkbookXlsx } from '../engine/excelExporter';
import {
  analyzeCostPerMwDeviation,
  buildPortfolioBenchmarks,
  runAiPortfolioRootCauseDiagnosis
} from '../engine/portfolioAnalyzer';
import type {
  EngineeringResult,
  MasterStandards,
  NonItCatalogItem,
  ProjectDeal,
  RackSku,
  SupplyChainSku
} from '../types/mdc';

interface PortfolioDashboardProps {
  projects: ProjectDeal[];
  editingId: string;
  skus: RackSku[];
  nonItCatalog: NonItCatalogItem[];
  standards: MasterStandards;
  supplyItems: SupplyChainSku[];
  logoDataUrl?: string;
  onSelectDeal: (id: string, stage?: 1 | 2 | 3) => void;
}

export const PortfolioDashboard: React.FC<PortfolioDashboardProps> = ({
  projects,
  editingId,
  skus,
  nonItCatalog,
  standards,
  supplyItems,
  logoDataUrl,
  onSelectDeal
}) => {
  const benchmarks = useMemo(
    () => buildPortfolioBenchmarks(projects, skus, nonItCatalog, standards, supplyItems),
    [projects, skus, nonItCatalog, standards, supplyItems]
  );

  const [baseId, setBaseId] = useState<string>(benchmarks[0]?.project.id || '');
  const [targetId, setTargetId] = useState<string>(
    benchmarks[1]?.project.id || benchmarks[0]?.project.id || ''
  );
  const [byokKey, setByokKey] = useState('');
  const [customQuestion, setCustomQuestion] = useState('');
  const [aiNarrative, setAiNarrative] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');

  const baseRow =
    benchmarks.find(b => b.project.id === baseId) || benchmarks[0];
  const targetRow =
    benchmarks.find(b => b.project.id === targetId) || benchmarks[1] || benchmarks[0];

  const variance = useMemo(() => {
    if (!baseRow || !targetRow) return null;
    return analyzeCostPerMwDeviation(baseRow, targetRow, standards);
  }, [baseRow, targetRow, standards]);

  const handleRunAiDiagnosis = async () => {
    if (!variance || !baseRow || !targetRow) return;
    setAiLoading(true);
    setAiError('');
    try {
      const txt = await runAiPortfolioRootCauseDiagnosis(
        byokKey,
        variance,
        baseRow,
        targetRow,
        customQuestion
      );
      setAiNarrative(txt);
    } catch (err: unknown) {
      setAiError((err as Error)?.message || 'AI diagnosis failed.');
    } finally {
      setAiLoading(false);
    }
  };

  const activeBench: EngineeringResult | undefined =
    benchmarks.find(b => b.project.id === editingId)?.eng || benchmarks[0]?.eng;
  const activeProj: ProjectDeal | undefined =
    benchmarks.find(b => b.project.id === editingId)?.project || benchmarks[0]?.project;

  return (
    <div className="space-y-5 text-xs">
      {/* Top Portfolio Summary Banner */}
      <div className="bg-white rounded-2xl card-shadow border border-slate-200 p-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="px-2.5 py-0.5 rounded bg-indigo-100 text-indigo-950 font-black uppercase text-[10px]">
            Portfolio Benchmarking & AI Root-Cause Cost/MW Analyzer
          </span>
          <h2 className="text-xl font-bold navy-text mt-1 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 coral-text" />
            Cross-Project Cost/MW, Size, Date & Price-Deviation Dashboard
          </h2>
          <p className="text-slate-500">
            Compare all workspace projects side by side and diagnose whether Cost/MW differences come from component prices, weather/inlet cooling physics, redundancy/block steps, or civil/BnM scope.
          </p>
        </div>

        {activeProj && activeBench && (
          <button
            onClick={() => exportFullProposalWorkbookXlsx(activeProj, activeBench, standards, logoDataUrl)}
            className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-bold"
          >
            Export Active Deal Workbook (.XLSX)
          </button>
        )}
      </div>

      {/* Portfolio Comparison Table */}
      <div className="bg-white rounded-2xl card-shadow border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200">
          <h3 className="text-base font-bold navy-text">
            Portfolio Comparison Matrix ({benchmarks.length} Project(s))
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="navy-bg text-white text-[11px]">
                <th className="p-2.5">Project & Client</th>
                <th className="p-2.5">Date</th>
                <th className="p-2.5">City & Weather</th>
                <th className="p-2.5">Type & Tier</th>
                <th className="p-2.5 text-right">MW (IT)</th>
                <th className="p-2.5 text-right">Size (m²)</th>
                <th className="p-2.5 text-right">Pre-Tax CapEx</th>
                <th className="p-2.5 text-right">Cost / MW</th>
                <th className="p-2.5 text-center">PUE</th>
                <th className="p-2.5 text-center">Open</th>
              </tr>
            </thead>
            <tbody>
              {benchmarks.map((row, idx) => {
                const isCur = row.project.id === editingId;
                return (
                  <tr
                    key={row.project.id}
                    className={`border-b border-slate-200 ${
                      isCur ? 'bg-amber-50/70' : idx % 2 === 1 ? 'bg-slate-50/60' : 'bg-white'
                    }`}
                  >
                    <td className="p-2.5">
                      <div className="font-bold navy-text">{row.project.name}</div>
                      <div className="text-[10px] text-slate-500">{row.project.client || 'Enterprise'}</div>
                    </td>
                    <td className="p-2.5 font-mono text-slate-600">{row.project.updatedAt}</td>
                    <td className="p-2.5">
                      <div className="font-semibold text-slate-800">{row.project.cityQuery}</div>
                      <div className="text-[10px] text-slate-500">
                        {row.project.peakDryBulb}°C DB / {row.project.peakWetBulb}°C WB • Inlet {row.eng.governingMaxInletTempC}°C
                      </div>
                    </td>
                    <td className="p-2.5">
                      <div className="font-bold">
                        {row.project.shellArchitecture === 'BnM_Hall' ? 'BnM Hall' : 'Containers'}
                      </div>
                      <div className="text-[10px] text-slate-500">{row.project.uptimeTier}</div>
                    </td>
                    <td className="p-2.5 text-right font-black navy-text">{row.mwContinuous} MW</td>
                    <td className="p-2.5 text-right font-bold">{row.totalAreaSqm.toLocaleString()} m²</td>
                    <td className="p-2.5 text-right font-bold text-slate-800">
                      {formatMoney(row.preTaxCapexInr, row.project.currency, standards)}
                    </td>
                    <td className="p-2.5 text-right font-black coral-text">
                      {formatMoney(row.costPerMwInr, row.project.currency, standards)}/MW
                    </td>
                    <td className="p-2.5 text-center font-bold text-emerald-800">{row.eng.pueAnnualized}</td>
                    <td className="p-2.5 text-center">
                      <button
                        onClick={() => onSelectDeal(row.project.id, 2)}
                        className="px-2.5 py-1 rounded navy-bg text-white font-bold text-[11px]"
                      >
                        Design
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 6-Factor Cost/MW Deviation & AI Root-Cause Analyzer */}
      {variance && baseRow && targetRow && (
        <div className="bg-white rounded-2xl card-shadow border border-slate-200 p-5 space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-200 pb-3">
            <div>
              <span className="px-2.5 py-0.5 rounded bg-orange-100 text-orange-950 font-black uppercase text-[10px]">
                Root-Cause Variance Decomposition (Target minus Baseline per MW)
              </span>
              <h3 className="text-base font-bold navy-text mt-1">
                Why Does Cost/MW Differ Between Projects?
              </h3>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div>
                <label className="block text-[10px] font-bold text-slate-500">Baseline Project (A)</label>
                <select
                  value={baseRow.project.id}
                  onChange={e => setBaseId(e.target.value)}
                  className="border rounded-lg px-2.5 py-1.5 bg-white font-bold navy-text"
                >
                  {benchmarks.map(b => (
                    <option key={b.project.id} value={b.project.id}>
                      {b.project.name} ({formatMoney(b.costPerMwInr, b.project.currency, standards)}/MW)
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500">Compare Against (B)</label>
                <select
                  value={targetRow.project.id}
                  onChange={e => setTargetId(e.target.value)}
                  className="border rounded-lg px-2.5 py-1.5 bg-white font-bold coral-text"
                >
                  {benchmarks.map(b => (
                    <option key={b.project.id} value={b.project.id}>
                      {b.project.name} ({formatMoney(b.costPerMwInr, b.project.currency, standards)}/MW)
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 font-bold text-slate-900">
            {variance.headlineSummary}
          </div>

          <div className="space-y-2.5">
            {variance.items.map(it => {
              const isPos = it.deltaPerMwInr >= 0;
              return (
                <div
                  key={it.driver}
                  className="p-3 rounded-xl border border-slate-200 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                >
                  <div className="space-y-0.5 max-w-3xl">
                    <div className="font-bold navy-text">{it.driver}</div>
                    <div className="text-slate-600">{it.explanation}</div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span
                      className={`px-2.5 py-1 rounded-lg font-black text-xs ${
                        isPos ? 'bg-red-50 text-red-800 border border-red-200' : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      }`}
                    >
                      {isPos ? '+' : '-'}
                      {formatMoney(Math.abs(it.deltaPerMwInr), targetRow.project.currency, standards)}/MW
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Optional BYOK Gemini Root-Cause Deep Dive */}
          <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-200 space-y-3">
            <div className="font-bold navy-text flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 coral-text" />
              AI Root-Cause & Value-Engineering Analyst (BYOK Gemini — Session Only)
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
              <input
                type="password"
                value={byokKey}
                onChange={e => setByokKey(e.target.value)}
                placeholder="Gemini API Key (AIzaSy...)"
                className="border border-slate-300 rounded-lg px-3 py-1.5 bg-white font-mono"
              />
              <input
                type="text"
                value={customQuestion}
                onChange={e => setCustomQuestion(e.target.value)}
                placeholder="Optional question e.g. How to cut Cost/MW without dropping Tier III?"
                className="border border-slate-300 rounded-lg px-3 py-1.5 bg-white"
              />
              <button
                onClick={handleRunAiDiagnosis}
                disabled={aiLoading}
                className="px-4 py-1.5 rounded-lg navy-bg text-white font-bold"
              >
                {aiLoading ? 'Analyzing Root Causes...' : 'Run AI Root-Cause Diagnosis'}
              </button>
            </div>
            {aiError && (
              <div className="text-red-700 font-bold bg-red-50 border border-red-200 px-3 py-2 rounded-lg">
                {aiError}
              </div>
            )}
            {aiNarrative && (
              <div className="p-3.5 rounded-xl bg-white border border-blue-200 text-slate-800 whitespace-pre-line leading-relaxed">
                {aiNarrative}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
