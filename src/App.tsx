import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  ChevronLeft,
  ChevronRight,
  Cloud,
  Cpu,
  Download,
  FileSpreadsheet,
  FileText,
  HardHat,
  PanelRight,
  Presentation,
  Sliders,
  Upload,
  Zap
} from 'lucide-react';
import { DriveSyncModal } from './components/drive/DriveSyncModal';
import { SplitPreviewPane } from './components/layout/SplitPreviewPane';
import { useToast } from './components/layout/ToastProvider';
import { CadStudioModule } from './components/modules/CadStudioModule';
import { CivilPlinthModule } from './components/modules/CivilPlinthModule';
import { CommercialBoqModule } from './components/modules/CommercialBoqModule';
import { GovernanceAuditModule } from './components/modules/GovernanceAuditModule';
import { LogisticsRiggingModule } from './components/modules/LogisticsRiggingModule';
import { MepYardModule } from './components/modules/MepYardModule';
import { RequirementsWizard } from './components/modules/RequirementsWizard';
import { Studio3DModule } from './components/modules/Studio3DModule';
import { SupplyChainCrudModule } from './components/modules/SupplyChainCrudModule';
import { TelecomMmrModule } from './components/modules/TelecomMmrModule';
import { WhiteSpaceBranding } from './components/modules/WhiteSpaceBranding';
import { computeSiteEngineering } from './engines';
import { exportEngineeringDossierPdf } from './services/pdfExporter';
import { exportExecutivePptx } from './services/pptxExporter';
import {
  importJsonFileInput,
  loadWorkspaceState,
  mergeImportedJsonPayload,
  saveWorkspaceState,
  triggerJsonDownload
} from './services/storageAdapter';
import type { DealConfig, WorkspaceState } from './types/schema';

type PhaseId = 'configure' | 'site_3d' | 'engineering_cad' | 'commercials_lib';

type ModuleId =
  | 'wizard'
  | 'whitespace_branding'
  | 'studio_3d'
  | 'civil_plinth'
  | 'telecom_mmr'
  | 'logistics_rigging'
  | 'cad_sheets'
  | 'mep_yard'
  | 'governance_audits'
  | 'commercial_boq'
  | 'supply_crud';

const PHASES: Array<{
  id: PhaseId;
  label: string;
  short: string;
  icon: React.ComponentType<{ className?: string }>;
  modules: Array<{ id: ModuleId; label: string }>;
}> = [
  {
    id: 'configure',
    label: '1. Configure',
    short: 'Config',
    icon: Sliders,
    modules: [
      { id: 'wizard', label: '7-Step Requirements Wizard' },
      { id: 'whitespace_branding', label: 'White-Space & Branding' }
    ]
  },
  {
    id: 'site_3d',
    label: '2. Site & 3D',
    short: 'Site/3D',
    icon: HardHat,
    modules: [
      { id: 'studio_3d', label: '360° Multi-Level 3D Studio' },
      { id: 'civil_plinth', label: 'Civil, Plinth & BnM' },
      { id: 'telecom_mmr', label: 'Telecom & Carrier MMR' },
      { id: 'logistics_rigging', label: 'Logistics & Heavy-Lift' }
    ]
  },
  {
    id: 'engineering_cad',
    label: '3. Engineering & CAD',
    short: 'Eng/CAD',
    icon: Zap,
    modules: [
      { id: 'cad_sheets', label: '7-Sheet CAD Studio' },
      { id: 'mep_yard', label: 'Yard & Indoor MEP' },
      { id: 'governance_audits', label: 'Exec Summary, L1-L5 & Audits' }
    ]
  },
  {
    id: 'commercials_lib',
    label: '4. Commercials & Library',
    short: 'BOQ/MII',
    icon: FileSpreadsheet,
    modules: [
      { id: 'commercial_boq', label: 'Commercial BOQ & 5-Yr TCO' },
      { id: 'supply_crud', label: 'Supply Chain (MII %) & CRUD' }
    ]
  }
];

export const App: React.FC = () => {
  const { pushToast } = useToast();
  const [workspace, setWorkspace] = useState<WorkspaceState>(() => loadWorkspaceState());
  const [phase, setPhase] = useState<PhaseId>('configure');
  const [activeModule, setActiveModule] = useState<ModuleId>('wizard');
  const [railCollapsed, setRailCollapsed] = useState(false);
  const [splitOpen, setSplitOpen] = useState(true);
  const [mobilePreviewOpen, setMobilePreviewOpen] = useState(false);
  const [driveOpen, setDriveOpen] = useState(false);
  const [exporting, setExporting] = useState<'pptx' | 'pdf' | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    saveWorkspaceState(workspace);
  }, [workspace]);

  useEffect(() => {
    if (workspace.lastMigratedFrom && workspace.lastMigratedFrom.length > 0) {
      pushToast(
        'info',
        'V12 Legacy Storage Auto-Merged',
        `Recovered state from: ${workspace.lastMigratedFrom.join(', ')}`
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeDeal: DealConfig = useMemo(() => {
    return workspace.deals.find((d) => d.id === workspace.activeDealId) ?? workspace.deals[0];
  }, [workspace]);

  const engineering = useMemo(
    () => computeSiteEngineering(activeDeal, workspace.supplyIntel),
    [activeDeal, workspace.supplyIntel]
  );

  const currentPhaseObj = PHASES.find((p) => p.id === phase) ?? PHASES[0];

  const selectPhase = (nextPhase: PhaseId) => {
    setPhase(nextPhase);
    const target = PHASES.find((p) => p.id === nextPhase);
    if (target && !target.modules.some((m) => m.id === activeModule)) {
      setActiveModule(target.modules[0].id);
    }
  };

  const patchDeal = (updater: (d: DealConfig) => DealConfig) => {
    setWorkspace((prev) => ({
      ...prev,
      deals: prev.deals.map((d) =>
        d.id === activeDeal.id ? { ...updater(d), updatedAt: new Date().toISOString() } : d
      )
    }));
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { nextState, summary } = await importJsonFileInput(file, workspace, fileInputRef.current);
      setWorkspace(nextState);
      pushToast(
        'success',
        `Imported ${file.name} (${summary.detectedKind})`,
        `Deals: ${summary.dealsImported} | Catalog: ${summary.catalogItemsImported} | Supply SKUs: ${summary.supplySkusImported}`
      );
    } catch (err) {
      pushToast('error', 'JSON Import Failed', err instanceof Error ? err.message : String(err));
    }
  };

  const handleExportPptx = async () => {
    setExporting('pptx');
    try {
      const fname = await exportExecutivePptx(activeDeal, engineering);
      pushToast('success', `Exported PPTX Deck`, `${fname} (Pure White Canvas, 3.1" Blank Footer Enforced)`);
    } catch (err) {
      pushToast('error', 'PPTX Export Failed', err instanceof Error ? err.message : String(err));
    } finally {
      setExporting(null);
    }
  };

  const handleExportPdf = async () => {
    setExporting('pdf');
    try {
      const fname = await exportEngineeringDossierPdf(activeDeal, engineering);
      pushToast('success', `Exported Engineering Dossier PDF`, fname);
    } catch (err) {
      pushToast('error', 'PDF Export Failed', err instanceof Error ? err.message : String(err));
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-slate-100 text-slate-900 overflow-hidden">
      {/* Minimal Sharp Top Bar */}
      <header className="h-11 bg-brand-navy text-white border-b border-slate-800 px-2.5 sm:px-3 flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          {activeDeal.branding.logoUrl ? (
            <div className="h-7 bg-white rounded-cad px-1.5 flex items-center shrink-0">
              <img
                src={activeDeal.branding.logoUrl}
                alt={activeDeal.branding.clientName || 'Logo'}
                className="h-5 max-w-[96px] object-contain"
              />
            </div>
          ) : (
            <div className="w-6 h-6 rounded-cad bg-brand-orange flex items-center justify-center shrink-0">
              <Cpu className="w-3.5 h-3.5 text-white" />
            </div>
          )}
          <span className="font-bold text-xs sm:text-sm tracking-tight truncate">
            MDC Studio <span className="text-brand-orange font-mono">V13</span>
          </span>
          <span className="hidden lg:inline-block text-[11px] text-slate-300 border-l border-white/20 pl-2 truncate max-w-[260px]">
            {activeDeal.name}
          </span>
        </div>

        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleImportFile}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-2 py-1 text-[11px] font-semibold bg-white/10 hover:bg-white/20 rounded-cad flex items-center gap-1"
            title="Import V11/V12/V13 Deal, Catalog or Supply Intel JSON"
          >
            <Upload className="w-3 h-3" />
            <span className="hidden xl:inline">Import</span>
          </button>
          <button
            type="button"
            onClick={() => {
              triggerJsonDownload(`${activeDeal.id}.json`, activeDeal);
              pushToast('success', 'Exported Deal JSON', `${activeDeal.id}.json`);
            }}
            className="px-2 py-1 text-[11px] font-semibold bg-white/10 hover:bg-white/20 rounded-cad flex items-center gap-1"
            title="Export Active Deal JSON"
          >
            <Download className="w-3 h-3" />
            <span className="hidden xl:inline">JSON</span>
          </button>
          <button
            type="button"
            disabled={exporting !== null}
            onClick={handleExportPptx}
            className="px-2 py-1 text-[11px] font-semibold bg-white/10 hover:bg-white/20 rounded-cad flex items-center gap-1 disabled:opacity-50"
            title="Export Corporate House-Style PPTX Deck"
          >
            <Presentation className="w-3 h-3 text-brand-amber" />
            <span className="hidden sm:inline">{exporting === 'pptx' ? 'PPTX...' : 'PPTX'}</span>
          </button>
          <button
            type="button"
            disabled={exporting !== null}
            onClick={handleExportPdf}
            className="px-2 py-1 text-[11px] font-semibold bg-white/10 hover:bg-white/20 rounded-cad flex items-center gap-1 disabled:opacity-50"
            title="Export Engineering Dossier PDF"
          >
            <FileText className="w-3 h-3 text-sky-300" />
            <span className="hidden sm:inline">{exporting === 'pdf' ? 'PDF...' : 'PDF'}</span>
          </button>
          <button
            type="button"
            onClick={() => setDriveOpen(true)}
            className="px-2.5 py-1 text-[11px] font-semibold bg-brand-orange hover:bg-brand-orange/90 rounded-cad flex items-center gap-1"
          >
            <Cloud className="w-3 h-3" />
            <span>Drive</span>
          </button>
          <button
            type="button"
            onClick={() => setSplitOpen((s) => !s)}
            className={`hidden xl:flex p-1.5 rounded-cad border ${
              splitOpen ? 'bg-white/20 border-white/30' : 'bg-white/5 border-white/10 hover:bg-white/15'
            }`}
            title="Toggle Live Split Preview"
          >
            <PanelRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* Persistent Live Telemetry Ribbon */}
      <div className="bg-white border-b border-slate-200 px-3 py-1.5 flex items-center gap-3 overflow-x-auto text-[11px] shrink-0">
        <div className="flex items-center gap-1.5 shrink-0">
          <Activity className="w-3.5 h-3.5 text-brand-orange" />
          <span className="text-slate-500">IT:</span>
          <strong className="font-mono text-brand-navy">{engineering.mep.itLoadMw.toFixed(1)} MW</strong>
        </div>
        <div className="h-3.5 w-px bg-slate-200 shrink-0" />
        <div className="shrink-0">
          <span className="text-slate-500">PUE:</span>{' '}
          <strong className="font-mono text-brand-emerald">{engineering.mep.estimatedPue.toFixed(2)}</strong>
        </div>
        <div className="h-3.5 w-px bg-slate-200 shrink-0" />
        <div className="shrink-0">
          <span className="text-slate-500">Plot:</span>{' '}
          <strong className="font-mono">{engineering.mep.totalSiteAreaM2.toLocaleString()} m²</strong>
        </div>
        <div className="h-3.5 w-px bg-slate-200 shrink-0" />
        <div className="shrink-0">
          <span className="text-slate-500">MII:</span>{' '}
          <strong className="font-mono text-brand-cobalt">{engineering.commercial.weightedBoqMiiPercent}%</strong>
        </div>
        <div className="h-3.5 w-px bg-slate-200 shrink-0" />
        <div className="shrink-0">
          <span className="text-slate-500">CapEx:</span>{' '}
          <strong className="font-mono text-brand-navy">₹{engineering.commercial.totalCapexInrCr} Cr</strong>
        </div>
        <div className="h-3.5 w-px bg-slate-200 shrink-0" />
        <div className="shrink-0">
          <span className="text-slate-500">Civil:</span>{' '}
          <strong className={`font-mono ${engineering.civil.requiresPiling ? 'text-brand-orange' : 'text-brand-emerald'}`}>
            {engineering.civil.requiresPiling ? '4.5m Pile Cap' : `${engineering.civil.embedmentDepthM}m Plinth`} (FoS {engineering.civil.bearingFoS}x)
          </strong>
        </div>
      </div>

      {/* Body: Left Rail + Main Workspace + Optional Split Preview Pane */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Desktop & Unfolded Pixel Fold Collapsible Left Navigation Rail */}
        <aside
          className={`hidden md:flex flex-col bg-white border-r border-slate-200 transition-all shrink-0 ${
            railCollapsed ? 'w-14' : 'w-52'
          }`}
        >
          <div className="p-2 flex-1 space-y-1">
            {PHASES.map((p) => {
              const Icon = p.icon;
              const active = phase === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => selectPhase(p.id)}
                  className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-cad text-xs font-semibold transition-colors ${
                    active ? 'bg-brand-navy text-white' : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-brand-orange' : 'text-slate-500'}`} />
                  {!railCollapsed && <span className="truncate">{p.label}</span>}
                </button>
              );
            })}
          </div>
          <div className="p-2 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setRailCollapsed((c) => !c)}
              className="w-full flex items-center justify-center gap-1 py-1.5 text-[11px] text-slate-600 hover:bg-slate-100 rounded-cad"
            >
              {railCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
              {!railCollapsed && <span>Collapse</span>}
            </button>
          </div>
        </aside>

        {/* Center Engineering Workspace */}
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Sub-Module Strip for Active Phase */}
          <div className="bg-slate-50 border-b border-slate-200 px-3 py-1.5 flex items-center gap-1.5 overflow-x-auto shrink-0">
            {currentPhaseObj.modules.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setActiveModule(m.id)}
                className={`px-2.5 py-1 rounded-cad text-[11px] font-semibold whitespace-nowrap border ${
                  activeModule === m.id
                    ? 'bg-white text-brand-navy border-brand-orange shadow-sm'
                    : 'bg-transparent text-slate-600 border-transparent hover:bg-white/70'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          {/* Scrollable Module Content */}
          <div className="flex-1 overflow-y-auto p-3 pb-24 md:pb-4">
            <div className="max-w-6xl mx-auto">
              {activeModule === 'wizard' && (
                <RequirementsWizard
                  deal={activeDeal}
                  eng={engineering}
                  onPatchDeal={patchDeal}
                  onNotify={pushToast}
                />
              )}
              {activeModule === 'whitespace_branding' && (
                <WhiteSpaceBranding deal={activeDeal} eng={engineering} onPatchDeal={patchDeal} />
              )}
              {activeModule === 'studio_3d' && <Studio3DModule deal={activeDeal} eng={engineering} />}
              {activeModule === 'civil_plinth' && (
                <CivilPlinthModule deal={activeDeal} eng={engineering} onPatchDeal={patchDeal} />
              )}
              {activeModule === 'telecom_mmr' && (
                <TelecomMmrModule deal={activeDeal} onPatchDeal={patchDeal} />
              )}
              {activeModule === 'logistics_rigging' && (
                <LogisticsRiggingModule deal={activeDeal} eng={engineering} onPatchDeal={patchDeal} />
              )}
              {activeModule === 'cad_sheets' && (
                <CadStudioModule deal={activeDeal} eng={engineering} onNotify={pushToast} />
              )}
              {activeModule === 'mep_yard' && <MepYardModule deal={activeDeal} eng={engineering} />}
              {activeModule === 'governance_audits' && (
                <GovernanceAuditModule deal={activeDeal} eng={engineering} onPatchDeal={patchDeal} />
              )}
              {activeModule === 'commercial_boq' && (
                <CommercialBoqModule
                  deal={activeDeal}
                  eng={engineering}
                  onPatchDeal={patchDeal}
                  onNotify={pushToast}
                />
              )}
              {activeModule === 'supply_crud' && (
                <SupplyChainCrudModule
                  supplyIntel={workspace.supplyIntel}
                  catalog={workspace.catalog}
                  eng={engineering}
                  onSaveSupplyIntel={(next) => setWorkspace((prev) => ({ ...prev, supplyIntel: next }))}
                  onSaveCatalog={(next) => setWorkspace((prev) => ({ ...prev, catalog: next }))}
                  onNotify={pushToast}
                />
              )}
            </div>
          </div>
        </main>

        {/* Desktop & Unfolded Tablet Live Split Preview Pane */}
        {splitOpen && (
          <aside className="hidden xl:block w-80 shrink-0 h-full">
            <SplitPreviewPane deal={activeDeal} eng={engineering} onPatchDeal={patchDeal} />
          </aside>
        )}
      </div>

      {/* Narrow-Viewport Floating Live Preview Button + Bottom Sheet */}
      <button
        type="button"
        onClick={() => setMobilePreviewOpen(true)}
        className="xl:hidden fixed bottom-16 right-3 z-30 px-3 py-1.5 rounded-cad bg-brand-navy text-white text-[11px] font-semibold shadow-lg border border-white/20 flex items-center gap-1.5"
      >
        <PanelRight className="w-3.5 h-3.5 text-brand-orange" />
        Preview / What-If
      </button>

      {mobilePreviewOpen && (
        <div className="xl:hidden fixed inset-0 z-50 bg-slate-900/50 flex items-end">
          <div className="w-full h-[72vh] bg-white rounded-t-md overflow-hidden shadow-2xl">
            <SplitPreviewPane
              deal={activeDeal}
              eng={engineering}
              onPatchDeal={patchDeal}
              onCloseMobile={() => setMobilePreviewOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Folded / Mobile Sticky 4-Phase Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 grid grid-cols-4 z-40">
        {PHASES.map((p) => {
          const Icon = p.icon;
          const active = phase === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => selectPhase(p.id)}
              className={`py-2 flex flex-col items-center gap-0.5 text-[10px] font-semibold ${
                active ? 'text-brand-orange border-t-2 border-brand-orange' : 'text-slate-600'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{p.short}</span>
            </button>
          );
        })}
      </nav>

      {/* Real Google Drive Picker Modal */}
      <DriveSyncModal
        open={driveOpen}
        onClose={() => setDriveOpen(false)}
        activeDeal={activeDeal}
        selectedFolderId={workspace.driveConfig.selectedFolderId}
        selectedFolderPath={workspace.driveConfig.selectedFolderPath}
        includeReadonlyScope={workspace.driveConfig.includeReadonlyScope}
        onUpdateDriveConfig={(patch) =>
          setWorkspace((prev) => ({
            ...prev,
            driveConfig: { ...prev.driveConfig, ...patch }
          }))
        }
        onImportPayloadFromDrive={(payload, filename) => {
          const { nextState, summary } = mergeImportedJsonPayload(workspace, payload);
          setWorkspace(nextState);
          pushToast(
            'success',
            `Loaded ${filename} from Google Drive`,
            `Deals: ${summary.dealsImported} | Catalog: ${summary.catalogItemsImported} | SKUs: ${summary.supplySkusImported}`
          );
        }}
        onNotify={pushToast}
      />
    </div>
  );
};
