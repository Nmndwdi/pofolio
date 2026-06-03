"use client";

import { useEffect, useState } from "react";

/*
 * Generic debounced handle-check hook used by the editor for GitHub, Codeforces,
 * and LeetCode. Each platform's /check endpoint returns the same status shape
 * (ok / invalid / not_found / error) plus a small platform-specific preview
 * payload. We keep the preview as a generic object here so the renderer can
 * pick out whatever fields make sense to show.
 *
 * 500ms debounce — same as before. Aborts in-flight requests on input change
 * so a fast typer doesn't waste upstream API quota on stale checks.
 */

export type HandleStatus<P = Record<string, unknown>> =
  | { state: "idle" }
  | { state: "checking" }
  | { state: "ok"; preview: P }
  | { state: "invalid" }
  | { state: "not_found" }
  | { state: "error" };

interface Options {
  /** API URL (without query string). e.g. "/api/integrations/github/check" */
  endpoint: string;
  /** Query param name. e.g. "username" or "handle" */
  paramName: string;
}

export function useHandleCheck<P = Record<string, unknown>>(
  value: string,
  { endpoint, paramName }: Options,
): HandleStatus<P> {
  const [status, setStatus] = useState<HandleStatus<P>>({ state: "idle" });

  useEffect(() => {
    const trimmed = value.trim();
    if (!trimmed) {
      setStatus({ state: "idle" });
      return;
    }

    setStatus({ state: "checking" });
    const ctrl = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const url = `${endpoint}?${paramName}=${encodeURIComponent(trimmed)}`;
        const res = await fetch(url, { signal: ctrl.signal });
        if (!res.ok) {
          setStatus({ state: "error" });
          return;
        }
        // The check endpoints have evolved over time and use slightly
        // different field names for the "ok" payload:
        //   - github  → `user`
        //   - codeforces → `user`
        //   - leetcode → `user`
        //   - devto + huggingface (newer) → `preview`
        // Rather than migrate every endpoint, we accept whichever is present
        // — `preview` takes priority since it's the convention going forward.
        const json = (await res.json()) as {
          status: "ok" | "invalid" | "not_found";
          preview?: P;
          user?: P;
        };

        switch (json.status) {
          case "ok": {
            const payload = json.preview ?? json.user;
            if (!payload) {
              // Endpoint returned status:ok but no payload field we recognise
              // — treat as error rather than crash the renderer.
              setStatus({ state: "error" });
              break;
            }
            setStatus({ state: "ok", preview: payload });
            break;
          }
          case "invalid":
            setStatus({ state: "invalid" });
            break;
          case "not_found":
            setStatus({ state: "not_found" });
            break;
        }
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;
        setStatus({ state: "error" });
      }
    }, 500);

    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [value, endpoint, paramName]);

  return status;
}