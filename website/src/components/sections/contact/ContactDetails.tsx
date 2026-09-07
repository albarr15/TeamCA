import React, { useState } from "react";
import SectionHeader from "@/components/header/SectionHeader";
import {
  Mail,
  Phone,
  MapPin,
  ExternalLink,
  Copy,
  Check,
  Building2,
  Share2,
} from "lucide-react";
import { FaFacebook, FaTiktok } from "react-icons/fa";

export default function ContactDetails() {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => {
      setCopiedKey(null);
    }, 2000);
  };

  const primaryEmail = "plukchristelleanndeleon@gmail.com";
  const partnershipsEmail = "maperaangpilipino@gmail.com";
  const phoneNumber = "09617718678";
  const phoneFormatted = "+63 961 771 8678";
  const completeAddress =
    "Unit 2004, Antel Global Corporate Center, Doña Julia Vargas Avenue, Ortigas Center, San Antonio, Pasig City, 1605 Metro Manila, Philippines";
  const facebookUrl = "https://www.facebook.com/share/1D8QNV1Vay/";
  const tiktokUrl = "https://www.tiktok.com/@TheOnlyAnndeLeon";

  return (
    <section
      id="contact-details"
      className="relative w-full py-20 px-6 md:px-12 lg:px-20 min-h-[60vh] text-white bg-[--dark-primary] overflow-hidden scroll-mt-20"
    >
      <div className="relative z-10 max-w-7xl mx-auto">
        <SectionHeader
          title="Ways to Reach Us"
          description="Connect with our founder and advisory team directly through any of our official channels."
          align="center"
          size="xl"
          containerSize="lg"
          color="yellow"
        />

        {/* PRIMARY CONTACT CARDS GRID */}
        <div className="mt-14 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
          {/* CARD 1: EMAIL CHANNELS */}
          <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl p-6 sm:p-8 flex flex-col justify-between shadow-xl transition-all duration-300 hover:bg-white/[0.08] hover:-translate-y-1">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center mb-6 text-[--secondary-color]">
                <Mail className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Email Addresses</h3>
              <p className="text-white/60 text-sm mb-6">
                Drop us a line for general inquiries, personal consultations, or strategic business collaborations.
              </p>

              <div className="space-y-4">
                {/* Primary Email */}
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-xs uppercase tracking-wider text-white/50 font-medium">
                      General & Inquiries
                    </span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(primaryEmail, "email1")}
                      className="text-white/60 hover:text-white transition flex items-center gap-1 text-xs"
                      title="Copy email"
                    >
                      {copiedKey === "email1" ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      <span>{copiedKey === "email1" ? "Copied" : "Copy"}</span>
                    </button>
                  </div>
                  <a
                    href={`mailto:${primaryEmail}`}
                    className="text-sm font-medium text-white hover:text-[--secondary-color] transition break-all block"
                  >
                    {primaryEmail}
                  </a>
                </div>

                {/* Partnerships Email */}
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-xs uppercase tracking-wider text-[--secondary-color] font-medium">
                      Collaborations & Partnerships
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        copyToClipboard(partnershipsEmail, "email2")
                      }
                      className="text-white/60 hover:text-white transition flex items-center gap-1 text-xs"
                      title="Copy email"
                    >
                      {copiedKey === "email2" ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      <span>{copiedKey === "email2" ? "Copied" : "Copy"}</span>
                    </button>
                  </div>
                  <a
                    href={`mailto:${partnershipsEmail}`}
                    className="text-sm font-medium text-white hover:text-[--secondary-color] transition break-all block"
                  >
                    {partnershipsEmail}
                  </a>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-4 border-t border-white/10">
              <span className="text-xs text-white/40">
                Typical response time: Within 24 hours
              </span>
            </div>
          </div>

          {/* CARD 2: PHONE & DIRECT INQUIRY */}
          <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl p-6 sm:p-8 flex flex-col justify-between shadow-xl transition-all duration-300 hover:bg-white/[0.08] hover:-translate-y-1">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center mb-6 text-[--secondary-color]">
                <Phone className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Phone & Mobile</h3>
              <p className="text-white/60 text-sm mb-6">
                Direct phone line available for urgent calls, SMS inquiries, and consultation bookings.
              </p>

              <div className="rounded-2xl border border-white/10 bg-black/20 p-5 mb-5">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-xs uppercase tracking-wider text-white/50 font-medium">
                    Contact Number
                  </span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(phoneNumber, "phone")}
                    className="text-white/60 hover:text-white transition flex items-center gap-1 text-xs"
                    title="Copy phone number"
                  >
                    {copiedKey === "phone" ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    <span>{copiedKey === "phone" ? "Copied" : "Copy"}</span>
                  </button>
                </div>
                <a
                  href={`tel:${phoneNumber}`}
                  className="text-2xl font-bold tracking-wide text-white hover:text-[--secondary-color] transition block"
                >
                  {phoneFormatted}
                </a>
                <p className="text-xs text-white/50 mt-1">
                  Local mobile / Viber: {phoneNumber}
                </p>
              </div>

              <div className="rounded-2xl border border-yellow-400/20 bg-yellow-400/5 p-4">
                <p className="text-xs text-white/80 leading-relaxed">
                  Monday to Friday: 9:00 AM – 6:00 PM <br />
                  Weekend appointments upon request.
                </p>
              </div>
            </div>

            <div className="mt-8 pt-4 border-t border-white/10">
              <a
                href={`tel:${phoneNumber}`}
                className="inline-flex items-center gap-2 text-sm font-semibold text-[--secondary-color] hover:underline"
              >
                Call now <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* CARD 3: SOCIAL MEDIA */}
          <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl p-6 sm:p-8 flex flex-col justify-between shadow-xl transition-all duration-300 hover:bg-white/[0.08] hover:-translate-y-1 md:col-span-2 lg:col-span-1">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center mb-6 text-[--secondary-color]">
                <Share2 className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Social Profiles</h3>
              <p className="text-white/60 text-sm mb-6">
                Stay updated with our latest financial literacy tips, company highlights, and life milestones.
              </p>

              <div className="space-y-4">
                {/* Facebook */}
                <a
                  href={facebookUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between gap-4 p-4 rounded-2xl border border-white/10 bg-black/20 hover:bg-white/10 transition group"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-[#1877F2]/20 flex items-center justify-center text-[#1877F2] group-hover:scale-110 transition shrink-0">
                      <FaFacebook className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white group-hover:text-[--secondary-color] transition">
                        Facebook Community
                      </p>
                      <p className="text-xs text-white/50">Follow on Facebook</p>
                    </div>
                  </div>
                  <ExternalLink className="w-4 h-4 text-white/40 group-hover:text-white transition shrink-0" />
                </a>

                {/* TikTok */}
                <a
                  href={tiktokUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between gap-4 p-4 rounded-2xl border border-white/10 bg-black/20 hover:bg-white/10 transition group"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-pink-500/20 flex items-center justify-center text-pink-400 group-hover:scale-110 transition shrink-0">
                      <FaTiktok className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white group-hover:text-[--secondary-color] transition">
                        @TheOnlyAnndeLeon
                      </p>
                      <p className="text-xs text-white/50">TikTok Channel</p>
                    </div>
                  </div>
                  <ExternalLink className="w-4 h-4 text-white/40 group-hover:text-white transition shrink-0" />
                </a>
              </div>
            </div>

            <div className="mt-8 pt-4 border-t border-white/10">
              <span className="text-xs text-white/40">
                Active social community & educational content
              </span>
            </div>
          </div>
        </div>

        {/* OFFICE ADDRESS & INTERACTIVE GOOGLE MAP SECTION */}
        <div className="mt-14 max-w-7xl mx-auto">
          <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl overflow-hidden shadow-2xl">
            <div className="grid grid-cols-1 lg:grid-cols-12">
              {/* ADDRESS DETAILS */}
              <div className="lg:col-span-5 p-6 sm:p-10 lg:p-12 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-white/10">
                <div>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-[--secondary-color]">
                      <Building2 className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-xl sm:text-2xl font-semibold">
                        Headquarters & Office
                      </h3>
                      <p className="text-white/50 text-sm">
                        Antel Global Corporate Center
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
                      <div className="flex items-start gap-3">
                        <MapPin className="w-5 h-5 mt-1 text-[--secondary-color] shrink-0" />
                        <div>
                          <p className="text-xs uppercase tracking-wider text-white/50 font-medium mb-1">
                            Complete Address
                          </p>
                          <p className="text-sm sm:text-base text-white/90 leading-relaxed font-normal">
                            <strong className="text-white font-semibold">
                              Unit 2004, Antel Global Corporate Center
                            </strong>
                            <br />
                            Doña Julia Vargas Avenue, Ortigas Center
                            <br />
                            San Antonio, Pasig City, 1605 Metro Manila,
                            Philippines
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-black/10 p-5 space-y-2">
                      <p className="text-xs uppercase tracking-wider text-white/50 font-medium">
                        Nearby Landmarks
                      </p>
                      <p className="text-xs sm:text-sm text-white/70 leading-relaxed">
                        • Ortigas Central Business District <br />
                        • Corner Garnet Rd & Julia Vargas Ave <br />
                        • Close to SM Megamall, The Podium, and MRT-3 Ortigas
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-8 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => copyToClipboard(completeAddress, "address")}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/20 bg-white/10 hover:bg-white/20 text-xs sm:text-sm font-semibold transition"
                  >
                    {copiedKey === "address" ? (
                      <Check className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                    <span>
                      {copiedKey === "address" ? "Address Copied" : "Copy Address"}
                    </span>
                  </button>

                  <a
                    href="https://maps.google.com/?q=Antel+Global+Corporate+Center,+Dona+Julia+Vargas+Ave,+Ortigas+Center,+Pasig,+Metro+Manila"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[--secondary-color]/40 bg-[--secondary-color]/10 hover:bg-[--secondary-color]/20 text-xs sm:text-sm font-semibold text-[--secondary-color] transition"
                  >
                    Open in Google Maps <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>

              {/* MAP EMBED */}
              <div className="lg:col-span-7 relative min-h-[380px] sm:min-h-[460px] w-full bg-black/40">
                <iframe
                  title="Antel Global Corporate Center, Ortigas, Pasig Location Map"
                  src="https://www.google.com/maps?q=Antel+Global+Corporate+Center,+Julia+Vargas+Avenue,+Ortigas+Center,+Pasig&output=embed"
                  className="absolute inset-0 w-full h-full border-0 grayscale-[25%] contrast-[1.05]"
                  loading="lazy"
                  allowFullScreen
                ></iframe>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
