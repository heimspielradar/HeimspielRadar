import { parseMatchIdFromSearch, parseRoute } from './router';

describe('router URL parsing', () => {
  it('parses root / path with optional ?matchId=', () => {
    expect(parseRoute('/')).toEqual({
      name: 'main',
      path: '/',
      matchId: null,
    });

    expect(parseRoute('', '?matchId=42')).toEqual({
      name: 'main',
      path: '/',
      matchId: 42,
    });
  });

  it('parses /settings path', () => {
    expect(parseRoute('/settings')).toEqual({
      name: 'settings',
      path: '/settings',
    });
    expect(parseRoute('/settings/')).toEqual({
      name: 'settings',
      path: '/settings',
    });
  });

  it('parses /matches/:id with valid integer id', () => {
    expect(parseRoute('/matches/9001')).toEqual({
      name: 'match-detail',
      path: '/matches/9001',
      matchId: 9001,
    });
  });

  it('parses /story and /creator paths', () => {
    expect(parseRoute('/story')).toEqual({
      name: 'story-hub',
      path: '/story',
    });
    expect(parseRoute('/creator')).toEqual({
      name: 'story-hub',
      path: '/creator',
    });
  });

  it('parses /story/:id with valid integer id', () => {
    expect(parseRoute('/story/42')).toEqual({
      name: 'story-match',
      path: '/story/42',
      matchId: 42,
    });
  });

  it('parses /admin path and subpaths', () => {
    expect(parseRoute('/admin')).toEqual({
      name: 'admin',
      path: '/admin',
    });
    expect(parseRoute('/admin/matches')).toEqual({
      name: 'admin',
      path: '/admin',
    });
  });

  it('returns not-found for unknown paths', () => {
    expect(parseRoute('/unknown-page')).toEqual({
      name: 'not-found',
      path: '/unknown-page',
    });
    expect(parseRoute('/matches/abc')).toEqual({
      name: 'not-found',
      path: '/matches/abc',
    });
  });

  describe('parseMatchIdFromSearch', () => {
    it('returns matchId number when valid', () => {
      expect(parseMatchIdFromSearch('?matchId=123')).toBe(123);
      expect(parseMatchIdFromSearch('matchId=456&foo=bar')).toBe(456);
    });

    it('returns null when absent or invalid', () => {
      expect(parseMatchIdFromSearch('')).toBeNull();
      expect(parseMatchIdFromSearch('?foo=bar')).toBeNull();
      expect(parseMatchIdFromSearch('?matchId=invalid')).toBeNull();
      expect(parseMatchIdFromSearch('?matchId=-5')).toBeNull();
    });
  });
});
