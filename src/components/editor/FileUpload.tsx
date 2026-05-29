"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { uploadFile, type UploadKind } from "@/lib/uploadClient";

/*
 * Single-file uploader. Used for avatar and resume — anything where the
 * latest upload replaces the previous one.
 *
 * Controlled component: parent owns the publicId. We just trigger uploads
 * and report back via onChange.
 *
 * Why no preview here? Because we can't always preview (resume PDF doesn't
 * preview inline). The parent decides how to render the current state.
 */

interface Props {
  kind: UploadKind;
  /** Currently-stored public_id, "" if nothing uploaded. */
  value: string;
  onChange: (publicId: string) => void;
  /** Comma-separated MIME hint for the file picker. e.g. "image/*" or "application/pdf". */
  accept?: string;
  /** Hard cap. We rely on Cloudinary's free-tier 100MB ceiling otherwise. */
  maxBytes?: number;
  /** Display label on the button when no file is uploaded. */
  cta?: string;
  /** Optional preview slot — parent renders whatever it likes (image thumb, file row). */
  preview?: React.ReactNode;
}

export function FileUpload({
  kind,
  value,
  onChange,
  accept,
  maxBytes,
  cta = "Upload",
  preview,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);

  const onPick = () => inputRef.current?.click();

  const onFileChosen = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Always reset the input so picking the same file twice still triggers change.
    e.target.value = "";
    if (!file) return;

    if (maxBytes && file.size > maxBytes) {
      toast.error(`File too large. Max ${formatBytes(maxBytes)}.`);
      return;
    }

    setProgress(0);
    try {
      const result = await uploadFile(file, kind, (frac) => setProgress(frac));
      onChange(result.publicId);
      toast.success("Uploaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setProgress(null);
    }
  };

  const isUploading = progress !== null;

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={onFileChosen}
      />
      {preview}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onPick}
          disabled={isUploading}
          className="btn-secondary text-sm"
        >
          {isUploading
            ? `Uploading ${Math.round((progress ?? 0) * 100)}%`
            : value
              ? "Replace"
              : cta}
        </button>
        {value && !isUploading && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="text-xs text-muted-foreground hover:text-destructive"
          >
            Remove
          </button>
        )}
      </div>
    </div>
  );
}

/* ─── helpers ────────────────────────────────────────────────────────────── */

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}
