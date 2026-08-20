import { DollarSign, TrendingUp, ShieldCheck, HelpCircle } from "lucide-react";

const data = [
  {
    icon: DollarSign,
    title: "Start",
    description: "Track your income and expenses effectively.",
  },
  {
    icon: TrendingUp,
    title: "Grow",
    description: "Invest wisely to grow your wealth.",
  },
  {
    icon: ShieldCheck,
    title: "Protect",
    description: "Secure your financial assets and identity.",
  },
];

export default function WhyFinancialMatters() {
  return (
    <section className="w-full max-w-7xl mx-auto px-6 py-20 sm:px-10 lg:px-16 overflow-hidden">
      <div className="max-w-6xl mx-auto text-center">
        <h2 className="text-3xl xs:text-4xl sm:text-5xl font-bold mb-4 text-[--secondary-color] leading-tight">
          Why Financial Matters
        </h2>
        <p className="mb-12 sm:mb-16 max-w-4xl mx-auto text-base sm:text-xl">
          Understanding your finances helps you make smarter decisions, build
          stability, and achieve long-term success.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8 items-center relative">
          <div className="flex flex-row items-center gap-4 relative px-1 sm:px-4">
            <div className={`p-1 flex-shrink-0 text-[--secondary-color]`}>
              <DollarSign className="h-12 w-12" />
            </div>
            <p className="text-[--white-color] text-left text-base sm:text-lg">
              Track your income and expenses effectively.
            </p>
          </div>

          <div className="flex flex-row items-center gap-4 relative px-1 sm:px-4">
            <div className={`p-1 flex-shrink-0 text-[--secondary-color]`}>
              <TrendingUp className="h-12 w-12" />
            </div>
            <p className="text-[--white-color] text-left text-base sm:text-lg">
              Invest wisely to grow your wealth.
            </p>
          </div>

          <div className="flex flex-row items-center gap-4 relative px-1 sm:px-4">
            <div className={`p-1 flex-shrink-0 text-[--secondary-color]`}>
              <ShieldCheck className="h-12 w-12" />
            </div>
            <p className="text-[--white-color] text-left text-base sm:text-lg">
              Secure your financial assets and identity.
            </p>
          </div>
        </div>

        <div className="mt-14 sm:mt-16 bg-white/10 backdrop-blur-lg rounded-xl p-4 sm:p-6 max-w-4xl mx-auto flex flex-col xs:flex-row items-start gap-4">
          <HelpCircle className="w-10 h-10 text-[--secondary-color] flex-shrink-0" />
          <div className="text-left">
            <p className="font-bold text-xl sm:text-2xl text-[--secondary-color]">
              Did you know?
            </p>
            <p className="text-base mt-1">
              Most families are unprepared for financial emergencies. With
              proper life insurance and financial planning, you can protect your
              loved ones and ensure their future security, no matter what life
              brings.
            </p>
          </div>
        </div>
      </div>
    </section >
  );
}
