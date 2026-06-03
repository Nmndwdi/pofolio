import type { LayoutData } from "@/components/layouts/types";
import { Press } from "./Press";

/*
 * Press template — entry point.
 *
 * Self-contained under src/templates/press/. Editorial newspaper aesthetic:
 *   - Massive serif masthead (Instrument Serif at 96-180px)
 *   - Oxblood-on-cream color palette (#5B1A1A on #F4EFE6)
 *   - Real SVG noise grain overlay for the printed-paper feel
 *   - Kinetic typography accents (variable-font axis shifts on key words)
 *   - Numbered article metadata, hairline rules, hung punctuation
 *
 * No CLI, no year tabs, no custom cursor. The interaction IS the typography.
 * Sections lay out as newspaper editorial — multi-column where it earns it,
 * hanging headlines, drop caps on the bio.
 */

export function PressTemplate({ data }: { data: LayoutData }) {
  return <Press data={data} />;
}

export default PressTemplate;