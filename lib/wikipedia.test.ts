import { describe, expect, it } from "vitest";
import { fetchSpeciesSummary } from "@/lib/wikipedia";

const summary = {
  title: "Schizophyllum commune",
  extract: "Schizophyllum commune is a species of fungus.",
  thumbnail: { source: "https://upload.wikimedia.org/thumb.jpg" },
  content_urls: { desktop: { page: "https://en.wikipedia.org/wiki/Schizophyllum_commune" } },
};

function respond(...statuses: number[]) {
  const calls: { url: string; init?: RequestInit }[] = [];
  const fetchFn = (async (url: string, init?: RequestInit) => {
    calls.push({ url, init });
    const status = statuses[Math.min(calls.length - 1, statuses.length - 1)];
    return new Response(status === 200 ? JSON.stringify(summary) : "{}", { status });
  }) as typeof fetch;
  return { fetchFn, calls };
}

describe("fetchSpeciesSummary", () => {
  it("returns the summary fields", async () => {
    const { fetchFn } = respond(200);
    expect(await fetchSpeciesSummary("Schizophyllum commune", fetchFn)).toEqual({
      title: "Schizophyllum commune",
      extract: "Schizophyllum commune is a species of fungus.",
      thumbnail: "https://upload.wikimedia.org/thumb.jpg",
      url: "https://en.wikipedia.org/wiki/Schizophyllum_commune",
    });
  });

  it("identifies itself with a User-Agent", async () => {
    const { fetchFn, calls } = respond(200);
    await fetchSpeciesSummary("Schizophyllum commune", fetchFn);
    const headers = new Headers(calls[0].init?.headers);
    expect(headers.get("User-Agent")).toMatch(/^MycoMatch\//);
  });

  it("returns null only when Wikipedia has no page", async () => {
    const { fetchFn, calls } = respond(404);
    expect(await fetchSpeciesSummary("Nonexistent fungus", fetchFn)).toBeNull();
    expect(calls).toHaveLength(1);
  });

  it("retries once after a rate limit or server error", async () => {
    const { fetchFn, calls } = respond(429, 200);
    const result = await fetchSpeciesSummary("Schizophyllum commune", fetchFn);
    expect(result?.title).toBe("Schizophyllum commune");
    expect(calls).toHaveLength(2);
  });

  it("throws when Wikipedia keeps failing", async () => {
    const { fetchFn, calls } = respond(503, 503);
    await expect(fetchSpeciesSummary("Schizophyllum commune", fetchFn)).rejects.toThrow("503");
    expect(calls).toHaveLength(2);
  });
});
