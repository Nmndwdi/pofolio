"use client";

import { useEffect, useRef, useState } from "react";
import type { UseFormWatch, UseFormReset } from "react-hook-form";
import type { ProfileFormInput } from "@/lib/validators/profile-form";

/*
 * Editor draft persistence.
 *
 * Problem this solves: a user edits their portfolio, doesn't save, and the
 * tab reloads / crashes / is closed. Without this, their unsaved work is
 * gone. With it, the draft is held in localStorage and offered back.
 *
 * Design:
 *   - We watch the whole form and write a debounced snapshot to localStorage
 *     keyed by slug (so two different profiles don't collide).
 *   - On mount, if a stored draft exists AND differs from the server data the
 *     form was initialized with, we flag `hasDraft` so the UI can offer
 *     "restore". We do NOT auto-apply it — silently overwriting what the
 *     server returned would be surprising. The user chooses.
 *   - On successful save, the caller invokes `clearDraft()`.
 *
 * Why localStorage and not the persistent artifact store: this is the real
 * Next.js app, not a Claude artifact. localStorage is the right tool and
 * works in every browser. (The artifact-storage restriction in some contexts
 * doesn't apply here — this is a normal web app.)
 *
 * Note: localStorage is unavailable during SSR. All access is guarded and
 * happens in effects / event handlers, never during render.
 */

const DRAFT_PREFIX = "pofolio:editor-draft:";
const DEBOUNCE_MS = 800;

function draftKey(slug: string): string {
  return `${DRAFT_PREFIX}${slug}`;
}

interface UseEditorDraftArgs {
  slug: string;
  watch: UseFormWatch<ProfileFormInput>;
  reset: UseFormReset<ProfileFormInput>;
  /** The server data the form was initialized with — used to detect a
   *  meaningfully different draft. */
  initial: ProfileFormInput;
  /** Whether the form is currently dirty; we only persist dirty state. */
  isDirty: boolean;
}

interface UseEditorDraftResult {
  /** True if a stored draft exists that differs from the server data. */
  hasDraft: boolean;
  /** Apply the stored draft to the form. */
  restoreDraft: () => void;
  /** Discard the stored draft (and hide the banner). */
  discardDraft: () => void;
  /** Clear the stored draft — call after a successful save. */
  clearDraft: () => void;
}

export function useEditorDraft({
  slug,
  watch,
  reset,
  initial,
  isDirty,
}: UseEditorDraftArgs): UseEditorDraftResult {
  const [hasDraft, setHasDraft] = useState(false);
  const storedDraftRef = useRef<ProfileFormInput | null>(null);
  const writeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const key = draftKey(slug);

  // On mount: check for an existing draft that differs from server data.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return;
      const parsed = JSON.parse(raw) as ProfileFormInput;
      // Only offer it if it actually differs from what the server gave us —
      // otherwise the "restore?" prompt would be noise.
      if (JSON.stringify(parsed) !== JSON.stringify(initial)) {
        storedDraftRef.current = parsed;
        setHasDraft(true);
      } else {
        // Draft matches server — stale, clean it up.
        localStorage.removeItem(key);
      }
    } catch {
      // Corrupt draft JSON — discard it silently.
      try {
        localStorage.removeItem(key);
      } catch {
        /* ignore */
      }
    }
    // Only run on mount (per slug).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  // Debounced write of the live form values whenever they change while dirty.
  useEffect(() => {
    const subscription = watch((values) => {
      if (!isDirty) return;
      // Debounce: clear and reset a timer on each change.
      if (writeTimer.current) clearTimeout(writeTimer.current);
      writeTimer.current = setTimeout(() => {
        try {
          localStorage.setItem(key, JSON.stringify(values));
        } catch {
          // localStorage full or disabled — non-fatal, draft just won't persist.
        }
      }, DEBOUNCE_MS);
    });
    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watch, isDirty, key]);

  const restoreDraft = () => {
    if (storedDraftRef.current) {
      reset(storedDraftRef.current, { keepDefaultValues: true });
      setHasDraft(false);
    }
  };

  const discardDraft = () => {
    try {
      localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
    storedDraftRef.current = null;
    setHasDraft(false);
  };

  const clearDraft = () => {
    try {
      localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
    storedDraftRef.current = null;
    setHasDraft(false);
  };

  return { hasDraft, restoreDraft, discardDraft, clearDraft };
}
