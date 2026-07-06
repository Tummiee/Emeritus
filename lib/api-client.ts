/**
 * API Client for Emeritus Gadget
 * Centralized API requests and error handling
 */

import axios, { AxiosInstance, AxiosError } from 'axios'
import { ApiResponse } from './types'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api'

class ApiClient {
  private instance: AxiosInstance

  constructor() {
    this.instance = axios.create({
      baseURL: API_BASE_URL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    })

    // Add request interceptor to include auth token
    this.instance.interceptors.request.use((config) => {
      const token = this.getToken()
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
      return config
    })

    // Add response interceptor for error handling
    this.instance.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response?.status === 401) {
          // Clear token and redirect to login
          this.clearToken()
          if (typeof window !== 'undefined') {
            window.location.href = '/auth/login'
          }
        }
        return Promise.reject(error)
      }
    )
  }

  private getToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('auth_token')
    }
    return null
  }

  private clearToken(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token')
    }
  }

  async get<T>(url: string, config = {}): Promise<ApiResponse<T>> {
    try {
      const response = await this.instance.get<ApiResponse<T>>(url, config)
      return response.data
    } catch (error) {
      return this.handleError(error)
    }
  }

  async post<T>(url: string, data = {}, config = {}): Promise<ApiResponse<T>> {
    try {
      const response = await this.instance.post<ApiResponse<T>>(url, data, config)
      return response.data
    } catch (error) {
      return this.handleError(error)
    }
  }

  async put<T>(url: string, data = {}, config = {}): Promise<ApiResponse<T>> {
    try {
      const response = await this.instance.put<ApiResponse<T>>(url, data, config)
      return response.data
    } catch (error) {
      return this.handleError(error)
    }
  }

  async delete<T>(url: string, config = {}): Promise<ApiResponse<T>> {
    try {
      const response = await this.instance.delete<ApiResponse<T>>(url, config)
      return response.data
    } catch (error) {
      return this.handleError(error)
    }
  }

  private handleError(error: any): ApiResponse {
    console.error('API Error:', error)

    if (error.response) {
      // Server responded with error status
      return {
        success: false,
        error: error.response.data?.error || 'An error occurred',
        message: error.response.data?.message,
      }
    } else if (error.request) {
      // Request made but no response
      return {
        success: false,
        error: 'No response from server. Please check your connection.',
      }
    } else {
      // Error in request setup
      return {
        success: false,
        error: error.message || 'An unexpected error occurred',
      }
    }
  }
}

export const apiClient = new ApiClient()

// API service methods organized by resource
export const productApi = {
  getAll: (params?: any) => apiClient.get('/products', { params }),
  getById: (id: string) => apiClient.get(`/products/${id}`),
  search: (query: string, params?: any) => apiClient.get('/products/search', { params: { q: query, ...params } }),
  getCategories: () => apiClient.get('/products/categories'),
  getBrands: () => apiClient.get('/products/brands'),
}

export const cartApi = {
  get: () => apiClient.get('/cart'),
  add: (productId: string, quantity: number, variantId?: string) =>
    apiClient.post('/cart/items', { productId, quantity, variantId }),
  update: (productId: string, quantity: number) =>
    apiClient.put(`/cart/items/${productId}`, { quantity }),
  remove: (productId: string) => apiClient.delete(`/cart/items/${productId}`),
  clear: () => apiClient.post('/cart/clear'),
}

export const authApi = {
  login: (email: string, password: string) =>
    apiClient.post('/auth/login', { email, password }),
  register: (email: string, password: string, firstName: string, lastName: string) =>
    apiClient.post('/auth/register', { email, password, firstName, lastName }),
  logout: () => apiClient.post('/auth/logout'),
  getProfile: () => apiClient.get('/auth/profile'),
  updateProfile: (data: any) => apiClient.put('/auth/profile', data),
}

export const orderApi = {
  create: (data: any) => apiClient.post('/orders', data),
  getAll: (params?: any) => apiClient.get('/orders', { params }),
  getById: (id: string) => apiClient.get(`/orders/${id}`),
  cancel: (id: string) => apiClient.post(`/orders/${id}/cancel`),
}

export const wishlistApi = {
  get: () => apiClient.get('/wishlist'),
  add: (productId: string) => apiClient.post('/wishlist', { productId }),
  remove: (productId: string) => apiClient.delete(`/wishlist/${productId}`),
}

export const reviewApi = {
  create: (productId: string, data: any) =>
    apiClient.post(`/reviews`, { productId, ...data }),
  getByProduct: (productId: string) =>
    apiClient.get(`/reviews`, { params: { productId } }),
}

export const paymentApi = {
  initiate: (orderData: any) => apiClient.post('/payments/initiate', orderData),
  verify: (reference: string) => apiClient.get(`/payments/verify/${reference}`),
}
