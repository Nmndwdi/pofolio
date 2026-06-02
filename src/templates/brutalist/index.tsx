import type { LayoutData } from "@/components/layouts/types";
import { Brutalist } from "./Brutalist";

/*
 * Brutalist template — entry point.
 *
 * Self-contained under src/templates/brutalist/. Shares only the LayoutData
 * interface and the externalProfileLink helper with the rest of the app.
 * No global theme tokens, no shared CSS utilities, no Tailwind — everything
 * visual lives in brutalist.module.css.
 *
 * 2026 neo-brutalism: viewport-scaled display type, single-pixel solid
 * borders, offset hard shadows (no soft blurs), visible grid notation,
 * hazard-yellow accent. Three live-switchable palettes (yellow / ink /
 * acid green) cover both light + dark preferences without breaking the
 * aesthetic.
 */

export function BrutalistTemplate({ data }: { data: LayoutData }) {
  return <Brutalist data={data} />;
}

export default BrutalistTemplate;