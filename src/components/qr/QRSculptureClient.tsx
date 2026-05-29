"use client";

import dynamic from "next/dynamic";

/*
 * Client-side wrapper for the 3D QR sculpture.
 *
 * Why this file exists: Next 16 disallows `next/dynamic` with `ssr: false`
 * inside Server Components. The landing page (page.tsx) is a Server
 * Component, so the dynamic import has to live in a Client Component — this
 * one.
 *
 * Three.js is ~600 kB gzipped; we lazy-load it so it never blocks first
 * paint. The loading placeholder mirrors the final footprint so the layout
 * doesn't shift when the sculpture mounts.
 */

const QRSculpture = dynamic(() => import("./QRSculpture"), {
  ssr: false,
  loading: () => <div className="size-full" />,
});

export function QRSculptureClient() {
  return <QRSculpture />;
}
