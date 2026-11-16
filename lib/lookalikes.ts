import { normalizeCommonName } from "@/lib/quiz";
import { cached } from "@/lib/serverCache";
import { Lookalike } from "@/types/quiz";

const INATURALIST_API_BASE = "https://api.inaturalist.org/v1";
const LOOKALIKES_TTL_SECONDS = 86400;

// Minimal shape of an iNaturalist similar_species result
export interface SimilarSpeciesResult {
  count: number;
  taxon: { id: number; name: string; rank: string; preferred_common_name?: string };
}

/** Species-rank look-alikes, most often confused first */
export function parseLookalikes(results: SimilarSpeciesResult[]): Lookalike[] {
  return results
    .filter((r) => r.taxon.rank === "species")
    .sort((a, b) => b.count - a.count)
    .map((r) => ({
      taxonId: r.taxon.id,
      scientificName: r.taxon.name,
      commonName: r.taxon.preferred_common_name
        ? normalizeCommonName(r.taxon.preferred_common_name)
        : r.taxon.name,
      confusionCount: r.count,
    }));
}

/** Species people actually confuse with this one (from misidentifications), cached daily */
export function fetchLookalikes(taxonId: number): Promise<Lookalike[]> {
  return cached(["lookalikes", String(taxonId)], LOOKALIKES_TTL_SECONDS, async () => {
    const response = await fetch(
      `${INATURALIST_API_BASE}/identifications/similar_species?taxon_id=${taxonId}`,
      { headers: { "User-Agent": "MycoMatch/1.0" }, signal: AbortSignal.timeout(8000) }
    );
    if (!response.ok) {
      throw new Error(`iNaturalist API error: ${response.status}`);
    }
    const data: { results: SimilarSpeciesResult[] } = await response.json();
    return parseLookalikes(data.results);
  });
}
