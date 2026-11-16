import { describe, expect, it } from "vitest";
import { onePerSpecies } from "@/lib/photos";
import { Observation } from "@/types/inaturalist";

function obs(id: number, taxonId: number, ancestorIds: number[] = []): Observation {
  return {
    id,
    taxon: {
      id: taxonId,
      name: `Taxon ${taxonId}`,
      rank: "species",
      iconic_taxon_name: "Fungi",
      observations_count: 1,
      ancestor_ids: [...ancestorIds, taxonId],
    },
    photos: [{ id, url: "https://example.com/square.jpg", attribution: "x", license_code: "cc-by" }],
    quality_grade: "research",
    observed_on: "2026-10-01",
  };
}

describe("onePerSpecies", () => {
  it("keeps the first observation per requested species", () => {
    const result = onePerSpecies([obs(1, 10), obs(2, 10), obs(3, 20)], [10, 20]);
    expect(Object.keys(result).map(Number).sort()).toEqual([10, 20]);
    expect(result[10].id).toBe(1);
  });

  it("maps a variety observation to its requested species", () => {
    const result = onePerSpecies([obs(1, 500, [10])], [10]);
    expect(result[10].id).toBe(1);
  });

  it("ignores observations without photos or for unrequested taxa", () => {
    const noPhotos = { ...obs(1, 10), photos: [] };
    const result = onePerSpecies([noPhotos, obs(2, 99)], [10]);
    expect(result).toEqual({});
  });
});
