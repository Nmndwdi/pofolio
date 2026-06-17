"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import styles from "./spatial-walk.module.css";

/*
 * Landscape — the WebGL scene for spatial-walk.
 *
 * Builds:
 *   - A stylized low-poly terrain (procedurally displaced PlaneGeometry)
 *   - A winding camera path (CatmullRomCurve3) — what the visitor walks along
 *   - Instanced trees scattered along/away from the path
 *   - Distant mountains for parallax depth
 *   - A moon (sphere with emissive material) and 800 stars (Points)
 *   - Blue fog for atmospheric depth
 *
 * The camera is first-person: position is on the curve, look-at is the
 * curve's tangent direction. Head bob (vertical sine), gentle sway
 * (horizontal sine), and a tiny look-noise on Y axis make the motion feel
 * like real walking, not a dolly shot.
 *
 * scrollProgressRef: a ref written by SpatialWalk's scroll handler. The
 * render loop reads it every frame — no React re-renders happen during
 * scroll. This is the standard pattern for WebGL-in-React without making
 * the canvas a controlled component.
 *
 * Performance:
 *   - Pixel ratio capped at 2 (retina) regardless of device DPI
 *   - InstancedMesh for trees (one draw call for all)
 *   - Stars as Points (very cheap)
 *   - No shadows (saves a render pass)
 *   - Mobile: lower terrain res, fewer trees, fewer stars
 *
 * Seed: the slug seeds the deterministic noise functions so each portfolio
 * gets a stable landscape (same slug → same hills, trees, stars).
 */

interface Props {
  slug: string;
  scrollProgressRef: React.MutableRefObject<number>;
}

/* ─── Deterministic noise functions ──────────────────────────── */
// We avoid pulling in simplex-noise / perlin libs; the visual is stylized
// enough that smoothed value-noise reads well.

function hash2(x: number, y: number, seed: number): number {
  let h = (x * 374761393 + y * 668265263 + seed * 982451653) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h = h ^ (h >>> 16);
  return ((h >>> 0) % 100000) / 100000 - 0.5;
}

function smoothNoise(x: number, y: number, seed: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const a = hash2(xi, yi, seed);
  const b = hash2(xi + 1, yi, seed);
  const c = hash2(xi, yi + 1, seed);
  const d = hash2(xi + 1, yi + 1, seed);
  const sx = xf * xf * (3 - 2 * xf);
  const sy = yf * yf * (3 - 2 * yf);
  return (
    a * (1 - sx) * (1 - sy) +
    b * sx * (1 - sy) +
    c * (1 - sx) * sy +
    d * sx * sy
  );
}

function fbm(x: number, y: number, octaves: number, seed: number): number {
  let v = 0;
  let amp = 1;
  let freq = 1;
  let max = 0;
  for (let i = 0; i < octaves; i++) {
    v += smoothNoise(x * freq, y * freq, seed + i * 17) * amp;
    max += amp;
    amp *= 0.5;
    freq *= 2;
  }
  return v / max;
}

function hashStringToSeed(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) % 1000000;
}

/* ─── Camera path builder ────────────────────────────────────── */
function buildCameraPath(seed: number): THREE.CatmullRomCurve3 {
  // 16 control points winding gently forward. X drifts side to side using
  // a slow sine + small noise. Y stays at eye height. Z marches forward.
  // We build a long path (~140 units) so there's room for many sections.
  const points: THREE.Vector3[] = [];
  const totalDistance = 140;
  const numPoints = 16;
  for (let i = 0; i < numPoints; i++) {
    const t = i / (numPoints - 1);
    const z = -t * totalDistance;
    // Gentle winding: a slow sine across the journey + small per-point
    // noise so it doesn't look mathematical.
    const x =
      Math.sin(t * Math.PI * 2.2) * 2.4 +
      hash2(i, 0, seed) * 1.2;
    const y = 1.6; // eye height
    points.push(new THREE.Vector3(x, y, z));
  }
  const curve = new THREE.CatmullRomCurve3(points);
  curve.curveType = "catmullrom";
  curve.tension = 0.3;
  return curve;
}

/* ─── Component ──────────────────────────────────────────────── */
export function Landscape({ slug, scrollProgressRef }: Props) {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const seed = hashStringToSeed(slug);
    const isMobile = window.matchMedia("(max-width: 768px)").matches;
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    // If reduced-motion, don't even spin up WebGL. CSS handles the flat
    // fallback at the .root level.
    if (reduceMotion) return;

    /* ── Renderer ───────────────────────────────────────────── */
    const renderer = new THREE.WebGLRenderer({
      antialias: !isMobile,
      alpha: false,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    // Daylight snowscape — cold pale blue-white sky
    renderer.setClearColor(0xd6e0ec, 1);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);

    /* ── Scene + Camera ─────────────────────────────────────── */
    const scene = new THREE.Scene();
    // Snowy atmospheric haze — whitish-blue, blends snow ground into sky
    // so distant mountains feel infinite.
    scene.fog = new THREE.Fog(0xe2eaf2, 20, 105);

    const camera = new THREE.PerspectiveCamera(
      65,
      window.innerWidth / window.innerHeight,
      0.1,
      200,
    );

    /* ── Lighting ───────────────────────────────────────────── */
    // Daylight hemisphere: warm sky tint from above, cool from ground bounce
    const hemi = new THREE.HemisphereLight(0xeaf2ff, 0x4a5048, 1.0);
    scene.add(hemi);
    // Sun-style directional — bright warm
    const sun = new THREE.DirectionalLight(0xfff4d8, 1.4);
    sun.position.set(12, 22, 6);
    scene.add(sun);
    // Subtle ambient floor so shadowed sides aren't fully black
    scene.add(new THREE.AmbientLight(0x506880, 0.35));
    // Solo-Leveling magical-aura point light — a soft violet that follows the
    // visitor (will be repositioned each frame near the camera in the
    // render loop, so the world has a slight magical wash near the visitor)
    const auraLight = new THREE.PointLight(0x9080ff, 1.2, 18, 1.4);
    auraLight.position.set(0, 3, 0);
    scene.add(auraLight);

    /* ── Terrain ────────────────────────────────────────────── */
    const terrainSize = 180;
    const terrainSegments = isMobile ? 80 : 130;
    const terrainGeo = new THREE.PlaneGeometry(
      terrainSize,
      terrainSize,
      terrainSegments,
      terrainSegments,
    );
    terrainGeo.rotateX(-Math.PI / 2);
    // Displace terrain with fBm noise. Bigger amplitude now — these are
    // mountains, not gentle hills. A narrow walkable valley persists
    // along the camera path so the visitor isn't stuck inside terrain.
    const posAttr = terrainGeo.attributes.position;
    for (let i = 0; i < posAttr.count; i++) {
      const x = posAttr.getX(i);
      const z = posAttr.getZ(i);
      // Mountains — bigger amplitude
      const hill = fbm(x * 0.035, z * 0.035, 4, seed) * 14;
      // Distance from camera path centerline (still slight S-curve in X)
      const pathOffset = Math.sin(z * 0.04) * 2.5;
      const distFromPath = Math.abs(x - pathOffset);
      // Narrower walkable corridor — only ~4 units flat, then rises fast
      const pathMask = Math.min(1, Math.max(0, (distFromPath - 2) / 5));
      const y = hill * pathMask;
      posAttr.setY(i, y);
    }
    posAttr.needsUpdate = true;
    terrainGeo.computeVertexNormals();
    const terrainMat = new THREE.MeshStandardMaterial({
      color: 0xeef2f6, // bright snow white with the faintest cool tint
      roughness: 0.85,
      metalness: 0,
      flatShading: true,
    });
    const terrain = new THREE.Mesh(terrainGeo, terrainMat);
    terrain.position.y = -0.05;
    scene.add(terrain);

    /* (Path strip removed — pure snow, no road.) */
    /* (Trees removed — bare snowy mountains, nothing growing.) */

    /* ── Distant mountains ───────────────────────────────────── */
    // Big low-poly cones in the back. Bright snow white so they catch
    // sun against the pale sky. Fog softens them into atmospheric haze.
    const mountainCount = 7;
    const mountainMat = new THREE.MeshStandardMaterial({
      color: 0xdde4ec, // snowy peaks — bright but slightly cooler than terrain
      roughness: 0.9,
      flatShading: true,
    });
    const mountains = new THREE.Group();
    for (let i = 0; i < mountainCount; i++) {
      const radius = 14 + hash2(i, 5, seed) * 6;
      const height = 14 + hash2(i, 6, seed) * 10;
      const geo = new THREE.ConeGeometry(radius, height, 5);
      const m = new THREE.Mesh(geo, mountainMat);
      const angle = (i / mountainCount) * Math.PI * 2 + hash2(i, 7, seed);
      const dist = 70 + hash2(i, 8, seed) * 20;
      m.position.set(
        Math.cos(angle) * dist,
        height / 2 - 1,
        -140 + Math.sin(angle) * dist * 0.4,
      );
      mountains.add(m);
    }
    scene.add(mountains);

    /* ── Magical sparkles (Solo Leveling aura motes) ────────── */
    // Daylight scene doesn't get stars, but it gets glowing violet/blue
    // "magical aura" motes — the kind of particle effect that appears
    // around Sung Jin-woo when his shadow power activates. These drift
    // through the world independently and give the daytime scene the
    // sci-fi/magical otherworldly tone.
    const sparkleCount = isMobile ? 280 : 500;
    const sparklePositions = new Float32Array(sparkleCount * 3);
    const sparkleVelocities: Array<{ vx: number; vy: number; vz: number }> = [];
    for (let i = 0; i < sparkleCount; i++) {
      // Spread sparkles in a long volume along the camera path
      sparklePositions[i * 3] = hash2(i, 30, seed) * 2 * 18; // -18..18
      sparklePositions[i * 3 + 1] = 0.5 + Math.abs(hash2(i, 31, seed)) * 5; // 0.5..3
      sparklePositions[i * 3 + 2] = hash2(i, 32, seed) * 2 * 90 - 60; // ~-150..30
      sparkleVelocities.push({
        vx: hash2(i, 33, seed) * 0.006,
        vy: 0.003 + Math.abs(hash2(i, 34, seed)) * 0.004, // mostly upward drift
        vz: hash2(i, 35, seed) * 0.004,
      });
    }
    const sparkleGeo = new THREE.BufferGeometry();
    sparkleGeo.setAttribute(
      "position",
      new THREE.BufferAttribute(sparklePositions, 3),
    );
    const sparkleMat = new THREE.PointsMaterial({
      color: 0xb8a8ff, // soft violet — the Solo Leveling signature aura
      size: 0.12,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: true,
    });
    const sparkles = new THREE.Points(sparkleGeo, sparkleMat);
    scene.add(sparkles);

    /* ── Sun ────────────────────────────────────────────────── */
    // Bright warm sun high in the sky. Behind a soft halo.
    const sunGeo = new THREE.SphereGeometry(2.4, 24, 16);
    const sunMat = new THREE.MeshBasicMaterial({
      color: 0xfff4d8,
      fog: false,
    });
    const sunMesh = new THREE.Mesh(sunGeo, sunMat);
    sunMesh.position.set(16, 28, -80);
    scene.add(sunMesh);
    // Soft warm halo
    const sunHalo = new THREE.Mesh(
      new THREE.SphereGeometry(5, 16, 12),
      new THREE.MeshBasicMaterial({
        color: 0xfff0c0,
        transparent: true,
        opacity: 0.18,
        fog: false,
        side: THREE.BackSide,
      }),
    );
    sunHalo.position.copy(sunMesh.position);
    scene.add(sunHalo);

    /* ── Solo Leveling: a single distant violet "portal" form ── */
    // Far ahead on the path — a vertical glowing rectangle suggesting a
    // dungeon gate / portal. Subtle, just a hint of magic in the
    // distance. Sits beyond the horizon point.
    const gateGeo = new THREE.PlaneGeometry(1.6, 3);
    const gateMat = new THREE.MeshBasicMaterial({
      color: 0x6b5fff,
      transparent: true,
      opacity: 0.55,
      side: THREE.DoubleSide,
      fog: true,
      blending: THREE.AdditiveBlending,
    });
    const gate = new THREE.Mesh(gateGeo, gateMat);
    gate.position.set(0, 2.5, -160);
    scene.add(gate);

    /* ── Camera path ─────────────────────────────────────────── */
    const curve = buildCameraPath(seed);

    /* ── Render loop ─────────────────────────────────────────── */
    const lookTarget = new THREE.Vector3();
    const tmpTangent = new THREE.Vector3();
    let raf = 0;
    let startTime = performance.now();

    const render = () => {
      const now = performance.now();
      const elapsed = (now - startTime) / 1000;

      // Map scroll progress (0..1) → curve t. Clamp to slight inset so we
      // never run off the curve ends.
      const p = Math.min(0.999, Math.max(0, scrollProgressRef.current));

      // Position along curve
      curve.getPointAt(p, camera.position);
      // Tangent gives look direction
      curve.getTangentAt(p, tmpTangent);
      // Build a "look at" point a few units ahead along the tangent.
      // Negate because the path runs into -Z and the tangent points that
      // way too, so this is correct: look further along the tangent.
      lookTarget.copy(camera.position).add(tmpTangent.multiplyScalar(3));

      // Head bob: gentle vertical sine. Scale slightly with scroll speed
      // (we approximate speed = always present so it walks even when
      // stopped, like a person standing still still breathes/shifts).
      const bobY = Math.sin(elapsed * 3.4) * 0.04;
      // Side sway: slower, smaller
      const swayX = Math.sin(elapsed * 1.7) * 0.025;
      // Combine: we ADD to position AFTER setting from curve
      camera.position.y += bobY;
      camera.position.x += swayX;

      // Subtle look-noise on Y axis so the visitor's gaze "drifts"
      lookTarget.y += Math.sin(elapsed * 0.9) * 0.06;

      camera.lookAt(lookTarget);

      // Tiny head tilt (rotate around forward axis) — sells the walking feel
      camera.rotation.z += Math.sin(elapsed * 1.7) * 0.008;

      // Sun halo pulse (very subtle)
      sunHalo.scale.setScalar(1 + Math.sin(elapsed * 0.5) * 0.03);

      // Distant gate pulse — opacity throbs gently to feel "alive"
      gateMat.opacity = 0.45 + Math.sin(elapsed * 0.8) * 0.18;

      // Aura light follows the visitor (3 units ahead + 1 above), giving
      // the immediate area around the camera a faint violet wash — the
      // Solo Leveling shadow-aura signature.
      auraLight.position.copy(camera.position);
      auraLight.position.y += 1;
      auraLight.intensity = 1.2 + Math.sin(elapsed * 1.4) * 0.4;

      // Sparkle drift — each particle floats slowly upward + drifts sideways.
      // Particles that drift too high or far reset to a fresh position near
      // the camera so the visitor always has aura motes around them.
      const sparkPos = sparkleGeo.attributes.position as THREE.BufferAttribute;
      const sparkArr = sparkPos.array as Float32Array;
      for (let i = 0; i < sparkleCount; i++) {
        const v = sparkleVelocities[i];
        sparkArr[i * 3] += v.vx;
        sparkArr[i * 3 + 1] += v.vy;
        sparkArr[i * 3 + 2] += v.vz;
        // Wrap when out of bounds (keeps the field looking populated
        // around the camera throughout the journey)
        if (sparkArr[i * 3 + 1] > 6) {
          sparkArr[i * 3 + 1] = 0.3;
        }
        if (sparkArr[i * 3 + 2] > 30) sparkArr[i * 3 + 2] = -150;
        if (sparkArr[i * 3 + 2] < -160) sparkArr[i * 3 + 2] = 30;
        if (sparkArr[i * 3] > 20) sparkArr[i * 3] = -20;
        if (sparkArr[i * 3] < -20) sparkArr[i * 3] = 20;
      }
      sparkPos.needsUpdate = true;

      renderer.render(scene, camera);
      raf = requestAnimationFrame(render);
    };
    raf = requestAnimationFrame(render);

    /* ── Resize handling ─────────────────────────────────────── */
    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("resize", onResize);

    /* ── Cleanup ─────────────────────────────────────────────── */
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      // Dispose geometries / materials / textures
      terrainGeo.dispose();
      terrainMat.dispose();
      // (path/trees were removed for the snowy mountains aesthetic)
      mountainMat.dispose();
      mountains.children.forEach((c: THREE.Object3D) => {
        if ((c as THREE.Mesh).geometry) (c as THREE.Mesh).geometry.dispose();
      });
      sparkleGeo.dispose();
      sparkleMat.dispose();
      sunGeo.dispose();
      sunMat.dispose();
      sunHalo.geometry.dispose();
      (sunHalo.material as THREE.Material).dispose();
      gateGeo.dispose();
      gateMat.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, [slug, scrollProgressRef]);

  return <div ref={mountRef} className={styles.sceneFixed} aria-hidden="true" />;
}