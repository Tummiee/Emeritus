"use client";

import React from "react";
import { motion } from "framer-motion";
import {
  Mail,
  MessageCircle,
  RotateCcw,
  ShieldCheck,
  Banknote,
  ClipboardCheck,
} from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function RefundReturnPolicyPage() {
  const sections = [
    {
      icon: ClipboardCheck,
      title: "1. Order Fulfilment",
      content: (
        <>
          <p>
            We make every reasonable effort to ensure that customers receive the
            products they have ordered.
          </p>
          <p>
            Where an order cannot be fulfilled or delivered, the customer should
            contact us so that the matter can be investigated and resolved.
          </p>
        </>
      ),
    },
    {
      icon: RotateCcw,
      title: "2. Returns and Replacements",
      content: (
        <>
          <p>
            Items that have been successfully delivered and accepted by the
            customer may be returned where there is a valid reason, including
            where the wrong item was delivered, the item is defective or
            damaged, the item is materially different from what was ordered, or
            another reasonable issue with the product is confirmed by us.
          </p>
          <p>
            Where possible, an eligible returned item may be replaced with
            another suitable item instead of a monetary refund. The customer may
            be required to provide information or evidence regarding the order
            and the reason for the return before a replacement is approved.
          </p>
        </>
      ),
    },
    {
      icon: Banknote,
      title: "3. Refunds",
      content: (
        <>
          <p>
            Where an order cannot be fulfilled, an appropriate replacement
            cannot be provided, or a refund is otherwise approved, the customer
            will be eligible for a refund.
          </p>
          <p>
            The customer may be required to provide valid bank account details
            or other necessary payment information to enable the refund to be
            processed. Refunds will be made after the request has been reviewed
            and approved.
          </p>
        </>
      ),
    },
    {
      icon: ShieldCheck,
      title: "4. Refund Request Requirements",
      content: (
        <>
          <p>
            Customers requesting a refund may be required to provide the
            following information:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Full name</li>
            <li>Order or transaction details</li>
            <li>Proof of payment, where applicable</li>
            <li>Details of the item or order concerned</li>
            <li>Reason for requesting a refund</li>
            <li>
              Valid bank account details where a bank transfer refund is
              required
            </li>
          </ul>
          <p>
            Providing accurate information will help us process the request
            efficiently.
          </p>
        </>
      ),
    },
    {
      icon: RotateCcw,
      title: "5. Resolution of Complaints",
      content: (
        <>
          <p>
            Where there is an issue with an order, we may first attempt to
            resolve the matter through delivery of the correct item, replacement
            of the affected product, or another reasonable solution.
          </p>
          <p>
            A monetary refund may be issued where replacement or fulfilment is
            not possible or where a refund is otherwise approved.
          </p>
        </>
      ),
    },
  ];

  return (
    <>
      <Header />

      <main className="min-h-screen bg-background">
        {/* Hero Section */}
        <section className="px-4 py-20 bg-gradient-to-br from-primary/10 to-accent/10">
          <div className="max-w-6xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <h1 className="text-5xl font-bold text-foreground mb-6">
                Refund and Return Policy
              </h1>

              <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-4">
                Our commitment to handling returns, replacements, refunds, and
                customer complaints fairly and promptly.
              </p>

              <p className="text-sm font-medium text-muted-foreground">
                Effective Date: 29 September 2026
              </p>
            </motion.div>
          </div>
        </section>

        {/* Introduction */}
        <section className="px-4 py-16 max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="bg-card rounded-lg border border-border p-8 md:p-10"
          >
            <h2 className="text-3xl font-bold text-foreground mb-5">
              Our Commitment
            </h2>

            <p className="text-lg text-muted-foreground leading-relaxed">
              At Emeritus Global Resources, we are committed to ensuring that
              customers receive the items they order in good condition and as
              described. We make reasonable efforts to resolve issues relating
              to orders, delivery, returns, replacements, and refunds fairly and
              promptly.
            </p>
          </motion.div>
        </section>

        {/* Policy Sections */}
        <section className="px-4 pb-20 max-w-4xl mx-auto">
          <div className="space-y-6">
            {sections.map((section, index) => {
              const Icon = section.icon;

              return (
                <motion.article
                  key={section.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  className="bg-card rounded-lg border border-border p-6 md:p-8"
                >
                  <div className="flex items-start gap-5">
                    <div className="shrink-0">
                      <Icon className="w-10 h-10 text-primary" />
                    </div>

                    <div className="min-w-0">
                      <h2 className="text-2xl font-bold text-foreground mb-5">
                        {section.title}
                      </h2>

                      <div className="space-y-4 text-muted-foreground leading-relaxed">
                        {section.content}
                      </div>
                    </div>
                  </div>
                </motion.article>
              );
            })}
          </div>
        </section>

        {/* Contact Section */}
        <section className="px-4 py-20 bg-muted/30">
          <div className="max-w-6xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-center"
            >
              <h2 className="text-4xl font-bold text-foreground mb-6">
                Contact Us
              </h2>

              <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10">
                For questions, complaints, returns, replacements, or refund
                requests, customers may contact us through the following
                channels.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
                <a
                  href="mailto:emeritusglobalresources@gmail.com"
                  className="bg-card rounded-lg border border-border p-6 text-center hover:border-primary/50 transition-colors"
                >
                  <Mail className="w-10 h-10 mx-auto text-primary mb-4" />

                  <h3 className="text-xl font-bold text-foreground mb-2">
                    Email
                  </h3>

                  <p className="text-muted-foreground break-all">
                    emeritusglobalresources@gmail.com
                  </p>
                </a>

                <a
                  href="https://wa.me/2348101795519"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-card rounded-lg border border-border p-6 text-center hover:border-primary/50 transition-colors"
                >
                  <MessageCircle className="w-10 h-10 mx-auto text-primary mb-4" />

                  <h3 className="text-xl font-bold text-foreground mb-2">
                    WhatsApp
                  </h3>

                  <p className="text-muted-foreground">08101795519</p>
                </a>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Final Notice */}
        <section className="px-4 py-20 max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl font-bold text-foreground mb-5">
              We&apos;re Here to Help
            </h2>

            <p className="text-lg text-muted-foreground leading-relaxed">
              We are committed to reviewing legitimate customer complaints and
              providing an appropriate resolution.
            </p>

            <p className="mt-6 text-sm font-medium text-muted-foreground">
              Emeritus Global Resources - Refund and Return Policy
            </p>
          </motion.div>
        </section>
      </main>

      <Footer />
    </>
  );
}
