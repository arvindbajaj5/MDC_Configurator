import React from 'react';
import { COLOR_THEMES, EQUIPMENT_COLOR_META } from '../data/masterCatalog';
import type { ColorPalette, EngineeringResult } from '../types/mdc';

interface ColorLegendBarProps {
  palette: ColorPalette;
  onUpdatePalette: (key: keyof Omit<ColorPalette, 'label'>, hex: string) => void;
  onApplyTheme: (themeKey: string) => void;
  eng?: EngineeringResult;
}

export const ColorLegendBar: React.FC<ColorLegendBarProps> = ({
  palette,
  onUpdatePalette,
  onApplyTheme,
  eng
}) => {
  return (
    <div className="bg-slate-50 p-3 border-b border-slate-200 space-y-2 text-xs">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-bold navy-text">Equipment Legend & Color Picker (3D & 2D CAD):</span>
          {Object.entries(COLOR_THEMES).map(([k, th]) => (
            <button
              key={k}
              onClick={() => onApplyTheme(k)}
              className="px-2 py-0.5 rounded bg-white border border-slate-300 hover:border-blue-600 text-[11px] font-bold text-slate-700"
            >
              {th.label}
            </button>
          ))}
        </div>
        {eng && (
          <div className="font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded">
            Occupied: {Math.round(eng.totalItWhiteSpaceSqm)} m² White-Space + {eng.totalNonItYardSqm} m² Yard = {eng.totalCampusOccupiedSqm} m² ({eng.plotUtilizationPct}% Plot)
          </div>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {EQUIPMENT_COLOR_META.map(([key, label]) => (
          <label
            key={key}
            className="inline-flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2 py-1 cursor-pointer hover:border-slate-400"
          >
            <input
              type="color"
              value={palette[key] || '#002870'}
              onChange={e => onUpdatePalette(key, e.target.value)}
              className="w-4 h-4 p-0 border-0 bg-transparent cursor-pointer"
            />
            <span className="text-[11px] font-medium text-slate-700">{label}</span>
          </label>
        ))}
      </div>
    </div>
  );
};
