import React, { useState } from 'react';
import {
  BarChart3
  Building2,
  ChevronLeft,
  ChevronRight,
  Cloud,
  Database,
  FileOutput,
  FolderKanban,
  FolderOpen,
  HardHat,
  Menu,
  Network,
  Save,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Truck,
  Box,
  X,
  Zap
} from 'lucide-react';
import { Mail } from 'lucide-react';
import { formatMoney } from '../engine/engineeringEngine';
import type { EngineeringResult, MasterStandards, ProjectDeal } from '../types/mdc';

export type TopPillar = 'deal_hub' | 'portfolio' | 'deal_studio' | 'supply_chain' | 'master_crud';
export type DesignSubTab =
  | 'container_ws'
  | 'civil_plinth'
  | 'mep_bom'
  | 'telecom_mmr'
  | 'logistics_rigging'
  | 'validation';

export interface ToastNotice {
  id: string;
  message: string;
  tone?: 'success' | 'info' | 'warning';
}

interface AppShellProps {
  pillar: TopPillar;
  studioStage: 1 | 2 | 3;
  designSubTab: DesignSubTab;
  projects: ProjectDeal[];
  currentProject: ProjectDeal;
  eng: EngineeringResult;
  standards: MasterStandards;
  logoDataUrl: string;
  lastSavedAt: string;
  migratedFrom: string | null;
  driveToken: string;
  driveStatus: string;
  whatIfOpen: boolean;
  toasts: ToastNotice[];
  onSelectProject: (id: string) => void;
  onNavigatePillar: (pillar: TopPillar) => void;
  onNavigateStudio: (stage: 1 | 2 | 3, subTab?: DesignSubTab) => void;
  onOpenSaveModal: (mode: 'save' | 'open') => void;
  onOpenEmailModal: () => void;
  onGoogleSignIn: () => void;
  onToggleWhatIf: () => void;
  onDismissToast: (id: string) => void;
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({
  pillar,
  studioStage,
  designSubTab,
  projects,
  currentProject,
  eng,
  standards,
  logoDataUrl,
  lastSavedAt,
  migratedFrom,
  driveToken,
  driveStatus,
  whatIfOpen,
  toasts,
  onSelectProject,
  onNavigatePillar,
  onNavigateStudio,
  onOpenSaveModal,
  onOpenEmailModal,
  onGoogleSignIn,
  onToggleWhatIf,
  onDismissToast,
  children
}) => {
  const [railCollapsed, setRailCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isStudioItemActive = (stage: 1 | 2 | 3, subTab?: DesignSubTab) => {
    if (pillar !== 'deal_studio') return false;
    if (studioStage !== stage) return false;
    if (stage === 2 && subTab) return designSubTab === subTab;
    return true;
  };

  const handleNavClick = (action: () => void) => {
    action();
    setMobileMenuOpen(false);
  };

  const navItemClass = (active: boolean) =>
    `w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition ${
      active
        ? 'bg-[#FF5539] text-white shadow-sm'
        : 'text-slate-300 hover:bg-white/10 hover:text-white'
    }`;

  const renderRailContents = (compact: boolean) => (
    <div className="flex flex-col h-full">
      {/* Brand Header */}
      <div className="px-3.5 py-3.5 border-b border-white/10 flex items-center justify-between gap-2">
        <button
          onClick={() => handleNavClick(() => onNavigatePillar('deal_hub'))}
          className="flex items-center gap-2.5 min-w-0 text-left"
        >
          {logoDataUrl ? (
            <img
              src={logoDataUrl}
              alt="App Logo"
              className="h-8 w-auto bg-white rounded px-1.5 py-0.5 object-contain flex-shrink-0"
            />
          ) : (
            <div className="w-8 h-8 rounded-lg coral-bg flex items-center justify-center font-black text-white text-xs flex-shrink-0">
              MDC
            </div>
          )}
          {!compact && (
            <div className="min-w-0">
              <div className="text-xs font-extrabold text-white truncate leading-tight">
                AI MDC Studio
              </div>
              <div className="text-[10px] text-slate-400 truncate">
                V13.4 • Saved {lastSavedAt}
              </div>
            </div>
          )}
        </button>

        <button
          onClick={() => setRailCollapsed(prev => !prev)}
          className="hidden lg:flex items-center justify-center w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 flex-shrink-0"
          title={compact ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {compact ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Grouped Navigation */}
      <div className="flex-1 overflow-y-auto px-2.5 py-3 space-y-4">
        {/* Workspace */}
        <div className="space-y-1">
          {!compact && (
            <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Workspace
            </div>
          )}
          <button
            onClick={() => handleNavClick(() => onNavigatePillar('deal_hub'))}
            className={navItemClass(pillar === 'deal_hub')}
            title="Deal Hub"
          >
            <FolderKanban className="w-4 h-4 flex-shrink-0" />
            {!compact && <span className="truncate">Deal Hub ({projects.length})</span>}
          </button>
          <button
            onClick={() => handleNavClick(() => onNavigatePillar('portfolio'))}
            className={navItemClass(pillar === 'portfolio')}
            title="Portfolio & Cost/MW Analyzer"
          >
            <BarChart3 className="w-4 h-4 flex-shrink-0" />
            {!compact && <span className="truncate">Portfolio Cost/MW</span>}
          </button>
        </div>

        {/* Deal Studio & Engineering Modules */}
        <div className="space-y-1">
          {!compact && (
            <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Deal Engineering
            </div>
          )}
          <button
            onClick={() => handleNavClick(() => onNavigateStudio(1))}
            className={navItemClass(isStudioItemActive(1))}
            title="Requirements Wizard (Site, Thermal & Racks)"
          >
            <SlidersHorizontal className="w-4 h-4 flex-shrink-0" />
            {!compact && <span className="truncate">1. Requirements Wizard</span>}
          </button>

          <button
            onClick={() => handleNavClick(() => onNavigateStudio(2, 'container_ws'))}
            className={navItemClass(isStudioItemActive(2, 'container_ws'))}
            title="Container, White-Space & Branding"
          >
            <Box className="w-4 h-4 flex-shrink-0" />
            {!compact && <span className="truncate">2. Container & White-Space</span>}
          </button>

          <button
            onClick={() => handleNavClick(() => onNavigateStudio(2, 'civil_plinth'))}
            className={navItemClass(isStudioItemActive(2, 'civil_plinth'))}
            title="Civil, Plinth & BnM Engineering"
          >
            <HardHat className="w-4 h-4 flex-shrink-0" />
            {!compact && <span className="truncate">3. Civil, Plinth & BnM</span>}
          </button>

          <button
            onClick={() => handleNavClick(() => onNavigateStudio(2, 'mep_bom'))}
            className={navItemClass(isStudioItemActive(2, 'mep_bom'))}
            title="Yard MEP Synthesis & BOQ"
          >
            <Building2 className="w-4 h-4 flex-shrink-0" />
            {!compact && (
              <span className="truncate flex-1 text-left">4. MEP Synthesis & BOQ</span>
            )}
            {!compact && eng.dealPlaceholders.length > 0 && (
              <span className="px-1.5 py-0.5 rounded bg-amber-400 text-slate-950 text-[9px] font-black">
                {eng.dealPlaceholders.length}
              </span>
            )}
          </button>

          <button
            onClick={() => handleNavClick(() => onNavigateStudio(2, 'telecom_mmr'))}
            className={navItemClass(isStudioItemActive(2, 'telecom_mmr'))}
            title="Telecom & Carrier MMR"
          >
            <Network className="w-4 h-4 flex-shrink-0" />
            {!compact && <span className="truncate">5. Telecom & MMR</span>}
          </button>

          <button
            onClick={() => handleNavClick(() => onNavigateStudio(2, 'logistics_rigging'))}
            className={navItemClass(isStudioItemActive(2, 'logistics_rigging'))}
            title="Logistics & Heavy-Lift Rigging"
          >
            <Truck className="w-4 h-4 flex-shrink-0" />
            {!compact && <span className="truncate">6. Logistics & Rigging</span>}
          </button>

          <button
            onClick={() => handleNavClick(() => onNavigateStudio(2, 'validation'))}
            className={navItemClass(isStudioItemActive(2, 'validation'))}
            title="Soft Validation Gate"
          >
            <ShieldCheck className="w-4 h-4 flex-shrink-0" />
            {!compact && <span className="truncate flex-1 text-left">7. Validation Gate</span>}
            {!compact && eng.unwaivedFailCount > 0 && (
              <span className="px-1.5 py-0.5 rounded bg-red-500 text-white text-[9px] font-black">
                {eng.unwaivedFailCount}
              </span>
            )}
          </button>

          <button
            onClick={() => handleNavClick(() => onNavigateStudio(3))}
            className={navItemClass(isStudioItemActive(3))}
            title="Stage 3: Outputs, 360° 3D, 7 CAD & PPTX"
          >
            <FileOutput className="w-4 h-4 flex-shrink-0" />
            {!compact && <span className="truncate">8. Outputs, 3D & 8 CAD</span>}
          </button>
        </div>

        {/* Libraries */}
        <div className="space-y-1">
          {!compact && (
            <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Catalogs & Intel
            </div>
          )}
          <button
            onClick={() => handleNavClick(() => onNavigatePillar('supply_chain'))}
            className={navItemClass(pillar === 'supply_chain')}
            title="India OEM Supply Chain Intelligence"
          >
            <Database className="w-4 h-4 flex-shrink-0" />
            {!compact && <span className="truncate">Supply Chain Intel</span>}
          </button>

          <button
            onClick={() => handleNavClick(() => onNavigatePillar('master_crud'))}
            className={navItemClass(pillar === 'master_crud')}
            title="Master Standards, Racks & Containers CRUD"
          >
            <Settings className="w-4 h-4 flex-shrink-0" />
            {!compact && <span className="truncate">Master Catalogs & Racks</span>}
          </button>
        </div>
      </div>

      {/* Bottom Cloud Status */}
      <div className="p-2.5 border-t border-white/10 space-y-1.5">
        <button
          onClick={onGoogleSignIn}
          className={`w-full flex items-center justify-center gap-2 px-2.5 py-2 rounded-xl text-xs font-bold transition ${
            driveToken
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
              : 'bg-white/10 hover:bg-white/20 text-slate-200'
          }`}
          title={driveToken ? `Google Drive: ${driveStatus}` : 'Connect Google Drive'}
        >
          <Cloud className="w-4 h-4 flex-shrink-0" />
          {!compact && <span className="truncate">{driveToken ? driveStatus : 'Connect Google Drive'}</span>}
        </button>
        {!compact && migratedFrom && (
          <div className="text-[10px] text-center text-slate-400 truncate">
            Migrated from {migratedFrom}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-[100dvh] flex bg-[#F4F6FA] text-slate-900">
      {/* Desktop Collapsible Left Navigation Rail */}
      <aside
        className={`hidden lg:flex flex-col bg-[#001F54] text-white flex-shrink-0 sticky top-0 h-[100dvh] transition-all duration-200 border-r border-slate-800 ${
          railCollapsed ? 'w-[68px]' : 'w-[244px]'
        }`}
      >
        {renderRailContents(railCollapsed)}
      </aside>

      {/* Mobile / Foldable Slide-Over Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="w-[270px] max-w-[82vw] bg-[#001F54] text-white h-full shadow-2xl flex flex-col">
            <div className="flex justify-end p-2 border-b border-white/10">
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 rounded-lg bg-white/10 text-white"
                aria-label="Close navigation menu"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">{renderRailContents(false)}</div>
          </div>
          <div
            className="flex-1 bg-slate-950/60"
            onClick={() => setMobileMenuOpen(false)}
          />
        </div>
      )}

      {/* Right Main Column */}
      <div className="flex-1 min-w-0 flex flex-col min-h-[100dvh]">
        {/* Minimal Calm Top Bar */}
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200 px-3 sm:px-5 py-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-center gap-2 min-w-0">
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="lg:hidden p-2 rounded-lg border border-slate-300 bg-slate-50 text-slate-700"
                aria-label="Open navigation menu"
              >
                <Menu className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-2 bg-slate-100 border border-slate-200 rounded-xl px-2.5 py-1.5 min-w-0">
                <span className="text-[11px] font-bold text-slate-500 hidden sm:inline">Deal:</span>
                <select
                  value={currentProject.id}
                  onChange={e => onSelectProject(e.target.value)}
                  className="bg-transparent text-xs font-bold navy-text focus:outline-none max-w-[180px] sm:max-w-[280px] truncate"
                >
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-xs">
              {pillar === 'deal_studio' && (
                <button
                  onClick={onToggleWhatIf}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold border transition ${
                    whatIfOpen
                      ? 'coral-bg text-white border-[#FF5539]'
                      : 'bg-amber-50 hover:bg-amber-100 text-amber-950 border-amber-300'
                  }`}
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{whatIfOpen ? 'Hide What-If' : 'What-If'}</span>
                </button>
              )}

              <button
                onClick={onOpenEmailModal}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-orange-300 bg-orange-50 hover:bg-orange-100 font-bold text-orange-950"
                title="Email Proposal Pack (Outlook Desktop / Outlook Web / Gmail)"
              >
                <Mail className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Email</span>
              </button>

              <button
                onClick={() => onOpenSaveModal('open')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 font-bold navy-text"
              >
                <FolderOpen className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Open</span>
              </button>

              <button
                onClick={() => onOpenSaveModal('save')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl navy-bg hover:opacity-95 text-white font-bold"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save As</span>
              </button>
            </div>
          </div>

          {/* Persistent Live Telemetry Ribbon inside Deal Studio */}
          {pillar === 'deal_studio' && (
            <div className="mt-2 pt-2 border-t border-slate-100 flex items-center gap-2 sm:gap-4 overflow-x-auto whitespace-nowrap text-[11px]">
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400 font-semibold">IT Load:</span>
                <span className="font-black navy-text">
                  {(eng.totalDesignContKw / 1000).toFixed(2)} MW
                </span>
                <span className="text-slate-400">({eng.activeRacks.length} Racks)</span>
              </div>
              <span className="text-slate-300">|</span>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400 font-semibold">PUE:</span>
                <span className="font-black text-slate-800">{eng.pueAnnualized}</span>
              </div>
              <span className="text-slate-300">|</span>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400 font-semibold">
                  {currentProject.shellArchitecture === 'BnM_Hall' ? 'BnM Bays:' : 'Pods:'}
                </span>
                <span className="font-black text-slate-800">
                  {eng.pods.length} ({eng.totalCampusOccupiedSqm} m²)
                </span>
              </div>
              <span className="text-slate-300">|</span>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400 font-semibold">MII:</span>
                <span className="font-black text-emerald-700">{eng.mii.overallMiiPct}%</span>
              </div>
              <span className="text-slate-300">|</span>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400 font-semibold">Pre-Tax CapEx:</span>
                <span className="font-black text-[#FF5539]">
                  {formatMoney(eng.totals.sellingPreTax, currentProject.currency, standards)}
                </span>
              </div>
              <span className="text-slate-300">|</span>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400 font-semibold">Site:</span>
                <span className="font-bold text-slate-700">
                  {currentProject.cityQuery} ({currentProject.seismicZone})
                </span>
              </div>
            </div>
          )}
        </header>

        {/* Main Scrollable Content */}
        <main className="flex-1 p-3 sm:p-5 pb-20 lg:pb-6 max-w-[1600px] w-full mx-auto">
          {children}
        </main>

        {/* Compact Mobile / Fold Narrow Bottom Bar */}
        <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-slate-200 px-2 py-1.5 grid grid-cols-5 gap-1 text-[10px] font-bold">
          <button
            onClick={() => onNavigatePillar('deal_hub')}
            className={`flex flex-col items-center py-1 rounded-lg ${
              pillar === 'deal_hub' ? 'text-[#FF5539] bg-orange-50' : 'text-slate-600'
            }`}
          >
            <FolderKanban className="w-4 h-4 mb-0.5" />
            Deals
          </button>
          <button
            onClick={() => onNavigateStudio(1)}
            className={`flex flex-col items-center py-1 rounded-lg ${
              isStudioItemActive(1) ? 'text-[#FF5539] bg-orange-50' : 'text-slate-600'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4 mb-0.5" />
            Wizard
          </button>
          <button
            onClick={() => onNavigateStudio(2, 'mep_bom')}
            className={`flex flex-col items-center py-1 rounded-lg ${
              pillar === 'deal_studio' && studioStage === 2 ? 'text-[#FF5539] bg-orange-50' : 'text-slate-600'
            }`}
          >
            <Box className="w-4 h-4 mb-0.5" />
            Design
          </button>
          <button
            onClick={() => onNavigateStudio(3)}
            className={`flex flex-col items-center py-1 rounded-lg ${
              isStudioItemActive(3) ? 'text-[#FF5539] bg-orange-50' : 'text-slate-600'
            }`}
          >
            <FileOutput className="w-4 h-4 mb-0.5" />
            3D/CAD
          </button>
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="flex flex-col items-center py-1 rounded-lg text-slate-600"
          >
            <Menu className="w-4 h-4 mb-0.5" />
            Modules
          </button>
        </nav>
      </div>

      {/* Non-Blocking Toast Notifications */}
      {toasts.length > 0 && (
        <div className="fixed bottom-16 lg:bottom-5 right-4 z-50 space-y-2 max-w-sm w-[calc(100vw-2rem)]">
          {toasts.map(t => (
            <div
              key={t.id}
              className={`px-3.5 py-2.5 rounded-xl shadow-lg border text-xs font-semibold flex items-center justify-between gap-2 ${
                t.tone === 'warning'
                  ? 'bg-amber-50 border-amber-300 text-amber-950'
                  : t.tone === 'info'
                    ? 'bg-slate-900 border-slate-700 text-white'
                    : 'bg-emerald-900 border-emerald-700 text-white'
              }`}
            >
              <span>{t.message}</span>
              <button
                onClick={() => onDismissToast(t.id)}
                className="opacity-70 hover:opacity-100 p-0.5"
                aria-label="Dismiss notification"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
