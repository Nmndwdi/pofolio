import Link from "next/link";
import type { DevToData } from "@/lib/integrations/devto";

/*
 * Dev.to section — renders the user's recent articles as cards.
 *
 * Each card: cover image (if any), title, reading time + reaction count,
 * tag chips. Cards link out to the article on Dev.to.
 *
 * Uses portfolio theme tokens (--p-*) so it adapts to whatever theme the
 * user picked.
 */

export function DevToSection({ data }: { data: DevToData }) {
  return (
    <div className="space-y-3">
      <div className="font-p-display text-sm italic text-p-fg-muted">
        @{data.username} on Dev.to
      </div>
      <ul className="grid gap-3 sm:grid-cols-2">
        {data.articles.map((article) => (
          <li key={article.id}>
            <Link
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-full flex-col overflow-hidden rounded-md border border-p-border bg-p-surface transition-colors hover:bg-p-surface-2"
            >
              {article.coverImage && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={article.coverImage}
                  alt=""
                  className="aspect-[2/1] w-full object-cover"
                />
              )}
              <div className="flex flex-1 flex-col p-3">
                <div className="font-medium leading-snug text-p-fg">
                  {article.title}
                </div>
                <div className="mt-1 text-xs text-p-fg-subtle">
                  {article.readingTimeMinutes} min read
                  {article.reactionsCount > 0 &&
                    ` · ${article.reactionsCount} reactions`}
                </div>
                {article.tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {article.tags.slice(0, 4).map((tag) => (
                      <span
                        key={tag}
                        className="rounded bg-p-surface-2 px-1.5 py-0.5 font-p-mono text-[10px] text-p-fg-muted"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
