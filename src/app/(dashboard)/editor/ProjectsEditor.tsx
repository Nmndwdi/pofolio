"use client";

import { useFieldArray, useFormContext, Controller } from "react-hook-form";
import { useState } from "react";
import type { ProfileFormInput } from "@/lib/validators/profile-form";
import { MultiFileUpload } from "@/components/editor/MultiFileUpload";
import { clientPreviewUrl } from "@/lib/uploadClient";

/*
 * ProjectsEditor — projects-as-structured-data UI.
 *
 * Replaces the old "Project images" flat gallery. Each project is now a card
 * with title, description, role/year, demo/source/video links, a per-project
 * image gallery, and a tech-stack chip list.
 *
 * Why a separate component (not inlined in EditorForm.tsx):
 *  - EditorForm.tsx is already 1200+ lines; adding the project editor
 *    inline would push it past readability.
 *  - Each project row has its own image-gallery upload + tech chip state —
 *    cleanly factored out, this is much easier to maintain.
 *  - We can reuse the existing MultiFileUpload primitive per-project rather
 *    than rebuilding the upload UX.
 *
 * Reads from react-hook-form context (rather than props) so it's a drop-in:
 * the parent just renders <ProjectsEditor /> and useFieldArray binds to the
 * form's `projects` field.
 */

export function ProjectsEditor() {
  const { control, register, watch } = useFormContext<ProfileFormInput>();
  const { fields, append, remove } = useFieldArray({
    control,
    name: "projects",
  });

  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const toggle = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-3">
      {fields.length === 0 && (
        <p className="text-xs text-muted-foreground">
          No projects yet. Each project has a title, description, links, and
          its own image gallery.
        </p>
      )}

      <ul className="space-y-3">
        {fields.map((field, i) => {
          // We watch the title so the collapsed row header updates live.
          const title = watch(`projects.${i}.title`);
          const expanded = expandedIds.has(field.id);
          return (
            <li
              key={field.id}
              className="overflow-hidden rounded-md border bg-card"
            >
              {/* Header row — title + expand/remove. Collapsed by default to
                  keep the editor scannable when there are many projects. */}
              <div className="flex items-center gap-2 border-b bg-muted/30 px-3 py-2">
                <button
                  type="button"
                  onClick={() => toggle(field.id)}
                  className="text-xs text-muted-foreground hover:text-foreground"
                  aria-label={expanded ? "Collapse" : "Expand"}
                >
                  {expanded ? "▼" : "▶"}
                </button>
                <div className="flex-1 truncate text-sm font-medium">
                  {title?.trim() || (
                    <span className="text-muted-foreground italic">
                      Untitled project
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => remove(i)}
                  className="text-xs text-muted-foreground hover:text-destructive"
                >
                  Remove
                </button>
              </div>

              {expanded && (
                <div className="space-y-3 p-3">
                  {/* Title */}
                  <input
                    {...register(`projects.${i}.title`)}
                    className="input"
                    placeholder="Project title"
                  />

                  {/* Description */}
                  <textarea
                    {...register(`projects.${i}.description`)}
                    rows={3}
                    className="input min-h-[72px] resize-y"
                    placeholder="What it is, what you built, what it does"
                    maxLength={2000}
                  />

                  {/* Role / year */}
                  <div className="grid gap-2 sm:grid-cols-2">
                    <input
                      {...register(`projects.${i}.role`)}
                      className="input"
                      placeholder="Role (e.g. Solo, Lead dev)"
                    />
                    <input
                      {...register(`projects.${i}.year`)}
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
                      {...register(`projects.${i}.demoUrl`)}
                      className="input"
                      placeholder="Demo URL (live site)"
                    />
                    <input
                      {...register(`projects.${i}.sourceUrl`)}
                      className="input"
                      placeholder="Source URL (GitHub repo, etc.)"
                    />
                    <input
                      {...register(`projects.${i}.videoUrl`)}
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
                      name={`projects.${i}.tech`}
                      control={control}
                      render={({ field: techField }) => (
                        <TechChipInput
                          value={techField.value ?? []}
                          onChange={techField.onChange}
                        />
                      )}
                    />
                  </div>

                  {/* Image gallery — reuse the MultiFileUpload primitive. */}
                  <div className="space-y-1">
                    <div className="text-xs font-medium text-muted-foreground">
                      Images
                    </div>
                    <Controller
                      name={`projects.${i}.images`}
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
                          renderItem={(item, onRemove) => (
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
                                onClick={onRemove}
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

                  {/* Featured toggle — large card vs compact row on the
                      public page. */}
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      {...register(`projects.${i}.featured`)}
                      className="rounded"
                    />
                    <span>Featured (renders larger on the public page)</span>
                  </label>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <button
        type="button"
        onClick={() => {
          const id = crypto.randomUUID();
          append({
            id,
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
          // Auto-expand the newly added row so the user can start typing.
          setExpandedIds((prev) => new Set([...prev, id]));
        }}
        className="btn-secondary"
      >
        + Add project
      </button>
    </div>
  );
}

/*
 * Tech chip input — comma/Enter splits into chips, backspace on empty input
 * removes the last chip. Matches the existing skills chip-input UX so the
 * editor feels consistent.
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
    // Avoid duplicates (case-insensitive).
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