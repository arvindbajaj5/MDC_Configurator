import React, { useRef, useState } from 'react';
import { Download, FileImage, ZoomIn, ZoomOut } from 'lucide-react';
import { resolveElectricalStandards } from '../../engines/electricalSld';
import {
  renderCivilPlinthPng,
  renderElectricalSldPng,
  renderMepSchematicPng
} from '../../services/cadCanvasRenderers';
import type { CadSheetId, DealConfig, FullEngineeringOutput } from '../../types/schema';

export const CAD_SHEET_CATALOG: Array<{ id: CadSheetId; title: string; discipline: string }> = [
  { id: 'A-101', title: 'Site Master Plan & 3-Zone Isolation', discipline: 'Architectural' },
  { id: 'A-102', title: 'White-Space Pod / Hall Rack Plan', discipline: 'White-Space' },
  { id: 'C-101', title: 'Civil Plinth, Pile Cap & Drainage', discipline: 'Civil / Geotech' },
  { id: 'E-201', title: 'Electrical Single-Line Diagram (SLD)', discipline: 'Electrical' },
  { id: 'G-101', title: 'Earthing Mesh & Lightning Grid', discipline: 'Grounding' },
  { id: 'R-101', title: 'Heavy-Lift Rigging & Crane Swing', discipline: 'Logistics' },
  { id: 'M-301', title: 'Cooling Hydronics & MEP P&ID', discipline: 'Thermal / MEP' }
];

interface CadStudioModuleProps {
  deal: DealConfig;
  eng: FullEngineeringOutput;
  initialSheet?: CadSheetId;
  onNotify: (tone: 'success' | 'error' | 'info', title: string, detail?: string) => void;
}

export const CadStudioModule: React.FC<CadStudioModuleProps> = ({
  deal,
  eng,
  initialSheet = 'E-201',
  onNotify
}) => {
  const [sheet, setSheet] = useState<CadSheetId>(initialSheet);
  const [zoom, setZoom] = useState(1);
  const svgRef = useRef<SVGSVGElement | null>(null);

  // Guaranteed non-null standards even for legacy V11/V12 deals (Bug #1 permanent fix)
  const standards = resolveElectricalStandards(eng.electrical?.standards ?? deal.standards);
  const meta = CAD_SHEET_CATALOG.find((c) => c.id === sheet) ?? CAD_SHEET_CATALOG[0];

  const handleDownloadSvg = () => {
    if (!svgRef.current) return;
    const serializer = new XMLSerializer();
    const source = serializer.serializeToString(svgRef.current);
    const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${deal.id}_${sheet}.svg`;
    a.click();
    URL.revokeObjectURL(url);
    onNotify('success', `Exported CAD Sheet ${sheet} (SVG)`, meta.title);
  };

  const handleDownloadPng = () => {
    const dataUrl =
      sheet === 'E-201'
        ? renderElectricalSldPng(deal, eng, { theme: 'dark' })
        : sheet === 'M-301'
          ? renderMepSchematicPng(deal, eng, { theme: 'dark' })
          : renderCivilPlinthPng(deal, eng, { theme: 'dark' });
    if (!dataUrl) {
      onNotify('error', 'Canvas PNG Render Unavailable', 'Browser canvas context not initialized.');
      return;
    }
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `${deal.id}_${sheet}_highdpi.png`;
    a.click();
    onNotify('success', `Exported High-DPI PNG (${sheet})`, 'Ready for PPTX/RFP insertion.');
  };

  return (
    <div className="space-y-3">
      {/* Sheet Switcher Strip */}
      <div className="bg-white border border-slate-200 rounded-cad p-2.5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1">
          {CAD_SHEET_CATALOG.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setSheet(item.id)}
              className={`px-2.5 py-1 text-[11px] font-mono font-semibold rounded-cad border ${
                sheet === item.id
                  ? 'bg-brand-navy text-white border-brand-navy'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              {item.id}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(0.8, Number((z - 0.15).toFixed(2))))}
            className="p-1.5 border border-slate-300 rounded-cad bg-white hover:bg-slate-50"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="font-mono text-[11px] text-slate-600 w-10 text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(1.6, Number((z + 0.15).toFixed(2))))}
            className="p-1.5 border border-slate-300 rounded-cad bg-white hover:bg-slate-50"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleDownloadSvg}
            className="px-2 py-1 text-[11px] font-semibold border border-slate-300 rounded-cad bg-white hover:bg-slate-50 flex items-center gap-1"
          >
            <Download className="w-3 h-3" /> SVG
          </button>
          <button
            type="button"
            onClick={handleDownloadPng}
            className="px-2 py-1 text-[11px] font-semibold bg-brand-orange text-white rounded-cad hover:bg-brand-orange/90 flex items-center gap-1"
          >
            <FileImage className="w-3 h-3" /> PNG
          </button>
        </div>
      </div>

      {/* Dark Blueprint CAD Viewport */}
      <div className="bg-cad-bg border border-slate-800 rounded-cad overflow-auto p-2">
        <div style={{ transform: `scale(${zoom})`, transformOrigin: 'top left', minWidth: 820 }}>
          <svg
            ref={svgRef}
            viewBox="0 0 960 520"
            className="w-full h-auto block"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <pattern id="cadGrid" width="24" height="24" patternUnits="userSpaceOnUse">
                <path d="M 24 0 L 0 0 0 24" fill="none" stroke="#162238" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="960" height="520" fill="#0B1220" />
            <rect width="960" height="520" fill="url(#cadGrid)" />
            <rect x="12" y="12" width="936" height="496" fill="none" stroke="#334155" strokeWidth="1.5" />

            {/* Sheet Header Bar */}
            <rect x="12" y="12" width="936" height="36" fill="#0F1B33" />
            <rect x="12" y="12" width="6" height="36" fill="#FF5539" />
            <text x="28" y="34" fill="#F8FAFC" fontFamily="monospace" fontSize="13" fontWeight="700">
              {sheet}  |  {meta.title.toUpperCase()}
            </text>
            <text x="935" y="34" fill="#38BDF8" fontFamily="monospace" fontSize="11" textAnchor="end">
              {deal.targetItLoadMw.toFixed(1)} MW • {deal.climate.city.toUpperCase()} • {deal.climate.seismicZone}
            </text>

            {/* SHEET A-101: Site Master Plan */}
            {sheet === 'A-101' && (
              <g>
                <rect x="44" y="72" width="872" height="350" fill="none" stroke="#475569" strokeDasharray="6 4" strokeWidth="1.5" />
                <text x="56" y="90" fill="#94A3B8" fontFamily="monospace" fontSize="10">
                  6.0m NBC FIRE TENDER PERIMETER ROAD • TOTAL PLOT: {eng.mep.totalSiteAreaM2.toLocaleString()} m²
                </text>
                {/* Zone 1 */}
                <rect x="76" y="110" width="380" height="280" fill="#10203B" stroke="#00B290" strokeWidth="2" />
                <text x="90" y="132" fill="#00B290" fontFamily="monospace" fontSize="11" fontWeight="700">
                  ZONE 1: WHITE-SPACE ({eng.mep.threeZoneIsolation.zone1WhiteSpaceM2} m²)
                </text>
                {Array.from({ length: Math.min(8, eng.mep.podCount) }).map((_, i) => (
                  <g key={i}>
                    <rect
                      x={94 + (i % 4) * 86}
                      y={152 + Math.floor(i / 4) * 105}
                      width="74"
                      height="86"
                      fill="#1E293B"
                      stroke="#38BDF8"
                      strokeWidth="1.2"
                    />
                    <text
                      x={131 + (i % 4) * 86}
                      y={199 + Math.floor(i / 4) * 105}
                      fill="#E2E8F0"
                      fontFamily="monospace"
                      fontSize="10"
                      textAnchor="middle"
                    >
                      POD-{i + 1}
                    </text>
                  </g>
                ))}
                {/* Zone 2 */}
                <rect x="480" y="110" width="205" height="280" fill="#101B36" stroke="#1C38F5" strokeWidth="2" />
                <text x="492" y="132" fill="#60A5FA" fontFamily="monospace" fontSize="11" fontWeight="700">
                  ZONE 2: COOLING ({eng.mep.threeZoneIsolation.zone2HeatRejectionYardM2} m²)
                </text>
                <text x="492" y="152" fill="#CBD5E1" fontFamily="monospace" fontSize="10">
                  {eng.mep.chillerCountTotal}x 2.2 MW Chillers ({deal.chillerPlacement})
                </text>
                <text x="492" y="170" fill="#00B290" fontFamily="monospace" fontSize="10">
                  ZERO YARD CDUs ENFORCED
                </text>
                {/* Zone 3 */}
                <rect x="705" y="110" width="190" height="280" fill="#1E1824" stroke="#FF5539" strokeWidth="2" />
                <text x="717" y="132" fill="#FF5539" fontFamily="monospace" fontSize="11" fontWeight="700">
                  ZONE 3: POWER ({eng.mep.threeZoneIsolation.zone3ElectricalPowerYardM2} m²)
                </text>
                <text x="717" y="156" fill="#E2E8F0" fontFamily="monospace" fontSize="10">
                  {eng.electrical.incomingVoltageKv} kV GIS + {eng.electrical.transformerCountTotal}x K-13
                </text>
                <text x="717" y="178" fill="#E2E8F0" fontFamily="monospace" fontSize="10">
                  {eng.electrical.dgCountTotal}x 2.5 MVA DGs
                </text>
                <text x="717" y="200" fill="#FFB600" fontFamily="monospace" fontSize="10">
                  {deal.includeBessRideThrough ? `BESS ${eng.electrical.bessPowerMw} MW` : 'UPS Only'}
                </text>
                {/* Dual Diverse MMR Vaults */}
                <rect x="48" y="114" width="22" height="54" fill="#8B5CF6" />
                <rect x="48" y="330" width="22" height="54" fill="#8B5CF6" />
                <text x="58" y="255" fill="#C4B5FD" fontFamily="monospace" fontSize="9" transform="rotate(-90 58 255)">
                  DUAL MMR VAULTS ({deal.telecom.diverseVaultSeparationM}m SPLIT)
                </text>
              </g>
            )}

            {/* SHEET A-102: White-Space Pod / Hall Plan */}
            {sheet === 'A-102' && (
              <g>
                <rect x="70" y="84" width="820" height="320" fill="#0F172A" stroke="#38BDF8" strokeWidth="2" />
                <text x="86" y="106" fill="#38BDF8" fontFamily="monospace" fontSize="11" fontWeight="700">
                  {deal.architecture === 'Container' ? `${deal.containerUnitMw} MW MODULAR AI DLC POD FLOORPLAN` : 'BnM HIGH-BAY DATA HALL GALLERY'} • RACKS: 2.5m H × 900mm W × 1200mm D
                </text>
                {/* Internal CDU Gallery Left */}
                <rect x="88" y="128" width="110" height="252" fill="#1E3A8A" stroke="#60A5FA" strokeWidth="1.5" />
                <text x="143" y="248" fill="#FFFFFF" fontFamily="monospace" fontSize="11" textAnchor="middle" fontWeight="700">
                  INTERNAL CDUs
                </text>
                <text x="143" y="266" fill="#BFDBFE" fontFamily="monospace" fontSize="10" textAnchor="middle">
                  {eng.mep.internalCduCountTotal}x 1.35 MW
                </text>
                {/* Hot/Cold Aisle + Racks */}
                {Array.from({ length: 10 }).map((_, i) => (
                  <g key={i}>
                    <rect x={222 + i * 52} y="132" width="44" height="82" fill="#1E293B" stroke="#00B290" />
                    <rect x={222 + i * 52} y="294" width="44" height="82" fill="#1E293B" stroke="#00B290" />
                  </g>
                ))}
                <rect x="222" y="226" width="514" height="56" fill="#0C4A6E" stroke="#38BDF8" strokeDasharray="4 3" />
                <text x="479" y="258" fill="#E0F2FE" fontFamily="monospace" fontSize="11" textAnchor="middle">
                  CONTAINED COLD AISLE (MAX INLET {deal.maxInletTempC}°C) • {eng.mep.totalRacks} TOTAL RACKS @ {deal.avgRackKw} kW
                </text>
                {/* Mandatory 80 kW PAC Wall Right */}
                <rect x="758" y="128" width="114" height="252" fill="#065F46" stroke="#34D399" strokeWidth="1.5" />
                <text x="815" y="246" fill="#FFFFFF" fontFamily="monospace" fontSize="11" textAnchor="middle" fontWeight="700">
                  80 kW PACs
                </text>
                <text x="815" y="264" fill="#A7F3D0" fontFamily="monospace" fontSize="10" textAnchor="middle">
                  {eng.mep.pacCountTotal} MANDATORY
                </text>
              </g>
            )}

            {/* SHEET C-101: Civil Plinth & Pile Cap */}
            {sheet === 'C-101' && (
              <g>
                <line x1="40" y1="265" x2="920" y2="265" stroke="#00B290" strokeWidth="2.5" />
                <text x="52" y="256" fill="#00B290" fontFamily="monospace" fontSize="10">
                  FGL (FINISHED GRADE LEVEL) — {eng.civil.drainageSlope} STORMWATER SLOPE
                </text>
                <rect x="210" y="120" width="540" height="100" fill="#1E293B" stroke="#38BDF8" strokeWidth="2" />
                <text x="480" y="175" fill="#F8FAFC" fontFamily="monospace" fontSize="12" textAnchor="middle" fontWeight="700">
                  SUPERSTRUCTURE GRAVITY LOAD: {eng.civil.totalDeadAndLiveLoadKn.toLocaleString()} kN
                </text>
                <rect x="190" y="220" width="580" height="45" fill="#475569" stroke="#CBD5E1" />
                <text x="480" y="247" fill="#FFFFFF" fontFamily="monospace" fontSize="11" textAnchor="middle">
                  M35 RCC PLINTH (+{deal.civil.plinthClearHeightM.toFixed(2)}m FGL) • {eng.civil.anchorBoltSpec}
                </text>
                {eng.civil.requiresPiling ? (
                  <g>
                    <rect x="180" y="265" width="600" height="36" fill="#FF5539" />
                    <text x="480" y="287" fill="#FFFFFF" fontFamily="monospace" fontSize="11" textAnchor="middle" fontWeight="700">
                      4.5m RCC PILE CAP (SBC {eng.civil.allowableSbcKpa} kPa &lt; 110 kPa THRESHOLD)
                    </text>
                    {Array.from({ length: 8 }).map((_, i) => (
                      <rect key={i} x={208 + i * 74} y="301" width="22" height="118" fill="#94A3B8" stroke="#E2E8F0" />
                    ))}
                  </g>
                ) : (
                  <g>
                    <rect x="180" y="265" width="600" height="80" fill="#1E3A8A" stroke="#60A5FA" strokeWidth="1.5" />
                    <text x="480" y="310" fill="#E0F2FE" fontFamily="monospace" fontSize="12" textAnchor="middle" fontWeight="700">
                      SHALLOW RCC PLINTH / RAFT EMBEDMENT: {eng.civil.embedmentDepthM}m BELOW FGL
                    </text>
                  </g>
                )}
                <text x="480" y="445" fill="#FFB600" fontFamily="monospace" fontSize="11" textAnchor="middle">
                  SBC {eng.civil.allowableSbcKpa} kPa vs IMPOSED {eng.civil.imposedBearingKpa} kN/m² • BEARING FoS: {eng.civil.bearingFoS}x ({eng.civil.fosStatus}) • CONCRETE: {eng.civil.concreteVolumeM3} m³
                </text>
              </g>
            )}

            {/* SHEET E-201: Electrical SLD (Typed Standards Guard) */}
            {sheet === 'E-201' && (
              <g>
                <rect x="34" y="64" width="892" height="30" fill="#064E3B" stroke="#10B981" />
                <text x="48" y="83" fill="#A7F3D0" fontFamily="monospace" fontSize="11" fontWeight="700">
                  STANDARDS VERIFIED: {standards.wiringCode} • {standards.harmonicsStandard} • {standards.earthingStandard} • {standards.kFactorRating} / {standards.busductIpRating}
                </text>
                {eng.electrical.nodes.map((node, idx) => {
                  const x = 34 + idx * 151;
                  return (
                    <g key={node.id}>
                      {idx > 0 && (
                        <line x1={x - 15} y1="210" x2={x} y2="210" stroke="#FFB600" strokeWidth="3" />
                      )}
                      <rect x={x} y="125" width="136" height="170" fill="#111C33" stroke="#38BDF8" strokeWidth="1.5" />
                      <rect x={x} y="125" width="136" height="24" fill="#002870" />
                      <text x={x + 68} y="141" fill="#FFFFFF" fontFamily="monospace" fontSize="9.5" textAnchor="middle" fontWeight="700">
                        {node.zone.toUpperCase()}
                      </text>
                      <text x={x + 8} y="168" fill="#FF5539" fontFamily="monospace" fontSize="11" fontWeight="700">
                        {node.voltageKv} kV
                      </text>
                      <text x={x + 8} y="192" fill="#F8FAFC" fontFamily="sans-serif" fontSize="10" fontWeight="600">
                        {node.label.slice(0, 20)}
                      </text>
                      <text x={x + 8} y="207" fill="#F8FAFC" fontFamily="sans-serif" fontSize="10">
                        {node.label.slice(20, 40)}
                      </text>
                      <text x={x + 8} y="242" fill="#FFB600" fontFamily="monospace" fontSize="9.5">
                        {node.ratingLabel.slice(0, 21)}
                      </text>
                      <text x={x + 8} y="276" fill="#94A3B8" fontFamily="monospace" fontSize="9">
                        {node.redundancy}
                      </text>
                    </g>
                  );
                })}
                <text x="480" y="346" fill="#CBD5E1" fontFamily="monospace" fontSize="11" textAnchor="middle">
                  GROSS FACILITY DEMAND: {eng.electrical.grossFacilityMw} MW ({eng.electrical.grossFacilityMva} MVA @ 0.92 PF) • CEA REGULATION: {standards.ceaRegulation}
                </text>
              </g>
            )}

            {/* SHEET G-101: Grounding & Lightning Grid */}
            {sheet === 'G-101' && (
              <g>
                <rect x="90" y="90" width="780" height="310" fill="none" stroke="#10B981" strokeWidth="2.5" />
                {Array.from({ length: 6 }).map((_, i) => (
                  <line key={`v-${i}`} x1={90 + i * 156} y1="90" x2={90 + i * 156} y2="400" stroke="#10B981" strokeDasharray="5 4" />
                ))}
                {Array.from({ length: 4 }).map((_, i) => (
                  <line key={`h-${i}`} x1="90" y1={90 + i * 103} x2="870" y2={90 + i * 103} stroke="#10B981" strokeDasharray="5 4" />
                ))}
                {[
                  [90, 90], [480, 90], [870, 90],
                  [90, 400], [480, 400], [870, 400]
                ].map(([cx, cy], idx) => (
                  <g key={idx}>
                    <circle cx={cx} cy={cy} r="10" fill="#FF5539" stroke="#FFFFFF" strokeWidth="1.5" />
                    <text x={cx} y={cy + 3} fill="#FFFFFF" fontFamily="monospace" fontSize="8" textAnchor="middle">
                      EP{idx + 1}
                    </text>
                  </g>
                ))}
                <text x="480" y="248" fill="#A7F3D0" fontFamily="monospace" fontSize="13" textAnchor="middle" fontWeight="700">
                  COPPER-BONDED EQUIPOTENTIAL EARTH MESH (&lt; 1.0 OHM)
                </text>
                <text x="480" y="272" fill="#CBD5E1" fontFamily="monospace" fontSize="11" textAnchor="middle">
                  {standards.earthingStandard} • LIGHTNING ARRESTOR: {standards.lightningProtection}
                </text>
              </g>
            )}

            {/* SHEET R-101: Rigging & Crane Swing */}
            {sheet === 'R-101' && (
              <g>
                <circle cx="480" cy="255" r="155" fill="rgba(255,85,57,0.08)" stroke="#FF5539" strokeDasharray="8 5" strokeWidth="2" />
                <circle cx="480" cy="255" r="95" fill="none" stroke="#FFB600" strokeDasharray="4 4" strokeWidth="1.5" />
                <rect x="444" y="232" width="72" height="46" fill="#FFB600" stroke="#FFFFFF" />
                <text x="480" y="259" fill="#0F172A" fontFamily="monospace" fontSize="10" fontWeight="700" textAnchor="middle">
                  {deal.logistics.craneTonnage}T CRANE
                </text>
                <line x1="480" y1="255" x2="625" y2="200" stroke="#FF5539" strokeWidth="3" />
                <rect x="620" y="176" width="90" height="44" fill="#1E293B" stroke="#38BDF8" strokeWidth="1.5" />
                <text x="665" y="202" fill="#E2E8F0" fontFamily="monospace" fontSize="9.5" textAnchor="middle">
                  MAX LIFT {deal.logistics.heaviestLiftTons}T
                </text>
                <text x="480" y="438" fill="#E2E8F0" fontFamily="monospace" fontSize="11" textAnchor="middle">
                  BOOM RADIUS: {deal.logistics.boomRadiusM}m • ROAD MATS: {deal.logistics.steelRoadMatsCount} • SPREADER: {deal.logistics.spreaderBeamCapacityTons}T • TURNING RADIUS: {deal.logistics.siteTurningRadiusM}m
                </text>
              </g>
            )}

            {/* SHEET M-301: Cooling Hydronics & MEP P&ID */}
            {sheet === 'M-301' && (
              <g>
                <rect x="50" y="110" width="240" height="230" fill="#101B36" stroke="#1C38F5" strokeWidth="2" />
                <text x="170" y="138" fill="#60A5FA" fontFamily="monospace" fontSize="11" fontWeight="700" textAnchor="middle">
                  {deal.chillerPlacement.toUpperCase()} ADIABATIC CHILLERS
                </text>
                <text x="170" y="175" fill="#FFFFFF" fontFamily="monospace" fontSize="12" textAnchor="middle">
                  {eng.mep.chillerCountTotal}x 2.2 MW ({deal.redundancy})
                </text>
                <text x="170" y="205" fill="#94A3B8" fontFamily="monospace" fontSize="10" textAnchor="middle">
                  CHW Supply: {deal.chilledWaterSupplyTempC}°C
                </text>
                <text x="170" y="226" fill="#94A3B8" fontFamily="monospace" fontSize="10" textAnchor="middle">
                  Flow: {eng.mep.chwFlowRateLpm.toLocaleString()} LPM
                </text>

                <line x1="290" y1="190" x2="365" y2="190" stroke="#38BDF8" strokeWidth="4" />
                <line x1="365" y1="250" x2="290" y2="250" stroke="#FF5539" strokeWidth="4" />

                <rect x="365" y="110" width="245" height="230" fill="#0A2724" stroke="#00B290" strokeWidth="2" />
                <text x="488" y="138" fill="#34D399" fontFamily="monospace" fontSize="11" fontWeight="700" textAnchor="middle">
                  INTERNAL CDUs + 80 kW PACs
                </text>
                <text x="488" y="174" fill="#FFFFFF" fontFamily="monospace" fontSize="11" textAnchor="middle">
                  {eng.mep.internalCduCountTotal}x 1.35 MW Internal CDUs
                </text>
                <text x="488" y="200" fill="#A7F3D0" fontFamily="monospace" fontSize="11" textAnchor="middle">
                  {eng.mep.pacCountTotal}x Mandatory 80 kW PACs
                </text>
                <text x="488" y="232" fill="#FFB600" fontFamily="monospace" fontSize="10" textAnchor="middle">
                  YARD CDUs = 0 (STRICT)
                </text>
                <text x="488" y="264" fill="#CBD5E1" fontFamily="monospace" fontSize="10" textAnchor="middle">
                  FWS: {eng.mep.fwsFlowRateLpm.toLocaleString()} LPM @ {deal.fwsSupplyTempC}°C
                </text>

                <line x1="610" y1="190" x2="680" y2="190" stroke="#38BDF8" strokeWidth="4" />
                <line x1="680" y1="250" x2="610" y2="250" stroke="#FF5539" strokeWidth="4" />

                <rect x="680" y="110" width="230" height="230" fill="#1E293B" stroke="#FF5539" strokeWidth="2" />
                <text x="795" y="138" fill="#FF5539" fontFamily="monospace" fontSize="11" fontWeight="700" textAnchor="middle">
                  AI GPU RACK MANIFOLDS
                </text>
                <text x="795" y="178" fill="#FFFFFF" fontFamily="monospace" fontSize="12" textAnchor="middle">
                  {eng.mep.dlcHeatLoadMw} MW DLC ({deal.dlcSharePct}%)
                </text>
                <text x="795" y="204" fill="#CBD5E1" fontFamily="monospace" fontSize="11" textAnchor="middle">
                  {eng.mep.airHeatLoadMw} MW Air ({100 - deal.dlcSharePct}%)
                </text>
                <text x="795" y="242" fill="#00B290" fontFamily="monospace" fontSize="11" textAnchor="middle">
                  DESIGN PUE: {eng.mep.estimatedPue.toFixed(2)}
                </text>
              </g>
            )}

            {/* Engineering Title Block */}
            <rect x="12" y="466" width="936" height="42" fill="#0F1B33" stroke="#334155" />
            <text x="26" y="484" fill="#94A3B8" fontFamily="monospace" fontSize="9.5">
              PROJECT: {deal.name.toUpperCase()}
            </text>
            <text x="26" y="499" fill="#CBD5E1" fontFamily="monospace" fontSize="9.5">
              DISCIPLINE: {meta.discipline.toUpperCase()} • TIER: {deal.uptimeTier} ({deal.redundancy}) • REV: V13.0
            </text>
            <text x="934" y="491" fill="#FF5539" fontFamily="monospace" fontSize="11" fontWeight="700" textAnchor="end">
              SHEET {sheet} OF 7
            </text>
          </svg>
        </div>
      </div>
    </div>
  );
};
