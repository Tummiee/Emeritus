'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { WishlistContextType } from '../types'
import { useToast } from '@/components/ui/toast'

const WishlistContext = createContext<WishlistContextType | undefined>(undefined)

export function WishlistProvider({ children }: { children: ReactNode }) {
  const { showToast } = useToast()
  const [items, setItems] = useState<string[]>([])
  const [mounted, setMounted] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [syncError, setSyncError] = useState<string | null>(null)

  // Load wishlist from localStorage on mount
  useEffect(() => {
    const savedWishlist = localStorage.getItem('wishlist')
    let localItems: string[] = []
    if (savedWishlist) {
      try {
        const parsed: unknown = JSON.parse(savedWishlist)
        if (Array.isArray(parsed)) {
          localItems = parsed.filter((id): id is string => typeof id === 'string')
          setItems(localItems)
        }
      } catch (error) {
        console.error('Failed to load wishlist:', error)
        localStorage.removeItem('wishlist')
      }
    }
    fetch('/api/wishlist')
      .then((response) => response.ok ? response.json() : null)
      .then((result) => {
        if (result?.data) {
          setItems((local) => Array.from(new Set([...local, ...result.data])))
          result.data.length === 0 && localStorage.getItem('wishlist') &&
            localItems.forEach((productId: string) =>
              fetch('/api/wishlist', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ productId, action: 'add' }) }),
            )
        }
      })
      .catch(() => setSyncError('Could not sync your saved products. Local favorites are still available.'))
      .finally(() => setIsLoading(false))
    setMounted(true)
    const signedOut = () => {
      setItems([])
      setSyncError(null)
      localStorage.removeItem('wishlist')
    }
    window.addEventListener('emeritus:signout', signedOut)
    return () => window.removeEventListener('emeritus:signout', signedOut)
  }, [])

  // Save wishlist to localStorage whenever it changes
  useEffect(() => {
    if (mounted) {
      localStorage.setItem('wishlist', JSON.stringify(items))
    }
  }, [items, mounted])

  const addItem = (productId: string) => {
    setSyncError(null)
    setItems((prevItems) => (prevItems.includes(productId) ? prevItems : [...prevItems, productId]))
    showToast({ kind: 'success', title: 'Saved to your wishlist' })
    void fetch('/api/wishlist', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ productId, action: 'add' }) })
      .then((response) => {
        if (!response.ok && response.status !== 401) throw new Error()
      })
      .catch(() => {
        const message = 'Your favorite was saved on this device but could not be synced.'
        setSyncError(message)
        showToast({ kind: 'warning', title: 'Saved on this device only', description: message })
      })
  }

  const removeItem = (productId: string) => {
    setSyncError(null)
    setItems((prevItems) => prevItems.filter((id) => id !== productId))
    showToast({ kind: 'info', title: 'Removed from your wishlist' })
    void fetch('/api/wishlist', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ productId, action: 'remove' }) })
      .then((response) => {
        if (!response.ok && response.status !== 401) throw new Error()
      })
      .catch(() => {
        const message = 'The favorite was removed on this device but could not be synced.'
        setSyncError(message)
        showToast({ kind: 'warning', title: 'Wishlist sync delayed', description: message })
      })
  }

  const isWishlisted = (productId: string) => {
    return items.includes(productId)
  }

  return (
    <WishlistContext.Provider value={{ items, isLoading, syncError, addItem, removeItem, isWishlisted }}>
      {children}
    </WishlistContext.Provider>
  )
}

export function useWishlist() {
  const context = useContext(WishlistContext)
  if (context === undefined) {
    throw new Error('useWishlist must be used within a WishlistProvider')
  }
  return context
}
