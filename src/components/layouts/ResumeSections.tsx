import type { LayoutData } from "./types";

/*
 * Renderers for the resume-derived sections: Experience, Education, Skills.
 *
 * The design discipline here is what stops the portfolio reading like a CV.
 * Specifically:
 *   - Experience is a TIMELINE — a vertical rule with entries hung off it,
 *     dates as small metadata, role as the headline, NOT a bullet list of
 *     responsibilities.
 *   - Education is compact — institution + degree + year on minimal rows.
 *   - Skills are chips, not a comma-separated paragraph.
 *
 * Both layouts (Sidebar, SinglePage) import these so the treatment is
 * consistent regardless of page structure.
 */

export function ExperienceBlock({
  items,
}: {
  items: LayoutData["experience"];
}) {
  if (items.length === 0) return null;
  return (
    <ol className="relative space-y-8 border-l border-p-border pl-6">
      {items.map((e) => (
        <li key={e.id} className="relative">
          {/* Timeline node */}
          <span
            aria-hidden
            className="absolute -left-[1.6875rem] top-1.5 size-2.5 rounded-full border-2 border-p-bg bg-p-fg"
          />
          {e.dates && (
            <div className="font-p-mono text-xs text-p-fg-subtle">
              {e.dates}
            </div>
          )}
          <div className="mt-0.5 font-p-display text-lg font-semibold text-p-fg">
            {e.role || e.company}
          </div>
          {e.role && e.company && (
            <div className="text-sm text-p-fg-muted">{e.company}</div>
          )}
          {e.summary && (
            <p className="mt-1.5 text-sm leading-relaxed text-p-fg/80">
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
    <ul className="space-y-4">
      {items.map((e) => (
        <li
          key={e.id}
          className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4"
        >
          <div>
            <div className="font-p-display text-base font-semibold text-p-fg">
              {e.institution || e.degree}
            </div>
            {e.institution && e.degree && (
              <div className="text-sm text-p-fg-muted">{e.degree}</div>
            )}
          </div>
          {e.dates && (
            <div className="shrink-0 font-p-mono text-xs text-p-fg-subtle">
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
    <ul className="flex flex-wrap gap-2">
      {skills.map((skill) => (
        <li
          key={skill}
          className="rounded-full border border-p-border bg-p-surface px-3 py-1 text-sm text-p-fg"
        >
          {skill}
        </li>
      ))}
    </ul>
  );
}
