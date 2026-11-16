import { describe, expect, it } from "vitest";
import { parseLookalikes, SimilarSpeciesResult } from "@/lib/lookalikes";

function result(id: number, rank: string, count: number, name: string, common?: string): SimilarSpeciesResult {
  return { count, taxon: { id, rank, name, preferred_common_name: common } };
}

describe("parseLookalikes", () => {
  it("keeps species only, sorted by confusion count", () => {
    const parsed = parseLookalikes([
      result(1, "species", 100, "Amanita frostiana"),
      result(2, "genus", 900, "Amanita"),
      result(3, "species", 500, "Amanita flavoconia"),
    ]);
    expect(parsed.map((l) => l.taxonId)).toEqual([3, 1]);
    expect(parsed[0].confusionCount).toBe(500);
  });

  it("normalizes common names and falls back to the scientific name", () => {
    const parsed = parseLookalikes([
      result(1, "species", 2, "Amanita flavoconia", "yellow patches"),
      result(2, "species", 1, "Amanita frostiana"),
    ]);
    expect(parsed[0].commonName).toBe("Yellow Patches");
    expect(parsed[1].commonName).toBe("Amanita frostiana");
  });
});
