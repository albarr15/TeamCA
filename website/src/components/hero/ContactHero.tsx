import React, { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Button from "@/components/ui/Button";

gsap.registerPlugin(ScrollTrigger);

const ContactHero: React.FC = () => {
  const textRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const textEl = textRef.current;
    const sectionEl = sectionRef.current;

    if (!textEl || !sectionEl) return;

    const ctx = gsap.context(() => {
      gsap.from(textEl, {
        y: 60,
        opacity: 0,
        duration: 1,
        ease: "power3.out",
      });
    }, sectionEl);

    return () => ctx.revert();
  }, []);

  const handleScrollToDetails = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const target = document.getElementById("contact-details");
    if (!target) return;

    const navbarOffset = 70;
    const elementPosition = target.getBoundingClientRect().top;
    const offsetPosition = elementPosition + window.scrollY - navbarOffset;

    window.scrollTo({
      top: offsetPosition,
      behavior: "smooth",
    });
  };

  return (
    <section
      ref={sectionRef}
      className="relative w-full min-h-[520px] sm:min-h-[60vh] overflow-hidden flex flex-col justify-center"
    >
      <img
        src="/partials/circle-gradient-shade.png"
        alt="Background Gradient"
        className="absolute inset-0 w-full h-full object-cover z-0 pointer-events-none"
      />

      <div
        ref={textRef}
        className="relative z-20 w-full max-w-7xl mx-auto px-6 sm:px-10 lg:px-16 pt-24 pb-12 text-left"
      >
        <span className="inline-block px-4 py-1.5 rounded-full text-xs font-semibold tracking-widest uppercase bg-white/10 text-[--secondary-color] border border-white/10 mb-4 backdrop-blur-md">
          Get in Touch
        </span>
        <h1 className="text-[2.35rem] xs:text-5xl md:text-6xl lg:text-7xl font-heading text-white mb-4 leading-tight">
          Let’s Connect & <br className="hidden sm:inline" />
          <span className="text-[--secondary-color]">Plan Your Future</span>
        </h1>
        <p className="text-white/90 text-base sm:text-lg md:text-xl mb-8 sm:mb-10 max-w-3xl leading-relaxed">
          Have questions about insurance, financial security, partnerships, or joining our growing agency? We are here to guide and support you every step of the way.
        </p>
        <div className="flex flex-wrap items-center gap-4">
          <a href="#contact-details" onClick={handleScrollToDetails}>
            <Button variant="default" className="flex items-center gap-2">
              View Contact Details
            </Button>
          </a>
          <a href="/consultation">
            <Button variant="outline" className="flex items-center gap-2">
              Book a Consultation
            </Button>
          </a>
        </div>
      </div>
    </section>
  );
};

export default ContactHero;
