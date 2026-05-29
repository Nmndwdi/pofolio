"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

/*
 * 3D "QR-like" sculpture for the landing page.
 *
 * NOT a real scannable QR code — that's intentional. Real QR codes have
 * fixed structure (finder patterns, alignment squares) and look ugly when
 * stylized as 3D. We generate a deterministic 21x21 dot pattern that *reads*
 * as a QR code at a glance but is just abstract geometry.
 *
 * We use deterministic pseudo-randomness (seeded from cell coordinates) so
 * the pattern is identical on every render — important for SSR, important
 * for visual consistency.
 *
 * Performance:
 *   - InstancedMesh batches all ~440 cubes into a single draw call
 *   - Slow rotation (~12s per revolution) so it reads as "alive, not gimmicky"
 *   - dpr capped at 1.5 — diminishing returns past that, kills mobile battery
 */

const GRID = 21; // QR-ish: real QR Version 1 is 21×21
const FINDER_SIZE = 7;

/** Hash a 2-int coordinate to [0, 1) — deterministic per-cell. */
function hash2(x: number, y: number) {
  let h = (x * 374761393 + y * 668265263) >>> 0;
  h = ((h ^ (h >>> 13)) * 1274126177) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Is this cell part of one of the three "finder" squares (corners of a real QR)? */
function isFinder(x: number, y: number) {
  const inSquare = (cx: number, cy: number) =>
    x >= cx && x < cx + FINDER_SIZE && y >= cy && y < cy + FINDER_SIZE;
  if (!(inSquare(0, 0) || inSquare(GRID - FINDER_SIZE, 0) || inSquare(0, GRID - FINDER_SIZE)))
    return false;
  // Concentric ring pattern: filled border, blank ring inside, filled center
  const dx = Math.min(x, x - (GRID - FINDER_SIZE));
  const dy = Math.min(y, y - (GRID - FINDER_SIZE));
  const localX = x < FINDER_SIZE ? x : x - (GRID - FINDER_SIZE);
  const localY = y < FINDER_SIZE ? y : y - (GRID - FINDER_SIZE);
  // Border ring (thickness 1): filled
  if (
    localX === 0 || localX === FINDER_SIZE - 1 ||
    localY === 0 || localY === FINDER_SIZE - 1
  ) return true;
  // 3×3 center: filled
  if (localX >= 2 && localX <= 4 && localY >= 2 && localY <= 4) return true;
  // Otherwise blank
  return false;
}

function shouldShow(x: number, y: number): boolean {
  if (isFinder(x, y)) return true;
  // Skip the alignment column/row of the finder (look ugly when randomized)
  if (
    (x < FINDER_SIZE + 1 && y < FINDER_SIZE + 1) ||
    (x >= GRID - FINDER_SIZE - 1 && y < FINDER_SIZE + 1) ||
    (x < FINDER_SIZE + 1 && y >= GRID - FINDER_SIZE - 1)
  ) return false;
  // Random fill at ~50% density for a QR-like texture
  return hash2(x, y) > 0.5;
}

function QRGrid() {
  const meshRef = useRef<THREE.InstancedMesh | null>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  // Pre-compute cell positions ONCE — this drives the InstancedMesh count
  // and the per-frame matrix update.
  const cells = useMemo(() => {
    const list: Array<{ x: number; y: number }> = [];
    for (let x = 0; x < GRID; x++) {
      for (let y = 0; y < GRID; y++) {
        if (shouldShow(x, y)) list.push({ x, y });
      }
    }
    return list;
  }, []);

  // Slow Y-axis rotation. The "0.06" multiplier corresponds to ~one full
  // revolution per ~104 seconds at 60fps — slow enough to feel calm.
  useFrame((_, delta) => {
    if (!meshRef.current) return;
    meshRef.current.rotation.y += delta * 0.06;
  });

  // Set per-instance positions once after mount via a callback ref.
  // The `mesh` argument is the underlying Three.js InstancedMesh; we both
  // populate matrices AND store the ref for the per-frame rotation.
  const onMount = (mesh: THREE.InstancedMesh | null) => {
    meshRef.current = mesh;
    if (!mesh) return;
    cells.forEach((c, i) => {
      const px = c.x - (GRID - 1) / 2;
      const py = -(c.y - (GRID - 1) / 2);
      dummy.position.set(px * 0.32, py * 0.32, 0);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  };

  return (
    <instancedMesh
      ref={onMount}
      args={[undefined, undefined, cells.length]}
      castShadow
    >
      <boxGeometry args={[0.28, 0.28, 0.28]} />
      <meshStandardMaterial
        color="#1a1a1a"
        metalness={0.2}
        roughness={0.4}
      />
    </instancedMesh>
  );
}

export default function QRSculpture() {
  return (
    <Canvas
      camera={{ position: [0, 0, 9], fov: 45 }}
      dpr={[1, 1.5]}
      gl={{ antialias: true, alpha: true }}
      style={{ background: "transparent" }}
      // Disable interaction — this is decorative, not a 3D toy
      eventSource={undefined}
    >
      {/* Soft directional light from upper-left + ambient fill */}
      <ambientLight intensity={0.45} />
      <directionalLight position={[5, 8, 6]} intensity={0.9} />
      <directionalLight position={[-3, -2, 4]} intensity={0.25} color="#c2532a" />
      <QRGrid />
    </Canvas>
  );
}
