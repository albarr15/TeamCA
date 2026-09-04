// website\src\components\navbar\Navbar.tsx

import React, { useState } from "react";
import Button from "../ui/Button";
import MobileMenu from "./MobileMenu";
import { config } from "@/config/env";
import "@/styles/global.css";
// import { File, LogIn } from "lucide-react";

const Navbar: React.FC = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const links = ["Home", "About", "Services", "Careers", "Contact"];

  return (
    <div className="fixed top-0 left-0 w-full z-50">
      <nav className="flex items-center justify-between w-full py-3 px-4 sm:px-6 md:px-10 lg:px-24 xl:px-32 backdrop-blur-md border-b border-white/20 text-black">
        <div className="flex items-center">
          <a href="/" className="flex items-center space-x-3">
            <img
              src="/icons/teamca-transparent-logo-1.png"
              alt="Team CA Logo"
              className="w-10 h-10 object-cover"
            />
          </a>
        </div>

        <div className="hidden md:flex justify-center items-center gap-5 lg:gap-12">
          {links.map((link) => {
            const path = link === "Home" ? "/" : `/${link.toLowerCase()}`;

            return (
              <a
                key={link}
                href={path}
                className="text-sm font-medium transition hover:text-primary-color hover:underline"
              >
                {link}
              </a>
            );
          })}
        </div>

        <div className="hidden md:flex -ml-24 justify-end items-center">
          <a href="/consultation">
            <Button className="text-xs">Book Consultation</Button>
          </a>
        </div>


        <button
          className="md:hidden active:scale-90 transition p-2 -mr-2"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-expanded={menuOpen}
          aria-label="Toggle menu"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="26"
            height="26"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M4 5h16" />
            <path d="M4 12h16" />
            <path d="M4 19h16" />
          </svg>
        </button>
      </nav>
      {menuOpen && <MobileMenu closeMenu={() => setMenuOpen(false)} />}
    </div>
  );
};

export default Navbar;
