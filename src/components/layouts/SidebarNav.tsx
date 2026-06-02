import Link from "next/link";
import { deriveUrl } from "@/lib/cloudinary";
import type { LayoutData } from "./types";
import { SECTION_LABELS, type SectionKey } from "./types";

/*
 * Sidebar nav — desktop sticky rail + mobile collapsing top bar.
 *
 * Desktop order: Identity → Socials → Section nav → footer "Made with".
 *
 * Identity treatment (this iteration):
 *   - Avatar bumped 80 → 96px. The sidebar is 288-320px wide; an 80px
 *     avatar reads as a thumbnail. 96px reads as a portrait.
 *   - Name uses display font, larger (text-xl on small sidebars, 2xl on lg),
 *     tighter tracking. This is the page's identity statement.
 *   - A small mono eyebrow ("PORTFOLIO") above the name — anchors the
 *     identity block as a header rather than just a label.
 *   - Headline below name with subtle hairline separator. The hairline
 *     gives the headline weight without making it compete with the name.
 *
 * Mobile bar:
 *   - Cleaner two-row design (was three). Name + section pills.
 *   - Socials are folded into the pill row as compact icons rather than a
 *     third strip — saves vertical space, matches the sidebar's discipline.
 */

interface Props {
  data: LayoutData;
  sections: SectionKey[];
  variant: "desktop" | "mobile";
}

export function SidebarNav({ data, sections, variant }: Props) {
  return variant === "desktop" ? (
    <DesktopSidebar data={data} sections={sections} />
  ) : (
    <MobileTopBar data={data} sections={sections} />
  );
}

/* ─── Desktop ───────────────────────────────────────────────────────────── */

function DesktopSidebar({
  data,
  sections,
}: {
  data: LayoutData;
  sections: SectionKey[];
}) {
  return (
    <div className="flex h-full flex-col gap-8">
      <Identity data={data} />
      <SocialsList data={data} />
      <Nav sections={sections} hasAbout={!!data.bio} />
      <div className="mt-auto pt-6">
        <Link
          href="/"
          className="font-p-mono text-[10px] uppercase tracking-[0.18em] text-p-fg-subtle transition-colors hover:text-p-fg"
        >
          Made with Pofolio
        </Link>
      </div>
    </div>
  );
}

function Identity({ data }: { data: LayoutData }) {
  return (
    <div className="space-y-4">
      {data.avatarCloudinaryId && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={deriveUrl(data.avatarCloudinaryId, {
            width: 240,
            height: 240,
            crop: "fill",
          })}
          alt={data.displayName}
          className="size-24 rounded-full border border-p-border object-cover"
        />
      )}
      <div className="space-y-2">
        {/* Eyebrow — anchors the block as a header, not just a name. */}
        <div className="font-p-mono text-[10px] uppercase tracking-[0.18em] text-p-fg-subtle">
          Portfolio
        </div>
        <div className="font-p-display text-xl font-semibold leading-tight tracking-tight text-p-fg lg:text-2xl">
          {data.displayName}
        </div>
        {data.headline && (
          // Hairline above the headline — gives it weight without a box.
          <div className="border-t border-p-border pt-2 text-sm leading-snug text-p-fg-muted">
            {data.headline}
          </div>
        )}
      </div>
    </div>
  );
}

function Nav({
  sections,
  hasAbout,
}: {
  sections: SectionKey[];
  hasAbout: boolean;
}) {
  // Build items with the same numbering scheme as SidebarLayout.
  // We re-derive it here rather than passing in — keeps the nav decoupled
  // from layout-side state. If the two ever drift, fix here AND there.
  const items: Array<{ label: string; href: string; num: string }> = [];
  let idx = 0;
  if (hasAbout) {
    items.push({
      label: "About",
      href: "#about",
      num: String(++idx).padStart(2, "0"),
    });
  }
  for (const key of sections) {
    items.push({
      label: SECTION_LABELS[key],
      href: `#${key}`,
      num: String(++idx).padStart(2, "0"),
    });
  }

  return (
    <nav aria-label="Section navigation">
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.href}>
            <a
              href={item.href}
              className="group flex items-baseline gap-3 text-sm text-p-fg-muted transition-colors hover:text-p-fg"
            >
              <span
                aria-hidden
                className="font-p-mono text-[10px] text-p-fg-subtle transition-colors group-hover:text-p-fg-muted"
              >
                {item.num}
              </span>
              <span>{item.label}</span>
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function SocialsList({ data }: { data: LayoutData }) {
  const entries = buildSocialsEntries(data);
  if (entries.length === 0) return null;

  return (
    <ul className="space-y-2">
      {entries.map((e) => (
        <li key={e.label}>
          <Link
            href={e.href}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-baseline justify-between gap-2 text-sm text-p-fg-muted transition-colors hover:text-p-fg"
          >
            <span>{e.label}</span>
            <span
              aria-hidden
              className="font-p-mono text-xs text-p-fg-subtle transition-transform group-hover:translate-x-0.5"
            >
              ↗
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/* ─── Mobile ────────────────────────────────────────────────────────────── */

function MobileTopBar({
  data,
  sections,
}: {
  data: LayoutData;
  sections: SectionKey[];
}) {
  const items: Array<{ label: string; href: string }> = [];
  if (data.bio) items.push({ label: "About", href: "#about" });
  for (const key of sections) {
    items.push({ label: SECTION_LABELS[key], href: `#${key}` });
  }
  const socials = buildSocialsEntries(data);

  return (
    <div className="sticky top-0 z-30 border-b border-p-border bg-p-bg/95 backdrop-blur md:hidden">
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <div className="min-w-0">
          <div className="truncate font-p-display text-sm font-semibold tracking-tight text-p-fg">
            {data.displayName}
          </div>
          {data.headline && (
            <div className="truncate text-[11px] text-p-fg-muted">
              {data.headline}
            </div>
          )}
        </div>
        {/* Compact social icons inline with the name — saves a row vs the
            previous third-strip approach. */}
        {socials.length > 0 && (
          <ul className="flex shrink-0 gap-3 text-[11px] text-p-fg-muted">
            {socials.slice(0, 3).map((s) => (
              <li key={s.label}>
                <Link
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-p-fg"
                >
                  {s.label}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
      {items.length > 0 && (
        <div className="overflow-x-auto border-t border-p-border/60">
          <ul className="flex gap-1 px-3 py-2 text-xs">
            {items.map((item) => (
              <li key={item.href}>
                <a
                  href={item.href}
                  className="block whitespace-nowrap rounded-full px-3 py-1 text-p-fg-muted hover:bg-p-surface hover:text-p-fg"
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/* ─── Shared ────────────────────────────────────────────────────────────── */

// Compose social-link entries from the data model. Centralised because the
// mobile and desktop variants both need it, and we want them to stay in sync
// (same set, same labels, same order).
function buildSocialsEntries(
  data: LayoutData,
): Array<{ label: string; href: string }> {
  const entries: Array<{ label: string; href: string }> = [];
  if (data.socials.linkedin)
    entries.push({ label: "LinkedIn", href: data.socials.linkedin });
  if (data.socials.twitter)
    entries.push({
      label: "Twitter",
      href: `https://twitter.com/${data.socials.twitter.replace(/^@/, "")}`,
    });
  if (data.socials.website)
    entries.push({ label: "Website", href: data.socials.website });
  if (data.socials.email)
    entries.push({ label: "Email", href: `mailto:${data.socials.email}` });
  if (data.socials.github)
    entries.push({
      label: "GitHub",
      href: `https://github.com/${data.socials.github}`,
    });
  return entries;
}