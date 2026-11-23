import React from 'react';
import { Plus, Trash2, Truck } from 'lucide-react';
import { buildDefaultRiggingManifest } from '../../engines/auditAndSummary';
import type { DealConfig, FullEngineeringOutput, RiggingManifestRow } from '../../types/schema';
import { SliderInput } from '../controls/SliderInput';

interface LogisticsRiggingModuleProps {
  deal: DealConfig;
  eng: FullEngineeringOutput;
  onPatchDeal: (updater: (d: DealConfig) => DealConfig) => void;
}

export const LogisticsRiggingModule: React.FC<LogisticsRiggingModuleProps> = ({
  deal,
  eng,
  onPatchDeal
}) => {
  const manifest = buildDefaultRiggingManifest(deal, eng);

  const updateManifest = (next: RiggingManifestRow[]) => {
    onPatchDeal((d) => ({ ...d, riggingManifest: next }));
  };

  const addRow = () => {
    updateManifest([
      ...manifest,
      {
        id: `RIG-${String(manifest.length + 1).padStart(2, '0')}`,
        equipment: 'Custom Heavy Skid / Auxiliary Module',
        quantity: 1,
        unitWeightTons: 12,
        transportMode: 'Low-Bed Trailer',
        craneSpec: '100T Mobile Crane',
        spreaderRequired: false
      }
    ]);
  };

  return (
    <div className="space-y-3 text-xs">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 bg-white border border-slate-200 rounded-cad p-3">
        <SliderInput
          label="Heaviest Single Lift"
          value={deal.logistics.heaviestLiftTons}
          min={10}
          max={80}
          step={1}
          unit="Tons"
          onChange={(v) => onPatchDeal((d) => ({ ...d, logistics: { ...d.logistics, heaviestLiftTons: v } }))}
        />
        <SliderInput
          label="Mobile Crane Capacity"
          value={deal.logistics.craneTonnage}
          min={80}
          max={500}
          step={10}
          unit="T"
          onChange={(v) => onPatchDeal((d) => ({ ...d, logistics: { ...d.logistics, craneTonnage: v } }))}
        />
        <SliderInput
          label="Working Boom Radius"
          value={deal.logistics.boomRadiusM}
          min={10}
          max={45}
          step={1}
          unit="m"
          onChange={(v) => onPatchDeal((d) => ({ ...d, logistics: { ...d.logistics, boomRadiusM: v } }))}
        />
        <SliderInput
          label="Hydraulic Axle Trailers"
          value={deal.logistics.hydraulicAxleTrailers}
          min={1}
          max={12}
          step={1}
          unit="Nos"
          onChange={(v) =>
            onPatchDeal((d) => ({ ...d, logistics: { ...d.logistics, hydraulicAxleTrailers: v } }))
          }
        />
        <SliderInput
          label="Steel Road / Crane Mats"
          value={deal.logistics.steelRoadMatsCount}
          min={12}
          max={80}
          step={2}
          unit="Mats"
          onChange={(v) =>
            onPatchDeal((d) => ({ ...d, logistics: { ...d.logistics, steelRoadMatsCount: v } }))
          }
        />
        <SliderInput
          label="Site Gate Turning Radius"
          value={deal.logistics.siteTurningRadiusM}
          min={12}
          max={30}
          step={1}
          unit="m"
          onChange={(v) =>
            onPatchDeal((d) => ({ ...d, logistics: { ...d.logistics, siteTurningRadiusM: v } }))
          }
        />
      </div>

      {/* Editable Rigging Manifest Table */}
      <div className="bg-white border border-slate-200 rounded-cad overflow-hidden">
        <div className="px-3 py-2 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <h3 className="font-bold uppercase tracking-wider text-brand-navy flex items-center gap-1.5">
            <Truck className="w-3.5 h-3.5 text-brand-orange" />
            Editable Heavy-Lift Rigging &amp; Trailer Manifest (Feeds R-101)
          </h3>
          <button
            type="button"
            onClick={addRow}
            className="px-2.5 py-1 bg-brand-navy text-white rounded-cad text-[11px] font-semibold flex items-center gap-1"
          >
            <Plus className="w-3 h-3" /> Add Lift Item
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase text-slate-600">
                <th className="px-2.5 py-2">Equipment Package</th>
                <th className="px-2.5 py-2 w-20">Qty</th>
                <th className="px-2.5 py-2 w-24">Unit Tons</th>
                <th className="px-2.5 py-2">Transport Mode</th>
                <th className="px-2.5 py-2">Crane Spec</th>
                <th className="px-2.5 py-2 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {manifest.map((row, idx) => (
                <tr key={row.id}>
                  <td className="px-2.5 py-1.5">
                    <input
                      type="text"
                      value={row.equipment}
                      onChange={(e) => {
                        const copy = [...manifest];
                        copy[idx] = { ...row, equipment: e.target.value };
                        updateManifest(copy);
                      }}
                      className="w-full border border-slate-200 rounded-cad px-2 py-1 text-xs"
                    />
                  </td>
                  <td className="px-2.5 py-1.5">
                    <input
                      type="number"
                      min={1}
                      value={row.quantity}
                      onChange={(e) => {
                        const copy = [...manifest];
                        copy[idx] = { ...row, quantity: Math.max(1, Number(e.target.value) || 1) };
                        updateManifest(copy);
                      }}
                      className="w-16 font-mono border border-slate-200 rounded-cad px-1.5 py-1 text-right"
                    />
                  </td>
                  <td className="px-2.5 py-1.5">
                    <input
                      type="number"
                      min={1}
                      step={0.5}
                      value={row.unitWeightTons}
                      onChange={(e) => {
                        const copy = [...manifest];
                        copy[idx] = { ...row, unitWeightTons: Math.max(0.5, Number(e.target.value) || 1) };
                        updateManifest(copy);
                      }}
                      className="w-20 font-mono border border-slate-200 rounded-cad px-1.5 py-1 text-right"
                    />
                  </td>
                  <td className="px-2.5 py-1.5">
                    <input
                      type="text"
                      value={row.transportMode}
                      onChange={(e) => {
                        const copy = [...manifest];
                        copy[idx] = { ...row, transportMode: e.target.value };
                        updateManifest(copy);
                      }}
                      className="w-full border border-slate-200 rounded-cad px-2 py-1 text-xs"
                    />
                  </td>
                  <td className="px-2.5 py-1.5">
                    <input
                      type="text"
                      value={row.craneSpec}
                      onChange={(e) => {
                        const copy = [...manifest];
                        copy[idx] = { ...row, craneSpec: e.target.value };
                        updateManifest(copy);
                      }}
                      className="w-full border border-slate-200 rounded-cad px-2 py-1 text-xs"
                    />
                  </td>
                  <td className="px-2.5 py-1.5 text-right">
                    <button
                      type="button"
                      onClick={() => updateManifest(manifest.filter((r) => r.id !== row.id))}
                      className="p-1 text-slate-400 hover:text-red-600"
                      title="Delete row"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
