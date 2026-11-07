import {
  calculateCacheStorageUsage,
  calculateLocalStorageBytes,
  formatStorageBytes,
  getStorageUsageEstimate,
} from './storage-usage';

class MockStorage {
  private store = new Map<string, string>();

  get length(): number {
    return this.store.size;
  }

  key(index: number): string | null {
    const keys = Array.from(this.store.keys());

    return keys[index] ?? null;
  }

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }
}

describe('storage-usage', () => {
  const originalWindow = globalThis.window;
  const originalNavigator = globalThis.navigator;

  let mockStorage: MockStorage;

  beforeEach(() => {
    mockStorage = new MockStorage();

    Object.defineProperty(globalThis, 'window', {
      value: {
        localStorage: mockStorage,
        caches: undefined,
      },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(globalThis, 'window', {
      value: originalWindow,
      writable: true,
      configurable: true,
    });

    Object.defineProperty(globalThis, 'navigator', {
      value: originalNavigator,
      writable: true,
      configurable: true,
    });
  });

  describe('formatStorageBytes', () => {
    it('formats 0 bytes as 0 KB by default or custom defaultZero', () => {
      expect(formatStorageBytes(0)).toBe('0 KB');
      expect(formatStorageBytes(0, { defaultZero: '0,0 MB' })).toBe('0,0 MB');
    });

    it('formats forced units properly in German style with comma', () => {
      expect(formatStorageBytes(0, { forceUnit: 'MB' })).toBe('0,0 MB');
      expect(formatStorageBytes(1024 * 1024, { forceUnit: 'MB' })).toBe('1,0 MB');
      expect(formatStorageBytes(2.4 * 1024 * 1024, { forceUnit: 'MB' })).toBe('2,4 MB');
      expect(formatStorageBytes(42 * 1024, { forceUnit: 'KB' })).toBe('42 KB');
      expect(formatStorageBytes(500, { forceUnit: 'B' })).toBe('500 B');
    });

    it('formats auto scale correctly for B, KB, and MB', () => {
      expect(formatStorageBytes(350)).toBe('350 B');
      expect(formatStorageBytes(1024)).toBe('1 KB');
      expect(formatStorageBytes(42 * 1024)).toBe('42 KB');
      expect(formatStorageBytes(1.2 * 1024 * 1024)).toBe('1,2 MB');
      expect(formatStorageBytes(2.4 * 1024 * 1024)).toBe('2,4 MB');
    });
  });

  describe('calculateLocalStorageBytes', () => {
    it('returns 0 when localStorage is empty', () => {
      expect(calculateLocalStorageBytes()).toBe(0);
    });

    it('calculates UTF-16 character byte size correctly', () => {
      // Key: "test" (4 chars), Value: "1234" (4 chars) -> (4 + 4) * 2 = 16 bytes
      mockStorage.setItem('test', '1234');
      expect(calculateLocalStorageBytes()).toBe(16);

      // Key: "foo" (3 chars), Value: "bar" (3 chars) -> 12 bytes + 16 bytes = 28 bytes
      mockStorage.setItem('foo', 'bar');
      expect(calculateLocalStorageBytes()).toBe(28);
    });
  });

  describe('calculateCacheStorageUsage', () => {
    it('returns 0 when caches is not supported', async () => {
      const result = await calculateCacheStorageUsage();

      expect(result).toEqual({ bytes: 0, entryCount: 0 });
    });

    it('inspects cache storage keys and calculates sizes', async () => {
      const mockMatch = jest.fn().mockImplementation((req: { url: string }) => {
        if (req.url.includes('item1')) {
          return Promise.resolve({
            headers: {
              get: (header: string) => (header === 'content-length' ? '1024' : null),
            },
          });
        }

        return Promise.resolve({
          headers: {
            get: () => null,
          },
          clone: () => ({
            blob: () => Promise.resolve({ size: 2048 }),
          }),
        });
      });

      const mockCache = {
        keys: jest.fn().mockResolvedValue([
          { url: 'https://example.com/item1' },
          { url: 'https://example.com/item2' },
        ]),
        match: mockMatch,
      };

      const mockCaches = {
        keys: jest.fn().mockResolvedValue(['v1-cache']),
        open: jest.fn().mockResolvedValue(mockCache),
      };

      Object.defineProperty(globalThis.window, 'caches', {
        value: mockCaches,
        writable: true,
        configurable: true,
      });

      const result = await calculateCacheStorageUsage();

      expect(result.entryCount).toBe(2);
      expect(result.bytes).toBe(1024 + 2048);
    });
  });

  describe('getStorageUsageEstimate', () => {
    it('combines navigator.storage.estimate and local measures as fallback when window.caches is undefined', async () => {
      const mockEstimate = jest.fn().mockResolvedValue({
        usage: 10240,
        quota: 1048576,
      });

      Object.defineProperty(globalThis, 'navigator', {
        value: {
          storage: {
            estimate: mockEstimate,
          },
        },
        writable: true,
        configurable: true,
      });

      mockStorage.setItem('key', 'value'); // (3 + 5) * 2 = 16 bytes

      const estimate = await getStorageUsageEstimate();

      expect(estimate.totalBytes).toBe(10240);
      expect(estimate.quotaBytes).toBe(1048576);
      expect(estimate.localStorageBytes).toBe(16);
      expect(estimate.formattedTotal).toBe('10 KB');
    });

    it('uses actual cacheBytes and avoids Chromium opaque response padding inflation when caches is available', async () => {
      const tile1Bytes = 10 * 1024 * 1024; // 10.0 MB
      const tile2Bytes = Math.round(8.4 * 1024 * 1024); // 8.4 MB
      const actualCacheBytes = tile1Bytes + tile2Bytes;

      const mockCache = {
        keys: jest.fn().mockResolvedValue([
          { url: 'https://tiles.openfreemap.org/tile1.pbf' },
          { url: 'https://tiles.openfreemap.org/tile2.pbf' },
        ]),
        match: jest.fn().mockImplementation((req: { url: string }) => {
          if (req.url.includes('tile1')) {
            return Promise.resolve({
              headers: {
                get: (header: string) => (header === 'content-length' ? `${tile1Bytes}` : null),
              },
            });
          }

          return Promise.resolve({
            headers: {
              get: (header: string) => (header === 'content-length' ? `${tile2Bytes}` : null),
            },
          });
        }),
      };

      const mockCaches = {
        keys: jest.fn().mockResolvedValue(['map-tiles-cache']),
        open: jest.fn().mockResolvedValue(mockCache),
      };

      Object.defineProperty(globalThis.window, 'caches', {
        value: mockCaches,
        writable: true,
        configurable: true,
      });

      // Chromium QuotaManager reports ~1.6 GB usage due to ~7 MB security padding per opaque response
      const inflatedUsage = Math.round(1606.2 * 1024 * 1024);

      const mockEstimate = jest.fn().mockResolvedValue({
        usage: inflatedUsage,
        quota: 10 * 1024 * 1024 * 1024,
      });

      Object.defineProperty(globalThis, 'navigator', {
        value: {
          storage: {
            estimate: mockEstimate,
          },
        },
        writable: true,
        configurable: true,
      });

      // 2 KB (1024 characters * 2 bytes = 2048 bytes)
      mockStorage.setItem('settings', 'x'.repeat(1016)); // (8 + 1016) * 2 = 2048 bytes

      const estimate = await getStorageUsageEstimate();

      expect(estimate.cacheBytes).toBe(actualCacheBytes);
      expect(estimate.cacheEntryCount).toBe(2);
      expect(estimate.localStorageBytes).toBe(2048);
      expect(estimate.totalBytes).toBe(2048 + actualCacheBytes);
      expect(estimate.totalBytes).not.toBe(inflatedUsage);
      expect(estimate.formattedCache).toBe('18,4 MB');
      expect(estimate.formattedLocalStorage).toBe('2 KB');
      expect(estimate.formattedTotal).toBe('18,4 MB');
    });

    it('falls back to local sum when navigator.storage.estimate returns 0 or fails', async () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: {
          storage: {
            estimate: jest.fn().mockRejectedValue(new Error('Permission denied')),
          },
        },
        writable: true,
        configurable: true,
      });

      mockStorage.setItem('sample', 'payload'); // (6 + 7) * 2 = 26 bytes

      const estimate = await getStorageUsageEstimate();

      expect(estimate.localStorageBytes).toBe(26);
      expect(estimate.totalBytes).toBe(26);
      expect(estimate.formattedTotal).toBe('26 B');
    });
  });
});
