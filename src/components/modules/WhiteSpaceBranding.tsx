import React, { useRef, useState } from 'react';
import { Image as ImageIcon, Palette, ShieldCheck, Trash2, Upload } from 'lucide-react';
import type { DealConfig, FullEngineeringOutput } from '../../types/schema';

interface WhiteSpaceBrandingProps {
  deal: DealConfig;
  eng: FullEngineeringOutput;
  onPatchDeal: (updater: (d: DealConfig) => DealConfig) => void;
}

const MAX_LOGO_BYTES = 2 * 1024 * 1024; // 2 MB input guard before client-side resize

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') resolve(reader.result);
      else reject(new Error('Failed to read image file.'));
    };
    reader.onerror = () => reject(new Error('Could not read the selected image file.'));
    reader.readAsDataURL(file);
  });
}

function optimizeLogoDataUrl(file: File): Promise<string> {
  return readFileAsDataUrl(file).then((rawDataUrl) => {
    // Keep small crisp SVGs as-is
    if (file.type === 'image/svg+xml' && rawDataUrl.length < 220_000) {
      return rawDataUrl;
    }

    return new Promise<string>((resolve) => {
      const img = new window.Image();
      img.onload = () => {
        const maxW = 360;
        const maxH = 120;
        const scale = Math.min(1, maxW / Math.max(1, img.width), maxH / Math.max(1, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(rawDataUrl);
          return;
        }
        ctx.clearRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = () => resolve(rawDataUrl);
      img.src = rawDataUrl;
    });
  });
}

export const WhiteSpaceBranding: React.FC<WhiteSpaceBrandingProps> = ({
  deal,
  eng,
  onPatchDeal
}) => {
  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const [logoError, setLogoError] = useState<string | null>(null);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoError(null);

    try {
      if (!file.type.startsWith('image/')) {
        setLogoError('Please select a PNG, JPG, SVG, or WebP image file.');
        return;
      }
      if (file.size > MAX_LOGO_BYTES) {
        setLogoError('Logo image must be under 2 MB.');
        return;
      }
      const dataUrl = await optimizeLogoDataUrl(file);
      onPatchDeal((d) => ({
        ...d,
        branding: { ...d.branding, logoUrl: dataUrl }
      }));
    } catch (err) {
      setLogoError(err instanceof Error ? err.message : 'Logo upload failed.');
    } finally {
      if (logoInputRef.current) {
        logoInputRef.current.value = '';
      }
    }
  };

  const handleRemoveLogo = () => {
    setLogoError(null);
    onPatchDeal((d) => ({
      ...d,
      branding: { ...d.branding, logoUrl: undefined }
    }));
  };

  const shellPreviewStyle: Record<DealConfig['branding']['containerFinish'], string> = {
    'Sovereign White': 'bg-slate-100 text-slate-900 border-slate-300',
    'Matte Graphite': 'bg-slate-800 text-white border-slate-700',
    'Deep Navy': 'bg-brand-navy text-white border-slate-800',
    'Custom RAL': 'bg-slate-700 text-white border-slate-600'
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
      <section className="bg-white border border-slate-200 rounded-cad p-3 space-y-3 text-xs">
        <h2 className="text-xs font-bold uppercase tracking-wider text-brand-navy border-b border-slate-100 pb-2">
          White-Space Topology (Zero Yard CDUs Enforced)
        </h2>

        <div className="border border-emerald-200 bg-emerald-50 rounded-cad p-2.5 text-emerald-950">
          <p className="font-semibold flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-brand-emerald" />
            Architectural Invariant Verified
          </p>
          <p className="mt-1 text-[11px]">
            <strong>Yard CDUs: {eng.mep.yardCduCount}</strong> (strictly prohibited). All{' '}
            <strong>{eng.mep.internalCduCountTotal}x 1.35 MW CDU towers</strong> and{' '}
            <strong>{eng.mep.pacCountTotal}x mandatory 80 kW PACs</strong> are housed inside conditioned white-space,
            paired with <strong>{eng.mep.chillerCountTotal}x {deal.chillerPlacement.toLowerCase()}-mounted adiabatic chillers</strong>.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="border border-slate-200 rounded-cad p-2.5">
            <p className="text-[10px] uppercase text-slate-500">Enclosure Mode</p>
            <p className="font-bold text-brand-navy mt-0.5">
              {deal.architecture === 'Container' ? `${eng.mep.podCount}x ${deal.containerUnitMw} MW Pods` : 'BnM High-Bay Hall'}
            </p>
            <p className="text-[11px] font-mono text-slate-500">White-Space: {eng.mep.whiteSpaceAreaM2} m²</p>
          </div>
          <div className="border border-slate-200 rounded-cad p-2.5">
            <p className="text-[10px] uppercase text-slate-500">Rack Geometry</p>
            <p className="font-bold text-brand-navy mt-0.5">{eng.mep.totalRacks} Racks @ {deal.avgRackKw} kW</p>
            <p className="text-[11px] font-mono text-slate-500">2.5m H × 900mm W × 1200mm D</p>
          </div>
        </div>

        <div className="flex gap-2">
          {(['Container', 'BnM'] as const).map((arch) => (
            <button
              key={arch}
              type="button"
              onClick={() => onPatchDeal((d) => ({ ...d, architecture: arch }))}
              className={`flex-1 py-2 rounded-cad font-semibold border ${
                deal.architecture === arch
                  ? 'bg-brand-navy text-white border-brand-navy'
                  : 'bg-slate-50 text-slate-700 border-slate-200'
              }`}
            >
              Switch to {arch === 'Container' ? 'Modular Container Pods' : 'BnM Data Hall'}
            </button>
          ))}
        </div>
      </section>

      <section className="bg-white border border-slate-200 rounded-cad p-3 space-y-3 text-xs">
        <h2 className="text-xs font-bold uppercase tracking-wider text-brand-navy border-b border-slate-100 pb-2 flex items-center gap-1.5">
          <Palette className="w-3.5 h-3.5 text-brand-orange" />
          App Logo, Container Livery &amp; Deferred Artwork Caveat
        </h2>

        {/* App & Enclosure Logo Upload (App UI Only — Stored in Deal State) */}
        <div className="border border-slate-200 rounded-cad p-2.5 bg-slate-50 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-[10px] font-bold uppercase text-slate-600">
                Company / Client Logo (App Header &amp; Livery Preview)
              </p>
              <p className="text-[11px] text-slate-500">
                PNG, SVG, JPG, or WebP (auto-optimized for browser storage; app-only).
              </p>
            </div>
            <input
              ref={logoInputRef}
              type="file"
              accept="image/png,image/jpeg,image/svg+xml,image/webp"
              onChange={handleLogoUpload}
              className="hidden"
            />
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => logoInputRef.current?.click()}
                className="px-2.5 py-1.5 bg-brand-navy text-white rounded-cad text-[11px] font-semibold hover:bg-brand-navy/90 flex items-center gap-1"
              >
                <Upload className="w-3 h-3" />
                {deal.branding.logoUrl ? 'Replace' : 'Upload Logo'}
              </button>
              {deal.branding.logoUrl && (
                <button
                  type="button"
                  onClick={handleRemoveLogo}
                  className="p-1.5 border border-red-200 bg-white text-red-600 hover:bg-red-50 rounded-cad"
                  title="Remove logo"
                  aria-label="Remove logo"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {logoError && (
            <p className="text-[11px] text-red-600 font-medium">{logoError}</p>
          )}

          {/* Live Shell Livery & Logo Preview Strip */}
          <div
            className={`border rounded-cad overflow-hidden ${shellPreviewStyle[deal.branding.containerFinish]}`}
          >
            <div className="h-1.5 w-full" style={{ backgroundColor: deal.branding.primaryHex }} />
            <div className="px-3 py-2 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                {deal.branding.logoUrl ? (
                  <div className="bg-white border border-slate-200 rounded-cad px-2 py-1 shrink-0">
                    <img
                      src={deal.branding.logoUrl}
                      alt={`${deal.branding.clientName || 'Client'} logo`}
                      className="h-7 max-w-[120px] object-contain"
                    />
                  </div>
                ) : (
                  <div className="h-8 w-8 rounded-cad border border-dashed border-current/40 flex items-center justify-center opacity-60 shrink-0">
                    <ImageIcon className="w-4 h-4" />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="font-bold text-xs truncate">
                    {deal.branding.clientName || 'Client Brand Label'}
                  </p>
                  <p className="text-[10px] opacity-75 font-mono truncate">
                    {deal.branding.containerFinish} • {deal.architecture === 'Container' ? `${deal.containerUnitMw} MW Pod` : 'BnM Hall'}
                  </p>
                </div>
              </div>
              <span
                className="w-3 h-8 rounded-sm shrink-0 border border-white/30"
                style={{ backgroundColor: deal.branding.accentHex }}
                title={`Accent: ${deal.branding.accentHex}`}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <label className="block">
            <span className="text-[10px] font-semibold uppercase text-slate-500">Client Brand Label</span>
            <input
              type="text"
              value={deal.branding.clientName}
              onChange={(e) =>
                onPatchDeal((d) => ({ ...d, branding: { ...d.branding, clientName: e.target.value } }))
              }
              className="mt-1 w-full border border-slate-300 rounded-cad px-2.5 py-1.5"
            />
          </label>
          <label className="block">
            <span className="text-[10px] font-semibold uppercase text-slate-500">External Shell Finish</span>
            <select
              value={deal.branding.containerFinish}
              onChange={(e) =>
                onPatchDeal((d) => ({
                  ...d,
                  branding: {
                    ...d.branding,
                    containerFinish: e.target.value as DealConfig['branding']['containerFinish']
                  }
                }))
              }
              className="mt-1 w-full border border-slate-300 rounded-cad px-2.5 py-1.5 bg-white"
            >
              <option value="Sovereign White">Sovereign White (Solar Reflective)</option>
              <option value="Matte Graphite">Matte Graphite (Industrial)</option>
              <option value="Deep Navy">Deep Navy (#002870)</option>
              <option value="Custom RAL">Custom RAL Industrial Coat</option>
            </select>
          </label>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <label className="flex items-center justify-between border border-slate-200 rounded-cad px-2.5 py-1.5">
            <span className="font-semibold text-slate-700">Primary Stripe</span>
            <input
              type="color"
              value={deal.branding.primaryHex}
              onChange={(e) =>
                onPatchDeal((d) => ({ ...d, branding: { ...d.branding, primaryHex: e.target.value } }))
              }
              className="w-8 h-6 cursor-pointer"
            />
          </label>
          <label className="flex items-center justify-between border border-slate-200 rounded-cad px-2.5 py-1.5">
            <span className="font-semibold text-slate-700">Accent Trim</span>
            <input
              type="color"
              value={deal.branding.accentHex}
              onChange={(e) =>
                onPatchDeal((d) => ({ ...d, branding: { ...d.branding, accentHex: e.target.value } }))
              }
              className="w-8 h-6 cursor-pointer"
            />
          </label>
        </div>

        <div className="border border-amber-200 bg-amber-50 rounded-cad p-2.5 space-y-1.5">
          <label className="flex items-center gap-2 font-semibold text-amber-950 cursor-pointer">
            <input
              type="checkbox"
              checked={deal.branding.artworkDeferred}
              onChange={(e) =>
                onPatchDeal((d) => ({ ...d, branding: { ...d.branding, artworkDeferred: e.target.checked } }))
              }
              className="accent-brand-orange"
            />
            Include Deferred External Artwork / Livery Caveat in Proposals
          </label>
          <textarea
            rows={2}
            value={deal.branding.deferredCaveatNote}
            onChange={(e) =>
              onPatchDeal((d) => ({ ...d, branding: { ...d.branding, deferredCaveatNote: e.target.value } }))
            }
            className="w-full border border-amber-300 bg-white rounded-cad p-2 text-[11px]"
          />
        </div>
      </section>
    </div>
  );
};
