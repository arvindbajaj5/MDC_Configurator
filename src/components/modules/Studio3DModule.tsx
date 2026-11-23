import React, { Suspense, useState } from 'react';
import { Box, Eye, Layers, RotateCcw } from 'lucide-react';
import type { DealConfig, FullEngineeringOutput } from '../../types/schema';
import type { CameraPreset, StudioLayers, StudioViewLevel } from '../studio3d/ThreeViewport';

const LazyThreeViewport = React.lazy(() =>
  import('../studio3d/ThreeViewport').then((m) => ({ default: m.ThreeViewport }))
);

interface Studio3DModuleProps {
  deal: DealConfig;
  eng: FullEngineeringOutput;
}

export const Studio3DModule: React.FC<Studio3DModuleProps> = ({ deal, eng }) => {
  const [viewLevel, setViewLevel] = useState<StudioViewLevel>('yard');
  const [preset, setPreset] = useState<CameraPreset>('iso');
  const [layers, setLayers] = useState<StudioLayers>({
    shell: true,
    cooling: true,
    electrical: true,
    foundation: true,
    perimeter: true
  });

  const toggleLayer = (key: keyof StudioLayers) =>
    setLayers((prev) => ({ ...prev, [key]: !prev[key] }));

  return (
    <div className="space-y-3">
      <div className="bg-white border border-slate-200 rounded-cad p-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Box className="w-4 h-4 text-brand-orange" />
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-brand-navy">
              360° Interactive Multi-Level 3D Studio (Lazy Three.js WebGL)
            </h2>
            <p className="text-[11px] text-slate-500">
              Drag to orbit, scroll/pinch to zoom — inspect yard 3-zone isolation, internal CDUs &amp; subterranean piles.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {(
            [
              { id: 'yard', label: '1. Site & Yard Aerial' },
              { id: 'container', label: '2. Container Interior' },
              { id: 'bnm', label: '3. BnM Hall Interior' }
            ] as const
          ).map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => setViewLevel(v.id)}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded-cad border ${
                viewLevel === v.id
                  ? 'bg-brand-navy text-white border-brand-navy'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>

      <div className="relative">
        <Suspense
          fallback={
            <div className="h-[390px] sm:h-[440px] bg-cad-bg text-sky-400 border border-slate-800 rounded-cad flex items-center justify-center font-mono text-xs">
              Loading Three.js WebGL Studio Chunk...
            </div>
          }
        >
          <LazyThreeViewport
            deal={deal}
            eng={eng}
            viewLevel={viewLevel}
            cameraPreset={preset}
            layers={layers}
          />
        </Suspense>

        {/* Camera Presets Overlay */}
        <div className="absolute top-2.5 left-2.5 flex items-center gap-1 bg-slate-900/85 border border-slate-700 rounded-cad p-1">
          <Eye className="w-3.5 h-3.5 text-sky-400 ml-1" />
          {(
            [
              { id: 'iso', label: 'Iso' },
              { id: 'top', label: 'Top' },
              { id: 'elev', label: 'Elev' },
              { id: 'walk', label: 'Walk' }
            ] as const
          ).map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setPreset(c.id)}
              className={`px-2 py-0.5 text-[10px] font-mono font-semibold rounded-cad ${
                preset === c.id ? 'bg-brand-orange text-white' : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              {c.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setPreset('iso')}
            className="p-1 text-slate-400 hover:text-white"
            title="Reset Camera"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
        </div>

        {/* Live Telemetry Legend */}
        <div className="absolute bottom-2.5 left-2.5 right-2.5 flex flex-wrap items-center justify-between gap-2 bg-slate-900/85 border border-slate-700 rounded-cad px-2.5 py-1.5 text-[10px] font-mono text-slate-200">
          <div className="flex flex-wrap items-center gap-3">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 bg-brand-cobalt inline-block rounded-sm" />
              {viewLevel === 'yard' ? `${eng.mep.chillerCountTotal}x Chillers (${deal.chillerPlacement})` : `${eng.mep.internalCduCountTotal}x Internal CDUs`}
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 bg-brand-emerald inline-block rounded-sm" />
              {viewLevel === 'yard' ? `${eng.electrical.dgCountTotal}x CPCB-IV+ DGs` : `${eng.mep.pacCountTotal}x Mandatory 80kW PACs`}
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 bg-brand-amber inline-block rounded-sm" />
              {eng.electrical.busductRunsCount}x {eng.electrical.busductIpRating} Busducts
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 bg-brand-orange inline-block rounded-sm" />
              {eng.civil.requiresPiling ? `4.5m Piles Active (${eng.civil.pileCount} Nos)` : `${eng.civil.embedmentDepthM}m RCC Plinth`}
            </span>
          </div>
          <span className="text-sky-400">Yard CDUs: 0 (Enforced)</span>
        </div>
      </div>

      {/* Layer Visibility Toggles */}
      <div className="bg-white border border-slate-200 rounded-cad px-3 py-2 flex flex-wrap items-center gap-3 text-xs">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
          <Layers className="w-3.5 h-3.5 text-brand-navy" />
          Layers:
        </span>
        {(
          [
            ['shell', 'Enclosure / Roof Shell'],
            ['cooling', 'Cooling & Piping'],
            ['electrical', 'Electrical / Busducts'],
            ['foundation', 'Foundation / 4.5m Piles'],
            ['perimeter', 'Perimeter & MMR Vaults']
          ] as const
        ).map(([key, label]) => (
          <label key={key} className="flex items-center gap-1.5 cursor-pointer text-[11px] font-medium text-slate-700">
            <input
              type="checkbox"
              checked={layers[key]}
              onChange={() => toggleLayer(key)}
              className="accent-brand-orange"
            />
            {label}
          </label>
        ))}
      </div>
    </div>
  );
};
