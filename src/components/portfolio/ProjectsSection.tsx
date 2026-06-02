import Link from "next/link";
import { deriveUrl } from "@/lib/cloudinary";
import type { Project } from "@/components/layouts/types";

/*
 * Projects section — renders structured project records on the public page.
 *
 * Featured projects render large (image + full description); non-featured
 * render as compact rows. This is the "case-study" treatment that good
 * portfolios use: a couple of standout projects at the top, then a tail of
 * smaller entries.
 *
 * Each project shows whichever of its fields are filled: title, description,
 * role/year, links (demo/source/video), tech stack chips, and a primary
 * image. Missing fields are simply skipped — the renderer doesn't force a
 * placeholder layout.
 */

export function ProjectsSection({ projects }: { projects: Project[] }) {
  if (projects.length === 0) return null;

  // Split into featured and rest. Featured projects render large at the top.
  const featured = projects.filter((p) => p.featured);
  const rest = projects.filter((p) => !p.featured);

  return (
    <div className="space-y-10">
      {featured.length > 0 && (
        <ul className="space-y-10">
          {featured.map((p) => (
            <li key={p.id}>
              <ProjectCardLarge project={p} />
            </li>
          ))}
        </ul>
      )}

      {rest.length > 0 && (
        <ul
          className={
            featured.length > 0
              ? "grid gap-4 sm:grid-cols-2"
              : "space-y-6"
          }
        >
          {rest.map((p) => (
            <li key={p.id}>
              {featured.length > 0 ? (
                <ProjectCardCompact project={p} />
              ) : (
                <ProjectCardLarge project={p} />
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ─── Large card — featured project treatment ─────────────────────────── */

function ProjectCardLarge({ project }: { project: Project }) {
  const hero = project.images?.[0];
  const galleryRest = (project.images ?? []).slice(1);

  return (
    <article className="p-card space-y-5 p-6 sm:p-7">
      {/* Hero image — capped at a fixed aspect ratio so tall portrait
          images crop instead of bloating the card to fill the user's whole
          viewport. 16:9 is the conventional "screenshot" ratio and reads as
          intentional regardless of what the user uploaded. */}
      {hero && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={deriveUrl(hero.publicId, {
            width: 1600,
            height: 900,
            crop: "fill",
          })}
          alt={hero.caption ?? project.title}
          className="block aspect-[16/9] w-full rounded-lg border border-p-border/40 object-cover"
          loading="lazy"
        />
      )}

      {/* Header: title + meta */}
      <div className="space-y-1">
        <h3 className="font-p-display text-xl font-semibold text-p-fg">
          {project.title}
        </h3>
        {(project.role || project.year) && (
          <div className="font-p-mono text-xs uppercase tracking-wide text-p-fg-subtle">
            {[project.role, project.year].filter(Boolean).join(" · ")}
          </div>
        )}
      </div>

      {project.description && (
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-p-fg/85">
          {project.description}
        </p>
      )}

      {/* Tech stack chips */}
      {project.tech && project.tech.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {project.tech.map((t) => (
            <li
              key={t}
              className="rounded-full bg-p-surface-2 px-2 py-0.5 text-xs text-p-fg-muted"
            >
              {t}
            </li>
          ))}
        </ul>
      )}

      {/* Links */}
      {(project.demoUrl || project.sourceUrl || project.videoUrl) && (
        <div className="flex flex-wrap gap-3 text-sm">
          {project.demoUrl && (
            <Link
              href={project.demoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-p-fg hover:underline"
            >
              Live demo ↗
            </Link>
          )}
          {project.sourceUrl && (
            <Link
              href={project.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-p-fg-muted hover:text-p-fg"
            >
              Source ↗
            </Link>
          )}
          {project.videoUrl && (
            <Link
              href={project.videoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-p-fg-muted hover:text-p-fg"
            >
              Video ↗
            </Link>
          )}
        </div>
      )}

      {/* Gallery (remaining images) */}
      {galleryRest.length > 0 && (
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {galleryRest.map((img) => (
            <li key={img.id} className="space-y-1">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={deriveUrl(img.publicId, {
                  width: 600,
                  crop: "fit",
                })}
                alt={img.caption ?? ""}
                className="block w-full rounded-md border border-p-border object-cover"
                loading="lazy"
              />
              {img.caption && (
                <p className="text-xs text-p-fg-subtle">{img.caption}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}

/* ─── Compact card — non-featured project, denser layout ─────────────── */

function ProjectCardCompact({ project }: { project: Project }) {
  const hero = project.images?.[0];
  return (
    <article className="p-card p-card-hover flex h-full flex-col overflow-hidden">
      {hero && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={deriveUrl(hero.publicId, { width: 800, crop: "fit" })}
          alt={hero.caption ?? project.title}
          className="aspect-[16/9] w-full object-cover"
          loading="lazy"
        />
      )}
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="space-y-0.5">
          <h4 className="text-sm font-semibold text-p-fg">{project.title}</h4>
          {(project.role || project.year) && (
            <div className="font-p-mono text-[10px] uppercase tracking-wide text-p-fg-subtle">
              {[project.role, project.year].filter(Boolean).join(" · ")}
            </div>
          )}
        </div>
        {project.description && (
          <p className="line-clamp-3 text-xs text-p-fg-muted">
            {project.description}
          </p>
        )}
        {project.tech && project.tech.length > 0 && (
          <ul className="flex flex-wrap gap-1">
            {project.tech.slice(0, 5).map((t) => (
              <li
                key={t}
                className="rounded-full bg-p-surface-2 px-1.5 py-0.5 text-[10px] text-p-fg-muted"
              >
                {t}
              </li>
            ))}
          </ul>
        )}
        {(project.demoUrl || project.sourceUrl) && (
          <div className="mt-auto flex gap-3 pt-1 text-xs">
            {project.demoUrl && (
              <Link
                href={project.demoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-p-fg hover:underline"
              >
                Demo ↗
              </Link>
            )}
            {project.sourceUrl && (
              <Link
                href={project.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-p-fg-muted hover:text-p-fg"
              >
                Source ↗
              </Link>
            )}
          </div>
        )}
      </div>
    </article>
  );
}