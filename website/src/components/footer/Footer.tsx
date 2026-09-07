import React from "react";
import { BsLinkedin } from "react-icons/bs";
import { config } from "@/config/env";
import { Mail } from "lucide-react";

const Footer: React.FC = () => {
  // TODO: Update logo and alt text to reflect maperaang pilipino brand
  return (
    <div className="bg-[--dark-primary]">
      <footer className="bg-[--primary-color] rounded-t-2xl overflow-hidden shadow-2xl mx-auto max-w-full">
        <div className="px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col md:flex-row justify-between gap-8 md:gap-12">
            {/* Column 1 */}
            <div className="w-full md:w-1/4 flex flex-col">
              <div className="flex items-center mb-4">
                <img
                  src="/icons/teamca-transparent-logo-1.png"
                  alt="Team CA Logo"
                  className="w-12 h-12 mr-3 rounded-full"
                />
                <h3 className="text-xl font-semibold !text-white">
                  Maperaang Pilipino by Ann De Leon
                </h3>
              </div>
              <p className="text-[--white-color] text-sm max-w-md leading-relaxed">
                Protecting families and securing futures through professional
                life insurance and financial planning services.
              </p>
            </div>

            <div className="w-full md:w-3/4 flex flex-col sm:flex-row gap-8 justify-between sm:justify-start sm:gap-16 md:justify-around">
              <div className="w-full sm:w-1/2">
                <h3 className="text-xl font-semibold mb-4 !text-white">
                  Personal / Individual Services
                </h3>
                <div className="flex gap-8">
                  <ul className="space-y-2 text-sm">
                    <li>Family Protection</li>
                    <li>Income Protection / Replacement</li>
                    <li>Critical Illness Funding / Protection</li>
                    <li>Retirement Planning</li>
                  </ul><ul className="space-y-2 text-sm">
                    <li>Education Funding</li>
                    <li>Mortgage Redemption Insurance</li>
                    <li>Estate Planning</li>
                    <li>Legacy Savings</li>
                    <li>Short to Long Term Investments Planning</li>
                  </ul>
                </div>
              </div>

              <div className="w-full sm:w-1/2">
                <h3 className="text-xl font-semibold mb-4 !text-white">
                  Organization / Corporate Services
                </h3>
                <div className="flex gap-8">
                  <ul className="space-y-2 text-sm">
                    <li>Employee Benefits</li>
                    <li>Enhancement of Current Medical Benefits</li>
                    <li>Executive Benefits / Keyman Insurance</li>
                  </ul><ul className="space-y-2 text-sm">
                    <li>Corporate Investments</li>
                    <li>Business Protection (Buy-Sell Agreement)</li>
                    <li>Employee Retirement Funder</li>
                  </ul>
                </div>
              </div>

              {/* Company */}
              <div>
                <h3 className="text-xl font-semibold mb-4 !text-white">
                  Company
                </h3>
                <ul className="space-y-2 text-sm">
                  <li>
                    <a
                      href="/about"
                      className="hover:underline"
                    >
                      About Us
                    </a>
                  </li>
                  <li>
                    <a
                      href="/services"
                      className="hover:underline"
                    >
                      Services
                    </a>
                  </li>
                  <li>
                    <a
                      href="/careers"
                      className="hover:underline"
                    >
                      Careers
                    </a>
                  </li>

                </ul>
              </div>
            </div>

          </div>


          {/* Bottom */}
          <div className="mt-12 border-t border-white/20 pt-6 flex flex-col md:flex-row justify-between items-center text-sm">
            <p>
              &copy; {new Date().getFullYear()} Maperaang Pilipino by Ann De Leon. All rights reserved.
            </p>

            {/* Socials */}
            <div className="flex space-x-3 mt-4 md:mt-0">
              <a
                href="https://www.linkedin.com/company/pru-life-uk-black-orcas-summit-life-insurance-agency/posts/?feedView=all"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition text-white"
                aria-label="LinkedIn"
              >
                <BsLinkedin className="w-5 h-5" />
              </a>

              {/* TODO: CHANGE EMAIL */}
              <a
                href="mailto:andrenicole.adriano@gmail.com"
                className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition text-white"
                aria-label="Email"
              >
                <Mail className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Footer;
