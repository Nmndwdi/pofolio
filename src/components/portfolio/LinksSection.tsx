import Link from "next/link";
import { groupLinks } from "@/lib/links";
import { getOgPreview, type OgPreview } from "@/lib/og-preview";

/*
 * Links section — renders custom links grouped by category, with rich
 * OpenGraph preview cards where available.
 *
 * For each link we fetch its OG metadata (cached 1 day). If we get a title or
 * image, the link renders as a rich card (image + title + description).
 * Otherwise it falls back to the plain label card — so a link that exposes no
 * OG tags still looks fine.
 *
 * Server component (async): the OG fetches happen server-side, in parallel,
 * and the result is cached, so this doesn't slow repeat views.
 */

interface Fallback {
  label: string;
  handle: string;
  href: string;
}

export async function LinksSection({
  links,
  fallbacks = [],
}: {
  links: Array<{ id: string; label: string; url: string }>;
  fallbacks?: Fallback[];
}) {
  const groups = groupLinks(links);
  const shouldGroup = groups.length >= 2 && links.length > 3;

  // Fetch OG previews for all links in parallel. Map by link id for lookup.
  const previews = new Map<string, OgPreview>();
  await Promise.all(
    links.map(async (l) => {
      const result = await getOgPreview(l.url);
      if (result) previews.set(l.id, result.data);
    }),
  );

  return (
    <div className="space-y-6">
      {shouldGroup ? (
        groups.map((group) => (
          <div key={group.category} className="space-y-2">
            <h3 className="font-p-mono text-xs uppercase tracking-wide text-p-fg-subtle">
              {group.label}
            </h3>
            <ul className="grid gap-2 sm:grid-cols-2">
              {group.links.map((link) => (
                <LinkCard
                  key={link.id}
                  href={link.url}
                  label={link.label}
                  preview={previews.get(link.id)}
                />
              ))}
            </ul>
          </div>
        ))
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2">
          {links.map((link) => (
            <LinkCard
              key={link.id}
              href={link.url}
              label={link.label}
              preview={previews.get(link.id)}
            />
          ))}
        </ul>
      )}

      {fallbacks.length > 0 && (
        <ul className="grid gap-2 sm:grid-cols-2">
          {fallbacks.map((f) => (
            <li key={f.label}>
              <Link
                href={f.href}
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded-md border border-p-border bg-p-surface px-4 py-3 transition-colors hover:bg-p-surface-2"
              >
                <div className="font-p-mono text-xs text-p-fg-subtle">
                  {f.label}
                </div>
                <div className="mt-0.5 text-sm font-medium text-p-fg">
                  @{f.handle}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function LinkCard({
  href,
  label,
  preview,
}: {
  href: string;
  label: string;
  preview?: OgPreview;
}) {
  // Rich card when we have a preview with a title or image; else plain.
  if (preview && (preview.title || preview.image)) {
    return (
      <li>
        <Link
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-full flex-col overflow-hidden rounded-md border border-p-border bg-p-surface transition-colors hover:bg-p-surface-2"
        >
          {preview.image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={preview.image}
              alt=""
              className="aspect-[2/1] w-full object-cover"
              loading="lazy"
            />
          )}
          <div className="flex flex-1 flex-col p-3">
            <div className="text-sm font-medium leading-snug text-p-fg">
              {preview.title ?? label}
            </div>
            {preview.description && (
              <div className="mt-1 line-clamp-2 text-xs text-p-fg-muted">
                {preview.description}
              </div>
            )}
            <div className="mt-2 font-p-mono text-[10px] uppercase tracking-wide text-p-fg-subtle">
              {preview.siteName ?? label}
            </div>
          </div>
        </Link>
      </li>
    );
  }

  return (
    <li>
      <Link
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="block rounded-md border border-p-border bg-p-surface px-4 py-3 text-sm font-medium text-p-fg transition-colors hover:bg-p-surface-2"
      >
        {label}
      </Link>
    </li>
  );
}
