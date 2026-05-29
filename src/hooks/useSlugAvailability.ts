"use client";

import { useEffect, useState } from "react";

export type SlugStatus =
  | { state: "idle" }
  | { state: "checking" }
  | { state: "ok" }
  | { state: "yours" }
  | { state: "invalid"; reason: string }
  | { state: "reserved" }
  | { state: "taken" }
  | { state: "error" };

/*
 * Debounced slug availability check.
 *
 * Pass the current input value; get back a status. The hook handles:
 *   - 350ms debounce (don't hit API on every keystroke)
 *   - Aborting in-flight requests when the input changes
 *   - Empty input → idle
 *   - Network errors → state: "error" (UI shows generic warning, doesn't block)
 *
 * The 350ms is calibrated for typing speed: fast enough to feel responsive
 * when the user pauses, slow enough that "naman-dwivedi" doesn't fire 14
 * separate API calls.
 */
export function useSlugAvailability(slug: string): SlugStatus {
  const [status, setStatus] = useState<SlugStatus>({ state: "idle" });

  useEffect(() => {
    const trimmed = slug.trim();
    if (!trimmed) {
      setStatus({ state: "idle" });
      return;
    }

    setStatus({ state: "checking" });

    const ctrl = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/profile/slug-available?slug=${encodeURIComponent(trimmed)}`,
          { signal: ctrl.signal },
        );
        if (!res.ok) {
          setStatus({ state: "error" });
          return;
        }
        const json = (await res.json()) as
          | { status: "ok" | "yours" | "reserved" | "taken" }
          | { status: "invalid"; reason: string };

        switch (json.status) {
          case "ok":
            setStatus({ state: "ok" });
            break;
          case "yours":
            setStatus({ state: "yours" });
            break;
          case "reserved":
            setStatus({ state: "reserved" });
            break;
          case "taken":
            setStatus({ state: "taken" });
            break;
          case "invalid":
            setStatus({ state: "invalid", reason: json.reason });
            break;
        }
      } catch (err) {
        // Aborted requests are expected — don't surface them as errors
        if (err instanceof Error && err.name === "AbortError") return;
        setStatus({ state: "error" });
      }
    }, 350);

    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [slug]);

  return status;
}
