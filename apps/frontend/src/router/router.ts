import type { Route } from './types';

export function parseMatchIdFromSearch(search: string): number | null {
  if (!search) {
    return null;
  }

  const normalized = search.startsWith('?') ? search.slice(1) : search;
  const params = new URLSearchParams(normalized);
  const matchIdStr = params.get('matchId');

  if (!matchIdStr) {
    return null;
  }

  const id = parseInt(matchIdStr, 10);

  return Number.isFinite(id) && id > 0 ? id : null;
}

export function parseRoute(pathname: string, search = ''): Route {
  const cleanPath = pathname.replace(/\/+$/, '') || '/';

  if (cleanPath === '/') {
    const matchId = parseMatchIdFromSearch(search);

    return {
      name: 'main',
      path: '/',
      matchId,
    };
  }

  if (
    cleanPath === '/settings' ||
    cleanPath === '/settings/notifications' ||
    cleanPath === '/settings/storage' ||
    cleanPath === '/settings/system'
  ) {
    return {
      name: 'settings',
      path: cleanPath,
    };
  }

  const matchDetailMatch = cleanPath.match(/^\/matches\/(\d+)$/);

  if (matchDetailMatch) {
    const matchId = parseInt(matchDetailMatch[1], 10);

    if (Number.isFinite(matchId) && matchId > 0) {
      return {
        name: 'match-detail',
        path: cleanPath,
        matchId,
      };
    }
  }

  const storyMatchMatch = cleanPath.match(/^\/story\/(\d+)$/);

  if (storyMatchMatch) {
    const matchId = parseInt(storyMatchMatch[1], 10);

    if (Number.isFinite(matchId) && matchId > 0) {
      return {
        name: 'story-match',
        path: cleanPath,
        matchId,
      };
    }
  }

  if (cleanPath === '/story') {
    return {
      name: 'story-hub',
      path: '/story',
    };
  }

  if (cleanPath === '/creator') {
    return {
      name: 'story-hub',
      path: '/creator',
    };
  }

  if (cleanPath === '/admin' || cleanPath.startsWith('/admin/')) {
    return {
      name: 'admin',
      path: '/admin',
    };
  }

  return {
    name: 'not-found',
    path: cleanPath,
  };
}
