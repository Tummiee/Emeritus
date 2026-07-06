# Emeritus Gadget - Premium Tech E-commerce Platform

A full-stack Next.js 16 ecommerce platform for selling premium gadgets and technology products with integrated payment processing, admin dashboard, and advanced features.

## 🎯 Features

### Customer Features
- **Product Catalog** - Browse products with filtering, sorting, and search functionality
- **Shopping Cart** - Add/remove products, manage quantities
- **Wishlist** - Save products for later
- **Checkout Process** - Multi-step checkout with shipping and payment options
- **Product Reviews** - View and submit reviews with ratings
- **Order Tracking** - Track order status and shipments
- **User Accounts** - Create accounts, manage profile and addresses
- **Coupon System** - Apply discount codes at checkout

### Admin Features
- **Dashboard** - Overview of sales, orders, and business metrics
- **Product Management** - Add, edit, delete products with bulk operations
- **Order Management** - View, process, and manage customer orders
- **Customer Management** - View customer profiles and purchase history
- **Analytics & Reports** - Sales trends, revenue breakdowns, top products
- **Settings** - Configure store, notifications, and preferences

### Payment Integration
- **Paystack Integration** - Secure payment processing via Paystack
- **Payment Verification** - Webhook verification for payment confirmation
- **Order Creation** - Automatic order creation after successful payment

## 🛠️ Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript, Tailwind CSS 4, Framer Motion
- **Backend**: Next.js API Routes
- **Database**: Supabase PostgreSQL with Row Level Security
- **UI Components**: shadcn/ui
- **Payment**: Paystack
- **State Management**: Context API, Custom Hooks
- **Styling**: Tailwind CSS with custom design tokens

## 📦 Getting Started

### Installation

1. **Install dependencies**
   ```bash
   pnpm install
   ```

2. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```

   Add your environment variables:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   NEXT_PUBLIC_PAYSTACK_KEY=your_paystack_public_key
   PAYSTACK_SECRET_KEY=your_paystack_secret_key
   NEXT_PUBLIC_API_URL=http://localhost:3000
   ```

3. **Apply the Supabase migrations**

   Run every SQL file in `supabase/migrations` in filename order. Existing
   projects that already ran migrations `001` through `005` must also run
   `202607010006_checkout_payments_tracking.sql`,
   `202607020001_storefront_interactions.sql`, and
   `202607030001_paystack_hardening.sql`.

4. **Run the development server**
   ```bash
   pnpm dev
   ```

   Open [http://localhost:3000](http://localhost:3000) to view the application.

## 📁 Project Structure

```
.
├── app/
│   ├── api/              # API routes for backend functionality
│   ├── admin/            # Admin dashboard pages
│   ├── auth/             # Authentication pages
│   ├── product/          # Product detail page
│   ├── checkout/         # Checkout page
│   ├── shop/             # Product catalog page
│   ├── cart/             # Shopping cart page
│   ├── wishlist/         # Wishlist page
│   └── layout.tsx        # Root layout with providers
├── components/
│   ├── admin/            # Admin components
│   ├── Header.tsx        # Navigation header
│   ├── Footer.tsx        # Footer component
│   ├── ProductCard.tsx   # Product card component
│   └── ...               # Other components
├── lib/
│   ├── contexts/         # Context providers (Cart, Wishlist)
│   ├── hooks/            # Custom hooks
│   ├── types.ts          # TypeScript type definitions
│   ├── mock-data.ts      # Mock data for development
│   ├── api-client.ts     # API client utilities
│   └── ...               # Other utilities
├── public/               # Static assets
└── app/globals.css       # Global styles with design tokens
```

## 🎨 Design System

The application uses a premium tech-focused design system with:
- **Primary Color**: #1e40af (Blue)
- **Accent Color**: #3b82f6 (Light Blue)
- **Neutrals**: Slate color palette
- **Typography**: Geist font family
- **Components**: shadcn/ui with custom theming

## 📱 Pages

### Customer Pages
- `/` - Homepage with featured products
- `/shop` - Product catalog with filters
- `/product/[id]` - Product detail page
- `/cart` - Shopping cart
- `/wishlist` - Wishlist
- `/checkout` - Multi-step checkout
- `/auth/login` - Login page
- `/auth/register` - Registration page
- `/about` - About us page
- `/contact` - Contact form
- `/faq` - Frequently asked questions
- `/terms` - Terms of service
- `/privacy` - Privacy policy

### Admin Pages
- `/admin` - Dashboard
- `/admin/products` - Product management
- `/admin/orders` - Order management
- `/admin/customers` - Customer management
- `/admin/analytics` - Analytics and reports
- `/admin/settings` - Store settings

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration

### Products
- `GET /api/products` - Get all products
- `GET /api/products/[id]` - Get product details
- `GET /api/categories` - Get product categories
- `GET /api/search` - Search products

### Orders
- `GET /api/orders` - Get user orders
- `POST /api/orders` - Create new order
- `GET /api/orders/[id]` - Get order details

### Payments
- `POST /api/payments/initialize` - Initialize Paystack payment
- `POST /api/payments/verify` - Verify payment
- `POST /api/payments/webhook` - Paystack webhook handler

### Other
- `GET /api/coupons` - Validate coupon codes
- `GET /api/tracking` - Get order tracking info
- `GET /api/reviews` - Get product reviews
- `POST /api/reviews` - Submit product review
- `GET /api/wishlist` - Get user wishlist

## 💳 Payment Integration

This project uses Paystack for payment processing. To enable payments:

1. Create a Paystack account at [paystack.com](https://paystack.com)
2. Add the matching secret key and public application URL to `.env.local`
3. Apply every Supabase migration in filename order
4. Configure `https://YOUR_PUBLIC_DOMAIN/api/payments/webhook` as the webhook
   URL in the Paystack dashboard
5. Complete the test-mode checkout and webhook scenarios before using live keys

Only authenticated users can create orders. Prices, coupons, inventory, totals,
payment references, and settlement are controlled by the server. A browser
callback is never treated as proof of payment.

## 🚀 Deployment

### Deploy to Vercel

The easiest way to deploy is using [Vercel](https://vercel.com):

1. Push your code to GitHub
2. Connect your GitHub repository to Vercel
3. Add environment variables in Vercel project settings
4. Vercel will automatically build and deploy on push

### Alternative Deployment

This is a standard Next.js 16 application and can be deployed to any Node.js hosting provider.

## 📝 Development Notes

- Product, customer, order, repair, review, coupon, tracking, payment, media,
  inventory, homepage, and administration data use Supabase
- Payment processing is integrated with Paystack - configure keys for production
- Email notifications can be added by integrating email services
- All API endpoints support mock data and are ready for database integration

## 🤝 Contributing

Contributions are welcome! Please follow the existing code style and component patterns.

## 📞 Support

For questions or support, contact support@emeritusgadget.com

## 📄 License

This project is part of the Emeritus Gadget platform. All rights reserved.
# emeritus-gadget
# Emeritus_store
# Emeritus_store
# Emeritus
