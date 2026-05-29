"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";

/*
 * Three states this page can be in, all driven by query params:
 *
 *   ?email=foo@bar.com&sent=1    → just signed up; "check your inbox"
 *   ?error=expired               → user clicked an expired link
 *   ?error=invalid               → user clicked a bad/used link
 *   ?email=foo@bar.com           → tried to sign in unverified
 *   (no params)                  → fallback: ask for email to resend
 *
 * The resend button is throttled by the API (1/min per account), so we
 * don't add client-side throttling — just disable while in flight and let
 * the server enforce the real limit.
 */

export default function VerifyEmailClient() {
  const params = useSearchParams();
  const email = params.get("email");
  const error = params.get("error");
  const justSent = params.get("sent") === "1";

  const [resending, setResending] = useState(false);
  const [resentEmail, setResentEmail] = useState<string | null>(null);
  const [emailInput, setEmailInput] = useState("");

  const targetEmail = email ?? emailInput;

  const handleResend = async () => {
    if (!targetEmail) {
      toast.error("Please enter your email");
      return;
    }
    setResending(true);
    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: targetEmail }),
      });
      if (!res.ok) {
        toast.error("Couldn't send. Please try again.");
        return;
      }
      setResentEmail(targetEmail);
      toast.success("If your account is unverified, we've sent a new link.");
    } catch {
      toast.error("Network error");
    } finally {
      setResending(false);
    }
  };

  // ─── Header content depends on state ───────────────────────────────────────
  let heading: string;
  let subtext: React.ReactNode;
  if (error === "expired") {
    heading = "Link expired";
    subtext = "Verification links are valid for 24 hours. Request a new one below.";
  } else if (error === "invalid") {
    heading = "Invalid link";
    subtext =
      "This link doesn't look right — it may have already been used. Request a new one below.";
  } else if (justSent) {
    heading = "Check your email";
    subtext = (
      <>
        We sent a verification link to <strong>{email}</strong>. Click it to
        finish setting up your account.
      </>
    );
  } else if (email) {
    heading = "Verify your email";
    subtext = (
      <>
        Your account at <strong>{email}</strong> needs verification before you
        can sign in. Check your inbox, or request a new link below.
      </>
    );
  } else {
    heading = "Resend verification email";
    subtext = "Enter the email you signed up with and we'll send a new link.";
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1.5 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">{heading}</h1>
        <p className="text-sm text-muted-foreground">{subtext}</p>
      </div>

      {!email && (
        <label className="block space-y-1.5">
          <span className="text-sm font-medium">Email</span>
          <input
            type="email"
            value={emailInput}
            onChange={(e) => setEmailInput(e.target.value)}
            autoComplete="email"
            className="input"
            placeholder="you@example.com"
          />
        </label>
      )}

      <button
        type="button"
        onClick={handleResend}
        disabled={resending || (!email && !emailInput)}
        className="btn-primary w-full"
      >
        {resending
          ? "Sending…"
          : resentEmail
            ? "Sent! Check your inbox"
            : justSent
              ? "Resend link"
              : "Send verification link"}
      </button>

      <p className="text-center text-sm text-muted-foreground">
        Already verified?{" "}
        <Link href="/signin" className="font-medium text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
