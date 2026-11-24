import React, { useEffect, useMemo, useState } from 'react';
import { DealHub } from './components/DealHub';
import { DealStudio } from './components/DealStudio';
import { MasterCrudHub } from './components/MasterCrudHub';
import { Stage3Outputs } from './components/Stage3Outputs';
import { SupplyChainHub } from './components/SupplyChainHub';
import { WorkspaceSaveOpenModal } from './components/WorkspaceSaveOpenModal';
import { COLOR_THEMES } from './data/masterCatalog';
import { DEFAULT_GOOGLE_CLIENT_ID, requestDriveAccessToken } from './engine/drivePicker';
import { buildFirstDraftPatch, computeEngineeringV13 } from './engine/engineeringEngine';
import {
  loadWorkspaceWithMigration,
  makeBlankProject,
  sanitizeProject,
  saveWorkspaceState
} from './engine/storageAdapter';
import type {
  ColorPalette,
  NonItCatalogItem,
  ProjectDeal,
  SupplyChainDataset,
  SupplyChainSku
} from './types/mdc';

type TopPillar = 'deal_hub' | 'deal_studio' | 'supply_chain' | 'master_crud';

export default function App() {
  const [initialBoot] = useState(() => loadWorkspaceWithMigration(DEFAULT_GOOGLE_CLIENT_ID));
  const [pillar, setPillar] = useState<TopPillar>('deal_hub');
  const [studioStage, setStudioStage] = useState<1 | 2 | 3>(1);

  const [projects, setProjects] = useState<ProjectDeal[]>(initialBoot.state.projects);
  const [editingId, setEditingId] = useState<string>(initialBoot.state.editingId);
  const [skus, setSkus] = useState(initialBoot.state.skus);
  const [containerCatalog, setContainerCatalog] = useState(initialBoot.state.containerCatalog);
  const [nonItCatalog, setNonItCatalog] = useState(initialBoot.state.nonItCatalog);
  const [standards, setStandards] = useState(initialBoot.state.standards);
  const [palette, setPalette] = useState<ColorPalette>(initialBoot.state.palette);
  const [supplyIntel, setSupplyIntel] = useState<SupplyChainDataset>(initialBoot.state.supplyIntel);
  const [logoDataUrl, setLogoDataUrl] = useState<string>(initialBoot.state.logoDataUrl);
  const [clientId] = useState<string>(initialBoot.state.clientId);

  const [driveToken, setDriveToken] = useState('');
  const [driveStatus, setDriveStatus] = useState('Local Ready');
  const [lastSavedAt, setLastSavedAt] = useState(() =>
    new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  );
  const [saveOpenModal, setSaveOpenModal] = useState<{ open: boolean; mode: 'save' | 'open' }>({
    open: false,
    mode: 'save'
  });

  useEffect(() => {
    const res = saveWorkspaceState({
      schemaVersion: 'MDC_V13_1',
      projects,
      editingId,
      skus,
      containerCatalog,
      nonItCatalog,
      standards,
      palette,
      supplyIntel,
      logoDataUrl,
      clientId
    });
    if (res.ok) setLastSavedAt(res.time);
  }, [projects, editingId, skus, containerCatalog, nonItCatalog, standards, palette, supplyIntel, logoDataUrl, clientId]);

  const currentProject = useMemo(
    () => sanitizeProject(projects.find(p => p.id === editingId) || projects[0], standards),
    [projects, editingId, standards]
  );

  const eng = useMemo(
    () => computeEngineeringV13(currentProject, skus, nonItCatalog, standards, supplyIntel.items),
    [currentProject, skus, nonItCatalog, standards, supplyIntel]
  );

  const updateCurrentProject = (patch: Partial<ProjectDeal>) => {
    setProjects(prev =>
      prev.map(p =>
        p.id === currentProject.id
          ? { ...p, ...patch, updatedAt: new Date().toISOString().slice(0, 10) }
          : p
      )
    );
  };

  const handleCreateDeal = () => {
    const newId = `proj-${Date.now()}`;
    const np = makeBlankProject(newId, projects.length + 1, standards);
    setProjects(prev => [np, ...prev]);
    setEditingId(newId);
    setStudioStage(1);
    setPillar('deal_studio');
  };

  const handleCloneDeal = (id: string) => {
    const orig = projects.find(p => p.id === id);
    if (!orig) return;
    const clonedId = `proj-${Date.now()}`;
    const cloned = sanitizeProject(
      {
        ...orig,
        id: clonedId,
        name: `${orig.name} (Copy)`,
        updatedAt: new Date().toISOString().slice(0, 10)
      },
      standards
    );
    setProjects(prev => [cloned, ...prev]);
    setEditingId(clonedId);
  };

  const handleDeleteDeal = (id: string) => {
    if (!confirm('Delete this saved deal JSON?')) return;
    const remaining = projects.filter(p => p.id !== id);
    if (remaining.length === 0) {
      const fresh = makeBlankProject(`proj-${Date.now()}`, 1, standards);
      setProjects([fresh]);
      setEditingId(fresh.id);
    } else {
      setProjects(remaining);
      if (editingId === id) setEditingId(remaining[0].id);
    }
  };

  const handleGenerateFirstDraft = () => {
    const patch = buildFirstDraftPatch(
      currentProject,
      skus,
      nonItCatalog,
      standards,
      supplyIntel.items
    );
    updateCurrentProject(patch);
    setStudioStage(2);
    setPillar('deal_studio');
  };

  const handlePromoteSkuToMaster = (newItem: NonItCatalogItem, newSupplySku: SupplyChainSku) => {
    setNonItCatalog(prev => [newItem, ...prev]);
    setSupplyIntel(prev => ({
      ...prev,
      lastRefreshed: new Date().toISOString().slice(0, 10),
      items: [newSupplySku, ...(prev.items || [])]
    }));
  };

  const handleImportLocalFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const obj = JSON.parse(String(ev.target?.result || ''));
        handleLoadedRemoteObject(obj, f.name);
      } catch {
        alert('Invalid JSON file.');
      }
    };
    reader.readAsText(f);
  };

  const handleLoadedRemoteObject = (obj: unknown, fileName: string) => {
    const data = obj as Record<string, unknown>;
    if (Array.isArray(data?.items) && String(data?.schemaVersion || '').includes('SUPPLY_INTEL')) {
      setSupplyIntel(data as unknown as SupplyChainDataset);
      alert(`Loaded Supply Chain DB from ${fileName}`);
      return;
    }
    if (Array.isArray(data?.skus) && Array.isArray(data?.nonItCatalog)) {
      setSkus(data.skus);
      if (Array.isArray(data.containerCatalog)) setContainerCatalog(data.containerCatalog);
      setNonItCatalog(data.nonItCatalog);
      if (data.standards) setStandards(prev => ({ ...prev, ...(data.standards as typeof prev) }));
      alert(`Loaded Master Catalog from ${fileName}`);
      return;
    }
    const rawList = Array.isArray(data?.projects) ? data.projects : [data];
    const imported = rawList.map(item =>
      sanitizeProject(
        { ...(item as Partial<ProjectDeal>), id: `proj-${Math.random().toString(36).slice(2, 8)}` },
        standards
      )
    );
    if (imported.length > 0) {
      setProjects(prev => [...imported, ...prev]);
      setEditingId(imported[0].id);
      setPillar('deal_studio');
      setStudioStage(2);
    }
  };

  const handleGoogleSignIn = () => {
    requestDriveAccessToken(
      clientId,
      token => {
        setDriveToken(token);
        setDriveStatus('Connected');
      },
      msg => alert(msg)
    );
  };

  return (
    <div className="min-h-[100dvh] flex flex-col">
      <header className="navy-bg text-white px-3 sm:px-5 py-2.5 shadow-md sticky top-0 z-40 border-b border-blue-900">
        <div className="max-w-[1640px] mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            {logoDataUrl ? (
              <img
                src={logoDataUrl}
                alt="App Logo"
                className="h-8 w-auto bg-white rounded px-1.5 py-0.5 object-contain"
              />
            ) : (
              <div className="w-8 h-8 rounded-lg coral-bg flex items-center justify-center font-black text-white text-xs">
                MDC
              </div>
            )}
            <div>
              <div className="text-sm font-bold leading-tight">AI Modular Data Center Configurator</div>
              <div className="text-[10px] text-slate-300">
                V13.1 Enterprise • Auto-saved {lastSavedAt}
                {initialBoot.migratedFrom ? ` (Migrated from ${initialBoot.migratedFrom})` : ''}
              </div>
            </div>
          </div>

          <nav className="flex flex-wrap items-center gap-1.5 text-xs">
            {(
              [
                ['deal_hub', '1. Deal Hub'],
                ['deal_studio', '2. Deal Studio'],
                ['supply_chain', '3. Supply Chain Intelligence'],
                ['master_crud', '4. Master Standards & Racks']
              ] as [TopPillar, string][]
            ).map(([id, label]) => (
              <button
                key={id}
                onClick={() => setPillar(id)}
                className={`px-3 py-1.5 rounded-lg font-bold transition ${
                  pillar === id ? 'coral-bg text-white shadow' : 'bg-white/10 hover:bg-white/20 text-slate-100'
                }`}
              >
                {label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-1.5 text-xs">
            <div className="bg-slate-900/80 border border-slate-700 rounded-lg px-2.5 py-1 flex items-center gap-1.5">
              <span className="text-slate-400">Deal:</span>
              <select
                value={editingId}
                onChange={e => setEditingId(e.target.value)}
                className="bg-transparent text-white font-bold focus:outline-none max-w-[170px]"
              >
                {projects.map(p => (
                  <option key={p.id} value={p.id} className="text-slate-900">
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={() => setSaveOpenModal({ open: true, mode: 'save' })}
              className="px-2.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold"
            >
              💾 Save As
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-[1640px] w-full mx-auto p-3 sm:p-5">
        {pillar === 'deal_hub' && (
          <DealHub
            projects={projects}
            editingId={editingId}
            skus={skus}
            nonItCatalog={nonItCatalog}
            standards={standards}
            supplyItems={supplyIntel.items}
            driveToken={driveToken}
            driveStatus={driveStatus}
            onSelectDeal={(id, st) => {
              setEditingId(id);
              if (st) setStudioStage(st);
              setPillar('deal_studio');
            }}
            onCreateDeal={handleCreateDeal}
            onCloneDeal={handleCloneDeal}
            onDeleteDeal={handleDeleteDeal}
            onOpenSaveModal={mode => setSaveOpenModal({ open: true, mode })}
            onImportLocalFile={handleImportLocalFile}
            onGoogleSignIn={handleGoogleSignIn}
          />
        )}

        {pillar === 'deal_studio' && (
          <DealStudio
            project={currentProject}
            eng={eng}
            skus={skus}
            nonItCatalog={nonItCatalog}
            standards={standards}
            supplyItems={supplyIntel.items}
            palette={palette}
            stage={studioStage}
            onChangeStage={setStudioStage}
            onUpdateProject={updateCurrentProject}
            onGenerateFirstDraft={handleGenerateFirstDraft}
            onPromoteSkuToMaster={handlePromoteSkuToMaster}
            onUpdatePalette={(k, hex) => setPalette(prev => ({ ...prev, [k]: hex }))}
            onApplyTheme={thKey => {
              if (COLOR_THEMES[thKey]) setPalette({ ...COLOR_THEMES[thKey] });
            }}
            stage3Renderer={
              <Stage3Outputs
                project={currentProject}
                eng={eng}
                standards={standards}
                palette={palette}
                onUpdatePalette={(k, hex) => setPalette(prev => ({ ...prev, [k]: hex }))}
                onApplyTheme={thKey => {
                  if (COLOR_THEMES[thKey]) setPalette({ ...COLOR_THEMES[thKey] });
                }}
                onBackToDesign={() => setStudioStage(2)}
              />
            }
          />
        )}

        {pillar === 'supply_chain' && (
          <SupplyChainHub
            supplyIntel={supplyIntel}
            currentProject={currentProject}
            eng={eng}
            standards={standards}
            onUpdateSupplyIntel={setSupplyIntel}
          />
        )}

        {pillar === 'master_crud' && (
          <MasterCrudHub
            skus={skus}
            containerCatalog={containerCatalog}
            nonItCatalog={nonItCatalog}
            standards={standards}
            logoDataUrl={logoDataUrl}
            onUpdateSkus={setSkus}
            onUpdateContainerCatalog={setContainerCatalog}
            onUpdateNonItCatalog={setNonItCatalog}
            onUpdateStandards={setStandards}
            onUpdateLogoDataUrl={setLogoDataUrl}
            onExportMasterJson={() => {
              const payload = JSON.stringify(
                {
                  schemaVersion: 'MDC_MASTER_CATALOG_V13',
                  exportedAt: new Date().toISOString(),
                  skus,
                  containerCatalog,
                  nonItCatalog,
                  standards
                },
                null,
                2
              );
              const blob = new Blob([payload], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `mdc_master_catalog_${new Date().toISOString().slice(0, 10)}.json`;
              a.click();
              URL.revokeObjectURL(url);
            }}
            onImportMasterJson={handleImportLocalFile}
          />
        )}
      </main>

      <WorkspaceSaveOpenModal
        isOpen={saveOpenModal.open}
        onClose={() => setSaveOpenModal(prev => ({ ...prev, open: false }))}
        mode={saveOpenModal.mode}
        currentProject={currentProject}
        skus={skus}
        containerCatalog={containerCatalog}
        nonItCatalog={nonItCatalog}
        standards={standards}
        driveToken={driveToken}
        onGoogleSignIn={handleGoogleSignIn}
        onImportLocalFile={handleImportLocalFile}
        onLoadedRemoteObject={handleLoadedRemoteObject}
        onDriveSyncStatus={setDriveStatus}
      />
    </div>
  );
}
