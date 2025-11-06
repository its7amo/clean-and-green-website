# Clean and Green - Eco-Friendly Cleaning Service Platform

## Overview

Clean and Green is a professional cleaning service booking platform focused on eco-friendly cleaning solutions in Oklahoma. It enables customers to book residential, commercial, and deep cleaning services online or request custom quotes. The platform also includes an admin dashboard for managing bookings, quotes, business metrics, customer reviews, newsletters, and team directories. The core purpose is to streamline the booking process for eco-friendly cleaning services, build customer trust, and provide efficient business management tools.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend

The frontend uses React 18 with TypeScript, Wouter for client-side routing, and Vite for building. It follows a component-based architecture with functional components and hooks. State management is handled by TanStack Query for server state (data fetching, caching, synchronization) and React hooks for local UI state. The UI is built with shadcn/ui (based on Radix UI and Tailwind CSS), featuring a "New York" style variant, theme support (light/dark mode), and mobile responsiveness. The design prioritizes a trust-first approach, clean aesthetics, and an eco-friendly identity.

### Backend

The backend is built with Express.js and TypeScript, using ESM modules. It provides a RESTful API under the `/api` namespace for CRUD operations, status updates, and follows standard HTTP status codes. Request/response flow involves client-side `apiRequest` utility, Express middleware for logging, Zod for input validation, and Drizzle ORM for database interaction. Error handling includes try-catch blocks, specific status codes for validation and server errors, and client-side error callbacks.

### Data Storage & Schema

PostgreSQL (via Neon for serverless deployment) is the database, with Drizzle ORM for type-safe queries and migrations. The database schema includes tables for:
- **Users**: Authentication and admin management.
- **Bookings**: Customer cleaning service bookings with status workflow.
- **Quotes**: Custom quote requests with status workflow.
- **Contact Messages**: Customer contact form submissions with status workflow.
- **Promo Codes**: Management of discount codes with usage tracking.
- **Recurring Bookings**: Automatic recurring service appointments.
- **Job Photos**: Before/after photos for completed jobs.
- Enhanced Bookings table with promo code integration and reminder tracking.
Zod schemas are generated from Drizzle tables for runtime validation and type inference.

### Authentication & Authorization

Authentication uses Passport.js with a Local Strategy (username/password) and Express sessions stored in PostgreSQL via `connect-pg-simple`. Passwords are secured with Bcrypt. The system includes endpoints for setup, login, logout, and fetching the current user. All admin routes are protected and require authentication, redirecting unauthenticated users to `/login`. A setup flow ensures initial admin account creation before locking access.

### Page Structure & Routing

**Public Pages**: Include Home, Services, About, Contact, Booking, Quote, Customer Portal, Invoice Payment, Reviews, Privacy Policy, and Terms of Service.

**Admin Pages** (authentication required): Dashboard, Bookings, Quotes, Invoices, Promo Codes, Employees, Messages, Reviews, Newsletter, Team Management, and Business Settings.

**Employee Pages**: Employee Login and Employee Dashboard for work assignments.

### Build & Deployment

Development uses Vite for the frontend and an Express server with HMR. Production builds involve Vite for the React app and esbuild for the server code, with static file serving. Type checking is handled separately by `tsc --noEmit`.

## External Dependencies

### Third-Party Services

- **Database**: Neon (Serverless PostgreSQL)
- **Email Notifications**: Resend API
- **SMS Notifications**: Twilio API
- **Payment Processing**: Stripe

### UI Libraries & Frameworks

- **Component Libraries**: Radix UI, shadcn/ui
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Form Management**: React Hook Form, @hookform/resolvers (with Zod)
- **Date Handling**: date-fns, react-day-picker
- **Carousel**: embla-carousel-react

### Development Tools

- **Build Tools**: Vite, esbuild, TypeScript
- **Replit Integration**: @replit/vite-plugin-runtime-error-modal, @replit/vite-plugin-cartographer, @replit/vite-plugin-dev-banner

### API Communication

- **Data Fetching**: TanStack Query (React Query)