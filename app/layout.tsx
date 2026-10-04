import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lingayat Shadi | Free Lingayat Matrimony",
  description: "Find a meaningful connection in the Hindu Lingayat community. Free matrimonial profiles, subcommunity preferences, and English–Marathi support.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
