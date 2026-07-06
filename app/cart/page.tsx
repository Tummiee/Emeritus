'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { useCart } from '@/lib/contexts/CartContext'
import { Trash2, Plus, Minus, ShoppingCart } from 'lucide-react'
import { motion } from 'framer-motion'

export default function CartPage() {
  const { items, total, discount, couponCode, discountedTotal, removeItem, updateQuantity, clearCart, applyCoupon, removeCoupon } = useCart()
  const [promoCode, setPromoCode] = useState('')
  const [promoMessage, setPromoMessage] = useState('')
  const [applyingPromo, setApplyingPromo] = useState(false)
  const [taxRule, setTaxRule] = useState({ name: 'VAT', rate: 7.5 })
  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/tax?country=NG', { cache: 'no-store', signal: controller.signal })
      .then((response) => response.ok ? response.json() : null)
      .then((result) => {
        if (result?.data) setTaxRule({ name: result.data.name, rate: Number(result.data.rate) })
      })
      .catch(() => undefined)
    return () => controller.abort()
  }, [])
  const tax = discountedTotal * (taxRule.rate / 100)
  const orderTotal = discountedTotal + tax

  if (items.length === 0) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <motion.div
            className="text-center py-12"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <ShoppingCart className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h1 className="text-3xl font-bold text-foreground mb-2">Your cart is empty</h1>
            <p className="text-muted-foreground mb-8">Add some products to get started!</p>
            <Link
              href="/shop"
              className="inline-block px-8 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              Continue Shopping
            </Link>
          </motion.div>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <motion.h1
            className="text-4xl font-bold text-foreground mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            Shopping Cart
          </motion.h1>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <motion.div
              className="lg:col-span-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6 }}
            >
              <div className="bg-card rounded-xl border border-border overflow-hidden">
                {items.map((item, index) => (
                  <motion.div
                    key={item.productId}
                    className="flex gap-6 p-6 border-b border-border last:border-b-0"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1, duration: 0.4 }}
                  >
                    {/* Product Image */}
                    <div className="w-24 h-24 rounded-lg bg-muted flex-shrink-0 overflow-hidden">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    {/* Product Details */}
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground mb-2">{item.name}</h3>
                      <p className="text-lg font-bold text-primary mb-4">₦{item.price.toLocaleString("en-NG", { maximumFractionDigits: 2 })}</p>

                      {/* Quantity Controls */}
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                          className="p-1 hover:bg-muted rounded transition-colors"
                        >
                          <Minus className="w-4 h-4 text-muted-foreground" />
                        </button>
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) =>
                            updateQuantity(item.productId, parseInt(e.target.value) || 1)
                          }
                          className="w-16 px-2 py-1 border border-border rounded text-center"
                        />
                        <button
                          onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                          className="p-1 hover:bg-muted rounded transition-colors"
                        >
                          <Plus className="w-4 h-4 text-muted-foreground" />
                        </button>
                      </div>
                    </div>

                    {/* Total & Remove */}
                    <div className="text-right flex-shrink-0">
                      <p className="text-xl font-bold text-foreground mb-4">
                        ₦{(item.price * item.quantity).toLocaleString("en-NG", { maximumFractionDigits: 2 })}
                      </p>
                      <button
                        onClick={() => removeItem(item.productId)}
                        className="text-red-600 hover:text-red-700 transition-colors"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Continue Shopping */}
              <div className="mt-6">
                <Link
                  href="/shop"
                  className="text-primary hover:text-primary/80 transition-colors font-semibold"
                >
                  ← Continue Shopping
                </Link>
              </div>
            </motion.div>

            {/* Order Summary */}
            <motion.div
              className="bg-card rounded-xl border border-border p-6 h-fit"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
            >
              <h2 className="text-xl font-bold text-foreground mb-6">Order Summary</h2>

              <div className="space-y-4 mb-6 pb-6 border-b border-border">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span>₦{total.toLocaleString("en-NG", { maximumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Shipping</span>
                  <span className="text-right text-sm">Calculated at checkout</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>{taxRule.name} ({taxRule.rate}%)</span>
                  <span>₦{tax.toLocaleString("en-NG", { maximumFractionDigits: 2 })}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <span>Discount ({couponCode})</span>
                    <span>-₦{discount.toLocaleString()}</span>
                  </div>
                )}
              </div>

              <div className="flex justify-between text-lg font-bold text-foreground mb-6">
                <span>Total</span>
                <span>₦{orderTotal.toLocaleString("en-NG", { maximumFractionDigits: 2 })}</span>
              </div>

              <Link
                href="/checkout"
                className="w-full block text-center px-6 py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 transition-colors mb-4"
              >
                Proceed to Checkout
              </Link>

              <button
                onClick={clearCart}
                className="w-full px-6 py-3 border border-border text-foreground rounded-lg hover:bg-muted transition-colors"
              >
                Clear Cart
              </button>

              {/* Promo Code */}
              <div className="mt-6 pt-6 border-t border-border">
                <p className="text-sm text-muted-foreground mb-2">Have a promo code?</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Enter code"
                    value={promoCode}
                    onChange={(event) => setPromoCode(event.target.value)}
                    disabled={applyingPromo}
                    className="flex-1 px-3 py-2 border border-border rounded text-sm"
                  />
                  <button
                    disabled={applyingPromo || !promoCode.trim()}
                    onClick={async () => {
                      setApplyingPromo(true)
                      const result = await applyCoupon(promoCode.trim())
                      setPromoMessage(result.message)
                      setApplyingPromo(false)
                    }}
                    className="px-3 py-2 bg-primary/10 text-primary rounded text-sm font-semibold hover:bg-primary/20 transition-colors disabled:opacity-50"
                  >
                    {applyingPromo ? 'Applying...' : 'Apply'}
                  </button>
                </div>
                {couponCode && <button onClick={removeCoupon} className="mt-2 text-xs font-medium text-red-600">Remove {couponCode}</button>}
                {promoMessage && <p className="mt-2 text-xs text-muted-foreground" role="status">{promoMessage}</p>}
              </div>
            </motion.div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
