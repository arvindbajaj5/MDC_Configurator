import React from 'react';

interface SliderInputProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  hint?: string;
  onChange: (value: number) => void;
}

export const SliderInput: React.FC<SliderInputProps> = ({
  label,
  value,
  min,
  max,
  step = 1,
  unit,
  hint,
  onChange
}) => {
  const handleNumeric = (raw: string) => {
    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) return;
    onChange(Math.min(max, Math.max(min, parsed)));
  };

  return (
    <div className="border border-slate-200 rounded-cad bg-white px-2.5 py-2">
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-700 truncate">
          {label}
        </label>
        <div className="flex items-center gap-1 shrink-0">
          <input
            type="number"
            value={value}
            min={min}
            max={max}
            step={step}
            onChange={(e) => handleNumeric(e.target.value)}
            className="w-20 text-right font-mono text-xs font-semibold text-brand-navy border border-slate-300 rounded-cad px-1.5 py-0.5 focus:outline-none focus:border-brand-orange"
          />
          {unit && <span className="text-[11px] font-mono text-slate-500">{unit}</span>}
        </div>
      </div>
      <input
        type="range"
        className="mdc-slider w-full"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <div className="flex items-center justify-between mt-1 text-[10px] font-mono text-slate-400">
        <span>
          {min}
          {unit ? ` ${unit}` : ''}
        </span>
        {hint && <span className="text-slate-500 font-sans truncate max-w-[60%]">{hint}</span>}
        <span>
          {max}
          {unit ? ` ${unit}` : ''}
        </span>
      </div>
    </div>
  );
};
