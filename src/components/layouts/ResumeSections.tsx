import type { LayoutData } from "./types";

/*
 * Renderers for the resume-derived sections: Experience, Education, Skills.
 *
 * Shared by every layout — Sidebar, SinglePage, and (going forward) every
 * design template. The goal here is that switching templates doesn't
 * mean re-implementing how experience renders. Theme tokens drive colors;
 * layout-side spacing wraps these blocks; everything inside is uniform.
 *
 * Design discipline (the things that stop these from reading like a CV):
 *   - Experience is a TIMELINE — a vertical rule with entries hung off it.
 *     Each entry leads with dates (mono, small) then role (display), THEN
 *     company (muted). Inverting the usual "Company / Role / Dates" CV
 *     order keeps the reader's eye on what the person *did*, not where.
 *   - Education stays compact — institution + degree + year on a single
 *     row when there's space, stacked on narrow widths.
 *   - Skills are chips, never a comma-paragraph.
 */

export function ExperienceBlock({
  items,
}: {
  items: LayoutData["experience"];
}) {
  if (items.length === 0) return null;
  return (
    <ol className="relative space-y-10 border-l border-p-border pl-6 sm:pl-7">
      {items.map((e) => (
        <li key={e.id} className="relative">
          {/* Timeline node — sits centered on the rule. Border-2 against
              bg color carves a tight ring so the dot reads cleanly even on
              themed backgrounds. */}
          <span
            aria-hidden
            className="absolute -left-[1.78125rem] top-2 size-2.5 rounded-full border-2 border-p-bg bg-p-fg sm:-left-[2.03125rem]"
          />
          {e.dates && (
            <div className="font-p-mono text-[11px] uppercase tracking-wider text-p-fg-subtle">
              {e.dates}
            </div>
          )}
          {/* Role is the headline; company sits secondary below. */}
          <div className="mt-1 font-p-display text-lg font-semibold leading-snug text-p-fg sm:text-xl">
            {e.role || e.company}
          </div>
          {e.role && e.company && (
            <div className="mt-0.5 text-sm text-p-fg-muted">{e.company}</div>
          )}
          {e.summary && (
            <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-p-fg/80">
              {e.summary}
            </p>
          )}
        </li>
      ))}
    </ol>
  );
}

export function EducationBlock({
  items,
}: {
  items: LayoutData["education"];
}) {
  if (items.length === 0) return null;
  return (
    <ul className="space-y-5">
      {items.map((e) => (
        <li
          key={e.id}
          className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6"
        >
          <div className="min-w-0">
            <div className="font-p-display text-base font-semibold leading-snug text-p-fg sm:text-lg">
              {e.institution || e.degree}
            </div>
            {e.institution && e.degree && (
              <div className="mt-0.5 text-sm text-p-fg-muted">{e.degree}</div>
            )}
          </div>
          {e.dates && (
            <div className="shrink-0 font-p-mono text-[11px] uppercase tracking-wider text-p-fg-subtle">
              {e.dates}
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

export function SkillsBlock({ skills }: { skills: string[] }) {
  if (skills.length === 0) return null;
  return (
    <ul className="flex flex-wrap gap-1.5">
      {skills.map((skill) => (
        <li
          key={skill}
          // Subtler chip: thinner border, no background fill — lets the
          // chips group visually without each one screaming. The hover
          // state is the only place the surface color appears.
          className="rounded-full border border-p-border px-3 py-1 text-sm text-p-fg transition-colors hover:bg-p-surface"
        >
          {skill}
        </li>
      ))}
    </ul>
  );
}