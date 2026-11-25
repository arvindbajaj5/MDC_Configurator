import React from 'react';
import { Box, Building2, Printer, Save } from 'lucide-react';
import { exportPerUnitDatasheetsPdf } from '../engine/csvPdfExporters';
import type {
  ContainerSpec,
  EngineeringResult,
  ProjectDeal,
  ShellArchitecture
} from '../types/mdc';

interface ContainerWhiteSpacePanelProps {
  project: ProjectDeal;
  eng: EngineeringResult;
  containerCatalog: ContainerSpec[];
  onUpdateProject: (patch: Partial<ProjectDeal>) => void;
  onSaveContainerToCatalog: (spec: ContainerSpec) => void;
  onInspect3D?: () => void;
}

export const ContainerWhiteSpacePanel: React.FC<ContainerWhiteSpacePanelProps> = ({
  project,
  eng,
  containerCatalog,
  onUpdateProject,
  onSaveContainerToCatalog,
  onInspect3D
}) => {
  const isBnM = project.shellArchitecture === 'BnM_Hall';
  const pod0 = eng.pods?.[0];

  const applyCatalogPreset = (catalogId: string) => {
    if (catalogId === 'custom') {
      onUpdateProject({ containerCatalogId: 'custom', bespokeContainerPriceInr: '' });
      return;
    }
    const spec = containerCatalog.find(c => c.id === catalogId);
    if (!spec) return;
    onUpdateProject({
      containerCatalogId: spec.id,
      containerLengthMode:
        spec.lengthMm <= 6200 ? 'ISO20' : spec.lengthMm <= 12250 ? 'ISO40' : 'CustomOptimum',
      maxCustomLengthMm: spec.lengthMm,
      containerWidthMm: spec.widthMm,
      containerHeightMm: spec.heightMm,
      metallurgy: spec.metallurgy,
      wallThicknessMm: spec.wallMm,
      roofThicknessMm: spec.roofMm,
      floorThicknessMm: spec.floorMm,
      plenumHeightMm: spec.plenumMm,
      topClearanceMm: spec.topClearanceMm,
      bespokeContainerPriceInr: spec.baseCostInr
    });
  };

  const handleSaveCurrentShell = () => {
    const lenMm = pod0 ? pod0.extLengthMm : project.maxCustomLengthMm;
    const estCost =
      project.bespokeContainerPriceInr !== '' && Number(project.bespokeContainerPriceInr) > 0
        ? Number(project.bespokeContainerPriceInr)
        : Math.round(((lenMm / 1000) * (project.containerWidthMm / 1000) * 2 + 60) * 48000);
    const newSpec: ContainerSpec = {
      id: `cnt-saved-${Date.now()}`,
      name: `Saved ${project.metallurgy} Pod (${(lenMm / 1000).toFixed(2)}m × ${(project.containerWidthMm / 1000).toFixed(2)}m)`,
      lengthMm: lenMm,
      widthMm: project.containerWidthMm,
      heightMm: project.containerHeightMm,
      metallurgy: project.metallurgy,
      wallMm: project.wallThicknessMm,
      roofMm: project.roofThicknessMm,
      floorMm: project.floorThicknessMm,
      plenumMm: project.plenumHeightMm,
      topClearanceMm: project.topClearanceMm,
      baseCostInr: estCost
    };
    onSaveContainerToCatalog(newSpec);
  };

  const handleClientLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = ev => {
      onUpdateProject({
        clientLogoDataUrl: String(ev.target?.result || ''),
        brandingMode: 'custom_ready'
      });
    };
    reader.readAsDataURL(f);
    e.target.value = '';
  };

  return (
    <div className="space-y-5 text-xs">
      {/* Header & Shell Mode Toggle */}
      <div className="bg-white rounded-2xl card-shadow border border-slate-200 p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
          <div>
            <span className="px-2.5 py-0.5 rounded bg-blue-100 text-blue-950 font-black uppercase text-[10px]">
              Module 02 • Container / Hall Designer, White-Space MEP & Branding
            </span>
            <h2 className="text-lg font-bold navy-text mt-1">
              Enclosure Sizing, Internal White-Space PAC/CDU & Customer Branding
            </h2>
            <p className="text-slate-500">
              Zero CDUs in the yard: external CDUs sit inside white-space; every pod/hall bay includes mandatory 80 kW PACs + roof/yard chillers.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => exportPerUnitDatasheetsPdf(project, eng)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl navy-bg text-white font-bold"
            >
              <Printer className="w-3.5 h-3.5" />
              Per-Unit Datasheets (.PDF)
            </button>
            {onInspect3D && (
              <button
                onClick={onInspect3D}
                className="px-3.5 py-2 rounded-xl coral-bg text-white font-bold"
              >
                Inspect 3D Twin →
              </button>
            )}
          </div>
        </div>

        {/* Enclosure Mode Switcher */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {(
            [
              {
                val: 'Container' as ShellArchitecture,
                title: 'Modular ISO Corten-A Containers',
                sub: 'Factory-integrated pods (20ft / 40ft / Custom up to 13.5m / All-in-One)'
              },
              {
                val: 'BnM_Hall' as ShellArchitecture,
                title: 'Brick-and-Mortar (BnM) Technical Hall',
                sub: 'Fire-rated RCC column-grid building shell with raised plenum & containment'
              }
            ] as const
          ).map(item => {
            const active = project.shellArchitecture === item.val;
            return (
              <button
                key={item.val}
                type="button"
                onClick={() => onUpdateProject({ shellArchitecture: item.val })}
                className={`p-3.5 rounded-xl border-2 text-left transition flex items-start gap-3 ${
                  active
                    ? 'border-[#002870] bg-blue-50/70'
                    : 'border-slate-200 bg-slate-50/50 hover:border-slate-300'
                }`}
              >
                {item.val === 'Container' ? (
                  <Box className={`w-5 h-5 mt-0.5 flex-shrink-0 ${active ? 'navy-text' : 'text-slate-400'}`} />
                ) : (
                  <Building2 className={`w-5 h-5 mt-0.5 flex-shrink-0 ${active ? 'navy-text' : 'text-slate-400'}`} />
                )}
                <div>
                  <div className="font-bold navy-text text-sm">{item.title}</div>
                  <div className="text-slate-600 mt-0.5">{item.sub}</div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Live White-Space Area & Equipment KPI Strip */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200">
            <span className="text-slate-500 block">Total White-Space</span>
            <span className="text-base font-black navy-text">{eng.totalItWhiteSpaceSqm} m²</span>
            <span className="text-[10px] text-slate-500 block">
              {eng.pods.length} {isBnM ? 'BnM Bays' : 'IT Pods'} • {eng.activeRacks.length} Racks
            </span>
          </div>
          <div className="p-3 rounded-xl bg-sky-50/70 border border-sky-200">
            <span className="text-slate-500 block">Internal Floor CDUs</span>
            <span className="text-base font-black text-sky-900">
              {eng.whiteSpace.internalCduCount} ({eng.whiteSpace.internalCduFootprintSqm} m²)
            </span>
            <span className="text-[10px] text-slate-500 block">Secondary Loop (Zero Yard CDUs)</span>
          </div>
          <div className="p-3 rounded-xl bg-teal-50/70 border border-teal-200">
            <span className="text-slate-500 block">Mandatory Room PACs</span>
            <span className="text-base font-black text-teal-900">
              {eng.whiteSpace.mandatoryPacCount} × 80kW ({eng.whiteSpace.pacFootprintSqm} m²)
            </span>
            <span className="text-[10px] text-slate-500 block">24°C Ambient & Dew-Point Control</span>
          </div>
          <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200">
            <span className="text-slate-500 block">Roof / Yard Chillers</span>
            <span className="text-base font-black text-amber-900">
              {eng.whiteSpace.chillerUnitsCount} × 1000kW
            </span>
            <span className="text-[10px] text-slate-500 block">
              Load: {eng.whiteSpace.totalChillerLoadKw} kW ({project.chillerPlacement === 'ContainerRoof' ? 'Roof' : 'Yard'})
            </span>
          </div>
          <div className="p-3 rounded-xl bg-slate-100 border border-slate-300">
            <span className="text-slate-500 block">Aisles, PDUs & Growth</span>
            <span className="text-base font-black text-slate-900">
              {Math.round(eng.aisleServiceAreaSqm + eng.whiteSpace.pduFootprintSqm + eng.futureGrowthAreaSqm)} m²
            </span>
            <span className="text-[10px] text-slate-500 block">
              {project.frontServiceClearanceMm}mm F / {project.rearServiceClearanceMm}mm R
            </span>
          </div>
        </div>
      </div>

      {/* Parametric Container Geometry & Metallurgy Designer */}
      {!isBnM && (
        <div className="bg-white rounded-2xl card-shadow border border-slate-200 p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
            <div>
              <h3 className="text-base font-bold navy-text">Parametric Container Shell & Packing Designer</h3>
              <p className="text-slate-500">
                Choose a Standard Container Catalog preset or customize dimensions, metallurgy, plenum height, and unit pricing.
              </p>
            </div>
            <button
              onClick={handleSaveCurrentShell}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
            >
              <Save className="w-3.5 h-3.5" />
              Save Shell to Master Catalog
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Container Catalog Preset</label>
              <select
                value={project.containerCatalogId}
                onChange={e => applyCatalogPreset(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white font-bold navy-text"
              >
                <option value="custom">Custom Parametric Sizing</option>
                {containerCatalog.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Container Sizing Mode</label>
              <select
                value={project.containerLengthMode}
                onChange={e =>
                  onUpdateProject({
                    containerLengthMode: e.target.value as ProjectDeal['containerLengthMode']
                  })
                }
                className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white font-bold"
              >
                <option value="CustomOptimum">Custom Optimum (Auto-Fit Length)</option>
                <option value="ISO40">40 ft ISO High-Cube (12.19m)</option>
                <option value="ISO20">20 ft ISO Edge Pod (6.06m)</option>
                <option value="AllInOne">All-in-One Integrated Pod (12.19m)</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Hall Assembly Topology</label>
              <select
                value={project.hallTopology}
                onChange={e =>
                  onUpdateProject({ hallTopology: e.target.value as ProjectDeal['hallTopology'] })
                }
                className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white font-bold"
              >
                <option value="GangedLinear">Ganged Linear Modular Hall</option>
                <option value="GangedUShaped">Ganged U-Shaped Courtyard</option>
                <option value="Isolated">Isolated Standalone Pods</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Rack Packing Strategy</label>
              <select
                value={project.packingStrategy}
                onChange={e =>
                  onUpdateProject({ packingStrategy: e.target.value as ProjectDeal['packingStrategy'] })
                }
                className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white font-bold"
              >
                <option value="MinCapex">Min CapEx (Mixed High-Density Packing)</option>
                <option value="Segregated">Segregated (1 SKU Type per Pod)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            <div>
              <label className="block font-bold text-slate-600 mb-1">Max Length (mm)</label>
              <input
                type="number"
                step={250}
                min={6000}
                max={16000}
                value={project.maxCustomLengthMm}
                onChange={e => onUpdateProject({ maxCustomLengthMm: Number(e.target.value), containerCatalogId: 'custom' })}
                className="w-full border rounded-lg px-2.5 py-1.5 font-bold"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-600 mb-1">Width (mm)</label>
              <input
                type="number"
                step={100}
                min={2400}
                max={5500}
                value={project.containerWidthMm}
                onChange={e => onUpdateProject({ containerWidthMm: Number(e.target.value), containerCatalogId: 'custom' })}
                className="w-full border rounded-lg px-2.5 py-1.5 font-bold"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-600 mb-1">Height (mm)</label>
              <input
                type="number"
                step={100}
                min={2800}
                max={4800}
                value={project.containerHeightMm}
                onChange={e => onUpdateProject({ containerHeightMm: Number(e.target.value), containerCatalogId: 'custom' })}
                className="w-full border rounded-lg px-2.5 py-1.5 font-bold"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-600 mb-1">Raised Plenum (mm)</label>
              <input
                type="number"
                step={50}
                min={300}
                max={1200}
                value={project.plenumHeightMm}
                onChange={e => onUpdateProject({ plenumHeightMm: Number(e.target.value) })}
                className="w-full border rounded-lg px-2.5 py-1.5 font-bold"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-600 mb-1">Shell Metallurgy</label>
              <input
                type="text"
                value={project.metallurgy}
                onChange={e => onUpdateProject({ metallurgy: e.target.value })}
                className="w-full border rounded-lg px-2.5 py-1.5 font-bold"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-600 mb-1">Bespoke Shell ₹/Pod</label>
              <input
                type="number"
                placeholder="Auto parametric"
                value={project.bespokeContainerPriceInr}
                onChange={e =>
                  onUpdateProject({
                    bespokeContainerPriceInr: e.target.value === '' ? '' : Number(e.target.value)
                  })
                }
                className="w-full border rounded-lg px-2.5 py-1.5 font-bold"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 pt-1 text-slate-700">
            <label className="inline-flex items-center gap-2 font-semibold cursor-pointer">
              <input
                type="checkbox"
                checked={project.airlockVestibule}
                onChange={e => onUpdateProject({ airlockVestibule: e.target.checked })}
                className="w-4 h-4"
              />
              Include Positive-Pressure Airlock Vestibule (+1.4m)
            </label>
            <label className="inline-flex items-center gap-2 font-semibold cursor-pointer">
              <input
                type="checkbox"
                checked={project.emiShielding}
                onChange={e => onUpdateProject({ emiShielding: e.target.checked })}
                className="w-4 h-4"
              />
              EMI/RFI Shielding & Seismic Gussets
            </label>
            <div className="ml-auto font-bold navy-text">
              Active Pod Spec:{' '}
              {pod0
                ? `${(pod0.extLengthMm / 1000).toFixed(2)}m L × ${(pod0.extWidthMm / 1000).toFixed(2)}m W × ${(pod0.extHeightMm / 1000).toFixed(2)}m H • ${(pod0.grossRiggingKg / 1000).toFixed(1)}T Gross • ${pod0.bayUtilPct}% Bay Fill`
                : 'Add racks in Wizard'}
            </div>
          </div>
        </div>
      )}

      {/* White-Space Airflow, Aisle Containment & Clearances */}
      <div className="bg-white rounded-2xl card-shadow border border-slate-200 p-5 space-y-4">
        <h3 className="text-base font-bold navy-text">White-Space Airflow, Containment & Clearances</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Aisle Containment Topology</label>
            <select
              value={project.containmentType}
              onChange={e =>
                onUpdateProject({ containmentType: e.target.value as ProjectDeal['containmentType'] })
              }
              className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white font-bold navy-text"
            >
              <option value="ColdAisleContainment">Cold Aisle Containment (CAC)</option>
              <option value="HotAisleContainment">Hot Aisle Containment (HAC)</option>
            </select>
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">Cold Air Delivery Direction</label>
            <select
              value={project.airflowDelivery}
              onChange={e =>
                onUpdateProject({ airflowDelivery: e.target.value as ProjectDeal['airflowDelivery'] })
              }
              className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white font-bold"
            >
              <option value="UnderfloorPlenumUpward">
                Upward Cold Air via Raised Plenum ({project.plenumHeightMm}mm)
              </option>
              <option value="FrontToRearContainment">Front-to-Rear Flooded / In-Row Discharge</option>
            </select>
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">PAC & AC Chiller Placement</label>
            <select
              value={project.chillerPlacement}
              onChange={e =>
                onUpdateProject({ chillerPlacement: e.target.value as ProjectDeal['chillerPlacement'] })
              }
              className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white font-bold"
            >
              <option value="ContainerRoof">Container Roof-Mounted Chillers</option>
              <option value="DedicatedYardPad">Dedicated Yard Chiller Pad</option>
            </select>
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">Front / Rear Service Clearances</label>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                step={100}
                value={project.frontServiceClearanceMm}
                onChange={e => onUpdateProject({ frontServiceClearanceMm: Number(e.target.value) })}
                className="w-20 border rounded-lg px-2 py-1.5 bg-white font-bold text-center"
              />
              <span>/</span>
              <input
                type="number"
                step={100}
                value={project.rearServiceClearanceMm}
                onChange={e => onUpdateProject({ rearServiceClearanceMm: Number(e.target.value) })}
                className="w-20 border rounded-lg px-2 py-1.5 bg-white font-bold text-center"
              />
              <span className="text-slate-400">mm</span>
            </div>
          </div>
        </div>

        {/* Customer Container & Rack Branding Engine */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
          <div>
            <h4 className="font-bold navy-text text-sm">Customer Enclosure & Rack Branding (Deferred Artwork Supported)</h4>
            <p className="text-slate-500">
              Locks custom RAL paint booth & decal prep costs into the BOQ even when client vector artwork arrives later.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Branding & Artwork Status</label>
              <select
                value={project.brandingMode}
                onChange={e =>
                  onUpdateProject({ brandingMode: e.target.value as ProjectDeal['brandingMode'] })
                }
                className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white font-bold"
              >
                <option value="standard">Standard OEM Finish (RAL 7035)</option>
                <option value="custom_ready">Customer Branding (Vector Logo Ready)</option>
                <option value="custom_tbd">Customer Branding Requested (Artwork Files Later)</option>
              </select>
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Rack Enclosure / Bezel Finish</label>
              <select
                value={project.rackBezelFinish}
                onChange={e => onUpdateProject({ rackBezelFinish: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white"
              >
                <option value="Matte Black + Brand Orange Trim">Matte Black + Brand Orange Trim</option>
                <option value="Sovereign White Enclosure (RAL 9016)">Sovereign White Enclosure (RAL 9016)</option>
                <option value="Custom Client RAL & Door Emblem (TBD)">Custom Client RAL & Door Emblem (TBD)</option>
              </select>
            </div>
          </div>

          {project.brandingMode !== 'standard' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="flex items-center gap-2 bg-white p-2 rounded-lg border border-slate-200">
                <input
                  type="color"
                  value={project.exteriorColorHex}
                  onChange={e => onUpdateProject({ exteriorColorHex: e.target.value })}
                  className="w-7 h-7 cursor-pointer"
                />
                <div className="flex-1">
                  <span className="text-[10px] text-slate-400 block">Exterior Shell RAL</span>
                  <input
                    type="text"
                    value={project.exteriorRalLabel}
                    onChange={e => onUpdateProject({ exteriorRalLabel: e.target.value })}
                    className="w-full font-bold text-xs outline-none"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2 bg-white p-2 rounded-lg border border-slate-200">
                <input
                  type="color"
                  value={project.interiorColorHex}
                  onChange={e => onUpdateProject({ interiorColorHex: e.target.value })}
                  className="w-7 h-7 cursor-pointer"
                />
                <div className="flex-1">
                  <span className="text-[10px] text-slate-400 block">Interior Wall RAL</span>
                  <input
                    type="text"
                    value={project.interiorRalLabel}
                    onChange={e => onUpdateProject({ interiorRalLabel: e.target.value })}
                    className="w-full font-bold text-xs outline-none"
                  />
                </div>
              </div>
              <div className="bg-white p-2 rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-400 block">Upload Client Logo (Optional)</span>
                <input type="file" accept="image/*" onChange={handleClientLogoUpload} className="text-[11px] w-full mt-0.5" />
              </div>
            </div>
          )}

          {project.brandingMode === 'custom_tbd' && (
            <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-300 text-amber-950 font-medium">
              <strong>Deferred Artwork Caveat Active:</strong> Custom paint booth & decal prep is priced in the BOQ, while per-unit datasheets carry <code>[CLIENT ARTWORK PENDING — FILES LATER]</code> until files are uploaded.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
