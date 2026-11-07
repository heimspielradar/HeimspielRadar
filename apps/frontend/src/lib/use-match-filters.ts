import * as React from 'react';
import type { League, NearbyMatchesQuery } from '@sundayleague/shared-types';
import {
  type DateRange,
  formatDisplayDateRange,
} from './date-utils';
import { type LocationReference, STUTTGART_FALLBACK } from './geo-utils';
import { useGeolocation, type GeolocationPositionCoords } from '@/hooks/useGeolocation';

export type { GeolocationPositionCoords, NearbyMatchesQuery };

export const FILTER_STORAGE_KEY = 'heimspielradar:filters:v1';

export type ViewMode = 'map' | 'list';

export type DateFilterMode =
  | 'today'
  | 'tomorrow'
  | 'weekend'
  | 'next-weekend'
  | 'weekend-after-next'
  | 'all'
  | 'custom';

export type DateMode = DateFilterMode;

export interface PersistedFilterState {
  viewMode: ViewMode;
  location: LocationReference;
  radiusKm: number;
  showRadiusCircle: boolean;
  dateMode: DateFilterMode;
  customDate?: string | null;
  customDateFrom: string;
  customDateTo: string;
  onlyUpcoming: boolean;
  teamQuery?: string;
  genders: string[];
  ageClasses: string[];
  skillLevels: string[];
  leagueIds: number[];
}

export const DEFAULT_FILTER_STATE: PersistedFilterState = {
  viewMode: 'map',
  location: STUTTGART_FALLBACK,
  radiusKm: 30,
  showRadiusCircle: true,
  dateMode: 'weekend',
  customDate: undefined,
  customDateFrom: '',
  customDateTo: '',
  onlyUpcoming: true,
  teamQuery: undefined,
  genders: [],
  ageClasses: [],
  skillLevels: [],
  leagueIds: [],
};

export function cloneDefaultFilterState(): PersistedFilterState {
  return {
    viewMode: DEFAULT_FILTER_STATE.viewMode,
    location: { ...DEFAULT_FILTER_STATE.location },
    radiusKm: DEFAULT_FILTER_STATE.radiusKm,
    showRadiusCircle: DEFAULT_FILTER_STATE.showRadiusCircle,
    dateMode: DEFAULT_FILTER_STATE.dateMode,
    customDate: DEFAULT_FILTER_STATE.customDate,
    customDateFrom: DEFAULT_FILTER_STATE.customDateFrom,
    customDateTo: DEFAULT_FILTER_STATE.customDateTo,
    onlyUpcoming: DEFAULT_FILTER_STATE.onlyUpcoming,
    teamQuery: DEFAULT_FILTER_STATE.teamQuery,
    genders: [...DEFAULT_FILTER_STATE.genders],
    ageClasses: [...DEFAULT_FILTER_STATE.ageClasses],
    skillLevels: [...DEFAULT_FILTER_STATE.skillLevels],
    leagueIds: [...DEFAULT_FILTER_STATE.leagueIds],
  };
}

export interface MatchFiltersState extends PersistedFilterState {
  dateFrom: string;
  dateTo: string;
  dateRangeDisplay: string;
  activeFilterCount: number;
  isLocating: boolean;
  locationError: string | null;
  userCoords: GeolocationPositionCoords | null;
  query: NearbyMatchesQuery;
}

export type MatchFiltersPatch = Partial<PersistedFilterState> & {
  dateFrom?: string;
  dateTo?: string;
};

export type MatchFiltersUpdater =
  | MatchFiltersPatch
  | ((prev: PersistedFilterState) => MatchFiltersPatch);

export interface MatchFiltersActions {
  setFilters: (patch: MatchFiltersUpdater) => void;
  resetFilters: () => void;
  expandRadius: (increment?: number) => void;
  locateUser: () => Promise<LocationReference | null>;
}

export interface MatchFiltersStorage {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem?: (key: string) => void;
}

export interface MatchFiltersGeolocation {
  requestLocation: () => Promise<GeolocationPositionCoords | null>;
  getCurrentCoords?: () => GeolocationPositionCoords | null;
}

export interface MatchFiltersOptions {
  storage?: MatchFiltersStorage;
  geolocation?: MatchFiltersGeolocation;
  leagues?: League[];
  now?: () => Date;
  initialFilters?: Partial<PersistedFilterState>;
  headless?: boolean;
  searchParams?: string | URLSearchParams;
}

export interface UseMatchFiltersReturn {
  filters: MatchFiltersState;
  actions: MatchFiltersActions;
  controller: MatchFiltersController;
  query: NearbyMatchesQuery;
}

export function getBerlinDateString(date: Date): string {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Europe/Berlin',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

export function getBerlinTomorrowString(now: Date): string {
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  return getBerlinDateString(tomorrow);
}

export function getBerlinWeekendRange(now: Date, weeksOffset = 0): DateRange {
  const dayFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Berlin',
    weekday: 'short',
  });

  const weekday = dayFormatter.format(now);
  let daysToSaturday = 0;

  switch (weekday) {
    case 'Sat':
      daysToSaturday = 0;
      break;

    case 'Sun':
      daysToSaturday = -1;
      break;

    case 'Mon':
      daysToSaturday = 5;
      break;

    case 'Tue':
      daysToSaturday = 4;
      break;

    case 'Wed':
      daysToSaturday = 3;
      break;

    case 'Thu':
      daysToSaturday = 2;
      break;

    case 'Fri':
      daysToSaturday = 1;
      break;

    default:
      daysToSaturday = 0;
  }

  const satDate = new Date(now.getTime() + (daysToSaturday + weeksOffset * 7) * 24 * 60 * 60 * 1000);
  const sunDate = new Date(satDate.getTime() + 24 * 60 * 60 * 1000);

  return {
    dateFrom: getBerlinDateString(satDate),
    dateTo: getBerlinDateString(sunDate),
  };
}

export function resolveDateRange(
  mode: DateFilterMode,
  customDateFrom = '',
  customDateTo = '',
  referenceDate?: Date,
): DateRange {
  const now = referenceDate ?? new Date();

  switch (mode) {
    case 'today': {
      const today = getBerlinDateString(now);

      return { dateFrom: today, dateTo: today };
    }

    case 'tomorrow': {
      const tomorrow = getBerlinTomorrowString(now);

      return { dateFrom: tomorrow, dateTo: tomorrow };
    }

    case 'weekend':
      return getBerlinWeekendRange(now, 0);

    case 'next-weekend':
      return getBerlinWeekendRange(now, 1);

    case 'weekend-after-next':
      return getBerlinWeekendRange(now, 2);

    case 'all':
      return { dateFrom: '', dateTo: '' };

    case 'custom':
      return {
        dateFrom: customDateFrom,
        dateTo: customDateTo,
      };
  }
}

export function resolveDateRangeFromMode(
  mode: DateFilterMode,
  customDateFrom: string,
  customDateTo: string,
): DateRange {
  return resolveDateRange(mode, customDateFrom, customDateTo);
}

export function normalizeFilterQuery(
  state: PersistedFilterState,
  dateFrom: string,
  dateTo: string,
): NearbyMatchesQuery {
  const query: NearbyMatchesQuery = {
    lat: state.location?.lat,
    lng: state.location?.lng,
    radiusKm: state.radiusKm,
    onlyUpcoming: state.onlyUpcoming,
  };

  const trimmedFrom = dateFrom?.trim();
  const trimmedTo = dateTo?.trim();

  if (trimmedFrom) {
    query.dateFrom = trimmedFrom;
  }

  if (trimmedTo) {
    query.dateTo = trimmedTo;
  }

  if (trimmedFrom && trimmedFrom === trimmedTo) {
    query.date = trimmedFrom;
  }

  if (state.leagueIds && state.leagueIds.length > 0) {
    query.leagueIds = state.leagueIds;
  }

  if (state.genders && state.genders.length > 0) {
    query.genders = state.genders;

    if (state.genders.length === 1) {
      query.gender = state.genders[0];
    }
  }

  if (state.ageClasses && state.ageClasses.length > 0) {
    query.ageClasses = state.ageClasses;

    if (state.ageClasses.length === 1) {
      query.ageGroup = state.ageClasses[0];
    }
  }

  if (state.skillLevels && state.skillLevels.length > 0) {
    query.skillLevels = state.skillLevels;
  }

  const trimmedTeam = state.teamQuery?.trim();

  if (trimmedTeam && trimmedTeam.length > 0) {
    query.teamQuery = trimmedTeam;
    query.teamSearch = trimmedTeam;
  }

  return query;
}

export function countActiveFilters(state: PersistedFilterState): number {
  let count = 0;

  if (state.radiusKm !== DEFAULT_FILTER_STATE.radiusKm) {
    count += 1;
  }

  if (state.dateMode !== DEFAULT_FILTER_STATE.dateMode) {
    count += 1;
  }

  if (state.onlyUpcoming !== DEFAULT_FILTER_STATE.onlyUpcoming) {
    count += 1;
  }

  if (state.teamQuery && state.teamQuery.trim().length > 0) {
    count += 1;
  }

  if (state.genders.length > 0) {
    count += 1;
  }

  if (state.ageClasses.length > 0) {
    count += 1;
  }

  if (state.skillLevels.length > 0) {
    count += 1;
  }

  if (state.leagueIds.length > 0) {
    count += 1;
  }

  return count;
}

export function parseMatchFiltersUrlParams(
  search?: string | URLSearchParams,
): Partial<PersistedFilterState> {
  let effectiveSearch = search;

  if (!effectiveSearch && typeof window !== 'undefined' && window.location) {
    effectiveSearch = window.location.search;
  }

  if (!effectiveSearch) {
    return {};
  }

  const params =
    effectiveSearch instanceof URLSearchParams
      ? effectiveSearch
      : new URLSearchParams(
          String(effectiveSearch).startsWith('?')
            ? String(effectiveSearch).slice(1)
            : String(effectiveSearch),
        );

  const overrides: Partial<PersistedFilterState> = {};

  const dateParam = params.get('date')?.toLowerCase().trim();

  if (
    dateParam === 'today' ||
    dateParam === 'tomorrow' ||
    dateParam === 'weekend' ||
    dateParam === 'next-weekend' ||
    dateParam === 'all'
  ) {
    overrides.dateMode = dateParam;
    overrides.customDate = null;
    overrides.customDateFrom = '';
    overrides.customDateTo = '';
  }

  const viewParam = params.get('view')?.toLowerCase().trim();

  if (viewParam === 'map' || viewParam === 'list') {
    overrides.viewMode = viewParam;
  }

  return overrides;
}

function isViewMode(value?: string): value is ViewMode {
  return value === 'map' || value === 'list';
}

function isDateMode(value?: string): value is DateFilterMode {
  return (
    value === 'today' ||
    value === 'tomorrow' ||
    value === 'weekend' ||
    value === 'next-weekend' ||
    value === 'weekend-after-next' ||
    value === 'all' ||
    value === 'custom'
  );
}

function parseLocation(loc?: Partial<LocationReference>): LocationReference {
  if (!loc) {
    return DEFAULT_FILTER_STATE.location;
  }

  const lat = Number(loc.lat);
  const lng = Number(loc.lng);
  const name = loc.name ? String(loc.name) : '';

  if (!Number.isFinite(lat) || !Number.isFinite(lng) || !name) {
    return DEFAULT_FILTER_STATE.location;
  }

  return { lat, lng, name };
}

export function sanitizeFilters(
  raw: Partial<PersistedFilterState> | null | undefined,
  todayStr: string,
): PersistedFilterState {
  if (!raw) {
    return cloneDefaultFilterState();
  }

  const parsed = raw;

  const viewMode = isViewMode(parsed.viewMode)
    ? parsed.viewMode
    : DEFAULT_FILTER_STATE.viewMode;

  const location = parseLocation(parsed.location);
  const rawRadius = Number(parsed.radiusKm);

  const radiusKm =
    Number.isFinite(rawRadius) && rawRadius >= 5 && rawRadius <= 50
      ? rawRadius
      : DEFAULT_FILTER_STATE.radiusKm;

  let dateMode = isDateMode(parsed.dateMode)
    ? parsed.dateMode
    : DEFAULT_FILTER_STATE.dateMode;

  const legacyCustomDate =
    parsed.customDate && String(parsed.customDate).length > 0
      ? String(parsed.customDate)
      : '';

  let customDateFrom =
    parsed.customDateFrom && String(parsed.customDateFrom).length > 0
      ? String(parsed.customDateFrom)
      : legacyCustomDate;

  let customDateTo =
    parsed.customDateTo && String(parsed.customDateTo).length > 0
      ? String(parsed.customDateTo)
      : legacyCustomDate;

  // Smart Date Restoration: if custom range is completely in the past or empty, fall back to 'today'
  if (dateMode === 'custom') {
    const effectiveEnd = customDateTo || customDateFrom;

    if (!effectiveEnd || effectiveEnd < todayStr) {
      dateMode = 'today';
      customDateFrom = '';
      customDateTo = '';
    }
  }

  const onlyUpcoming =
    parsed.onlyUpcoming === true || parsed.onlyUpcoming === false
      ? parsed.onlyUpcoming
      : DEFAULT_FILTER_STATE.onlyUpcoming;

  const showRadiusCircle =
    parsed.showRadiusCircle === true || parsed.showRadiusCircle === false
      ? parsed.showRadiusCircle
      : DEFAULT_FILTER_STATE.showRadiusCircle;

  const teamQuery =
    Boolean(parsed.teamQuery) && String(parsed.teamQuery).trim().length > 0
      ? String(parsed.teamQuery).trim()
      : undefined;

  const genders = Array.isArray(parsed.genders)
    ? parsed.genders.map((item) => String(item)).filter(Boolean)
    : [];

  const ageClasses = Array.isArray(parsed.ageClasses)
    ? parsed.ageClasses.map((item) => String(item)).filter(Boolean)
    : [];

  const skillLevels = Array.isArray(parsed.skillLevels)
    ? parsed.skillLevels.map((item) => String(item)).filter(Boolean)
    : [];

  const leagueIds = Array.isArray(parsed.leagueIds)
    ? parsed.leagueIds
        .map((item) => Number(item))
        .filter((num) => Number.isFinite(num))
    : [];

  return {
    viewMode,
    location,
    radiusKm,
    showRadiusCircle,
    dateMode,
    customDate: parsed.customDate === null ? null : (customDateFrom || undefined),
    customDateFrom,
    customDateTo,
    onlyUpcoming,
    teamQuery,
    genders,
    ageClasses,
    skillLevels,
    leagueIds,
  };
}

export function isLeagueMatchingHierarchy(
  league: League,
  hierarchy: {
    genders?: string[];
    ageClasses?: string[];
    skillLevels?: string[];
  },
): boolean {
  const { genders = [], ageClasses = [], skillLevels = [] } = hierarchy;

  if (genders.length > 0) {
    if (!league.geschlecht || !genders.includes(league.geschlecht)) {
      return false;
    }
  }

  if (ageClasses.length > 0) {
    if (!league.akName || !ageClasses.includes(league.akName)) {
      return false;
    }
  }

  if (skillLevels.length > 0) {
    if (!league.skName || !skillLevels.includes(league.skName)) {
      return false;
    }
  }

  return true;
}

export function filterLeaguesByHierarchy(
  leagues: League[],
  options: {
    genders?: string[];
    ageClasses?: string[];
    skillLevels?: string[];
    search?: string;
  },
): League[] {
  const query = options.search?.trim().toLowerCase() ?? '';

  return leagues.filter((league) => {
    if (!isLeagueMatchingHierarchy(league, options)) {
      return false;
    }

    if (query.length > 0) {
      const haystack = [
        league.name,
        league.akName,
        league.skName,
        league.geschlecht,
        league.verbandName,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      if (!haystack.includes(query)) {
        return false;
      }
    }

    return true;
  });
}

export function cascadeLeagueIds(
  selectedLeagueIds: number[],
  leagues: League[],
  hierarchy: {
    genders?: string[];
    ageClasses?: string[];
    skillLevels?: string[];
  },
): number[] {
  if (leagues.length === 0 || selectedLeagueIds.length === 0) {
    return selectedLeagueIds;
  }

  const leagueMap = new Map(leagues.map((l) => [l.id, l]));

  return selectedLeagueIds.filter((id) => {
    const league = leagueMap.get(id);

    if (!league) {
      return false;
    }

    return isLeagueMatchingHierarchy(league, hierarchy);
  });
}

class InMemoryStorage implements MatchFiltersStorage {
  private data = new Map<string, string>();

  getItem(key: string): string | null {
    return this.data.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.data.set(key, value);
  }

  removeItem(key: string): void {
    this.data.delete(key);
  }
}

function arraysEqual<T>(a: T[], b: T[]): boolean {
  if (a === b) {
    return true;
  }

  if (a.length !== b.length) {
    return false;
  }

  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) {
      return false;
    }
  }

  return true;
}

function hasFiltersChanged(
  prev: PersistedFilterState,
  next: PersistedFilterState,
): boolean {
  if (
    prev.viewMode !== next.viewMode ||
    prev.radiusKm !== next.radiusKm ||
    prev.showRadiusCircle !== next.showRadiusCircle ||
    prev.dateMode !== next.dateMode ||
    prev.customDate !== next.customDate ||
    prev.customDateFrom !== next.customDateFrom ||
    prev.customDateTo !== next.customDateTo ||
    prev.onlyUpcoming !== next.onlyUpcoming ||
    prev.teamQuery !== next.teamQuery
  ) {
    return true;
  }

  if (
    prev.location.lat !== next.location.lat ||
    prev.location.lng !== next.location.lng ||
    prev.location.name !== next.location.name
  ) {
    return true;
  }

  if (
    !arraysEqual(prev.genders, next.genders) ||
    !arraysEqual(prev.ageClasses, next.ageClasses) ||
    !arraysEqual(prev.skillLevels, next.skillLevels) ||
    !arraysEqual(prev.leagueIds, next.leagueIds)
  ) {
    return true;
  }

  return false;
}

export class MatchFiltersController {
  private persisted: PersistedFilterState;
  private isLocating = false;
  private locationError: string | null = null;
  private userCoords: GeolocationPositionCoords | null = null;
  private listeners = new Set<(state: MatchFiltersState) => void>();
  private storage: MatchFiltersStorage;
  private geolocation?: MatchFiltersGeolocation;
  private leagues: League[] = [];
  private getNow: () => Date;
  private cachedState: MatchFiltersState | null = null;

  constructor(options?: MatchFiltersOptions) {
    this.getNow = options?.now ?? (() => new Date());
    this.leagues = options?.leagues ?? [];
    this.geolocation = options?.geolocation;

    if (options?.storage) {
      this.storage = options.storage;
    } else if (typeof window !== 'undefined' && window.localStorage) {
      this.storage = window.localStorage;
    } else {
      this.storage = new InMemoryStorage();
    }

    this.persisted = this.loadInitialFilters(
      options?.initialFilters,
      options?.searchParams,
    );
  }

  private loadInitialFilters(
    initialFilters?: Partial<PersistedFilterState>,
    searchParams?: string | URLSearchParams,
  ): PersistedFilterState {
    const todayStr = getBerlinDateString(this.getNow());
    const urlOverrides = parseMatchFiltersUrlParams(searchParams);

    let baseState: PersistedFilterState = cloneDefaultFilterState();

    try {
      const raw = this.storage.getItem(FILTER_STORAGE_KEY);

      if (raw) {
        // SAFETY: parse stored JSON string from storage
        const parsed = JSON.parse(raw);
        baseState = sanitizeFilters(parsed, todayStr);
      }
    } catch {
      // Storage parse error fallback
    }

    if (initialFilters) {
      baseState = sanitizeFilters({ ...baseState, ...initialFilters }, todayStr);
    }

    if (Object.keys(urlOverrides).length > 0) {
      baseState = sanitizeFilters({ ...baseState, ...urlOverrides }, todayStr);

      if (urlOverrides.customDate === null) {
        baseState.customDate = null;
      }
    }

    return baseState;
  }

  private save(): void {
    try {
      this.storage.setItem(FILTER_STORAGE_KEY, JSON.stringify(this.persisted));
    } catch {
      // Ignore quota errors
    }
  }

  private notify(): void {
    this.cachedState = null;
    const currentState = this.getState();

    for (const listener of this.listeners) {
      listener(currentState);
    }
  }

  private saveAndNotify(): void {
    this.save();
    this.notify();
  }

  setGeolocation(geo?: MatchFiltersGeolocation): void {
    this.geolocation = geo;
  }

  setAvailableLeagues(leagues: League[]): void {
    this.leagues = leagues;

    const cascaded = cascadeLeagueIds(this.persisted.leagueIds, this.leagues, {
      genders: this.persisted.genders,
      ageClasses: this.persisted.ageClasses,
      skillLevels: this.persisted.skillLevels,
    });

    if (cascaded.length !== this.persisted.leagueIds.length) {
      this.persisted.leagueIds = cascaded;
      this.saveAndNotify();
    }
  }

  getFilteredLeagues(search?: string): League[] {
    return filterLeaguesByHierarchy(this.leagues, {
      genders: this.persisted.genders,
      ageClasses: this.persisted.ageClasses,
      skillLevels: this.persisted.skillLevels,
      search,
    });
  }

  subscribe = (listener: (state: MatchFiltersState) => void): (() => void) => {
    this.listeners.add(listener);

    return () => {
      this.listeners.delete(listener);
    };
  };

  getState = (): MatchFiltersState => {
    if (this.cachedState) {
      return this.cachedState;
    }

    const { dateFrom, dateTo } = resolveDateRange(
      this.persisted.dateMode,
      this.persisted.customDateFrom,
      this.persisted.customDateTo,
      this.getNow(),
    );

    const dateRangeDisplay = formatDisplayDateRange(dateFrom, dateTo);
    const activeFilterCount = countActiveFilters(this.persisted);
    const query = normalizeFilterQuery(this.persisted, dateFrom, dateTo);

    this.cachedState = {
      ...this.persisted,
      dateFrom,
      dateTo,
      dateRangeDisplay,
      activeFilterCount,
      query,
      isLocating: this.isLocating,
      locationError: this.locationError,
      userCoords:
        this.userCoords ?? (this.geolocation?.getCurrentCoords?.() ?? null),
    };

    return this.cachedState;
  };

  getQuery = (): NearbyMatchesQuery => {
    return this.getState().query;
  };

  get query(): NearbyMatchesQuery {
    return this.getState().query;
  };

  locateUser = async (): Promise<LocationReference | null> => {
    if (!this.geolocation) {
      this.persisted.location = STUTTGART_FALLBACK;
      this.saveAndNotify();

      return STUTTGART_FALLBACK;
    }

    this.isLocating = true;
    this.locationError = null;
    this.notify();

    try {
      const coords = await this.geolocation.requestLocation();

      if (coords) {
        const newLoc: LocationReference = {
          lat: coords.lat,
          lng: coords.lng,
          name: 'Mein Standort',
        };

        this.persisted.location = newLoc;
        this.userCoords = coords;
        this.isLocating = false;
        this.locationError = null;
        this.saveAndNotify();

        return newLoc;
      }

      this.persisted.location = STUTTGART_FALLBACK;
      this.isLocating = false;
      this.saveAndNotify();

      return null;
    } catch (err) {
      this.persisted.location = STUTTGART_FALLBACK;
      this.isLocating = false;
      this.locationError =
        err instanceof Error ? err.message : 'Standort konnte nicht ermittelt werden.';
      this.saveAndNotify();

      return null;
    }
  };

  setFilters = (patch: MatchFiltersUpdater): void => {
    const resolvedPatch =
      patch instanceof Function ? patch({ ...this.persisted }) : patch;

    if (!resolvedPatch) {
      return;
    }

    const next: PersistedFilterState = {
      ...this.persisted,
      location: { ...this.persisted.location },
      genders: [...this.persisted.genders],
      ageClasses: [...this.persisted.ageClasses],
      skillLevels: [...this.persisted.skillLevels],
      leagueIds: [...this.persisted.leagueIds],
    };

    if (
      resolvedPatch.viewMode !== undefined &&
      isViewMode(resolvedPatch.viewMode)
    ) {
      next.viewMode = resolvedPatch.viewMode;
    }

    if (resolvedPatch.location !== undefined) {
      next.location = parseLocation(resolvedPatch.location);
    }

    if (resolvedPatch.radiusKm !== undefined) {
      const rawRadius = Number(resolvedPatch.radiusKm);

      if (Number.isFinite(rawRadius)) {
        next.radiusKm = Math.max(5, Math.min(50, rawRadius));
      }
    }

    if (resolvedPatch.showRadiusCircle !== undefined) {
      next.showRadiusCircle = resolvedPatch.showRadiusCircle === true;
    }

    if (resolvedPatch.onlyUpcoming !== undefined) {
      next.onlyUpcoming = resolvedPatch.onlyUpcoming === true;
    }

    if ('teamQuery' in resolvedPatch) {
      if (
        resolvedPatch.teamQuery === null ||
        resolvedPatch.teamQuery === undefined
      ) {
        next.teamQuery = undefined;
      } else {
        const trimmed = String(resolvedPatch.teamQuery).trim();

        next.teamQuery = trimmed.length > 0 ? trimmed : undefined;
      }
    }

    if (resolvedPatch.genders !== undefined) {
      next.genders = Array.from(
        new Set(resolvedPatch.genders.map((g) => String(g)).filter(Boolean)),
      );
    }

    if (resolvedPatch.ageClasses !== undefined) {
      next.ageClasses = Array.from(
        new Set(resolvedPatch.ageClasses.map((a) => String(a)).filter(Boolean)),
      );
    }

    if (resolvedPatch.skillLevels !== undefined) {
      next.skillLevels = Array.from(
        new Set(resolvedPatch.skillLevels.map((s) => String(s)).filter(Boolean)),
      );
    }

    if (resolvedPatch.leagueIds !== undefined) {
      next.leagueIds = Array.from(
        new Set(
          resolvedPatch.leagueIds
            .map((id) => Number(id))
            .filter((num) => Number.isFinite(num)),
        ),
      );
    }

    const hasExplicitPreset =
      resolvedPatch.dateMode &&
      resolvedPatch.dateMode !== 'custom' &&
      isDateMode(resolvedPatch.dateMode);

    if (hasExplicitPreset) {
      // SAFETY: hasExplicitPreset verified isDateMode(resolvedPatch.dateMode)
      const dateMode = resolvedPatch.dateMode as DateFilterMode;
      const resolved = resolveDateRange(dateMode, '', '', this.getNow());

      next.dateMode = dateMode;
      next.customDateFrom = resolved.dateFrom;
      next.customDateTo = resolved.dateTo;
      next.customDate = resolved.dateFrom || undefined;
    } else if (
      resolvedPatch.dateFrom !== undefined ||
      resolvedPatch.dateTo !== undefined ||
      resolvedPatch.customDateFrom !== undefined ||
      resolvedPatch.customDateTo !== undefined ||
      resolvedPatch.customDate !== undefined ||
      resolvedPatch.dateMode === 'custom'
    ) {
      const rawCustom =
        resolvedPatch.customDate && String(resolvedPatch.customDate).length > 0
          ? String(resolvedPatch.customDate)
          : '';

      const effFrom =
        resolvedPatch.dateFrom !== undefined
          ? resolvedPatch.dateFrom
          : (resolvedPatch.customDateFrom !== undefined
              ? resolvedPatch.customDateFrom
              : (rawCustom || next.customDateFrom));

      const effTo =
        resolvedPatch.dateTo !== undefined
          ? resolvedPatch.dateTo
          : (resolvedPatch.customDateTo !== undefined
              ? resolvedPatch.customDateTo
              : (rawCustom || next.customDateTo));

      if (!effFrom && !effTo) {
        next.dateMode = 'all';
        next.customDateFrom = '';
        next.customDateTo = '';
        next.customDate = resolvedPatch.customDate === null ? null : undefined;
      } else {
        next.dateMode = 'custom';
        next.customDateFrom = effFrom;
        next.customDateTo = effTo;
        next.customDate =
          resolvedPatch.customDate === null ? null : (effFrom || undefined);
      }
    }

    const hasHierarchyChange =
      resolvedPatch.genders !== undefined ||
      resolvedPatch.ageClasses !== undefined ||
      resolvedPatch.skillLevels !== undefined ||
      resolvedPatch.leagueIds !== undefined;

    if (hasHierarchyChange) {
      next.leagueIds = cascadeLeagueIds(next.leagueIds, this.leagues, {
        genders: next.genders,
        ageClasses: next.ageClasses,
        skillLevels: next.skillLevels,
      });
    }

    if (!hasFiltersChanged(this.persisted, next)) {
      return;
    }

    this.persisted = next;
    this.saveAndNotify();
  };

  resetFilters = (): void => {
    this.persisted = {
      ...cloneDefaultFilterState(),
      viewMode: this.persisted.viewMode,
    };
    this.saveAndNotify();
  };

  expandRadius = (increment = 15): void => {
    this.setFilters((prev) => ({
      radiusKm: Math.min(50, prev.radiusKm + increment),
    }));
  };

  readonly actions: MatchFiltersActions = {
    setFilters: (patch: MatchFiltersUpdater) => {
      this.setFilters(patch);
    },

    resetFilters: () => {
      this.resetFilters();
    },

    expandRadius: (increment?: number) => {
      this.expandRadius(increment);
    },

    locateUser: () => this.locateUser(),
  };
}

export function createMatchFilters(
  options?: MatchFiltersOptions,
): MatchFiltersController {
  return new MatchFiltersController(options);
}

export function useMatchFilters(
  options?: MatchFiltersOptions,
): UseMatchFiltersReturn {
  // If running in node/SSR/headless environment without React hooks or DOM, return controller directly
  if (options?.headless || typeof window === 'undefined') {
    const controller = createMatchFilters(options);
    const state = controller.getState();

    return {
      filters: state,
      actions: controller.actions,
      controller,
      query: state.query,
    };
  }

  const browserGeo = useGeolocation();

  const effectiveGeo = React.useMemo<MatchFiltersGeolocation>(() => {
    if (options?.geolocation) {
      return options.geolocation;
    }

    return {
      requestLocation: browserGeo.requestLocation,
      getCurrentCoords: () => browserGeo.location,
    };
  }, [options?.geolocation, browserGeo]);

  const controllerRef = React.useRef<MatchFiltersController | null>(null);

  if (!controllerRef.current) {
    controllerRef.current = new MatchFiltersController({
      ...options,
      geolocation: effectiveGeo,
    });
  } else {
    controllerRef.current.setGeolocation(effectiveGeo);
  }

  React.useEffect(() => {
    if (options?.leagues) {
      controllerRef.current?.setAvailableLeagues(options.leagues);
    }
  }, [options?.leagues]);

  const state = React.useSyncExternalStore(
    controllerRef.current.subscribe,
    controllerRef.current.getState,
    controllerRef.current.getState,
  );

  return {
    filters: state,
    actions: controllerRef.current.actions,
    controller: controllerRef.current,
    query: state.query,
  };
}

useMatchFilters.create = createMatchFilters;
