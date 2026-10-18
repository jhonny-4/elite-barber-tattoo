import { Header, Footer } from "../components/shell";
import { Gallery } from "../components/gallery";
import { Reveal } from "../components/reveal";
import { LocationMap } from "../components/location-map";
import { HomeHero } from "../components/home/hero";
import { HomeMarquee } from "../components/home/marquee";
import { HomeAbout } from "../components/home/about";
import { HomeServices } from "../components/home/services";
import { HomeBarbershop } from "../components/home/barbershop";
import { HomeArtist } from "../components/home/artist";
import { HomeTeam } from "../components/home/team";
import { HomeBookingInvite } from "../components/home/booking-invite";
import { HomeMotion } from "../components/motion/home-motion";
import { HoverTilt } from "../components/motion/hover-tilt";

export default function Home() {
  return (
    <>
      <Header />
      <main id="main" className="home-page">
        <HomeHero />
        <HomeMarquee />
        <HomeAbout />
        <HomeServices />
        <HomeBarbershop />
        <Gallery />
        <HomeArtist />
        <HomeTeam />
        <HomeBookingInvite />
        <LocationMap />
      </main>
      <Footer />
      {/* Movimiento: revelados genéricos (data-reveal), coreografía GSAP e inclinación. */}
      <Reveal />
      <HomeMotion />
      <HoverTilt />
    </>
  );
}
