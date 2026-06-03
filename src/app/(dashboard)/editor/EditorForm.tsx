"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { useForm, useFieldArray, Controller, FormProvider, type Control, type UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  ProfileFormSchema,
  type ProfileFormInput,
} from "@/lib/validators/profile-form";
import {
  useHandleCheck,
  type HandleStatus,
} from "@/hooks/useHandleCheck";
import { FileUpload } from "@/components/editor/FileUpload";
import { MultiFileUpload } from "@/components/editor/MultiFileUpload";
import { useEditorDraft } from "@/hooks/useEditorDraft";
import { ProjectsEditor } from "./ProjectsEditor";
import { clientPreviewUrl } from "@/lib/uploadClient";
import type { UploadedAsset } from "@/lib/uploadClient";

interface InitialData extends ProfileFormInput {
  slug: string;
}

/*
 * The structured-form editor.
 *
 * Five conceptual groups, all on one page (no tabs, no wizard — minimal
 * cognitive overhead):
 *   1. About you (name, headline, bio)
 *   2. Where to find you (socials)
 *   3. Code & problem-solving (handles)
 *   4. Other links (custom links — useFieldArray for add/remove)
 *   5. Look (theme)
 *
 * The form posts to PATCH /api/profile. We intentionally don't auto-save —
 * users shouldn't worry their drafts are publishing as they type. Save is
 * an explicit button.
 */
export default function EditorForm({ initial }: { initial: InitialData }) {
  const [submitting, setSubmitting] = useState(false);

  const { slug, ...formInitial } = initial;

  // Expose the whole `methods` object so FormProvider (below) can pass it
  // through to child components like <ProjectsEditor /> which use useFormContext.
  const methods = useForm<ProfileFormInput>({
    resolver: zodResolver(ProfileFormSchema),
    defaultValues: formInitial,
  });
  const {
    register,
    control,
    handleSubmit,
    setError,
    watch,
    setValue,
    getValues,
    reset,
    formState: { errors, isDirty },
  } = methods;

  // Draft persistence — survive reloads with unsaved edits.
  const { hasDraft, restoreDraft, discardDraft, clearDraft } = useEditorDraft({
    slug,
    watch,
    reset,
    initial: formInitial,
    isDirty,
  });

  const githubValue = watch("github") ?? "";
  const codeforcesValue = watch("codeforces") ?? "";
  const leetcodeValue = watch("leetcode") ?? "";
  const devtoValue = watch("devto") ?? "";
  const huggingfaceValue = watch("huggingface") ?? "";

  const githubStatus = useHandleCheck<{
    name: string | null;
    publicRepos: number;
  }>(githubValue, {
    endpoint: "/api/integrations/github/check",
    paramName: "username",
  });
  const codeforcesStatus = useHandleCheck<{
    handle: string;
    rating: number | null;
    rank: string | null;
  }>(codeforcesValue, {
    endpoint: "/api/integrations/codeforces/check",
    paramName: "handle",
  });
  const leetcodeStatus = useHandleCheck<{
    username: string;
    totalSolved: number;
  }>(leetcodeValue, {
    endpoint: "/api/integrations/leetcode/check",
    paramName: "username",
  });
  // Dev.to and Hugging Face get the same live-check treatment so users see
  // green-tick / not-found feedback as they type. Same endpoint contract
  // (returns `{ status, preview }`).
  const devtoStatus = useHandleCheck<{
    username: string;
    articleCount: number;
  }>(devtoValue, {
    endpoint: "/api/integrations/devto/check",
    paramName: "username",
  });
  const huggingfaceStatus = useHandleCheck<{
    username: string;
    totalModels: number;
    totalDatasets: number;
    totalSpaces: number;
  }>(huggingfaceValue, {
    endpoint: "/api/integrations/huggingface/check",
    paramName: "username",
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "customLinks",
  });

  // Field arrays for the resume-derived structured sections.
  const experienceFA = useFieldArray({ control, name: "experience" });
  const educationFA = useFieldArray({ control, name: "education" });

  // Resume upload + parse state. When a user uploads a resume to pre-fill,
  // we POST it to /api/resume/parse and merge the result into the form.
  const [parsing, setParsing] = useState(false);

  const onSubmit = async (data: ProfileFormInput) => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) {
        if (json.fieldErrors) {
          for (const [field, messages] of Object.entries(
            json.fieldErrors as Record<string, string[]>,
          )) {
            // Field paths can be nested (e.g. "socials.linkedin") — RHF handles
            // dotted paths natively.
            setError(field as keyof ProfileFormInput, {
              message: messages[0],
            });
          }
          // Also surface a toast so the user knows SOMETHING failed —
          // a field error scrolled off-screen is invisible.
          toast.error("Some fields need fixing — check the form.");
        } else {
          toast.error(json.error ?? "Save failed");
        }
        return;
      }
      toast.success("Saved");
      // Server now holds the saved state — any local draft is obsolete.
      clearDraft();
    } catch {
      toast.error("Network error");
    } finally {
      setSubmitting(false);
    }
  };

  /*
   * If client-side validation fails, react-hook-form silently swallows the
   * submit — onSubmit is never called. Provide an explicit `onInvalid` so
   * the user sees WHY the button "didn't do anything." Without this, a
   * single bad URL in customLinks or socials makes the whole form silently
   * un-submittable, which feels like a broken button.
   *
   * We also log the full errors tree to console — useful when the message
   * surfaces a "Required" but the user can't see which field is empty
   * (e.g. an uploaded file with a missing field hidden inside an array).
   */
  const onInvalid = (errs: typeof errors) => {
    // Log the full error tree so we (and the user) can inspect in DevTools.
    console.error("Form validation failed:", errs);

    // Walk the error tree and return [path, message] of the first leaf.
    const findFirst = (
      obj: Record<string, unknown>,
      path: string[] = [],
    ): { path: string; message: string } | null => {
      for (const [k, v] of Object.entries(obj)) {
        if (!v || typeof v !== "object") continue;
        // RHF leaf node: { type, message, ref }
        if (
          "message" in v &&
          typeof (v as { message?: unknown }).message === "string"
        ) {
          return {
            path: [...path, k].join("."),
            message: (v as { message: string }).message || "(no message)",
          };
        }
        // Recurse — skip ref/type wrappers
        if (k !== "ref" && k !== "type") {
          const found = findFirst(v as Record<string, unknown>, [...path, k]);
          if (found) return found;
        }
      }
      return null;
    };

    const first = findFirst(errs as unknown as Record<string, unknown>);
    if (first) {
      toast.error(`${first.path}: ${first.message}`);
    } else {
      toast.error("Validation failed. Check the browser console for details.");
    }
  };

  /*
   * Resume upload → parse → merge.
   *
   * The user picks a PDF; we POST it to /api/resume/parse and merge the
   * result into the form. Merge policy is deliberately NON-destructive:
   *   - Empty form fields get filled from the resume
   *   - Fields the user already filled are LEFT ALONE (we never overwrite)
   *   - experience/education/skills are APPENDED, not replaced — so a user
   *     who already added a job keeps it
   *
   * This makes the feature safe to use at any time, not just on a blank
   * form. The user reviews everything afterward and the toast tells them
   * roughly what we found.
   */
  const onResumeParse = async (file: File) => {
    setParsing(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/resume/parse", {
        method: "POST",
        body: fd,
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "Couldn't parse that resume");
        return;
      }

      const p = json.parsed as {
        name?: string;
        email?: string;
        linkedinUrl?: string;
        githubHandle?: string;
        websiteUrl?: string;
        experience: Array<{
          company?: string;
          role?: string;
          dates?: string;
          summary?: string;
        }>;
        education: Array<{
          institution?: string;
          degree?: string;
          dates?: string;
        }>;
        skills: string[];
      };

      // Fill scalar fields ONLY if currently empty (non-destructive).
      const fillIfEmpty = (
        field: "displayName" | "github",
        value: string | undefined,
      ) => {
        if (value && !getValues(field)?.trim()) {
          setValue(field, value, { shouldDirty: true });
        }
      };
      fillIfEmpty("displayName", p.name);
      fillIfEmpty("github", p.githubHandle);

      if (p.email && !getValues("socials.email")?.trim()) {
        setValue("socials.email", p.email, { shouldDirty: true });
      }
      if (p.linkedinUrl && !getValues("socials.linkedin")?.trim()) {
        setValue("socials.linkedin", p.linkedinUrl, { shouldDirty: true });
      }
      if (p.websiteUrl && !getValues("socials.website")?.trim()) {
        setValue("socials.website", p.websiteUrl, { shouldDirty: true });
      }

      // Append experience/education rows (never replace existing).
      for (const e of p.experience) {
        experienceFA.append({
          id: crypto.randomUUID(),
          company: e.company ?? "",
          role: e.role ?? "",
          dates: e.dates ?? "",
          summary: e.summary ?? "",
          // New per-experience skills field — empty by default; user can
          // fill in per-role specifics in the editor.
          skills: [],
        });
      }
      for (const e of p.education) {
        educationFA.append({
          id: crypto.randomUUID(),
          institution: e.institution ?? "",
          degree: e.degree ?? "",
          dates: e.dates ?? "",
          description: "",
        });
      }

      // Merge skills — union with whatever's already there, deduped.
      if (p.skills.length > 0) {
        const existing = getValues("skills") ?? [];
        const merged = [...new Set([...existing, ...p.skills])];
        setValue("skills", merged, { shouldDirty: true });
      }

      const counts = [
        p.experience.length > 0 && `${p.experience.length} jobs`,
        p.education.length > 0 && `${p.education.length} schools`,
        p.skills.length > 0 && `${p.skills.length} skills`,
      ].filter(Boolean);
      toast.success(
        counts.length > 0
          ? `Added ${counts.join(", ")} from your resume — review below.`
          : "Parsed your resume — review the fields below.",
      );
    } catch {
      toast.error("Network error while parsing");
    } finally {
      setParsing(false);
    }
  };

  const publicUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/p/${slug}`;

  return (
    <FormProvider {...methods}>
    <form
      onSubmit={handleSubmit(onSubmit, onInvalid)}
      className="mx-auto max-w-2xl space-y-10 pb-24"
      // suppressHydrationWarning: Edge / Chrome autofill stamps
      // `fdprocessedid` on form elements before React hydrates. The mismatch
      // is benign (we'll never see it server-side) but the warning is
      // noisy. Suppressing on the form covers attribute diffs in direct
      // children; per-element suppression is added below where the
      // browser also tags deeply-nested buttons (PickerGrid).
      suppressHydrationWarning
    >
      {/* Top bar — slug, view-public link, save */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-4">
        <div className="text-sm text-muted-foreground">
          Editing <code className="rounded bg-muted px-1.5 py-0.5">/p/{slug}</code>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/p/${slug}`}
            target="_blank"
            className="btn-secondary"
          >
            View public page
          </Link>
          <button type="submit" disabled={submitting} className="btn-primary">
            {submitting ? "Saving…" : "Save"}
          </button>
        </div>
      </div>

      {/* Draft-restore banner — shown when localStorage holds unsaved edits
          from a previous session that differ from the saved data. */}
      {hasDraft && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm dark:border-amber-700/50 dark:bg-amber-950/30">
          <span className="text-amber-900 dark:text-amber-200">
            You have unsaved changes from a previous session.
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={restoreDraft}
              className="btn-secondary text-sm"
            >
              Restore
            </button>
            <button
              type="button"
              onClick={discardDraft}
              className="text-xs text-muted-foreground hover:text-destructive"
            >
              Discard
            </button>
          </div>
        </div>
      )}

      {/* ─── About you ───────────────────────────────────── */}
      <Group title="About you" hint="Shown at the top of your portfolio.">
        <Field label="Profile photo">
          {/*
           * Controller wraps a non-input UI (the FileUpload component) into
           * react-hook-form's controlled-field model. Pure register() doesn't
           * work here because there's no native <input> we own.
           */}
          <Controller
            name="avatarCloudinaryId"
            control={control}
            render={({ field }) => (
              <FileUpload
                kind="avatar"
                value={field.value ?? ""}
                onChange={field.onChange}
                accept="image/*"
                maxBytes={5 * 1024 * 1024} // 5 MB
                cta="Upload photo"
                preview={
                  field.value ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={clientPreviewUrl(field.value, "w_96,h_96,c_fill,f_auto,q_auto")}
                      alt="Profile photo"
                      className="size-16 rounded-full border bg-muted object-cover"
                    />
                  ) : (
                    <div className="flex size-16 items-center justify-center rounded-full border bg-muted text-xs text-muted-foreground">
                      No photo
                    </div>
                  )
                }
              />
            )}
          />
        </Field>
        <Field label="Name" error={errors.displayName?.message}>
          <input {...register("displayName")} className="input" />
        </Field>
        <Field
          label="Headline"
          error={errors.headline?.message}
          hint="One line — what you do or what you're working on."
        >
          <input
            {...register("headline")}
            className="input"
            placeholder="Final-year CS @ IIT, building stuff"
          />
        </Field>
        <Field label="Bio" error={errors.bio?.message} hint="A few sentences — optional.">
          <textarea
            {...register("bio")}
            rows={4}
            className="input min-h-[100px] resize-y"
            placeholder="Tell visitors about your work, interests, what you're looking for."
          />
        </Field>
      </Group>

      {/* ─── Socials ─────────────────────────────────────── */}
      <Group title="Where to find you">
        <Field label="LinkedIn URL" error={errors.socials?.linkedin?.message}>
          <input
            {...register("socials.linkedin")}
            className="input"
            placeholder="https://linkedin.com/in/yourname"
          />
        </Field>
        <Field label="Twitter / X handle">
          <input
            {...register("socials.twitter")}
            className="input"
            placeholder="yourname (without @)"
          />
        </Field>
        <Field label="Personal website">
          <input
            {...register("socials.website")}
            className="input"
            placeholder="https://yourname.dev"
          />
        </Field>
        <Field label="Public email">
          <input
            {...register("socials.email")}
            type="email"
            className="input"
            placeholder="you@example.com"
          />
        </Field>

        {/* Additional platforms (Mastodon, Bluesky, ORCID, Polywork, …).
            Rendered inline below the fixed four — same group, same visual
            rhythm. Each entry is a label + URL pair; we drop empty rows on
            save. */}
        <Field
          label="Other platforms"
          hint="Mastodon, Bluesky, ORCID, Polywork — anything else."
        >
          <CustomSocialsEditor control={control} register={register} />
        </Field>
      </Group>

      {/* ─── Coding handles ─────────────────────────────── */}
      <Group
        title="Code & problem-solving"
        hint="We'll show your live stats here once your handles are saved."
      >
        <Field
          label="GitHub username"
          error={errors.github?.message}
          hint={renderGithubHint(githubStatus, githubValue)}
        >
          <input
            {...register("github")}
            className="input"
            placeholder="namandwivedi"
          />
        </Field>
        <Field
          label="LeetCode username"
          error={errors.leetcode?.message}
          hint={renderLeetCodeHint(leetcodeStatus, leetcodeValue)}
        >
          <input {...register("leetcode")} className="input" />
        </Field>
        <Field
          label="Codeforces handle"
          error={errors.codeforces?.message}
          hint={renderCodeforcesHint(codeforcesStatus, codeforcesValue)}
        >
          <input {...register("codeforces")} className="input" />
        </Field>
      </Group>

      {/* ─── Writing & ML ───────────────────────────────── */}
      <Group
        title="Writing & ML"
        hint="Blogging and machine-learning profiles. Each becomes a live section on your portfolio."
      >
        <Field
          label="Dev.to username"
          error={errors.devto?.message}
          hint={renderDevToHint(devtoStatus, devtoValue)}
        >
          <input
            {...register("devto")}
            className="input"
            placeholder="yourname"
          />
        </Field>
        <Field
          label="Hugging Face username"
          error={errors.huggingface?.message}
          hint={renderHuggingFaceHint(huggingfaceStatus, huggingfaceValue)}
        >
          <input
            {...register("huggingface")}
            className="input"
            placeholder="yourname"
          />
        </Field>
      </Group>

      {/* ─── Custom links ───────────────────────────────── */}
      <Group
        title="Other links"
        hint="Anything else you want visitors to click — projects, blog posts, etc."
      >
        <ul className="space-y-4">
          {fields.map((field, i) => {
            const descValue = watch(`customLinks.${i}.description`) ?? "";
            return (
              <li
                key={field.id}
                className="space-y-2 rounded-md border bg-card p-3"
              >
                <div className="grid grid-cols-[1fr_2fr_auto] gap-2 sm:gap-3">
                  <input
                    {...register(`customLinks.${i}.label`)}
                    className="input"
                    placeholder="Label"
                  />
                  <input
                    {...register(`customLinks.${i}.url`)}
                    className="input"
                    placeholder="https://…"
                  />
                  <button
                    type="button"
                    onClick={() => remove(i)}
                    className="text-sm text-muted-foreground hover:text-destructive"
                    aria-label="Remove link"
                  >
                    Remove
                  </button>
                </div>
                <TextareaWithCounter
                  value={descValue}
                  rows={2}
                  placeholder="Optional description"
                  fieldProps={register(`customLinks.${i}.description`)}
                />
              </li>
            );
          })}
        </ul>
        <button
          type="button"
          onClick={() =>
            append({
              id: crypto.randomUUID(),
              label: "",
              url: "",
              description: "",
            })
          }
          className="btn-secondary"
        >
          + Add link
        </button>
      </Group>

      {/* ─── Background (resume-derived) ──────────────────── */}
      <Group
        title="Background"
        hint="Experience, education, and skills. Upload a resume to fill these in automatically."
      >
        <ResumeParseButton onParse={onResumeParse} parsing={parsing} />

        {/* Experience */}
        <div className="space-y-3">
          <div className="text-sm font-medium">Experience</div>
          {experienceFA.fields.length === 0 && (
            <p className="text-xs text-muted-foreground">
              No experience yet. Upload a resume above or add a role manually.
            </p>
          )}
          <ul className="space-y-4">
            {experienceFA.fields.map((field, i) => (
              <li
                key={field.id}
                className="space-y-2 rounded-md border bg-card p-3"
              >
                <div className="grid gap-2 sm:grid-cols-2">
                  <input
                    {...register(`experience.${i}.role`)}
                    className="input"
                    placeholder="Role"
                  />
                  <input
                    {...register(`experience.${i}.company`)}
                    className="input"
                    placeholder="Company"
                  />
                </div>
                <input
                  {...register(`experience.${i}.dates`)}
                  className="input"
                  placeholder="Dates (e.g. Jun 2023 – Present)"
                />
                <textarea
                  {...register(`experience.${i}.summary`)}
                  rows={2}
                  className="input min-h-[56px] resize-y"
                  placeholder="One or two lines about the role"
                />
                {/* Per-experience skills: what was used in THIS role. */}
                <div>
                  <div className="mb-1.5 text-xs text-muted-foreground">
                    Skills used in this role
                  </div>
                  <Controller
                    name={`experience.${i}.skills`}
                    control={control}
                    render={({ field: f }) => (
                      <SkillsEditor
                        value={f.value ?? []}
                        onChange={f.onChange}
                      />
                    )}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => experienceFA.remove(i)}
                  className="text-xs text-muted-foreground hover:text-destructive"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() =>
              experienceFA.append({
                id: crypto.randomUUID(),
                company: "",
                role: "",
                dates: "",
                summary: "",
                skills: [],
              })
            }
            className="btn-secondary"
          >
            + Add experience
          </button>
        </div>

        {/* Education */}
        <div className="space-y-3">
          <div className="text-sm font-medium">Education</div>
          {educationFA.fields.length === 0 && (
            <p className="text-xs text-muted-foreground">
              No education yet. Upload a resume above or add an entry manually.
            </p>
          )}
          <ul className="space-y-4">
            {educationFA.fields.map((field, i) => {
              const descValue = watch(`education.${i}.description`) ?? "";
              return (
                <li
                  key={field.id}
                  className="space-y-2 rounded-md border bg-card p-3"
                >
                  <input
                    {...register(`education.${i}.institution`)}
                    className="input"
                    placeholder="Institution"
                  />
                  <div className="grid gap-2 sm:grid-cols-2">
                    <input
                      {...register(`education.${i}.degree`)}
                      className="input"
                      placeholder="Degree (e.g. B.Tech, Computer Science)"
                    />
                    <input
                      {...register(`education.${i}.dates`)}
                      className="input"
                      placeholder="Dates (e.g. 2019 – 2023)"
                    />
                  </div>
                  <TextareaWithCounter
                    value={descValue}
                    rows={2}
                    placeholder="Optional — coursework, GPA, thesis, honors"
                    fieldProps={register(`education.${i}.description`)}
                  />
                  <button
                    type="button"
                    onClick={() => educationFA.remove(i)}
                    className="text-xs text-muted-foreground hover:text-destructive"
                  >
                    Remove
                  </button>
                </li>
              );
            })}
          </ul>
          <button
            type="button"
            onClick={() =>
              educationFA.append({
                id: crypto.randomUUID(),
                institution: "",
                degree: "",
                dates: "",
                description: "",
              })
            }
            className="btn-secondary"
          >
            + Add education
          </button>
        </div>

        {/* Skills (flat) */}
        <Field
          label="Skills"
          hint="Quick chip list. For more structure, use skill groups below."
        >
          <Controller
            name="skills"
            control={control}
            render={({ field }) => (
              <SkillsEditor
                value={field.value ?? []}
                onChange={field.onChange}
              />
            )}
          />
        </Field>

        {/* Skill groups */}
        <Field
          label="Skill groups"
          hint="Organize skills by area — e.g. Backend, DevOps, Frontend."
        >
          <SkillGroupsEditor
            control={control}
            register={register}
            watch={watch}
          />
        </Field>
      </Group>

      {/* ─── Files & projects ──────────────────────────── */}
      <Group
        title="Files & projects"
        hint="Anything visitors might want to download or browse."
      >
        <Field label="Resume" hint="PDF, replaces previous one.">
          <Controller
            name="resumeCloudinaryId"
            control={control}
            render={({ field }) => (
              <FileUpload
                kind="resume"
                value={field.value ?? ""}
                onChange={field.onChange}
                accept="application/pdf"
                maxBytes={10 * 1024 * 1024} // 10 MB
                cta="Upload resume"
                preview={
                  field.value ? (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="rounded bg-muted px-2 py-0.5 text-xs font-mono">
                        PDF
                      </span>
                      <span className="text-muted-foreground">
                        Resume uploaded
                      </span>
                    </div>
                  ) : null
                }
              />
            )}
          />
        </Field>

        <Field
          label="Certificates & other files"
          hint="Up to 10 files. PDFs, images, anything you want to share."
        >
          <Controller
            name="files"
            control={control}
            render={({ field }) => (
              <MultiFileUpload
                kind="file"
                items={field.value}
                maxItems={10}
                maxBytes={10 * 1024 * 1024}
                accept="application/pdf,image/*"
                cta="Add file"
                toItem={(asset, id) => ({
                  id,
                  // Default the label to the original filename, sans extension.
                  label: stripExt(asset.originalFilename),
                  publicId: asset.publicId,
                  resourceType: asset.resourceType,
                  format: asset.format,
                  bytes: asset.bytes,
                  // Empty description by default — user adds it manually.
                  description: "",
                })}
                onChange={field.onChange}
                renderItem={(item, onRemove) => (
                  <div className="space-y-2 rounded-md border bg-card px-3 py-2">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono uppercase">
                        {item.format || "FILE"}
                      </span>
                      <input
                        // Inline-edit the label. We update via the field's value
                        // by mapping over items.
                        value={item.label}
                        onChange={(e) => {
                          field.onChange(
                            field.value.map((f) =>
                              f.id === item.id
                                ? { ...f, label: e.target.value }
                                : f,
                            ),
                          );
                        }}
                        className="input h-8 flex-1 text-sm"
                        maxLength={80}
                      />
                      <button
                        type="button"
                        onClick={onRemove}
                        className="text-xs text-muted-foreground hover:text-destructive"
                      >
                        Remove
                      </button>
                    </div>
                    {/* Optional 1000-char description — e.g. "Issued by
                        ECCouncil — credential ID ABC-123" for a cert, or
                        a one-paragraph case study summary. We can't use
                        TextareaWithCounter directly because the textarea
                        isn't an RHF-registered field here (it's controlled
                        via the parent Controller's onChange map). So we
                        inline the same pattern by hand. */}
                    {(() => {
                      const desc = item.description ?? "";
                      const len = desc.length;
                      const over = len > 1000;
                      return (
                        <div className="space-y-1">
                          <textarea
                            value={desc}
                            onChange={(e) => {
                              field.onChange(
                                field.value.map((f) =>
                                  f.id === item.id
                                    ? { ...f, description: e.target.value }
                                    : f,
                                ),
                              );
                            }}
                            rows={2}
                            maxLength={1050}
                            placeholder="Optional description"
                            className="input min-h-[44px] resize-y text-sm"
                          />
                          <div
                            className={`text-right text-xs tabular-nums ${
                              over
                                ? "text-destructive"
                                : len > 900
                                  ? "text-amber-600 dark:text-amber-400"
                                  : "text-muted-foreground"
                            }`}
                          >
                            {len} / 1000
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
              />
            )}
          />
        </Field>

        <Field
          label="Projects"
          hint="Each project: title, description, links, gallery, tech stack. Up to 20."
        >
          <ProjectsEditor />
        </Field>
      </Group>

      {/* ─── Look ──────────────────────────────────────── */}
      <Group
        title="Look"
        hint="Pick a layout (page structure) and a theme (visual style). They mix freely — try a few."
      >
        <Field label="Layout">
          <Controller
            name="layout"
            control={control}
            render={({ field }) => (
              <PickerGrid
                value={field.value}
                onChange={field.onChange}
                options={[
                  {
                    value: "sidebar",
                    label: "Sidebar",
                    desc: "Fixed left rail with nav, content right",
                  },
                  {
                    value: "single",
                    label: "Single page",
                    desc: "Long single column, no nav",
                  },
                  {
                    value: "terminal",
                    label: "Terminal",
                    desc: "Interactive CLI — type commands to explore",
                  },
                  {
                    value: "brutalist",
                    label: "Brutalist",
                    desc: "Massive type, hazard yellow, hard shadows — loud",
                  },
                  {
                    value: "press",
                    label: "Press",
                    desc: "Editorial newspaper — oxblood serifs, kinetic typography",
                  },
                  {
                    value: "multipage",
                    label: "Multi-page",
                    desc: "Top nav, separate pages (coming soon)",
                    disabled: true,
                  },
                  {
                    value: "grid",
                    label: "Grid",
                    desc: "Visual-first, projects dominate (coming soon)",
                    disabled: true,
                  },
                ]}
              />
            )}
          />
        </Field>
        {/* Theme picker removed for now — we may bring it back later when we
            have themes that actually differ visually across all templates.
            The `theme` field still exists in the schema and DB; the API
            normalize step preserves whatever's stored, and the page loader
            falls back to "mono" via resolveTheme() for any unknown value. */}
      </Group>

      {/* Sticky bottom save bar — convenient on long forms */}
      <div className="fixed inset-x-0 bottom-0 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex max-w-2xl items-center justify-between py-3">
          <span className="text-xs text-muted-foreground">
            {isDirty ? "Unsaved changes" : "All changes saved"}
          </span>
          <button
            type="submit"
            disabled={submitting}
            className="btn-primary"
          >
            {submitting ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>
    </form>
    </FormProvider>
  );
}

/* ─── Layout primitives ──────────────────────────────────────────────────── */

function Group({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        {hint && <p className="text-sm text-muted-foreground">{hint}</p>}
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Field({
  label,
  error,
  hint,
  children,
}: {
  label: string;
  error?: string;
  hint?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium">{label}</span>
      {children}
      {hint && !error && <div className="text-xs">{hint}</div>}
      {error && <span className="block text-xs text-destructive">{error}</span>}
    </label>
  );
}

/**
 * Strip the file extension from a filename. "resume.v3.pdf" → "resume.v3".
 * Used to seed the "label" for newly-uploaded files.
 */
function stripExt(filename: string): string {
  const idx = filename.lastIndexOf(".");
  return idx > 0 ? filename.slice(0, idx) : filename;
}

/**
 * Resume upload + parse button. Picks a PDF, hands it to the parent's
 * onParse callback. Shows a spinner while parsing.
 *
 * The actual parsing + form-merge happens in the parent (EditorForm) — this
 * component only deals with file selection and the loading state.
 */
function ResumeParseButton({
  onParse,
  parsing,
}: {
  onParse: (file: File) => void | Promise<void>;
  parsing: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div className="rounded-md border border-dashed bg-muted/30 p-4">
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = ""; // allow re-picking the same file
          if (file) onParse(file);
        }}
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm">
          <div className="font-medium">Fill from your resume</div>
          <div className="text-xs text-muted-foreground">
            Upload a PDF — we&apos;ll pre-fill what we can. Nothing you&apos;ve
            already typed gets overwritten.
          </div>
        </div>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={parsing}
          className="btn-secondary shrink-0"
        >
          {parsing ? "Reading…" : "Upload resume"}
        </button>
      </div>
    </div>
  );
}

/**
 * Skills editor — a tag input. Type a skill, press Enter or comma to add it.
 * Each skill renders as a removable chip. Deduplicates case-insensitively.
 */
/*
 * TextareaWithCounter — drop-in textarea that shows a live "X / max" counter.
 * Used everywhere we accept the 1000-char "description" fields (customLinks,
 * education, files, skill groups). The watched value comes from RHF's
 * register pattern — caller passes the registered field props and the current
 * value, we render the textarea + a counter below it.
 *
 * We use watch() inside the parent component to get the live value, and pass
 * it in via the `value` prop here. Simpler than threading useFormContext
 * through every call site.
 */
function TextareaWithCounter({
  value,
  max = 1000,
  rows = 3,
  placeholder,
  fieldProps,
}: {
  value: string;
  max?: number;
  rows?: number;
  placeholder?: string;
  fieldProps: ReturnType<UseFormReturn<ProfileFormInput>["register"]>;
}) {
  const len = value?.length ?? 0;
  const over = len > max;
  return (
    <div className="space-y-1">
      <textarea
        {...fieldProps}
        rows={rows}
        maxLength={max + 50 /* allow a little buffer so the counter can show overage */}
        className="input resize-y"
        placeholder={placeholder}
      />
      <div
        className={`text-right text-xs tabular-nums ${
          over
            ? "text-destructive"
            : len > max * 0.9
              ? "text-amber-600 dark:text-amber-400"
              : "text-muted-foreground"
        }`}
      >
        {len} / {max}
      </div>
    </div>
  );
}

/*
 * SkillGroupsEditor — manages the `skillGroups` field array. Each group is
 * a card with a name input, optional description (with live counter), and a
 * nested SkillsEditor for the group's skill chips.
 *
 * Groups are entirely optional — users can also just use the flat `skills`
 * field above. If they use neither, the public page shows nothing for the
 * skills section. If they use both, templates may choose which to render
 * (or merge them) per their own design language.
 */
function SkillGroupsEditor({
  control,
  register,
  watch,
}: {
  control: Control<ProfileFormInput>;
  register: UseFormReturn<ProfileFormInput>["register"];
  watch: UseFormReturn<ProfileFormInput>["watch"];
}) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: "skillGroups",
  });

  return (
    <div className="space-y-3">
      {fields.length === 0 && (
        <p className="text-xs text-muted-foreground">
          No skill groups yet. Use these to organize skills by area (Backend,
          DevOps, etc.).
        </p>
      )}
      <ul className="space-y-4">
        {fields.map((field, i) => {
          const descValue = watch(`skillGroups.${i}.description`) ?? "";
          return (
            <li
              key={field.id}
              className="space-y-2 rounded-md border bg-card p-3"
            >
              <input
                {...register(`skillGroups.${i}.name`)}
                className="input"
                placeholder="Group name (e.g. Backend)"
              />
              <TextareaWithCounter
                value={descValue}
                rows={2}
                placeholder="Optional — what this group is about"
                fieldProps={register(`skillGroups.${i}.description`)}
              />
              <Controller
                name={`skillGroups.${i}.skills`}
                control={control}
                render={({ field: f }) => (
                  <SkillsEditor
                    value={f.value ?? []}
                    onChange={f.onChange}
                  />
                )}
              />
              <button
                type="button"
                onClick={() => remove(i)}
                className="text-xs text-muted-foreground hover:text-destructive"
              >
                Remove group
              </button>
            </li>
          );
        })}
      </ul>
      <button
        type="button"
        onClick={() =>
          append({
            id: crypto.randomUUID(),
            name: "",
            description: "",
            skills: [],
          })
        }
        className="btn-secondary"
      >
        + Add skill group
      </button>
    </div>
  );
}

/*
 * CustomSocialsEditor — list of label + URL pairs for social platforms
 * beyond the built-in 5 (LinkedIn, Twitter, website, email, GitHub).
 * Mastodon, Bluesky, ORCID, Polywork, Threads, etc.
 */
function CustomSocialsEditor({
  control,
  register,
}: {
  control: Control<ProfileFormInput>;
  register: UseFormReturn<ProfileFormInput>["register"];
}) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: "customSocials",
  });

  return (
    <div className="space-y-3">
      {fields.length === 0 && (
        <p className="text-xs text-muted-foreground">
          Add Mastodon, Bluesky, ORCID, or any other platform.
        </p>
      )}
      <ul className="space-y-3">
        {fields.map((field, i) => (
          <li
            key={field.id}
            className="grid grid-cols-[1fr_2fr_auto] gap-2 sm:gap-3"
          >
            <input
              {...register(`customSocials.${i}.label`)}
              className="input"
              placeholder="Platform (e.g. Mastodon)"
            />
            <input
              {...register(`customSocials.${i}.url`)}
              className="input"
              placeholder="https://…"
            />
            <button
              type="button"
              onClick={() => remove(i)}
              className="text-sm text-muted-foreground hover:text-destructive"
            >
              Remove
            </button>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={() =>
          append({ id: crypto.randomUUID(), label: "", url: "" })
        }
        className="btn-secondary"
      >
        + Add social link
      </button>
    </div>
  );
}

function SkillsEditor({
  value,
  onChange,
}: {
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const [draft, setDraft] = useState("");

  const addSkill = (raw: string) => {
    const skill = raw.trim().replace(/,$/, "").trim();
    if (!skill) return;
    if (value.some((s) => s.toLowerCase() === skill.toLowerCase())) {
      setDraft("");
      return;
    }
    onChange([...value, skill]);
    setDraft("");
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {value.map((skill) => (
          <span
            key={skill}
            className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-sm"
          >
            {skill}
            <button
              type="button"
              onClick={() => onChange(value.filter((s) => s !== skill))}
              className="text-muted-foreground hover:text-destructive"
              aria-label={`Remove ${skill}`}
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <input
        value={draft}
        onChange={(e) => {
          // A comma typed mid-string commits the skill before it.
          if (e.target.value.includes(",")) {
            addSkill(e.target.value);
          } else {
            setDraft(e.target.value);
          }
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            addSkill(draft);
          } else if (e.key === "Backspace" && !draft && value.length > 0) {
            // Backspace on an empty input removes the last chip
            onChange(value.slice(0, -1));
          }
        }}
        onBlur={() => draft.trim() && addSkill(draft)}
        className="input"
        placeholder="Type a skill, press Enter"
      />
    </div>
  );
}

/**
 * PickerGrid — radio-card grid for layout / theme selection.
 *
 * Cards rather than `<select>` because choosing a layout or theme is a
 * visual decision. A dropdown hides options behind one click; cards make
 * the comparison cheap.
 *
 * Disabled options stay visible (greyed) so the user sees the roadmap
 * without being able to pick something not yet shipped.
 */
interface PickerOption {
  value: string;
  label: string;
  desc: string;
  disabled?: boolean;
}

function PickerGrid({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: PickerOption[];
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {options.map((opt) => {
        const selected = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            disabled={opt.disabled}
            // Browser autofill stamps fdprocessedid on these buttons too;
            // suppress the noisy false-positive hydration warning.
            suppressHydrationWarning
            onClick={() => !opt.disabled && onChange(opt.value)}
            className={
              "flex flex-col items-start gap-0.5 rounded-md border p-3 text-left transition-colors " +
              (opt.disabled
                ? "cursor-not-allowed border-border bg-muted/30 opacity-50"
                : selected
                  ? "border-primary bg-primary/5 ring-2 ring-primary"
                  : "border-input bg-background hover:bg-accent")
            }
          >
            <span className="text-sm font-medium">{opt.label}</span>
            <span className="text-xs text-muted-foreground">{opt.desc}</span>
          </button>
        );
      })}
    </div>
  );
}

/**
 * Render the small inline status under a handle field.
 * One per platform — the only thing that varies is what we show in the
 * "ok" preview snippet.
 */
function renderGithubHint(
  status: HandleStatus<{ name: string | null; publicRepos: number }>,
  value: string,
): React.ReactNode {
  if (!value.trim()) {
    return <span className="text-muted-foreground">Just the username, not the URL.</span>;
  }
  switch (status.state) {
    case "checking":
      return <span className="text-muted-foreground">Checking…</span>;
    case "ok":
      return (
        <span className="text-emerald-600 dark:text-emerald-400">
          ✓ Found
          {status.preview.name ? ` — ${status.preview.name}` : ""}
          {` · ${status.preview.publicRepos} public repos`}
        </span>
      );
    case "not_found":
      return <span className="text-destructive">No GitHub user with that name</span>;
    case "invalid":
      return <span className="text-destructive">Doesn&apos;t look like a valid GitHub username</span>;
    case "error":
      return (
        <span className="text-muted-foreground">
          Couldn&apos;t check right now — try saving anyway.
        </span>
      );
    case "idle":
    default:
      return null;
  }
}

function renderLeetCodeHint(
  status: HandleStatus<{ username: string; totalSolved: number }>,
  value: string,
): React.ReactNode {
  if (!value.trim()) return null;
  switch (status.state) {
    case "checking":
      return <span className="text-muted-foreground">Checking…</span>;
    case "ok":
      return (
        <span className="text-emerald-600 dark:text-emerald-400">
          ✓ Found · {status.preview.totalSolved} problems solved
        </span>
      );
    case "not_found":
      return <span className="text-destructive">No LeetCode user with that name</span>;
    case "invalid":
      return <span className="text-destructive">Doesn&apos;t look like a valid LeetCode username</span>;
    case "error":
      return (
        <span className="text-muted-foreground">
          Couldn&apos;t check right now — try saving anyway.
        </span>
      );
    default:
      return null;
  }
}

function renderCodeforcesHint(
  status: HandleStatus<{
    handle: string;
    rating: number | null;
    rank: string | null;
  }>,
  value: string,
): React.ReactNode {
  if (!value.trim()) return null;
  switch (status.state) {
    case "checking":
      return <span className="text-muted-foreground">Checking…</span>;
    case "ok": {
      const { rating, rank } = status.preview;
      return (
        <span className="text-emerald-600 dark:text-emerald-400">
          ✓ Found
          {rating != null ? ` · rating ${rating}` : ""}
          {rank ? ` (${rank})` : ""}
        </span>
      );
    }
    case "not_found":
      return <span className="text-destructive">No Codeforces user with that handle</span>;
    case "invalid":
      return <span className="text-destructive">Doesn&apos;t look like a valid Codeforces handle</span>;
    case "error":
      return (
        <span className="text-muted-foreground">
          Couldn&apos;t check right now — try saving anyway.
        </span>
      );
    default:
      return null;
  }
}

function renderDevToHint(
  status: HandleStatus<{ username: string; articleCount: number }>,
  value: string,
): React.ReactNode {
  if (!value.trim()) return null;
  switch (status.state) {
    case "checking":
      return <span className="text-muted-foreground">Checking…</span>;
    case "ok": {
      const { articleCount } = status.preview;
      return (
        <span className="text-emerald-600 dark:text-emerald-400">
          ✓ Found{articleCount > 0 ? ` · ${articleCount} articles` : ""}
        </span>
      );
    }
    case "not_found":
      return (
        <span className="text-destructive">
          No Dev.to user with that username
        </span>
      );
    case "invalid":
      return (
        <span className="text-destructive">
          Doesn&apos;t look like a valid Dev.to username
        </span>
      );
    case "error":
      return (
        <span className="text-muted-foreground">
          Couldn&apos;t check right now — try saving anyway.
        </span>
      );
    default:
      return null;
  }
}

function renderHuggingFaceHint(
  status: HandleStatus<{
    username: string;
    totalModels: number;
    totalDatasets: number;
    totalSpaces: number;
  }>,
  value: string,
): React.ReactNode {
  if (!value.trim()) return null;
  switch (status.state) {
    case "checking":
      return <span className="text-muted-foreground">Checking…</span>;
    case "ok": {
      const { totalModels, totalDatasets, totalSpaces } = status.preview;
      const parts: string[] = [];
      if (totalModels > 0) parts.push(`${totalModels} models`);
      if (totalDatasets > 0) parts.push(`${totalDatasets} datasets`);
      if (totalSpaces > 0) parts.push(`${totalSpaces} spaces`);
      return (
        <span className="text-emerald-600 dark:text-emerald-400">
          ✓ Found{parts.length > 0 ? ` · ${parts.join(" · ")}` : ""}
        </span>
      );
    }
    case "not_found":
      return (
        <span className="text-destructive">
          No Hugging Face user with that username
        </span>
      );
    case "invalid":
      return (
        <span className="text-destructive">
          Doesn&apos;t look like a valid Hugging Face username
        </span>
      );
    case "error":
      return (
        <span className="text-muted-foreground">
          Couldn&apos;t check right now — try saving anyway.
        </span>
      );
    default:
      return null;
  }
}