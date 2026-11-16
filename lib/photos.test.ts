import { describe, expect, it } from "vitest";
import { collectPhotos, onePerSpecies } from "@/lib/photos";
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

describe("collectPhotos", () => {
  it("makes one follow-up request for species the first page missed", async () => {
    const requests: number[][] = [];
    const result = await collectPhotos([10, 20, 30], async (ids) => {
      requests.push(ids);
      // The first page is crowded by common species; the follow-up finds the rest
      return requests.length === 1 ? [obs(1, 10), obs(2, 10)] : ids.map((id) => obs(id * 100, id));
    });
    expect(requests).toEqual([[10, 20, 30], [20, 30]]);
    expect(Object.keys(result).map(Number).sort()).toEqual([10, 20, 30]);
  });

  it("makes a single request when the first page covers every species", async () => {
    let requests = 0;
    await collectPhotos([10], async () => {
      requests++;
      return [obs(1, 10)];
    });
    expect(requests).toBe(1);
  });
});
