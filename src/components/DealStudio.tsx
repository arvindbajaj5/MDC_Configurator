import React, { useState } from 'react';
import { formatMoney } from '../engine/engineeringEngine';
import type {
  ColorPalette,
  EngineeringResult,
  MasterStandards,
  NonItCatalogItem,
  ProjectDeal,
  RackSku,
  SupplyChainSku
} from '../types/mdc';
import { QuickWhatIfDrawer } from './QuickWhatIfDrawer';
import { Stage1Inputs } from './Stage1Inputs';
import { Stage2Design } from './Stage2Design';

interface DealStudioProps {
  project: ProjectDeal;
  eng: EngineeringResult;
  skus: RackSku[];
  nonItCatalog: NonItCatalogItem[];
  standards: MasterStandards;
  supplyItems: SupplyChainSku[];
  palette: ColorPalette;
  stage: 1 | 2 | 3;
  onChangeStage: (stage: 1 | 2 | 3) => void;
  onUpdateProject: (patch: Partial<ProjectDeal>) => void;
  onGenerateFirstDraft: () => void;
  onPromoteSkuToMaster: (newItem: NonItCatalogItem, newSupplySku: SupplyChainSku) => void;
  onUpdatePalette: (key: keyof Omit<ColorPalette, 'label'>, hex: string) => void;
  onApplyTheme: (themeKey: string) => void;
  stage3Renderer?: React.ReactNode;
}

export const DealStudio: React.FC<DealStudioProps> = ({
  project,
  eng,
  skus,
  nonItCatalog,
  standards,
  supplyItems,
  palette,
  stage,
  onChangeStage,
  onUpdateProject,
  onGenerateFirstDraft,
  onPromoteSkuToMaster,
  onUpdatePalette,
  onApplyTheme,
  stage3Renderer
}) => {
  const [whatIfOpen, setWhatIfOpen] = useState(false);

  return (
    <div className="flex flex-col lg:flex-row gap-4 items-start">
      <div className="flex-1 min-w-0 w-full space-y-4">
        {/* Clean 3-Stage Stepper Bar + Collapsible Quick What-If Toggle ONLY */}
        <div className="bg-white rounded-2xl card-shadow border border-slate-200 p-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {(
              [
                { num: 1 as const, label: 'Stage 1: INPUTS', sub: 'Mandate, City, Racks & Plot' },
                { num: 2 as const, label: 'Stage 2: DESIGN', sub: 'Synthesis, Overrides & Soft Gate' },
                { num: 3 as const, label: 'Stage 3: OUTPUTS', sub: 'Summary, 7 CAD, 3D, PPTX & PDF' }
              ] as const
            ).map(st => {
              const active = stage === st.num;
              return (
                <button
                  key={st.num}
                  onClick={() => onChangeStage(st.num)}
                  className={`px-3.5 py-2 rounded-xl text-left transition border ${
                    active
                      ? 'navy-bg text-white border-[#002870] shadow'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-200'
                  }`}
                >
                  <div className="text-xs font-black">{st.label}</div>
                  <div className={`text-[10px] ${active ? 'text-amber-300' : 'text-slate-500'}`}>
                    {st.sub}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2 text-xs">
            <div className="hidden xl:block text-right pr-2 border-r border-slate-200">
              <div className="font-black navy-text">
                {(eng.totalDesignContKw / 1000).toFixed(2)} MW •{' '}
                {formatMoney(eng.totals.sellingPreTax, project.currency, standards)}
              </div>
              <div className="text-[10px] text-slate-500">
                PUE {eng.pueAnnualized} • {eng.pods.length}{' '}
                {project.shellArchitecture === 'BnM_Hall' ? 'BnM Bays' : 'Pods'}
              </div>
            </div>

            <button
              onClick={() => setWhatIfOpen(!whatIfOpen)}
              className={`px-3.5 py-2 rounded-xl font-black border transition ${
                whatIfOpen
                  ? 'coral-bg text-white border-[#FF5539]'
                  : 'bg-amber-50 hover:bg-amber-100 text-amber-950 border-amber-300'
              }`}
            >
              ⚡ {whatIfOpen ? 'Close Quick What-If' : 'Quick What-If'}
            </button>
          </div>
        </div>

        {/* Stage 1: INPUTS */}
        {stage === 1 && (
          <Stage1Inputs
            project={project}
            eng={eng}
            skus={skus}
            onUpdateProject={onUpdateProject}
            onGenerateFirstDraft={onGenerateFirstDraft}
          />
        )}

        {/* Stage 2: DESIGN */}
        {stage === 2 && (
          <Stage2Design
            project={project}
            eng={eng}
            standards={standards}
            supplyItems={supplyItems}
            nonItCatalog={nonItCatalog}
            palette={palette}
            onUpdateProject={onUpdateProject}
            onPromoteSkuToMaster={onPromoteSkuToMaster}
            onUpdatePalette={onUpdatePalette}
            onApplyTheme={onApplyTheme}
            onProceedToOutputs={() => onChangeStage(3)}
          />
        )}

        {/* Stage 3: OUTPUTS (Plugged in by Batch 3 Stage3Outputs component) */}
        {stage === 3 &&
          (stage3Renderer || (
            <div className="bg-white rounded-2xl card-shadow border border-slate-200 p-6 space-y-3 text-xs">
              <span className="px-2.5 py-0.5 rounded bg-teal-100 text-teal-950 font-black uppercase text-[10px]">
                Stage 03 • Deliverables & Exports Ready
              </span>
              <h3 className="text-lg font-bold navy-text">
                Stage 3 Outputs Module Ready for Batch 3 Deliverables
              </h3>
              <p className="text-slate-600">
                All engineering calculations, 15-point summary data, 12-month ASHRAE profiles, 7 CAD sheet parameters, and BOQ totals for{' '}
                <strong>{project.name}</strong> ({formatMoney(eng.totals.sellingPreTax, project.currency, standards)}) are computed and ready for Batch 3 rendering.
              </p>
            </div>
          ))}
      </div>

      {/* Collapsible Quick What-If Pane ONLY */}
      <QuickWhatIfDrawer
        isOpen={whatIfOpen}
        onClose={() => setWhatIfOpen(false)}
        project={project}
        eng={eng}
        skus={skus}
        nonItCatalog={nonItCatalog}
        standards={standards}
        supplyItems={supplyItems}
        onUpdateProject={onUpdateProject}
      />
    </div>
  );
};
