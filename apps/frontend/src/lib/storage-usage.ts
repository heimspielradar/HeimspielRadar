import * as React from 'react';

export interface StorageEstimateResult {
  totalBytes: number;
  formattedTotal: string;
  cacheBytes: number;
  formattedCache: string;
  cacheEntryCount: number;
  localStorageBytes: number;
  formattedLocalStorage: string;
  quotaBytes?: number;
}

export interface FormatStorageBytesOptions {
  forceUnit?: 'B' | 'KB' | 'MB';
  unit?: 'B' | 'KB' | 'MB';
  defaultZero?: string;
}

/**
 * Formats a byte number into a localized German string (e.g. 0,0 MB, 42 KB, 2,4 MB).
 */
export function formatStorageBytes(
  bytes: number,
  options?: FormatStorageBytesOptions,
): string {
  const targetUnit = options?.forceUnit ?? options?.unit;

  if (targetUnit) {
    if (targetUnit === 'MB') {
      return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`;
    }

    if (targetUnit === 'KB') {
      return `${Math.round(bytes / 1024)} KB`;
    }

    return `${Math.round(bytes)} B`;
  }

  if (bytes <= 0) {
    return options?.defaultZero ?? '0 KB';
  }

  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`;
  }

  if (bytes >= 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }

  return `${Math.round(bytes)} B`;
}

/**
 * Measures the byte size of window.localStorage based on UTF-16 characters (2 bytes per char).
 */
export function calculateLocalStorageBytes(): number {
  if (typeof window === 'undefined' || !window.localStorage) {
    return 0;
  }

  let totalBytes = 0;

  try {
    const storage = window.localStorage;

    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);

      if (key !== null) {
        const value = storage.getItem(key) ?? '';
        totalBytes += (key.length + value.length) * 2;
      }
    }
  } catch {
    // Ignore storage access errors in restricted contexts
  }

  return totalBytes;
}

/**
 * Inspects Cache Storage buckets to calculate entry counts and total response sizes.
 */
export async function calculateCacheStorageUsage(): Promise<{
  bytes: number;
  entryCount: number;
}> {
  if (typeof window === 'undefined' || !('caches' in window)) {
    return { bytes: 0, entryCount: 0 };
  }

  let totalBytes = 0;
  let entryCount = 0;

  try {
    const cacheNames = await window.caches.keys();

    for (const name of cacheNames) {
      const cache = await window.caches.open(name);
      const requests = await cache.keys();
      entryCount += requests.length;

      for (const req of requests) {
        try {
          const res = await cache.match(req);

          if (res) {
            const contentLength = res.headers?.get?.('content-length');

            if (contentLength && !Number.isNaN(Number(contentLength))) {
              totalBytes += Number(contentLength);
            } else if ('clone' in res && res.clone) {
              const blob = await res.clone().blob();
              totalBytes += blob.size;
            }
          }
        } catch {
          // Ignore individual match/read errors (e.g. opaque responses)
        }
      }
    }
  } catch {
    // Ignore cache access errors
  }

  return { bytes: totalBytes, entryCount };
}

/**
 * Calculates aggregated storage usage combining navigator.storage.estimate(),
 * direct localStorage character sizes, and Cache Storage inspections.
 */
export async function getStorageUsageEstimate(): Promise<StorageEstimateResult> {
  let navUsage = 0;
  let navQuota: number | undefined;

  if (
    typeof navigator !== 'undefined' &&
    'storage' in navigator &&
    navigator.storage &&
    'estimate' in navigator.storage &&
    navigator.storage.estimate
  ) {
    try {
      const estimate = await navigator.storage.estimate();

      if (Number.isFinite(estimate.usage)) {
        navUsage = estimate.usage ?? 0;
      }

      if (Number.isFinite(estimate.quota)) {
        navQuota = estimate.quota;
      }
    } catch {
      // Ignore estimate errors
    }
  }

  const localStorageBytes = calculateLocalStorageBytes();
  const { bytes: cacheBytes, entryCount: cacheEntryCount } = await calculateCacheStorageUsage();

  let effectiveCacheBytes = cacheBytes;

  if (effectiveCacheBytes === 0 && navUsage > localStorageBytes) {
    effectiveCacheBytes = navUsage - localStorageBytes;
  }

  const totalBytes = Math.max(navUsage, localStorageBytes + effectiveCacheBytes);

  return {
    totalBytes,
    formattedTotal: formatStorageBytes(totalBytes),
    cacheBytes: effectiveCacheBytes,
    formattedCache: formatStorageBytes(effectiveCacheBytes),
    cacheEntryCount,
    localStorageBytes,
    formattedLocalStorage: formatStorageBytes(localStorageBytes),
    quotaBytes: navQuota,
  };
}

/**
 * React hook to fetch and refresh storage usage details.
 */
export function useStorageUsage() {
  const [usage, setUsage] = React.useState<StorageEstimateResult>({
    totalBytes: 0,
    formattedTotal: '0 KB',
    cacheBytes: 0,
    formattedCache: '0 KB',
    cacheEntryCount: 0,
    localStorageBytes: 0,
    formattedLocalStorage: '0 KB',
  });

  const [isLoading, setIsLoading] = React.useState<boolean>(true);

  const refresh = React.useCallback(async () => {
    setIsLoading(true);

    try {
      const result = await getStorageUsageEstimate();
      setUsage(result);

      return result;
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    ...usage,
    isLoading,
    refresh,
  };
}
