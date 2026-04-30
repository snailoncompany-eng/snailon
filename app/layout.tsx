import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://snailon.com"),
  title: {
    default: "Snailon — Your Orders Confirm Themselves",
    template: "%s | Snailon",
  },
  description:
    "Snailon confirms every WhatsApp COD order in under 5 minutes — in Darija, Arabic, or French. Built for Moroccan e-commerce. Pay only per shipped order.",
  keywords: [
    "WhatsApp order confirmation",
    "COD Maroc",
    "e-commerce Maroc",
    "confirmation commande automatique",
    "AI WhatsApp Morocco",
    "Darija chatbot",
    "livraison Maroc",
    "Snailon",
  ],
  authors: [{ name: "Snailon", url: "https://snailon.com" }],
  creator: "Snailon",
  openGraph: {
    title: "Snailon — Your Orders Confirm Themselves",
    description:
      "AI that confirms every COD order on WhatsApp in under 5 minutes. Built for Moroccan e-commerce. Pay only per shipped order.",
    url: "https://snailon.com",
    siteName: "Snailon",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Snailon — AI WhatsApp order confirmation for Moroccan e-commerce",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Snailon — Your Orders Confirm Themselves",
    description:
      "AI that confirms every COD order on WhatsApp in under 5 minutes. Moroccan e-commerce, pay per shipped order.",
    images: ["/og-image.png"],
  },
  robots: { index: true, follow: true },
  icons: { icon: "/favicon.ico" },
  alternates: { canonical: "https://snailon.com" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans antialiased bg-white text-neutral-900">
        {children}
      </body>
    </html>
  );
}
