"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  Check,
  ChevronRight,
  Clock3,
  Headphones,
  Heart,
  Mail,
  MapPin,
  Menu,
  MessageCircle,
  PackageCheck,
  Phone,
  RefreshCcw,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Star,
  Truck,
  Wrench,
  X,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { ProductCard } from "@/components/ui/product-card";
import { catalogIntentForLabel } from "@/lib/catalog-intents";
import { cn } from "@/lib/utils";
import type { HomepageContent, HomepageProduct } from "@/lib/homepage/types";
import { useCart } from "@/lib/contexts/CartContext";
import { useWishlist } from "@/lib/contexts/WishlistContext";
import { useToast } from "@/components/ui/toast";

const container =
  "mx-auto w-full max-w-[1440px] px-4 sm:px-6 lg:px-10 xl:px-14";

function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 24 }}
      whileInView={reduced ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.55, delay, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function Eyebrow({
  children,
  light,
}: {
  children: React.ReactNode;
  light?: boolean;
}) {
  return (
    <p
      className={cn(
        "mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary",
        light && "text-white/65",
      )}
    >
      <span className={cn("h-px w-6 bg-primary", light && "bg-white/50")} />
      {children}
    </p>
  );
}

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="max-w-3xl">
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 className="text-balance text-3xl font-semibold leading-[1.05] tracking-[-0.045em] sm:text-4xl lg:text-5xl">
        {title}
      </h2>
      {description && (
        <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
          {description}
        </p>
      )}
    </div>
  );
}

function Header({ content }: { content: HomepageContent }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <div className="bg-foreground px-4 py-2 text-center text-[10px] font-medium uppercase tracking-[0.18em] text-background sm:text-xs">
        {content.announcement}
      </div>
      <header className="glass sticky top-0 z-50 border-x-0 border-t-0">
        <div
          className={cn(container, "flex h-16 items-center justify-between")}
        >
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
            {/* <span className="hidden text-sm font-semibold tracking-[0.16em] sm:block">
              EMERITUS
            </span> */}
          </Link>
          <nav
            className="hidden items-center gap-1 lg:flex"
            aria-label="Main navigation"
          >
            {content.navigation.map((item) => {
              const intent = catalogIntentForLabel(item.label);
              return (
                <Link
                  key={item.label}
                  href={intent ? `/shop?intent=${intent}` : item.href}
                  className="rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="flex items-center gap-1">
            <Link
              href="/wishlist"
              aria-label="Wishlist"
              className={buttonVariants({ variant: "ghost", size: "icon-sm" })}
            >
              <Heart />
            </Link>
            <Link
              href="/cart"
              aria-label="Shopping bag"
              className={buttonVariants({ variant: "ghost", size: "icon-sm" })}
            >
              <ShoppingBag />
            </Link>
            <Link
              href="/shop"
              className={buttonVariants({
                size: "sm",
                className: "ml-2 hidden sm:inline-flex",
              })}
            >
              Shop now
            </Link>
            <Button
              variant="ghost"
              size="icon-sm"
              className="ml-1 lg:hidden"
              aria-label="Toggle menu"
              aria-expanded={open}
              onClick={() => setOpen((value) => !value)}
            >
              {open ? <X /> : <Menu />}
            </Button>
          </div>
        </div>
        {open && (
          <nav
            className="border-t border-border bg-background p-4 lg:hidden"
            aria-label="Mobile navigation"
          >
            {content.navigation.map((item) => {
              const intent = catalogIntentForLabel(item.label);
              return (
                <Link
                  key={item.label}
                  href={intent ? `/shop?intent=${intent}` : item.href}
                  onClick={() => setOpen(false)}
                  className="flex min-h-12 items-center justify-between border-b border-border px-2 text-sm font-medium last:border-0"
                >
                  {item.label}
                  <ChevronRight className="size-4 text-muted-foreground" />
                </Link>
              );
            })}
          </nav>
        )}
      </header>
    </>
  );
}

function Hero({ content }: { content: HomepageContent["hero"] }) {
  const reduced = useReducedMotion();
  const [activeImage, setActiveImage] = useState(0);
  const heroImages = content.images?.length ? content.images : [content.image];

  useEffect(() => {
    if (reduced || heroImages.length < 2) return;

    const interval = window.setInterval(() => {
      setActiveImage((current) => (current + 1) % heroImages.length);
    }, 7000);

    return () => window.clearInterval(interval);
  }, [heroImages.length, reduced]);

  return (
    <section className="relative min-h-[calc(100svh-96px)] overflow-hidden bg-[#090b0f] text-white">
      <motion.div
        className="absolute inset-0"
        initial={
          reduced
            ? false
            : {
                opacity: 0.3,
                scale: 1.08,
                filter: "brightness(0.28) saturate(0.7)",
              }
        }
        animate={
          reduced
            ? undefined
            : {
                opacity: 1,
                scale: 1,
                filter: "brightness(0.92) saturate(1.08)",
              }
        }
        transition={{ duration: 1.9, ease: [0.16, 1, 0.3, 1] }}
      >
        {heroImages.map((image, index) => (
          <Image
            key={image.url}
            src={image.url}
            alt={image.alt}
            fill
            priority={index === 0}
            sizes="100vw"
            className={cn(
              "object-cover opacity-0 transition-opacity duration-[1200ms] ease-in-out",
              index === activeImage && "opacity-80",
            )}
            style={{ objectPosition: image.focalPoint }}
          />
        ))}
      </motion.div>
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_72%_45%,rgba(52,119,255,.32),transparent_24%),linear-gradient(110deg,transparent_44%,rgba(89,146,255,.13)_58%,transparent_70%)] mix-blend-screen"
        initial={reduced ? false : { opacity: 0, x: "-8%" }}
        animate={
          reduced
            ? undefined
            : { opacity: [0, 0.85, 0.32], x: ["-8%", "2%", "0%"] }
        }
        transition={{ duration: 2.4, times: [0, 0.58, 1], ease: "easeOut" }}
      />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(3,5,9,.93)_0%,rgba(3,5,9,.7)_42%,rgba(3,5,9,.1)_75%),linear-gradient(0deg,rgba(3,5,9,.85),transparent_50%)]" />
      <div
        className={cn(
          container,
          "relative flex min-h-[calc(100svh-96px)] flex-col justify-end pb-8 pt-16 sm:pb-10 lg:justify-center lg:py-24",
        )}
      >
        <motion.div
          initial={reduced ? false : { opacity: 0, y: 24 }}
          animate={reduced ? undefined : { opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-3xl"
        >
          <Eyebrow light>{content.eyebrow}</Eyebrow>
          <h1 className="text-balance text-[clamp(2.5rem,8vw,5.5rem)] font-semibold leading-[0.95] tracking-[-0.065em]">
            {content.title}
          </h1>
          <p className="mt-7 max-w-xl text-base leading-7 text-white/70 sm:text-lg">
            {content.description}
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href={content.primaryAction.href}
              className={buttonVariants({ variant: "inverse", size: "lg" })}
            >
              {content.primaryAction.label}
              <ArrowRight />
            </Link>
            <a
              href={content.secondaryAction.href}
              target="_blank"
              rel="noreferrer"
              className={buttonVariants({
                variant: "outline",
                size: "lg",
                className:
                  "border-white/20 bg-white/10 text-white backdrop-blur-md hover:bg-white/15 hover:text-white",
              })}
            >
              {content.secondaryAction.label}
            </a>
          </div>
        </motion.div>
        <div className="mt-14 grid max-w-2xl grid-cols-3 border-t border-white/15 pt-6">
          {content.highlights.map((item) => (
            <div key={item.label}>
              <p className="text-sm font-semibold sm:text-lg">{item.value}</p>
              <p className="mt-1 text-[10px] text-white/50 sm:text-xs">
                {item.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Categories({ content }: { content: HomepageContent["categories"] }) {
  return (
    <section className="py-20 sm:py-28">
      <div className={container}>
        <Reveal>
          <SectionHeading
            eyebrow="Find your next device"
            title="Shop by category."
          />
        </Reveal>
        <div className="mt-10 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
          {content.map((category, index) => (
            <Reveal key={category.id} delay={index * 0.04}>
              <Link
                href={`/shop?category=${category.slug}`}
                className="group block"
              >
                <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-muted">
                  <Image
                    src={category.image.url}
                    alt={category.image.alt}
                    fill
                    sizes="(max-width: 768px) 50vw, 20vw"
                    priority={index < 2}
                    quality={85}
                    placeholder="blur"
                    blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iOCAgaGVpZ2h0PSI4IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxkZWZhdWx0cz48cmVjdCB3aWR0aD0iOCIgZGVmYXVsdC1maWxsPSIjZGVkZWRlZCIgaGVpZ2h0PSI4Ii8+PC9kZWZhdWx0cz48L3N2Zz4="
                    className="object-cover transition-transform duration-500 ease-[var(--ease-out-expo)] group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-4 text-white sm:p-5">
                    <h3 className="font-semibold tracking-[-0.02em] sm:text-lg">
                      {category.name}
                    </h3>
                    <p className="mt-1 text-[10px] text-white/65 sm:text-xs">
                      {category.count}
                    </p>
                  </div>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function ProductGrid({ products }: { products: HomepageProduct[] }) {
  const { addItem: addToCart } = useCart();
  const {
    addItem: addToWishlist,
    removeItem: removeFromWishlist,
    isWishlisted,
  } = useWishlist();
  const [notice, setNotice] = useState("");

  const announce = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 2200);
  };

  return (
    <>
      {!products.length && (
        <div className="rounded-3xl border border-dashed border-border bg-background px-6 py-16 text-center">
          <PackageCheck className="mx-auto size-9 text-muted-foreground" />
          <h3 className="mt-4 text-xl font-semibold tracking-[-0.03em]">
            Products coming soon.
          </h3>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
            We are preparing the catalogue. Check back shortly for newly added
            devices.
          </p>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
        {products.map((product, index) => {
          const wishlisted = isWishlisted(product.id);
          return (
            <Reveal key={product.id} delay={index * 0.045}>
              <ProductCard
                {...product}
                image={product.image.url}
                imageAlt={product.image.alt}
                formattedPrice={product.price}
                formattedCompareAtPrice={product.compareAtPrice}
                wishlisted={wishlisted}
                onWishlistChange={(next) => {
                  next
                    ? addToWishlist(product.id)
                    : removeFromWishlist(product.id);
                  announce(
                    next
                      ? `${product.name} saved to your wishlist.`
                      : `${product.name} removed from your wishlist.`,
                  );
                }}
                onSelect={() => {
                  window.location.href = `/product/${product.slug}`;
                }}
                action={
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="secondary"
                    disabled={product.availability === "out-of-stock"}
                    aria-label={`Add ${product.name} to cart`}
                    onClick={() => {
                      addToCart(product.slug, 1);
                      announce(`${product.name} added to your cart.`);
                    }}
                  >
                    <ShoppingCart />
                  </Button>
                }
              />
            </Reveal>
          );
        })}
      </div>
      <div className="sr-only" role="status" aria-live="polite">
        {notice}
      </div>
    </>
  );
}

function Countdown({ endsAt }: { endsAt: string }) {
  const calculate = () => Math.max(0, new Date(endsAt).getTime() - Date.now());
  const [remaining, setRemaining] = useState(0);
  useEffect(() => {
    setRemaining(calculate());
    const timer = window.setInterval(() => setRemaining(calculate()), 1000);
    return () => window.clearInterval(timer);
  }, [endsAt]);
  const values = [
    ["Days", Math.floor(remaining / 86400000)],
    ["Hours", Math.floor((remaining / 3600000) % 24)],
    ["Mins", Math.floor((remaining / 60000) % 60)],
    ["Secs", Math.floor((remaining / 1000) % 60)],
  ] as const;
  return (
    <div className="flex gap-2" aria-label="Flash sale countdown">
      {values.map(([label, value]) => (
        <div
          key={label}
          className="min-w-14 rounded-xl border border-white/10 bg-white/8 p-2.5 text-center backdrop-blur-sm"
        >
          <p className="font-mono text-lg font-semibold">
            {String(value).padStart(2, "0")}
          </p>
          <p className="text-[9px] uppercase tracking-wider text-white/50">
            {label}
          </p>
        </div>
      ))}
    </div>
  );
}

const benefitIcons = {
  shield: ShieldCheck,
  truck: Truck,
  headphones: Headphones,
  refresh: RefreshCcw,
};

function formatCategoryCount(count: number) {
  return `${count} product${count === 1 ? "" : "s"}`;
}

export function Homepage({ content }: { content: HomepageContent }) {
  const { showToast } = useToast();
  const [subscribed, setSubscribed] = useState(false);
  const [categories, setCategories] = useState(content.categories);
  const [newsletterPending, setNewsletterPending] = useState(false);
  const [newsletterError, setNewsletterError] = useState("");

  useEffect(() => {
    let isMounted = true;

    fetch("/api/categories", {
      cache: "force-cache",
      next: { revalidate: 60 },
    })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.error || "Could not load categories");
        }

        if (!isMounted) return;

        const nextCategories = Array.isArray(result.data) ? result.data : [];
        if (nextCategories.length) {
          setCategories(
            nextCategories.map((category: any) => ({
              id: category.id,
              name: category.name,
              slug: category.slug,
              image: {
                url: category.image_url || "/placeholder.jpg",
                alt: category.name,
              },
              count: formatCategoryCount(
                Number(category.count ?? category.product_count ?? 0),
              ),
            })),
          );
        }
      })
      .catch(() => undefined);

    return () => {
      isMounted = false;
    };
  }, []);

  const newsletterSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const email = new FormData(form).get("email");
    setNewsletterPending(true);
    setNewsletterError("");
    try {
      const response = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Could not subscribe right now.");
      }
      setSubscribed(true);
      form.reset();
      showToast({
        kind: "success",
        title: "You’re subscribed",
        description: "Product news and offers will be sent to your inbox.",
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not subscribe right now.";
      setNewsletterError(message);
      showToast({ kind: "error", title: "Subscription failed", description: message });
    } finally {
      setNewsletterPending(false);
    }
  };

  return (
    <div className="min-h-screen overflow-x-clip bg-background text-foreground">
      <Header content={content} />
      <main>
        <Hero content={content.hero} />

        <Categories content={categories} />

        <section className="border-y border-border bg-card py-20 sm:py-28">
          <div className={container}>
            <Reveal>
              <SectionHeading
                eyebrow={content.featured.eyebrow}
                title={content.featured.title}
                description={content.featured.description}
              />
            </Reveal>
            <div className="mt-12">
              <ProductGrid products={content.featured.products} />
            </div>
            {content.featured.products.length > 0 && (
              <Reveal className="mt-10 text-center">
                <Link
                  href="/shop"
                  className={buttonVariants({ variant: "outline" })}
                >
                  View all products
                  <ArrowRight />
                </Link>
              </Reveal>
            )}
          </div>
        </section>

        <section className="bg-[#090b0f] py-20 text-white sm:py-28">
          <div className={container}>
            <div className="grid gap-10 lg:grid-cols-[.9fr_1.1fr] lg:items-center">
              <Reveal className="relative min-h-[460px] overflow-hidden rounded-3xl">
                <Image
                  src={content.flashSale.image.url}
                  alt={content.flashSale.image.alt}
                  fill
                  sizes="(max-width: 1024px) 100vw, 45vw"
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                <Badge className="absolute left-5 top-5 bg-white text-black">
                  Limited release
                </Badge>
              </Reveal>
              <Reveal>
                <Eyebrow light>{content.flashSale.eyebrow}</Eyebrow>
                <h2 className="text-balance text-4xl font-semibold leading-[1] tracking-[-0.05em] sm:text-5xl">
                  {content.flashSale.title}
                </h2>
                <p className="mt-5 max-w-xl leading-7 text-white/60">
                  {content.flashSale.description}
                </p>
                {content.flashSale.products.length > 0 ? (
                  <>
                    {content.flashSale.endsAt && (
                      <div className="mt-7">
                        <Countdown endsAt={content.flashSale.endsAt} />
                      </div>
                    )}
                    <div className="mt-8 grid gap-3 sm:grid-cols-2">
                      {content.flashSale.products.map((product) => (
                        <Link
                          href={`/product/${product.slug}`}
                          key={product.id}
                          className="group flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-3 transition-colors hover:bg-white/10"
                        >
                          <div className="relative size-24 shrink-0 overflow-hidden rounded-xl bg-white">
                            <Image
                              src={product.image.url}
                              alt={product.image.alt}
                              fill
                              sizes="96px"
                              className="object-contain p-2"
                            />
                          </div>
                          <div className="min-w-0">
                            <p className="line-clamp-2 text-sm font-medium">
                              {product.name}
                            </p>
                            <p className="mt-2 font-mono text-sm">
                              {product.price}
                            </p>
                            <p className="font-mono text-xs text-white/40 line-through">
                              {product.compareAtPrice}
                            </p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-6">
                    <p className="font-semibold">
                      The next offer is being prepared.
                    </p>
                    <p className="mt-2 text-sm leading-6 text-white/55">
                      New catalogue offers will appear here as soon as they are
                      available.
                    </p>
                  </div>
                )}
              </Reveal>
            </div>
          </div>
        </section>

        <section className="py-20 sm:py-28">
          <div className={container}>
            <Reveal>
              <SectionHeading
                eyebrow="The Emeritus standard"
                title="Premium means peace of mind."
              />
            </Reveal>
            <div className="mt-12 grid gap-px overflow-hidden rounded-3xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
              {content.benefits.map((item, index) => {
                const Icon = benefitIcons[item.icon];
                return (
                  <Reveal
                    key={item.title}
                    delay={index * 0.05}
                    className="h-full bg-card p-7"
                  >
                    <div className="mb-8 grid size-11 place-items-center rounded-xl bg-accent text-accent-foreground">
                      <Icon className="size-5" />
                    </div>
                    <h3 className="font-semibold tracking-[-0.025em]">
                      {item.title}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {item.description}
                    </p>
                  </Reveal>
                );
              })}
            </div>
          </div>
        </section>

        <section
          id="repairs"
          className="border-y border-border bg-card py-20 sm:py-28"
        >
          <div
            className={cn(
              container,
              "grid gap-10 lg:grid-cols-2 lg:items-center",
            )}
          >
            <Reveal className="relative aspect-[4/3] overflow-hidden rounded-3xl bg-muted">
              <Image
                src={content.repair.image.url}
                alt={content.repair.image.alt}
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover"
              />
              <div className="absolute bottom-5 left-5 flex items-center gap-3 rounded-2xl bg-background/85 p-3 pr-5 shadow-lg backdrop-blur-xl">
                <span className="grid size-10 place-items-center rounded-xl bg-primary text-primary-foreground">
                  <Wrench className="size-5" />
                </span>
                <div>
                  <p className="text-sm font-semibold">Expert diagnostics</p>
                  <p className="text-xs text-muted-foreground">
                    Clear quote before work begins
                  </p>
                </div>
              </div>
            </Reveal>
            <Reveal className="lg:pl-12">
              <SectionHeading
                eyebrow={content.repair.eyebrow}
                title={content.repair.title}
                description={content.repair.description}
              />
              <ul className="mt-7 space-y-3">
                {content.repair.services.map((service) => (
                  <li key={service} className="flex items-center gap-3 text-sm">
                    <span className="grid size-6 place-items-center rounded-full bg-success/10 text-success">
                      <Check className="size-3.5" />
                    </span>
                    {service}
                  </li>
                ))}
              </ul>
              <Link
                href={content.repair.action.href}
                className={buttonVariants({ size: "lg", className: "mt-8" })}
              >
                {content.repair.action.label}
                <ArrowRight />
              </Link>
            </Reveal>
          </div>
        </section>

        <section className="py-16">
          <div className={container}>
            <Reveal>
              <p className="text-center text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                Trusted technology from the world&apos;s best
              </p>
              <div className="mt-10 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-4 lg:grid-cols-8">
                {content.brands.map((brand) => (
                  <div
                    key={brand}
                    className="grid h-20 place-items-center bg-background px-3 text-sm font-semibold tracking-[-0.02em] text-muted-foreground grayscale transition hover:text-foreground"
                  >
                    {brand}
                  </div>
                ))}
              </div>
            </Reveal>
          </div>
        </section>

        <section className="border-y border-border bg-foreground py-20 text-background sm:py-28">
          <div className={container}>
            <Reveal>
              <Eyebrow light>Customer stories</Eyebrow>
              <h2 className="max-w-2xl text-balance text-4xl font-semibold leading-none tracking-[-0.05em] sm:text-5xl">
                Good technology. Even better service.
              </h2>
            </Reveal>
            <div className="mt-12 grid gap-4 lg:grid-cols-3">
              {content.testimonials.map((testimonial, index) => (
                <Reveal
                  key={testimonial.id}
                  delay={index * 0.06}
                  className="rounded-2xl border border-background/10 bg-background/5 p-6 sm:p-8"
                >
                  <div className="flex gap-1 text-warning">
                    {Array.from({ length: testimonial.rating }).map(
                      (_, star) => (
                        <Star key={star} className="size-4 fill-current" />
                      ),
                    )}
                  </div>
                  <blockquote className="mt-8 text-lg leading-8 tracking-[-0.02em]">
                    &ldquo;{testimonial.quote}&rdquo;
                  </blockquote>
                  <div className="mt-8 border-t border-background/10 pt-5">
                    <p className="text-sm font-semibold">{testimonial.name}</p>
                    <p className="mt-1 text-xs text-background/50">
                      {testimonial.detail}
                    </p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20 sm:py-28">
          <div
            className={cn(
              container,
              "grid gap-12 lg:grid-cols-[1.1fr_.9fr] lg:items-center",
            )}
          >
            <Reveal>
              <SectionHeading
                eyebrow={content.about.eyebrow}
                title={content.about.title}
                description={content.about.description}
              />
              <div className="mt-10 grid grid-cols-3 border-t border-border pt-7">
                {content.about.stats.map((stat) => (
                  <div key={stat.label}>
                    <p className="text-xl font-semibold tracking-[-0.04em] sm:text-3xl">
                      {stat.value}
                    </p>
                    <p className="mt-2 max-w-28 text-[10px] leading-4 text-muted-foreground sm:text-xs">
                      {stat.label}
                    </p>
                  </div>
                ))}
              </div>
            </Reveal>
            <Reveal className="relative aspect-[4/5] overflow-hidden rounded-3xl bg-muted">
              <Image
                src={content.about.image.url}
                alt={content.about.image.alt}
                fill
                sizes="(max-width: 1024px) 100vw, 40vw"
                className="object-cover"
              />
            </Reveal>
          </div>
        </section>

        <section id="store" className="pb-20 sm:pb-28">
          <div className={container}>
            <Reveal className="relative min-h-[580px] overflow-hidden rounded-3xl bg-foreground text-white">
              <Image
                src={content.store.image.url}
                alt={content.store.image.alt}
                fill
                sizes="100vw"
                className="object-cover opacity-55"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/55 to-transparent" />
              <div className="relative flex min-h-[580px] max-w-2xl flex-col justify-end p-6 sm:p-10 lg:p-14">
                <Eyebrow light>{content.store.eyebrow}</Eyebrow>
                <h2 className="text-balance text-4xl font-semibold leading-none tracking-[-0.05em] sm:text-5xl">
                  {content.store.title}
                </h2>
                <div className="mt-8 grid gap-4 text-sm text-white/75">
                  <p className="flex items-start gap-3">
                    <MapPin className="mt-0.5 size-4 shrink-0 text-white" />
                    {content.store.address}
                  </p>
                  <p className="flex items-center gap-3">
                    <Clock3 className="size-4 text-white" />
                    {content.store.hours}
                  </p>
                  <p className="flex items-center gap-3">
                    <Phone className="size-4 text-white" />
                    {content.store.phone}
                  </p>
                </div>
                <a
                  href={content.store.mapHref}
                  target="_blank"
                  rel="noreferrer"
                  className={buttonVariants({
                    variant: "inverse",
                    size: "lg",
                    className: "mt-8 w-fit",
                  })}
                >
                  Get directions
                  <ArrowRight />
                </a>
              </div>
            </Reveal>
          </div>
        </section>

        <section className="border-y border-border bg-accent py-20 sm:py-24">
          <div
            className={cn(
              container,
              "grid gap-8 lg:grid-cols-[1fr_.8fr] lg:items-end",
            )}
          >
            <Reveal>
              <Eyebrow>{content.newsletter.eyebrow}</Eyebrow>
              <h2 className="max-w-2xl text-balance text-4xl font-semibold leading-none tracking-[-0.05em] sm:text-5xl">
                {content.newsletter.title}
              </h2>
              <p className="mt-5 max-w-xl text-sm leading-6 text-muted-foreground">
                {content.newsletter.description}
              </p>
            </Reveal>
            <Reveal>
              {subscribed ? (
                <div
                  role="status"
                  className="flex min-h-14 items-center gap-3 rounded-2xl border border-success/20 bg-success/10 px-5 text-sm font-medium text-success"
                >
                  <PackageCheck />
                  You&apos;re on the list. Check your inbox shortly.
                </div>
              ) : (
                <form
                  onSubmit={newsletterSubmit}
                  className="flex flex-col gap-3 sm:flex-row"
                >
                  <label className="sr-only" htmlFor="newsletter-email">
                    Email address
                  </label>
                  <div className="relative flex-1">
                    <Mail className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      id="newsletter-email"
                      name="email"
                      type="email"
                      required
                      autoComplete="email"
                      placeholder="you@example.com"
                      className="h-14 w-full rounded-2xl border border-border bg-background pl-11 pr-4 text-sm outline-none focus:border-ring focus:ring-3 focus:ring-ring/15"
                    />
                  </div>
                  <Button size="xl" type="submit" disabled={newsletterPending}>
                    {newsletterPending ? "Joining..." : "Join the list"}
                    <ArrowRight />
                  </Button>
                  {newsletterError && (
                    <p
                      className="text-sm text-destructive sm:basis-full"
                      role="alert"
                    >
                      {newsletterError}
                    </p>
                  )}
                </form>
              )}
            </Reveal>
          </div>
        </section>
      </main>

      <footer className="bg-[#090b0f] py-16 text-white">
        <div className={container}>
          <div className="grid gap-12 border-b border-white/10 pb-12 lg:grid-cols-[1.4fr_2fr]">
            <div>
              <Link href="/" className="flex items-center gap-3">
                <Image
                  src="/logo.svg"
                  alt="Emeritus Logo"
                  width={40}
                  height={40}
                  className="rounded-xl"
                />
                <span className="font-semibold tracking-[0.16em]">
                  EMERITUS
                </span>
              </Link>
              <p className="mt-5 max-w-sm text-sm leading-6 text-white/50">
                {content.footer.description}
              </p>
              <div className="mt-6 flex gap-2">
                <a
                  href={content.footer.whatsapp}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="WhatsApp"
                  className={buttonVariants({
                    variant: "outline",
                    size: "icon-sm",
                    className:
                      "border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white",
                  })}
                >
                  <MessageCircle />
                </a>
                <a
                  href={`mailto:${content.footer.email}`}
                  aria-label="Email"
                  className={buttonVariants({
                    variant: "outline",
                    size: "icon-sm",
                    className:
                      "border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white",
                  })}
                >
                  <Mail />
                </a>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
              {content.footer.columns.map((column) => (
                <div key={column.title}>
                  <h3 className="text-xs font-semibold uppercase tracking-[0.16em]">
                    {column.title}
                  </h3>
                  <ul className="mt-5 space-y-3">
                    {column.links.map((link) => (
                      <li key={link.label}>
                        <Link
                          href={link.href}
                          className="text-sm text-white/50 transition-colors hover:text-white"
                        >
                          {link.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-3 pt-7 text-xs text-white/35 sm:flex-row sm:items-center sm:justify-between">
            <p>
              © {new Date().getFullYear()} Emeritus Global Resources & ICT Ltd.
            </p>
            <p>Premium technology. Properly selected.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
