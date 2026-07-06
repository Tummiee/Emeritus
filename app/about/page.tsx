'use client'

import React from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Star, Zap, Users, Award } from 'lucide-react'
import Header from '@/components/Header'
import Footer from '@/components/Footer'

export default function AboutPage() {
  const values = [
    { icon: Star, title: 'Quality', description: 'Premium products with strict quality standards' },
    { icon: Zap, title: 'Innovation', description: 'Latest technology and gadget innovations' },
    { icon: Users, title: 'Customer First', description: 'Exceptional customer service and support' },
    { icon: Award, title: 'Excellence', description: 'Commitment to excellence in everything we do' },
  ]

  return (
    <>
      <Header />
      <main className="min-h-screen bg-background">
        {/* Hero Section */}
        <section className="px-4 py-20 bg-gradient-to-br from-primary/10 to-accent/10">
          <div className="max-w-6xl mx-auto text-center">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-5xl font-bold text-foreground mb-6"
            >
              About Emeritus Gadget
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-xl text-muted-foreground max-w-2xl mx-auto"
            >
              Your trusted premium gadget marketplace delivering cutting-edge technology and exceptional customer experience since 2020.
            </motion.p>
          </div>
        </section>

        {/* Story Section */}
        <section className="px-4 py-20 max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center"
          >
            <div>
              <h2 className="text-4xl font-bold text-foreground mb-6">Our Story</h2>
              <p className="text-lg text-muted-foreground mb-4">
                Emeritus Gadget started with a simple mission: to make premium technology accessible to everyone. Founded in 2020, we&apos;ve grown into one of Nigeria&apos;s most trusted online gadget retailers.
              </p>
              <p className="text-lg text-muted-foreground">
                We believe in authentic products, fair pricing, and exceptional service. Every gadget in our catalog is carefully selected and verified for authenticity and quality.
              </p>
            </div>
            <div className="bg-gradient-to-br from-primary to-accent rounded-lg p-8 text-primary-foreground">
              <p className="text-4xl font-bold mb-2">100,000+</p>
              <p className="text-lg mb-6">Happy Customers</p>
              <p className="text-4xl font-bold mb-2">50,000+</p>
              <p className="text-lg">Products Sold</p>
            </div>
          </motion.div>
        </section>

        {/* Values Section */}
        <section className="px-4 py-20 bg-muted/30">
          <div className="max-w-6xl mx-auto">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-4xl font-bold text-foreground text-center mb-12"
            >
              Our Core Values
            </motion.h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {values.map((value, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: i * 0.1 }}
                  className="bg-card rounded-lg border border-border p-6 text-center"
                >
                  <value.icon className="w-12 h-12 mx-auto text-primary mb-4" />
                  <h3 className="text-xl font-bold text-foreground mb-2">{value.title}</h3>
                  <p className="text-muted-foreground">{value.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="px-4 py-20 max-w-6xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-4xl font-bold text-foreground mb-6">Experience Premium Tech Today</h2>
            <p className="text-lg text-muted-foreground mb-8">Join thousands of satisfied customers enjoying authentic, premium gadgets</p>
            <Link
              href="/shop"
              className="inline-block px-8 py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 transition-colors"
            >
              Start Shopping
            </Link>
          </motion.div>
        </section>
      </main>
      <Footer />
    </>
  )
}
