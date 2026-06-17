import type { LayoutData } from "@/components/layouts/types";
import { Cinematic } from "./Cinematic";

/*
 * Cinematic template — entry export.
 *
 * Scroll-jacked, GSAP-orchestrated tour through the portfolio. Each
 * section is a composed "shot"; between shots, a different transition
 * does the storytelling (pan-zoom, lateral push, circular reveal,
 * vertical curtain, rotate-scale, color match-cut, diagonal wipe, etc.).
 *
 * Tech: GSAP + ScrollTrigger. Viewport is pinned during the tour; one
 * timeline orchestrates all transitions, scrubbed by scroll position.
 */

export function CinematicTemplate({ data }: { data: LayoutData }) {
  return <Cinematic data={data} />;
}

export default CinematicTemplate;