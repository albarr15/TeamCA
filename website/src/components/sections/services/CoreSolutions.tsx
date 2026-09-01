import SectionHeader from "@/components/header/SectionHeader";

export default function CoreSolutions() {
  const solutions = [
    {
      title: "Life Protection Plans",
      description:
        "Secure your family's future with tailored life insurance solutions.",
      image:
        "/images/services/national-cancer-institute-xDSD3Vmzh70-unsplash.jpg",
    },
    {
      title: "Investment Plans",
      description:
        "Grow your wealth with smart and diversified investment options.",
      image:
        "/images/services/photo-1554224155-8d04cb21cd6c.avif",
    },
    {
      title: "Education Savings",
      description:
        "Prepare for your child’s future with structured savings plans.",
      image:
        "/images/services/photo-1524995997946-a1c2e315a42f.avif",
    },
    {
      title: "Health Protection",
      description: "Comprehensive coverage for medical and emergency needs.",
      image:
        "/images/services/chang-duong-nDi4YTMKP-g-unsplash.jpg",
    },
    {
      title: "Retirement Planning",
      description:
        "Secure your future with long-term retirement financial strategies.",
      image:
        "/images/services/photo-1508385082359-f38ae991e8f2.avif",
    },
  ];

  return (
    <section className="relativew-full py-20 px-6 md:px-12 lg:px-20 min-h-[60vh] text-white bg-[--dark-primary] overflow-hidden">

      <div className="relative z-10 max-w-7xl mx-auto">
        <SectionHeader
          title="Core Financial Solutions"
          description="Explore our suite of financial services designed to meet your unique needs at every stage of life."
          align="center"
          size="xl"
          containerSize="sm"
          color="yellow"
        />

        {/* GRID */}
        <div className="mt-12 flex justify-center">
          <div className="grid grid-cols-1 sm:grid-cols-6 gap-4 w-full max-w-3xl">
            {solutions.map((item, index) => {
              const isBottomRow = solutions.length >= 2 && index >= solutions.length - 2;

              return (
                <div
                  key={index}
                  className={`
                    relative rounded-2xl overflow-hidden group shadow-lg h-[250px]
                    ${isBottomRow ? "col-span-3" : "col-span-2"}
                  `}
                >
                  {/* IMAGE */}
                  <img
                    src={item.image}
                    alt={item.title}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />

                  {/* todo: fix gradient colors */}
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
                    {/* <div className="mt-3">
                      <Button variant="default" className="px-4 py-2 text-sm">
                        Learn More
                      </Button>
                    </div> */}
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
