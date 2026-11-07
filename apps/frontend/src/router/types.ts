export type RouteName =
  | 'main'
  | 'settings'
  | 'match-detail'
  | 'story-hub'
  | 'story-match'
  | 'admin'
  | 'not-found';

export interface MainRoute {
  name: 'main';
  path: '/';
  matchId?: number | null;
}

export type SettingsRoutePath =
  | '/settings'
  | '/settings/notifications'
  | '/settings/storage'
  | '/settings/system';

export interface SettingsRoute {
  name: 'settings';
  path: SettingsRoutePath;
}

export interface MatchDetailRoute {
  name: 'match-detail';
  path: string;
  matchId: number;
}

export interface StoryHubRoute {
  name: 'story-hub';
  path: '/story' | '/creator';
}

export interface StoryMatchRoute {
  name: 'story-match';
  path: string;
  matchId: number;
}

export interface AdminRoute {
  name: 'admin';
  path: '/admin';
}

export interface NotFoundRoute {
  name: 'not-found';
  path: string;
}

export type Route =
  | MainRoute
  | SettingsRoute
  | MatchDetailRoute
  | StoryHubRoute
  | StoryMatchRoute
  | AdminRoute
  | NotFoundRoute;

export type OverlayType =
  | 'venue'
  | 'filter-drawer'
  | 'nav-drawer'
  | 'kiosk-modal'
  | 'top-match-modal'
  | 'reminder-modal';

export interface RouterHistoryOverlayState {
  __overlay?: string;
  __type?: OverlayType;
}

export type RouterHistoryState = RouterHistoryOverlayState | null;

export interface OverlayRegistration {
  id: string;
  type: OverlayType;
  onClose: () => void;
  url?: string;
}

export interface NavigationOptions {
  replace?: boolean;
  viewMode?: 'map' | 'list';
}

export interface AppRouterContextValue {
  route: Route;
  currentPath: string;
  navigate: (path: string, options?: NavigationOptions) => void;
  back: () => void;
  openOverlay: (registration: OverlayRegistration) => () => void;
  closeOverlay: (id: string) => void;
  hasActiveOverlay: () => boolean;
}
