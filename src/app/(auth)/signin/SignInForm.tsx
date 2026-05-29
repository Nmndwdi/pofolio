"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "next-auth/react";
import { toast } from "sonner";
import { SignInSchema, type SignInInput } from "@/lib/validators/auth";

export default function SignInForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignInInput>({ resolver: zodResolver(SignInSchema) });

  // Show a success toast once when the user lands here from the verify endpoint.
  // useEffect with an empty dep array runs once on mount — perfect for one-shot
  // signals from query params.
  useEffect(() => {
    if (params.get("verified") === "1") {
      toast.success("Email verified! Sign in to continue.");
    }
  }, [params]);

  const onSubmit = async (data: SignInInput) => {
    setSubmitting(true);
    const res = await signIn("credentials", {
      email: data.email,
      password: data.password,
      redirect: false,
    });

    if (res?.error) {
      // NextAuth v5 doesn't surface custom error messages from authorize() —
      // we get a generic "CredentialsSignin" code regardless of whether
      // the password was wrong, the user doesn't exist, or the email isn't
      // verified. To distinguish the unverified case (so we can route to
      // /verify-email instead of showing "invalid creds"), we hit a small
      // status endpoint that ONLY reveals "unverified" when the password
      // is correct.
      try {
        const statusRes = await fetch("/api/auth/account-status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: data.email, password: data.password }),
        });
        const statusJson = (await statusRes.json()) as { status: string };
        if (statusJson.status === "unverified") {
          router.push(
            `/verify-email?email=${encodeURIComponent(data.email)}`,
          );
          return;
        }
      } catch {
        // status check failed — fall through to the generic error.
      }
      setSubmitting(false);
      toast.error("Invalid email or password");
      return;
    }

    setSubmitting(false);
    toast.success("Signed in");
    router.push(params.get("callbackUrl") ?? "/dashboard");
    router.refresh();
  };

  const oauthSignIn = (provider: "google" | "github") => {
    signIn(provider, { callbackUrl: "/dashboard" });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1.5 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
        <p className="text-sm text-muted-foreground">
          Sign in to manage your portfolio.
        </p>
      </div>

      <div className="space-y-2">
        <button
          type="button"
          onClick={() => oauthSignIn("google")}
          className="btn-secondary w-full"
        >
          Continue with Google
        </button>
        <button
          type="button"
          onClick={() => oauthSignIn("github")}
          className="btn-secondary w-full"
        >
          Continue with GitHub
        </button>
      </div>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">
            or with email
          </span>
        </div>
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

        <label className="block space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Password</span>
            <Link
              href="/forgot-password"
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Forgot password?
            </Link>
          </div>
          <input
            {...register("password")}
            type="password"
            autoComplete="current-password"
            className="input"
          />
          {errors.password?.message && (
            <span className="block text-xs text-destructive">
              {errors.password.message}
            </span>
          )}
        </label>

        <button
          type="submit"
          disabled={submitting}
          className="btn-primary w-full"
        >
          {submitting ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="font-medium text-primary hover:underline">
          Sign up
        </Link>
      </p>
    </div>
  );
}
