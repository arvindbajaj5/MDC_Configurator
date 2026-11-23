import React, { useEffect, useRef, useState } from 'react';
import type * as THREE from 'three';
import type { DealConfig, FullEngineeringOutput } from '../../types/schema';

export type StudioViewLevel = 'yard' | 'container' | 'bnm';
export type CameraPreset = 'iso' | 'top' | 'elev' | 'walk';

export interface StudioLayers {
  shell: boolean;
  cooling: boolean;
  electrical: boolean;
  foundation: boolean;
  perimeter: boolean;
}

interface ThreeViewportProps {
  deal: DealConfig;
  eng: FullEngineeringOutput;
  viewLevel: StudioViewLevel;
  cameraPreset: CameraPreset;
  layers: StudioLayers;
}

const PRESET_ANGLES: Record<CameraPreset, { yaw: number; pitch: number; dist: number }> = {
  iso: { yaw: 0.72, pitch: 0.56, dist: 34 },
  top: { yaw: 0.01, pitch: 1.48, dist: 42 },
  elev: { yaw: 0.0, pitch: 0.14, dist: 30 },
  walk: { yaw: 1.55, pitch: 0.12, dist: 14 }
};

export const ThreeViewport: React.FC<ThreeViewportProps> = ({
  deal,
  eng,
  viewLevel,
  cameraPreset,
  layers
}) => {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const orbitRef = useRef({ ...PRESET_ANGLES.iso, dragging: false, lastX: 0, lastY: 0 });
  const [webglError, setWebglError] = useState<string | null>(null);

  useEffect(() => {
    const base = PRESET_ANGLES[cameraPreset];
    const scale = viewLevel === 'yard' ? 1.15 : 0.65;
    orbitRef.current.yaw = base.yaw;
    orbitRef.current.pitch = base.pitch;
    orbitRef.current.dist = base.dist * scale;
  }, [cameraPreset, viewLevel]);

  useEffect(() => {
    let disposed = false;
    let rafId = 0;
    let renderer: THREE.WebGLRenderer | null = null;
    let resizeObs: ResizeObserver | null = null;

    const mount = hostRef.current;
    if (!mount) return;

    const init = async () => {
      try {
        const ThreeLib = await import('three');
        if (disposed || !hostRef.current) return;

        const width = Math.max(300, mount.clientWidth);
        const height = Math.max(260, mount.clientHeight);

        const scene = new ThreeLib.Scene();
        scene.background = new ThreeLib.Color('#0B1220');

        const camera = new ThreeLib.PerspectiveCamera(44, width / height, 0.2, 400);

        renderer = new ThreeLib.WebGLRenderer({ antialias: true, alpha: false });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.setSize(width, height);
        renderer.shadowMap.enabled = true;
        mount.innerHTML = '';
        mount.appendChild(renderer.domElement);

        // Lighting
        const ambient = new ThreeLib.AmbientLight(0xdbeafe, 0.85);
        scene.add(ambient);
        const sun = new ThreeLib.DirectionalLight(0xffffff, 1.15);
        sun.position.set(24, 38, 22);
        sun.castShadow = true;
        scene.add(sun);
        const rim = new ThreeLib.DirectionalLight(0x38bdf8, 0.45);
        rim.position.set(-22, 14, -18);
        scene.add(rim);

        // Helper for colored box
        const addBox = (
          parent: THREE.Object3D,
          w: number,
          h: number,
          d: number,
          x: number,
          y: number,
          z: number,
          color: string | number,
          opacity = 1
        ) => {
          const geo = new ThreeLib.BoxGeometry(w, h, d);
          const mat = new ThreeLib.MeshStandardMaterial({
            color,
            roughness: 0.45,
            metalness: 0.2,
            transparent: opacity < 1,
            opacity
          });
          const mesh = new ThreeLib.Mesh(geo, mat);
          mesh.position.set(x, y, z);
          mesh.castShadow = opacity === 1;
          mesh.receiveShadow = true;
          parent.add(mesh);
          return mesh;
        };

        // Ground grid
        const grid = new ThreeLib.GridHelper(70, 35, 0x334155, 0x162238);
        scene.add(grid);

        const root = new ThreeLib.Group();
        scene.add(root);

        const brandPrimary = deal.branding.primaryHex || '#FF5539';
        const brandAccent = deal.branding.accentHex || '#002870';

        if (viewLevel === 'yard') {
          // Semi-transparent ground slab so subterranean 4.5m piles remain visible when SBC < 110 kPa
          addBox(root, 44, 0.16, 30, 0, -0.08, 0, '#132035', eng.civil.requiresPiling ? 0.55 : 0.92);

          // Zone 1: White-Space Pods or BnM Hall
          const podVisualCount = Math.min(12, Math.max(1, eng.mep.podCount));
          const cols = Math.min(4, podVisualCount);
          const rows = Math.ceil(podVisualCount / cols);

          if (deal.architecture === 'Container') {
            for (let i = 0; i < podVisualCount; i++) {
              const c = i % cols;
              const r = Math.floor(i / cols);
              const px = -12 + c * 5.2;
              const pz = -5 + r * 6.4;

              // RCC Plinth
              if (layers.foundation) {
                addBox(root, 4.4, Math.max(0.5, deal.civil.plinthClearHeightM), 5.2, px, 0.35, pz, '#64748B');
                if (eng.civil.requiresPiling) {
                  // Subterranean 4.5m RCC pile cap + 4 bored piles per pod
                  addBox(root, 4.6, 0.6, 5.4, px, -0.45, pz, '#FF5539', 0.85);
                  for (const dx of [-1.6, 1.6]) {
                    for (const dz of [-1.9, 1.9]) {
                      const pile = new ThreeLib.Mesh(
                        new ThreeLib.CylinderGeometry(0.24, 0.24, 4.5, 10),
                        new ThreeLib.MeshStandardMaterial({ color: '#94A3B8' })
                      );
                      pile.position.set(px + dx, -2.75, pz + dz);
                      root.add(pile);
                    }
                  }
                }
              }

              // Container Pod Shell
              if (layers.shell) {
                const podColor =
                  deal.branding.containerFinish === 'Matte Graphite'
                    ? '#334155'
                    : deal.branding.containerFinish === 'Deep Navy'
                      ? '#002870'
                      : '#E2E8F0';
                addBox(root, 4.0, 3.1, 4.8, px, 2.25, pz, podColor);
                // Brand stripe
                addBox(root, 4.06, 0.32, 4.86, px, 3.55, pz, brandPrimary);
              }
            }
          } else {
            // BnM Hall Building
            const hallW = Math.max(12, cols * 5.0);
            const hallD = Math.max(10, rows * 6.0);
            if (layers.foundation) {
              addBox(root, hallW + 1, 0.8, hallD + 1, -4, 0.4, 0, '#64748B');
              if (eng.civil.requiresPiling) {
                for (let x = -hallW / 2 - 4; x <= hallW / 2 - 4; x += 4.5) {
                  for (let z = -hallD / 2; z <= hallD / 2; z += 4.5) {
                    const pile = new ThreeLib.Mesh(
                      new ThreeLib.CylinderGeometry(0.26, 0.26, 4.5, 10),
                      new ThreeLib.MeshStandardMaterial({ color: '#FF5539' })
                    );
                    pile.position.set(x, -2.25, z);
                    root.add(pile);
                  }
                }
              }
            }
            if (layers.shell) {
              addBox(root, hallW, Math.max(5.5, deal.civil.bnmClearHeightM * 0.85), hallD, -4, 3.6, 0, '#CBD5E1', 0.9);
              addBox(root, hallW + 0.2, 0.45, hallD + 0.2, -4, 6.2, 0, brandAccent);
            }
          }

          // Zone 2: Adiabatic Chillers (Yard or Roof — ZERO Yard CDUs!)
          if (layers.cooling) {
            const chillerVis = Math.min(8, Math.max(1, eng.mep.chillerCountTotal));
            for (let i = 0; i < chillerVis; i++) {
              const cx = deal.chillerPlacement === 'Roof' ? -10 + (i % 4) * 4.6 : -14 + i * 3.8;
              const cy = deal.chillerPlacement === 'Roof' ? 5.2 : 1.4;
              const cz = deal.chillerPlacement === 'Roof' ? -2 + Math.floor(i / 4) * 4.5 : -11.5;
              addBox(root, 3.0, 2.2, 2.2, cx, cy, cz, '#1C38F5');
              addBox(root, 2.8, 0.25, 2.0, cx, cy + 1.2, cz, '#38BDF8');
            }
            // CHW Header pipe connecting Yard to White-Space
            addBox(root, 20, 0.28, 0.28, -4, 1.8, -8.5, '#0EA5E9');
            addBox(root, 20, 0.28, 0.28, -4, 2.25, -8.5, '#FB923C');
          }

          // Zone 3: Electrical Power Yard (MV Switchgear, K-13 Transformers, DGs, BESS)
          if (layers.electrical) {
            // K-13 Transformers
            const trfVis = Math.min(6, Math.max(2, eng.electrical.transformerCountTotal));
            for (let i = 0; i < trfVis; i++) {
              addBox(root, 2.0, 2.3, 1.8, 13.5, 1.25, -10 + i * 3.1, '#FFB600');
            }
            // CPCB-IV+ DGs
            const dgVis = Math.min(5, Math.max(2, eng.electrical.dgCountTotal));
            for (let i = 0; i < dgVis; i++) {
              addBox(root, 3.6, 2.6, 1.9, 17.8, 1.4, -8 + i * 3.8, '#00B290');
            }
            // BESS Skid
            if (deal.includeBessRideThrough) {
              addBox(root, 4.2, 2.7, 2.2, 13.5, 1.45, 9.8, '#FF5539');
            }
            // Dual Busduct Bridge
            addBox(root, 12, 0.35, 0.65, 6.5, 3.8, -1.5, '#F59E0B');
            addBox(root, 12, 0.35, 0.65, 6.5, 3.8, 1.5, '#F59E0B');
          }

          // Security Perimeter & Carrier MMR Vaults
          if (layers.perimeter) {
            addBox(root, 44, 0.4, 0.25, 0, 0.2, 14.8, '#475569');
            addBox(root, 44, 0.4, 0.25, 0, 0.2, -14.8, '#475569');
            addBox(root, 0.25, 0.4, 30, 21.8, 0.2, 0, '#475569');
            addBox(root, 0.25, 0.4, 30, -21.8, 0.2, 0, '#475569');
            // Dual Diverse MMR Vaults
            addBox(root, 2.4, 1.2, 2.0, -19.5, 0.6, 11.5, '#8B5CF6');
            addBox(root, 2.4, 1.2, 2.0, -19.5, 0.6, -11.5, '#8B5CF6');
          }
        } else if (viewLevel === 'container') {
          // LEVEL 2: CONTAINER INTERIOR CUTAWAY (2.5m AI Racks + Internal CDUs + Mandatory 80kW PACs)
          // Raised heavy floor deck
          addBox(root, 18, 0.4, 7.6, 0, 0.2, 0, '#334155');
          if (layers.shell) {
            // Back & End Cutaway Walls + Translucent Roof
            addBox(root, 18, 3.6, 0.2, 0, 2.2, -3.7, '#1E293B');
            addBox(root, 0.2, 3.6, 7.6, -8.9, 2.2, 0, '#1E293B');
            addBox(root, 0.2, 3.6, 7.6, 8.9, 2.2, 0, '#1E293B');
            addBox(root, 18, 0.18, 7.6, 0, 4.05, 0, '#94A3B8', 0.25);
            addBox(root, 18.1, 0.24, 0.24, 0, 3.9, 3.7, brandPrimary);
          }

          // Dual Rows of 2.5m High AI DLC Racks
          for (let r = 0; r < 8; r++) {
            const rx = -5.2 + r * 1.45;
            // North Rack Row
            addBox(root, 0.95, 2.5, 1.25, rx, 1.65, -1.75, '#0F172A');
            addBox(root, 0.8, 0.18, 0.08, rx, 2.65, -1.1, '#38BDF8');
            // South Rack Row
            addBox(root, 0.95, 2.5, 1.25, rx, 1.65, 1.75, '#0F172A');
            addBox(root, 0.8, 0.18, 0.08, rx, 2.65, 1.1, '#00B290');
          }

          // Internal 1.35 MW CDU Towers (Left Internal Gallery — ZERO Yard CDUs)
          if (layers.cooling) {
            addBox(root, 1.4, 2.4, 1.6, -7.4, 1.6, -1.6, '#1C38F5');
            addBox(root, 1.4, 2.4, 1.6, -7.4, 1.6, 1.6, '#1C38F5');
            // Mandatory 80 kW Chilled-Water PACs (Right End Gallery)
            addBox(root, 1.3, 2.35, 1.5, 7.4, 1.58, -1.7, '#00B290');
            addBox(root, 1.3, 2.35, 1.5, 7.4, 1.58, 1.7, '#00B290');
            // Overhead FWS Blue Supply + Orange Return Manifolds
            addBox(root, 14.2, 0.16, 0.16, -0.2, 3.18, -1.75, '#38BDF8');
            addBox(root, 14.2, 0.16, 0.16, -0.2, 3.42, -1.75, '#FF5539');
            addBox(root, 14.2, 0.16, 0.16, -0.2, 3.18, 1.75, '#38BDF8');
            addBox(root, 14.2, 0.16, 0.16, -0.2, 3.42, 1.75, '#FF5539');
          }

          // Overhead Dual A/B IP65 Busducts
          if (layers.electrical) {
            addBox(root, 15.6, 0.22, 0.3, 0, 3.55, -0.65, '#FFB600');
            addBox(root, 15.6, 0.22, 0.3, 0, 3.55, 0.65, '#F59E0B');
          }
        } else {
          // LEVEL 3: BnM HIGH-BAY DATA HALL INTERIOR
          addBox(root, 26, 0.35, 18, 0, 0.18, 0, '#1E293B');
          if (layers.shell) {
            // Perimeter Hall Walls (Cutaway front) + Structural Steel Roof Trusses
            addBox(root, 26, 6.2, 0.3, 0, 3.2, -8.9, '#334155');
            addBox(root, 0.3, 6.2, 18, -12.9, 3.2, 0, '#334155');
            for (let tx = -10; tx <= 10; tx += 5) {
              addBox(root, 0.35, 0.45, 17.8, tx, 6.0, 0, '#64748B');
            }
          }

          // 3 Multi-Aisle High-Density AI Rack Galleries
          for (const gz of [-5.0, 0.0, 5.0]) {
            for (let i = 0; i < 10; i++) {
              const rx = -8.0 + i * 1.45;
              addBox(root, 0.95, 2.5, 1.25, rx, 1.6, gz, '#0F172A');
              addBox(root, 0.8, 0.16, 0.08, rx, 2.6, gz + 0.64, '#38BDF8');
            }
          }

          // Dedicated Internal CDU Row + Perimeter 80 kW PAC Cooling Wall
          if (layers.cooling) {
            for (const cz of [-5.2, -1.8, 1.8, 5.2]) {
              addBox(root, 1.5, 2.5, 1.8, -10.8, 1.6, cz, '#1C38F5'); // Internal CDUs
              addBox(root, 1.6, 2.6, 1.9, 10.6, 1.65, cz, '#00B290'); // Perimeter 80 kW PACs
            }
            for (const gz of [-5.0, 0.0, 5.0]) {
              addBox(root, 18, 0.18, 0.18, -1, 3.6, gz - 0.3, '#38BDF8');
              addBox(root, 18, 0.18, 0.18, -1, 3.85, gz + 0.3, '#FF5539');
            }
          }

          if (layers.electrical) {
            for (const gz of [-5.0, 0.0, 5.0]) {
              addBox(root, 19, 0.25, 0.32, 0, 4.45, gz, '#FFB600');
            }
          }
        }

        const updateCamera = () => {
          const { yaw, pitch, dist } = orbitRef.current;
          const clampedPitch = Math.max(-0.25, Math.min(1.5, pitch));
          camera.position.set(
            dist * Math.cos(clampedPitch) * Math.sin(yaw),
            Math.max(1.0, dist * Math.sin(clampedPitch) + 1.5),
            dist * Math.cos(clampedPitch) * Math.cos(yaw)
          );
          camera.lookAt(0, viewLevel === 'yard' ? 1.2 : 2.0, 0);
        };

        const animate = () => {
          if (disposed || !renderer) return;
          updateCamera();
          renderer.render(scene, camera);
          rafId = window.requestAnimationFrame(animate);
        };
        animate();

        resizeObs = new ResizeObserver(() => {
          if (!mount || !renderer) return;
          const nw = Math.max(260, mount.clientWidth);
          const nh = Math.max(240, mount.clientHeight);
          camera.aspect = nw / nh;
          camera.updateProjectionMatrix();
          renderer.setSize(nw, nh);
        });
        resizeObs.observe(mount);
      } catch (err) {
        setWebglError(err instanceof Error ? err.message : 'WebGL initialization failed.');
      }
    };

    void init();

    return () => {
      disposed = true;
      window.cancelAnimationFrame(rafId);
      resizeObs?.disconnect();
      renderer?.dispose();
    };
  }, [deal, eng, viewLevel, layers]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    orbitRef.current.dragging = true;
    orbitRef.current.lastX = e.clientX;
    orbitRef.current.lastY = e.clientY;
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!orbitRef.current.dragging) return;
    const dx = e.clientX - orbitRef.current.lastX;
    const dy = e.clientY - orbitRef.current.lastY;
    orbitRef.current.lastX = e.clientX;
    orbitRef.current.lastY = e.clientY;
    orbitRef.current.yaw -= dx * 0.008;
    orbitRef.current.pitch = Math.max(-0.2, Math.min(1.48, orbitRef.current.pitch + dy * 0.006));
  };

  const handlePointerUp = () => {
    orbitRef.current.dragging = false;
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    orbitRef.current.dist = Math.max(8, Math.min(72, orbitRef.current.dist + e.deltaY * 0.02));
  };

  if (webglError) {
    return (
      <div className="h-[380px] bg-cad-bg text-slate-200 border border-slate-700 rounded-cad flex flex-col items-center justify-center p-6 text-center text-xs">
        <p className="font-mono text-brand-orange font-bold">3D WEBGL FALLBACK</p>
        <p className="mt-1 text-slate-400 max-w-md">{webglError}</p>
      </div>
    );
  }

  return (
    <div
      ref={hostRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onWheel={handleWheel}
      className="h-[390px] sm:h-[440px] w-full bg-cad-bg rounded-cad border border-slate-800 cursor-grab active:cursor-grabbing touch-none overflow-hidden"
    />
  );
};
