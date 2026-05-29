"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  ChangePasswordSchema,
  type ChangePasswordInput,
} from "@/lib/validators/auth";

export default function ChangePasswordForm() {
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors },
  } = useForm<ChangePasswordInput>({
    resolver: zodResolver(ChangePasswordSchema),
  });

  const onSubmit = async (data: ChangePasswordInput) => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/account/change-password", {
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
            setError(field as keyof ChangePasswordInput, {
              message: messages[0],
            });
          }
        } else {
          // "Current password is incorrect" → attach to the right field
          // so the error appears under the relevant input.
          if (
            typeof json.error === "string" &&
            /current password/i.test(json.error)
          ) {
            setError("currentPassword", { message: json.error });
          } else {
            toast.error(json.error ?? "Couldn't update password");
          }
        }
        return;
      }
      toast.success("Password updated");
      reset();
    } catch {
      toast.error("Network error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-md space-y-4">
      <Field label="Current password" error={errors.currentPassword?.message}>
        <input
          {...register("currentPassword")}
          type="password"
          autoComplete="current-password"
          className="input"
        />
      </Field>
      <Field
        label="New password"
        error={errors.newPassword?.message}
        hint="At least 8 characters, with a letter and a number"
      >
        <input
          {...register("newPassword")}
          type="password"
          autoComplete="new-password"
          className="input"
        />
      </Field>
      <Field label="Confirm new password" error={errors.confirmPassword?.message}>
        <input
          {...register("confirmPassword")}
          type="password"
          autoComplete="new-password"
          className="input"
        />
      </Field>
      <button type="submit" disabled={submitting} className="btn-primary">
        {submitting ? "Updating…" : "Update password"}
      </button>
    </form>
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
