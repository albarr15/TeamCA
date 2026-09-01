import SectionHeader from "@/components/header/SectionHeader";

export default function Mission() {
  return (
    <section className="relative w-full py-20 px-6 md:px-12 lg:px-20 min-h-[60vh] text-white bg-[--dark-primary] overflow-hidden">

      <div className="relative z-10 max-w-7xl mx-auto">
        <SectionHeader
          title="What is TEAM CA?"
          description="To nurture future financial professionals while empowering Filipino families through education, protection, and long-term financial planning."
          align="center"
          size="xl"
          color="yellow"
        />

        <div className="mt-12 w-full overflow-hidden rounded-2xl shadow-lg">
          <div className="flex w-max animate-marquee">
            <img
              src="/partials/pru-gallery.png"
              alt="Pru Life UK Gallery"
              className="h-[25rem] w-auto max-w-none"
            />
            <img
              src="/partials/pru-gallery.png"
              alt="Pru Life UK Gallery"
              className="h-[25rem] w-auto !max-w-none"
              aria-hidden="true"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
