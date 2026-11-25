import React from 'react';
import type {
  ColorPalette,
  ContainerSpec,
  EngineeringResult,
  MasterStandards,
  NonItCatalogItem,
  ProjectDeal,
  RackSku,
  SupplyChainSku
} from '../types/mdc';
import type { DesignSubTab } from './AppShell';
import { QuickWhatIfDrawer } from './QuickWhatIfDrawer';
import { Stage1Inputs } from './Stage1Inputs';
import { Stage2Design } from './Stage2Design';

interface DealStudioProps {
  project: ProjectDeal;
  eng: EngineeringResult;
  skus: RackSku[];
  containerCatalog: ContainerSpec[];
  nonItCatalog: NonItCatalogItem[];
  standards: MasterStandards;
  supplyItems: SupplyChainSku[];
  palette: ColorPalette;
  stage: 1 | 2 | 3;
  designSubTab: DesignSubTab;
  whatIfOpen: boolean;
  onChangeStage: (stage: 1 | 2 | 3) => void;
  onChangeDesignSubTab: (tab: DesignSubTab) => void;
  onCloseWhatIf: () => void;
  onUpdateProject: (patch: Partial<ProjectDeal>) => void;
  onAddRackSku: (newSku: RackSku, initialQty: number) => void;
  onSaveContainerToCatalog: (spec: ContainerSpec) => void;
  onGenerateFirstDraft: () => void;
  onPromoteSkuToMaster: (newItem: NonItCatalogItem, newSupplySku: SupplyChainSku) => void;
  onUpdatePalette: (key: keyof Omit<ColorPalette, 'label'>, hex: string) => void;
  onApplyTheme: (themeKey: string) => void;
  stage3Renderer: React.ReactNode;
}

export const DealStudio: React.FC<DealStudioProps> = ({
  project,
  eng,
  skus,
  containerCatalog,
  nonItCatalog,
  standards,
  supplyItems,
  palette,
  stage,
  designSubTab,
  whatIfOpen,
  onChangeStage,
  onChangeDesignSubTab,
  onCloseWhatIf,
  onUpdateProject,
  onAddRackSku,
  onSaveContainerToCatalog,
  onGenerateFirstDraft,
  onPromoteSkuToMaster,
  onUpdatePalette,
  onApplyTheme,
  stage3Renderer
}) => {
  return (
    <div className="flex flex-col lg:flex-row gap-4 items-start">
      <div className="flex-1 min-w-0 w-full space-y-4">
        {/* Stage 1: Guided Requirements Wizard */}
        {stage === 1 && (
          <Stage1Inputs
            project={project}
            eng={eng}
            skus={skus}
            containerCatalog={containerCatalog}
            onUpdateProject={onUpdateProject}
            onAddRackSku={onAddRackSku}
            onGenerateFirstDraft={onGenerateFirstDraft}
          />
        )}

        {/* Stage 2: Dedicated Engineering & Commercial Design Modules */}
        {stage === 2 && (
          <Stage2Design
            project={project}
            eng={eng}
            standards={standards}
            containerCatalog={containerCatalog}
            supplyItems={supplyItems}
            nonItCatalog={nonItCatalog}
            palette={palette}
            activeSubTab={designSubTab}
            onChangeSubTab={onChangeDesignSubTab}
            onUpdateProject={onUpdateProject}
            onSaveContainerToCatalog={onSaveContainerToCatalog}
            onPromoteSkuToMaster={onPromoteSkuToMaster}
            onUpdatePalette={onUpdatePalette}
            onApplyTheme={onApplyTheme}
            onProceedToOutputs={() => onChangeStage(3)}
          />
        )}

        {/* Stage 3: Outputs, 7 CAD Sheets, 360° 3D Studio, PPTX & PDF */}
        {stage === 3 && stage3Renderer}
      </div>

      {/* Collapsible Quick What-If Pane */}
      <QuickWhatIfDrawer
        isOpen={whatIfOpen}
        onClose={onCloseWhatIf}
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
