import {
  mockProducts,
  mockCategories,
  mockReviews,
  mockFAQs,
} from "./mock-data";

export async function getProducts() {
  return mockProducts;
}

export async function getProductById(id: string) {
  return mockProducts.find((product) => product.id === id) ?? null;
}

export async function getReviewsByProductId(productId: string) {
  return mockReviews.filter((review) => review.productId === productId);
}

export async function getCategories() {
  return mockCategories;
}

export async function getFaqs() {
  return mockFAQs;
}

// Homepage content management
export interface HomepageContent {
  heroImages: Array<{
    id: number;
    url: string;
    alt: string;
    overlayText: string;
  }>;
  generalSettings: {
    title: string;
    tagline: string;
    metaDescription: string;
    contactInfo: {
      phone: string;
      whatsapp: string;
      email: string;
    };
  };
  trustPillars: Array<{
    title: string;
    description: string;
  }>;
}

export async function getHomepageContent(): Promise<HomepageContent> {
  // In a real implementation, this would fetch from a database
  // For now, returning mock data
  return {
    heroImages: [
      {
        id: 1,
        url: "https://images.unsplash.com/photo-1595941069915-4ebc3b6efd9d?auto=format&fit=crop&w=1800&q=80",
        alt: "Premium smartphone showcase - iPhone 15 Pro Max",
        overlayText: "Premium smartphones"
      },
      {
        id: 2,
        url: "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=1800&q=80",
        alt: "Professional laptop showcase - MacBook Pro",
        overlayText: "Professional laptops"
      },
      {
        id: 3,
        url: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=1800&q=80",
        alt: "Premium tech accessories showcase",
        overlayText: "Premium accessories"
      }
    ],
    generalSettings: {
      title: "Emeritus Global Gadgets - The Tech Gurus",
      tagline: "The premium gadget destination for modern Nigeria",
      metaDescription: "Discover genuine phones, laptops, audio and accessories selected for performance, style and serious everyday use. Official store in Ile-Ife, Osun State.",
      contactInfo: {
        phone: "09048026350",
        whatsapp: "08101795519",
        email: "Emeritusglobalresources@gmail.com"
      }
    },
    trustPillars: [
      {
        title: "Original Devices",
        description: "Every unit is verified before it reaches your hands."
      },
      {
        title: "Warranty Backed",
        description: "Premium protection on selected phones and accessories."
      },
      {
        title: "Fast Delivery",
        description: "Prompt dispatch from our Ile-Ife showroom to your doorstep."
      },
      {
        title: "Secure Payments",
        description: "Paystack, transfer, card, wallet and USSD support."
      }
    ]
  };
}

export async function updateHomepageContent(content: Partial<HomepageContent>) {
  // In a real implementation, this would update the database
  // For now, just returning a success response
  console.log("Updating homepage content:", content);
  return { success: true, message: "Homepage content updated successfully" };
}