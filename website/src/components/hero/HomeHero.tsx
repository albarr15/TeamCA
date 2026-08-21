import React, { useEffect, useRef } from "react";
import Button from "@/components/ui/Button";
import gsap from "gsap";

const HomeHero: React.FC = () => {
  const textRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const textEl = textRef.current;
    const sectionEl = sectionRef.current;

    if (!textEl || !sectionEl) return;

    const ctx = gsap.context(() => {
      // Hero text entrance animation
      gsap.from(textEl, {
        y: 50,
        opacity: 0,
        duration: 0.8,
        ease: "power3.out",
      });
    }, sectionEl);

    return () => ctx.revert();
  }, []);

  const handleScrollToAbout = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const target = document.getElementById("about");
    if (!target) return;

    const navbarOffset = 64;
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
      className="relative w-full min-h-[70vh] md:min-h-screen overflow-hidden flex flex-col justify-center items-center"
    >
      {/* Background Gradient Shade */}
      <img
        src="/partials/circle-gradient-shade.png"
        alt="Background Gradient"
        className="absolute inset-0 w-full h-full object-cover z-0 pointer-events-none"
      />

      {/* Poster as Background Layer */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none flex items-end justify-center">
        <img
          src="/partials/team-poster.png"
          alt="Team Poster Background"
          className="
            w-full
            min-w-[680px] sm:min-w-[900px] md:min-w-full
            h-auto
            max-h-[55vh] sm:max-h-[65vh] md:max-h-[75vh]
            object-contain
            object-bottom
            opacity-20 sm:opacity-25
            contrast-125
            brightness-90
            select-none
          "
        />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col justify-center flex-1 w-full max-w-7xl mx-auto px-6 sm:px-10 lg:px-16 text-left">
        <div ref={textRef} className="max-w-4xl">
          <h1 className="text-[2.35rem] xs:text-[2.65rem] sm:text-5xl md:text-6xl lg:text-7xl font-heading text-white mb-4 sm:mb-6 leading-[1.06]">
            At Pru Life UK, we believe that every life is insurable.
          </h1>
          <p className="text-white/90 text-base xs:text-lg sm:text-xl md:text-2xl mb-8 max-w-2xl leading-relaxed">
            Because love means preparing for their future, no matter what.
          </p>
          <a href="#about" onClick={handleScrollToAbout}>
            <Button>Learn more</Button>
          </a>
        </div>
      </div>
    </section>
  );
};

export default HomeHero;

