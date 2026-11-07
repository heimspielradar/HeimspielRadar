import { parseRoute } from './router';
import type {
  NavigationOptions,
  OverlayRegistration,
  Route,
  RouterHistoryOverlayState,
  RouterHistoryState,
} from './types';

export interface RouterWindowAdapter {
  location: {
    pathname: string;
    search: string;
    origin: string;
    href: string;
  };
  history: {
    state: RouterHistoryState;
    pushState: (state: RouterHistoryState, title: string, url: string) => void;
    replaceState: (state: RouterHistoryState, title: string, url: string) => void;
    back: () => void;
  };
  addEventListener: (event: string, listener: (event: Event) => void) => void;
  removeEventListener: (event: string, listener: (event: Event) => void) => void;
}

export interface AppRouterControllerOptions {
  initialPath?: string;
  initialSearch?: string;
  windowAdapter?: RouterWindowAdapter | null;
}

export interface AppRouterController {
  init: () => void;
  getRoute: () => Route;
  getCurrentPath: () => string;
  navigate: (path: string, options?: NavigationOptions) => void;
  back: () => void;
  openOverlay: (registration: OverlayRegistration) => () => void;
  closeOverlay: (id: string) => void;
  hasActiveOverlay: () => boolean;
  subscribe: (listener: () => void) => () => void;
  destroy: () => void;
}

function getBrowserWindowAdapter(): RouterWindowAdapter | null {
  if (typeof window === 'undefined') {
    return null;
  }

  return {
    location: window.location,
    history: {
      get state(): RouterHistoryState {
        // SAFETY: Window history state is typed as RouterHistoryState by this adapter.
        return (window.history.state as RouterHistoryState) ?? null;
      },
      pushState: (state: RouterHistoryState, title: string, url: string) => {
        window.history.pushState(state, title, url);
      },
      replaceState: (state: RouterHistoryState, title: string, url: string) => {
        window.history.replaceState(state, title, url);
      },
      back: () => {
        window.history.back();
      },
    },
    addEventListener: (event: string, listener: (event: Event) => void) => {
      window.addEventListener(event, listener);
    },
    removeEventListener: (event: string, listener: (event: Event) => void) => {
      window.removeEventListener(event, listener);
    },
  };
}

export function createAppRouter(
  options: AppRouterControllerOptions = {},
): AppRouterController {
  const win =
    options.windowAdapter !== undefined
      ? options.windowAdapter
      : getBrowserWindowAdapter();

  let currentPath = options.initialPath ?? (win ? win.location.pathname : '/');
  let currentSearch = options.initialSearch ?? (win ? win.location.search : '');

  let route: Route = parseRoute(currentPath, currentSearch);

  const listeners = new Set<() => void>();
  let overlayStack: OverlayRegistration[] = [];
  let isListening = false;
  let ignoreNextPopStateCount = 0;

  const notify = () => {
    for (const listener of listeners) {
      listener();
    }
  };

  const handlePopState = () => {
    if (ignoreNextPopStateCount > 0) {
      ignoreNextPopStateCount--;

      return;
    }

    // 1. If an overlay was active, pop and dismiss it
    if (overlayStack.length > 0) {
      const topOverlay = overlayStack.pop();

      if (topOverlay) {
        topOverlay.onClose();

        if (win) {
          currentPath = win.location.pathname;
          currentSearch = win.location.search;
          route = parseRoute(currentPath, currentSearch);
        }

        notify();

        return;
      }
    }

    // 2. Normal screen pop
    if (win) {
      currentPath = win.location.pathname;
      currentSearch = win.location.search;
      route = parseRoute(currentPath, currentSearch);
    }

    notify();
  };

  const init = () => {
    if (win && !isListening) {
      win.addEventListener('popstate', handlePopState);
      isListening = true;
    }
  };

  init();

  const navigate = (path: string, navOptions?: NavigationOptions) => {
    // Clear overlay stack on route navigation
    overlayStack = [];

    if (win) {
      const url = new URL(path, win.location.origin);

      if (navOptions?.replace) {
        win.history.replaceState(null, '', url.pathname + url.search);
      } else {
        win.history.pushState(null, '', url.pathname + url.search);
      }

      currentPath = url.pathname;
      currentSearch = url.search;
      route = parseRoute(url.pathname, url.search);
    } else {
      const [p, s] = path.split('?');
      currentPath = p;
      currentSearch = s ? `?${s}` : '';
      route = parseRoute(p, currentSearch);
    }

    notify();
  };

  const back = () => {
    if (win) {
      win.history.back();
    }
  };

  const openOverlay = (registration: OverlayRegistration) => {
    const existingIndex = overlayStack.findIndex((o) => o.id === registration.id);

    if (existingIndex !== -1) {
      overlayStack[existingIndex] = registration;

      return () => {
        overlayStack = overlayStack.filter((o) => o.id !== registration.id);
      };
    }

    if (win) {
      const overlayState: RouterHistoryOverlayState = {
        __overlay: registration.id,
        __type: registration.type,
      };

      win.history.pushState(
        overlayState,
        '',
        registration.url ?? win.location.href,
      );
    }

    overlayStack.push(registration);
    notify();

    return () => {
      overlayStack = overlayStack.filter((o) => o.id !== registration.id);
      notify();
    };
  };

  const closeOverlay = (id: string) => {
    const top = overlayStack[overlayStack.length - 1];

    if (top && top.id === id) {
      // SAFETY: History entry was created by openOverlay with RouterHistoryOverlayState.
      const historyState = win?.history.state as RouterHistoryOverlayState | null;

      overlayStack.pop();
      top.onClose();

      if (historyState?.__overlay === id && win) {
        ignoreNextPopStateCount++;
        win.history.back();
      }

      notify();

      return;
    }

    const item = overlayStack.find((o) => o.id === id);
    overlayStack = overlayStack.filter((o) => o.id !== id);

    if (item) {
      item.onClose();
    }

    notify();
  };

  const hasActiveOverlay = () => {
    return overlayStack.length > 0;
  };

  const subscribe = (listener: () => void) => {
    listeners.add(listener);

    return () => {
      listeners.delete(listener);
    };
  };

  const destroy = () => {
    if (win && isListening) {
      win.removeEventListener('popstate', handlePopState);
      isListening = false;
    }

    listeners.clear();
    overlayStack = [];
  };

  return {
    init,
    getRoute: () => route,
    getCurrentPath: () => currentPath,
    navigate,
    back,
    openOverlay,
    closeOverlay,
    hasActiveOverlay,
    subscribe,
    destroy,
  };
}
