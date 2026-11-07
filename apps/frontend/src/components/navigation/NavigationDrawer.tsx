import * as React from 'react';
import {
  ArrowLeft,
  Clock,
  ExternalLink,
  List,
  Map as MapIcon,
  Settings,
  Shield,
  Sparkles,
  X,
} from 'lucide-react';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { Button } from '@/components/ui/button';
import { formatLastSyncedAt } from '@/lib/date-utils';
import { getDonationUrl } from '@/lib/donation';

const DONATION_URL = getDonationUrl();

export interface NavigationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentPath: string;
  viewMode: 'map' | 'list';
  onNavigate: (path: string, options?: { viewMode?: 'map' | 'list' }) => void;
  lastSyncedAt?: string | null;
}

export function NavigationDrawer({
  isOpen,
  onClose,
  currentPath,
  viewMode,
  onNavigate,
  lastSyncedAt,
}: NavigationDrawerProps) {
  // ESC key to close
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  const isRadarActive = currentPath === '/' || currentPath === '';
  const isMapActive = isRadarActive && viewMode === 'map';
  const isListActive = isRadarActive && viewMode === 'list';
  const isStoryActive = currentPath.startsWith('/story') || currentPath.startsWith('/creator');
  const isSettingsActive = currentPath.startsWith('/settings');
  const isAdminActive = currentPath.startsWith('/admin');

  const isAdminEnabled = import.meta.env.VITE_ENABLE_ADMIN_UI === 'true';

  const frontendVersion =
    typeof __FRONTEND_VERSION__ !== 'undefined' ? __FRONTEND_VERSION__ : '0.1.0';

  const handleItemClick = (path: string, targetViewMode?: 'map' | 'list') => {
    onNavigate(path, targetViewMode ? { viewMode: targetViewMode } : undefined);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Navigation & Menü"
      className="fixed inset-0 z-50 overscroll-contain"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-over Panel (from right) */}
      <div className="fixed inset-y-0 right-0 z-50 flex h-dvh w-[85vw] max-w-sm sm:w-[360px] flex-col border-l border-border/80 bg-background/95 shadow-2xl backdrop-blur-xl animate-in slide-in-from-right duration-250 select-none overflow-hidden">
        {/* Drawer Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-border/60 p-4 bg-card/40">
          <div className="flex items-center gap-2.5">
            <BrandLogo className="h-7 w-7 rounded-lg shadow-xs" />

            <div>
              <h2
                id="nav-drawer-title"
                className="text-sm font-bold text-foreground leading-none"
              >
                HeimspielRadar
              </h2>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Navigation & Menü
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Zurück</span>
            </Button>

            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
              aria-label="Schließen"
              data-testid="nav-drawer-close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Navigation Items */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6 overscroll-contain">
          {/* Main Navigation Links */}
          <div className="space-y-1.5">
            <div className="px-1 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Hauptansichten
            </div>

            {/* 1. Spieltagsradar (Karten- & Listenansicht) */}
            <div
              className={`rounded-xl border p-3 transition ${
                isRadarActive
                  ? 'border-primary bg-primary/10 text-primary shadow-xs font-semibold'
                  : 'border-border/60 bg-card/40 text-muted-foreground hover:border-border hover:bg-muted/60 hover:text-foreground'
              }`}
            >
              {/* Card Header: Click to navigate directly to the current radar view */}
              <button
                type="button"
                onClick={() => handleItemClick('/', viewMode)}
                className="flex w-full items-center justify-between text-left cursor-pointer group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition ${
                      isRadarActive
                        ? 'border-primary/40 bg-primary/20 text-primary'
                        : 'border-border/60 bg-muted/40 text-muted-foreground group-hover:text-foreground'
                    }`}
                  >
                    {viewMode === 'list' ? (
                      <List className="h-4 w-4" />
                    ) : (
                      <MapIcon className="h-4 w-4" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-foreground">
                      Spieltagsradar
                    </div>
                    <div className="text-[11px] text-muted-foreground truncate font-normal">
                      Hallenkarte & Spieleliste
                    </div>
                  </div>
                </div>

                {isRadarActive && (
                  <span className="h-2 w-2 rounded-full bg-primary shrink-0" />
                )}
              </button>

              {/* Integrated Segmented View Mode Toggle */}
              <div
                role="group"
                aria-label="Radar-Ansicht auswählen"
                className="mt-2.5 grid grid-cols-2 gap-1 rounded-lg bg-muted/60 p-1 border border-border/50"
              >
                <button
                  type="button"
                  data-testid="nav-item-map"
                  aria-label="Kartenansicht"
                  aria-pressed={isMapActive}
                  onClick={() => handleItemClick('/', 'map')}
                  className={`flex items-center justify-center gap-1.5 rounded-md py-1.5 px-2 text-xs font-semibold transition cursor-pointer ${
                    isMapActive
                      ? 'bg-card text-foreground shadow-xs font-bold border border-border/40'
                      : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground'
                  }`}
                >
                  <MapIcon className="h-3.5 w-3.5 shrink-0" />
                  <span>Karte</span>
                </button>

                <button
                  type="button"
                  data-testid="nav-item-list"
                  aria-label="Listenansicht"
                  aria-pressed={isListActive}
                  onClick={() => handleItemClick('/', 'list')}
                  className={`flex items-center justify-center gap-1.5 rounded-md py-1.5 px-2 text-xs font-semibold transition cursor-pointer ${
                    isListActive
                      ? 'bg-card text-foreground shadow-xs font-bold border border-border/40'
                      : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground'
                  }`}
                >
                  <List className="h-3.5 w-3.5 shrink-0" />
                  <span>Liste</span>
                </button>
              </div>
            </div>

            {/* 3. Club Story Hub */}
            <button
              type="button"
              onClick={() => handleItemClick('/story')}
              data-testid="nav-item-story"
              className={`flex w-full items-center justify-between rounded-xl border p-3 text-left transition ${
                isStoryActive
                  ? 'border-primary bg-primary/10 text-primary shadow-xs font-semibold'
                  : 'border-border/60 bg-card/40 text-muted-foreground hover:border-border hover:bg-muted/60 hover:text-foreground'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${
                    isStoryActive
                      ? 'border-primary/40 bg-primary/20 text-primary'
                      : 'border-border/60 bg-muted/40 text-muted-foreground'
                  }`}
                >
                  <Sparkles className="h-4 w-4" />
                </div>

                <div className="min-w-0">
                  <div className="text-sm font-semibold text-foreground">
                    Club Story Hub
                  </div>
                  <div className="text-[11px] text-muted-foreground truncate">
                    Instagram Spieltagsgrafiken
                  </div>
                </div>
              </div>

              {isStoryActive && (
                <span className="h-2 w-2 rounded-full bg-primary shrink-0" />
              )}
            </button>

            {/* 4. Einstellungen */}
            <button
              type="button"
              onClick={() => handleItemClick('/settings')}
              data-testid="nav-item-settings"
              className={`flex w-full items-center justify-between rounded-xl border p-3 text-left transition ${
                isSettingsActive
                  ? 'border-primary bg-primary/10 text-primary shadow-xs font-semibold'
                  : 'border-border/60 bg-card/40 text-muted-foreground hover:border-border hover:bg-muted/60 hover:text-foreground'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${
                    isSettingsActive
                      ? 'border-primary/40 bg-primary/20 text-primary'
                      : 'border-border/60 bg-muted/40 text-muted-foreground'
                  }`}
                >
                  <Settings className="h-4 w-4" />
                </div>

                <div className="min-w-0">
                  <div className="text-sm font-semibold text-foreground">
                    Einstellungen
                  </div>
                  <div className="text-[11px] text-muted-foreground truncate">
                    Ansichten, Benachrichtigungen & Cache
                  </div>
                </div>
              </div>

              {isSettingsActive && (
                <span className="h-2 w-2 rounded-full bg-primary shrink-0" />
              )}
            </button>

            {/* 5. Admin-Dashboard (if enabled) */}
            {isAdminEnabled && (
              <button
                type="button"
                onClick={() => handleItemClick('/admin')}
                data-testid="nav-item-admin"
                className={`flex w-full items-center justify-between rounded-xl border p-3 text-left transition ${
                  isAdminActive
                    ? 'border-primary bg-primary/10 text-primary shadow-xs font-semibold'
                    : 'border-border/60 bg-card/40 text-muted-foreground hover:border-border hover:bg-muted/60 hover:text-foreground'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${
                      isAdminActive
                        ? 'border-primary/40 bg-primary/20 text-primary'
                        : 'border-border/60 bg-muted/40 text-muted-foreground'
                    }`}
                  >
                    <Shield className="h-4 w-4" />
                  </div>

                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-foreground">
                      Admin-Dashboard
                    </div>
                    <div className="text-[11px] text-muted-foreground truncate">
                      Server & DBB-Sync Verwaltung
                    </div>
                  </div>
                </div>

                {isAdminActive && (
                  <span className="h-2 w-2 rounded-full bg-primary shrink-0" />
                )}
              </button>
            )}
          </div>

          {/* Secondary / Extras Section */}
          <div className="space-y-2 border-t border-border/50 pt-4">
            <div className="px-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Unterstützen
            </div>

            <a
              href={DONATION_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center justify-between rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-left transition hover:border-amber-500/50 hover:bg-amber-500/15"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-xl shrink-0" role="img" aria-hidden="true">
                  ☕
                </span>

                <div className="min-w-0">
                  <div className="text-sm font-bold text-amber-700 dark:text-amber-300">
                    Hallenkaffee spendieren
                  </div>
                  <div className="text-[11px] text-amber-900/90 dark:text-amber-200/80 truncate">
                    Serverkosten für die Community decken
                  </div>
                </div>
              </div>

              <ExternalLink className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
            </a>
          </div>
        </div>

        {/* Drawer Footer */}
        <div className="shrink-0 border-t border-border/60 p-4 bg-muted/30 space-y-1.5 text-xs text-muted-foreground">
          {lastSyncedAt && (
            <div className="flex items-center justify-between font-mono text-[11px]">
              <span className="flex items-center gap-1.5">
                <Clock className="h-3 w-3 text-primary" />
                DBB-Sync:
              </span>
              <span>{formatLastSyncedAt(lastSyncedAt)}</span>
            </div>
          )}

          <div className="flex items-center justify-between text-[11px] pt-1">
            <span className="text-foreground/80 font-medium">HeimspielRadar</span>
            <span className="text-muted-foreground font-mono">
              v{frontendVersion} • Open Source
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
