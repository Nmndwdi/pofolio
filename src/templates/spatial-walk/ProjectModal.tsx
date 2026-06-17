"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { LayoutData } from "@/components/layouts/types";
import { deriveUrl } from "@/lib/cloudinary-url";
import styles from "./spatial-walk.module.css";

/*
 * ProjectModal — full-screen overlay with the full project detail.
 *
 * Portal-mounted to document.body so it escapes the .scene's 3D transform
 * context (otherwise the modal would inherit the camera's translateZ and
 * appear at a weird depth). Same pattern as Press/Brutalist project modals.
 *
 * Per the lesson learned in those builds: all colors are hardcoded in
 * spatial-walk.module.css for the .modalShell + children classes — CSS
 * vars defined on .root don't reach across the portal boundary.
 *
 * Interaction:
 *   - ESC to close
 *   - Backdrop click closes (clicks inside content do not bubble)
 *   - Body scroll locked while open
 *   - SSR-safe mount gate so portal only attempts to mount client-side
 */

interface Props {
  project: LayoutData["projects"][number] | null;
  onClose: () => void;
}

export function ProjectModal({ project, onClose }: Props) {
  // SSR mount gate. Without this, createPortal(document.body) would crash
  // during server render (document is undefined).
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // ESC to close + scroll lock. Runs only when there's an open project.
  useEffect(() => {
    if (!project) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);

    const prevBody = document.body.style.overflow;
    const prevHtml = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevBody;
      document.documentElement.style.overflow = prevHtml;
    };
  }, [project, onClose]);

  if (!mounted || !project) return null;

  const hero = project.images?.[0];
  const extraImages = project.images?.slice(1) ?? [];

  const modal = (
    <div
      className={styles.modalBackdrop}
      onClick={(e) => {
        // Only close when the click landed on the backdrop itself, not on
        // bubbled-up clicks from inside the modal content.
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label={project.title}
    >
      <div
        className={styles.modalShell}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className={styles.modalClose}
          onClick={onClose}
          aria-label="Close project"
        >
          ✕
        </button>

        {hero && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={deriveUrl(hero.publicId, {
              width: 1760,
              height: 990,
              crop: "fill",
            })}
            alt={hero.caption || project.title}
            className={styles.modalHero}
          />
        )}

        <div className={styles.modalContent}>
          <div className={styles.modalKicker}>
            Project
            {project.year ? ` · ${project.year}` : ""}
            {project.role ? ` · ${project.role}` : ""}
          </div>
          <h2 className={styles.modalTitle}>{project.title}</h2>
          {project.description && (
            <p className={styles.modalDesc}>{project.description}</p>
          )}

          {project.tech && project.tech.length > 0 && (
            <div className={styles.modalSection}>
              <div className={styles.modalSectionHead}>Stack</div>
              <div className={styles.modalChipRow}>
                {project.tech.map((t) => (
                  <span key={t} className={styles.modalChip}>
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}

          {(project.demoUrl || project.sourceUrl || project.videoUrl) && (
            <div className={styles.modalSection}>
              <div className={styles.modalSectionHead}>Links</div>
              <div className={styles.modalLinkRow}>
                {project.demoUrl && (
                  <a
                    href={project.demoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.modalLink}
                  >
                    Demo ↗
                  </a>
                )}
                {project.sourceUrl && (
                  <a
                    href={project.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.modalLink}
                  >
                    Source ↗
                  </a>
                )}
                {project.videoUrl && (
                  <a
                    href={project.videoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.modalLink}
                  >
                    Video ↗
                  </a>
                )}
              </div>
            </div>
          )}

          {extraImages.length > 0 && (
            <div className={styles.modalSection}>
              <div className={styles.modalSectionHead}>Gallery</div>
              <div className={styles.modalGallery}>
                {extraImages.map((img) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={img.id}
                    src={deriveUrl(img.publicId, {
                      width: 720,
                      height: 540,
                      crop: "fill",
                    })}
                    alt={img.caption ?? ""}
                    className={styles.modalGalleryImg}
                    loading="lazy"
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}