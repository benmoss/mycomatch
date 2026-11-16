import { describe, expect, it } from "vitest";
import { pickDistractors } from "@/lib/distractors";
import { Lookalike, PoolSpecies } from "@/types/quiz";

// Deterministic rng (mulberry32)
function seeded(seed = 42): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Families: 11 & 12 in order 21, 13 in order 22
function sp(taxonId: number, genusId: number, familyId: number, orderId: number): PoolSpecies {
  return {
    taxonId,
    scientificName: `Species ${taxonId}`,
    commonName: `Common ${taxonId}`,
    observationCount: 1000 - taxonId,
    genusId,
    familyId,
    orderId,
  };
}

const answer = sp(1, 31, 11, 21);
const genusMate = sp(2, 31, 11, 21);
const familyMate = sp(3, 32, 11, 21);
const orderMates = [sp(4, 33, 12, 21), sp(5, 33, 12, 21), sp(9, 36, 12, 21)];
const others = [sp(6, 34, 13, 22), sp(7, 34, 13, 22), sp(8, 35, 13, 22), sp(10, 37, 13, 22)];
const pool = [answer, genusMate, familyMate, ...orderMates, ...others];

function la(taxonId: number, confusionCount: number): Lookalike {
  return { taxonId, scientificName: `Species ${taxonId}`, commonName: `Common ${taxonId}`, confusionCount };
}

const ids = (r: { distractors: { taxonId: number }[] }) => r.distractors.map((d) => d.taxonId);

describe("pickDistractors", () => {
  it("tier 0 picks only other families", () => {
    const r = pickDistractors(answer, 0, pool, [], seeded());
    expect(r.distractors).toHaveLength(3);
    const familyOf = new Map(pool.map((s) => [s.taxonId, s.familyId]));
    for (const id of ids(r)) expect(familyOf.get(id)).not.toBe(11);
    expect(r.usedTier).toBe(0);
  });

  it("tier 1 prefers same family, then same order", () => {
    const r = pickDistractors(answer, 1, pool, [], seeded());
    expect(ids(r).slice(0, 2).sort()).toEqual([2, 3]);
    expect([4, 5, 9]).toContain(ids(r)[2]);
    expect(r.usedTier).toBe(1);
  });

  it("tier 1 with one family-mate fills from order", () => {
    const r = pickDistractors(answer, 1, pool.filter((s) => s.taxonId !== 2), [], seeded());
    expect(ids(r)[0]).toBe(3);
    for (const id of ids(r).slice(1)) expect([4, 5, 9]).toContain(id);
  });

  it("tier 1 fills with other families when order runs out", () => {
    const r = pickDistractors(answer, 1, [answer, familyMate, ...others], [], seeded());
    expect(ids(r)[0]).toBe(3);
    for (const id of ids(r).slice(1)) expect([6, 7, 8, 10]).toContain(id);
    expect(r.usedTier).toBe(1);
  });

  it("tier 2 prefers in-pool look-alikes over non-local", () => {
    const lookalikes = [la(100, 900), la(6, 500), la(7, 400), la(101, 300)];
    const r = pickDistractors(answer, 2, pool, lookalikes, seeded());
    expect(ids(r)).toEqual([6, 7, 100]);
    expect(r.usedTier).toBe(2);
  });

  it("tier 2 fills with non-local look-alikes before genus", () => {
    const lookalikes = [la(8, 50), la(100, 40), la(101, 30), la(102, 20)];
    const r = pickDistractors(answer, 2, pool, lookalikes, seeded());
    expect(ids(r)).toEqual([8, 100, 101]);
  });

  it("tier 2 with fewer than 3 look-alikes fills from genus then family", () => {
    const r = pickDistractors(answer, 2, pool, [la(6, 10)], seeded());
    expect(ids(r)).toEqual([6, 2, 3]);
    expect(r.usedTier).toBe(2);
  });

  it("tier 2 with no look-alikes falls back to family rules", () => {
    const r = pickDistractors(answer, 2, pool, [], seeded());
    expect(ids(r).slice(0, 2)).toEqual([2, 3]);
    expect(r.usedTier).toBe(1);
  });

  it("tier 3 behaves like tier 2", () => {
    const lookalikes = [la(100, 900), la(6, 500), la(7, 400)];
    expect(ids(pickDistractors(answer, 3, pool, lookalikes, seeded()))).toEqual([6, 7, 100]);
  });

  it("never includes the answer or duplicates", () => {
    const lookalikes = [la(1, 999), la(6, 500), la(6, 500), la(7, 400)];
    const r = pickDistractors(answer, 2, pool, lookalikes, seeded());
    expect(ids(r)).not.toContain(1);
    expect(new Set(ids(r)).size).toBe(ids(r).length);
    expect(ids(r)).toEqual([6, 7, 2]);
  });

  it("tiny pool returns fewer than 3", () => {
    const r = pickDistractors(answer, 0, [answer, others[0]], [], seeded());
    expect(r.distractors).toHaveLength(1);
  });

  it("maps to answer options", () => {
    const r = pickDistractors(answer, 2, pool, [la(100, 5)], seeded());
    expect(r.distractors[0]).toEqual({ taxonId: 100, scientificName: "Species 100", commonName: "Common 100" });
  });
});
