import Link from "next/link";
import { deriveUrl } from "@/lib/cloudinary";
import type { LayoutData } from "./types";
import { SECTION_LABELS, type SectionKey } from "./types";

/*
 * Sidebar nav — desktop sticky rail + mobile collapsing top bar.
 *
 * On desktop the order is now Identity → Socials → Section nav → footer.
 * Previously socials sat below the section nav, which buried them visually
 * (the user couldn't see LinkedIn/email/website without scrolling). Putting
 * them right under the name/headline makes them as discoverable as on a
 * normal portfolio.
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
    <div className="flex h-full flex-col gap-6">
      <Identity data={data} />
      {/* Socials moved here, directly under identity — was previously below
          the section nav where it got missed by users. */}
      <SocialsList data={data} />
      <Nav sections={sections} hasAbout={!!data.bio} />
      <div className="mt-auto pt-6">
        <Link href="/" className="text-xs text-p-fg-subtle hover:text-p-fg">
          Made with Pofolio
        </Link>
      </div>
    </div>
  );
}

function Identity({ data }: { data: LayoutData }) {
  return (
    <div className="space-y-3">
      {data.avatarCloudinaryId && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={deriveUrl(data.avatarCloudinaryId, {
            width: 200,
            height: 200,
            crop: "fill",
          })}
          alt={data.displayName}
          className="size-20 rounded-full border border-p-border object-cover"
        />
      )}
      <div>
        <div className="font-p-display text-xl font-semibold tracking-tight text-p-fg">
          {data.displayName}
        </div>
        {data.headline && (
          <div className="mt-1 text-sm text-p-fg-muted">{data.headline}</div>
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
  const items: Array<{ label: string; href: string }> = [];
  if (hasAbout) items.push({ label: "About", href: "#about" });
  for (const key of sections) {
    items.push({ label: SECTION_LABELS[key], href: `#${key}` });
  }

  return (
    <nav aria-label="Section navigation">
      <ul className="space-y-1.5">
        {items.map((item) => {
          return (
            <li key={item.href}>
              <a
                href={item.href}
                className="block text-sm text-p-fg-muted transition-colors hover:text-p-fg"
              >
                {item.label}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function SocialsList({ data }: { data: LayoutData }) {
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

  if (entries.length === 0) return null;

  return (
    <ul className="space-y-1.5">
      {entries.map((e) => (
        <li key={e.label}>
          <Link
            href={e.href}
            target="_blank"
            rel="noopener noreferrer"
            className="block text-sm text-p-fg-muted transition-colors hover:text-p-fg"
          >
            {e.label} <span aria-hidden>↗</span>
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

  return (
    <div className="sticky top-0 z-30 border-b border-p-border bg-p-bg/95 backdrop-blur md:hidden">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="min-w-0">
          <div className="truncate font-p-display text-sm font-semibold text-p-fg">
            {data.displayName}
          </div>
          {data.headline && (
            <div className="truncate text-[11px] text-p-fg-muted">
              {data.headline}
            </div>
          )}
        </div>
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
      <SocialsListMobile data={data} />
    </div>
  );
}

function SocialsListMobile({ data }: { data: LayoutData }) {
  // Reuse the same list construction. Render as a compact horizontal strip on
  // mobile rather than a vertical list — saves space at the top.
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

  if (entries.length === 0) return null;
  return (
    <div className="flex gap-3 border-t border-p-border/60 px-4 py-2 text-[11px] text-p-fg-muted">
      {entries.map((e) => (
        <Link
          key={e.label}
          href={e.href}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-p-fg"
        >
          {e.label}
        </Link>
      ))}
    </div>
  );
}