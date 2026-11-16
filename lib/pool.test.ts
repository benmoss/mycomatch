import { describe, expect, it } from "vitest";
import { assemblePool, SpeciesCountResult, TaxonRecord } from "@/lib/pool";

function count(id: number, rank: string, n: number, parentId?: number): SpeciesCountResult {
  return { count: n, taxon: { id, rank, parent_id: parentId } };
}

function taxon(id: number, name: string, commonName?: string, ranks = { genus: 1, family: 2, order: 3 }): TaxonRecord {
  return {
    id,
    name,
    rank: "species",
    preferred_common_name: commonName,
    ancestors: Object.entries(ranks).map(([rank, ancestorId]) => ({ id: ancestorId, rank })),
  };
}

describe("assemblePool", () => {
  it("rolls varieties up to their species and merges counts", () => {
    const pool = assemblePool(
      [count(48715, "species", 100), count(500, "variety", 30, 48715)],
      [taxon(48715, "Amanita muscaria", "fly agaric")]
    );
    expect(pool).toHaveLength(1);
    expect(pool[0].taxonId).toBe(48715);
    expect(pool[0].observationCount).toBe(130);
  });

  it("drops entries above species rank", () => {
    const pool = assemblePool(
      [count(48715, "species", 100), count(48419, "genus", 900)],
      [taxon(48715, "Amanita muscaria")]
    );
    expect(pool.map((s) => s.taxonId)).toEqual([48715]);
  });

  it("drops species missing family or order", () => {
    const pool = assemblePool(
      [count(1, "species", 10), count(2, "species", 10)],
      [taxon(1, "A a"), { ...taxon(2, "B b"), ancestors: [{ id: 9, rank: "genus" }] }]
    );
    expect(pool.map((s) => s.taxonId)).toEqual([1]);
  });

  it("drops species the taxa lookup didn't return", () => {
    const pool = assemblePool([count(1, "species", 10), count(2, "species", 10)], [taxon(1, "A a")]);
    expect(pool.map((s) => s.taxonId)).toEqual([1]);
  });

  it("sorts by observation count, descending", () => {
    const pool = assemblePool(
      [count(1, "species", 10), count(2, "species", 50), count(3, "species", 30)],
      [taxon(1, "A a"), taxon(2, "B b"), taxon(3, "C c")]
    );
    expect(pool.map((s) => s.taxonId)).toEqual([2, 3, 1]);
  });

  it("maps ranks and normalizes common names", () => {
    const [s] = assemblePool(
      [count(1, "species", 10)],
      [taxon(1, "Omphalotus illudens", "jack-o'-lantern", { genus: 11, family: 22, order: 33 })]
    );
    expect(s).toEqual({
      taxonId: 1,
      scientificName: "Omphalotus illudens",
      commonName: "Jack-O'-Lantern",
      observationCount: 10,
      genusId: 11,
      familyId: 22,
      orderId: 33,
    });
  });

  it("falls back to the scientific name without a common name", () => {
    const [s] = assemblePool([count(1, "species", 10)], [taxon(1, "Russula emetica")]);
    expect(s.commonName).toBe("Russula emetica");
  });
});
