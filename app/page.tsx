import { MotionRoot } from '@/components/Motion';
import { Nav, Hero, Services, EZsell, Work, Contact, Footer, WhatsApp } from '@/components/Sections';

export default function Home() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <Services />
        <EZsell />
        <Work />
        <Contact />
      </main>
      <Footer />
      <WhatsApp />
      <MotionRoot />
    </>
  );
}
