import Link from "next/link";
import { GitHubSection } from "@/components/portfolio/GitHubSection";
import { CodeforcesSection } from "@/components/portfolio/CodeforcesSection";
import { LeetCodeSection } from "@/components/portfolio/LeetCodeSection";
import { DevToSection } from "@/components/portfolio/DevToSection";
import { HuggingFaceSection } from "@/components/portfolio/HuggingFaceSection";
import { LinksSection } from "@/components/portfolio/LinksSection";
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

            {sections.map((key) => (
              <Section key={key} id={key} title={SECTION_LABELS[key]}>
                <SectionContent sectionKey={key} data={data} />
              </Section>
            ))}

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
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    // scroll-mt accounts for the mobile sticky top bar height when the user
    // jumps via #anchor — otherwise the section title disappears under it.
    <section id={id} className="scroll-mt-24">
      <h2 className="mb-6 border-b border-p-border pb-3 font-p-display text-2xl font-semibold tracking-tight text-p-fg">
        {title}
      </h2>
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
      return <ProjectGallery images={data.projectImages} />;
    case "links":
      return <LinksBlock data={data} />;
    case "files":
      return <FilesBlock data={data} />;
  }
}

function ProjectGallery({ images }: { images: LayoutData["projectImages"] }) {
  if (images.length === 0) return null;
  const [featured, ...rest] = images;
  return (
    <div className="space-y-4">
      <Link
        href={deriveUrl(featured.publicId, { width: 1600 })}
        target="_blank"
        rel="noopener noreferrer"
        className="group block overflow-hidden rounded-lg border border-p-border bg-p-surface"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={deriveUrl(featured.publicId, { width: 1200, height: 720, crop: "fill" })}
          alt={featured.caption ?? ""}
          className="aspect-[5/3] w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
        />
        {featured.caption && (
          <div className="border-t border-p-border bg-p-surface px-4 py-2 text-sm text-p-fg-muted">
            {featured.caption}
          </div>
        )}
      </Link>

      {rest.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {rest.map((img, i) => (
            <Link
              key={img.id}
              href={deriveUrl(img.publicId, { width: 1600 })}
              target="_blank"
              rel="noopener noreferrer"
              className="group block overflow-hidden rounded-md border border-p-border bg-p-surface"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={deriveUrl(img.publicId, {
                  width: 600,
                  // Alternate aspect ratios for visual texture
                  height: i % 2 === 0 ? 450 : 800,
                  crop: "fill",
                })}
                alt={img.caption ?? ""}
                className={
                  "w-full object-cover transition-transform duration-500 group-hover:scale-[1.02] " +
                  (i % 2 === 0 ? "aspect-[4/3]" : "aspect-[3/4]")
                }
              />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
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

function FilesBlock({ data }: { data: LayoutData }) {
  return (
    <ul className="space-y-2">
      {data.resumeCloudinaryId && (
        <li>
          <FileRow
            href={deriveUrl(data.resumeCloudinaryId, { resourceType: "raw" })}
            label="Resume"
            format="PDF"
          />
        </li>
      )}
      {data.files.map((f) => (
        <li key={f.id}>
          <FileRow
            href={deriveUrl(f.publicId, { resourceType: f.resourceType })}
            label={f.label}
            format={(f.format || "FILE").toUpperCase()}
          />
        </li>
      ))}
    </ul>
  );
}

function FileRow({
  href,
  label,
  format,
}: {
  href: string;
  label: string;
  format: string;
}) {
  return (
    <Link
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 rounded-md border border-p-border bg-p-surface px-4 py-3 text-sm transition-colors hover:bg-p-surface-2"
    >
      <span className="rounded bg-p-surface-2 px-2 py-0.5 font-p-mono text-xs text-p-fg-muted">
        {format}
      </span>
      <span className="truncate text-p-fg">{label}</span>
    </Link>
  );
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
