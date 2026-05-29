import { getOrFetch, type CachedResult } from "./cache";

/*
 * Hugging Face integration.
 *
 * Hugging Face exposes public list endpoints that don't require auth:
 *   GET https://huggingface.co/api/models?author=<user>
 *   GET https://huggingface.co/api/datasets?author=<user>
 *   GET https://huggingface.co/api/spaces?author=<user>
 *
 * Each returns the public repos of that kind owned by the author. We fetch
 * all three and surface the most-liked items as a combined "ML work"
 * section — meaningful for ML/AI engineers, an audience underserved by
 * other portfolio tools.
 *
 * Honest notes:
 *   - We sort by `likes` and cap the list, so a prolific user shows their
 *     best, not an exhaustive dump.
 *   - The three fetches run in parallel. If one fails (e.g. the user has no
 *     spaces) the others still populate — a per-kind failure just yields an
 *     empty list for that kind.
 *   - "User not found" returns an empty array (not a 404), same pattern as
 *     Dev.to — empty across all three kinds → no section.
 */

// ─── Public shape ──────────────────────────────────────────────────────────

export type HFItemKind = "model" | "dataset" | "space";

export interface HFItem {
  id: string; // e.g. "user/repo-name"
  name: string; // just the repo part
  kind: HFItemKind;
  likes: number;
  downloads: number | null; // datasets/models have downloads; spaces don't
  // What the model does, e.g. "text-generation", "image-classification".
  // Models only; null for datasets/spaces. Genuinely informative for an ML
  // portfolio — "text-generation · 1.2k likes" reads better than likes alone.
  pipelineTag: string | null;
  url: string;
}

export interface HuggingFaceData {
  username: string;
  items: HFItem[];
  totalModels: number;
  totalDatasets: number;
  totalSpaces: number;
}

// ─── Fetcher ───────────────────────────────────────────────────────────────

const HF_API = "https://huggingface.co/api";
const TTL_SECONDS = 60 * 60;
const MAX_ITEMS = 8; // combined across all three kinds

interface HFApiRepo {
  id?: string;
  modelId?: string; // models use this
  likes?: number;
  downloads?: number;
  pipeline_tag?: string; // models: the task, e.g. "text-generation"
}

/** Fetch one kind (models/datasets/spaces) for an author. */
async function fetchKind(
  author: string,
  kind: HFItemKind,
): Promise<HFItem[]> {
  const endpoint =
    kind === "model"
      ? "models"
      : kind === "dataset"
        ? "datasets"
        : "spaces";

  const res = await fetch(
    `${HF_API}/${endpoint}?author=${encodeURIComponent(author)}&limit=50`,
    { cache: "no-store" },
  );
  if (!res.ok) {
    // A per-kind failure shouldn't kill the whole integration.
    throw new Error(`HF ${endpoint} HTTP ${res.status}`);
  }

  const json = (await res.json()) as HFApiRepo[];
  return json.map((r) => {
    // Models report their id in `modelId`; datasets/spaces in `id`.
    const fullId = r.modelId ?? r.id ?? "";
    const name = fullId.includes("/") ? fullId.split("/")[1] : fullId;
    const urlBase =
      kind === "model"
        ? "https://huggingface.co/"
        : kind === "dataset"
          ? "https://huggingface.co/datasets/"
          : "https://huggingface.co/spaces/";
    return {
      id: fullId,
      name,
      kind,
      likes: r.likes ?? 0,
      downloads: r.downloads ?? null,
      pipelineTag: r.pipeline_tag ?? null,
      url: `${urlBase}${fullId}`,
    };
  });
}

async function fetchHuggingFaceFresh(
  username: string,
): Promise<HuggingFaceData> {
  // Three independent fetches — run in parallel. allSettled so one failing
  // kind (or a user with no spaces) doesn't abort the others.
  const [models, datasets, spaces] = await Promise.allSettled([
    fetchKind(username, "model"),
    fetchKind(username, "dataset"),
    fetchKind(username, "space"),
  ]);

  const pick = (r: PromiseSettledResult<HFItem[]>): HFItem[] =>
    r.status === "fulfilled" ? r.value : [];

  const allModels = pick(models);
  const allDatasets = pick(datasets);
  const allSpaces = pick(spaces);

  // Combine, sort by likes desc, take the top MAX_ITEMS.
  const combined = [...allModels, ...allDatasets, ...allSpaces].sort(
    (a, b) => b.likes - a.likes,
  );

  return {
    username,
    items: combined.slice(0, MAX_ITEMS),
    totalModels: allModels.length,
    totalDatasets: allDatasets.length,
    totalSpaces: allSpaces.length,
  };
}

// ─── Public entry point ────────────────────────────────────────────────────

export async function getHuggingFaceData(
  username: string,
): Promise<CachedResult<HuggingFaceData> | null> {
  const key = username.trim().toLowerCase();
  if (!key) return null;

  try {
    const result = await getOrFetch<HuggingFaceData>({
      provider: "huggingface",
      key,
      ttlSeconds: TTL_SECONDS,
      fetcher: () => fetchHuggingFaceFresh(username.trim()),
    });
    // Nothing across all three kinds → no section.
    if (result.data.items.length === 0) return null;
    return result;
  } catch (err) {
    console.error(`[huggingface] fetch failed for ${key}:`, err);
    return null;
  }
}
