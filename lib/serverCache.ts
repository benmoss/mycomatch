import { unstable_cache } from "next/cache";

/**
 * Cache the result of an async function on the server for ttlSeconds.
 * All server-side caching goes through here, so if Next's data cache
 * doesn't persist on our host, this is the only place to swap in an
 * in-memory TTL map.
 */
export function cached<T>(
  keyParts: string[],
  ttlSeconds: number,
  fn: () => Promise<T>
): Promise<T> {
  return unstable_cache(fn, keyParts, { revalidate: ttlSeconds })();
}
