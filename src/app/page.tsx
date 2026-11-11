import localFont from "next/font/local";
import { ru } from "@/content/ru";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Hero from "@/components/sections/Hero";
import Faq from "@/components/sections/Faq";
import AnchorScroll from "@/components/ui/AnchorScroll";
import CodeBackdrop from "@/components/landing/CodeBackdrop";
import {
  MainVideo,
  VideoFeatures,
  LearningBenefits,
  VideoFinalCta,
} from "@/components/landing/VideoLanding";
import "./landing-video.css";
import "./glass-buttons.css";

const vt323 = localFont({
  src: "../fonts/VT323-Regular.woff2",
  weight: "400",
  display: "swap",
  preload: false,
  adjustFontFallback: false,
  variable: "--font-vt323",
});

const monocraft = localFont({
  src: "../fonts/Monocraft-Regular.woff2",
  weight: "400",
  display: "swap",
  preload: false,
  adjustFontFallback: false,
  variable: "--font-monocraft",
});

export default function Home() {
  return (
    <div
      className={`landing-cobalt landing-video ${vt323.variable} ${monocraft.variable}`}
    >
      <AnchorScroll />
      <a className="skip-link" href="#main">
        {ru.ui.skip}
      </a>
      <Header />
      <main id="main">
        <Hero background={<CodeBackdrop />} />
        <MainVideo />
        <VideoFeatures />
        <LearningBenefits />
        <Faq />
        <VideoFinalCta />
      </main>
      <Footer videoLanding />
    </div>
  );
}
