import SectionHeader from "../../header/SectionHeader";

export default function WhoWeAre() {
  return (
    <section id="about" className="relative w-full max-w-7xl mx-auto px-6 py-20 sm:px-10 lg:px-16 text-white bg-[--dark-primary] overflow-hidden scroll-mt-16">
      {/* Background Image */}
      {/* <div className="absolute inset-0">
        <img
          src="/partials/layer-blur.png"
          alt="background"
          className="w-full h-full object-cover"
        />
      </div> */}

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto">
        {/* Top Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-10">
          {/* 1st Column */}
          <div className="flex flex-col">
            <div>
              <h1 className="text-4xl xs:text-5xl md:text-7xl font-bold leading-tight">
                What is TEAM CA?
              </h1>
            </div>
          </div>

          {/* 2nd Column */}
          <div className="flex flex-col">
            <p className="text-base xs:text-lg sm:text-xl lg:text-2xl text-gray-300 leading-relaxed max-w-xl">
              TEAM CA is part of the Black Orcas Summit Life Insurance Agency,
              providing professional opportunities for interns and financial
              advisors under Pru Life UK Philippines.
            </p>
            <br />
            <p className=" max-w-xl">
              Pru Life UK is one of the leading life insurance companies in the
              Philippines, with 22 years of excellence in providing relevant and
              innovative life insurance products designed to meet the specific
              needs of the public.
            </p>
          </div>
        </div>

        {/* Affiliations Card (Full Width) */}
        <div className="mt-16 w-full">
          <div className="bg-white/80 backdrop-blur-md rounded-2xl p-4 xs:p-6 md:p-8 border border-white/20 shadow-lg">
            <div className="mb-8 flex flex-col gap-2">
              <h2 className="text-base md:text-lg font-semibold !text-primary uppercase">
                Affiliations
              </h2>
              <div className="w-full h-0.5 bg-white rounded-full opacity-20" />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 items-center justify-items-center">
              <div className="w-full h-24 xs:h-28 sm:h-32 flex items-center justify-center p-2">
                <img
                  src="/images/home/pru-life.png"
                  alt="Pru Life UK"
                  className="max-h-full max-w-full object-contain"
                />
              </div>
              <div className="w-full h-24 xs:h-28 sm:h-32 flex items-center justify-center p-2">
                <img
                  src="/images/home/black-orca.png"
                  alt="Black Orca"
                  className="max-h-full max-w-full object-contain"
                />
              </div>
              <div className="w-full h-24 xs:h-28 sm:h-32 flex items-center justify-center p-2">
                <img
                  src="/icons/teamca-transparent-logo-1.png"
                  alt="Team CA"
                  className="max-h-full max-w-full object-contain"
                />
              </div>
              <div className="w-full h-24 xs:h-28 sm:h-32 flex items-center justify-center p-2">
                <img
                  src="/images/home/maperaang-pilipino.png"
                  alt="Maperaang Pilipino"
                  className="max-h-full max-w-full object-contain"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
