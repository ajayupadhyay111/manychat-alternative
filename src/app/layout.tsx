import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AutoDM - Instagram Auto DM",
  description: "Automatically send DMs when someone comments on your Instagram reels",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
