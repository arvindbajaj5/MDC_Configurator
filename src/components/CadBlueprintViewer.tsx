import React, { useRef, useState } from 'react';
import { totalHsdK } from '../engine/engineeringEngine';
import type { ColorPalette, EngineeringResult, MasterStandards, ProjectDeal } from '../types/mdc';
import { ColorLegendBar } from './ColorLegendBar';

export type CadSheetId = 'A-101' | 'A-102' | 'C-101' | 'E-201' | 'E-202' | 'G-101' | 'R-101' | 'M-301';

export const CAD_SHEET_MANIFEST: { id: CadSheetId; title: string; scale: string }[] = [
  { id: 'A-101', title: 'Site & Yard GA Plan', scale: '1 : 250' },
  { id: 'A-102', title: 'Pod White-Space, PAC & CDU Plan', scale: '1 : 50' },
  { id: 'C-101', title: 'Civil Plinth & 4.5m Pile Cap Section', scale: '1 : 40' },
  { id: 'E-201', title: 'Yard-to-Hall Electrical SLD', scale: 'NTS' },
  { id: 'E-202', title: 'UPS, Battery & Switchgear Room GA', scale: '1 : 50' },
  { id: 'G-101', title: 'Earthing & Lightning Grid (NBCS 2026)', scale: '1 : 200' },
  { id: 'R-101', title: 'Cable Tray, Fiber & Roxtec Plan', scale: '1 : 50' },
  { id: 'M-301', title: 'Primary / Secondary Hydraulics P&ID', scale: 'NTS' }
];

interface CadBlueprintViewerProps {
  project: ProjectDeal;
  eng: EngineeringResult;
  standards: MasterStandards;
  palette: ColorPalette;
  logoDataUrl?: string;
  onUpdatePalette: (key: keyof Omit<ColorPalette, 'label'>, hex: string) => void;
  onApplyTheme: (themeKey: string) => void;
}

export const CadBlueprintViewer: React.FC<CadBlueprintViewerProps> = ({
  project,
  eng,
  standards,
  palette,
  logoDataUrl,
  onUpdatePalette,
  onApplyTheme
}) => {
  const [sheet, setSheet] = useState<CadSheetId>('A-101');
  const [paperMode, setPaperMode] = useState(true);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const bg = paperMode ? '#FFFFFF' : '#071224';
  const fg = paperMode ? '#0F172A' : '#E2E8F0';
  const dimCol = paperMode ? '#475569' : '#94A3B8';
  const accent = '#FF5539';
  const primary = paperMode ? '#002870' : '#38BDF8';

  const pod = eng.pods?.[0];
  const podLenM = pod ? (pod.extLengthMm / 1000).toFixed(2) : '13.50';
  const podWidM = pod ? (pod.extWidthMm / 1000).toFixed(2) : '4.20';

  const downloadActiveSheetSvg = () => {
    const svgEl = svgRef.current;
    if (!svgEl) return;
    const serializer = new XMLSerializer();
    const source = '<?xml version="1.0" encoding="UTF-8"?>\n' + serializer.serializeToString(svgEl);
    const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(project.name || 'MDC').replace(/[^a-zA-Z0-9_-]+/g, '_')}_${sheet}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const renderEngineeringTitleBlock = (sheetNo: CadSheetId, sheetTitle: string, scaleStr: string) => (
    <g>
      <rect x="10" y="10" width="1080" height="460" fill="none" stroke={primary} strokeWidth="2.5" />
      <rect x="18" y="18" width="1064" height="444" fill="none" stroke={primary} strokeWidth="0.8" />
      {['A', 'B', 'C', 'D'].map((letLbl, i) => (
        <text key={letLbl} x="14" y={75 + i * 110} fill={dimCol} fontSize="8" fontWeight="bold" textAnchor="middle">
          {letLbl}
        </text>
      ))}
      {['1', '2', '3', '4', '5', '6'].map((numLbl, i) => (
        <text key={numLbl} x={110 + i * 175} y="16" fill={dimCol} fontSize="8" fontWeight="bold" textAnchor="middle">
          {numLbl}
        </text>
      ))}
      {logoDataUrl && (
        <g>
          <rect
            x="648"
            y="394"
            width="92"
            height="68"
            fill="#FFFFFF"
            stroke={primary}
            strokeWidth="1.5"
          />
          <image
            href={logoDataUrl}
            x="654"
            y="400"
            width="80"
            height="56"
            preserveAspectRatio="xMidYMid meet"
          />
        </g>
      )}
      <rect
        x="740"
        y="394"
        width="342"
        height="68"
        fill={paperMode ? '#F8FAFC' : '#0F172A'}
        stroke={primary}
        strokeWidth="1.5"
      />
      <line x1="740" y1="416" x2="1082" y2="416" stroke={primary} strokeWidth="1" />
      <line x1="740" y1="438" x2="1082" y2="438" stroke={primary} strokeWidth="1" />
      <line x1="965" y1="394" x2="965" y2="462" stroke={primary} strokeWidth="1" />
      <text x="748" y="409" fill={accent} fontSize="9.5" fontWeight="bold">
        PROJECT: {(project.name || 'AI MDC').slice(0, 32)}
      </text>
      <text x="973" y="409" fill={fg} fontSize="9" fontWeight="bold">
        DWG: {sheetNo}
      </text>
      <text x="748" y="431" fill={fg} fontSize="9.5" fontWeight="bold">
        {sheetTitle}
      </text>
      <text x="973" y="431" fill={dimCol} fontSize="8.5">
        SCALE: {scaleStr}
      </text>
      <text x="748" y="453" fill={dimCol} fontSize="8.5">
        SITE: {(project.cityQuery || 'India').slice(0, 22)} • {project.seismicZone} • {project.uptimeTier}
      </text>
      <text x="973" y="453" fill="#059669" fontSize="8.5" fontWeight="bold">
        REV: V13.3 IFC
      </text>
    </g>
  );

  return (
    <div className="bg-white rounded-2xl card-shadow border border-slate-200 overflow-hidden">
      <div className="p-3 bg-slate-100 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          {CAD_SHEET_MANIFEST.map(item => (
            <button
              key={item.id}
              onClick={() => setSheet(item.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                sheet === item.id ? 'navy-bg text-white shadow' : 'bg-white border border-slate-300 text-slate-700'
              }`}
            >
              {item.id}: {item.title}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={downloadActiveSheetSvg}
            className="px-3 py-1.5 rounded-lg text-xs font-bold navy-bg text-white"
          >
            ⬇ Download {sheet} (.SVG)
          </button>
          <button
            onClick={() => setPaperMode(!paperMode)}
            className="px-3 py-1.5 rounded-lg text-xs font-bold border border-slate-400 bg-white"
          >
            {paperMode ? 'Dark CAD Mode' : 'White Paper Mode'}
          </button>
        </div>
      </div>

      <ColorLegendBar palette={palette} onUpdatePalette={onUpdatePalette} onApplyTheme={onApplyTheme} eng={eng} />

      <div className="p-4 flex justify-center" style={{ backgroundColor: bg }}>
        <svg ref={svgRef} viewBox="0 0 1100 480" className="w-full max-w-6xl border" style={{ borderColor: primary }}>
          <rect x="0" y="0" width="1100" height="480" fill={bg} />

          {sheet === 'A-101' && (
            <g>
              <text x="32" y="42" fill={accent} fontSize="13" fontWeight="bold">
                SITE GENERAL ARRANGEMENT & 3-ZONE SEPARATION PLAN (NBC PART 4 SETBACKS)
              </text>
              <rect x="36" y="56" width="685" height="390" fill="none" stroke={fg} strokeWidth="2" />
              <rect x="54" y="74" width="649" height="354" fill="none" stroke={accent} strokeWidth="1.2" strokeDasharray="6,4" />
              <text x="378" y="69" fill={accent} fontSize="9.5" fontWeight="bold" textAnchor="middle">
                {project.setbackMeters}m PERIMETER FIRE-TENDER DRIVEWAY (SWEPT TURNING RADIUS &gt;= {eng.logistics.minTurningRadiusM}m)
              </text>

              {/* Zone A: Compute Hall / Pods */}
              <rect x="70" y="90" width="265" height="240" fill={paperMode ? '#F8FAFC' : '#0F172A'} stroke={primary} strokeWidth="1.5" />
              <text x="202" y="108" fill={primary} fontSize="10" fontWeight="bold" textAnchor="middle">
                ZONE A: {eng.civil.isBnM ? 'BnM TECHNICAL HALL' : 'IT COMPUTE PODS'} ({Math.round(eng.totalItWhiteSpaceSqm)} m²)
              </text>
              {(eng.pods || []).slice(0, 4).map((p, idx) => (
                <g key={p.id}>
                  <rect x={84 + idx * 60} y="118" width="48" height="196" fill={palette.itPod} stroke="#FFFFFF" strokeWidth="1" />
                  <text
                    x={108 + idx * 60}
                    y="216"
                    fill="#FFFFFF"
                    fontSize="9.5"
                    fontWeight="bold"
                    textAnchor="middle"
                    transform={`rotate(-90, ${108 + idx * 60}, 216)`}
                  >
                    {p.label}
                  </text>
                </g>
              ))}
              <rect x="70" y="340" width="265" height="72" fill={palette.adminStage} />
              <text x="202" y="372" fill="#FFFFFF" fontSize="10" fontWeight="bold" textAnchor="middle">
                CARRIER MMR + NOC + STAGING BAY
              </text>
              <text x="202" y="388" fill="#E2E8F0" fontSize="9" textAnchor="middle">
                Dual Diverse North/South Fiber Vaults ({project.diverseVaultSeparationM}m sep.)
              </text>

              {/* Zone B: UPS / BESS */}
              <rect x="355" y="90" width="140" height="322" fill={palette.upsBess} />
              <text x="425" y="235" fill="#FFFFFF" fontSize="10.5" fontWeight="bold" textAnchor="middle">
                ZONE B: UPS & BESS
              </text>
              <text x="425" y="253" fill="#FFFFFF" fontSize="9.5" textAnchor="middle">
                {eng.upsContainersCount}× UPS + {eng.batteryContainersCount}× LFP
              </text>
              <text x="425" y="270" fill="#FFFFFF" fontSize="9" textAnchor="middle">
                ({eng.yardBreakdown.upsBessSqm} m²)
              </text>

              {/* Zone C: Open Outdoor Yard */}
              <rect x="515" y="90" width="172" height="72" fill={palette.transformer} />
              <text x="601" y="123" fill="#FFFFFF" fontSize="10" fontWeight="bold" textAnchor="middle">
                HT VCB & K-13 TRAFOS
              </text>
              <text x="601" y="139" fill="#FFFFFF" fontSize="9" textAnchor="middle">
                {eng.transformerUnits}×{eng.selTrafo.ratedCapacity}kVA ({eng.yardBreakdown.substationSqm}m²)
              </text>

              <rect x="515" y="172" width="172" height="72" fill={palette.dgSet} />
              <text x="601" y="205" fill="#FFFFFF" fontSize="10" fontWeight="bold" textAnchor="middle">
                CPCB IV+ DG & PESO
              </text>
              <text x="601" y="221" fill="#FFFFFF" fontSize="9" textAnchor="middle">
                {eng.dgUnitsCount}×{eng.selDg.ratedCapacity}kVA ({eng.yardBreakdown.dgPesoSqm}m²)
              </text>

              <rect x="515" y="254" width="172" height="72" fill={palette.coolerTank} />
              <text x="601" y="287" fill="#FFFFFF" fontSize="10" fontWeight="bold" textAnchor="middle">
                ADIABATIC COOLERS
              </text>
              <text x="601" y="303" fill="#FFFFFF" fontSize="9" textAnchor="middle">
                {eng.adiabaticUnits}×{eng.selCooler.ratedCapacity}kW + Tanks
              </text>

              <rect x="515" y="336" width="172" height="76" fill={palette.cduPump} />
              <text x="601" y="370" fill="#FFFFFF" fontSize="10" fontWeight="bold" textAnchor="middle">
                PUMP SKIDS & CHILLERS
              </text>
              <text x="601" y="386" fill="#FFFFFF" fontSize="9" textAnchor="middle">
                {eng.pumpSkidsCount} Pumps • Zero Yard CDUs
              </text>

              <text x="745" y="75" fill={primary} fontSize="11" fontWeight="bold">
                CAMPUS AREA & LOGISTICS SCHEDULE
              </text>
              <text x="745" y="100" fill={fg} fontSize="10">
                • Gross Plot: {Math.round(eng.grossPlotSqm).toLocaleString()} m² ({(eng.grossPlotSqm / 4046.8564).toFixed(2)} Acres)
              </text>
              <text x="745" y="122" fill={fg} fontSize="10">
                • IT White-Space: {eng.totalItWhiteSpaceSqm} m² ({eng.pods.length} Units)
              </text>
              <text x="745" y="144" fill={fg} fontSize="10">
                • Non-IT Technical Yard: {eng.totalNonItYardSqm} m²
              </text>
              <text x="745" y="166" fill={fg} fontSize="10">
                • Total Occupied: {eng.totalCampusOccupiedSqm} m² ({eng.plotUtilizationPct}% Net)
              </text>
              <text x="745" y="188" fill={fg} fontSize="10">
                • Laydown Staging Yard: {eng.logistics.laydownStagingSqm} m²
              </text>
              <text x="745" y="210" fill={fg} fontSize="10">
                • Mobile Crane: {eng.logistics.craneTonnage}T @ {project.craneWorkingRadiusM}m radius
              </text>
              <text x="745" y="232" fill="#059669" fontSize="10" fontWeight="bold">
                • MII Local Content: {eng.mii.miiClassLabel}
              </text>
              {renderEngineeringTitleBlock('A-101', 'MASTER SITE & YARD GA PLAN', '1 : 250')}
            </g>
          )}

          {sheet === 'A-102' && (
            <g>
              <text x="32" y="42" fill={accent} fontSize="13" fontWeight="bold">
                INTRA-CONTAINER / HALL WHITE-SPACE PLAN ({podLenM}m L × {podWidM}m W • {project.containmentType})
              </text>
              <line x1="45" y1="62" x2="715" y2="62" stroke={dimCol} strokeWidth="1" />
              <text x="380" y="57" fill={dimCol} fontSize="9.5" fontWeight="bold" textAnchor="middle">
                EXTERNAL LENGTH = {podLenM} m ({pod?.extLengthMm || 13500} mm)
              </text>
              {eng.civil.isBnM && project.bnmLayoutDataUrl && (
                <image
                  href={project.bnmLayoutDataUrl}
                  x="48"
                  y="75"
                  width="664"
                  height="304"
                  preserveAspectRatio="xMidYMid meet"
                  opacity="0.28"
                />
              )}
              <rect x="45" y="72" width="670" height="310" fill="none" stroke={fg} strokeWidth="2.5" />

              <rect x="47" y="74" width="84" height="306" fill={paperMode ? '#F1F5F9' : '#1E293B'} stroke={primary} />
              <text x="89" y="145" fill={fg} fontSize="9.5" fontWeight="bold" textAnchor="middle">
                AIRLOCK
              </text>
              <rect x="55" y="255" width="68" height="110" fill={palette.transformer} />
              <text x="89" y="305" fill="#FFFFFF" fontSize="8.5" fontWeight="bold" textAnchor="middle">
                INT. LV
              </text>
              <text x="89" y="318" fill="#FFFFFF" fontSize="8.5" fontWeight="bold" textAnchor="middle">
                PANEL
              </text>

              {(pod?.rowA || []).slice(0, 10).map((rk, i) => (
                <g key={`a-${i}`}>
                  <rect x={145 + i * 44} y="86" width="38" height="74" fill={rk.isDlc ? palette.dlcRack : palette.acRack} />
                  <text x={164 + i * 44} y="127" fill="#FFFFFF" fontSize="9" fontWeight="bold" textAnchor="middle">
                    A{i + 1}
                  </text>
                </g>
              ))}
              {(pod?.rowB || []).slice(0, 10).map((rk, i) => (
                <g key={`b-${i}`}>
                  <rect x={145 + i * 44} y="294" width="38" height="74" fill={rk.isDlc ? palette.dlcRack : palette.acRack} />
                  <text x={164 + i * 44} y="335" fill="#FFFFFF" fontSize="9" fontWeight="bold" textAnchor="middle">
                    B{i + 1}
                  </text>
                </g>
              ))}

              <rect x="145" y="176" width="445" height="102" fill={paperMode ? '#EFF6FF' : '#1E293B'} stroke={primary} strokeDasharray="4,3" />
              <text x="367" y="220" fill={primary} fontSize="10.5" fontWeight="bold" textAnchor="middle">
                {project.containmentType} ({project.frontServiceClearanceMm}mm FRONT CLEARANCE)
              </text>
              <text x="367" y="238" fill={dimCol} fontSize="9.5" textAnchor="middle">
                Airflow: {project.airflowDelivery} • Dual A/B Overhead Busways
              </text>

              <rect x="605" y="86" width="96" height="130" fill={palette.coolerTank} />
              <text x="653" y="145" fill="#FFFFFF" fontSize="9.5" fontWeight="bold" textAnchor="middle">
                WHITE-SPACE
              </text>
              <text x="653" y="160" fill="#FFFFFF" fontSize="9.5" fontWeight="bold" textAnchor="middle">
                PAC (80 kW)
              </text>

              <rect x="605" y="238" width="96" height="130" fill={palette.cduPump} />
              <text x="653" y="297" fill="#FFFFFF" fontSize="9.5" fontWeight="bold" textAnchor="middle">
                INTERNAL
              </text>
              <text x="653" y="312" fill="#FFFFFF" fontSize="9.5" fontWeight="bold" textAnchor="middle">
                CDU TOWER
              </text>

              <text x="745" y="75" fill={primary} fontSize="11" fontWeight="bold">
                WHITE-SPACE EQUIPMENT SCHEDULE
              </text>
              <text x="745" y="100" fill={fg} fontSize="10">
                • Total White-Space: {eng.totalItWhiteSpaceSqm} m²
              </text>
              <text x="745" y="122" fill={fg} fontSize="10">
                • Internal CDU Towers: {eng.whiteSpace.internalCduCount} ({eng.whiteSpace.internalCduFootprintSqm} m²)
              </text>
              <text x="745" y="144" fill={fg} fontSize="10">
                • Mandatory PAC Units: {eng.whiteSpace.mandatoryPacCount} ({eng.whiteSpace.pacFootprintSqm} m²)
              </text>
              <text x="745" y="166" fill={fg} fontSize="10">
                • Roof/Yard Chillers: {eng.whiteSpace.chillerUnitsCount} × 1000 kW
              </text>
              <text x="745" y="188" fill={fg} fontSize="10">
                • Clearances: {project.frontServiceClearanceMm}mm F / {project.rearServiceClearanceMm}mm R
              </text>
              <text x="745" y="210" fill={fg} fontSize="10">
                • Growth Reserve: {project.futureGrowthReservePct}% ({Math.round(eng.futureGrowthAreaSqm)} m²)
              </text>
              <text x="745" y="232" fill={fg} fontSize="10">
                • Raised Floor: {eng.raisedFloor.enabled ? `${eng.raisedFloor.heightMm}mm (${eng.raisedFloor.pedestalStemCount} stems, ${eng.raisedFloor.tilePointLoadKn}kN)` : 'Slab-Mounted'}
              </text>
              <text x="745" y="254" fill={fg} fontSize="10">
                • Rack Sub-Frames: {eng.raisedFloor.heavyRackSubFramesCount} Direct-to-Slab
              </text>
              {renderEngineeringTitleBlock('A-102', 'WHITE-SPACE, PAC & CDU FLOOR PLAN', '1 : 50')}
            </g>
          )}

          {sheet === 'C-101' && (
            <g>
              <text x="32" y="42" fill={accent} fontSize="13" fontWeight="bold">
                CIVIL PLINTH, {eng.civil.isWeakSoil ? '4.5m PILE CAP' : 'PAD FOOTING'} & SEISMIC ANCHORAGE — {project.cityQuery}
              </text>
              <rect x="140" y="72" width="480" height="125" fill={palette.itPod} fillOpacity="0.14" stroke={palette.itPod} strokeWidth="2.5" />
              <text x="380" y="120" fill={primary} fontSize="12" fontWeight="bold" textAnchor="middle">
                {eng.civil.isBnM
                  ? `BRICK-AND-MORTAR (${project.bnmColumnGridM} GRID • ${project.bnmSlabThicknessMm}mm SLAB)`
                  : `MODULAR CORTEN-A POD (${podLenM}m × ${podWidM}m)`}
              </text>
              <text x="380" y="141" fill={fg} fontSize="10" textAnchor="middle">
                Loaded Unit Mass: {eng.civil.unitGrossTonnes} T • Floor Load: {eng.civil.floorPressureKpa} kN/m² • Corner Reaction: {eng.civil.cornerNodeKn} kN
              </text>
              <text x="380" y="160" fill="#059669" fontSize="9.5" fontWeight="bold" textAnchor="middle">
                Coating: {project.brandingMode === 'standard' ? 'RAL 7035 OEM Standard' : `${project.exteriorRalLabel} / ${project.interiorRalLabel}`}
              </text>

              <rect x="135" y="188" width="26" height="14" fill={accent} />
              <rect x="599" y="188" width="26" height="14" fill={accent} />
              <text x="148" y="182" fill={accent} fontSize="9" fontWeight="bold" textAnchor="middle">
                M30 Seismic Bolt
              </text>
              <text x="612" y="182" fill={accent} fontSize="9" fontWeight="bold" textAnchor="middle">
                M30 Seismic Bolt
              </text>

              <rect x="115" y="202" width="530" height="48" fill="#CBD5E1" stroke="#334155" strokeWidth="2" />
              <text x="380" y="230" fill="#0F172A" fontSize="11" fontWeight="bold" textAnchor="middle">
                M35 REINFORCED CEMENT CONCRETE (RCC) PLINTH (+{eng.civil.floodPlinthMm} mm FLOOD LIFT)
              </text>

              <line x1="95" y1="202" x2="95" y2="250" stroke={accent} strokeWidth="2" />
              <text x="88" y="230" fill={accent} fontSize="10" fontWeight="bold" textAnchor="end">
                +{eng.civil.floodPlinthMm}mm
              </text>

              <line x1="30" y1="258" x2="115" y2="250" stroke="#059669" strokeWidth="2.5" />
              <line x1="645" y1="250" x2="720" y2="258" stroke="#059669" strokeWidth="2.5" />

              {eng.civil.isWeakSoil ? (
                <g>
                  <rect x="135" y="250" width="490" height="32" fill="#94A3B8" stroke="#1E293B" strokeWidth="1.5" />
                  <text x="380" y="270" fill="#0F172A" fontSize="10" fontWeight="bold" textAnchor="middle">
                    RCC PILE CAP BEAM (4.5m EMBEDMENT DEPTH • WEAK SOIL SBC {eng.civil.sbc} kN/m²)
                  </text>
                  {[180, 310, 450, 580].map((px, idx) => (
                    <g key={idx}>
                      <rect x={px - 12} y="282" width="24" height="92" fill="#64748B" stroke="#0F172A" />
                      <text x={px} y="334" fill="#FFFFFF" fontSize="8" fontWeight="bold" textAnchor="middle">
                        4.5m
                      </text>
                    </g>
                  ))}
                </g>
              ) : (
                <rect x="105" y="250" width="550" height="48" fill="#E2E8F0" stroke="#64748B" strokeDasharray="4" />
              )}

              <text x="745" y="75" fill={primary} fontSize="11" fontWeight="bold">
                FOUNDATION & BEARING SCHEDULE
              </text>
              <text x="745" y="100" fill={fg} fontSize="10">
                • Soil Bearing (SBC): {eng.civil.sbc} kN/m²
              </text>
              <text x="745" y="122" fill={fg} fontSize="10">
                • Embedment Depth: {eng.civil.embedmentDepthM} m ({eng.civil.isWeakSoil ? 'Pile Cap' : 'IS 1904 Pad'})
              </text>
              <text x="745" y="144" fill={fg} fontSize="10">
                • Flood Plinth Lift: +{eng.civil.floodPlinthMm} mm
              </text>
              <text x="745" y="166" fill={fg} fontSize="10">
                • Imposed Bearing: {eng.civil.imposedBearingKpa} kN/m²
              </text>
              <text
                x="745"
                y="188"
                fill={eng.civil.bearingSafetyFactor >= 2.0 ? '#059669' : '#D97706'}
                fontSize="10"
                fontWeight="bold"
              >
                • Bearing FoS: {eng.civil.bearingSafetyFactor}× ({eng.civil.bearingSafetyFactor >= 2.0 ? 'Safe >= 2.0×' : 'Review'})
              </text>
              <text x="745" y="210" fill={fg} fontSize="10">
                • Mobile Crane: {eng.logistics.craneTonnage}T ({eng.logistics.outriggerGroundKpa} kN/m²)
              </text>
              {renderEngineeringTitleBlock('C-101', 'CIVIL PLINTH & FOUNDATION SECTION', '1 : 40')}
            </g>
          )}

          {sheet === 'E-201' && (
            <g>
              <text x="32" y="42" fill={accent} fontSize="13" fontWeight="bold">
                FULL YARD-TO-HALL ELECTRICAL SINGLE-LINE DIAGRAM (IEC 60617 • CEIG & NBCS 2026)
              </text>
              <rect x="330" y="56" width="380" height="40" rx="4" fill={primary} />
              <text x="520" y="74" fill="#FFFFFF" fontSize="10.5" fontWeight="bold" textAnchor="middle">
                33kV / 66kV DUAL UTILITY INCOMING + HT VCB + TYPE 1+2 SPD
              </text>
              <text x="520" y="88" fill="#FFB600" fontSize="9" textAnchor="middle">
                IEEE C37 Relay Coordination • Peak Facility: {(eng.totalFacilityPeakKva || 0).toLocaleString()} kVA
              </text>

              <line x1="520" y1="96" x2="520" y2="112" stroke={fg} strokeWidth="2" />
              <line x1="250" y1="112" x2="790" y2="112" stroke={fg} strokeWidth="2" />
              <line x1="250" y1="112" x2="250" y2="128" stroke={fg} strokeWidth="2" />
              <line x1="790" y1="112" x2="790" y2="128" stroke={fg} strokeWidth="2" />

              <rect x="110" y="128" width="280" height="46" rx="4" fill={palette.transformer} />
              <text x="250" y="148" fill="#FFFFFF" fontSize="10" fontWeight="bold" textAnchor="middle">
                PATH A: {Math.ceil(eng.transformerUnits / 2)}×{eng.selTrafo.ratedCapacity}kVA K-13 Tx
              </text>
              <text x="250" y="164" fill="#E0E7FF" fontSize="9" textAnchor="middle">
                200% Neutral • Solidly Grounded
              </text>

              <rect x="650" y="128" width="280" height="46" rx="4" fill={palette.transformer} />
              <text x="790" y="148" fill="#FFFFFF" fontSize="10" fontWeight="bold" textAnchor="middle">
                PATH B: {Math.floor(eng.transformerUnits / 2) || 1}×{eng.selTrafo.ratedCapacity}kVA K-13 Tx
              </text>
              <text x="790" y="164" fill="#E0E7FF" fontSize="9" textAnchor="middle">
                200% Neutral • Solidly Grounded
              </text>

              <line x1="250" y1="174" x2="250" y2="192" stroke={fg} strokeWidth="2" />
              <line x1="790" y1="174" x2="790" y2="192" stroke={fg} strokeWidth="2" />

              <rect x="110" y="192" width="820" height="42" rx="4" fill="#F1F5F9" stroke="#0F172A" strokeWidth="1.8" />
              <text x="520" y="210" fill="#002870" fontSize="10.5" fontWeight="bold" textAnchor="middle">
                415V MAIN LV PCC + APFC (500 kVAr) + {eng.dgUnitsCount}×{eng.selDg.ratedCapacity}kVA CPCB IV+ DG AUTO-SYNC
              </text>
              <text x="520" y="225" fill="#475569" fontSize="9" textAnchor="middle">
                Form-4B Drawout Switchboard • {project.dgAutonomyHours}h PESO Fuel ({totalHsdK(eng.totalHsdFuelLitres)} kL)
              </text>

              <line x1="230" y1="234" x2="230" y2="256" stroke={fg} strokeWidth="2" />
              <line x1="520" y1="234" x2="520" y2="256" stroke={accent} strokeWidth="2.2" />
              <line x1="810" y1="234" x2="810" y2="256" stroke={fg} strokeWidth="2" />

              <rect x="100" y="256" width="260" height="50" rx="4" fill={palette.upsBess} />
              <text x="230" y="277" fill="#FFFFFF" fontSize="10" fontWeight="bold" textAnchor="middle">
                UPS A + IP55 BUSDUCT A
              </text>
              <text x="230" y="293" fill="#FFFFFF" fontSize="9" textAnchor="middle">
                {standards.buswayAmperageA || 1600}A Sandwich Busway
              </text>

              <rect x="385" y="256" width="270" height="50" rx="4" fill="#FFF7ED" stroke={accent} strokeWidth="1.8" />
              <text x="520" y="277" fill="#C2410C" fontSize="10" fontWeight="bold" textAnchor="middle">
                20% LOAD-DROP SHIELD ({eng.gridShield.loadDropShieldMw} MW)
              </text>
              <text x="520" y="293" fill="#7C2D12" fontSize="9" textAnchor="middle">
                Fast Load Bank + Grid BESS
              </text>

              <rect x="680" y="256" width="260" height="50" rx="4" fill={palette.upsBess} />
              <text x="810" y="277" fill="#FFFFFF" fontSize="10" fontWeight="bold" textAnchor="middle">
                UPS B + IP55 BUSDUCT B
              </text>
              <text x="810" y="293" fill="#FFFFFF" fontSize="9" textAnchor="middle">
                {standards.buswayAmperageA || 1600}A Sandwich Busway
              </text>

              <line x1="230" y1="306" x2="230" y2="330" stroke={palette.upsBess} strokeWidth="2" />
              <line x1="810" y1="306" x2="810" y2="330" stroke={palette.upsBess} strokeWidth="2" />

              <rect x="140" y="330" width="760" height="44" rx="4" fill={palette.itPod} />
              <text x="520" y="349" fill="#FFFFFF" fontSize="10.5" fontWeight="bold" textAnchor="middle">
                INTERNAL SUB-MAIN LV PANELS + DUAL-CORDED rPDUs ({(eng.totalDesignContKw / 1000).toFixed(2)} MW IT LOAD)
              </text>
              <text x="520" y="364" fill="#CBD5E1" fontSize="9" textAnchor="middle">
                {eng.activeRacks.length} Racks across {eng.pods.length} Units • Exothermic Copper Earthing (NBCS 2026)
              </text>
              {renderEngineeringTitleBlock('E-201', 'YARD-TO-HALL ELECTRICAL SLD', 'NTS')}
            </g>
          )}

          {sheet === 'E-202' && (
            <g>
              <text x="32" y="42" fill={accent} fontSize="13" fontWeight="bold">
                UPS, BATTERY & SWITCHGEAR ROOM / POD GENERAL ARRANGEMENT ({project.uptimeTier} • {eng.civil.isBnM ? 'BnM ROOMS' : 'CONTAINERIZED'})
              </text>

              {/* Zone 1: HT VCB, Transformers, Main LV PCC, APFC & MCC */}
              <rect x="36" y="60" width="320" height="315" fill={paperMode ? '#F8FAFC' : '#0F172A'} stroke={primary} strokeWidth="2" />
              <text x="196" y="80" fill={primary} fontSize="10.5" fontWeight="bold" textAnchor="middle">
                1. SWITCHGEAR & SUBSTATION BAY
              </text>
              <text x="196" y="95" fill={dimCol} fontSize="8.5" textAnchor="middle">
                {eng.civil.isBnM
                  ? `${project.bnmSwitchgearRoom.placement.replace(/_/g, ' ').toUpperCase()} (${eng.bnmAux.switchgearRoomSqm} m²)`
                  : 'Zone C E-House / Outdoor Substation Pad'}
              </text>
              <rect x="52" y="108" width="136" height="62" rx="3" fill={palette.transformer} />
              <text x="120" y="135" fill="#FFFFFF" fontSize="9.5" fontWeight="bold" textAnchor="middle">
                HT VCB (33kV)
              </text>
              <text x="120" y="150" fill="#E0E7FF" fontSize="8.5" textAnchor="middle">
                Dual Utility + SPD
              </text>
              <rect x="202" y="108" width="138" height="62" rx="3" fill={palette.transformer} />
              <text x="271" y="135" fill="#FFFFFF" fontSize="9.5" fontWeight="bold" textAnchor="middle">
                {eng.transformerUnits}× K-13 TRAFOS
              </text>
              <text x="271" y="150" fill="#E0E7FF" fontSize="8.5" textAnchor="middle">
                {eng.selTrafo.ratedCapacity} kVA ({eng.trafoCalc.activeN}+{eng.trafoCalc.redundantR})
              </text>
              <rect x="52" y="184" width="288" height="68" rx="3" fill="#1E293B" />
              <text x="196" y="213" fill="#FFFFFF" fontSize="10" fontWeight="bold" textAnchor="middle">
                MAIN 415V FORM-4B LV PCC & AUTO-SYNC ACB ({eng.lvSwitchgearUnits} LINEUPS)
              </text>
              <text x="196" y="230" fill="#CBD5E1" fontSize="8.5" textAnchor="middle">
                1.8m Clear Front Drawout Aisle • Dual Bus-Coupler Interlock
              </text>
              <rect x="52" y="266" width="136" height="58" rx="3" fill="#0F766E" />
              <text x="120" y="292" fill="#FFFFFF" fontSize="9" fontWeight="bold" textAnchor="middle">
                APFC + TYPE 1+2 SPD
              </text>
              <text x="120" y="307" fill="#CCFBF1" fontSize="8" textAnchor="middle">
                500 kVAr Detuned
              </text>
              <rect x="202" y="266" width="138" height="58" rx="3" fill="#0369A1" />
              <text x="271" y="292" fill="#FFFFFF" fontSize="9" fontWeight="bold" textAnchor="middle">
                COOLING VFD MCC
              </text>
              <text x="271" y="307" fill="#E0F2FE" fontSize="8" textAnchor="middle">
                Pumps, Coolers & PACs
              </text>
              <text x="196" y="352" fill={dimCol} fontSize="8.5" fontWeight="bold" textAnchor="middle">
                Ventilation / Cooling: {eng.bnmAux.switchgearCoolingKw} kW (28°C Max)
              </text>

              {/* Zone 2: Modular UPS Room / Pod */}
              <rect x="372" y="60" width="320" height="315" fill={paperMode ? '#F8FAFC' : '#0F172A'} stroke={primary} strokeWidth="2" />
              <text x="532" y="80" fill={primary} fontSize="10.5" fontWeight="bold" textAnchor="middle">
                2. MODULAR UPS ROOM / POD
              </text>
              <text x="532" y="95" fill={dimCol} fontSize="8.5" textAnchor="middle">
                {eng.civil.isBnM
                  ? `${project.bnmUpsRoom.placement.replace(/_/g, ' ').toUpperCase()} (${eng.bnmAux.upsRoomSqm} m²)`
                  : 'Zone B Containerized UPS Pods'}
              </text>
              <rect x="390" y="112" width="284" height="62" rx="3" fill={palette.upsBess} />
              <text x="532" y="140" fill="#FFFFFF" fontSize="10" fontWeight="bold" textAnchor="middle">
                UPS PATH A: {Math.ceil(eng.upsContainersCount / 2)}× {eng.selUps.ratedCapacity} kVA ({eng.selUps.make})
              </text>
              <text x="532" y="156" fill="#FCE7F3" fontSize="8.5" textAnchor="middle">
                Static Bypass + Output Isolator → IP55 Busduct A
              </text>
              <rect x="390" y="186" width="284" height="44" fill={paperMode ? '#FFF7ED' : '#1E293B'} stroke={accent} strokeDasharray="4,3" />
              <text x="532" y="212" fill={accent} fontSize="9.5" fontWeight="bold" textAnchor="middle">
                1,500mm FRONT MAINTENANCE & MODULE SWAP AISLE
              </text>
              <rect x="390" y="242" width="284" height="62" rx="3" fill={palette.upsBess} />
              <text x="532" y="270" fill="#FFFFFF" fontSize="10" fontWeight="bold" textAnchor="middle">
                UPS PATH B: {Math.floor(eng.upsContainersCount / 2) || 1}× {eng.selUps.ratedCapacity} kVA ({eng.upsCalc.activeN}+{eng.upsCalc.redundantR})
              </text>
              <text x="532" y="286" fill="#FCE7F3" fontSize="8.5" textAnchor="middle">
                Maintenance Bypass Cabinet → IP55 Busduct B
              </text>
              <text x="532" y="330" fill="#059669" fontSize="9" fontWeight="bold" textAnchor="middle">
                Dedicated 24°C UPS Room PAC Cooling: {eng.bnmAux.upsRoomCoolingKw} kW (N+1)
              </text>
              <text x="532" y="352" fill={dimCol} fontSize="8.5" textAnchor="middle">
                VESDA + Clean Agent Suppression • 2-Hr Fire Partition
              </text>

              {/* Zone 3: Battery / BESS Room / Pod */}
              <rect x="708" y="60" width="356" height="315" fill={paperMode ? '#F8FAFC' : '#0F172A'} stroke={primary} strokeWidth="2" />
              <text x="886" y="80" fill={primary} fontSize="10.5" fontWeight="bold" textAnchor="middle">
                3. {project.batteryChemistry} BATTERY / BESS ROOM
              </text>
              <text x="886" y="95" fill={dimCol} fontSize="8.5" textAnchor="middle">
                {eng.civil.isBnM
                  ? `${project.bnmBatteryRoom.placement.replace(/_/g, ' ').toUpperCase()} (${eng.bnmAux.batteryRoomSqm} m²)`
                  : 'Zone B Containerized BESS Pods'}
              </text>
              {[0, 1, 2].map(row => (
                <g key={row}>
                  <rect x="728" y={112 + row * 64} width="316" height="46" rx="3" fill={palette.dgSet} fillOpacity="0.88" />
                  <text x="886" y={134 + row * 64} fill="#FFFFFF" fontSize="9.5" fontWeight="bold" textAnchor="middle">
                    {project.batteryChemistry} BATTERY STRING BANK #{row + 1} ({Math.round(eng.batteryKwhReq / 3)} kWh)
                  </text>
                  <text x="886" y={148 + row * 64} fill="#FEE2E2" fontSize="8" textAnchor="middle">
                    DC Breaker + Cell-Level BMS • 1,200mm Service Aisle
                  </text>
                </g>
              ))}
              <text x="886" y="318" fill="#DC2626" fontSize="9" fontWeight="bold" textAnchor="middle">
                22–25°C Precision Thermal ({eng.bnmAux.batteryRoomCoolingKw} kW) + H2/Off-Gas Exhaust
              </text>
              <text x="886" y="338" fill={dimCol} fontSize="8.5" textAnchor="middle">
                Runtime: {project.batteryRuntimeMin} min ({eng.batteryContainersCount}× 1.2 MWh • {project.upsRideThroughMode})
              </text>
              <text x="886" y="356" fill={dimCol} fontSize="8.5" textAnchor="middle">
                UL 9540A Thermal Runaway Isolation + Eyewash / Spill Kit
              </text>
              {renderEngineeringTitleBlock('E-202', 'UPS, BATTERY & SWITCHGEAR ROOM GA', '1 : 50')}
            </g>
          )}

          {sheet === 'G-101' && (
            <g>
              <text x="32" y="42" fill={accent} fontSize="13" fontWeight="bold">
                EXOTHERMIC COPPER EARTHING & LIGHTNING PROTECTION GRID (NBCS 2026 / IS 3043)
              </text>
              <rect x="65" y="65" width="970" height="310" fill="#FFFBEB" stroke="#D97706" strokeWidth="2.5" strokeDasharray="8,4" />
              <text x="550" y="88" fill="#B45309" fontSize="10.5" fontWeight="bold" textAnchor="middle">
                50×6mm BARE COPPER RING MAIN EARTH MAT (EXOTHERMIC CADWELD JOINTS • &lt; 0.5 Ω GRID RESISTANCE)
              </text>
              {[120, 330, 550, 770, 980].map((px, i) => (
                <g key={i}>
                  <circle cx={px} cy="115" r="9" fill="#059669" />
                  <text x={px} y="138" fill="#065F46" fontSize="9" fontWeight="bold" textAnchor="middle">
                    Earth Pit #{i + 1}
                  </text>
                  <circle cx={px} cy="340" r="9" fill="#059669" />
                  <text x={px} y="362" fill="#065F46" fontSize="9" fontWeight="bold" textAnchor="middle">
                    Earth Pit #{i + 6}
                  </text>
                </g>
              ))}
              <rect x="210" y="168" width="680" height="130" rx="6" fill={primary} />
              <text x="550" y="222" fill="#FFFFFF" fontSize="12" fontWeight="bold" textAnchor="middle">
                EQUIPOTENTIAL SIGNAL REFERENCE GRID (SRG) — {eng.pods.length} {eng.civil.isBnM ? 'BnM HALL BAYS' : 'CORTEN-A PODS'}
              </text>
              <text x="550" y="244" fill="#FFB600" fontSize="10" textAnchor="middle">
                Dual Copper Down-Conductors • ESE Lightning Arresters • Online Earth Fault Monitoring
              </text>
              {renderEngineeringTitleBlock('G-101', 'EARTHING & LIGHTNING GRID (NBCS 2026)', '1 : 200')}
            </g>
          )}

          {sheet === 'R-101' && (
            <g>
              <text x="32" y="42" fill={accent} fontSize="13" fontWeight="bold">
                SEGREGATED CABLE TRAY, TELECOM FIBER RACEWAY & ROXTEC PENETRATION PLAN
              </text>
              <rect x="55" y="68" width="990" height="62" rx="4" fill="#FEF3C7" stroke="#D97706" strokeWidth="2" />
              <text x="550" y="95" fill="#92400E" fontSize="11" fontWeight="bold" textAnchor="middle">
                TIER 1 (TOP +3200mm): YELLOW LSZH CORRUGATED OPTICAL FIBER RACEWAY ({eng.telecom.overheadFiberMeters}m)
              </text>
              <text x="550" y="113" fill="#78350F" fontSize="9.5" textAnchor="middle">
                300mm EMI Isolation • Connects {eng.telecom.mmrRoomsCount} Carrier MMR ({eng.telecom.odfBaysCount}× {project.odfCoreDensity}F ODF Bays) to Compute Rows
              </text>

              <rect x="55" y="148" width="990" height="62" rx="4" fill="#DBEAFE" stroke="#1D4ED8" strokeWidth="2" />
              <text x="550" y="175" fill="#1E3A8A" fontSize="11" fontWeight="bold" textAnchor="middle">
                TIER 2 (MID +2750mm): IP55 SANDWICH POWER BUSDUCTS (DUAL A+B REDUNDANT TRACKS)
              </text>
              <text x="550" y="193" fill="#1E40AF" fontSize="9.5" textAnchor="middle">
                Plug-In Tap-Off Boxes • FRLS/LSZH Armored Feeder Cables • Zero Subfloor Airflow Obstruction
              </text>

              <rect x="55" y="228" width="990" height="62" rx="4" fill="#DCFCE7" stroke="#059669" strokeWidth="2" />
              <text x="550" y="255" fill="#065F46" fontSize="11" fontWeight="bold" textAnchor="middle">
                TIER 3 (BULKHEAD / PLINTH ENTRY): IP68 / FIRE-RATED ROXTEC MULTI-CABLE & PIPE TRANSITS
              </text>
              <text x="550" y="273" fill="#047857" fontSize="9.5" textAnchor="middle">
                Watertight, Gas-Tight & #316 Rodent-Proof Bulkhead Seals for Power, Fiber & SS316L Manifolds
              </text>

              <rect x="55" y="308" width="990" height="62" rx="4" fill="#F1F5F9" stroke="#475569" strokeWidth="2" />
              <text x="550" y="335" fill="#0F172A" fontSize="11" fontWeight="bold" textAnchor="middle">
                TIER 4 (OUTSIDE PLANT TELECOM): DUAL DIVERSE UNDERGROUND FIBER VAULTS ({project.diverseVaultSeparationM}m SEPARATION)
              </text>
              <text x="550" y="353" fill="#334155" fontSize="9.5" textAnchor="middle">
                Concrete-Encased 4-Way 110mm HDPE Duct Banks from North & South Campus Boundaries ({project.carrierCount} Carriers)
              </text>
              {renderEngineeringTitleBlock('R-101', 'CABLE TRAY, FIBER & ROXTEC TRANSIT PLAN', '1 : 50')}
            </g>
          )}

          {sheet === 'M-301' && (
            <g>
              <text x="32" y="42" fill={accent} fontSize="13" fontWeight="bold">
                PRIMARY / SECONDARY HYDRAULIC & THERMAL LOOP P&ID (ZERO YARD CDUs)
              </text>
              {[
                [55, '1. PRIMARY YARD COOLERS', `${eng.adiabaticUnits}×${eng.selCooler.ratedCapacity}kW Adiabatic/Dry`, 'Rejects Heat to Ambient Air', palette.coolerTank],
                [310, '2. VFD PUMPS & WATER TANKS', `${eng.pumpSkidsCount} Skids @ ${eng.pumpDesignHeadBar} bar`, `${eng.totalWaterStorageKl} kL Tanks + RO/DM Pre-Treat`, palette.cduPump],
                [565, '3. WHITE-SPACE INTERNAL CDUs', `${eng.whiteSpace.internalCduCount} Internal CDU Towers`, `Supply <= ${eng.effectiveSupplyTempC}°C (Isolated PG25)`, palette.itPod],
                [820, '4. WHITE-SPACE PACs & CHILLERS', `${eng.whiteSpace.mandatoryPacCount}×80kW PACs + ${eng.whiteSpace.chillerUnitsCount} Chillers`, `${project.chillerPlacement === 'ContainerRoof' ? 'Roof Chillers' : 'Yard Chillers'} (24°C Room)`, palette.transformer]
              ].map(([x, title, sub1, sub2, col], idx) => (
                <g key={idx} transform={`translate(${x}, 145)`}>
                  <rect x="0" y="0" width="225" height="145" rx="6" fill={String(col)} />
                  <text x="112" y="48" fill="#FFFFFF" fontSize="10.5" fontWeight="bold" textAnchor="middle">
                    {title}
                  </text>
                  <text x="112" y="76" fill="#FFFFFF" fontSize="9.5" textAnchor="middle">
                    {sub1}
                  </text>
                  <text x="112" y="98" fill="#E2E8F0" fontSize="9" textAnchor="middle">
                    {sub2}
                  </text>
                </g>
              ))}
              {renderEngineeringTitleBlock('M-301', 'PRIMARY / SECONDARY HYDRAULIC P&ID', 'NTS')}
            </g>
          )}
        </svg>
      </div>
    </div>
  );
};
