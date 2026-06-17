import type { LayoutData } from "@/components/layouts/types";
import { SpatialWalk } from "./SpatialWalk";

/*
 * Spatial-walk template — entry point.
 *
 * Self-contained under src/templates/spatial-walk/. The visitor "walks
 * forward down a nighttime path" — scroll progress maps to camera Z
 * translation through a CSS-3D-perspective scene. Each portfolio section is
 * rendered as a signpost / stone marker / clearing along the path.
 *
 * No WebGL. Pure CSS 3D transforms + one scroll listener writing a CSS
 * variable. Works on mobile (reduced perspective depth) and respects
 * prefers-reduced-motion (flattens to vertical scroll, same content).
 *
 * Aesthetic: deep navy night, cool-blue moonlight, wooden signposts and
 * stone markers. Body font is grotesk (Inter / Geist family fallback).
 * Project clearings use the portal-modal pattern from Press/Brutalist.
 */

export function SpatialWalkTemplate({ data }: { data: LayoutData }) {
  return <SpatialWalk data={data} />;
}

export default SpatialWalkTemplate;