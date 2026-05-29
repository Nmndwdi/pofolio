"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { SignUpSchema, type SignUpInput } from "@/lib/validators/auth";
import { useSlugAvailability } from "@/hooks/useSlugAvailability";
import { slugify, cn } from "@/lib/utils";

export default function SignUpPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  // Track whether the user has manually edited the slug. If they have, we
  // stop auto-syncing it from their name — so typing more in "name" doesn't
  // wipe their slug choice.
  const [slugTouched, setSlugTouched] = useState(false);

  const {
    register,
    handleSubmit,
    setError,
    setValue,
    watch,
    formState: { errors },
  } = useForm<SignUpInput>({
    resolver: zodResolver(SignUpSchema),
    defaultValues: { name: "", email: "", password: "", slug: "" },
  });

  const nameValue = watch("name");
  const slugValue = watch("slug");

  // Auto-suggest slug from name UNTIL the user manually edits the slug field.
  useEffect(() => {
    if (slugTouched) return;
    const suggested = slugify(nameValue);
    if (suggested) setValue("slug", suggested, { shouldValidate: false });
  }, [nameValue, slugTouched, setValue]);

  const slugStatus = useSlugAvailability(slugValue);

  const onSubmit = async (data: SignUpInput) => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();

      if (!res.ok) {
        if (json.fieldErrors) {
          for (const [field, messages] of Object.entries(
            json.fieldErrors as Record<string, string[]>,
          )) {
            setError(field as keyof SignUpInput, { message: messages[0] });
          }
        } else {
          toast.error(json.error ?? "Something went wrong");
        }
        return;
      }

      router.push(
        `/verify-email?email=${encodeURIComponent(data.email)}&sent=1`,
      );
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1.5 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          Create your account
        </h1>
        <p className="text-sm text-muted-foreground">
          Pick your name and your URL. You can change them later.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Field label="Name" error={errors.name?.message}>
          <input
            {...register("name")}
            type="text"
            autoComplete="name"
            className="input"
            placeholder="Naman Dwivedi"
          />
        </Field>

        <SlugField
          register={register("slug", {
            onChange: () => setSlugTouched(true),
          })}
          status={slugStatus}
          error={errors.slug?.message}
          value={slugValue}
        />

        <Field label="Email" error={errors.email?.message}>
          <input
            {...register("email")}
            type="email"
            autoComplete="email"
            className="input"
            placeholder="you@example.com"
          />
        </Field>

        <Field
          label="Password"
          error={errors.password?.message}
          hint="At least 8 characters, with a letter and a number"
        >
          <input
            {...register("password")}
            type="password"
            autoComplete="new-password"
            className="input"
          />
        </Field>

        <button
          type="submit"
          disabled={
            submitting ||
            // Block submit while the slug check is mid-flight or known-bad.
            slugStatus.state === "checking" ||
            slugStatus.state === "taken" ||
            slugStatus.state === "reserved" ||
            slugStatus.state === "invalid"
          }
          className="btn-primary w-full"
        >
          {submitting ? "Creating account…" : "Create account"}
        </button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/signin" className="font-medium text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}

/* ─── Slug input with live availability feedback ─────────────────────────── */

import type { UseFormRegisterReturn } from "react-hook-form";
import type { SlugStatus } from "@/hooks/useSlugAvailability";

function SlugField({
  register,
  status,
  error,
  value,
}: {
  register: UseFormRegisterReturn;
  status: SlugStatus;
  error?: string;
  value: string;
}) {
  // Only show status hint once the user has typed something.
  // The form-level Zod error takes precedence over server status.
  const showStatus = !error && value.trim().length > 0;

  let hint: React.ReactNode = (
    <span className="text-muted-foreground">
      Your URL: pofolio.live/p/<strong>{value || "yourname"}</strong>
    </span>
  );

  if (showStatus) {
    switch (status.state) {
      case "checking":
        hint = <span className="text-muted-foreground">Checking…</span>;
        break;
      case "ok":
        hint = (
          <span className="text-emerald-600 dark:text-emerald-400">
            ✓ Available
          </span>
        );
        break;
      case "taken":
        hint = (
          <span className="text-destructive">
            Already taken — try another
          </span>
        );
        break;
      case "reserved":
        hint = <span className="text-destructive">This name is reserved</span>;
        break;
      case "invalid":
        hint = <span className="text-destructive">{status.reason}</span>;
        break;
      case "yours":
      case "idle":
      case "error":
        // For these states keep the URL preview hint
        break;
    }
  }

  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium">Your URL</span>
      <div className="flex items-stretch overflow-hidden rounded-md border border-input bg-background ring-offset-background focus-within:ring-2 focus-within:ring-ring">
        <span className="flex items-center bg-muted px-3 text-sm text-muted-foreground">
          pofolio.live/p/
        </span>
        <input
          {...register}
          type="text"
          autoComplete="off"
          className="flex-1 bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground"
          placeholder="yourname"
        />
      </div>
      <span className={cn("block text-xs")}>{hint}</span>
      {error && <span className="block text-xs text-destructive">{error}</span>}
    </label>
  );
}

/* ─── Generic field helper ───────────────────────────────────────────────── */

function Field({
  label,
  error,
  hint,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium">{label}</span>
      {children}
      {hint && !error && (
        <span className="block text-xs text-muted-foreground">{hint}</span>
      )}
      {error && <span className="block text-xs text-destructive">{error}</span>}
    </label>
  );
}
