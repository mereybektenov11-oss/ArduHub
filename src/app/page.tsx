import { ru } from "@/content/ru";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Hero from "@/components/sections/Hero";
import Faq from "@/components/sections/Faq";
import AnchorScroll from "@/components/ui/AnchorScroll";
import DotBackdrop from "@/components/landing/DotBackdrop";
import {
  MainVideo,
  VideoFeatures,
  LearningBenefits,
  VideoFinalCta,
} from "@/components/landing/VideoLanding";
import "./landing-video.css";
export default function Home() {
  return (
    <div className="landing-cobalt landing-video">
      <AnchorScroll />
      <a className="skip-link" href="#main">
        {ru.ui.skip}
      </a>
      <Header />
      <main id="main">
        <Hero background={<DotBackdrop />} />
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
