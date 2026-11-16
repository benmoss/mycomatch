import { normalizeCommonName } from "@/lib/quiz";
import { cached } from "@/lib/serverCache";
import { getRegionBounds } from "@/types/filters";
import { PoolSpecies } from "@/types/quiz";

const INATURALIST_API_BASE = "https://api.inaturalist.org/v1";
const POOL_SIZE = 200;
const POOL_TTL_SECONDS = 86400;
const TAXA_BATCH_SIZE = 30;
const PHOTO_LICENSES = "cc-by,cc-by-nc,cc-by-sa,cc-by-nc-sa,cc0";
const INFRASPECIFIC_RANKS = new Set(["subspecies", "variety", "form", "infrahybrid"]);

// Minimal shapes of the iNaturalist responses we use
export interface SpeciesCountResult {
  count: number;
  taxon: { id: number; rank: string; parent_id?: number };
}

export interface TaxonRecord {
  id: number;
  name: string;
  rank: string;
  preferred_common_name?: string;
  ancestors?: { id: number; rank: string }[];
}

function speciesIdOf(taxon: SpeciesCountResult["taxon"]): number | undefined {
  if (taxon.rank === "species") return taxon.id;
  if (INFRASPECIFIC_RANKS.has(taxon.rank)) return taxon.parent_id;
  return undefined;
}

/** The species ids to look up for a set of species_counts results */
export function speciesIds(counts: SpeciesCountResult[]): number[] {
  const ids = new Set<number>();
  for (const c of counts) {
    const id = speciesIdOf(c.taxon);
    if (id) ids.add(id);
  }
  return [...ids];
}

/**
 * Turn species_counts results plus taxa lookups into the quiz pool:
 * species only (varieties rolled up), with genus/family/order ids,
 * sorted by observation count desc.
 */
export function assemblePool(counts: SpeciesCountResult[], taxa: TaxonRecord[]): PoolSpecies[] {
  const totals = new Map<number, number>();
  for (const c of counts) {
    const id = speciesIdOf(c.taxon);
    if (id) totals.set(id, (totals.get(id) ?? 0) + c.count);
  }

  const pool: PoolSpecies[] = [];
  for (const t of taxa) {
    const total = totals.get(t.id);
    if (total === undefined || t.rank !== "species") continue;
    const ancestorOfRank = (rank: string) => t.ancestors?.find((a) => a.rank === rank)?.id;
    const genusId = ancestorOfRank("genus");
    const familyId = ancestorOfRank("family");
    const orderId = ancestorOfRank("order");
    if (!genusId || !familyId || !orderId) continue;

    pool.push({
      taxonId: t.id,
      scientificName: t.name,
      commonName: t.preferred_common_name ? normalizeCommonName(t.preferred_common_name) : t.name,
      observationCount: total,
      genusId,
      familyId,
      orderId,
    });
  }

  return pool.sort((a, b) => b.observationCount - a.observationCount);
}

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { headers: { "User-Agent": "MycoMatch/1.0" } });
  if (!response.ok) {
    throw new Error(`iNaturalist API error: ${response.status}`);
  }
  return response.json();
}

async function fetchTaxa(ids: number[]): Promise<TaxonRecord[]> {
  const batches: number[][] = [];
  for (let i = 0; i < ids.length; i += TAXA_BATCH_SIZE) {
    batches.push(ids.slice(i, i + TAXA_BATCH_SIZE));
  }
  const responses = await Promise.all(
    batches.map((batch) =>
      getJson<{ results: TaxonRecord[] }>(`${INATURALIST_API_BASE}/taxa/${batch.join(",")}`)
    )
  );
  return responses.flatMap((r) => r.results);
}

/** The most-observed species for a region and optional taxon filter, cached daily */
export function fetchPool(regionId: string | undefined, taxonId: number | undefined): Promise<PoolSpecies[]> {
  return cached(["pool", regionId ?? "all", String(taxonId ?? "all")], POOL_TTL_SECONDS, async () => {
    const params = new URLSearchParams({
      quality_grade: "research",
      photos: "true",
      photo_license: PHOTO_LICENSES,
      per_page: String(POOL_SIZE),
    });
    if (taxonId) {
      params.set("taxon_id", String(taxonId));
    } else {
      params.set("iconic_taxa", "Fungi");
    }
    const bounds = getRegionBounds(regionId);
    if (bounds) {
      for (const [key, value] of Object.entries(bounds)) params.set(key, String(value));
    }

    const counts = await getJson<{ results: SpeciesCountResult[] }>(
      `${INATURALIST_API_BASE}/observations/species_counts?${params.toString()}`
    );
    const taxa = await fetchTaxa(speciesIds(counts.results));
    return assemblePool(counts.results, taxa);
  });
}
