import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Snailon — confirm every COD order in under 5 minutes",
  description:
    "AI confirmation engine + multi-carrier shipping for cash-on-delivery commerce. Built for Morocco. Built for speed.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
