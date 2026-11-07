import * as React from 'react';
import {
  Bell,
  CalendarPlus,
  Check,
  ChevronRight,
  CircleDot,
  Database,
  Download,
  ExternalLink,
  Laptop,
  List,
  Map as MapIcon,
  Monitor,
  Moon,
  RotateCcw,
  Settings,
  Share,
  Smartphone,
  Sparkles,
  Sun,
  Trash2,
} from 'lucide-react';
import { AppHeader } from '@/components/navigation/AppHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { formatDisplayDate, formatKickoffTime } from '@/lib/date-utils';
import { getDonationUrl } from '@/lib/donation';
import { downloadReminderIcs } from '@/lib/ics-export';
import { useKioskQueue } from '@/lib/kiosk-submission-queue';
import {
  getNotificationPermission,
  isNotificationSupported,
  requestNotificationPermission,
} from '@/lib/push-notification';
import { getLeadTimeLabel, useReminders } from '@/lib/reminder-storage';
import { useStorageUsage } from '@/lib/storage-usage';
import { usePwaInstall } from '@/hooks/usePwaInstall';
import { useOnlineStatus, useTheme } from '@/hooks';
import { SystemDiagnosticsSection } from '@/components/settings/SystemDiagnosticsSection';

const DONATION_URL = getDonationUrl();

export interface SettingsViewProps {
  currentPath?: string;
  onNavigate?: (path: string) => void;
  showRadiusCircle: boolean;
  onToggleRadiusCircle: (show: boolean) => void;
  viewMode: 'map' | 'list';
  onViewModeChange: (mode: 'map' | 'list') => void;
  lastSyncedAt: string | null;
  onNavigateHome: () => void;
  onBack: () => void;
  onOpenNav: () => void;
  radiusKm?: number;
  locationName?: string;
  masterPoolCount?: number;
  filteredMatchesCount?: number;
}

export function SettingsView({
  currentPath,
  onNavigate,
  showRadiusCircle,
  onToggleRadiusCircle,
  viewMode,
  onViewModeChange,
  lastSyncedAt,
  onNavigateHome,
  onBack,
  onOpenNav,
  radiusKm = 50,
  locationName,
  masterPoolCount,
  filteredMatchesCount,
}: SettingsViewProps) {
  const { theme, setTheme } = useTheme();
  const isOnline = useOnlineStatus();
  const { reminders, removeReminder, clearAllReminders } = useReminders();
  const { isStandalone, canPromptInstall, isIosSafari, triggerInstall } = usePwaInstall();
  const storageUsage = useStorageUsage();

  const {
    queue: offlineQueue,
    count: offlineQueueCount,
    syncQueue: syncOfflineQueue,
    isSyncing: isSyncingOfflineQueue,
    removeSubmission: removeOfflineSubmission,
  } = useKioskQueue();

  const [toastMessage, setToastMessage] = React.useState<string | null>(null);
  const [isClearingCache, setIsClearingCache] = React.useState<boolean>(false);

  const [internalPath, setInternalPath] = React.useState<string>(() => {
    return currentPath ?? (typeof window !== 'undefined' ? window.location.pathname : '/settings');
  });

  React.useEffect(() => {
    if (currentPath !== undefined) {
      setInternalPath(currentPath);
    }
  }, [currentPath]);

  React.useEffect(() => {
    const handlePopState = () => {
      setInternalPath(window.location.pathname);
    };

    window.addEventListener('popstate', handlePopState);

    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const effectivePath = currentPath ?? internalPath;

  const handleNavigate = React.useCallback(
    (path: string) => {
      if (onNavigate) {
        onNavigate(path);
      } else if (typeof window !== 'undefined') {
        window.history.pushState({}, '', path);
        setInternalPath(path);
      }
    },
    [onNavigate],
  );

  const subView: 'notifications' | 'storage' | 'system' | null = React.useMemo(() => {
    if (effectivePath.startsWith('/settings/notifications')) {
      return 'notifications';
    }

    if (effectivePath.startsWith('/settings/storage')) {
      return 'storage';
    }

    if (effectivePath.startsWith('/settings/system')) {
      return 'system';
    }

    return null;
  }, [effectivePath]);

  const [pushPermission, setPushPermission] = React.useState<NotificationPermission | 'unsupported'>(() => {
    return getNotificationPermission();
  });

  const showToast = React.useCallback((msg: string) => {
    setToastMessage(msg);
    const timer = setTimeout(() => setToastMessage(null), 4000);

    return () => clearTimeout(timer);
  }, []);

  const handleRequestPush = async () => {
    const res = await requestNotificationPermission();
    setPushPermission(res);

    if (res === 'granted') {
      showToast('Push-Benachrichtigungen erfolgreich erlaubt!');
    } else if (res === 'denied') {
      showToast('Benachrichtigungen wurden im Browser blockiert.');
    }
  };

  const handleSyncOfflineQueue = async () => {
    const result = await syncOfflineQueue();

    if (result.syncedCount > 0) {
      showToast(
        result.syncedCount === 1
          ? 'Ausstehende Kiosk-Info wurde erfolgreich übermittelt!'
          : `${result.syncedCount} ausstehende Kiosk-Infos wurden erfolgreich übermittelt!`,
      );
    } else if (result.failedCount > 0) {
      showToast('Synchronisierung fehlgeschlagen. Bitte prüfe deine Internetverbindung.');
    } else {
      showToast('Keine ausstehenden Meldungen zu synchronisieren.');
    }
  };

  const handleClearCacheAndStorage = async () => {
    setIsClearingCache(true);

    try {
      if (typeof window !== 'undefined' && 'caches' in window) {
        const cacheKeys = await window.caches.keys();
        await Promise.all(cacheKeys.map((k) => window.caches.delete(k)));
      }

      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem('heimspielradar_filters_v2');
      }

      await storageUsage.refresh();
      showToast('Offline-Cache und Speicher erfolgreich geleert!');
    } catch (err) {
      console.error('Fehler beim Leeren des Caches:', err);
      showToast('Fehler beim Leeren des Caches.');
    } finally {
      setIsClearingCache(false);
    }
  };

  const frontendVersion =
    typeof __FRONTEND_VERSION__ !== 'undefined' ? __FRONTEND_VERSION__ : '0.1.0';

  const backLink = React.useMemo(() => {
    if (subView !== null) {
      return {
        label: 'Einstellungen',
        onClick: () => handleNavigate('/settings'),
      };
    }

    return {
      label: 'Zurück',
      onClick: onBack,
    };
  }, [subView, handleNavigate, onBack]);

  return (
    <div className="fixed inset-0 flex h-dvh w-full flex-col overflow-hidden bg-background text-foreground selection:bg-primary/20 selection:text-primary">
      {/* Global Unified App Header */}
      <AppHeader
        onOpenNav={onOpenNav}
        onNavigateHome={onNavigateHome}
        backLink={backLink}
        lastSyncedAt={lastSyncedAt}
      />

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-60 flex items-center gap-2 rounded-xl border border-border bg-card/95 text-card-foreground px-4 py-2.5 text-xs sm:text-sm font-semibold shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-2 duration-200"
        >
          <Sparkles className="h-4 w-4 text-primary shrink-0" />
          <span>{toastMessage}</span>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="ml-2 text-muted-foreground hover:text-foreground cursor-pointer"
            aria-label="Toast schließen"
          >
            ✕
          </button>
        </div>
      )}

      {/* Scrollable Page Body */}
      <main className="flex-1 overflow-y-auto overscroll-contain px-4 py-6 sm:px-6">
        <div className="mx-auto max-w-2xl w-full space-y-6 pb-16">
          {/* Sub-View A: /settings/notifications */}
          {subView === 'notifications' && (
            <div className="space-y-6">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card">
                    <Bell className="h-4 w-4 text-primary" />
                  </div>

                  <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                    Push-Benachrichtigungen & Erinnerungen
                  </h1>
                </div>

                <p className="text-xs sm:text-sm text-muted-foreground">
                  Erhalte Tip-off Benachrichtigungen für gespeicherte Spiele und verwalte deine Erinnerungen.
                </p>
              </div>

              {/* Push Permission Status Card */}
              <Card className="p-4 sm:p-5 space-y-4 border-border/80 bg-card/60 backdrop-blur-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-bold text-foreground">
                      Web-Push Berechtigung
                    </h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Status der Push-Mitteilungen in deinem Webbrowser.
                    </p>
                  </div>

                  <Badge
                    variant={pushPermission === 'granted' ? 'default' : 'secondary'}
                    className="text-[10px]"
                  >
                    {pushPermission === 'granted'
                      ? 'Aktiviert'
                      : pushPermission === 'denied'
                      ? 'Blockiert'
                      : 'Nicht aktiv'}
                  </Badge>
                </div>

                <div className="rounded-xl border border-border/60 bg-background/50 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div>
                    <span className="font-semibold text-foreground block">
                      Web-Push Status
                    </span>
                    <span className="text-[11px] text-muted-foreground block mt-0.5">
                      {pushPermission === 'granted'
                        ? 'Browser-Benachrichtigungen sind freigeschaltet.'
                        : pushPermission === 'denied'
                        ? 'Benachrichtigungen wurden blockiert. Bitte in den Browser-Website-Einstellungen ändern.'
                        : 'Noch keine Berechtigung für Benachrichtigungen erteilt.'}
                    </span>
                  </div>

                  {pushPermission !== 'granted' && isNotificationSupported() && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleRequestPush}
                      className="shrink-0 text-xs font-medium cursor-pointer"
                    >
                      <Bell className="mr-1.5 h-3.5 w-3.5 text-primary" />
                      Aktivieren
                    </Button>
                  )}
                </div>
              </Card>

              {/* Aktive Spiel-Erinnerungen Section */}
              <Card className="p-4 sm:p-5 space-y-4 border-border/80 bg-card/60 backdrop-blur-sm" data-testid="settings-reminders-section">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-bold text-foreground">
                      Aktive Spiel-Erinnerungen
                    </h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Deine vorgemerkten Spielbenachrichtigungen.
                    </p>
                  </div>

                  <Badge
                    variant="secondary"
                    className={`text-[10px] px-2 py-0 ${
                      reminders.length > 0
                        ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30'
                        : 'text-muted-foreground'
                    }`}
                  >
                    {reminders.length} aktiv
                  </Badge>
                </div>

                {reminders.length === 0 ? (
                  <div className="rounded-xl border border-border/60 bg-background/50 p-3 text-xs text-muted-foreground">
                    <p>Keine aktiven Spiel-Erinnerungen vorhanden.</p>
                    <p className="text-[11px] mt-1 text-muted-foreground/80">
                      Klicke auf das Glocken-Symbol auf einer Spielkarte, um eine Erinnerung zu setzen.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="space-y-2">
                      {reminders.map((r) => (
                        <div
                          key={r.matchId}
                          data-testid={`settings-reminder-${r.matchId}`}
                          className="flex items-center justify-between gap-2 rounded-xl border border-border/60 bg-background/50 p-2.5 text-xs"
                        >
                          <div className="min-w-0 flex-1 space-y-0.5">
                            <div className="font-semibold text-foreground truncate">
                              {r.homeTeamName} vs. {r.guestTeamName}
                            </div>

                            <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 flex-wrap">
                              <span>
                                {formatDisplayDate(r.kickoffDate)} • {formatKickoffTime(r.kickoffTime)}
                              </span>
                              <span className="inline-flex items-center rounded bg-amber-500/15 border border-amber-500/30 px-1.5 py-0 text-[10px] font-mono text-amber-700 dark:text-amber-300">
                                {getLeadTimeLabel(r.leadTime)}
                              </span>
                            </div>

                            {r.venueName && (
                              <div className="text-[10px] text-muted-foreground/80 truncate">
                                {r.venueName}
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              title="In Kalender exportieren (.ics)"
                              aria-label={`Kalenderdatei für ${r.homeTeamName} gegen ${r.guestTeamName} herunterladen`}
                              onClick={() => downloadReminderIcs(r)}
                              className="flex h-7 w-7 items-center justify-center rounded-lg border border-border/60 text-muted-foreground hover:bg-primary/10 hover:text-primary transition cursor-pointer"
                            >
                              <CalendarPlus className="h-3.5 w-3.5" />
                            </button>

                            <button
                              type="button"
                              title="Erinnerung entfernen"
                              aria-label={`Erinnerung für ${r.homeTeamName} gegen ${r.guestTeamName} entfernen`}
                              onClick={() => removeReminder(r.matchId)}
                              className="flex h-7 w-7 items-center justify-center rounded-lg border border-destructive/30 text-destructive hover:bg-destructive/15 transition cursor-pointer"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {reminders.length > 1 && (
                      <button
                        type="button"
                        onClick={clearAllReminders}
                        className="w-full rounded-lg border border-destructive/30 bg-destructive/10 py-1.5 text-[11px] font-semibold text-destructive hover:bg-destructive/20 transition cursor-pointer"
                      >
                        Alle Erinnerungen entfernen
                      </button>
                    )}
                  </div>
                )}
              </Card>
            </div>
          )}

          {/* Sub-View B: /settings/storage */}
          {subView === 'storage' && (
            <div className="space-y-6">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card">
                    <Database className="h-4 w-4 text-primary" />
                  </div>

                  <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                    Speicher & Offline-Cache
                  </h1>
                </div>

                <p className="text-xs sm:text-sm text-muted-foreground">
                  PWA-Cache, Offline-Speicher und ausstehende Kiosk-Meldungen verwalten.
                </p>
              </div>

              {/* Speicherbelegung Card */}
              <Card
                data-testid="settings-storage-usage-card"
                className="p-4 sm:p-5 space-y-4 border-border/80 bg-card/60 backdrop-blur-sm"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-bold text-foreground">
                      Speicherbelegung
                    </h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Übersicht über den lokalen Speicherbedarf im Browser.
                    </p>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleClearCacheAndStorage}
                    disabled={isClearingCache}
                    className="shrink-0 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive text-xs cursor-pointer"
                  >
                    <RotateCcw
                      className={`mr-1.5 h-3.5 w-3.5 ${isClearingCache ? 'animate-spin' : ''}`}
                    />
                    <span>{isClearingCache ? 'Wird geleert...' : 'Cache leeren'}</span>
                  </Button>
                </div>

                {/* Gesamtbelegung Banner */}
                <div className="rounded-xl border border-border/60 bg-background/50 p-4 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-muted-foreground block font-medium">
                      Gesamter lokaler Speicher
                    </span>
                    <span
                      data-testid="storage-total-usage"
                      className="text-2xl font-extrabold font-mono text-foreground tracking-tight"
                    >
                      {storageUsage.formattedTotal}
                    </span>
                  </div>

                  <Badge variant="outline" className="font-mono text-xs">
                    {storageUsage.isLoading ? 'Berechne...' : 'Ermittelt'}
                  </Badge>
                </div>

                {/* Aufschlüsselung */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="rounded-xl border border-border/60 bg-background/50 p-3 space-y-1">
                    <span className="text-muted-foreground block font-medium">
                      Offline- & Karten-Cache (Cache Storage)
                    </span>
                    <div className="flex items-baseline justify-between pt-1">
                      <span className="font-mono font-bold text-sm text-foreground">
                        {storageUsage.formattedCache}
                      </span>
                      <span className="text-[11px] text-muted-foreground font-mono">
                        {storageUsage.cacheEntryCount} Einträge
                      </span>
                    </div>
                  </div>

                  <div className="rounded-xl border border-border/60 bg-background/50 p-3 space-y-1">
                    <span className="text-muted-foreground block font-medium">
                      Lokale Daten & Einstellungen (LocalStorage)
                    </span>
                    <div className="flex items-baseline justify-between pt-1">
                      <span className="font-mono font-bold text-sm text-foreground">
                        {storageUsage.formattedLocalStorage}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        Filter & App-Status
                      </span>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Subsection: Ausstehende Offline-Meldungen */}
              <Card
                data-testid="settings-offline-queue-section"
                className="p-4 sm:p-5 space-y-3.5 border-border/80 bg-card/60 backdrop-blur-sm text-xs"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm font-bold text-foreground">
                        Ausstehende Offline-Meldungen
                      </h2>
                      <Badge
                        variant="secondary"
                        data-testid="offline-queue-count-badge"
                        className="text-[10px] font-mono px-1.5 py-0"
                      >
                        {offlineQueueCount}
                      </Badge>
                    </div>

                    <p className="text-[11px] text-muted-foreground">
                      Kiosk- & Halleninfos, die offline erfasst wurden und synchronisiert werden.
                    </p>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    data-testid="sync-offline-queue-button"
                    onClick={handleSyncOfflineQueue}
                    disabled={offlineQueueCount === 0 || isSyncingOfflineQueue}
                    className="shrink-0 text-xs h-8 cursor-pointer"
                  >
                    <RotateCcw
                      className={`mr-1.5 h-3.5 w-3.5 ${isSyncingOfflineQueue ? 'animate-spin' : ''}`}
                    />
                    <span>
                      {isSyncingOfflineQueue ? 'Wird synchronisiert...' : 'Jetzt synchronisieren'}
                    </span>
                  </Button>
                </div>

                {offlineQueueCount === 0 ? (
                  <div
                    data-testid="offline-queue-empty-state"
                    className="rounded-lg border border-dashed border-border/60 p-3 text-center text-xs text-muted-foreground"
                  >
                    Keine ausstehenden Offline-Meldungen vorhanden. Alle Kiosk- und Hallen-Infos sind synchronisiert.
                  </div>
                ) : (
                  <div className="space-y-2 pt-1" data-testid="offline-queue-list">
                    {offlineQueue.map((item) => (
                      <div
                        key={item.matchId}
                        data-testid="offline-queue-item"
                        className="flex items-start justify-between gap-3 rounded-lg border border-border/60 bg-background/50 p-2.5 text-xs"
                      >
                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="font-semibold text-foreground truncate">
                            {item.matchTitle}
                          </div>

                          {item.venueName && (
                            <div className="text-[11px] text-muted-foreground truncate">
                              📍 {item.venueName}
                            </div>
                          )}

                          <div className="flex flex-wrap gap-1.5 pt-0.5 text-[10px]">
                            {item.payload.admissionFee && (
                              <span className="rounded bg-muted px-1.5 py-0.5 text-muted-foreground">
                                🎟️ {item.payload.admissionFee}
                              </span>
                            )}

                            {item.payload.kioskDescription && (
                              <span className="rounded bg-muted px-1.5 py-0.5 text-muted-foreground">
                                ☕ {item.payload.kioskDescription}
                              </span>
                            )}

                            {item.payload.parkingNotes && (
                              <span className="rounded bg-muted px-1.5 py-0.5 text-muted-foreground">
                                🅿️ {item.payload.parkingNotes}
                              </span>
                            )}

                            {item.retryCount > 0 && (
                              <span className="rounded bg-amber-500/15 text-amber-800 dark:text-amber-300 px-1.5 py-0.5">
                                {item.retryCount} Fehlversuch{item.retryCount > 1 ? 'e' : ''}
                              </span>
                            )}
                          </div>
                        </div>

                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          data-testid="discard-queue-item-button"
                          onClick={() => {
                            removeOfflineSubmission(item.matchId);
                            showToast('Offline-Meldung verworfen.');
                          }}
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive shrink-0 cursor-pointer"
                          title="Offline-Meldung verwerfen"
                          aria-label="Offline-Meldung verwerfen"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          )}

          {/* Sub-View C: /settings/system */}
          {subView === 'system' && (
            <div className="space-y-6">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card">
                    <Monitor className="h-4 w-4 text-primary" />
                  </div>

                  <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                    System, Diagnose & Über DBB-Sync
                  </h1>
                </div>

                <p className="text-xs sm:text-sm text-muted-foreground">
                  Laufzeit-Statistiken, Versionsstände, DBB-Sync und Systemstatus in einer Übersicht.
                </p>
              </div>

              <SystemDiagnosticsSection
                mapEngine="MapLibre GL"
                radiusKm={radiusKm}
                locationName={locationName}
                masterPoolCount={masterPoolCount}
                filteredMatchesCount={filteredMatchesCount}
                lastSyncedAt={lastSyncedAt}
                alwaysExpanded
              />
            </div>
          )}

          {/* Main Dense Hub: /settings */}
          {subView === null && (
            <div className="space-y-6">
              {/* Page Title & Intro */}
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card">
                    <Settings className="h-4 w-4 text-primary" />
                  </div>

                  <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                    Einstellungen & Optionen
                  </h1>
                </div>

                <p className="text-xs sm:text-sm text-muted-foreground">
                  App-Optionen, Push-Benachrichtigungen, Offline-Speicher und Systemdiagnose.
                </p>
              </div>

              {/* Card 1: Dense Single-Card Direct App Options */}
              <Card className="border-border/80 bg-card/60 backdrop-blur-sm divide-y divide-border/50 overflow-hidden shadow-xs">
                {/* 1. Erscheinungsbild */}
                <div className="flex items-center justify-between p-3.5 sm:p-4 gap-3">
                  <div className="flex items-center gap-2.5 text-xs sm:text-sm font-medium text-foreground">
                    <Sun className="h-4 w-4 text-primary shrink-0" />
                    <span>Erscheinungsbild</span>
                  </div>

                  <div
                    role="radiogroup"
                    aria-label="Farbschema auswählen"
                    className="inline-flex items-center rounded-lg bg-muted/60 p-0.5 border border-border/50 shrink-0"
                  >
                    <button
                      type="button"
                      role="radio"
                      aria-checked={theme === 'system'}
                      data-testid="theme-system"
                      onClick={() => setTheme('system')}
                      className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold transition cursor-pointer ${
                        theme === 'system'
                          ? 'bg-card text-foreground shadow-xs'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <Laptop className="h-3.5 w-3.5" />
                      <span>System</span>
                    </button>

                    <button
                      type="button"
                      role="radio"
                      aria-checked={theme === 'light'}
                      data-testid="theme-light"
                      onClick={() => setTheme('light')}
                      className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold transition cursor-pointer ${
                        theme === 'light'
                          ? 'bg-card text-foreground shadow-xs'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <Sun className="h-3.5 w-3.5" />
                      <span>Hell</span>
                    </button>

                    <button
                      type="button"
                      role="radio"
                      aria-checked={theme === 'dark'}
                      data-testid="theme-dark"
                      onClick={() => setTheme('dark')}
                      className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold transition cursor-pointer ${
                        theme === 'dark'
                          ? 'bg-card text-foreground shadow-xs'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <Moon className="h-3.5 w-3.5" />
                      <span>Dunkel</span>
                    </button>
                  </div>
                </div>

                {/* 2. Standard-Ansicht */}
                <div className="flex items-center justify-between p-3.5 sm:p-4 gap-3">
                  <div className="flex items-center gap-2.5 text-xs sm:text-sm font-medium text-foreground">
                    <MapIcon className="h-4 w-4 text-primary shrink-0" />
                    <span>Standard-Ansicht</span>
                  </div>

                  <div
                    role="group"
                    aria-label="Standard-Ansicht auswählen"
                    className="inline-flex items-center rounded-lg bg-muted/60 p-0.5 border border-border/50 shrink-0"
                  >
                    <button
                      type="button"
                      aria-label="Kartenansicht"
                      aria-pressed={viewMode === 'map'}
                      onClick={() => onViewModeChange('map')}
                      className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold transition cursor-pointer ${
                        viewMode === 'map'
                          ? 'bg-card text-foreground shadow-xs'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <MapIcon className="h-3.5 w-3.5" />
                      <span>Kartenansicht</span>
                    </button>

                    <button
                      type="button"
                      aria-label="Listenansicht"
                      aria-pressed={viewMode === 'list'}
                      onClick={() => onViewModeChange('list')}
                      className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold transition cursor-pointer ${
                        viewMode === 'list'
                          ? 'bg-card text-foreground shadow-xs'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <List className="h-3.5 w-3.5" />
                      <span>Listenansicht</span>
                    </button>
                  </div>
                </div>

                {/* 3. Suchradius auf Karte */}
                <div className="flex items-center justify-between p-3.5 sm:p-4 gap-3">
                  <div className="flex items-center gap-2.5 text-xs sm:text-sm font-medium text-foreground">
                    <CircleDot className="h-4 w-4 text-primary shrink-0" />
                    <span>Suchradius-Kreis anzeigen</span>
                  </div>

                  <button
                    type="button"
                    role="switch"
                    aria-label="Suchradius auf Karte anzeigen"
                    aria-checked={showRadiusCircle}
                    onClick={() => onToggleRadiusCircle(!showRadiusCircle)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      showRadiusCircle ? 'bg-primary' : 'bg-muted'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                        showRadiusCircle ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* 4. App-Installation */}
                <div
                  data-testid="settings-pwa-install-section"
                  className="flex items-center justify-between p-3.5 sm:p-4 gap-3"
                >
                  <div className="flex items-center gap-2.5 text-xs sm:text-sm font-medium text-foreground">
                    <Smartphone className="h-4 w-4 text-primary shrink-0" />
                    <span>App-Installation</span>
                  </div>

                  <div className="shrink-0">
                    {isStandalone ? (
                      <Badge
                        variant="outline"
                        className="text-[11px] font-medium border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      >
                        <Check className="mr-1 h-3 w-3" />
                        Als App installiert ✓
                      </Badge>
                    ) : canPromptInstall ? (
                      <Button
                        type="button"
                        size="sm"
                        data-testid="settings-pwa-install-btn"
                        onClick={() => triggerInstall()}
                        className="h-8 text-xs font-semibold gap-1.5 cursor-pointer"
                      >
                        <Download className="h-3.5 w-3.5" />
                        <span>App installieren</span>
                      </Button>
                    ) : isIosSafari ? (
                      <Badge
                        variant="outline"
                        className="text-[11px] font-medium border-primary/30 bg-primary/10 text-primary"
                      >
                        <Share className="mr-1 h-3 w-3" />
                        Teilen ➔ Zum Home-Bildschirm
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[11px] text-muted-foreground">
                        Im Browser-Menü verfügbar
                      </Badge>
                    )}
                  </div>
                </div>
              </Card>

              {/* Card 2: 3 Drill-Down Navigation Rows */}
              <Card className="border-border/80 bg-card/60 backdrop-blur-sm divide-y divide-border/50 overflow-hidden shadow-xs">
                {/* Row 1: Push-Benachrichtigungen & Erinnerungen */}
                <button
                  type="button"
                  data-testid="settings-nav-notifications"
                  onClick={() => handleNavigate('/settings/notifications')}
                  className="w-full flex items-center justify-between p-3.5 sm:p-4 text-left transition hover:bg-muted/40 cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-card">
                      <Bell className="h-4 w-4 text-primary" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="text-xs sm:text-sm font-semibold text-foreground truncate">
                        Push-Benachrichtigungen & Erinnerungen
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <Badge
                      variant="secondary"
                      className={`text-[10px] ${
                        reminders.length > 0
                          ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30'
                          : pushPermission === 'granted'
                          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                          : 'text-muted-foreground'
                      }`}
                    >
                      {reminders.length > 0
                        ? `${reminders.length} aktiv`
                        : pushPermission === 'granted'
                        ? 'Aktiviert'
                        : pushPermission === 'denied'
                        ? 'Blockiert'
                        : 'Nicht aktiv'}
                    </Badge>

                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </button>

                {/* Row 2: Speicher & Offline-Cache */}
                <button
                  type="button"
                  data-testid="settings-nav-storage"
                  onClick={() => handleNavigate('/settings/storage')}
                  className="w-full flex items-center justify-between p-3.5 sm:p-4 text-left transition hover:bg-muted/40 cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-card">
                      <Database className="h-4 w-4 text-primary" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="text-xs sm:text-sm font-semibold text-foreground truncate">
                        Speicher & Offline-Cache
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <Badge variant="outline" className="font-mono text-[10px]">
                      {storageUsage.formattedTotal}
                      {offlineQueueCount > 0 ? ` • ${offlineQueueCount} offline` : ''}
                    </Badge>

                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </button>

                {/* Row 3: System & Diagnose */}
                <button
                  type="button"
                  data-testid="settings-nav-system"
                  onClick={() => handleNavigate('/settings/system')}
                  className="w-full flex items-center justify-between p-3.5 sm:p-4 text-left transition hover:bg-muted/40 cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-card">
                      <Monitor className="h-4 w-4 text-primary" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="text-xs sm:text-sm font-semibold text-foreground truncate">
                        System & Diagnose
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <Badge variant="outline" className="font-mono text-[10px]">
                      v{frontendVersion} • {isOnline ? 'Online' : 'Offline'}
                    </Badge>

                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </button>
              </Card>

              {/* Hallenkaffee Callout Box */}
              <Card className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 sm:p-4 text-xs space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg leading-none" role="img" aria-hidden="true">
                    ☕
                  </span>
                  <span className="font-bold text-amber-800 dark:text-amber-300">
                    Unterstütze HeimspielRadar mit einem Hallenkaffee
                  </span>
                </div>

                <p className="text-[11px] text-amber-900/90 dark:text-amber-200/80 leading-relaxed">
                  HeimspielRadar ist zu 100% gemeinnützig, werbefrei und quelloffen. Mit deiner Unterstützung hilfst du direkt, die laufenden Server- und Domainkosten zu decken.
                </p>

                <a
                  href={DONATION_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/40 bg-amber-500/15 px-3 py-1.5 text-xs font-semibold text-amber-900 dark:text-amber-200 transition hover:bg-amber-500/25"
                >
                  <span>Hallenkaffee spendieren</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </Card>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
