"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useSlugAvailability } from "@/hooks/useSlugAvailability";
import { cn } from "@/lib/utils";

/*
 * Slug rename form. Three states matter:
 *   - User typed nothing yet → input has current slug, button disabled
 *   - User typed something same as current → button still disabled (no-op)
 *   - User typed an available new slug → button enabled
 *
 * After successful rename we router.refresh() to update the layout
 * (header email block doesn't change but server components elsewhere
 * read the slug from session, which gets refreshed via NextAuth's update
 * trigger — but we don't need it here, just refresh the page).
 */
export default function SlugForm({ currentSlug }: { currentSlug: string }) {
  const router = useRouter();
  const [slug, setSlug] = useState(currentSlug);
  const [submitting, setSubmitting] = useState(false);

  const status = useSlugAvailability(slug);
  const trimmed = slug.trim().toLowerCase();
  const isUnchanged = trimmed === currentSlug;

  const canSave =
    !submitting &&
    !isUnchanged &&
    (status.state === "ok" || status.state === "yours");

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/profile/slug", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: trimmed }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "Couldn't save");
        return;
      }
      toast.success("URL updated");
      // The current page's URL doesn't depend on the slug, but the layout
      // and dashboard links do — refresh re-runs the server components
      // and pulls the new slug everywhere it's rendered.
      router.refresh();
    } catch {
      toast.error("Network error");
    } finally {
      setSubmitting(false);
    }
  };

  // Hint message under the input — same patterns as signup, but the "yours"
  // state means "this is your current slug; nothing to change."
  let hint: React.ReactNode = (
    <span className="text-muted-foreground">
      Your URL: pofolio.live/p/<strong>{trimmed || "yourname"}</strong>
    </span>
  );
  if (trimmed.length > 0) {
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
      case "yours":
        hint = (
          <span className="text-muted-foreground">This is your current URL.</span>
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
        hint = <span className="text-destructive">Reserved name</span>;
        break;
      case "invalid":
        hint = <span className="text-destructive">{status.reason}</span>;
        break;
      case "error":
      case "idle":
        break;
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <label className="block space-y-1.5">
        <span className="text-sm font-medium">Your URL</span>
        <div className={cn(
          "flex items-stretch overflow-hidden rounded-md border border-input bg-background ring-offset-background focus-within:ring-2 focus-within:ring-ring",
        )}>
          <span className="flex items-center bg-muted px-3 text-sm text-muted-foreground">
            pofolio.live/p/
          </span>
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            autoComplete="off"
            className="flex-1 bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
        <span className="block text-xs">{hint}</span>
      </label>

      <button type="submit" disabled={!canSave} className="btn-primary">
        {submitting ? "Saving…" : "Save URL"}
      </button>
    </form>
  );
}
