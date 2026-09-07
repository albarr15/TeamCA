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
                      href="/contact"
                      className="hover:underline"
                    >
                      Contact Us
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
                href="https://www.facebook.com/share/1D8QNV1Vay/"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition text-white"
                aria-label="Facebook"
              >
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
              </a>

              <a
                href="https://www.tiktok.com/@TheOnlyAnndeLeon"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition text-white"
                aria-label="TikTok"
              >
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                  <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.24 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
                </svg>
              </a>

              <a
                href="https://www.linkedin.com/company/pru-life-uk-black-orcas-summit-life-insurance-agency/posts/?feedView=all"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition text-white"
                aria-label="LinkedIn"
              >
                <BsLinkedin className="w-5 h-5" />
              </a>

              <a
                href="mailto:plukchristelleanndeleon@gmail.com"
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
