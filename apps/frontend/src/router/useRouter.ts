import * as React from 'react';
import { RouterContext } from './RouterContext';
import type { AppRouterContextValue } from './types';

export function useRouter(): AppRouterContextValue {
  const context = React.useContext(RouterContext);

  if (!context) {
    throw new Error('useRouter must be used within a RouterProvider');
  }

  return context;
}
