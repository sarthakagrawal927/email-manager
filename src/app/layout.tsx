import "./globals.css";
import type { Metadata } from "next";
import { AnalyticsProvider } from "@/components/posthog-provider";
import { Providers } from "@/components/Providers";
import { SaasMakerAnalytics } from "@/components/SaasMakerAnalytics";
import { SaaSMakerFeedback } from "@/components/saasmaker-feedback";

export const metadata: Metadata = {
  title: "Email Manager",
  description: "Read and analyze your Gmail inbox",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AnalyticsProvider>
          <SaasMakerAnalytics />
          <SaaSMakerFeedback />
          <Providers>{children}</Providers>
        </AnalyticsProvider>
      </body>
    </html>
  );
}
