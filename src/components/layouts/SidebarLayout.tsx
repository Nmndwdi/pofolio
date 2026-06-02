import Link from "next/link";
import { GitHubSection } from "@/components/portfolio/GitHubSection";
import { CodeforcesSection } from "@/components/portfolio/CodeforcesSection";
import { LeetCodeSection } from "@/components/portfolio/LeetCodeSection";
import { DevToSection } from "@/components/portfolio/DevToSection";
import { HuggingFaceSection } from "@/components/portfolio/HuggingFaceSection";
import { LinksSection } from "@/components/portfolio/LinksSection";
import { ProjectsSection } from "@/components/portfolio/ProjectsSection";
import { externalProfileLink } from "@/lib/external-profile-link";
import { FilesSection } from "@/components/portfolio/FilesSection";
import { ExportActions } from "@/components/portfolio/ExportActions";
import {
  type LayoutData,
  type SectionKey,
  sectionsFor,
  SECTION_LABELS,
} from "./types";
import { SidebarNav } from "./SidebarNav";
import {
  ExperienceBlock,
  EducationBlock,
  SkillsBlock,
} from "./ResumeSections";

/*
 * Sidebar layout — the default.
 *
 * Desktop (≥ md): fixed-width sidebar on the left with identity (avatar,
 * name, headline, socials) and in-page nav. Main content scrolls
 * independently on the right.
 *
 * Mobile (< md): sidebar collapses into a sticky top bar.
 *
 * Design notes (this iteration):
 *   - Section headers carry a small mono "01 / 02 / ..." index on their
 *     left side. Editorial convention; turns a list of sections into a
 *     navigable document rather than a blob of blocks.
 *   - Section title typography is larger on desktop (3xl) than before (2xl)
 *     — the sidebar steals the visual budget that a hero would normally
 *     occupy, so we recover it here.
 *   - The heavy border-b under section titles is gone. Hierarchy comes
 *     from typographic weight + spacing rhythm now, not boxes.
 *   - External "↗ github.com" link sits at the section-header right with
 *     a subtle hover translate on the arrow — small motion, big polish.
 */

export function SidebarLayout({ data }: { data: LayoutData }) {
  const sections = sectionsFor(data);

  // Build one flat list with stable numbering. About counts as section 01
  // when present, so users with a bio see "01 About / 02 Experience / ...".
  const items: Array<{ key: "about" | SectionKey; label: string }> = [];
  if (data.bio) items.push({ key: "about", label: "About" });
  for (const k of sections) items.push({ key: k, label: SECTION_LABELS[k] });

  return (
    <div className="p-page-bg min-h-screen font-p-body text-p-fg">
      <SidebarNav data={data} sections={sections} variant="mobile" />

      {/* Floating action panel — always visible at bottom-right of the
          viewport, regardless of scroll position. Rendered at the layout
          root rather than inside the footer (which 99% of visitors never
          reach on a long page). */}
      <ExportActions slug={data.slug} />

      <div className="md:flex">
        <aside className="hidden md:flex md:w-72 md:flex-col md:border-r md:border-p-border lg:w-80">
          {/* overflow-y-auto so the sidebar scrolls independently when the
              user has many sections (the nav list can be >screen-height). */}
          <div className="sticky top-0 flex h-screen flex-col overflow-y-auto p-8 lg:p-10">
            <SidebarNav data={data} sections={sections} variant="desktop" />
          </div>
        </aside>

        <main className="min-w-0 flex-1 px-6 py-12 sm:px-10 sm:py-16 md:px-12 md:py-20 lg:px-20">
          <div className="mx-auto max-w-3xl space-y-16 sm:space-y-20">
            {items.map((item, idx) => {
              const num = String(idx + 1).padStart(2, "0");

              if (item.key === "about") {
                return (
                  <Section key="about" id="about" number={num} title="About">
                    <p className="whitespace-pre-wrap text-base leading-relaxed text-p-fg/85 sm:text-lg">
                      {data.bio}
                    </p>
                  </Section>
                );
              }

              const ext = externalProfileLink(item.key, data);
              return (
                <Section
                  key={item.key}
                  id={item.key}
                  number={num}
                  title={item.label}
                  externalUrl={ext?.url}
                  externalLabel={ext?.label}
                >
                  <SectionContent sectionKey={item.key} data={data} />
                </Section>
              );
            })}

            <Footer slug={data.slug} />
          </div>
        </main>
      </div>
    </div>
  );
}

/* ─── Section wrapper ───────────────────────────────────────────────────── */

function Section({
  id,
  number,
  title,
  externalUrl,
  externalLabel,
  children,
}: {
  id: string;
  number: string;
  title: string;
  externalUrl?: string;
  externalLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-28">
      <header className="mb-8 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 sm:mb-10">
        <div className="flex items-center gap-4">
          {/* Section number badge — replaces the lonely "01" text with a
              refined pill treatment. Marked aria-hidden because the h2
              already names the section semantically. */}
          <span aria-hidden className="p-section-number">
            {number}
          </span>
          <h2 className="font-p-display text-2xl font-semibold tracking-tight text-p-fg sm:text-3xl">
            {title}
          </h2>
        </div>
        {externalUrl && externalLabel && (
          <Link
            href={externalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex shrink-0 items-baseline gap-1.5 font-p-mono text-xs text-p-fg-subtle transition-colors hover:text-p-fg"
            data-no-print-url
          >
            <span>{externalLabel}</span>
            <span
              aria-hidden
              className="inline-block transition-transform group-hover:translate-x-0.5"
            >
              ↗
            </span>
          </Link>
        )}
      </header>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

/* ─── Section content dispatch ──────────────────────────────────────────── */

function SectionContent({
  sectionKey,
  data,
}: {
  sectionKey: SectionKey;
  data: LayoutData;
}) {
  switch (sectionKey) {
    case "experience":
      return <ExperienceBlock items={data.experience} />;
    case "education":
      return <EducationBlock items={data.education} />;
    case "skills":
      return <SkillsBlock skills={data.skills} />;
    case "code":
      return data.github ? (
        <>
          <GitHubSection data={data.github.data} />
          {data.github.isStale && <StaleNote source="GitHub" />}
        </>
      ) : null;
    case "competitive":
      return data.codeforces ? (
        <>
          <CodeforcesSection data={data.codeforces.data} />
          {data.codeforces.isStale && <StaleNote source="Codeforces" />}
        </>
      ) : null;
    case "problem-solving":
      return data.leetcode ? (
        <>
          <LeetCodeSection data={data.leetcode.data} />
          {data.leetcode.isStale && <StaleNote source="LeetCode" />}
        </>
      ) : null;
    case "writing":
      return (
        <div className="space-y-6">
          {data.devto && <DevToSection data={data.devto.data} />}
        </div>
      );
    case "ml":
      return data.huggingface ? (
        <HuggingFaceSection data={data.huggingface.data} />
      ) : null;
    case "projects":
      return <ProjectsSection projects={data.projects} />;
    case "links":
      return <LinksBlock data={data} />;
    case "files":
      return <FilesSection data={data} />;
  }
}

function LinksBlock({ data }: { data: LayoutData }) {
  const fallbacks: Array<{ label: string; handle: string; href: string }> = [];
  if (data.githubHandle && !data.github)
    fallbacks.push({
      label: "GitHub",
      handle: data.githubHandle,
      href: `https://github.com/${data.githubHandle}`,
    });
  if (data.leetcodeHandle && !data.leetcode)
    fallbacks.push({
      label: "LeetCode",
      handle: data.leetcodeHandle,
      href: `https://leetcode.com/${data.leetcodeHandle}`,
    });
  if (data.codeforcesHandle && !data.codeforces)
    fallbacks.push({
      label: "Codeforces",
      handle: data.codeforcesHandle,
      href: `https://codeforces.com/profile/${data.codeforcesHandle}`,
    });

  return <LinksSection links={data.customLinks} fallbacks={fallbacks} />;
}

function StaleNote({ source }: { source: string }) {
  return (
    <p className="mt-3 text-xs text-p-fg-subtle">
      Showing cached data — {source} is currently unreachable.
    </p>
  );
}

function Footer({ slug }: { slug: string }) {
  return (
    <footer className="border-t border-p-border pt-10">
      <div className="flex items-center justify-between text-xs text-p-fg-subtle">
        <Link
          href="/"
          className="transition-colors hover:text-p-fg"
          data-no-print-url
        >
          Made with Pofolio
        </Link>
        <span className="font-p-mono">/p/{slug}</span>
      </div>
    </footer>
  );
}