"use client";

import { useFieldArray, useFormContext, Controller } from "react-hook-form";
import { useState } from "react";
import type { ProfileFormInput } from "@/lib/validators/profile-form";
import { MultiFileUpload } from "@/components/editor/MultiFileUpload";
import { clientPreviewUrl } from "@/lib/uploadClient";

/*
 * ProjectsEditor — projects-as-structured-data UI.
 *
 * Architecture:
 *   - Each project is rendered as a <ProjectItem /> component.
 *   - ProjectItem owns its own click handlers as plain onClick on plain
 *     <button>s. No <details>/<summary> (the browser's default disclosure
 *     behavior was firing synthetic clicks on the first focusable child
 *     under some conditions, which caused the Remove button on the FIRST
 *     project to fire when users clicked anywhere in the projects area).
 *   - Component owns its own `expanded` state via useState. No shared
 *     parent state — each row's state lives with the row. No closures
 *     over array indices that could go stale, no event delegation paths
 *     that could pick the wrong row.
 *   - Remove button is moved into a separate row below the header (not
 *     a sibling flex child of the title) so there's zero chance of a
 *     misrouted click hitting it.
 */

export function ProjectsEditor() {
  const { control, register, watch, setValue, getValues } =
    useFormContext<ProfileFormInput>();
  const { fields, append, remove } = useFieldArray({
    control,
    name: "projects",
  });

  return (
    <div className="space-y-3">
      {fields.length === 0 && (
        <p className="text-xs text-muted-foreground">
          No projects yet. Each project has a title, description, links, and
          its own image gallery.
        </p>
      )}

      <ul className="flex flex-col gap-3 list-none p-0 m-0">
        {fields.map((field, i) => (
          <ProjectItem
            key={field.id}
            index={i}
            // Pass the `name` watch value so the header updates live as
            // the user types into the title input.
            title={watch(`projects.${i}.title`)}
            control={control}
            register={register}
            getValues={getValues}
            setValue={setValue}
            onRemove={() => remove(i)}
          />
        ))}
      </ul>

      <button
        type="button"
        onClick={() => {
          append({
            id: crypto.randomUUID(),
            title: "",
            description: "",
            role: "",
            year: "",
            demoUrl: "",
            sourceUrl: "",
            videoUrl: "",
            tech: [],
            images: [],
            featured: false,
          });
        }}
        className="btn-secondary"
      >
        + Add project
      </button>
    </div>
  );
}

/*
 * ProjectItem — single project row.
 *
 * Owns its own `expanded` state. The expand toggle is a real button on the
 * header row. The Remove button sits BELOW the form body when expanded,
 * not in the header — fully separated from the toggle target.
 */
function ProjectItem({
  index,
  title,
  control,
  register,
  getValues,
  setValue,
  onRemove,
}: {
  index: number;
  title: string;
  control: ReturnType<typeof useFormContext<ProfileFormInput>>["control"];
  register: ReturnType<typeof useFormContext<ProfileFormInput>>["register"];
  getValues: ReturnType<typeof useFormContext<ProfileFormInput>>["getValues"];
  setValue: ReturnType<typeof useFormContext<ProfileFormInput>>["setValue"];
  onRemove: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  // Newly added rows: we could auto-expand on mount, but for now keep them
  // collapsed so it matches every other row's initial state. User clicks
  // the new row to start editing.

  return (
    <li className="overflow-hidden rounded-md border bg-card">
      {/* Header row — clickable to toggle expansion. Single <button>, full
          width, no siblings that could intercept the click. */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        aria-controls={`project-body-${index}`}
        className="flex w-full items-center gap-2 border-b bg-muted/30 px-3 py-2 text-left transition-colors hover:bg-muted/50"
      >
        <span
          className={`text-xs text-muted-foreground transition-transform ${
            expanded ? "rotate-90" : ""
          }`}
          aria-hidden="true"
        >
          ▶
        </span>
        <span className="flex-1 truncate text-sm font-medium">
          {title?.trim() || (
            <span className="text-muted-foreground italic">
              Untitled project
            </span>
          )}
        </span>
      </button>

      {/* Body — only rendered when expanded. */}
      {expanded && (
        <div id={`project-body-${index}`} className="space-y-3 p-3">
          {/* Title */}
          <input
            {...register(`projects.${index}.title`)}
            className="input"
            placeholder="Project title"
          />

          {/* Description */}
          <textarea
            {...register(`projects.${index}.description`)}
            rows={3}
            className="input min-h-[72px] resize-y"
            placeholder="What it is, what you built, what it does"
            maxLength={2000}
          />

          {/* Role / year */}
          <div className="grid gap-2 sm:grid-cols-2">
            <input
              {...register(`projects.${index}.role`)}
              className="input"
              placeholder="Role (e.g. Solo, Lead dev)"
            />
            <input
              {...register(`projects.${index}.year`)}
              className="input"
              placeholder="Year (e.g. 2024)"
            />
          </div>

          {/* Links */}
          <div className="space-y-2">
            <div className="text-xs font-medium text-muted-foreground">
              Links
            </div>
            <input
              {...register(`projects.${index}.demoUrl`)}
              className="input"
              placeholder="Demo URL (live site)"
            />
            <input
              {...register(`projects.${index}.sourceUrl`)}
              className="input"
              placeholder="Source URL (GitHub repo, etc.)"
            />
            <input
              {...register(`projects.${index}.videoUrl`)}
              className="input"
              placeholder="Video URL (YouTube/Vimeo demo)"
            />
          </div>

          {/* Tech stack — chip input */}
          <div className="space-y-1">
            <div className="text-xs font-medium text-muted-foreground">
              Tech stack
            </div>
            <Controller
              name={`projects.${index}.tech`}
              control={control}
              render={({ field: techField }) => (
                <TechChipInput
                  value={techField.value ?? []}
                  onChange={techField.onChange}
                />
              )}
            />
          </div>

          {/* Image gallery */}
          <div className="space-y-1">
            <div className="text-xs font-medium text-muted-foreground">
              Images
            </div>
            <Controller
              name={`projects.${index}.images`}
              control={control}
              render={({ field: imgField }) => (
                <MultiFileUpload
                  kind="project"
                  items={imgField.value ?? []}
                  maxItems={12}
                  maxBytes={10 * 1024 * 1024}
                  accept="image/*"
                  cta="Add image"
                  toItem={(asset, id) => ({
                    id,
                    publicId: asset.publicId,
                    caption: "",
                    width: asset.width,
                    height: asset.height,
                  })}
                  onChange={imgField.onChange}
                  renderItem={(item, onItemRemove) => (
                    <div className="flex items-center gap-2 rounded-md border bg-background px-2 py-1.5 text-sm">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={clientPreviewUrl(
                          item.publicId,
                          "w_96,h_64,c_fill,f_auto,q_auto",
                        )}
                        alt=""
                        className="h-10 w-16 rounded object-cover"
                      />
                      <input
                        value={item.caption ?? ""}
                        onChange={(e) => {
                          imgField.onChange(
                            (imgField.value ?? []).map((it) =>
                              it.id === item.id
                                ? { ...it, caption: e.target.value }
                                : it,
                            ),
                          );
                        }}
                        placeholder="Caption (optional)"
                        className="input h-8 flex-1 text-sm"
                        maxLength={140}
                      />
                      <button
                        type="button"
                        onClick={onItemRemove}
                        className="text-xs text-muted-foreground hover:text-destructive"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                />
              )}
            />
          </div>

          {/* Featured toggle — only ONE project can be featured. */}
          <div className="flex items-center gap-2 text-sm">
            <Controller
              name={`projects.${index}.featured`}
              control={control}
              render={({ field: featuredField }) => (
                <input
                  id={`projects-${index}-featured`}
                  type="checkbox"
                  checked={!!featuredField.value}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    featuredField.onChange(checked);
                    if (checked) {
                      const all = getValues("projects") ?? [];
                      all.forEach((p, idx) => {
                        if (idx !== index && p.featured) {
                          setValue(`projects.${idx}.featured`, false, {
                            shouldDirty: true,
                          });
                        }
                      });
                    }
                  }}
                  className="rounded"
                />
              )}
            />
            <label htmlFor={`projects-${index}-featured`}>
              Featured (renders larger on the public page)
            </label>
          </div>

          {/* Remove button — its own row at the bottom of the form, fully
              separated from the header click target. No flex sibling
              relationship with the toggle. Zero chance of cross-handler
              click confusion. */}
          <div className="flex justify-end border-t pt-3">
            <button
              type="button"
              onClick={onRemove}
              className="text-xs text-muted-foreground hover:text-destructive"
            >
              Remove project
            </button>
          </div>
        </div>
      )}
    </li>
  );
}

/*
 * TechChipInput — chip input for the project's tech stack. Enter or comma
 * commits a chip, Backspace on empty removes the last one.
 */
function TechChipInput({
  value,
  onChange,
}: {
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const [draft, setDraft] = useState("");

  const commit = (raw: string) => {
    const cleaned = raw.trim();
    if (!cleaned) return;
    if (value.some((t) => t.toLowerCase() === cleaned.toLowerCase())) {
      setDraft("");
      return;
    }
    onChange([...value, cleaned]);
    setDraft("");
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-md border bg-background p-2">
      {value.map((t) => (
        <span
          key={t}
          className="flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs"
        >
          {t}
          <button
            type="button"
            onClick={() => onChange(value.filter((x) => x !== t))}
            className="text-muted-foreground hover:text-destructive"
            aria-label={`Remove ${t}`}
          >
            ✕
          </button>
        </span>
      ))}
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            commit(draft);
          } else if (e.key === "Backspace" && !draft && value.length > 0) {
            onChange(value.slice(0, -1));
          }
        }}
        onBlur={() => draft && commit(draft)}
        placeholder={
          value.length === 0 ? "React, Postgres, Docker..." : "Add tech..."
        }
        className="min-w-[120px] flex-1 bg-transparent text-sm outline-none"
      />
    </div>
  );
}