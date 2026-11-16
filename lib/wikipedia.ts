const WIKIPEDIA_SUMMARY_API = "https://en.wikipedia.org/api/rest_v1/page/summary/";

// Wikimedia asks API clients to identify themselves: https://meta.wikimedia.org/wiki/User-Agent_policy
const USER_AGENT = "MycoMatch/1.0 (https://github.com/benmoss/mycomatch)";
const RETRY_DELAY_MS = 300;

export interface SpeciesSummary {
  title: string;
  extract: string;
  thumbnail?: string;
  url: string;
}

function isRetryable(status: number): boolean {
  return status === 429 || status >= 500;
}

/**
 * Wikipedia's summary of a species, or null if it has no page.
 * Rate limits and server errors are retried once, then thrown.
 */
export async function fetchSpeciesSummary(
  scientificName: string,
  fetchFn: typeof fetch = fetch
): Promise<SpeciesSummary | null> {
  const url = WIKIPEDIA_SUMMARY_API + encodeURIComponent(scientificName);
  const request = () => fetchFn(url, { headers: { "User-Agent": USER_AGENT } });

  let response = await request();
  if (isRetryable(response.status)) {
    await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
    response = await request();
  }

  if (response.status === 404) {
    return null;
  }
  if (!response.ok) {
    throw new Error(`Wikipedia API error: ${response.status}`);
  }

  const data = await response.json();
  return {
    title: data.title,
    extract: data.extract,
    thumbnail: data.thumbnail?.source,
    url: data.content_urls?.desktop?.page,
  };
}
