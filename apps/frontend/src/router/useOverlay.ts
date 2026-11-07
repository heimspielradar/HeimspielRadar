import * as React from 'react';
import { useRouter } from './useRouter';
import type { OverlayType } from './types';

export interface UseOverlayOptions {
  id: string;
  type: OverlayType;
  isOpen: boolean;
  onClose: () => void;
  url?: string;
}

/**
 * Deep hook that registers a bottom sheet, drawer, or modal with the router's
 * history stack. When the user presses the Android hardware Back button or
 * browser Back gesture, the topmost active overlay is dismissed back to the base
 * view instead of closing or exiting the application.
 */
export function useOverlay({ id, type, isOpen, onClose, url }: UseOverlayOptions) {
  const router = useRouter();
  const onCloseRef = React.useRef(onClose);

  React.useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  React.useEffect(() => {
    if (!isOpen) {
      return;
    }

    const unregister = router.openOverlay({
      id,
      type,
      url,
      onClose: () => {
        onCloseRef.current();
      },
    });

    return () => {
      unregister();
    };
  }, [id, type, isOpen, url, router]);

  const requestClose = React.useCallback(() => {
    router.closeOverlay(id);
  }, [router, id]);

  return {
    requestClose,
  };
}
