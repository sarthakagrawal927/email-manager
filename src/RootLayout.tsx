import { Outlet } from 'react-router-dom';

import { Providers } from '@/components/Providers';
import { ErrorBoundary } from '@/components/ErrorBoundary';

export function RootLayout() {
  return (
    <Providers>
      <ErrorBoundary>
        <Outlet />
      </ErrorBoundary>
    </Providers>
  );
}
