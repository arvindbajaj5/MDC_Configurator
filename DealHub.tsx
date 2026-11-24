import React, { useState } from 'react';
import { computeEngineeringV13, formatMoney } from '../engine/engineeringEngine';
import type {
  MasterStandards,
  NonItCatalogItem,
  ProjectDeal,
  RackSku,
  SupplyChainSku
} from '../types/mdc';

interface DealHubProps {
  projects: ProjectDeal[];
  editingId: string;
  skus: RackSku[];
  nonItCatalog: NonItCatalogItem[];
  standards: MasterStandards;
  supplyItems: SupplyChainSku[];
  driveToken: string;
  driveStatus: string;
  onSelectDeal: (id: string, stage?: 1 | 2 | 3) => void;
  onCreateDeal: () => void;
  onCloneDeal: (id: string) => void;
  onDeleteDeal: (id: string) => void;
  onOpenSaveModal: (mode: 'save' | 'open') => void;
  onImportLocalFile: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onGoogleSignIn: () => void;
}

export const DealHub: React.FC<DealHubProps> = ({
  projects,
  editingId,
  skus,
  nonItCatalog,
  standards,
  supplyItems,
  driveToken,
  driveStatus,
  onSelectDeal,
  onCreateDeal,
  onCloneDeal,
  onDeleteDeal,
  onOpenSaveModal,
  onImportLocalFile,
  onGoogleSignIn
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredProjects = projects.filter(p => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      p.name.toLowerCase().includes(q) ||
      (p.client || '').toLowerCase().includes(q) ||
      (p.cityQuery || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-5">
      {/* Top Hero / Action Bar */}
      <div className="bg-white rounded-2xl card-shadow border border-slate-200 p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="px-2.5 py-0.5 rounded bg-blue-100 text-blue-950 font-black uppercase text-[10px]">
            Pillar 01 • Deal Hub & Workspace Repository
          </span>
          <h2 className="text-xl font-bold navy-text mt-1">Customer Deals & Turnkey AI Data Center Proposals</h2>
          <p className="text-xs text-slate-600 mt-0.5">
            Create, open, clone, or delete deal JSONs locally or via Google Drive Picker (master catalog files protected).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <button onClick={onCreateDeal} className="px-4 py-2 rounded-lg coral-bg text-white font-bold shadow">
            + Create New Deal
          </button>
          <button
            onClick={() => onOpenSaveModal('save')}
            className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
          >
            💾 Save As...
          </button>
          <button
            onClick={() => onOpenSaveModal('open')}
            className="px-3.5 py-2 rounded-lg navy-bg text-white font-bold"
          >
            📂 Open (Local / Drive)
          </button>
          <label className="px-3.5 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 font-bold navy-text cursor-pointer">
            ⬆ Quick Import .JSON
            <input type="file" accept=".json" onChange={onImportLocalFile} className="hidden" />
          </label>
          <button
            onClick={onGoogleSignIn}
            className={`px-3 py-2 rounded-lg border font-bold ${
              driveToken
                ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                : 'bg-slate-50 border-slate-300 text-slate-700'
            }`}
          >
            ☁ {driveToken ? driveStatus : 'Connect Google Drive'}
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Filter deals by project name, customer, or city..."
          className="w-full sm:w-96 border border-slate-300 rounded-xl px-3.5 py-2 bg-white text-xs font-medium"
        />
        <span className="text-xs font-bold text-slate-500">
          Showing {filteredProjects.length} of {projects.length} Deal(s)
        </span>
      </div>

      {/* Deal Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredProjects.map(p => {
          const pEng = computeEngineeringV13(p, skus, nonItCatalog, standards, supplyItems);
          const isCurrent = p.id === editingId;
          const isBnM = p.shellArchitecture === 'BnM_Hall';
          return (
            <div
              key={p.id}
              className={`bg-white rounded-2xl p-5 card-shadow border-2 transition flex flex-col justify-between space-y-4 ${
                isCurrent ? 'border-[#FF5539]' : 'border-slate-200 hover:border-blue-400'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {isCurrent && (
                        <span className="px-2 py-0.5 rounded coral-bg text-white text-[10px] font-black uppercase">
                          Active Deal
                        </span>
                      )}
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          isBnM ? 'bg-amber-100 text-amber-950' : 'bg-blue-100 text-blue-950'
                        }`}
                      >
                        {isBnM ? 'BnM Hall' : 'Modular Container'}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-bold">
                        {p.uptimeTier}
                      </span>
                    </div>
                    <h3 className="text-base font-bold navy-text mt-1.5 leading-snug">{p.name}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Client: <strong>{p.client || 'TBD'}</strong> • {p.cityQuery} ({p.seismicZone})
                    </p>
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono">{p.updatedAt}</span>
                </div>

                {/* Engineering & Commercial Telemetry */}
                <div className="grid grid-cols-2 gap-2.5 text-xs bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">IT Load (DLC / AC)</span>
                    <span className="font-black navy-text">
                      {(pEng.totalDesignContKw / 1000).toFixed(2)} MW ({(pEng.dlcDesignKw / 1000).toFixed(1)} /{' '}
                      {(pEng.acDesignKw / 1000).toFixed(1)})
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Non-IT Pre-Tax</span>
                    <span className="font-black text-emerald-800">
                      {formatMoney(pEng.totals.sellingPreTax, p.currency, standards)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Units & Footprint</span>
                    <span className="font-bold text-slate-800">
                      {pEng.pods.length} {isBnM ? 'Bays' : 'Pods'} • {pEng.totalCampusOccupiedSqm} m²
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Supply & Validation</span>
                    <span className="font-bold text-slate-800">
                      {pEng.dealPlaceholders.length} PH • {pEng.unwaivedFailCount} Fail / {pEng.waivedCount} Waived
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-1.5 pt-2 border-t border-slate-100 text-xs">
                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={() => onSelectDeal(p.id, 1)}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 font-bold navy-text"
                  >
                    1. Inputs
                  </button>
                  <button
                    onClick={() => onSelectDeal(p.id, 2)}
                    className="px-2.5 py-1.5 rounded-lg navy-bg text-white font-bold"
                  >
                    2. Design
                  </button>
                  <button
                    onClick={() => onSelectDeal(p.id, 3)}
                    className="px-2.5 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-bold"
                  >
                    3. Outputs
                  </button>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onCloneDeal(p.id)}
                    className="px-2.5 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 font-bold text-slate-700"
                    title="Clone Deal"
                  >
                    ⧉ Clone
                  </button>
                  <button
                    onClick={() => onDeleteDeal(p.id)}
                    className="px-2 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 font-bold border border-red-200"
                    title="Delete Deal"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
