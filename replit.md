# Clean and Green - Eco-Friendly Cleaning Service Platform

## Overview

Clean and Green is a professional cleaning service booking platform specializing in eco-friendly cleaning solutions in Oklahoma. It facilitates online booking for residential, commercial, and deep cleaning services, as well as custom quote requests. The platform features an admin dashboard for comprehensive management of bookings, quotes, business analytics, customer interactions, and team operations. Its primary goal is to streamline eco-friendly cleaning service bookings, foster customer trust, and provide robust tools for efficient business management.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend

The frontend is built with React 18, TypeScript, and Vite, utilizing a component-based architecture with functional components and hooks. Wouter handles client-side routing. State management relies on TanStack Query for server state and React hooks for local UI state. The user interface, built with shadcn/ui (Radix UI and Tailwind CSS), features a "New York" style, theme support (light/dark mode), and mobile responsiveness, emphasizing a trust-first, clean, and eco-friendly design.

### Backend

The backend is developed with Express.js and TypeScript (ESM modules), providing a RESTful API under the `/api` namespace. It handles CRUD operations and status updates, adhering to standard HTTP status codes. The request/response flow integrates a client-side `apiRequest` utility, Express middleware for logging, Zod for input validation, and Drizzle ORM for database interactions. Error handling includes comprehensive try-catch blocks, specific status codes for various errors, and client-side error callbacks.

### Data Storage & Schema

PostgreSQL (Neon for serverless deployment) is the database, managed with Drizzle ORM for type-safe queries and migrations. Key tables include:
- **Users**: Authentication and admin management.
- **Bookings**: Service bookings with status workflow and referral tracking.
- **Quotes**: Custom quote requests.
- **Contact Messages**: Submissions from the contact form.
- **Promo Codes**: Discount code management.
- **Recurring Bookings**: Automated recurring services.
- **Job Photos**: Before/after photos for services.
- **Email Templates**: Reusable templates for bulk communications.
- **Service Areas**: Geographic coverage with zip code validation.
- **Invoices**: Includes payment reminder tracking and referral program integration.
- **Customers**: Comprehensive records with CLV tracking and personal referral codes.
- **Referrals**: Tracks referral relationships and tier levels.
- **Referral Credits**: Manages customer credit balances.
- **Referral Settings**: Global referral program configuration.
- **Business Settings**: Customizable payment reminder email templates.
Zod schemas are generated from Drizzle tables for validation and type inference.

### Authentication & Authorization

Passport.js with a Local Strategy and Express sessions (stored in PostgreSQL via `connect-pg-simple`) handles authentication. Passwords are secured with Bcrypt. The system includes endpoints for setup, login, logout, and current user retrieval. Admin routes are protected, requiring authentication and redirecting unauthenticated users to `/login`. An initial setup flow ensures secure admin account creation.

### Page Structure & Routing

**Public Pages**: Home (with promo banner, recent bookings, stats, featured gallery), Services, About, Contact, Booking, Quote, Customer Portal, Invoice Payment, Reviews, Privacy Policy, Terms of Service.

**Admin Pages**: Dashboard, Analytics, Bookings, Calendar View, Recurring Bookings, Quotes, Invoices, Promo Codes, Service Areas, Employees, Customer Profiles (with CLV, notes, history), Messages, Reviews, Newsletter, Team Management, Business Settings.

**Employee Pages**: Employee Login, Employee Dashboard.

### Build & Deployment

**Development**: Uses Vite for frontend HMR and an Express development server.
**Production**: Deployed on Render.com with automated GitHub integration. The build process involves `npm install && npm run build`, followed by `npm start`. Vite builds the React frontend, esbuild bundles the Express backend, and static files are served from `dist/public`. Environment variables for production include `APP_URL`, `DATABASE_URL`, `SESSION_SECRET`, `STRIPE_SECRET_KEY`, `RESEND_API_KEY`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and `TWILIO_PHONE_NUMBER`.

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

### API Communication

- **Data Fetching**: TanStack Query (React Query)