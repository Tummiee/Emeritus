"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BadgeCheck,
  MessageCircle,
  ShieldCheck,
  MapPin,
  Clock,
  Phone,
} from "lucide-react";
import { getHomepageContent } from "@/lib/data";

export default function Hero() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [heroImages, setHeroImages] = useState<any[]>([]);
  const [loadedImages, setLoadedImages] = useState<boolean[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch homepage content including hero images
  useEffect(() => {
    const fetchHomepageContent = async () => {
      try {
        const content = await getHomepageContent();
        setHeroImages(content.heroImages);
        setLoadedImages(Array(content.heroImages.length).fill(false));
      } catch (error) {
        console.error("Error fetching homepage content:", error);
        // Fallback to default images if API fails
        setHeroImages([
          {
            id: 1,
            url: "https://images.unsplash.com/photo-1595941069915-4ebc3b6efd9d?auto=format&fit=crop&w=1800&q=80",
            alt: "Premium smartphone showcase - iPhone 15 Pro Max",
            overlayText: "Premium smartphones",
          },
          {
            id: 2,
            url: "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=1800&q=80",
            alt: "Professional laptop showcase - MacBook Pro",
            overlayText: "Professional laptops",
          },
          {
            id: 3,
            url: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=1800&q=80",
            alt: "Premium tech accessories showcase",
            overlayText: "Premium accessories",
          },
        ]);
        setLoadedImages(Array(3).fill(false));
      } finally {
        setLoading(false);
      }
    };

    fetchHomepageContent();
  }, []);

  // Auto-rotate slides every 5 seconds
  useEffect(() => {
    if (heroImages.length === 0) return;

    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroImages.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [heroImages.length]);

  const handleImageLoad = (index: number) => {
    setLoadedImages((prev) => {
      const newLoaded = [...prev];
      newLoaded[index] = true;
      return newLoaded;
    });
  };

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
  };

  const nextSlide = () => {
    if (heroImages.length > 0) {
      setCurrentSlide((prev) => (prev + 1) % heroImages.length);
    }
  };

  const prevSlide = () => {
    if (heroImages.length > 0) {
      setCurrentSlide(
        (prev) => (prev - 1 + heroImages.length) % heroImages.length,
      );
    }
  };

  if (loading || heroImages.length === 0) {
    return (
      <section className="relative isolate h-[60vh] overflow-hidden bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500 mx-auto"></div>
          <p className="mt-4 text-white">Loading hero content...</p>
        </div>
      </section>
    );
  }

  return (
    <section className="relative isolate h-[85vh] md:px-10  overflow-hidden">
      {/* Hero Image Carousel */}
      <div className="absolute inset-0">
        {heroImages.map((image, index) => (
          <motion.div
            key={image.id}
            className={`absolute inset-0 transition-opacity duration-1000 ${
              index === currentSlide ? "opacity-100" : "opacity-0"
            }`}
            initial={false}
            animate={{ opacity: index === currentSlide ? 1 : 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="absolute inset-0">
              <Image
                src={loadedImages[index] ? image.url : image.url}
                alt={image.alt}
                fill
                className="object-cover"
                onLoad={() => handleImageLoad(index)}
                onError={() => handleImageLoad(index)} // Load fallback if primary fails
              />
            </div>
            <div className="absolute inset-0 bg-[linear-gradient(90deg,_rgba(8,8,12,0.94)_0%,_rgba(8,8,12,0.72)_38%,_rgba(8,8,12,0.3)_100%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(108,43,217,0.35),_transparent_35%)]" />
          </motion.div>
        ))}
      </div>

      <div className="relative z-10 flex h-full items-center">
        <div className="mx-auto flex w-full max-w-7xl flex-col justify-between gap-10 px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
          <motion.div
            className="max-w-3xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            {/* <div className="mb-2 inline-flex w-fit items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-medium text-white/90 shadow-lg backdrop-blur">
              <BadgeCheck className="h-4 w-4 text-purple-300" />
              Official store • Ile-Ife • 8AM daily
            </div> */}

            <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl lg:text-5xl">
              The premium gadget destination for modern Nigeria.
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-200 sm:text-xl">
              Discover genuine phones, laptops, audio and accessories selected
              for performance, style and serious everyday use.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/shop"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-purple-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-purple-500"
              >
                Browse products
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="https://wa.me/2348101795519"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-white/20 bg-white/10 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/20"
              >
                <MessageCircle className="h-4 w-4" />
                WhatsApp us
              </a>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.15 }}
            className="grid gap-4 md:grid-cols-3"
          >
            {[
              { title: "Original devices", value: "Verified & trusted" },
              { title: "Fast dispatch", value: "Same-day readiness" },
              { title: "Secure checkout", value: "Paystack + transfer" },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-[1.35rem] border border-white/15 bg-white/10 p-5 shadow-lg backdrop-blur"
              >
                <p className="text-sm font-semibold uppercase tracking-[0.25em] text-purple-200">
                  {item.title}
                </p>
                <p className="mt-2 text-sm text-slate-200">{item.value}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* Carousel Navigation Dots */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-20 flex space-x-2">
        {heroImages.map((_, index) => (
          <button
            key={index}
            onClick={() => goToSlide(index)}
            className={`w-3 h-3 rounded-full transition-all ${
              index === currentSlide ? "bg-white" : "bg-white/50"
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>

      {/* Carousel Navigation Arrows */}
      <button
        onClick={prevSlide}
        className="absolute left-4 top-1/2 transform -translate-y-1/2 z-20 p-3 rounded-full bg-black/30 backdrop-blur text-white hover:bg-black/50 transition-colors"
        aria-label="Previous slide"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m15 18-6-6 6-6" />
        </svg>
      </button>
      <button
        onClick={nextSlide}
        className="absolute right-4 top-1/2 transform -translate-y-1/2 z-20 p-3 rounded-full bg-black/30 backdrop-blur text-white hover:bg-black/50 transition-colors"
        aria-label="Next slide"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m9 18 6-6-6-6" />
        </svg>
      </button>
    </section>
  );
}
