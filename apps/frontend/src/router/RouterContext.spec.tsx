import {
  createAppRouter,
  type RouterWindowAdapter,
} from './router-controller';
import type { RouterHistoryState } from './types';

interface HistoryEntry {
  state: RouterHistoryState;
  title: string;
  url: string;
}

interface HistoryStateBox {
  current: RouterHistoryState;
}

function createMockWindow(
  initialPath = '/',
  initialSearch = '',
): RouterWindowAdapter & {
  firePopState: () => void;
  historyStack: HistoryEntry[];
} {
  const listeners: Record<string, ((event: Event) => void)[]> = {};
  const historyStack: HistoryEntry[] = [];
  const historyStateRef: HistoryStateBox = { current: null };

  const win = {
    location: {
      pathname: initialPath,
      search: initialSearch,
      origin: 'http://localhost',
      href: `http://localhost${initialPath}${initialSearch}`,
    },
    history: {
      get state(): RouterHistoryState {
        return historyStateRef.current;
      },
      set state(val: RouterHistoryState) {
        historyStateRef.current = val;
      },
      pushState: (state: RouterHistoryState, title: string, url: string) => {
        win.history.state = state;
        historyStack.push({ state, title, url });

        const [p, s] = url.split('?');
        win.location.pathname = p;
        win.location.search = s ? `?${s}` : '';
        win.location.href = `http://localhost${url}`;
      },
      replaceState: (state: RouterHistoryState, title: string, url: string) => {
        win.history.state = state;

        if (historyStack.length > 0) {
          historyStack[historyStack.length - 1] = { state, title, url };
        } else {
          historyStack.push({ state, title, url });
        }

        const [p, s] = url.split('?');
        win.location.pathname = p;
        win.location.search = s ? `?${s}` : '';
        win.location.href = `http://localhost${url}`;
      },
      back: () => {
        if (historyStack.length > 1) {
          historyStack.pop();
          const prev = historyStack[historyStack.length - 1];
          win.history.state = prev ? prev.state : null;
        } else {
          historyStack.pop();
          win.history.state = null;
        }

        win.firePopState();
      },
    },
    addEventListener: (event: string, cb: (event: Event) => void) => {
      listeners[event] = listeners[event] || [];
      listeners[event].push(cb);
    },
    removeEventListener: (event: string, cb: (event: Event) => void) => {
      if (listeners[event]) {
        listeners[event] = listeners[event].filter((fn) => fn !== cb);
      }
    },
    firePopState: () => {
      const cbs = listeners['popstate'] || [];

      for (const cb of cbs) {
        cb(new Event('popstate'));
      }
    },
    historyStack,
  };

  return win;
}

describe('createAppRouter controller', () => {
  it('initializes with current window path and parses route', () => {
    const mockWin = createMockWindow('/settings');
    const router = createAppRouter({ windowAdapter: mockWin });

    expect(router.getCurrentPath()).toBe('/settings');
    expect(router.getRoute()).toEqual({
      name: 'settings',
      path: '/settings',
    });
  });

  it('navigates to another path and notifies subscribers', () => {
    const mockWin = createMockWindow('/');
    const router = createAppRouter({ windowAdapter: mockWin });

    const listener = jest.fn();
    router.subscribe(listener);

    router.navigate('/matches/101');

    expect(mockWin.historyStack.length).toBe(1);
    expect(mockWin.historyStack[0].url).toBe('/matches/101');
    expect(router.getCurrentPath()).toBe('/matches/101');
    expect(router.getRoute()).toEqual({
      name: 'match-detail',
      path: '/matches/101',
      matchId: 101,
    });
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('pushes history state when overlay opens and calls onClose on popstate (Back button)', () => {
    const mockWin = createMockWindow('/');
    const router = createAppRouter({ windowAdapter: mockWin });

    const onCloseVenue = jest.fn();

    router.openOverlay({
      id: 'venue-sheet',
      type: 'venue',
      onClose: onCloseVenue,
    });

    expect(mockWin.history.state).toEqual({
      __overlay: 'venue-sheet',
      __type: 'venue',
    });
    expect(router.hasActiveOverlay()).toBe(true);

    // Simulate browser / Android hardware Back button
    mockWin.firePopState();

    expect(onCloseVenue).toHaveBeenCalledTimes(1);
    expect(router.hasActiveOverlay()).toBe(false);
  });

  it('handles LIFO overlay dismissals in reverse order (modal over sheet)', () => {
    const mockWin = createMockWindow('/');
    const router = createAppRouter({ windowAdapter: mockWin });

    const onCloseVenue = jest.fn();
    const onCloseKiosk = jest.fn();

    // 1. Open venue sheet
    router.openOverlay({
      id: 'venue-sheet',
      type: 'venue',
      onClose: onCloseVenue,
    });

    // 2. Open kiosk modal on top of venue sheet
    router.openOverlay({
      id: 'kiosk-modal',
      type: 'kiosk-modal',
      onClose: onCloseKiosk,
    });

    expect(mockWin.history.state).toEqual({
      __overlay: 'kiosk-modal',
      __type: 'kiosk-modal',
    });

    // First Back button: closes kiosk modal (top of stack)
    mockWin.firePopState();
    expect(onCloseKiosk).toHaveBeenCalledTimes(1);
    expect(onCloseVenue).not.toHaveBeenCalled();
    expect(router.hasActiveOverlay()).toBe(true);

    // Second Back button: closes venue sheet
    mockWin.firePopState();
    expect(onCloseVenue).toHaveBeenCalledTimes(1);
    expect(router.hasActiveOverlay()).toBe(false);
  });

  it('closeOverlay triggers history.back when at top of stack', () => {
    const mockWin = createMockWindow('/');
    const router = createAppRouter({ windowAdapter: mockWin });

    const onCloseVenue = jest.fn();

    router.openOverlay({
      id: 'venue-sheet',
      type: 'venue',
      onClose: onCloseVenue,
    });

    const backSpy = jest.spyOn(mockWin.history, 'back');
    router.closeOverlay('venue-sheet');

    expect(backSpy).toHaveBeenCalledTimes(1);
    expect(onCloseVenue).toHaveBeenCalledTimes(1);
  });
});
