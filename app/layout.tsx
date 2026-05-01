import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Snailon — confirm every COD order in under 5 minutes",
  description:
    "AI WhatsApp confirmation + multi-carrier shipping for cash-on-delivery commerce in Morocco. 5 MAD per confirmed order. Pay only for results.",
  metadataBase: new URL("https://snailon.com"),
  openGraph: {
    title: "Snailon — the financial OS for COD commerce",
    description:
      "Stop losing 50% of your COD orders to bad confirmations. Snailon's AI WhatsApps every customer in Darija and confirms in under 5 minutes.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#FAFAF7",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
