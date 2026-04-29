import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Heads Up — CS Operating Dashboard",
  description: "PLG Customer Success Dashboard v2.0 (Draft)",
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
