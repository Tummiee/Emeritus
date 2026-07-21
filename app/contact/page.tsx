'use client'

import React, { useState, type ChangeEvent, type FormEvent } from 'react'
import { motion } from 'framer-motion'
import { Mail, Phone, MapPin, Clock } from 'lucide-react'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { useToast } from '@/components/ui/toast'

export default function ContactPage() {
  const { showToast } = useToast()
  const [formData, setFormData] = useState({ name: '', email: '', subject: '', message: '' })
  const [submitted, setSubmitted] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setPending(true)
    setError('')
    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(formData),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error)
      setFormData({ name: '', email: '', subject: '', message: '' })
      setSubmitted(true)
      showToast({ kind: 'success', title: 'Message sent', description: 'We will get back to you as soon as possible.' })
    } catch (submissionError) {
      const message = submissionError instanceof Error ? submissionError.message : 'Your message could not be sent.'
      setError(message)
      showToast({ kind: 'error', title: 'Message not sent', description: message })
    } finally {
      setPending(false)
    }
  }

  const contactInfo = [
    {
      icon: Mail,
      title: 'Email',
      content: 'support@emeritusgadgets.com',
      subtext: 'We respond within 24 hours',
      href: 'mailto:support@emeritusgadgets.com',
    },
    {
      icon: Phone,
      title: 'Phone',
      content: '+234 701 234 5678',
      subtext: 'Mon-Fri, 9AM-6PM WAT',
      href: 'tel:+2347012345678',
    },
    {
      icon: MapPin,
      title: 'Office',
      content: 'Ile-Ife, Osun, Nigeria',
      subtext: 'Visit our showroom',
    },
    {
      icon: Clock,
      title: 'Business Hours',
      content: 'Mon-Sat: 9AM-6PM',
      subtext: 'Sun: Closed',
      href: '#contact-form',
    },
  ]

  return (
    <>
      <Header />
      <main className="min-h-screen bg-background">
        {/* Header */}
        <section className="px-4 py-20 text-center bg-gradient-to-br from-primary/10 to-accent/10">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-5xl font-bold text-foreground mb-4"
          >
            Get in Touch
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg text-muted-foreground max-w-2xl mx-auto"
          >
            Have questions? We&apos;re here to help. Contact us anytime.
          </motion.p>
        </section>

        {/* Contact Info Grid */}
        <section className="px-4 py-20 max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-20">
            {contactInfo.map((info, i) => (
              <motion.a
                key={i}
                href={info.href}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: i * 0.1 }}
                className="bg-card rounded-lg border border-border p-6 text-center transition-colors hover:border-primary"
              >
                <info.icon className="w-12 h-12 mx-auto text-primary mb-4" />
                <h3 className="font-bold text-foreground mb-2">{info.title}</h3>
                <p className="text-foreground font-semibold mb-1">{info.content}</p>
                <p className="text-sm text-muted-foreground">{info.subtext}</p>
              </motion.a>
            ))}
          </div>

          {/* Contact Form */}
          <motion.div
            id="contact-form"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="bg-card rounded-lg border border-border p-8 max-w-2xl mx-auto"
          >
            <h2 className="text-2xl font-bold text-foreground mb-6">Send us a Message</h2>

            {submitted ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4 }}
                className="bg-green-100 border border-green-200 text-green-800 p-4 rounded-lg text-center"
              >
                <p className="font-semibold">Thank you for your message!</p>
                <p className="text-sm">We&apos;ll get back to you shortly.</p>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</p>}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="sr-only" htmlFor="contact-name">Your name</label>
                  <input
                    id="contact-name"
                    type="text"
                    name="name"
                    placeholder="Your Name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="px-4 py-3 border border-border rounded-lg bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <label className="sr-only" htmlFor="contact-email">Your email</label>
                  <input
                    id="contact-email"
                    type="email"
                    name="email"
                    placeholder="Your Email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="px-4 py-3 border border-border rounded-lg bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <label className="sr-only" htmlFor="contact-subject">Subject</label>
                <input
                  id="contact-subject"
                  type="text"
                  name="subject"
                  placeholder="Subject"
                  value={formData.subject}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border border-border rounded-lg bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />

                <label className="sr-only" htmlFor="contact-message">Your message</label>
                <textarea
                  id="contact-message"
                  name="message"
                  placeholder="Your Message"
                  value={formData.message}
                  onChange={handleChange}
                  required
                  rows={6}
                  className="w-full px-4 py-3 border border-border rounded-lg bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                />

                <button
                  type="submit"
                  disabled={pending}
                  className="w-full px-6 py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 transition-colors"
                >
                  {pending ? 'Sending...' : 'Send Message'}
                </button>
              </form>
            )}
          </motion.div>
        </section>
      </main>
      <Footer />
    </>
  )
}
