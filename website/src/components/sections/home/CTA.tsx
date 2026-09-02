import SectionHeader from "@/components/header/SectionHeader";
import Button from "@/components/ui/Button";
import React from "react";

const CTA: React.FC = () => {
  return (
    <section className="relative w-full max-w-7xl mx-auto px-6 sm:px-10 lg:px-16 overflow-hidden py-20">
      {/* Background Image */}

      <div className="relative max-w-5xl mx-auto rounded-2xl ring-1 ring-white/80 p-8 overflow-hidden">
        <div className="absolute inset-0 z-10">
          <img
            src="/images/home/family.jpg"
            alt="background"
            className="w-full h-full object-cover opacity-50 grayscale"
          />
        </div>
        <div className="relative z-20">
          <SectionHeader
            title="Secure Your Future Today"
            description="Don't leave your family's future to chance. Take action now and build the secure, prosperous life you deserve."
            align="center"
            color="yellow"
            size="xl"
          />
          <div className="flex flex-col sm:flex-row justify-center gap-4 mt-12 sm:mt-24">
            <a href="/consultation">
              <Button
                className="flex items-center gap-2 backdrop-blur-md"
              >
                Book Consultation
              </Button>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTA;
