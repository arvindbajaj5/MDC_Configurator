import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { ColorPalette, EngineeringResult, ProjectDeal } from '../types/mdc';
import { ColorLegendBar } from './ColorLegendBar';

interface ThreeDStudioProps {
  project: ProjectDeal;
  eng: EngineeringResult;
  palette: ColorPalette;
  onUpdatePalette: (key: keyof Omit<ColorPalette, 'label'>, hex: string) => void;
  onApplyTheme: (themeKey: string) => void;
  compact?: boolean;
}

export const ThreeDStudio: React.FC<ThreeDStudioProps> = ({
  project,
  eng,
  palette,
  onUpdatePalette,
  onApplyTheme,
  compact = false
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [viewScope, setViewScope] = useState<'Hall' | 'SinglePod'>('Hall');
  const [selectedPodIdx, setSelectedPodIdx] = useState(0);
  const [isLoadedMode, setIsLoadedMode] = useState(true);
  const [cameraPreset, setCameraPreset] = useState('Iso');
  const [studioLightMode, setStudioLightMode] = useState<'daylight' | 'dark'>('daylight');
  const [layers, setLayers] = useState({
    shell: true,
    floorTransparent: true,
    plumbing: true,
    buswaysData: true,
    racks: true,
    yardEquipment: true
  });

  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;
    const width = el.clientWidth || 800;
    const height = el.clientHeight || (compact ? 380 : 480);

    const isDaylight = studioLightMode === 'daylight';
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(isDaylight ? 0xeef2f7 : 0x0b1528);
    scene.fog = new THREE.FogExp2(isDaylight ? 0xeef2f7 : 0x0b1528, isDaylight ? 0.0032 : 0.0065);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 300);
    camera.position.set(18, 15, 22);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    el.innerHTML = '';
    el.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.maxPolarAngle = Math.PI * 0.49;
    controlsRef.current = controls;

    // Bright architectural studio lighting (Hemisphere + Key Directional + Fill Light)
    scene.add(new THREE.HemisphereLight(0xffffff, isDaylight ? 0xcbd5e1 : 0x1e293b, isDaylight ? 1.25 : 0.85));
    const keyLight = new THREE.DirectionalLight(0xffffff, isDaylight ? 1.15 : 0.95);
    keyLight.position.set(24, 36, 20);
    scene.add(keyLight);
    const fillLight = new THREE.DirectionalLight(0xe0f2fe, isDaylight ? 0.55 : 0.35);
    fillLight.position.set(-22, 18, -16);
    scene.add(fillLight);

    if (isDaylight) {
      const ground = new THREE.Mesh(
        new THREE.PlaneGeometry(140, 140),
        new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.92, metalness: 0.0 })
      );
      ground.rotation.x = -Math.PI / 2;
      ground.position.y = -0.02;
      scene.add(ground);
    }

    scene.add(
      new THREE.GridHelper(
        90,
        90,
        isDaylight ? 0x94a3b8 : 0x1e3a8a,
        isDaylight ? 0xcbd5e1 : 0x172554
      )
    );

    const addCrispEdges = (mesh: THREE.Mesh, hex = 0x1e293b, opacity = 0.45) => {
      const edges = new THREE.LineSegments(
        new THREE.EdgesGeometry(mesh.geometry),
        new THREE.LineBasicMaterial({ color: hex, transparent: true, opacity })
      );
      mesh.add(edges);
    };

    const podsToRender =
      viewScope === 'SinglePod' ? [eng.pods[selectedPodIdx] || eng.pods[0]].filter(Boolean) : eng.pods;

    const isBnM = project.shellArchitecture === 'BnM_Hall';
    const isGanged = viewScope === 'Hall' && project.hallTopology !== 'Isolated';
    const isUShaped = viewScope === 'Hall' && project.hallTopology === 'GangedUShaped';
    const spacing = isBnM ? 0.04 : isGanged ? 0.08 : 2.6;

    const activeShellColor =
      project.brandingMode && project.brandingMode !== 'standard' && project.exteriorColorHex
        ? project.exteriorColorHex
        : isBnM
          ? '#475569'
          : palette.itPod || '#0F172A';

    const matWall = new THREE.MeshStandardMaterial({
      color: new THREE.Color(isDaylight && activeShellColor === '#0F172A' ? '#CBD5E1' : activeShellColor),
      roughness: isBnM ? 0.78 : 0.35,
      metalness: isBnM ? 0.08 : 0.25,
      transparent: true,
      opacity: isDaylight ? 0.22 : 0.30,
      side: THREE.DoubleSide
    });
    const matFrame = new THREE.MeshStandardMaterial({
      color: isBnM ? 0x94a3b8 : 0xff5539,
      roughness: 0.4,
      metalness: 0.5
    });
    const matPlinth = new THREE.MeshStandardMaterial({ color: isDaylight ? 0x94a3b8 : 0x334155, roughness: 0.82 });
    const matFloor = new THREE.MeshStandardMaterial({
      color: isDaylight ? 0xcbd5e1 : 0x475569,
      roughness: 0.5,
      metalness: 0.2,
      transparent: layers.floorTransparent,
      opacity: layers.floorTransparent ? 0.28 : 0.92
    });
    const matSupplyPipe = new THREE.MeshStandardMaterial({ color: 0x0ea5e9, roughness: 0.3, metalness: 0.7 });
    const matReturnPipe = new THREE.MeshStandardMaterial({ color: 0xff5539, roughness: 0.3, metalness: 0.7 });
    const matBusA = new THREE.MeshStandardMaterial({ color: 0x2563eb });
    const matBusB = new THREE.MeshStandardMaterial({ color: 0xf97316 });
    const matFiberTray = new THREE.MeshStandardMaterial({ color: 0xfacc15 });

    const totalSpanW = podsToRender.reduce((acc, p) => acc + p.extWidthMm / 1000 + spacing, -spacing);
    let cursorX = -totalSpanW / 2;

    podsToRender.forEach((pod, pIdx) => {
      const L = pod.extLengthMm / 1000;
      const W = pod.extWidthMm / 1000;
      const H = (isBnM ? (project.bnmClearSoffitM || 5.8) * 1000 : pod.extHeightMm) / 1000;
      const plenumH = project.plenumHeightMm / 1000;
      const plinthH = 0.45;

      const podGroup = new THREE.Group();
      if (isUShaped && podsToRender.length >= 3) {
        if (pIdx === 0) podGroup.position.set(-L * 0.65, 0, -3);
        else if (pIdx === podsToRender.length - 1) podGroup.position.set(L * 0.65, 0, -3);
        else {
          podGroup.rotation.y = Math.PI / 2;
          podGroup.position.set((pIdx - 1) * (W + 0.1), 0, -L * 0.75 - 3);
        }
      } else {
        podGroup.position.set(cursorX + W / 2, 0, -3);
        cursorX += W + spacing;
      }

      const plinth = new THREE.Mesh(new THREE.BoxGeometry(W + 0.3, plinthH, L + 0.3), matPlinth);
      plinth.position.y = plinthH / 2;
      podGroup.add(plinth);

      const floorDeck = new THREE.Mesh(new THREE.BoxGeometry(W - 0.15, 0.06, L - 0.15), matFloor);
      floorDeck.position.y = plinthH + plenumH;
      podGroup.add(floorDeck);

      if (layers.shell) {
        const skipLeftWall = (isGanged || isBnM) && pIdx > 0 && !isUShaped;
        const skipRightWall = (isGanged || isBnM) && pIdx < podsToRender.length - 1 && !isUShaped;
        if (!skipLeftWall) {
          const leftW = new THREE.Mesh(new THREE.BoxGeometry(isBnM ? 0.22 : 0.08, H, L), matWall);
          leftW.position.set(-W / 2, plinthH + H / 2, 0);
          podGroup.add(leftW);
        }
        if (!skipRightWall) {
          const rightW = new THREE.Mesh(new THREE.BoxGeometry(isBnM ? 0.22 : 0.08, H, L), matWall);
          rightW.position.set(W / 2, plinthH + H / 2, 0);
          podGroup.add(rightW);
        }
        const frontW = new THREE.Mesh(new THREE.BoxGeometry(W, H, isBnM ? 0.22 : 0.08), matWall);
        frontW.position.set(0, plinthH + H / 2, L / 2);
        podGroup.add(frontW);

        const backW = new THREE.Mesh(new THREE.BoxGeometry(W, H, isBnM ? 0.22 : 0.08), matWall);
        backW.position.set(0, plinthH + H / 2, -L / 2);
        podGroup.add(backW);

        [
          [-W / 2, -L / 2],
          [W / 2, -L / 2],
          [-W / 2, L / 2],
          [W / 2, L / 2]
        ].forEach(([cx, cz]) => {
          const post = new THREE.Mesh(new THREE.BoxGeometry(isBnM ? 0.45 : 0.16, H, isBnM ? 0.45 : 0.16), matFrame);
          post.position.set(cx, plinthH + H / 2, cz);
          podGroup.add(post);
        });
      }

      if (layers.plumbing) {
        [-W * 0.26, W * 0.26].forEach(rx => {
          const sup = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, L - 0.4, 14), matSupplyPipe);
          sup.rotation.x = Math.PI / 2;
          sup.position.set(rx - 0.1, plinthH + plenumH * 0.45, 0);
          podGroup.add(sup);

          const ret = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, L - 0.4, 14), matReturnPipe);
          ret.rotation.x = Math.PI / 2;
          ret.position.set(rx + 0.1, plinthH + plenumH * 0.65, 0);
          podGroup.add(ret);
        });
      }

      if (layers.buswaysData) {
        const busY = plinthH + H - 0.35;
        [-W * 0.28, W * 0.28].forEach(rx => {
          const busA = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.14, L - 0.5), matBusA);
          busA.position.set(rx - 0.14, busY, 0);
          podGroup.add(busA);

          const busB = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.14, L - 0.5), matBusB);
          busB.position.set(rx + 0.14, busY, 0);
          podGroup.add(busB);

          const fiber = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.06, L - 0.5), matFiberTray);
          fiber.position.set(rx, busY - 0.22, 0);
          podGroup.add(fiber);
        });
      }

      if (isLoadedMode && layers.racks) {
        const renderRow = (rowRacks: typeof pod.rowA, sideSign: number) => {
          let zCursor = -L / 2 + 1.2;
          rowRacks.forEach(rk => {
            const rW = rk.widthMm / 1000;
            const rH = rk.heightMm / 1000;
            const rD = rk.depthMm / 1000;
            const rx = sideSign * (W * 0.27);
            const rz = zCursor + rW / 2;
            const rackCol = rk.isDlc ? palette.dlcRack : palette.acRack;

            const cabinet = new THREE.Mesh(
              new THREE.BoxGeometry(rD, rH, rW),
              new THREE.MeshStandardMaterial({ color: new THREE.Color(rackCol), roughness: 0.35, metalness: 0.45 })
            );
            cabinet.position.set(rx, plinthH + plenumH + 0.08 + rH / 2, rz);
            addCrispEdges(cabinet, isDaylight ? 0x0f172a : 0xffffff, 0.5);
            podGroup.add(cabinet);

            if (rk.isDlc) {
              const pipeY = rk.plumbingEntry === 'Top' ? plinthH + H - 0.5 : plinthH + plenumH * 0.55;
              const pipeH = rk.plumbingEntry === 'Top' ? 0.6 : plenumH + 0.25;
              const drop = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, pipeH, 10), matSupplyPipe);
              drop.position.set(rx, pipeY, rz);
              podGroup.add(drop);
            }
            zCursor += rW + 0.08;
          });
        };
        renderRow(pod.rowA || [], -1);
        renderRow(pod.rowB || [], 1);

        // Internal White-Space PAC, Internal CDU Tower & Internal LV Switchboard
        const baseY = plinthH + plenumH + 0.08;
        const pacMesh = new THREE.Mesh(
          new THREE.BoxGeometry(0.95, 2.2, 1.1),
          new THREE.MeshStandardMaterial({ color: new THREE.Color(palette.coolerTank || '#059669'), roughness: 0.35 })
        );
        pacMesh.position.set(-W * 0.28, baseY + 1.1, L / 2 - 1.1);
        podGroup.add(pacMesh);

        if (eng.whiteSpace.internalCduCount > 0) {
          const cduMesh = new THREE.Mesh(
            new THREE.BoxGeometry(0.85, 2.2, 1.1),
            new THREE.MeshStandardMaterial({ color: new THREE.Color(palette.cduPump || '#0284C7'), roughness: 0.35 })
          );
          cduMesh.position.set(W * 0.28, baseY + 1.1, L / 2 - 1.1);
          podGroup.add(cduMesh);
        }

        const swgMesh = new THREE.Mesh(
          new THREE.BoxGeometry(0.65, 2.1, 0.9),
          new THREE.MeshStandardMaterial({ color: new THREE.Color(palette.transformer || '#7C3AED'), roughness: 0.35 })
        );
        swgMesh.position.set(-W * 0.28, baseY + 1.05, -L / 2 + 0.85);
        podGroup.add(swgMesh);
      }

      scene.add(podGroup);
    });

    if (viewScope === 'Hall' && layers.yardEquipment) {
      const basePodLen = (podsToRender[0]?.extLengthMm || 12000) / 1000;
      const addYardBlock = (x: number, z: number, w: number, h: number, l: number, hexCol: string) => {
        const m = new THREE.Mesh(
          new THREE.BoxGeometry(w, h, l),
          new THREE.MeshStandardMaterial({ color: new THREE.Color(hexCol), roughness: 0.4, metalness: 0.35 })
        );
        m.position.set(x, h / 2 + 0.25, z);
        addCrispEdges(m, isDaylight ? 0x0f172a : 0xffffff, 0.4);
        scene.add(m);
      };
      if (project.includeAdminModule || project.includeStagingModule) {
        addYardBlock(-totalSpanW / 2 - 3.6, -3, 3.4, 3.2, Math.min(12, basePodLen), palette.adminStage);
      }
      const zoneBZ = basePodLen / 2 + 5.5;
      if (eng.upsContainersCount > 0 || eng.batteryContainersCount > 0) {
        addYardBlock(-4.0, zoneBZ, 3.4, 3.2, 11.0, palette.upsBess);
        if (eng.upsContainersCount + eng.batteryContainersCount > 2) {
          addYardBlock(1.0, zoneBZ, 3.4, 3.2, 11.0, palette.upsBess);
        }
      }
      const zoneCZ = basePodLen / 2 + 13.5;
      if (eng.pumpSkidsCount > 0) addYardBlock(-11.5, zoneCZ, 3.8, 2.4, 6.5, palette.cduPump);
      if (eng.adiabaticUnits > 0 || eng.waterTankUnits > 0) addYardBlock(-5.5, zoneCZ, 4.8, 2.8, 8.0, palette.coolerTank);
      if (eng.transformerUnits > 0) addYardBlock(1.0, zoneCZ, 4.2, 2.6, 5.5, palette.transformer);
      if (eng.dgUnitsCount > 0) addYardBlock(8.0, zoneCZ, 4.0, 3.4, 11.5, palette.dgSet);
    }

    let animId = 0;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animId);
      renderer.dispose();
    };
  }, [project, eng, viewScope, selectedPodIdx, isLoadedMode, layers, palette, compact, studioLightMode]);

  const applyPreset = (preset: string) => {
    setCameraPreset(preset);
    const cam = cameraRef.current;
    const ctrl = controlsRef.current;
    if (!cam || !ctrl) return;
    ctrl.target.set(0, 2, 0);
    if (preset === 'Iso') cam.position.set(18, 15, 22);
    else if (preset === 'Top') cam.position.set(0, 32, 0.1);
    else if (preset === 'Aisle') cam.position.set(0, 2.4, 9);
    else if (preset === 'Plenum') {
      setLayers(l => ({ ...l, floorTransparent: true }));
      cam.position.set(6, 1.3, 7);
      ctrl.target.set(0, 0.8, -3);
    } else if (preset === 'Rear') cam.position.set(-14, 6, -16);
    ctrl.update();
  };

  const toggleLayer = (k: keyof typeof layers) => setLayers(prev => ({ ...prev, [k]: !prev[k] }));

  return (
    <div className="bg-white rounded-xl card-shadow border border-slate-200 overflow-hidden">
      <div className="navy-bg text-white p-3.5 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm sm:text-base font-bold">
            Live 360° 3D {project.shellArchitecture === 'BnM_Hall' ? 'Brick-and-Mortar Hall' : 'Container'} & Yard Studio
          </h3>
          <p className="text-[11px] text-slate-300">
            White-Space Internal PACs & CDUs + 3-Zone Spatial Separation ({eng.pods.length} {project.shellArchitecture === 'BnM_Hall' ? 'BnM Bays' : 'Pods'})
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <div className="bg-slate-900/60 p-1 rounded-lg flex">
            <button
              onClick={() => setViewScope('Hall')}
              className={`px-2.5 py-1 rounded text-xs font-bold ${viewScope === 'Hall' ? 'coral-bg text-white' : 'text-slate-300'}`}
            >
              Campus + Yard ({eng.pods.length})
            </button>
            <button
              onClick={() => setViewScope('SinglePod')}
              className={`px-2.5 py-1 rounded text-xs font-bold ${viewScope === 'SinglePod' ? 'coral-bg text-white' : 'text-slate-300'}`}
            >
              Single Unit
            </button>
          </div>
          {viewScope === 'SinglePod' && eng.pods.length > 0 && (
            <select
              value={selectedPodIdx}
              onChange={e => setSelectedPodIdx(Number(e.target.value))}
              className="bg-slate-800 text-white text-xs rounded-lg px-2 py-1 border border-slate-600"
            >
              {eng.pods.map((p, idx) => (
                <option key={p.id} value={idx}>
                  {p.label} ({Math.round(p.designContKw)} kW)
                </option>
              ))}
            </select>
          )}
          <div className="bg-slate-900/60 p-1 rounded-lg flex">
            <button
              onClick={() => setStudioLightMode('daylight')}
              className={`px-2.5 py-1 rounded text-xs font-bold ${studioLightMode === 'daylight' ? 'bg-white text-slate-950' : 'text-slate-300'}`}
            >
              Daylight
            </button>
            <button
              onClick={() => setStudioLightMode('dark')}
              className={`px-2.5 py-1 rounded text-xs font-bold ${studioLightMode === 'dark' ? 'bg-slate-700 text-white' : 'text-slate-300'}`}
            >
              Dark
            </button>
          </div>
          <div className="bg-slate-900/60 p-1 rounded-lg flex">
            <button
              onClick={() => setIsLoadedMode(false)}
              className={`px-2.5 py-1 rounded text-xs font-bold ${!isLoadedMode ? 'bg-amber-500 text-slate-950' : 'text-slate-300'}`}
            >
              Empty Shell
            </button>
            <button
              onClick={() => setIsLoadedMode(true)}
              className={`px-2.5 py-1 rounded text-xs font-bold ${isLoadedMode ? 'bg-emerald-500 text-slate-950' : 'text-slate-300'}`}
            >
              Loaded
            </button>
          </div>
        </div>
      </div>

      {!compact && (
        <ColorLegendBar palette={palette} onUpdatePalette={onUpdatePalette} onApplyTheme={onApplyTheme} eng={eng} />
      )}

      <div className="bg-slate-100 px-3 py-2 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-1 flex-wrap">
          <span className="font-bold text-slate-600 mr-1">Camera:</span>
          {['Iso', 'Top', 'Aisle', 'Plenum', 'Rear'].map(pr => (
            <button
              key={pr}
              onClick={() => applyPreset(pr)}
              className={`px-2 py-0.5 rounded font-medium ${cameraPreset === pr ? 'navy-bg text-white' : 'bg-white border border-slate-300 text-slate-700'}`}
            >
              {pr === 'Plenum' ? 'Plenum' : pr}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-1">
          <span className="font-bold text-slate-600 mr-1">Layers:</span>
          {(
            [
              ['shell', 'Enclosure'],
              ['floorTransparent', 'Glass Floor'],
              ['plumbing', 'SS316'],
              ['buswaysData', 'Busways/Fiber'],
              ['racks', 'Racks/PAC/CDU'],
              ['yardEquipment', 'Yard MEP']
            ] as [keyof typeof layers, string][]
          ).map(([k, lbl]) => (
            <button
              key={k}
              onClick={() => toggleLayer(k)}
              className={`px-2 py-0.5 rounded font-medium border ${
                layers[k] ? 'bg-blue-50 border-blue-500 text-blue-900' : 'bg-white border-slate-300 text-slate-400'
              }`}
            >
              {layers[k] ? '✓ ' : ''}
              {lbl}
            </button>
          ))}
        </div>
      </div>

      {eng.pods.length === 0 ? (
        <div className="h-[340px] bg-slate-950 text-slate-300 flex flex-col items-center justify-center p-6 text-center">
          <p className="text-base font-bold text-white">No IT Racks Placed Yet</p>
          <p className="text-xs text-slate-400 mt-1 max-w-md">
            Add IT racks in Stage 1 (INPUTS) or click Auto-Fit to generate the 3D container/BnM & yard twin.
          </p>
        </div>
      ) : (
        <div
          ref={mountRef}
          className={`w-full ${compact ? 'h-[370px]' : 'h-[460px]'} ${studioLightMode === 'daylight' ? 'bg-[#EEF2F7]' : 'bg-slate-950'} cursor-grab active:cursor-grabbing`}
        />
      )}
    </div>
  );
};
