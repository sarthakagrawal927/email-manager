import "./globals.css";
import type { Metadata } from "next";
import { Providers } from "@/components/Providers";

const SITE_URL = "https://email-manager.sarthakagrawal927.workers.dev";
const SITE_DESCRIPTION =
  "A read-only Gmail cockpit. Triage by sender behavior, search semantically in-browser, and export Gmail filters — your messages never leave your browser.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Kinetic — Triage Gmail without giving up control",
    template: "%s — Kinetic",
  },
  description: SITE_DESCRIPTION,
  applicationName: "Kinetic",
  keywords: [
    "Gmail triage",
    "email filters",
    "inbox cleanup",
    "semantic email search",
  ],
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: "Kinetic",
    title: "Kinetic — Triage Gmail without giving up control",
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: "Kinetic — Triage Gmail without giving up control",
    description: SITE_DESCRIPTION,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
