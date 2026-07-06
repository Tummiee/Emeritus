import React from "react";
import Link from "next/link";
import Image from "next/image";
import { Mail, MapPin, MessageCircle, Phone } from "lucide-react";

export default function Footer() {
  const currentYear = new Date().getFullYear();
  const contactInfo = {
    phone: "09048026350",
    whatsapp: "08101795519",
    email: "Emeritusglobalresources@gmail.com",
  };

  return (
    <footer className="border-t border-purple-100 bg-[#120f22] text-slate-200">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr_1fr]">
          <div>
            <div className="flex items-center gap-3">
              <Image
                src="/logo2.png"
                alt="Emeritus Logo"
                width={44}
                height={44}
                className="rounded-2xl"
              />
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-purple-300">
                  Emeritus
                </p>
                <p className="text-base font-semibold text-white">
                  Global Resources & ICT Ltd
                </p>
              </div>
            </div>
            <p className="mt-4 max-w-md text-sm leading-7 text-slate-400">
              The premium Nigerian destination for authentic gadgets, thoughtful
              service and professional support.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-[0.24em] text-white">
              Contact
            </h3>
            <ul className="mt-4 space-y-3">
              {contactInfo && (
                <>
                  <li className="flex items-start gap-3 text-sm">
                    <Phone className="mt-0.5 h-4 w-4 text-purple-300" />
                    <span>{contactInfo.phone}</span>
                  </li>
                  <li className="flex items-start gap-3 text-sm">
                    <MessageCircle className="mt-0.5 h-4 w-4 text-purple-300" />
                    <a
                      href={`https://wa.me/234${contactInfo.whatsapp.replace(/^0+/, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-white transition-colors"
                    >
                      {contactInfo.whatsapp}
                    </a>
                  </li>
                  <li className="flex items-start gap-3 text-sm">
                    <Mail className="mt-0.5 h-4 w-4 text-purple-300" />
                    <a
                      href={`mailto:${contactInfo.email}`}
                      className="hover:text-white transition-colors"
                    >
                      {contactInfo.email}
                    </a>
                  </li>
                </>
              )}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-[0.24em] text-white">
              Address
            </h3>
            <address className="mt-4 not-italic text-sm leading-7 text-slate-400">
              <div className="flex items-start gap-3">
                <MapPin className="mt-0.5 h-4 w-4 text-purple-300" />
                <span>
                  Zone C, Block 26
                  <br />
                  Adjacent MTN Office
                  <br />
                  OAU Central Market
                  <br />
                  Opposite Mayfair Roundabout
                  <br />
                  Mayfair, Ile-Ife
                  <br />
                  Osun State, Nigeria
                </span>
              </div>
            </address>
            <div className="mt-4">
              <p className="text-sm text-slate-400">Opening Hours:</p>
              <p className="mt-1 text-sm text-white">8AM Daily</p>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-purple-200/10 text-center">
          <p className="text-sm text-slate-400">
            © {currentYear} Emeritus Global Resources & ICT Ltd. All rights
            reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
