import { Header, Footer } from "../components/shell";
import { BrandIntro } from "../components/brand-intro";
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
import { HomeReviews } from "../components/home/reviews";
import { HomeBookingInvite } from "../components/home/booking-invite";
import { HomeMotion } from "../components/motion/home-motion";
import { HoverTilt } from "../components/motion/hover-tilt";
import { HeroDepth } from "../components/motion/hero-depth";
import { ButtonFx } from "../components/motion/button-fx";

// Las reseñas aprobadas se refrescan cada 5 minutos sin perder la página estática.
export const revalidate = 300;

export default function Home() {
  return (
    <>
      <BrandIntro />
      <Header />
      <main id="main" className="home-page">
        <HomeHero />
        <HomeMarquee />
        <HomeAbout />
        <HomeServices />
        <HomeBarbershop />
        <Gallery previewLimit={6} />
        <HomeArtist />
        <HomeTeam />
        <HomeReviews />
        <HomeBookingInvite />
        <LocationMap />
      </main>
      <Footer />
      {/* Movimiento: revelados genéricos (data-reveal), coreografía GSAP e inclinación. */}
      <Reveal />
      <HomeMotion />
      <HoverTilt />
      {/* Profundidad del hero (polvo de luz y capas) y botones vivos. */}
      <HeroDepth />
      <ButtonFx />
    </>
  );
}
