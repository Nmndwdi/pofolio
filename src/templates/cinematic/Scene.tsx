"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import type { LayoutData } from "@/components/layouts/types";
import styles from "./cinematic.module.css";

/*
 * Cinematic 3D scene.
 *
 * One Three.js scene. Camera flies a Catmull-Rom curve through space,
 * visiting 13 chambers arranged along the path. Each chamber is a Group
 * containing 3D objects (glass slabs, iridescent forms, glowing frames)
 * that express the section's "feel" without being its content. The text
 * content itself lives in HTML overlays positioned in screen space —
 * that's done by ChamberOverlays.tsx, not here.
 *
 * The world is unified: matte-black void background, fog falloff for
 * atmospheric depth, RoomEnvironment-derived environment map giving
 * iridescent and glass materials soft reflections. No HDRI file needed
 * because RoomEnvironment is synthesized in JS.
 *
 * Camera motion:
 *   - Scroll position drives a target camera position along the curve
 *   - Actual camera position lerps toward target each frame (damping)
 *     for a heavy, cinematic feel — never abrupt
 *   - Mouse position adds a small parallax offset to camera position
 *     and look-at target, so cursor movement subtly orbits the view
 *   - Look-at = camera position + tangent of curve at slight look-ahead
 *
 * Constant ambient motion (NOT scroll-driven, runs even when scroll is
 * stationary):
 *   - Particles drift slowly through the void
 *   - Chamber objects slowly rotate (each at its own rate)
 *   - Subtle lighting pulse on accent lights
 *
 * Performance:
 *   - Mobile uses simpler materials (no iridescence, no transmission)
 *     and fewer particles
 *   - Pixel ratio capped at 2
 *   - Antialias enabled on desktop only
 *   - prefers-reduced-motion: scene never mounts (CSS hides canvas, the
 *     overlays render as a flat scroll instead)
 */

interface Props {
  slug: string;
  scrollProgressRef: React.MutableRefObject<number>;
  mouseRef: React.MutableRefObject<{ x: number; y: number }>;
  presence: {
    bio: boolean;
    experience: number;
    education: number;
    skills: boolean;
    projects: number;
    github: boolean;
    leetcode: boolean;
    codeforces: boolean;
    writing: boolean;
    ml: boolean;
    wrap: boolean;
  };
}

/* ─── Deterministic hash helpers ─────────────────────────────── */
function hash2(x: number, y: number, seed: number): number {
  let h = (x * 374761393 + y * 668265263 + seed * 982451653) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h = h ^ (h >>> 16);
  return ((h >>> 0) % 100000) / 100000 - 0.5;
}

function hashStringToSeed(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) % 1000000;
}

/* ─── Chamber positions along the camera path ────────────────── */
const CHAMBER_POSITIONS: Record<string, THREE.Vector3> = {
  genesis: new THREE.Vector3(0, 1.6, 0),
  story: new THREE.Vector3(4, 1.6, -16),
  timeline: new THREE.Vector3(-3, 1.6, -32),
  foundation: new THREE.Vector3(2, 1.6, -48),
  workshop: new THREE.Vector3(0, 2.4, -64),
  gallery: new THREE.Vector3(0, 1.6, -82),
  code: new THREE.Vector3(5, 1.6, -100),
  solve: new THREE.Vector3(-5, 1.6, -116),
  compete: new THREE.Vector3(0, 1.6, -132),
  library: new THREE.Vector3(4, 2.0, -150),
  lab: new THREE.Vector3(-4, 1.5, -168),
  departure: new THREE.Vector3(0, 1.6, -186),
  horizon: new THREE.Vector3(0, 3.0, -210),
};

const PARTICLE_COUNT_DESKTOP = 500;
const PARTICLE_COUNT_MOBILE = 200;

export function Scene({
  slug,
  scrollProgressRef,
  mouseRef,
  presence,
}: Props) {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reduceMotion) return;

    const isMobile = window.matchMedia("(max-width: 768px)").matches;
    const seed = hashStringToSeed(slug);

    /* ── Renderer ──────────────────────────────────────────── */
    const renderer = new THREE.WebGLRenderer({
      antialias: !isMobile,
      alpha: false,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x050810, 1);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);

    /* ── Scene + environment ───────────────────────────────── */
    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x050810, 14, 70);

    // RoomEnvironment generates a synthetic environment map ideal for
    // iridescent/glass materials. No HDRI download required.
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envScene = new RoomEnvironment();
    const envMap = pmrem.fromScene(envScene, 0.04).texture;
    scene.environment = envMap;

    /* ── Camera ────────────────────────────────────────────── */
    const camera = new THREE.PerspectiveCamera(
      55,
      window.innerWidth / window.innerHeight,
      0.1,
      400,
    );
    camera.position.copy(CHAMBER_POSITIONS.genesis);

    /* ── Lighting ──────────────────────────────────────────── */
    scene.add(new THREE.AmbientLight(0x202840, 0.4));
    const keyLight = new THREE.DirectionalLight(0xb8c4e8, 0.5);
    keyLight.position.set(8, 16, 6);
    scene.add(keyLight);
    // Faint warm rim from below
    const rim = new THREE.HemisphereLight(0x2a3050, 0x1a1208, 0.3);
    scene.add(rim);
    // Accent point lights placed near "important" chambers — gentle
    // throbbing color
    const accentGenesis = new THREE.PointLight(0x9fb0ff, 5, 14, 1.5);
    accentGenesis.position.set(0, 2, 0);
    scene.add(accentGenesis);
    const accentWorkshop = new THREE.PointLight(0xc090ff, 4, 12, 1.6);
    accentWorkshop.position.copy(CHAMBER_POSITIONS.workshop);
    accentWorkshop.position.y += 1;
    scene.add(accentWorkshop);
    const accentGallery = new THREE.PointLight(0xfff0c8, 4, 14, 1.6);
    accentGallery.position.copy(CHAMBER_POSITIONS.gallery);
    accentGallery.position.y += 2;
    scene.add(accentGallery);
    const accentHorizon = new THREE.PointLight(0x9fb0ff, 6, 18, 1.5);
    accentHorizon.position.copy(CHAMBER_POSITIONS.horizon);
    accentHorizon.position.z -= 6;
    scene.add(accentHorizon);

    /* ── Shared materials (instantiated once, used by many meshes) ──
     *
     * Performance principle: a portfolio chamber doesn't need 70 unique
     * MeshPhysicalMaterial instances with iridescence and transmission.
     * Three "hero" objects (Genesis torus, Workshop icosahedron, Horizon
     * orb) carry the iridescence — they're focal points and the camera
     * lingers near them. Everything else gets a much cheaper material
     * that still reads as "premium" via envMap reflections, metalness,
     * and clearcoat — but without the per-pixel iridescence shader cost
     * and without transmission's extra render pass.
     *
     * The emissive (glow) materials are MeshBasicMaterial — cheapest
     * possible. Tracked in an array so we dispose them on cleanup.
     */

    // Hero material: iridescent, only used by 3 objects total.
    const matHero = new THREE.MeshPhysicalMaterial({
      color: 0x2a3045,
      metalness: 0.5,
      roughness: 0.08,
      iridescence: isMobile ? 0 : 1,
      iridescenceIOR: 1.5,
      iridescenceThicknessRange: [120, 760],
      clearcoat: isMobile ? 0 : 0.8,
      clearcoatRoughness: 0.08,
      envMapIntensity: 1.2,
    });

    // Dark metallic — used by foundation cubes, workshop shards, code
    // frame, lab cubes, departure columns. Reads as "machined dark metal"
    // with envMap giving subtle iridescent-ish color shifts naturally.
    const matDarkMetal = new THREE.MeshStandardMaterial({
      color: 0x1a2030,
      metalness: 0.88,
      roughness: 0.22,
      envMapIntensity: 1.2,
    });

    // Glass — semi-transparent + clearcoat, NO transmission (that's the
    // expensive bit). Used by story slab, timeline panels.
    const matGlassCool = new THREE.MeshPhysicalMaterial({
      color: 0xc8d8ff,
      metalness: 0.15,
      roughness: 0.05,
      clearcoat: 1,
      clearcoatRoughness: 0.05,
      envMapIntensity: 1.5,
      transparent: true,
      opacity: 0.35,
    });

    // Warm glass — gallery frames.
    const matGlassWarm = new THREE.MeshPhysicalMaterial({
      color: 0xfff0c8,
      metalness: 0.15,
      roughness: 0.05,
      clearcoat: 1,
      clearcoatRoughness: 0.05,
      envMapIntensity: 1.5,
      transparent: true,
      opacity: 0.35,
    });

    // Three muted-color materials for library spines so they have visual
    // variety without each being unique.
    const matSpineCool = new THREE.MeshStandardMaterial({
      color: 0x4860a0,
      metalness: 0.75,
      roughness: 0.28,
      envMapIntensity: 1.1,
    });
    const matSpineWarm = new THREE.MeshStandardMaterial({
      color: 0xa06848,
      metalness: 0.75,
      roughness: 0.28,
      envMapIntensity: 1.1,
    });
    const matSpinePurple = new THREE.MeshStandardMaterial({
      color: 0x806080,
      metalness: 0.75,
      roughness: 0.28,
      envMapIntensity: 1.1,
    });

    // Track emissive materials for explicit cleanup since they're created
    // ad-hoc per glow element.
    const emissives: THREE.MeshBasicMaterial[] = [];
    function makeEmissive(
      color: number,
      opacity = 0.5,
    ): THREE.MeshBasicMaterial {
      const m = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity,
        blending: THREE.AdditiveBlending,
        fog: false,
      });
      emissives.push(m);
      return m;
    }

    // List of shared materials we'll dispose on unmount.
    const sharedMats: THREE.Material[] = [
      matHero,
      matDarkMetal,
      matGlassCool,
      matGlassWarm,
      matSpineCool,
      matSpineWarm,
      matSpinePurple,
    ];

    /* ── Particles ─────────────────────────────────────────── */
    const particleCount = isMobile
      ? PARTICLE_COUNT_MOBILE
      : PARTICLE_COUNT_DESKTOP;
    const particlePositions = new Float32Array(particleCount * 3);
    const particleVelocities = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      // Spread particles in a long volume around the camera path
      particlePositions[i * 3] = (hash2(i, 0, seed) * 2) * 30; // -30..30
      particlePositions[i * 3 + 1] = hash2(i, 1, seed) * 2 * 16 + 4; // 4..36
      particlePositions[i * 3 + 2] = hash2(i, 2, seed) * 2 * 220 - 100; // -320..120
      // Very slow drift velocity
      particleVelocities[i * 3] = hash2(i, 3, seed) * 0.008;
      particleVelocities[i * 3 + 1] = hash2(i, 4, seed) * 0.005;
      particleVelocities[i * 3 + 2] = hash2(i, 5, seed) * 0.006;
    }
    const particleGeo = new THREE.BufferGeometry();
    particleGeo.setAttribute(
      "position",
      new THREE.BufferAttribute(particlePositions, 3),
    );
    const particleMat = new THREE.PointsMaterial({
      color: 0xc8d2ff,
      size: 0.04,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
      fog: true,
      depthWrite: false,
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    /* ── Chamber construction helpers ──────────────────────── */

    // Tracks objects with their own rotation rates (separate from scroll)
    const spinners: { obj: THREE.Object3D; rate: THREE.Vector3 }[] = [];

    function addSpinner(
      obj: THREE.Object3D,
      ry: number,
      rx = 0,
      rz = 0,
    ) {
      spinners.push({ obj, rate: new THREE.Vector3(rx, ry, rz) });
    }

    /* ── Chamber 1: Genesis ─────────────────────────────────── */
    // Large iridescent torus knot — visitor enters here (HERO object)
    {
      const g = new THREE.TorusKnotGeometry(2.4, 0.6, 160, 24, 2, 3);
      const torus = new THREE.Mesh(g, matHero);
      torus.position.copy(CHAMBER_POSITIONS.genesis);
      torus.position.z -= 8;
      torus.position.y = 2.5;
      scene.add(torus);
      addSpinner(torus, 0.12, 0.04);
    }

    /* ── Chamber 2: Story (about) ───────────────────────────── */
    // A tall glass slab to the right of camera path
    if (presence.bio) {
      const g = new THREE.BoxGeometry(0.15, 7, 4);
      const slab = new THREE.Mesh(g, matGlassCool);
      slab.position.copy(CHAMBER_POSITIONS.story);
      slab.position.x -= 6;
      slab.position.y = 1.8;
      slab.rotation.y = -0.15;
      scene.add(slab);
    }

    /* ── Chamber 3: Timeline (experience) ───────────────────── */
    // A row of vertical glass panels along the path
    if (presence.experience > 0) {
      const count = Math.min(presence.experience, 6);
      // Reuse one geometry across all panels — same shape; just clone the mesh.
      const panelGeo = new THREE.BoxGeometry(0.1, 3.2, 1.6);
      for (let i = 0; i < count; i++) {
        const panel = new THREE.Mesh(panelGeo, matGlassCool);
        const base = CHAMBER_POSITIONS.timeline;
        panel.position.set(
          base.x + 4,
          1.6,
          base.z + (i - (count - 1) / 2) * 2.4,
        );
        panel.rotation.y = -0.08;
        scene.add(panel);
      }
      // Glowing floor line
      const lineGeo = new THREE.BoxGeometry(0.05, 0.02, count * 2.4 + 2);
      const line = new THREE.Mesh(lineGeo, makeEmissive(0x9fb0ff, 0.7));
      line.position.set(
        CHAMBER_POSITIONS.timeline.x + 4,
        0.05,
        CHAMBER_POSITIONS.timeline.z,
      );
      scene.add(line);
    }

    /* ── Chamber 4: Foundation (education) ──────────────────── */
    // A cluster of small floating cubes — dark metallic
    if (presence.education > 0) {
      const count = Math.min(presence.education, 4);
      const cubeGeo = new THREE.BoxGeometry(0.8, 0.8, 0.8);
      for (let i = 0; i < count; i++) {
        const cube = new THREE.Mesh(cubeGeo, matDarkMetal);
        const base = CHAMBER_POSITIONS.foundation;
        const angle = (i / count) * Math.PI * 2;
        cube.position.set(
          base.x + Math.cos(angle) * 2.2 - 4,
          1.8 + Math.sin(i * 0.7) * 0.3,
          base.z + Math.sin(angle) * 2.2 - 2,
        );
        cube.rotation.set(
          hash2(i, 10, seed) * Math.PI,
          hash2(i, 11, seed) * Math.PI,
          0,
        );
        scene.add(cube);
        addSpinner(cube, 0.08, 0.05);
      }
    }

    /* ── Chamber 5: Workshop (skills) ───────────────────────── */
    // Central iridescent icosahedron — HERO object
    if (presence.skills) {
      const g = new THREE.IcosahedronGeometry(1.6, 1);
      const ico = new THREE.Mesh(g, matHero);
      ico.position.copy(CHAMBER_POSITIONS.workshop);
      ico.position.z -= 6;
      ico.position.y = 2.4;
      scene.add(ico);
      addSpinner(ico, 0.18, 0.06, 0.03);

      // Orbiting smaller dark-metal shards
      const shardGeo = new THREE.OctahedronGeometry(0.32);
      for (let i = 0; i < 5; i++) {
        const shard = new THREE.Mesh(shardGeo, matDarkMetal);
        const angle = (i / 5) * Math.PI * 2;
        shard.position.set(
          CHAMBER_POSITIONS.workshop.x + Math.cos(angle) * 3.2,
          CHAMBER_POSITIONS.workshop.y + Math.sin(i * 1.3) * 0.6,
          CHAMBER_POSITIONS.workshop.z - 6 + Math.sin(angle) * 3.2,
        );
        scene.add(shard);
        addSpinner(shard, 0.4, 0.3, 0.2);
      }
    }

    /* ── Chamber 6: Gallery (projects) ──────────────────────── */
    // Floating warm-glass frames with amber glow backings
    if (presence.projects > 0) {
      const count = Math.min(presence.projects, 5);
      const frameGeo = new THREE.BoxGeometry(2.4, 1.4, 0.05);
      const glowGeo = new THREE.PlaneGeometry(2.8, 1.7);
      const glowMat = makeEmissive(0xfff0c8, 0.4);
      for (let i = 0; i < count; i++) {
        const frame = new THREE.Mesh(frameGeo, matGlassWarm);
        const base = CHAMBER_POSITIONS.gallery;
        const side = i % 2 === 0 ? -1 : 1;
        frame.position.set(
          base.x + side * 3.6,
          1.8,
          base.z + (i - (count - 1) / 2) * 4.5,
        );
        frame.rotation.y = side * 0.25;
        scene.add(frame);
        const glow = new THREE.Mesh(glowGeo, glowMat);
        glow.position.copy(frame.position);
        glow.position.z += side === 1 ? -0.1 : 0.1;
        glow.rotation.copy(frame.rotation);
        scene.add(glow);
      }
    }

    /* ── Chamber 7: Code (GitHub) ───────────────────────────── */
    // Hologram panel + dark frame
    if (presence.github) {
      const g = new THREE.PlaneGeometry(4, 2.4);
      const panel = new THREE.Mesh(g, makeEmissive(0x4ade80, 0.5));
      panel.position.copy(CHAMBER_POSITIONS.code);
      panel.position.x -= 5;
      panel.position.z -= 4;
      panel.rotation.y = 0.4;
      scene.add(panel);
      const frameG = new THREE.BoxGeometry(4.2, 2.6, 0.08);
      const frame = new THREE.Mesh(frameG, matDarkMetal);
      frame.position.copy(panel.position);
      frame.position.z -= 0.05;
      frame.rotation.copy(panel.rotation);
      scene.add(frame);
    }

    /* ── Chamber 8: Solve (LeetCode) ────────────────────────── */
    // Three glowing bars in dark-metal frames
    if (presence.leetcode) {
      const colors = [0x6dd49a, 0xffb86b, 0xff7b7b];
      for (let i = 0; i < 3; i++) {
        const height = 1.4 + (2 - i) * 0.6;
        const g = new THREE.BoxGeometry(0.4, height, 0.4);
        const bar = new THREE.Mesh(g, makeEmissive(colors[i], 0.45));
        bar.position.set(
          CHAMBER_POSITIONS.solve.x + 4 + (i - 1) * 0.8,
          0.7 + height / 2,
          CHAMBER_POSITIONS.solve.z - 4,
        );
        scene.add(bar);
        const frameG = new THREE.BoxGeometry(0.5, height + 0.1, 0.5);
        const frame = new THREE.Mesh(frameG, matDarkMetal);
        frame.position.copy(bar.position);
        scene.add(frame);
      }
    }

    /* ── Chamber 9: Compete (Codeforces) ────────────────────── */
    // 3D rating sparkline as glowing tube
    if (presence.codeforces) {
      const points: THREE.Vector3[] = [];
      const len = 16;
      for (let i = 0; i < len; i++) {
        const t = i / (len - 1);
        const height = 1.5 + Math.sin(i * 0.7 + seed * 0.01) * 0.5 + t * 0.8;
        points.push(
          new THREE.Vector3(
            CHAMBER_POSITIONS.compete.x - 2.5 + t * 5,
            height,
            CHAMBER_POSITIONS.compete.z - 4,
          ),
        );
      }
      const curveLine = new THREE.CatmullRomCurve3(points);
      const tubeGeo = new THREE.TubeGeometry(curveLine, 50, 0.04, 8, false);
      const tube = new THREE.Mesh(tubeGeo, makeEmissive(0xff9090, 0.7));
      scene.add(tube);
    }

    /* ── Chamber 10: Library (writing) ──────────────────────── */
    // Row of thin spines using 3 cycling materials (visual variety,
    // not 12 unique materials)
    if (presence.writing) {
      const spineCount = 12;
      const spineMats = [matSpineCool, matSpineWarm, matSpinePurple];
      for (let i = 0; i < spineCount; i++) {
        const h = 1.8 + hash2(i, 20, seed) * 0.8;
        const w = 0.14 + Math.abs(hash2(i, 21, seed)) * 0.08;
        const g = new THREE.BoxGeometry(w, h, 0.6);
        const mat = spineMats[i % 3];
        const spine = new THREE.Mesh(g, mat);
        spine.position.set(
          CHAMBER_POSITIONS.library.x - 4 + i * 0.22,
          1.5,
          CHAMBER_POSITIONS.library.z - 3,
        );
        scene.add(spine);
      }
    }

    /* ── Chamber 11: Lab (ML) ───────────────────────────────── */
    // 3x3 lattice of dark-metal cubes
    if (presence.ml) {
      const cubeGeo = new THREE.BoxGeometry(0.5, 0.5, 0.5);
      for (let x = 0; x < 3; x++) {
        for (let y = 0; y < 3; y++) {
          const cube = new THREE.Mesh(cubeGeo, matDarkMetal);
          cube.position.set(
            CHAMBER_POSITIONS.lab.x + 4 + (x - 1) * 0.9,
            1.0 + y * 0.9,
            CHAMBER_POSITIONS.lab.z - 4,
          );
          cube.rotation.set(
            hash2(x, y * 10, seed) * Math.PI,
            hash2(x * 7, y, seed) * Math.PI,
            0,
          );
          scene.add(cube);
          addSpinner(cube, 0.1, 0.05);
        }
      }
    }

    /* ── Chamber 12: Departure (wrap) ───────────────────────── */
    // Three iridescent columns with glowing caps
    if (presence.wrap) {
      const colGeo = new THREE.CylinderGeometry(0.18, 0.18, 3.2, 8);
      const capGeo = new THREE.SphereGeometry(0.25, 16, 8);
      const capMat = makeEmissive(0x9fb0ff, 0.75);
      for (let i = 0; i < 3; i++) {
        const col = new THREE.Mesh(colGeo, matDarkMetal);
        col.position.set(
          CHAMBER_POSITIONS.departure.x + (i - 1) * 1.8,
          1.6,
          CHAMBER_POSITIONS.departure.z - 4,
        );
        scene.add(col);
        const capTop = new THREE.Mesh(capGeo, capMat);
        capTop.position.set(col.position.x, col.position.y + 1.7, col.position.z);
        scene.add(capTop);
        const capBot = new THREE.Mesh(capGeo, capMat);
        capBot.position.set(col.position.x, col.position.y - 1.7, col.position.z);
        scene.add(capBot);
      }
    }

    /* ── Chamber 13: Horizon ────────────────────────────────── */
    // HERO object — iridescent orb + additive halo
    {
      const g = new THREE.SphereGeometry(2.2, 32, 24);
      const orb = new THREE.Mesh(g, matHero);
      orb.position.copy(CHAMBER_POSITIONS.horizon);
      orb.position.z -= 14;
      orb.position.y = 3.5;
      scene.add(orb);
      addSpinner(orb, 0.06, 0.02);
      const haloG = new THREE.SphereGeometry(3, 24, 16);
      const haloM = new THREE.MeshBasicMaterial({
        color: 0x9fb0ff,
        transparent: true,
        opacity: 0.18,
        blending: THREE.AdditiveBlending,
        fog: false,
        side: THREE.BackSide,
      });
      emissives.push(haloM);
      const halo = new THREE.Mesh(haloG, haloM);
      halo.position.copy(orb.position);
      scene.add(halo);
    }

    /* ── Camera path ────────────────────────────────────────── */
    // Build the camera path through all chambers IN ORDER, even if some
    // chambers have no 3D content (we still want camera to traverse the
    // same space for predictable scroll mapping).
    const pathKeys = [
      "genesis",
      "story",
      "timeline",
      "foundation",
      "workshop",
      "gallery",
      "code",
      "solve",
      "compete",
      "library",
      "lab",
      "departure",
      "horizon",
    ];
    const curvePoints = pathKeys.map((k) => CHAMBER_POSITIONS[k].clone());
    const curve = new THREE.CatmullRomCurve3(curvePoints);
    curve.curveType = "catmullrom";
    curve.tension = 0.4;

    /* ── Render loop ────────────────────────────────────────── */
    const targetPos = new THREE.Vector3();
    const targetLook = new THREE.Vector3();
    const currentPos = camera.position.clone();
    const currentLook = curvePoints[1].clone();
    const tmpTangent = new THREE.Vector3();
    const startTime = performance.now();
    let raf = 0;
    // Damping factor — lower = heavier/smoother feel, but more lag in
    // response. 0.045 ≈ ~360ms time constant at 60fps, which reads as
    // "cinematic glide" rather than "responsive scroll."
    const DAMPING = 0.045;

    const render = () => {
      const now = performance.now();
      const elapsed = (now - startTime) / 1000;

      // Scroll → target camera position along curve
      const p = Math.min(0.999, Math.max(0, scrollProgressRef.current));
      curve.getPointAt(p, targetPos);
      curve.getTangentAt(p, tmpTangent);
      // Look slightly ahead along the curve so camera looks forward
      curve.getPointAt(Math.min(0.999, p + 0.025), targetLook);

      // Damping — current lerps toward target
      currentPos.lerp(targetPos, DAMPING);
      currentLook.lerp(targetLook, DAMPING);

      // Mouse parallax — small offsets on both position and look-at
      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;
      const parallaxPos = 0.6;
      const parallaxLook = 1.2;
      camera.position.copy(currentPos);
      camera.position.x += mx * parallaxPos;
      camera.position.y += my * parallaxPos * 0.4;
      const lookTarget = currentLook.clone();
      lookTarget.x += mx * parallaxLook;
      lookTarget.y += my * parallaxLook * 0.5;
      camera.lookAt(lookTarget);

      // Particle drift — update positions
      const pos = particleGeo.attributes.position as THREE.BufferAttribute;
      const posArray = pos.array as Float32Array;
      for (let i = 0; i < particleCount; i++) {
        posArray[i * 3] += particleVelocities[i * 3];
        posArray[i * 3 + 1] += particleVelocities[i * 3 + 1];
        posArray[i * 3 + 2] += particleVelocities[i * 3 + 2];
        // Wrap particles that drift far from path back in
        if (posArray[i * 3 + 2] > 30) posArray[i * 3 + 2] = -220;
        if (posArray[i * 3 + 2] < -260) posArray[i * 3 + 2] = 30;
        if (posArray[i * 3] > 40) posArray[i * 3] = -40;
        if (posArray[i * 3] < -40) posArray[i * 3] = 40;
        if (posArray[i * 3 + 1] > 38) posArray[i * 3 + 1] = 2;
        if (posArray[i * 3 + 1] < 0) posArray[i * 3 + 1] = 38;
      }
      pos.needsUpdate = true;

      // Spin all spinner objects independent of scroll
      for (const s of spinners) {
        s.obj.rotation.x += s.rate.x * 0.01;
        s.obj.rotation.y += s.rate.y * 0.01;
        s.obj.rotation.z += s.rate.z * 0.01;
      }

      // Accent light pulses
      accentGenesis.intensity = 5 + Math.sin(elapsed * 0.8) * 1.5;
      accentWorkshop.intensity = 4 + Math.sin(elapsed * 0.6 + 1) * 1.2;
      accentGallery.intensity = 4 + Math.sin(elapsed * 0.9 + 2) * 1;
      accentHorizon.intensity = 6 + Math.sin(elapsed * 0.5) * 2;

      renderer.render(scene, camera);
      raf = requestAnimationFrame(render);
    };
    raf = requestAnimationFrame(render);

    /* ── Resize handling ────────────────────────────────────── */
    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("resize", onResize);

    /* ── Cleanup ────────────────────────────────────────────── */
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);

      // Dispose all geometries via traversal
      scene.traverse((obj) => {
        if ((obj as THREE.Mesh).geometry) {
          (obj as THREE.Mesh).geometry.dispose();
        }
      });

      // Dispose shared materials (each used by many meshes — we manage
      // these explicitly rather than via traversal to avoid disposing
      // the same material multiple times via different meshes).
      for (const m of sharedMats) m.dispose();
      for (const m of emissives) m.dispose();

      particleGeo.dispose();
      particleMat.dispose();
      pmrem.dispose();
      envMap.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, [slug, scrollProgressRef, mouseRef, presence]);

  return (
    <div ref={mountRef} className={styles.canvas} aria-hidden="true" />
  );
}