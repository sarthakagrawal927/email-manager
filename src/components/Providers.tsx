"use client";

import { AnalyticsProvider } from "@/components/posthog-provider";

export function Providers({ children }: { children: React.ReactNode }) {
  return <AnalyticsProvider>{children}</AnalyticsProvider>;
}
