"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  ForgotPasswordSchema,
  type ForgotPasswordInput,
} from "@/lib/validators/auth";

export default function ForgotPasswordPage() {
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(ForgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordInput) => {
    setSubmitting(true);
    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    setSubmitting(false);
    if (!res.ok) {
      toast.error("Something went wrong. Please try again.");
      return;
    }
    setDone(true);
  };

  if (done) {
    return (
      <div className="space-y-4 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Check your email</h1>
        <p className="text-sm text-muted-foreground">
          If an account exists with that email, we&apos;ve sent a link to reset
          your password. The link expires in 1 hour.
        </p>
        <p className="text-sm text-muted-foreground">
          Didn&apos;t get an email? Check spam, or{" "}
          <Link href="/signup" className="font-medium text-primary hover:underline">
            create an account
          </Link>
          {" "}if you don&apos;t have one.
        </p>
        <Link
          href="/signin"
          className="inline-block text-sm font-medium text-primary hover:underline"
        >
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1.5 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Forgot password?</h1>
        <p className="text-sm text-muted-foreground">
          Enter your email and we&apos;ll send you a reset link.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <label className="block space-y-1.5">
          <span className="text-sm font-medium">Email</span>
          <input
            {...register("email")}
            type="email"
            autoComplete="email"
            className="input"
            placeholder="you@example.com"
          />
          {errors.email?.message && (
            <span className="block text-xs text-destructive">
              {errors.email.message}
            </span>
          )}
        </label>

        <button type="submit" disabled={submitting} className="btn-primary w-full">
          {submitting ? "Sending…" : "Send reset link"}
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
