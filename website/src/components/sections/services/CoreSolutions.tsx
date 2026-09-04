import SectionHeader from "@/components/header/SectionHeader";
import Button from "@/components/ui/Button";

export default function CoreSolutions() {
  const solutions = [
    {
      title: "Personal / Individual Insurance",
      description: "Protect your family's future with life insurance, income protection, critical illness coverage, retirement planning, and more.",
      image:
        "/images/services/national-cancer-institute-xDSD3Vmzh70-unsplash.jpg",
    },
    {
      title: "Organization / Corporate Insurance",
      description:
        "Safeguard your business with employee benefits, executive protection, keyman insurance, and corporate investment strategies.",
      image:
        "/images/services/photo-1508385082359-f38ae991e8f2.avif",
    },
  ];

  return (
    <section id="core-solutions" className="relative w-full py-20 px-6 md:px-12 lg:px-20 min-h-[60vh] text-white bg-[--dark-primary] overflow-hidden">

      <div className="relative z-10 max-w-7xl mx-auto">
        <SectionHeader
          title="Our Solutions"
          description="From personal protection to corporate strategy, explore financial solutions designed to support you, your family, and your business."
          align="center"
          size="xl"
          containerSize="sm"
          color="yellow"
        />

        <div className="mt-12 flex justify-center">
          <div className="flex flex-col sm:flex-row justify-center gap-4 w-full max-w-7xl">
            {solutions.map((item, index) => {

              return (
                <div
                  key={index}
                  className={`
                    relative rounded-2xl overflow-hidden group shadow-lg h-[400px] w-full
                  `}
                >
                  {/* IMAGE */}
                  <img
                    src={item.image}
                    alt={item.title}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />

                  {/* GRADIENT */}
                  <div className="absolute inset-0 w-full h-full bg-gradient-to-t from-red-900/80 to-transparent" />


                  {/* TEXT */}
                  <div className="absolute bottom-0 left-0 w-full p-4 sm:p-5 z-10 flex flex-col gap-2">
                    <h3 className="text-base md:text-lg font-semibold">
                      {item.title}
                    </h3>

                    <p className="text-white/70 text-sm ">
                      {item.description}
                    </p>

                    {/* BUTTON */}
                    <div className="mt-3">
                      <Button variant="default" className="px-4 py-2 text-sm">
                        Learn More
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
