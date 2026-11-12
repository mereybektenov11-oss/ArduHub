import type { Metadata } from "next";
import localFont from "next/font/local";
import Script from "next/script";
import { siteUrl } from "@/lib/site";
import { ru } from "@/content/ru";
import { motionCssVars } from "@/lib/motion";
import GlassFilters from "@/components/ui/GlassFilters";
import "./globals.css";
import "./texture-button.css";

const inter = localFont({
  src: "../fonts/Inter-Variable.woff2",
  weight: "400 700",
  preload: false,
  display: "swap",
  variable: "--font-inter",
});

const manrope = localFont({
  src: "../fonts/Manrope-Variable.woff2",
  weight: "700 800",
  display: "swap",
  variable: "--font-manrope",
});

// Geist (from the `geist` package). Same options as `geist/font/sans`, but
// loaded here: in this checkout node_modules lives on another drive, and the
// package's own localFont call cannot resolve its font across drives.
const geistSans = localFont({
  src: "../../node_modules/geist/dist/fonts/geist-sans/Geist-Variable.woff2",
  weight: "100 900",
  display: "swap",
  variable: "--font-geist-sans",
});

// Neuralese display serif. The file is a variable Cyrillic+Latin subset
// (wght 400–800); headings use it at 500.
const ebGaramond = localFont({
  src: "../fonts/EBGaramond-Cyrillic.woff2",
  weight: "400 800",
  display: "swap",
  adjustFontFallback: "Times New Roman",
  variable: "--font-eb-garamond",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: ru.meta.title,
  description: ru.meta.description,
  robots: { index: Boolean(process.env.SITE_URL), follow: true },
  alternates: { canonical: "/" },
  openGraph: {
    title: ru.meta.title,
    description: ru.meta.description,
    locale: "ru_RU",
    type: "website",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: ru.meta.title }],
  },
  twitter: {
    card: "summary_large_image",
    title: ru.meta.title,
    description: ru.meta.description,
    images: ["/og.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru">
      <body
        className={`${inter.variable} ${manrope.variable} ${geistSans.variable} ${ebGaramond.variable} antialiased`}
        style={motionCssVars}
      >
        <GlassFilters />
        {children}
        {process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === "true" && (
          <Script
            src="/_vercel/insights/script.js"
            strategy="afterInteractive"
          />
        )}
      </body>
    </html>
  );
}
