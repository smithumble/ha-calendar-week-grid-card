/**
 * Cache utility with TTL support using localStorage
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

const DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 minutes in milliseconds

/**
 * Get cached data if it exists and is still valid
 */
export function getCached<T>(
  key: string,
  ttlMs: number = DEFAULT_TTL_MS,
): T | null {
  try {
    const cached = localStorage.getItem(key);
    if (!cached) {
      return null;
    }

    const entry: CacheEntry<T> = JSON.parse(cached);
    const now = Date.now();
    const age = now - entry.timestamp;
    const entryTtl = entry.ttl ?? ttlMs;

    if (age > entryTtl) {
      // Cache expired, remove it
      localStorage.removeItem(key);
      return null;
    }

    return entry.data;
  } catch (error) {
    console.warn(`Failed to read cache for key ${key}:`, error);
    return null;
  }
}

/**
 * Store data in cache with current timestamp
 */
export function setCached<T>(
  key: string,
  data: T,
  ttlMs: number = DEFAULT_TTL_MS,
): void {
  try {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttlMs,
    };
    localStorage.setItem(key, JSON.stringify(entry));
  } catch (error) {
    console.warn(`Failed to write cache for key ${key}:`, error);
    // If storage is full, try to clear old entries
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      clearExpiredCache();
      // Retry once
      try {
        localStorage.setItem(
          key,
          JSON.stringify({ data, timestamp: Date.now(), ttl: ttlMs }),
        );
      } catch (retryError) {
        console.error(`Failed to cache after cleanup:`, retryError);
      }
    }
  }
}

/**
 * Clear expired cache entries
 */
function clearExpiredCache(): void {
  const now = Date.now();
  const keysToRemove: string[] = [];

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key || !key.startsWith('yasno_cache_')) {
      continue;
    }

    try {
      const cached = localStorage.getItem(key);
      if (cached) {
        const entry: CacheEntry<unknown> = JSON.parse(cached);
        const entryTtl = entry.ttl ?? DEFAULT_TTL_MS;
        if (now - entry.timestamp > entryTtl) {
          keysToRemove.push(key);
        }
      }
    } catch {
      // Invalid entry, remove it
      keysToRemove.push(key);
    }
  }

  keysToRemove.forEach((key) => localStorage.removeItem(key));
}

/**
 * Clear all cache entries for a specific prefix
 */
export function clearCache(prefix: string): void {
  const keysToRemove: string[] = [];

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(prefix)) {
      keysToRemove.push(key);
    }
  }

  keysToRemove.forEach((key) => localStorage.removeItem(key));
}
