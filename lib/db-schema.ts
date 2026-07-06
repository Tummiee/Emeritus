/**
 * Emeritus Gadget Database Schema
 * Comprehensive ecommerce platform with user management, products, orders, and admin features
 */

export interface User {
  id: string
  email: string
  password: string
  firstName: string
  lastName: string
  phone: string
  role: 'customer' | 'admin' | 'super_admin'
  profileImage?: string
  verified: boolean
  createdAt: Date
  updatedAt: Date
}

export interface Category {
  id: string
  name: string
  description: string
  image: string
  slug: string
  active: boolean
  displayOrder: number
  createdAt: Date
  updatedAt: Date
}

export interface Brand {
  id: string
  name: string
  logo: string
  description: string
  website?: string
  active: boolean
  createdAt: Date
  updatedAt: Date
}

export interface Product {
  id: string
  name: string
  description: string
  longDescription: string
  sku: string
  categoryId: string
  brandId: string
  price: number
  comparePrice?: number
  cost?: number
  discount?: number
  images: string[]
  thumbnail: string
  rating: number
  reviewCount: number
  stock: number
  lowStockThreshold: number
  active: boolean
  featured: boolean
  warranty: string
  specifications: Record<string, any>
  tags: string[]
  createdAt: Date
  updatedAt: Date
}

export interface ProductVariant {
  id: string
  productId: string
  name: string
  attributes: Record<string, string>
  sku: string
  price: number
  stock: number
  images: string[]
  active: boolean
  createdAt: Date
  updatedAt: Date
}

export interface Review {
  id: string
  productId: string
  userId: string
  rating: number
  title: string
  content: string
  helpful: number
  verified: boolean
  createdAt: Date
  updatedAt: Date
}

export interface Wishlist {
  id: string
  userId: string
  productId: string
  createdAt: Date
}

export interface Cart {
  id: string
  userId: string
  items: CartItem[]
  createdAt: Date
  updatedAt: Date
}

export interface CartItem {
  productId: string
  variantId?: string
  quantity: number
  price: number
  addedAt: Date
}

export interface Address {
  id: string
  userId: string
  type: 'billing' | 'shipping'
  firstName: string
  lastName: string
  phone: string
  street: string
  city: string
  state: string
  postalCode: string
  country: string
  default: boolean
  createdAt: Date
  updatedAt: Date
}

export interface Coupon {
  id: string
  code: string
  type: 'percentage' | 'fixed'
  value: number
  maxUses?: number
  currentUses: number
  minAmount: number
  maxDiscount?: number
  active: boolean
  startDate: Date
  endDate: Date
  createdAt: Date
  updatedAt: Date
}

export interface Order {
  id: string
  orderNumber: string
  userId: string
  items: OrderItem[]
  subtotal: number
  tax: number
  shipping: number
  discount: number
  total: number
  status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded'
  paymentStatus: 'pending' | 'completed' | 'failed' | 'refunded'
  paymentMethod: string
  paymentRef: string
  shippingAddress: Address
  billingAddress: Address
  notes: string
  trackingNumber?: string
  estimatedDelivery?: Date
  createdAt: Date
  updatedAt: Date
}

export interface OrderItem {
  productId: string
  variantId?: string
  name: string
  quantity: number
  price: number
  total: number
}

export interface Payment {
  id: string
  orderId: string
  userId: string
  amount: number
  currency: string
  status: 'pending' | 'completed' | 'failed'
  method: 'paystack' | 'bank_transfer'
  reference: string
  transactionId?: string
  errorMessage?: string
  createdAt: Date
  updatedAt: Date
}

export interface Inventory {
  id: string
  productId: string
  variantId?: string
  quantity: number
  reserved: number
  warehouse?: string
  lastUpdated: Date
}

export interface Notification {
  id: string
  userId: string
  type: 'order' | 'product' | 'promotion' | 'system'
  title: string
  message: string
  link?: string
  read: boolean
  createdAt: Date
}

export interface OrderTracking {
  id: string
  orderId: string
  status: string
  location: string
  timestamp: Date
  notes: string
}

export interface Report {
  id: string
  type: 'sales' | 'inventory' | 'customers' | 'performance'
  period: 'daily' | 'weekly' | 'monthly'
  data: Record<string, any>
  generatedAt: Date
  createdAt: Date
}

export interface AdminSettings {
  storeName: string
  storeEmail: string
  phone: string
  address: string
  logo: string
  currency: string
  timezone: string
  taxRate: number
  shippingCost: number
  freeShippingThreshold: number
  paystackPublicKey: string
  maintenanceMode: boolean
  updatedAt: Date
}
