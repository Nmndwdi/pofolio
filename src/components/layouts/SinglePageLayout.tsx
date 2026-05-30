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
  ExperienceBlock,
  EducationBlock,
  SkillsBlock,
} from "./ResumeSections";
import {
  type LayoutData,
  type SectionKey,
  has,
  sectionsFor,
  SECTION_LABELS,
} from "./types";

/*
 * Single-page layout. One scrollable column, no nav.
 *
 * The previous design but tightened: no dead left-column whitespace, sections
 * take the full content width, hero is intentionally tall and grabs focus.
 *
 * Best for users with less content or who prefer the long-scroll feel.
 */

export function SinglePageLayout({ data }: { data: LayoutData }) {
  const sections = sectionsFor(data);

  return (
    <div className="min-h-screen bg-p-bg font-p-body text-p-fg">
      <main className="mx-auto max-w-2xl px-6 py-16 sm:px-10 sm:py-24">
        <header className="space-y-6">
          {data.avatarCloudinaryId && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={deriveUrl(data.avatarCloudinaryId, {
                width: 240,
                height: 240,
                crop: "fill",
              })}
              alt={data.displayName}
              className="size-24 rounded-full border border-p-border object-cover sm:size-28"
            />
          )}
          <div className="space-y-3">
            <h1 className="font-p-display text-4xl font-bold leading-[1.05] tracking-tight text-p-fg sm:text-5xl">
              {data.displayName}
            </h1>
            {data.headline && (
              <p className="text-lg text-p-fg-muted sm:text-xl">
                {data.headline}
              </p>
            )}
          </div>
          {data.bio && (
            <p className="whitespace-pre-wrap text-base leading-relaxed text-p-fg/85">
              {data.bio}
            </p>
          )}
          {has.socials(data) && <SocialsRow data={data} />}
        </header>

        {sections.map((key) => {
          const ext = externalProfileLink(key, data);
          return (
            <Section
              key={key}
              title={SECTION_LABELS[key]}
              externalUrl={ext?.url}
              externalLabel={ext?.label}
            >
              <SectionContent sectionKey={key} data={data} />
            </Section>
          );
        })}

        <Footer slug={data.slug} />
      </main>
    </div>
  );
}

function Section({
  title,
  externalUrl,
  externalLabel,
  children,
}: {
  title: string;
  externalUrl?: string;
  externalLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-20 space-y-6">
      <div className="flex items-baseline justify-between gap-4 border-b border-p-border pb-2">
        <h2 className="font-p-display text-2xl font-semibold tracking-tight text-p-fg">
          {title}
        </h2>
        {externalUrl && externalLabel && (
          <Link
            href={externalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 text-xs text-p-fg-muted transition-colors hover:text-p-fg"
            data-no-print-url
          >
            {externalLabel} ↗
          </Link>
        )}
      </div>
      <div>{children}</div>
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
      return data.github ? <GitHubSection data={data.github.data} /> : null;
    case "competitive":
      return data.codeforces ? (
        <CodeforcesSection data={data.codeforces.data} />
      ) : null;
    case "problem-solving":
      return data.leetcode ? (
        <LeetCodeSection data={data.leetcode.data} />
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

/* Subcomponents — same shape as SidebarLayout. Tolerating this duplication
   intentionally: two copies is fine; we'd refactor to shared when a third
   layout appears. */

function LinksBlock({ data }: { data: LayoutData }) {
  return <LinksSection links={data.customLinks} />;
}


function SocialsRow({ data }: { data: LayoutData }) {
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
  return (
    <ul className="flex flex-wrap gap-2">
      {entries.map((e) => (
        <li key={e.label}>
          <Link
            href={e.href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center rounded-full border border-p-border bg-p-surface px-3 py-1 text-sm text-p-fg transition-colors hover:bg-p-surface-2"
          >
            {e.label}
          </Link>
        </li>
      ))}
    </ul>
  );
}

function Footer({ slug }: { slug: string }) {
  return (
    <footer className="mt-32 space-y-4 border-t border-p-border pt-8">
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