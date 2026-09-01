import React from "react";
import { BsLinkedin } from "react-icons/bs";
import { config } from "@/config/env";
import { Mail } from "lucide-react";

const Footer: React.FC = () => {
  return (
    <div className="bg-[--dark-primary]">
      <footer className="bg-[--primary-color] rounded-t-2xl overflow-hidden shadow-2xl mx-auto max-w-full">
        <div className="px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col md:flex-row justify-between gap-8 md:gap-12">
            {/* Column 1 */}
            <div className="w-full md:w-3/5 flex flex-col">
              <div className="flex items-center mb-4">
                <img
                  src="/icons/teamca-transparent-logo-1.png"
                  alt="Team CA Logo"
                  className="w-12 h-12 mr-3 rounded-full"
                />
                <h3 className="text-xl font-semibold !text-white">
                  Team CA
                </h3>
              </div>
              <p className="text-[--white-color] text-sm max-w-md leading-relaxed">
                Protecting families and securing futures through professional
                life insurance and financial planning services.
              </p>
            </div>

            {/* Services & Company */}
            <div className="w-full md:w-2/5 flex flex-row justify-between sm:justify-start sm:gap-16 md:justify-around">
              <div>
                <h3 className="text-xl font-semibold mb-4 !text-white">
                  Services
                </h3>
                <ul className="space-y-2 text-sm">
                  <li>Life Insurance</li>
                  <li>Financial Planning</li>
                  <li>Investment Advice</li>
                  <li>Retirement Planning</li>
                  <li>Education Planning</li>
                </ul>
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
                  <li>
                    <a
                      href={config.frontendUrl}
                      className="hover:underline"
                    >
                      Internal Login
                    </a>
                  </li>
                </ul>
              </div>
            </div>

          </div>


          {/* Bottom */}
          <div className="mt-12 border-t border-white/20 pt-6 flex flex-col md:flex-row justify-between items-center text-sm">
            <p>
              &copy; {new Date().getFullYear()} Team CA. All rights reserved.
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

      {/* GOOGLE MAPS FULL WIDTH SECTION */}
      {/* <div className="w-full">
        <iframe
          title="Google Map"
          src="https://www.google.com/maps?q=Quezon+City,+Philippines&output=embed"
          className="w-full h-[350px] border-0"
          loading="lazy"
        ></iframe>
      </div> */}
    </div>
  );
};

export default Footer;
