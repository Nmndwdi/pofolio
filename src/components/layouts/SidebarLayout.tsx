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
import { deriveUrl } from "@/lib/cloudinary";
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
 * Mobile (< md): sidebar collapses into a sticky top bar. Hamburger reveals
 * the same nav as a fullscreen sheet.
 *
 * Why this is the default:
 *   - Persistent identity (name + photo always visible)
 *   - Real navigation (recruiters jump between sections without scroll fatigue)
 *   - Doesn't read like a CV — sidebar is the strongest "this is a website"
 *     signal we can give for free
 */

export function SidebarLayout({ data }: { data: LayoutData }) {
  const sections = sectionsFor(data);

  return (
    <div className="min-h-screen bg-p-bg font-p-body text-p-fg">
      <SidebarNav data={data} sections={sections} variant="mobile" />

      <div className="md:flex">
        <aside className="hidden md:flex md:w-72 md:flex-col md:border-r md:border-p-border lg:w-80">
          <div className="sticky top-0 flex h-screen flex-col p-8">
            <SidebarNav data={data} sections={sections} variant="desktop" />
          </div>
        </aside>

        <main className="min-w-0 flex-1 px-6 py-12 sm:px-10 sm:py-16 md:px-12 md:py-20 lg:px-20">
          <div className="mx-auto max-w-3xl space-y-24">
            {data.bio && (
              <Section id="about" title="About">
                <p className="whitespace-pre-wrap text-base leading-relaxed text-p-fg/85">
                  {data.bio}
                </p>
              </Section>
            )}

            {sections.map((key) => {
              // External profile URL (e.g. github.com/foo) for sections that
              // mirror an external platform. Rendered as a small link next to
              // the section title so visitors can jump to the source.
              const ext = externalProfileLink(key, data);
              return (
                <Section
                  key={key}
                  id={key}
                  title={SECTION_LABELS[key]}
                  externalUrl={ext?.url}
                  externalLabel={ext?.label}
                >
                  <SectionContent sectionKey={key} data={data} />
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

function Section({
  id,
  title,
  externalUrl,
  externalLabel,
  children,
}: {
  id: string;
  title: string;
  externalUrl?: string;
  externalLabel?: string;
  children: React.ReactNode;
}) {
  return (
    // scroll-mt accounts for the mobile sticky top bar height when the user
    // jumps via #anchor — otherwise the section title disappears under it.
    <section id={id} className="scroll-mt-24">
      <div className="mb-6 flex items-baseline justify-between gap-4 border-b border-p-border pb-3">
        <h2 className="font-p-display text-2xl font-semibold tracking-tight text-p-fg">
          {title}
        </h2>
        {externalUrl && externalLabel && (
          <Link
            href={externalUrl}
            target="_blank"
            rel="noopener noreferrer"
            // Small, secondary — doesn't compete with the section title.
            className="shrink-0 text-xs text-p-fg-muted transition-colors hover:text-p-fg"
            data-no-print-url
          >
            {externalLabel} ↗
          </Link>
        )}
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

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
    <footer className="space-y-4 border-t border-p-border pt-8">
      <ExportActions slug={slug} />
      <div className="flex items-center justify-between text-xs text-p-fg-subtle">
        <Link href="/" className="hover:text-p-fg" data-no-print-url>
          Made with Pofolio
        </Link>
        <span className="font-p-mono">/p/{slug}</span>
      </div>
    </footer>
  );
}