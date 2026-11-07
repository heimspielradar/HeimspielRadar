import * as React from 'react';
import {
  createAppRouter,
  type AppRouterController,
  type AppRouterControllerOptions,
} from './router-controller';
import type { AppRouterContextValue, Route } from './types';

export const RouterContext = React.createContext<AppRouterContextValue | null>(null);

export interface RouterProviderProps extends AppRouterControllerOptions {
  children: React.ReactNode;
}

export function RouterProvider({
  children,
  initialPath,
  initialSearch,
  windowAdapter,
}: RouterProviderProps) {
  const routerRef = React.useRef<AppRouterController | null>(null);

  if (!routerRef.current) {
    routerRef.current = createAppRouter({
      initialPath,
      initialSearch,
      windowAdapter,
    });
  }

  const router = routerRef.current;

  const [route, setRoute] = React.useState<Route>(() => router.getRoute());

  const [currentPath, setCurrentPath] = React.useState<string>(() =>
    router.getCurrentPath(),
  );

  React.useEffect(() => {
    router.init();

    const unsubscribe = router.subscribe(() => {
      setRoute(router.getRoute());
      setCurrentPath(router.getCurrentPath());
    });

    return () => {
      unsubscribe();
      router.destroy();
    };
  }, [router]);

  const contextValue = React.useMemo<AppRouterContextValue>(
    () => ({
      route,
      currentPath,
      navigate: router.navigate,
      back: router.back,
      openOverlay: router.openOverlay,
      closeOverlay: router.closeOverlay,
      hasActiveOverlay: router.hasActiveOverlay,
    }),
    [route, currentPath, router],
  );

  return (
    <RouterContext.Provider value={contextValue}>
      {children}
    </RouterContext.Provider>
  );
}
