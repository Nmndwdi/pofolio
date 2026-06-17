import type { Metadata } from "next";
import {
  Inter,
  JetBrains_Mono,
  Instrument_Serif,
  Archivo_Black,
  Space_Grotesk,
} from "next/font/google";
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

// Brutalist display: Archivo Black is the canonical 2020s neo-brutalism face
// — thick weight, geometric grotesk, no apologies. Variable is consumed only
// by the brutalist template's scoped CSS.
const display = Archivo_Black({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-display",
  display: "swap",
});

// Brutalist body face: Space Grotesk pairs with Archivo Black at body weights
// — geometric, distinctive, never reads as a sans-serif default. Used by the
// brutalist template (and likely other future templates).
const grotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-grotesk",
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
    process.env.NEXT_PUBLIC_APP_URL ?? "https://pofoliox.vercel.app/",
  ),
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        // suppressHydrationWarning silences mismatches caused by browser
        // extensions (Edge's autofill / password managers / Grammarly etc.)
        // that inject attributes like `fdprocessedid` into form elements
        // before React hydrates. These are outside React's control and
        // produce noisy false-positive warnings.
        suppressHydrationWarning
        className={`${sans.variable} ${mono.variable} ${serif.variable} ${display.variable} ${grotesk.variable} font-sans`}
      >
        {children}
        <Toaster richColors position="bottom-right" />
      </body>
    </html>
  );
}