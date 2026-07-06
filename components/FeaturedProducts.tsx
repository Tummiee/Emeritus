"use client";

import React from "react";
import Link from "next/link";
import ProductCard from "./ProductCard";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

interface Product {
  id: string;
  name: string;
  price: number;
  comparePrice?: number;
  image: string;
  rating: number;
  reviews: number;
  inStock: boolean;
}

interface FeaturedProductsProps {
  title?: string;
  description?: string;
  products: Product[];
  viewAllLink?: string;
}

export default function FeaturedProducts({
  title = "Featured Products",
  description = "Discover our handpicked selection of premium gadgets",
  products = [],
  viewAllLink = "/shop",
}: FeaturedProductsProps) {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
      },
    },
  };

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      {/* Header */}
      <motion.div
        className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        viewport={{ once: true }}
      >
        <div>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-2 text-balance">
            {title}
          </h2>
          <p className="text-muted-foreground text-lg">{description}</p>
        </div>
        <Link
          href={viewAllLink}
          className="inline-flex items-center gap-2 px-6 py-3 text-primary font-semibold hover:gap-4 transition-all whitespace-nowrap"
        >
          View All
          <ArrowRight className="w-5 h-5" />
        </Link>
      </motion.div>

      {/* Products Grid */}
      <motion.div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
      >
        {products.map((product) => (
          <motion.div key={product.id} variants={itemVariants}>
            <ProductCard
              id={product.id}
              name={product.name}
              price={product.price}
              comparePrice={product.comparePrice}
              image={product.image}
              rating={product.rating}
              reviews={product.reviews}
              inStock={product.inStock}
            />
          </motion.div>
        ))}
      </motion.div>

      {/* Empty State */}
      {products.length === 0 && (
        <motion.div
          className="text-center py-12"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          <p className="text-muted-foreground mb-4">
            No products available at the moment.
          </p>
          <Link
            href="/shop"
            className="inline-flex items-center gap-2 px-6 py-2 text-primary font-semibold hover:text-primary/80 transition-colors"
          >
            Browse All Products
            <ArrowRight className="w-4 h-4" />
          </Link>
        </motion.div>
      )}
    </section>
  );
}
