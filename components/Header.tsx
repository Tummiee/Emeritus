"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Heart,
  Menu,
  MessageCircle,
  ShoppingCart,
  UserRound,
  X,
} from "lucide-react";
import { useCart } from "@/lib/contexts/CartContext";
import { useWishlist } from "@/lib/contexts/WishlistContext";
import Image from "next/image";

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { itemCount } = useCart();
  const { items: wishlistItems } = useWishlist();

  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-background/85 shadow-xs backdrop-blur-2xl">
      <div className="hidden border-b border-purple-100 bg-[#130f22] px-4 py-2 text-center text-xs font-medium uppercase tracking-[0.24em] text-purple-100 sm:block">
        Official Emeritus Global Resources & ICT Ltd store • Zone C, Ile-Ife •
        8AM daily
      </div>

      <div className="mx-auto flex h-[4.5rem] max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* <Link href="/" aria-label="Emeritus home" className="group flex items-center gap-3 rounded-xl">
          <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-purple-700 to-fuchsia-500 text-lg font-semibold text-white shadow-lg transition-transform group-hover:scale-105">
            E
          </div>
          <div>
            <p className="text-sm font-semibold tracking-[0.24em] text-slate-500">
              EMERITUS
            </p> */}
        {/* <p className="text-base font-semibold text-slate-900">
              Global Gadgets
            </p>
          </div> */}
        {/* </Link> */}

        <Link
          href="/"
          aria-label="Emeritus Global Gadgets home"
          className="flex items-center gap-2.5"
        >
          <picture>
            <source
              media="(prefers-color-scheme: dark)"
              srcSet="/logo2.png"
            />
            <Image
              src="/logo.svg"
              alt="Emeritus Logo"
              width={36}
              height={36}
              className="rounded-xl"
            />
          </picture>
          <div>
            <p className="text-sm font-semibold tracking-[0.24em] text-foreground">
              EMERITUS
            </p>
            <p className="text-base font-semibold text-muted-foreground">
              Global Gadgets
            </p>
          </div>
        </Link>

        <nav
          className="hidden items-center gap-6 text-sm font-medium text-foreground/70 md:flex lg:gap-10"
          aria-label="Main navigation"
        >
          <Link
            href="/shop"
            className="px-1 py-2 transition hover:text-purple-700"
          >
            Shop
          </Link>
          <Link
            href="/about"
            className="px-1 py-2 transition hover:text-purple-700"
          >
            About
          </Link>
          <Link
            href="/contact"
            className="px-1 py-2 transition hover:text-purple-700"
          >
            Contact
          </Link>
          <Link
            href="/faq"
            className="px-1 py-2 transition hover:text-purple-700"
          >
            FAQ
          </Link>
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* <a
            href="tel:09048026350"
            className="hidden items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm sm:flex"
          >
            <PhoneCall className="h-4 w-4 text-purple-700" />
            09048026350
          </a> */}
          <a
            href="https://wa.me/2348101795519"
            target="_blank"
            rel="noreferrer"
            className="hidden items-center gap-2 rounded-full bg-green-400 px-3 py-2 text-sm font-semibold text-white shadow-sm sm:flex"
          >
            <MessageCircle className="h-4 w-4" />
            WhatsApp
          </a>
          <Link
            href="/wishlist"
            aria-label="Wishlist"
            className="relative grid size-10 place-items-center rounded-xl border border-border bg-card text-foreground/70 shadow-xs hover:-translate-y-0.5 hover:border-primary/30 hover:text-primary hover:shadow-md"
          >
            <Heart className="h-4 w-4" />
            {wishlistItems.length > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-purple-700 text-[10px] font-semibold text-white">
                {wishlistItems.length}
              </span>
            )}
          </Link>
          <Link
            href="/account"
            aria-label="Customer account"
            className="grid size-10 place-items-center rounded-xl border border-border bg-card text-foreground/70 shadow-xs hover:-translate-y-0.5 hover:border-primary/30 hover:text-primary hover:shadow-md"
          >
            <UserRound className="h-4 w-4" />
          </Link>
          <Link
            href="/cart"
            aria-label="Shopping cart"
            className="relative grid size-10 place-items-center rounded-xl border border-border bg-card text-foreground/70 shadow-xs hover:-translate-y-0.5 hover:border-primary/30 hover:text-primary hover:shadow-md"
          >
            <ShoppingCart className="h-4 w-4" />
            {itemCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-purple-700 text-[10px] font-semibold text-white">
                {itemCount}
              </span>
            )}
          </Link>
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="grid size-10 place-items-center rounded-xl border border-border bg-card text-foreground shadow-xs hover:bg-muted md:hidden"
            aria-label="Toggle menu"
            aria-expanded={isMenuOpen}
            aria-controls="mobile-navigation"
          >
            {isMenuOpen ? (
              <X className="h-4 w-4" />
            ) : (
              <Menu className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      {isMenuOpen && (
        <div
          id="mobile-navigation"
          className="animate-enter border-t border-border bg-background/95 px-4 py-3 shadow-lg backdrop-blur-xl md:hidden"
        >
          <nav
            className="flex flex-col gap-2 text-sm font-medium text-foreground/75"
            aria-label="Mobile navigation"
          >
            <Link
              href="/shop"
              className="rounded-lg px-3 py-2.5 transition hover:bg-muted hover:text-purple-700"
            >
              Shop
            </Link>
            <Link
              href="/about"
              className="rounded-lg px-3 py-2.5 transition hover:bg-muted hover:text-purple-700"
            >
              About
            </Link>
            <Link
              href="/contact"
              className="rounded-lg px-3 py-2.5 transition hover:bg-muted hover:text-purple-700"
            >
              Contact
            </Link>
            <Link
              href="/faq"
              className="rounded-lg px-3 py-2.5 transition hover:bg-muted hover:text-purple-700"
            >
              FAQ
            </Link>
            <a
              href="tel:09048026350"
              className="rounded-lg px-3 py-2.5 transition hover:bg-muted hover:text-purple-700"
            >
              Call store
            </a>
          </nav>
        </div>
      )}
    </header>
  );
}
