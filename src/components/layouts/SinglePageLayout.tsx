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

        {sections.map((key) => (
          <Section key={key} title={SECTION_LABELS[key]}>
            <SectionContent sectionKey={key} data={data} />
          </Section>
        ))}

        <Footer slug={data.slug} />
      </main>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-20 space-y-6">
      <h2 className="border-b border-p-border pb-2 font-p-display text-2xl font-semibold tracking-tight text-p-fg">
        {title}
      </h2>
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
      return <ProjectGallery images={data.projectImages} />;
    case "links":
      return <LinksBlock data={data} />;
    case "files":
      return <FilesBlock data={data} />;
  }
}

/* Subcomponents — same shape as SidebarLayout. Tolerating this duplication
   intentionally: two copies is fine; we'd refactor to shared when a third
   layout appears. */

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
  return <LinksSection links={data.customLinks} />;
}

function FilesBlock({ data }: { data: LayoutData }) {
  return (
    <ul className="space-y-2">
      {data.resumeCloudinaryId && (
        <FileRow
          href={deriveUrl(data.resumeCloudinaryId, { resourceType: "raw" })}
          label="Resume"
          format="PDF"
        />
      )}
      {data.files.map((f) => (
        <FileRow
          key={f.id}
          href={deriveUrl(f.publicId, { resourceType: f.resourceType })}
          label={f.label}
          format={(f.format || "FILE").toUpperCase()}
        />
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
