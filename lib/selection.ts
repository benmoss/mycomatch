import { shuffled } from "@/lib/random";
import { PoolSpecies, ProgressStore } from "@/types/quiz";

const IN_PROGRESS_SHARE = 0.6;
const NEW_SHARE = 0.3;

/**
 * Choose which species a quiz asks about: mostly ones still being learned
 * (least recently seen first), some new ones (most common first), and a
 * few mastered ones for review. Short buckets are filled from the others.
 * Expects pool sorted by observationCount desc.
 */
export function selectSpecies(
  pool: PoolSpecies[],
  store: ProgressStore,
  count: number,
  rng: () => number
): PoolSpecies[] {
  const inProgress = pool
    .filter((s) => store[s.taxonId] && store[s.taxonId].tier < 3)
    .sort((a, b) => store[a.taxonId].lastSeen.localeCompare(store[b.taxonId].lastSeen));
  const unseen = pool.filter((s) => !store[s.taxonId]);
  const mastered = shuffled(
    pool.filter((s) => store[s.taxonId]?.tier === 3),
    rng
  );

  const inProgressTarget = Math.round(count * IN_PROGRESS_SHARE);
  const newTarget = Math.round(count * NEW_SHARE);
  const masteredTarget = count - inProgressTarget - newTarget;

  const selected = [
    ...inProgress.slice(0, inProgressTarget),
    ...unseen.slice(0, newTarget),
    ...mastered.slice(0, masteredTarget),
  ];

  // Fill any shortfall in order: in progress, new, mastered
  const leftovers = [
    ...inProgress.slice(inProgressTarget),
    ...unseen.slice(newTarget),
    ...mastered.slice(masteredTarget),
  ];
  selected.push(...leftovers.slice(0, count - selected.length));

  return shuffled(selected, rng);
}
