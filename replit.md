# Clean and Green - Eco-Friendly Cleaning Service Platform

## Overview

Clean and Green is a production-ready professional cleaning service booking platform specializing in eco-friendly cleaning solutions in Oklahoma. It facilitates online booking for residential, commercial, and deep cleaning services, as well as custom quote requests. The platform features a comprehensive admin dashboard for management of bookings, quotes, business analytics, customer interactions, team operations, and a tiered referral program ($10/$15/$20 rewards). Recently expanded with 6 admin intelligence features fully implemented (November 2025): Customer Churn Risk Scoring with win-back campaigns, Smart Anomaly Alerts for fraud/mistake detection, Message Status Tracking (new/in_progress/replied/closed/spam), Customer Segmentation (VIP/At-risk/New/Referral champions auto-tags), Quick Actions Dashboard (7 actionable metrics), and Business Settings Intelligence Controls (14 configurable fields). The admin interface features a reorganized collapsible sidebar with 6 logical groups (Overview, Operations, People, Communication, Marketing, Configuration), a unified Intelligence Dashboard showing critical business metrics, and a global search component (cmd+k shortcut) that searches across bookings, customers, and quotes with relevance ranking. The system includes PWA functionality, automated email/SMS notifications, and is fully deployed to Render.com with proper production environment configuration.

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
- **Customers**: Comprehensive records with CLV tracking, personal referral codes, churn risk scoring, and custom tags.
- **Referrals**: Tracks referral relationships and tier levels.
- **Referral Credits**: Manages customer credit balances.
- **Referral Settings**: Global referral program configuration.
- **Anomaly Alerts**: Fraud and mistake detection system tracking bulk operations and suspicious activities.
- **Business Settings**: Customizable templates and intelligence feature configuration (win-back campaigns, churn risk thresholds, anomaly detection settings, quick reply templates).
Zod schemas are generated from Drizzle tables for validation and type inference. All new admin intelligence endpoints include strict Zod validation with enum constraints for security.

### Authentication & Authorization

Passport.js with a Local Strategy and Express sessions (stored in PostgreSQL via `connect-pg-simple`) handles authentication. Passwords are secured with Bcrypt. The system includes endpoints for setup, login, logout, and current user retrieval. Admin routes are protected, requiring authentication and redirecting unauthenticated users to `/login`. An initial setup flow ensures secure admin account creation.

### Page Structure & Routing

**Public Pages**: Home (with promo banner, recent bookings, stats, featured gallery), Services, About, Contact, Booking, Quote, Customer Portal, Invoice Payment, Reviews, Privacy Policy, Terms of Service.

**Admin Pages**: Dashboard (with Intelligence Dashboard showing critical metrics), Analytics, Anomaly Alerts, Bookings, Calendar View, Recurring Bookings, Quotes, Invoices, Promo Codes, Service Areas, Employees (with tabbed form interface: Basic Info, Schedule & Availability, Vacation Days), Customer Profiles (with CLV, churn risk, tags, notes, history), Messages (with status tracking: new/in_progress/replied/closed/spam, employee assignment, quick reply), Reviews, Newsletter, Team Management, Business Settings (with intelligence feature controls).

**Admin Features**: 
- **Navigation**: Collapsible sidebar with 6 logical groups (Overview, Operations, People, Communication, Marketing, Configuration)
- **Global Search**: Cmd+K/Ctrl+K keyboard shortcut searching across bookings, customers, and quotes with relevance ranking
- **Intelligence Dashboard**: Consolidated view of Churn Risk alerts, Anomaly alerts, Customer Segments, Message Status, and Business Intelligence metrics with 30-second auto-refresh

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

## Performance & Caching

The application uses a comprehensive anti-caching strategy with intelligent background refresh to ensure real-time data updates:

**Backend**: All 8 public API endpoints (`/api/public/*`) include Cache-Control headers (`no-store, no-cache, must-revalidate, proxy-revalidate`).

**Frontend**: 
- React Query configured with `gcTime: 0`, `staleTime: 0`, `refetchOnMount: "always"`, `refetchOnWindowFocus: true`
- **Background polling**: 30-second auto-refresh on active tabs (disabled on inactive tabs to save resources)
- **Form protection**: AdminSettings and other long-edit forms use `isDirty` guards to prevent background refetches from wiping in-progress edits
- All fetch requests include `cache: "no-store"`
- Admin mutations use a mix of `refetchQueries` (69 instances) and `invalidateQueries` (45 instances) for cache management

This configuration eliminates caching issues that can occur in production builds while maintaining a responsive user experience with automatic updates.

## Code Quality

- **Type Safety**: Full TypeScript coverage across 172 TypeScript files
- **Testing**: Comprehensive data-testid attributes on all interactive elements for e2e testing
- **Components**: 88 reusable components following shadcn/ui patterns
- **Error Handling**: Proper try-catch blocks on all 181 backend routes
- **Security**: Passwords hashed with Bcrypt, no password logging, proper validation with Zod
- **Performance**: Optimized React Query configuration, memoization where needed (9 instances)