import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Instrument_Serif } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

// next/font self-hosts Google Fonts at build time — no FOUT, no privacy issues,
// no extra network request. The CSS variables here are wired to tailwind.config.ts.
const sans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

// Editorial display face for the marketing page. Italic forms in Instrument
// Serif are particularly characterful — used in headings via the .italic class.
const serif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-serif",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Pofolio — Your portfolio, always live.",
    template: "%s · Pofolio",
  },
  description:
    "A live portfolio at one permanent URL. Auto-fetched from GitHub, Codeforces, LeetCode and more. Share it via QR or link.",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  ),
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${sans.variable} ${mono.variable} ${serif.variable} font-sans`}>
        {children}
        <Toaster richColors position="bottom-right" />
      </body>
    </html>
  );
}
