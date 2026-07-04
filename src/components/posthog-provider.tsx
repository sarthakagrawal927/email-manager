'use client';

import posthog from 'posthog-js';
import { PostHogProvider } from 'posthog-js/react';
import { useEffect } from 'react';

import {
  ensurePostHogInitialized,
  installBrowserMonitoring,
  isPostHogEnabled,
} from '@/lib/foundry-monitoring';

ensurePostHogInitialized();

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    return installBrowserMonitoring();
  }, []);

  if (!isPostHogEnabled()) {
    return <>{children}</>;
  }

  return <PostHogProvider client={posthog}>{children}</PostHogProvider>;
}
