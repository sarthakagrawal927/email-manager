import "./globals.css";
import type { Metadata } from "next";
import { Providers } from "@/components/Providers";
import { SaasMakerAnalytics } from "@/components/SaasMakerAnalytics";

export const metadata: Metadata = {
  title: "Email Manager",
  description: "Read and analyze your Gmail inbox",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SaasMakerAnalytics />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
