import type { Metadata } from "next";
import localFont from "next/font/local";
import Script from "next/script";
import { siteUrl } from "@/lib/site";
import { ru } from "@/content/ru";
import { motionCssVars } from "@/lib/motion";
import GlassFilters from "@/components/ui/GlassFilters";
import "./globals.css";

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
        className={`${inter.variable} ${manrope.variable} antialiased`}
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
