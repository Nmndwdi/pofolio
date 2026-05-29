"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { uploadFile, type UploadKind, type UploadedAsset } from "@/lib/uploadClient";

/*
 * Multi-file uploader. Used for project images and "other files".
 *
 * Owns nothing — fully controlled. Parent passes `items` (current list) and
 * gets back a new list via onChange after each upload or removal.
 *
 * The parent decides what each item looks like via the `renderItem` prop,
 * because project images render very differently from PDF certificates.
 */

interface Props<T> {
  kind: UploadKind;
  items: T[];
  /** Build a new item from a freshly-uploaded asset + a generated id. */
  toItem: (asset: UploadedAsset, id: string) => T;
  /** How to render each item in the list, with a remove handler attached. */
  renderItem: (item: T, onRemove: () => void) => React.ReactNode;
  onChange: (next: T[]) => void;
  accept?: string;
  maxBytes?: number;
  /** Hard cap on item count. */
  maxItems?: number;
  cta?: string;
  /** Allow picking multiple files at once. */
  multiple?: boolean;
}

export function MultiFileUpload<T>({
  kind,
  items,
  toItem,
  renderItem,
  onChange,
  accept,
  maxBytes,
  maxItems,
  cta = "Upload",
  multiple = true,
}: Props<T>) {
  const inputRef = useRef<HTMLInputElement>(null);
  // Map of in-flight upload progress, keyed by a temp id.
  const [progress, setProgress] = useState<Record<string, number>>({});
  const isUploading = Object.keys(progress).length > 0;

  const onPick = () => inputRef.current?.click();

  const onFilesChosen = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length === 0) return;

    const remaining = maxItems != null ? maxItems - items.length : Infinity;
    if (remaining <= 0) {
      toast.error(`You've reached the limit of ${maxItems} items.`);
      return;
    }
    const accepted = files.slice(0, remaining);
    if (accepted.length < files.length) {
      toast.warning(
        `Only ${accepted.length} more allowed — uploaded those, skipped the rest.`,
      );
    }

    // Validate sizes upfront so we don't waste a signature for each rejection.
    if (maxBytes) {
      for (const f of accepted) {
        if (f.size > maxBytes) {
          toast.error(`"${f.name}" is too large. Max ${formatBytes(maxBytes)}.`);
          return;
        }
      }
    }

    // Upload sequentially. Parallel uploads on a thin connection (mobile)
    // tend to all stall together; sequential gives smoother per-file progress.
    const newItems: T[] = [];
    for (const file of accepted) {
      const tempId = crypto.randomUUID();
      try {
        setProgress((p) => ({ ...p, [tempId]: 0 }));
        const asset = await uploadFile(file, kind, (frac) => {
          setProgress((p) => ({ ...p, [tempId]: frac }));
        });
        newItems.push(toItem(asset, tempId));
      } catch (err) {
        toast.error(
          `Upload failed for "${file.name}": ${
            err instanceof Error ? err.message : "unknown error"
          }`,
        );
      } finally {
        setProgress((p) => {
          const { [tempId]: _drop, ...rest } = p;
          return rest;
        });
      }
    }

    if (newItems.length > 0) {
      onChange([...items, ...newItems]);
      toast.success(
        newItems.length === 1
          ? "Uploaded"
          : `Uploaded ${newItems.length} files`,
      );
    }
  };

  const removeItem = (idx: number) => {
    onChange(items.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        onChange={onFilesChosen}
      />

      {items.length > 0 && (
        <ul className="space-y-2">
          {items.map((item, i) => (
            <li key={i}>{renderItem(item, () => removeItem(i))}</li>
          ))}
        </ul>
      )}

      {isUploading && (
        <ul className="space-y-1.5">
          {Object.entries(progress).map(([id, frac]) => (
            <li
              key={id}
              className="flex items-center gap-2 text-xs text-muted-foreground"
            >
              <div className="h-1 w-32 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-primary"
                  style={{ width: `${frac * 100}%` }}
                />
              </div>
              {Math.round(frac * 100)}%
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        onClick={onPick}
        disabled={
          isUploading || (maxItems != null && items.length >= maxItems)
        }
        className="btn-secondary text-sm"
      >
        + {cta}
      </button>
    </div>
  );
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}
