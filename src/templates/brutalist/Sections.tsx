"use client";

import { useMemo, type ReactNode } from "react";
import type { LayoutData } from "@/components/layouts/types";
import { deriveUrl } from "@/lib/cloudinary-url";
import styles from "./brutalist.module.css";

/*
 * Section primitives + all section content renderers.
 *
 * One file (not separate-per-section) because each renderer is short and
 * they all share the same styling language. Splitting would mean 7+ tiny
 * files. We'd split if these grow past ~50 LOC each.
 *
 * Each renderer takes a slice of LayoutData and outputs a React subtree
 * styled with the scoped brutalist CSS. No shared `<Section>` component
 * from elsewhere — this template owns its own.
 */

/* ─── Section header — block-numbered ──────────────────────────── */

export function SectionHeader({
  number,
  title,
  externalUrl,
  externalLabel,
}: {
  number: string;
  title: string;
  externalUrl?: string;
  externalLabel?: string;
}) {
  return (
    <div className={styles.sectionHeader}>
      <div className={styles.sectionNumber} aria-hidden>
        N°{number}
      </div>
      <h2 className={styles.sectionTitle}>{title}</h2>
      {externalUrl && externalLabel && (
        <a
          className={styles.sectionExt}
          href={externalUrl}
          target="_blank"
          rel="noopener noreferrer"
          data-no-print-url
        >
          {externalLabel} ↗
        </a>
      )}
    </div>
  );
}

/* ─── About ────────────────────────────────────────────────────── */

export function AboutSection({ data }: { data: LayoutData }) {
  if (!data.bio) return null;
  // Two-column grid: lead sentence + remaining body. We split the bio at the
  // first paragraph break — common case, users write a punchy first line.
  const [lead, ...rest] = data.bio.split(/\n\n+/);
  const body = rest.join("\n\n").trim();

  return (
    <div className={styles.aboutGrid}>
      <p className={styles.aboutLead}>{lead}</p>
      {body && <p className={styles.aboutBody}>{body}</p>}
    </div>
  );
}

/* ─── Experience ───────────────────────────────────────────────── */

export function ExperienceSection({ data }: { data: LayoutData }) {
  if (data.experience.length === 0) return null;
  return (
    <ol className={styles.expList}>
      {data.experience.map((e) => (
        <li key={e.id} className={styles.expItem}>
          {e.dates && <span className={styles.expDates}>{e.dates}</span>}
          <div>
            {(e.role || e.company) && (
              <>
                <h3 className={styles.expRole}>{e.role || e.company}</h3>
                {e.role && e.company && (
                  <div className={styles.expCompany}>{e.company}</div>
                )}
              </>
            )}
            {e.summary && <p className={styles.expSummary}>{e.summary}</p>}
          </div>
          <span />
        </li>
      ))}
    </ol>
  );
}

/* ─── Education ────────────────────────────────────────────────── */

export function EducationSection({ data }: { data: LayoutData }) {
  if (data.education.length === 0) return null;
  return (
    <ul className={styles.eduList}>
      {data.education.map((e) => (
        <li key={e.id} className={styles.eduItem}>
          <div>
            <div className={styles.eduInst}>{e.institution}</div>
            {e.degree && <div className={styles.eduDegree}>{e.degree}</div>}
          </div>
          {e.dates && <span className={styles.eduDates}>{e.dates}</span>}
        </li>
      ))}
    </ul>
  );
}

/* ─── Skills ───────────────────────────────────────────────────── */

export function SkillsSection({ data }: { data: LayoutData }) {
  if (data.skills.length === 0) return null;
  return (
    <ul className={styles.skillList}>
      {data.skills.map((s) => (
        <li key={s} className={styles.skillChip}>
          {s}
        </li>
      ))}
    </ul>
  );
}

/* ─── Projects ─────────────────────────────────────────────────── */

export function ProjectsSection({ data }: { data: LayoutData }) {
  if (data.projects.length === 0) return null;

  const featured = data.projects.filter((p) => p.featured);
  const rest = data.projects.filter((p) => !p.featured);

  return (
    <div>
      {featured.length > 0 && (
        <div className={styles.projectFeatured}>
          {featured.map((p) => (
            <ProjectCard key={p.id} project={p} large />
          ))}
        </div>
      )}
      {rest.length > 0 && (
        <div className={styles.projectGrid}>
          {rest.map((p) => (
            <ProjectCard key={p.id} project={p} />
          ))}
        </div>
      )}
    </div>
  );
}

function ProjectCard({
  project,
  large = false,
}: {
  project: LayoutData["projects"][number];
  large?: boolean;
}) {
  const hero = project.images?.[0];
  return (
    <article
      className={`${styles.card} ${styles.cardHover} ${styles.projectCard}`}
      data-cursor="hover"
    >
      {hero && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          className={styles.projectImage}
          src={deriveUrl(hero.publicId, {
            width: large ? 1600 : 800,
            height: large ? 900 : 450,
            crop: "fill",
          })}
          alt={hero.caption ?? project.title}
          loading="lazy"
        />
      )}
      <div className={styles.projectBody}>
        <div className={styles.projectMeta}>
          <span>{[project.role, project.year].filter(Boolean).join(" · ")}</span>
        </div>
        <h3 className={styles.projectTitle}>{project.title}</h3>
        {project.description && (
          <p className={styles.projectDesc}>{project.description}</p>
        )}
        {project.tech && project.tech.length > 0 && (
          <ul className={styles.projectTech}>
            {project.tech.slice(0, 8).map((t) => (
              <li key={t} className={styles.projectTechChip}>
                {t}
              </li>
            ))}
          </ul>
        )}
        {(project.demoUrl || project.sourceUrl || project.videoUrl) && (
          <div className={styles.projectLinks}>
            {project.demoUrl && (
              <a
                className={styles.projectLink}
                href={project.demoUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                Demo ↗
              </a>
            )}
            {project.sourceUrl && (
              <a
                className={styles.projectLink}
                href={project.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                Source ↗
              </a>
            )}
            {project.videoUrl && (
              <a
                className={styles.projectLink}
                href={project.videoUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                Video ↗
              </a>
            )}
          </div>
        )}
        {/* Additional images beyond the hero — rendered as a tight grid
            below the hero/text. Brutalist aesthetic: 2px borders, no gaps
            larger than 8px. Lazy-loaded so off-screen images don't block
            initial paint. */}
        {project.images && project.images.length > 1 && (
          <div className={styles.projectGalleryAdditional}>
            {project.images.slice(1, 7).map((img) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={img.id}
                src={deriveUrl(img.publicId, {
                  width: 600,
                  height: 450,
                  crop: "fill",
                })}
                alt={img.caption ?? ""}
                className={styles.projectGalleryImg}
                loading="lazy"
              />
            ))}
          </div>
        )}
      </div>
    </article>
  );
}

/* ─── Integrations: GitHub / LeetCode / Codeforces ─────────────── */

export function GitHubStats({ data }: { data: LayoutData }) {
  const g = data.github?.data;
  if (!g) return null;
  return (
    <StatGrid>
      <Stat value={String(g.user.publicRepos)} label="repositories" accent />
      <Stat value={String(g.user.followers)} label="followers" />
      <Stat
        value={
          g.contributions
            ? g.contributions.total.toLocaleString()
            : "—"
        }
        label="contributions / year"
      />
      <Stat value={`@${g.user.login}`} label="handle" />
    </StatGrid>
  );
}

export function LeetCodeStats({ data }: { data: LayoutData }) {
  const l = data.leetcode?.data;
  if (!l) return null;
  return (
    <StatGrid>
      <Stat value={String(l.totalSolved)} label="solved" accent />
      <Stat value={String(l.easySolved)} label="easy" />
      <Stat value={String(l.mediumSolved)} label="medium" />
      <Stat value={String(l.hardSolved)} label="hard" />
    </StatGrid>
  );
}

export function CodeforcesStats({ data }: { data: LayoutData }) {
  const c = data.codeforces?.data;
  if (!c) return null;
  return (
    <StatGrid>
      <Stat
        value={c.user.rating !== null ? String(c.user.rating) : "—"}
        label="rating"
        accent
      />
      <Stat
        value={c.user.maxRating !== null ? String(c.user.maxRating) : "—"}
        label="max rating"
      />
      <Stat value={String(c.contestsParticipated)} label="contests" />
      <Stat value={c.user.rank ?? "—"} label="rank" />
    </StatGrid>
  );
}

function StatGrid({ children }: { children: ReactNode }) {
  return <div className={styles.statGrid}>{children}</div>;
}

function Stat({
  value,
  label,
  accent,
}: {
  value: string;
  label: string;
  accent?: boolean;
}) {
  return (
    <div className={styles.statCard} data-accent={accent ? "true" : "false"}>
      <div className={styles.statValue}>{value}</div>
      <div className={styles.statLabel}>{label}</div>
    </div>
  );
}

/* ─── Contribution heatmap (used by GitHub/LeetCode/Codeforces) ─────
 * Hand-rolled grid (no Recharts). Each cell is a 14×14 box with a data-level
 * attribute (0-4) — CSS handles the fills. 53 weeks wide, 7 rows tall.
 */
function ContributionHeatmap({
  days,
  totalLabel,
}: {
  days: Array<{ date: string; count: number }>;
  totalLabel?: string;
}) {
  // Bucket cells into 5 levels (0 = empty, 4 = max). We anchor to the max in
  // the visible window so a quiet user's "1 submission" doesn't render as
  // empty — relative scale, not absolute.
  const max = useMemo(
    () => days.reduce((m, d) => (d.count > m ? d.count : m), 0),
    [days],
  );
  const levelFor = (count: number): 0 | 1 | 2 | 3 | 4 => {
    if (count === 0) return 0;
    if (max <= 1) return 4;
    const r = count / max;
    if (r > 0.75) return 4;
    if (r > 0.5) return 3;
    if (r > 0.25) return 2;
    return 1;
  };

  return (
    <div className={styles.heatmapWrap}>
      <div className={styles.heatmapMeta}>
        <span>{totalLabel ?? `${days.length} days tracked`}</span>
        <span>less ▢ ▢ ▢ ▢ ▢ more</span>
      </div>
      <div className={styles.heatmapGrid} role="img" aria-label="Contribution heatmap">
        {days.map((d) => (
          <div
            key={d.date}
            className={styles.heatmapCell}
            data-level={levelFor(d.count)}
            title={`${d.count} on ${d.date}`}
          />
        ))}
      </div>
    </div>
  );
}

/* ─── Rating chart (used by Codeforces) ────────────────────────────
 * Pure SVG line chart. No Recharts. Renders the rating history as an area
 * fill under a line. Calculates min/max from the data and lays out an
 * 800×180 viewBox — width="100%" makes it stretch responsively.
 */
function RatingChart({
  points,
  label,
}: {
  points: Array<{ t: number; rating: number }>;
  label: string;
}) {
  const { path, area, axisYTop, axisYBot, minR, maxR } = useMemo(() => {
    if (points.length < 2) {
      return { path: "", area: "", axisYTop: 20, axisYBot: 160, minR: 0, maxR: 0 };
    }
    const W = 800;
    const H = 180;
    const padX = 32;
    const padTop = 20;
    const padBot = 24;
    const innerW = W - padX * 2;
    const innerH = H - padTop - padBot;

    const ts = points.map((p) => p.t);
    const rs = points.map((p) => p.rating);
    const tMin = Math.min(...ts);
    const tMax = Math.max(...ts);
    const rMin = Math.min(...rs);
    const rMax = Math.max(...rs);
    const tSpan = tMax - tMin || 1;
    const rSpan = rMax - rMin || 1;

    const xy = points.map((p) => {
      const x = padX + ((p.t - tMin) / tSpan) * innerW;
      const y = padTop + (1 - (p.rating - rMin) / rSpan) * innerH;
      return [x, y] as const;
    });

    const path = xy
      .map(([x, y], i) => (i === 0 ? `M${x},${y}` : `L${x},${y}`))
      .join(" ");
    const area = `${path} L${xy[xy.length - 1][0]},${H - padBot} L${xy[0][0]},${H - padBot} Z`;

    return {
      path,
      area,
      axisYTop: padTop,
      axisYBot: H - padBot,
      minR: rMin,
      maxR: rMax,
    };
  }, [points]);

  if (points.length < 2) return null;

  return (
    <div className={styles.chartWrap}>
      <div className={styles.heatmapMeta}>
        <span>{label}</span>
        <span>
          {Math.round(minR)} ↔ {Math.round(maxR)}
        </span>
      </div>
      <svg
        className={styles.chartSvg}
        viewBox="0 0 800 180"
        preserveAspectRatio="none"
      >
        <line
          x1="32"
          x2="768"
          y1={axisYBot}
          y2={axisYBot}
          className={styles.chartAxis}
        />
        <path d={area} className={styles.chartArea} />
        <path d={path} className={styles.chartLine} />
        <text x="32" y={axisYTop - 4} className={styles.chartLabel}>
          {Math.round(maxR)}
        </text>
        <text x="32" y={axisYBot + 14} className={styles.chartLabel}>
          {Math.round(minR)}
        </text>
      </svg>
    </div>
  );
}

/* ─── GitHub / LeetCode / Codeforces enriched section bodies ──────
 * Compose: stat grid + heatmap (+ rating chart for codeforces).
 */

export function GitHubFull({ data }: { data: LayoutData }) {
  const g = data.github?.data;
  if (!g) return null;
  return (
    <div style={{ display: "grid", gap: 24 }}>
      <GitHubStats data={data} />
      {g.contributions && g.contributions.days.length > 0 && (
        <ContributionHeatmap
          days={g.contributions.days}
          totalLabel={`${g.contributions.total.toLocaleString()} contributions / year`}
        />
      )}
    </div>
  );
}

export function LeetCodeFull({ data }: { data: LayoutData }) {
  const l = data.leetcode?.data;
  if (!l) return null;
  return (
    <div style={{ display: "grid", gap: 24 }}>
      <LeetCodeStats data={data} />
      {l.submissionHeatmap && l.submissionHeatmap.length > 0 && (
        <ContributionHeatmap
          days={l.submissionHeatmap}
          totalLabel={`${l.submissionHeatmap.reduce(
            (s, d) => s + d.count,
            0,
          )} submissions tracked`}
        />
      )}
    </div>
  );
}

export function CodeforcesFull({ data }: { data: LayoutData }) {
  const c = data.codeforces?.data;
  if (!c) return null;
  const ratingPoints = (c.ratingHistory ?? []).map((r) => ({
    t: r.timestamp * 1000,
    rating: r.rating,
  }));
  return (
    <div style={{ display: "grid", gap: 24 }}>
      <CodeforcesStats data={data} />
      {ratingPoints.length >= 2 && (
        <RatingChart points={ratingPoints} label="Rating history" />
      )}
      {c.submissionHeatmap && c.submissionHeatmap.length > 0 && (
        <ContributionHeatmap
          days={c.submissionHeatmap}
          totalLabel={`${c.submissionHeatmap.reduce(
            (s, d) => s + d.count,
            0,
          )} submissions tracked`}
        />
      )}
    </div>
  );
}

/* ─── Dev.to writing list ──────────────────────────────────────── */

export function WritingSection({ data }: { data: LayoutData }) {
  const d = data.devto?.data;
  if (!d || d.articles.length === 0) return null;
  return (
    <ul className={styles.articleList}>
      {d.articles.slice(0, 8).map((a) => (
        <li key={a.id}>
          <a
            href={a.url}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.articleItem}
            style={{ display: "block", textDecoration: "none", color: "inherit" }}
          >
            <h3 className={styles.articleTitle}>{a.title}</h3>
            <div className={styles.articleMeta}>
              {new Date(a.publishedAt).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
              {a.readingTimeMinutes ? ` · ${a.readingTimeMinutes} min read` : ""}
              {a.tags && a.tags.length > 0
                ? ` · ${a.tags.slice(0, 3).join(", ")}`
                : ""}
            </div>
          </a>
        </li>
      ))}
    </ul>
  );
}

/* ─── Hugging Face ML works ────────────────────────────────────── */

export function MLSection({ data }: { data: LayoutData }) {
  const hf = data.huggingface?.data;
  if (!hf || hf.items.length === 0) return null;
  return (
    <div className={styles.hfGrid}>
      {hf.items.slice(0, 10).map((it) => (
        <a
          key={`${it.kind}-${it.id}`}
          href={it.url}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.hfItem}
        >
          <div className={styles.hfKind}>{it.kind}</div>
          <div className={styles.hfName}>{it.name}</div>
          {it.pipelineTag && <div className={styles.hfTag}>{it.pipelineTag}</div>}
        </a>
      ))}
    </div>
  );
}

/* ─── Custom links section ────────────────────────────────────── */

export function LinksSection({ data }: { data: LayoutData }) {
  if (data.customLinks.length === 0) return null;
  return (
    <div className={styles.linkGrid}>
      {data.customLinks.map((l) => {
        let host = l.url;
        try {
          host = new URL(l.url).host.replace(/^www\./, "");
        } catch {
          /* ignore — l.url may not be a full URL */
        }
        return (
          <a
            key={l.id}
            href={l.url}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.linkItem}
          >
            <span className={styles.linkLabel}>{l.label}</span>
            <span className={styles.linkHost}>{host} ↗</span>
          </a>
        );
      })}
    </div>
  );
}

/* ─── Files (resume + uploads) with inline PDF/image/video preview ─── */

export function FilesSection({ data }: { data: LayoutData }) {
  const items: Array<{
    id: string;
    label: string;
    publicId: string;
    resourceType: "image" | "video" | "raw";
    format: string;
  }> = [];
  if (data.resumeCloudinaryId) {
    items.push({
      id: "resume",
      label: "Resume",
      publicId: data.resumeCloudinaryId,
      resourceType: "raw",
      format: "pdf",
    });
  }
  for (const f of data.files) {
    items.push({
      id: f.id,
      label: f.label,
      publicId: f.publicId,
      resourceType: f.resourceType,
      format: f.format,
    });
  }
  if (items.length === 0) return null;
  return (
    <ul className={styles.fileList}>
      {items.map((f) => (
        <FileBlock
          key={f.id}
          label={f.label}
          publicId={f.publicId}
          resourceType={f.resourceType}
          format={f.format}
        />
      ))}
    </ul>
  );
}

function FileBlock({
  label,
  publicId,
  resourceType,
  format,
}: {
  label: string;
  publicId: string;
  resourceType: "image" | "video" | "raw";
  format: string;
}) {
  const url = deriveUrl(publicId, { resourceType });
  const fmtLower = format.toLowerCase();
  const isPdf = resourceType === "raw" && fmtLower === "pdf";
  const isImage = resourceType === "image";
  const isVideo = resourceType === "video";
  return (
    <li className={styles.fileBlock}>
      <div className={styles.fileHead}>
        <span className={styles.fileKind}>{format || "file"}</span>
        <span className={styles.fileName}>{label}</span>
        <a
          className={styles.fileOpen}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
        >
          Open ↗
        </a>
      </div>
      {isPdf && (
        <object
          data={url}
          type="application/pdf"
          className={styles.fileBody}
          aria-label={label}
        >
          <p style={{ padding: 16 }}>
            Your browser can&apos;t preview this PDF.{" "}
            <a href={url} target="_blank" rel="noopener noreferrer">
              Open in new tab
            </a>
          </p>
        </object>
      )}
      {isImage && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={deriveUrl(publicId, { width: 1600 })}
          alt={label}
          className={styles.fileBodyImage}
          loading="lazy"
        />
      )}
      {isVideo && (
        <video src={url} controls className={styles.fileBody} preload="metadata" />
      )}
    </li>
  );
}

/* ─── Socials strip (rendered in hero area) ───────────────────── */

export function SocialsStrip({ data }: { data: LayoutData }) {
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
    <div className={styles.socialsStrip}>
      {entries.map((e) => (
        <a
          key={e.label}
          href={e.href}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.socialsItem}
        >
          {e.label} ↗
        </a>
      ))}
    </div>
  );
}