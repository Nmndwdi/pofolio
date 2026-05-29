import Link from "next/link";
import type { HuggingFaceData, HFItemKind } from "@/lib/integrations/huggingface";

/*
 * Hugging Face section — the user's ML work.
 *
 * A summary line with counts, then a list of top items (models, datasets,
 * spaces) sorted by likes. Each item is tagged with its kind and shows
 * likes / downloads.
 */

const KIND_LABEL: Record<HFItemKind, string> = {
  model: "Model",
  dataset: "Dataset",
  space: "Space",
};

export function HuggingFaceSection({ data }: { data: HuggingFaceData }) {
  // Build a compact summary like "12 models · 3 datasets · 2 spaces".
  const summaryParts = [
    data.totalModels > 0 && `${data.totalModels} models`,
    data.totalDatasets > 0 && `${data.totalDatasets} datasets`,
    data.totalSpaces > 0 && `${data.totalSpaces} spaces`,
  ].filter(Boolean);

  return (
    <div className="space-y-3">
      <div className="font-p-display text-sm italic text-p-fg-muted">
        @{data.username} on Hugging Face
        {summaryParts.length > 0 && ` — ${summaryParts.join(" · ")}`}
      </div>
      <ul className="space-y-2">
        {data.items.map((item) => (
          <li key={`${item.kind}-${item.id}`}>
            <Link
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 rounded-md border border-p-border bg-p-surface px-3 py-2 transition-colors hover:bg-p-surface-2"
            >
              <span className="rounded bg-p-surface-2 px-1.5 py-0.5 font-p-mono text-[10px] uppercase text-p-fg-muted">
                {KIND_LABEL[item.kind]}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-p-fg">
                {item.name}
                {item.pipelineTag && (
                  <span className="ml-2 font-p-mono text-[10px] font-normal text-p-fg-subtle">
                    {item.pipelineTag}
                  </span>
                )}
              </span>
              <span className="shrink-0 text-xs text-p-fg-subtle">
                ♥ {item.likes}
                {item.downloads != null &&
                  item.downloads > 0 &&
                  ` · ${formatCount(item.downloads)} dl`}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Compact number formatting: 1234 → "1.2k", 1200000 → "1.2M". */
function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}
