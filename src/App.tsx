import React, { useEffect, useMemo, useState } from 'react';
import { AppShell, type DesignSubTab, type ToastNotice, type TopPillar } from './components/AppShell';
import { DealHub } from './components/DealHub';
import { EmailProposalModal } from './components/EmailProposalModal';
import { PortfolioDashboard } from './components/PortfolioDashboard';
import { DealStudio } from './components/DealStudio';
import { MasterCrudHub } from './components/MasterCrudHub';
import { Stage3Outputs } from './components/Stage3Outputs';
import { SupplyChainHub } from './components/SupplyChainHub';
import { WorkspaceSaveOpenModal } from './components/WorkspaceSaveOpenModal';
import { COLOR_THEMES } from './data/masterCatalog';
import { DEFAULT_GOOGLE_CLIENT_ID, requestDriveAccessToken } from './engine/drivePicker';
import { buildFirstDraftPatch, computeEngineeringV13 } from './engine/engineeringEngine';
import { mergeSupplyChainWithDedup } from './engine/supplyMatcher';
import { loadCorporatePptxTemplate, type StoredPptxTemplate } from './engine/templateStorage';
import {
  loadWorkspaceWithMigration,
  makeBlankProject,
  sanitizeProject,
  saveWorkspaceState
} from './engine/storageAdapter';
import type {
  ColorPalette,
  ContainerSpec,
  MasterStandards,
  NonItCatalogItem,
  ProjectDeal,
  RackSku,
  SupplyChainDataset,
  SupplyChainSku
} from './types/mdc';

export default function App() {
  const [initialBoot] = useState(() => loadWorkspaceWithMigration(DEFAULT_GOOGLE_CLIENT_ID));
  const [pillar, setPillar] = useState<TopPillar>('deal_hub');
  const [studioStage, setStudioStage] = useState<1 | 2 | 3>(1);
  const [designSubTab, setDesignSubTab] = useState<DesignSubTab>('mep_bom');
  const [whatIfOpen, setWhatIfOpen] = useState(false);

  const [projects, setProjects] = useState<ProjectDeal[]>(initialBoot.state.projects);
  const [editingId, setEditingId] = useState<string>(initialBoot.state.editingId);
  const [skus, setSkus] = useState<RackSku[]>(initialBoot.state.skus);
  const [containerCatalog, setContainerCatalog] = useState<ContainerSpec[]>(
    initialBoot.state.containerCatalog
  );
  const [nonItCatalog, setNonItCatalog] = useState<NonItCatalogItem[]>(
    initialBoot.state.nonItCatalog
  );
  const [standards, setStandards] = useState<MasterStandards>(initialBoot.state.standards);
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
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [corporateTemplate, setCorporateTemplate] = useState<StoredPptxTemplate | null>(null);

  useEffect(() => {
    loadCorporatePptxTemplate().then(setCorporateTemplate).catch(() => {});
  }, [pillar]);
  const [toasts, setToasts] = useState<ToastNotice[]>([]);

  const pushToast = (message: string, tone: ToastNotice['tone'] = 'success') => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setToasts(prev => [...prev.slice(-3), { id, message, tone }]);
    window.setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4200);
  };

  // V13.3 Auto-sync monthly GitHub Actions public/mdc_supply_intel.json on startup
  useEffect(() => {
    let cancelled = false;
    fetch(`./mdc_supply_intel.json?t=${Date.now()}`)
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        if (cancelled || !data || !Array.isArray(data.items) || data.items.length === 0) return;
        setSupplyIntel(prev => {
          const mergedRes = mergeSupplyChainWithDedup(prev.items || [], data.items);
          return {
            ...prev,
            lastRefreshed: data.lastRefreshed || prev.lastRefreshed,
            refreshSource: data.refreshSource || prev.refreshSource,
            items: mergedRes.merged
          };
        });
      })
      .catch(() => {
        // Offline or local dev without public file; keep cached/seeded DB
      });
    return () => {
      cancelled = true;
    };
  }, []);

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
  }, [
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
  ]);

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

  const handleNavigateStudio = (stage: 1 | 2 | 3, subTab?: DesignSubTab) => {
    setStudioStage(stage);
    if (subTab) setDesignSubTab(subTab);
    setPillar('deal_studio');
  };

  const handleCreateDeal = () => {
    const newId = `proj-${Date.now()}`;
    const np = makeBlankProject(newId, projects.length + 1, standards);
    setProjects(prev => [np, ...prev]);
    setEditingId(newId);
    setStudioStage(1);
    setPillar('deal_studio');
    pushToast(`Created "${np.name}" — opened Requirements Wizard.`);
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
    pushToast(`Cloned deal "${orig.name}".`, 'info');
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
    pushToast('Deal removed from workspace.', 'info');
  };

  const handleAddRackSku = (newSku: RackSku, initialQty: number) => {
    setSkus(prev => [...prev, newSku]);
    if (initialQty > 0) {
      const nextQuantities = {
        ...(currentProject.rackQuantities || {}),
        [newSku.id]: initialQty
      };
      const isDlc = newSku.coolingType === 'DLC' || newSku.liquidSplitPct > 0;
      updateCurrentProject({
        rackQuantities: nextQuantities,
        includeLiquidLoop: currentProject.includeLiquidLoop || isDlc,
        includePumpSkids: currentProject.includePumpSkids || isDlc,
        includeWaterTanks: currentProject.includeWaterTanks || isDlc,
        includeGlycolDosing: currentProject.includeGlycolDosing || isDlc,
        includeExtCdu: currentProject.includeExtCdu || (isDlc && !newSku.cduIntegrated),
        includeRoomDehum: true
      });
    }
    pushToast(`Saved "${newSku.name}" to Master Rack Catalog (${initialQty} added to deal).`);
  };

  const handleSaveContainerToCatalog = (spec: ContainerSpec) => {
    setContainerCatalog(prev => [spec, ...prev]);
    updateCurrentProject({ containerCatalogId: spec.id });
    pushToast(`Saved "${spec.name}" to Master Container Catalog.`);
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
    setDesignSubTab('mep_bom');
    setPillar('deal_studio');
    pushToast('First-draft engineering design synthesized from Supply Chain DB.');
  };

  const handlePromoteSkuToMaster = (newItem: NonItCatalogItem, newSupplySku: SupplyChainSku) => {
    setNonItCatalog(prev => [newItem, ...prev]);
    setSupplyIntel(prev => ({
      ...prev,
      lastRefreshed: new Date().toISOString().slice(0, 10),
      items: [newSupplySku, ...(prev.items || [])]
    }));
    pushToast(`Promoted "${newItem.make} ${newItem.model}" to Master Catalog & Supply DB.`);
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
        pushToast('Invalid JSON file. Verify syntax and retry.', 'warning');
      }
    };
    reader.readAsText(f);
    e.target.value = '';
  };

  const handleLoadedRemoteObject = (obj: unknown, fileName: string) => {
    const data = obj as Record<string, unknown>;
    if (Array.isArray(data?.items) && String(data?.schemaVersion || '').includes('SUPPLY_INTEL')) {
      setSupplyIntel(data as unknown as SupplyChainDataset);
      pushToast(`Loaded Supply Chain DB (${data.items.length} SKUs) from ${fileName}.`);
      return;
    }
    if (Array.isArray(data?.skus) || Array.isArray(data?.nonItCatalog) || Array.isArray(data?.containerCatalog)) {
      const counts: string[] = [];
      if (Array.isArray(data.skus)) {
        setSkus(data.skus as RackSku[]);
        counts.push(`${data.skus.length} Racks`);
      }
      if (Array.isArray(data.containerCatalog)) {
        setContainerCatalog(data.containerCatalog as ContainerSpec[]);
        counts.push(`${data.containerCatalog.length} Containers`);
      }
      if (Array.isArray(data.nonItCatalog)) {
        setNonItCatalog(data.nonItCatalog as NonItCatalogItem[]);
        counts.push(`${data.nonItCatalog.length} Non-IT Blocks`);
      }
      if (data.standards) {
        setStandards(prev => ({ ...prev, ...(data.standards as Partial<MasterStandards>) }));
      }
      pushToast(`Loaded Master Catalog from ${fileName} (${counts.join(', ')}).`);
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
      setDesignSubTab('mep_bom');
      pushToast(`Opened "${imported[0].name}" from ${fileName}.`);
    }
  };

  const handleGoogleSignIn = () => {
    requestDriveAccessToken(
      clientId,
      token => {
        setDriveToken(token);
        setDriveStatus('Connected');
        pushToast('Google Drive connected.');
      },
      msg => pushToast(msg, 'warning')
    );
  };

  return (
    <>
      <AppShell
        pillar={pillar}
        studioStage={studioStage}
        designSubTab={designSubTab}
        projects={projects}
        currentProject={currentProject}
        eng={eng}
        standards={standards}
        logoDataUrl={logoDataUrl}
        lastSavedAt={lastSavedAt}
        migratedFrom={initialBoot.migratedFrom}
        driveToken={driveToken}
        driveStatus={driveStatus}
        whatIfOpen={whatIfOpen}
        toasts={toasts}
        onSelectProject={id => setEditingId(id)}
        onNavigatePillar={setPillar}
        onNavigateStudio={handleNavigateStudio}
        onOpenSaveModal={mode => setSaveOpenModal({ open: true, mode })}
        onOpenEmailModal={() => setEmailModalOpen(true)}
        onGoogleSignIn={handleGoogleSignIn}
        onToggleWhatIf={() => setWhatIfOpen(prev => !prev)}
        onDismissToast={id => setToasts(prev => prev.filter(t => t.id !== id))}
      >
        {pillar === 'portfolio' && (
          <PortfolioDashboard
            projects={projects}
            editingId={editingId}
            skus={skus}
            nonItCatalog={nonItCatalog}
            standards={standards}
            supplyItems={supplyIntel.items}
            logoDataUrl={logoDataUrl}
            onSelectDeal={(id, st) => {
              setEditingId(id);
              if (st) setStudioStage(st);
              setPillar('deal_studio');
            }}
          />
        )}

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
            containerCatalog={containerCatalog}
            nonItCatalog={nonItCatalog}
            standards={standards}
            supplyItems={supplyIntel.items}
            palette={palette}
            stage={studioStage}
            designSubTab={designSubTab}
            whatIfOpen={whatIfOpen}
            onChangeStage={setStudioStage}
            onChangeDesignSubTab={setDesignSubTab}
            onCloseWhatIf={() => setWhatIfOpen(false)}
            onUpdateProject={updateCurrentProject}
            onAddRackSku={handleAddRackSku}
            onSaveContainerToCatalog={handleSaveContainerToCatalog}
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
                logoDataUrl={logoDataUrl}
                corporateTemplate={corporateTemplate}
                onOpenEmailModal={() => setEmailModalOpen(true)}
                onUpdatePalette={(k, hex) => setPalette(prev => ({ ...prev, [k]: hex }))}
                onApplyTheme={thKey => {
                  if (COLOR_THEMES[thKey]) setPalette({ ...COLOR_THEMES[thKey] });
                }}
                onBackToDesign={() => {
                  setStudioStage(2);
                  setDesignSubTab('mep_bom');
                }}
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
              pushToast('Exported Master Catalog JSON.');
            }}
            onImportMasterJson={handleImportLocalFile}
          />
        )}
      </AppShell>

      <EmailProposalModal
        isOpen={emailModalOpen}
        onClose={() => setEmailModalOpen(false)}
        project={currentProject}
        eng={eng}
        standards={standards}
        clientId={clientId}
        driveToken={driveToken}
        logoDataUrl={logoDataUrl}
        onStatusNotice={(msg, tone) => pushToast(msg, tone || 'success')}
      />

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
        onDriveSyncStatus={status => {
          setDriveStatus(status);
          if (status.includes('✓')) pushToast(`Google Drive: ${status}`);
        }}
      />
    </>
  );
}
