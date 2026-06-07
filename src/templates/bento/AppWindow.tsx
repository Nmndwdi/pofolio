"use client";

import { useEffect, useRef, type ReactNode } from "react";
import styles from "./bento.module.css";

/*
 * AppWindow — modal "window" shell that frames an opened app.
 *
 * Behavior mirrors a macOS window:
 *   - Title bar at top with three traffic-light buttons (close / minimize /
 *     maximize). For this v1 only close is wired; minimize and maximize are
 *     visual-only — they belong to the metaphor but the underlying state
 *     model (one app at a time, no z-stack) doesn't need them yet.
 *   - Backdrop click closes the window. So does the red traffic light, the
 *     Escape key, and the global menubar's Index button.
 *   - Content scrolls inside the window body. Window itself doesn't grow.
 *
 * The window is rendered in a portal-less but z-indexed overlay (.windowBackdrop)
 * positioned over the desktop. No focus trap or aria role="dialog" because
 * the rest of the page (dock) IS still interactive — clicking another app
 * swaps windows, which is intentional. Treating this as a true dialog
 * would steal focus and break that flow.
 */

interface AppWindowProps {
  /** Title shown centered in the title bar. */
  title: string;
  /** Called when the window should close. */
  onClose: () => void;
  /** App content rendered inside the scrollable body. */
  children: ReactNode;
}

export function AppWindow({ title, onClose, children }: AppWindowProps) {
  // Capture Escape globally while window is open. Tied to the onClose
  // prop so a parent that reuses AppWindow for multiple apps gets the
  // right close behavior each time.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // When a window opens, scroll the body to the top — feels weird if you
  // open Projects, close, then open Skills and it's mid-scroll.
  const bodyRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = 0;
  }, [title]);

  return (
    <div
      className={styles.windowBackdrop}
      onClick={(e) => {
        // Only close if the backdrop itself was clicked, not bubbled-up
        // events from within the window.
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={styles.window}>
        <div className={styles.titleBar}>
          <div className={styles.trafficLights}>
            <button
              type="button"
              className={`${styles.trafficLight} ${styles.close}`}
              aria-label="Close"
              onClick={onClose}
            />
            <button
              type="button"
              className={`${styles.trafficLight} ${styles.minimize}`}
              aria-label="Minimize"
              onClick={onClose}
            />
            <button
              type="button"
              className={`${styles.trafficLight} ${styles.maximize}`}
              aria-label="Maximize"
              onClick={onClose}
            />
          </div>
          <div className={styles.titleBarTitle}>{title}</div>
        </div>
        <div className={styles.windowBody} ref={bodyRef} data-bento-window-body="true">
          {children}
        </div>
      </div>
    </div>
  );
}