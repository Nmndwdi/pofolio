"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

/*
 * The Zod schema in /lib/validators/auth.ts (`ResetPasswordSchema`) requires
 * a `token` field, but in this UI the token comes from the URL — not the form.
 * We use a smaller form-only schema here, then attach the token at submit time.
 */
const FormSchema = z.object({
  password: z
    .string()
    .min(8, "At least 8 characters")
    .max(72, "At most 72 characters")
    .regex(/[a-zA-Z]/, "Must contain a letter")
    .regex(/\d/, "Must contain a number"),
  confirm: z.string(),
}).refine((v) => v.password === v.confirm, {
  path: ["confirm"],
  message: "Passwords do not match",
});

type FormInput = z.infer<typeof FormSchema>;

export default function ResetPasswordPage() {
  const router = useRouter();
  const params = useParams<{ token: string }>();
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormInput>({ resolver: zodResolver(FormSchema) });

  const onSubmit = async (data: FormInput) => {
    setSubmitting(true);
    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: params.token, password: data.password }),
    });
    setSubmitting(false);

    const json = await res.json();
    if (!res.ok) {
      toast.error(json.error ?? "Reset failed");
      return;
    }
    toast.success("Password updated. Please sign in.");
    router.push("/signin");
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1.5 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          Choose a new password
        </h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <label className="block space-y-1.5">
          <span className="text-sm font-medium">New password</span>
          <input
            {...register("password")}
            type="password"
            autoComplete="new-password"
            className="input"
          />
          {errors.password?.message && (
            <span className="block text-xs text-destructive">
              {errors.password.message}
            </span>
          )}
        </label>

        <label className="block space-y-1.5">
          <span className="text-sm font-medium">Confirm password</span>
          <input
            {...register("confirm")}
            type="password"
            autoComplete="new-password"
            className="input"
          />
          {errors.confirm?.message && (
            <span className="block text-xs text-destructive">
              {errors.confirm.message}
            </span>
          )}
        </label>

        <button type="submit" disabled={submitting} className="btn-primary w-full">
          {submitting ? "Saving…" : "Update password"}
        </button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        <Link href="/signin" className="font-medium hover:underline">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
