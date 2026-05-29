"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

/*
 * Delete-account UI.
 *
 * Two-stage:
 *   1. "Open" mode — user clicks "Delete my account", form expands to show
 *      a text input. This prevents accidental clicks.
 *   2. Confirmation — user types DELETE in the input. Submit only enabled
 *      when input matches exactly.
 *
 * After successful deletion the API clears the session cookie. We redirect
 * to "/" with a hard navigation (router.replace + reload) so any client-side
 * cached session state is cleared.
 */
export default function DeleteAccountForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const canDelete = confirmation === "DELETE" && !submitting;

  const onDelete = async () => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/account/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation: "DELETE" }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        toast.error(json.error ?? "Couldn't delete account");
        setSubmitting(false);
        return;
      }
      // Hard redirect — bypasses any cached client session state.
      window.location.href = "/";
    } catch {
      toast.error("Network error");
      setSubmitting(false);
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-10 items-center justify-center rounded-md border border-destructive bg-background px-4 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive hover:text-destructive-foreground"
      >
        Delete my account
      </button>
    );
  }

  return (
    <div className="space-y-3 border-t border-destructive/20 pt-4">
      <label className="block space-y-1.5">
        <span className="text-sm">
          Type <code className="rounded bg-muted px-1 py-0.5 font-mono">DELETE</code> to confirm:
        </span>
        <input
          value={confirmation}
          onChange={(e) => setConfirmation(e.target.value)}
          className="input max-w-xs"
          autoFocus
          autoComplete="off"
        />
      </label>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onDelete}
          disabled={!canDelete}
          className="inline-flex h-10 items-center justify-center rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground transition-colors hover:bg-destructive/90 disabled:pointer-events-none disabled:opacity-50"
        >
          {submitting ? "Deleting…" : "Permanently delete"}
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setConfirmation("");
          }}
          className="btn-secondary"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
