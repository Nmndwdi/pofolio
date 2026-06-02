import type { LayoutData } from "@/components/layouts/types";
import { Terminal } from "./Terminal";

/*
 * Terminal template — entry point.
 *
 * This file is what /p/[slug]/page.tsx imports when profile.layout === "terminal".
 * It's a thin wrapper that hands the server-loaded LayoutData to the client
 * Terminal component. All the interactivity (commands, history, theme,
 * matrix rain, mode toggle) lives there.
 *
 * Architectural note: this template is FULLY self-contained under
 * src/templates/terminal/. It shares only the `LayoutData` interface with
 * the rest of the app — no CSS variables, no Tailwind utilities, no
 * design-system primitives leak in. Changing anything in the global theme
 * tokens has zero effect on this template.
 */

export function TerminalTemplate({ data }: { data: LayoutData }) {
  return <Terminal data={data} />;
}

// Default export for any dynamic-import use cases.
export default TerminalTemplate;