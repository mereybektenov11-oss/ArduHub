import { ru } from "@/content/ru";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Hero from "@/components/sections/Hero";
import Stats from "@/components/sections/Stats";
import Features from "@/components/sections/Features";
import HowItWorks from "@/components/sections/HowItWorks";
import SchemeBank from "@/components/sections/SchemeBank";
import Modes from "@/components/sections/Modes";
import Topics from "@/components/sections/Topics";
import Pricing from "@/components/sections/Pricing";
import Faq from "@/components/sections/Faq";
import FinalCta from "@/components/sections/FinalCta";
import AnchorScroll from "@/components/ui/AnchorScroll";
import DeferredMotion from "@/components/ui/DeferredMotion";
import HeroBackground from "@/components/sections/HeroBackground";
import ProductDemo from "@/components/sections/ProductDemo";
import "./landing-cobalt.css";
export default function Home() {
  return (
    <div className="landing-cobalt">
      <link
        rel="preload"
        as="image"
        href="/images/landing/cobalt/uno-256.webp"
        media="(max-width: 767px)"
        fetchPriority="high"
      />
      <link
        rel="preload"
        as="image"
        href="/images/landing/cobalt/uno-640.webp"
        media="(min-width: 768px)"
        fetchPriority="high"
      />
      <AnchorScroll />
      <a className="skip-link" href="#main">
        {ru.ui.skip}
      </a>
      <Header />
      <DeferredMotion>
        <main id="main">
          <Hero background={<HeroBackground />} />
          <ProductDemo />
          <Stats />
          <Features />
          <HowItWorks />
          <SchemeBank />
          <Modes />
          <Topics />
          <Pricing />
          <Faq />
          <FinalCta />
        </main>
      </DeferredMotion>
      <Footer />
    </div>
  );
}
