import * as React from 'react';
import type { Match } from '@sundayleague/shared-types';
import { useOverlay } from '@/router';
import { GameReminderDialog } from './GameReminderDialog';
import { KioskSubmissionModal } from './KioskSubmissionModal';
import { TopMatchInfoModal } from './TopMatchInfoModal';

export interface MatchDialogContextValue {
  openKioskModal: (match: Match) => void;
  openTopMatchModal: (match: Match) => void;
  openReminderModal: (match: Match) => void;
  showToast: (message: string) => void;
  isAnyDialogOpen: boolean;
  registerKioskSuccessListener: (
    callback: (message: string) => void,
  ) => () => void;
}

const DEFAULT_MATCH_DIALOG_CONTEXT: MatchDialogContextValue = {
  openKioskModal: () => {},
  openTopMatchModal: () => {},
  openReminderModal: () => {},
  showToast: () => {},
  isAnyDialogOpen: false,
  registerKioskSuccessListener: () => () => {},
};

export const MatchDialogContext =
  React.createContext<MatchDialogContextValue | null>(null);

export interface MatchDialogProviderProps {
  children: React.ReactNode;
}

export function MatchDialogProvider({ children }: MatchDialogProviderProps) {
  const [kioskMatch, setKioskMatch] = React.useState<Match | null>(null);
  const [topMatch, setTopMatch] = React.useState<Match | null>(null);
  const [reminderMatch, setReminderMatch] = React.useState<Match | null>(null);
  const [toastMessage, setToastMessage] = React.useState<string | null>(null);

  const listenersRef = React.useRef<Set<(message: string) => void>>(new Set());
  const toastTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const { requestClose: closeKioskOverlay } = useOverlay({
    id: 'kiosk-modal',
    type: 'kiosk-modal',
    isOpen: kioskMatch !== null,
    onClose: () => setKioskMatch(null),
  });

  const { requestClose: closeTopMatchOverlay } = useOverlay({
    id: 'top-match-modal',
    type: 'top-match-modal',
    isOpen: topMatch !== null,
    onClose: () => setTopMatch(null),
  });

  const { requestClose: closeReminderOverlay } = useOverlay({
    id: 'reminder-modal',
    type: 'reminder-modal',
    isOpen: reminderMatch !== null,
    onClose: () => setReminderMatch(null),
  });

  const closeKioskModal = React.useCallback(() => {
    closeKioskOverlay();
    setKioskMatch(null);
  }, [closeKioskOverlay]);

  const closeTopMatchModal = React.useCallback(() => {
    closeTopMatchOverlay();
    setTopMatch(null);
  }, [closeTopMatchOverlay]);

  const closeReminderModal = React.useCallback(() => {
    closeReminderOverlay();
    setReminderMatch(null);
  }, [closeReminderOverlay]);

  const openKioskModal = React.useCallback((match: Match) => {
    setKioskMatch(match);
  }, []);

  const openTopMatchModal = React.useCallback((match: Match) => {
    setTopMatch(match);
  }, []);

  const openReminderModal = React.useCallback((match: Match) => {
    setReminderMatch(match);
  }, []);

  const showToast = React.useCallback((message: string) => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }

    setToastMessage(message);

    toastTimerRef.current = setTimeout(() => {
      setToastMessage(null);
      toastTimerRef.current = null;
    }, 5000);
  }, []);

  React.useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  const registerKioskSuccessListener = React.useCallback(
    (callback: (message: string) => void) => {
      listenersRef.current.add(callback);

      return () => {
        listenersRef.current.delete(callback);
      };
    },
    [],
  );

  const handleKioskSuccess = React.useCallback(
    (message: string) => {
      showToast(message);

      for (const listener of listenersRef.current) {
        listener(message);
      }
    },
    [showToast],
  );

  const isAnyDialogOpen =
    kioskMatch !== null || topMatch !== null || reminderMatch !== null;

  const contextValue = React.useMemo<MatchDialogContextValue>(
    () => ({
      openKioskModal,
      openTopMatchModal,
      openReminderModal,
      showToast,
      isAnyDialogOpen,
      registerKioskSuccessListener,
    }),
    [
      openKioskModal,
      openTopMatchModal,
      openReminderModal,
      showToast,
      isAnyDialogOpen,
      registerKioskSuccessListener,
    ],
  );

  return (
    <MatchDialogContext.Provider value={contextValue}>
      {children}

      <KioskSubmissionModal
        match={kioskMatch}
        isOpen={kioskMatch !== null}
        onClose={closeKioskModal}
        onSuccess={handleKioskSuccess}
      />

      <TopMatchInfoModal
        match={topMatch}
        isOpen={topMatch !== null}
        onClose={closeTopMatchModal}
      />

      <GameReminderDialog
        match={reminderMatch}
        isOpen={reminderMatch !== null}
        onClose={closeReminderModal}
        onFeedback={showToast}
      />

      {toastMessage && (
        <div
          role="status"
          className="fixed bottom-20 left-1/2 z-70 -translate-x-1/2 flex items-center gap-2 rounded-lg border border-border/80 bg-background/95 px-4 py-2 text-xs text-foreground shadow-lg backdrop-blur-md"
        >
          <span>{toastMessage}</span>
          <button
            type="button"
            onClick={() => {
              if (toastTimerRef.current) {
                clearTimeout(toastTimerRef.current);
                toastTimerRef.current = null;
              }

              setToastMessage(null);
            }}
            className="ml-2 text-muted-foreground hover:text-foreground text-xs"
            aria-label="Schließen"
          >
            ✕
          </button>
        </div>
      )}
    </MatchDialogContext.Provider>
  );
}

export function useMatchDialog(): MatchDialogContextValue {
  const context = React.useContext(MatchDialogContext);

  if (!context) {
    return DEFAULT_MATCH_DIALOG_CONTEXT;
  }

  return context;
}

export function useOnKioskSubmissionSuccess(
  callback: (message: string) => void,
): void {
  const { registerKioskSuccessListener } = useMatchDialog();
  const callbackRef = React.useRef(callback);

  React.useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  React.useEffect(() => {
    return registerKioskSuccessListener((message) => {
      callbackRef.current(message);
    });
  }, [registerKioskSuccessListener]);
}
