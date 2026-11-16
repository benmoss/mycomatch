import { AnswerOption, Lookalike, PoolSpecies, Tier } from "@/types/quiz";

const DISTRACTOR_COUNT = 3;

function shuffled<T>(items: T[], rng: () => number): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function toOption(s: { taxonId: number; scientificName: string; commonName: string }): AnswerOption {
  return { taxonId: s.taxonId, scientificName: s.scientificName, commonName: s.commonName };
}

/**
 * Pick up to 3 wrong answers for a question at the given tier.
 * Fewer than 3 means the pool can't support a question for this species.
 *
 * - Tier 0: other families
 * - Tier 1: same family, then same order, then other families
 * - Tier 2-3: look-alikes (in-pool first, then non-local), then same genus, then tier 1 rules
 */
export function pickDistractors(
  answer: PoolSpecies,
  tier: Tier,
  pool: PoolSpecies[],
  lookalikes: Lookalike[],
  rng: () => number
): { distractors: AnswerOption[]; usedTier: 0 | 1 | 2 } {
  const picked: AnswerOption[] = [];
  const used = new Set<number>([answer.taxonId]);
  let usedTier: 0 | 1 | 2 = 0;

  const take = (candidates: AnswerOption[], sourceTier: 0 | 1 | 2) => {
    for (const c of candidates) {
      if (picked.length >= DISTRACTOR_COUNT) return;
      if (used.has(c.taxonId)) continue;
      used.add(c.taxonId);
      picked.push(c);
      usedTier = Math.max(usedTier, sourceTier) as 0 | 1 | 2;
    }
  };

  const others = pool.filter((s) => s.taxonId !== answer.taxonId);
  const sameFamily = others.filter((s) => s.familyId === answer.familyId);
  const sameOrder = others.filter((s) => s.familyId !== answer.familyId && s.orderId === answer.orderId);
  const otherFamilies = others.filter((s) => s.familyId !== answer.familyId);

  if (tier >= 2) {
    const inPool = new Set(pool.map((s) => s.taxonId));
    const sorted = [...lookalikes].sort((a, b) => b.confusionCount - a.confusionCount);
    take(sorted.filter((l) => inPool.has(l.taxonId)).map(toOption), 2);
    take(sorted.filter((l) => !inPool.has(l.taxonId)).map(toOption), 2);
    take(shuffled(sameFamily.filter((s) => s.genusId === answer.genusId), rng).map(toOption), 1);
  }

  if (tier >= 1) {
    take(shuffled(sameFamily, rng).map(toOption), 1);
    take(shuffled(sameOrder, rng).map(toOption), 1);
  }

  take(shuffled(otherFamilies, rng).map(toOption), 0);

  return { distractors: picked, usedTier };
}
