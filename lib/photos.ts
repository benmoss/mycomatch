import { Observation } from "@/types/inaturalist";

/**
 * Keep one observation with photos per requested species. Observations of
 * varieties are matched to their species through ancestor_ids.
 */
export function onePerSpecies(observations: Observation[], taxonIds: number[]): Record<number, Observation> {
  const requested = new Set(taxonIds);
  const result: Record<number, Observation> = {};
  for (const obs of observations) {
    if (!obs.photos?.length) continue;
    const speciesId = requested.has(obs.taxon.id)
      ? obs.taxon.id
      : obs.taxon.ancestor_ids?.find((id) => requested.has(id));
    if (speciesId && !result[speciesId]) {
      result[speciesId] = obs;
    }
  }
  return result;
}
