/**
 * Emeritus Gadget - Application Types
 */

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export interface AuthUser {
  id: string
  email: string
  firstName: string
  lastName: string
  role: 'customer' | 'admin' | 'super_admin'
  profileImage?: string
  phone?: string
}

export interface Session {
  user: AuthUser
  token: string
  expiresAt: number
}

export interface FilterOptions {
  search?: string
  category?: string
  brand?: string
  minPrice?: number
  maxPrice?: number
  rating?: number
  inStock?: boolean
  sortBy?: 'newest' | 'popular' | 'price-asc' | 'price-desc' | 'rating'
  page?: number
  limit?: number
}

export interface CartContextType {
  items: CartItemUI[]
  itemCount: number
  total: number
  discount: number
  couponCode: string | null
  discountedTotal: number
  authReady: boolean
  isAuthenticated: boolean
  addItem: (productId: string, quantity: number, variantId?: string) => Promise<boolean>
  removeItem: (productId: string) => void
  updateQuantity: (productId: string, quantity: number) => void
  clearCart: () => void
  applyCoupon: (code: string) => Promise<{ success: boolean; message: string }>
  removeCoupon: () => void
}

export interface CartItemUI {
  productId: string
  name: string
  price: number
  quantity: number
  image: string
  variantId?: string
}

export interface WishlistContextType {
  items: string[]
  isLoading: boolean
  syncError: string | null
  addItem: (productId: string) => void
  removeItem: (productId: string) => void
  isWishlisted: (productId: string) => boolean
}

export interface SortOption {
  value: string
  label: string
}

export interface PriceRange {
  min: number
  max: number
}

export interface HeroImageData {
  id: number;
  url: string;
  alt: string;
  overlayText: string;
}
