# Clean and Green - Eco-Friendly Cleaning Service Platform

## Overview

Clean and Green is a professional, production-ready cleaning service booking platform focused on eco-friendly solutions in Oklahoma. It enables online booking for residential, commercial, and deep cleaning services, as well as custom quote requests with photo upload capabilities. The platform features a comprehensive admin dashboard for managing bookings, quotes, business analytics, customer interactions, team operations, a tiered referral program with fraud protection, and a Content Management System (CMS) for non-technical users to edit customer-facing content. Key features include a robust booking management system with approval workflows, validation, customer deduplication, and live availability checking. It also incorporates 6 admin intelligence features: Customer Churn Risk Scoring, Smart Anomaly Alerts, Message Status Tracking, Customer Segmentation, Quick Actions Dashboard, and Business Settings Intelligence Controls. The system includes PWA functionality, automated email/SMS notifications, and is deployed to Render.com.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions

The frontend uses React 18, TypeScript, and Vite, built with shadcn/ui (Radix UI and Tailwind CSS) in a "New York" style. It features theme support (light/dark mode) and mobile responsiveness, emphasizing a trust-first, clean, and eco-friendly design.

### Technical Implementations

**Frontend**: React 18, TypeScript, Vite, Wouter for routing, TanStack Query for server state, and React hooks for local UI state.
**Backend**: Express.js and TypeScript (ESM modules) providing a RESTful API. It uses Zod for input validation and Drizzle ORM for database interactions.
**Data Storage**: PostgreSQL (Neon for serverless) managed with Drizzle ORM.
**Authentication**: Passport.js with Local Strategy and Express sessions, bcrypt for password hashing.
**Build & Deployment**: Vite for frontend, esbuild for backend, deployed on Render.com with automated GitHub integration. Schedulers run via Render Cron Jobs for production.

### Feature Specifications

**Booking Management**:
- All bookings default to "pending" status (configurable).
- Validation includes past date prevention, configurable minimum lead time (default 12 hours), and slot capacity limits (default 3 per slot).
- Live availability checking API (`/api/available-slots`).
- Customer deduplication system (SQL-normalized matching on email/phone/address with confidence scoring and merge alerts).
- Enhanced quote-to-booking conversion with customer linking and full validation.

**Admin Dashboard**:
- Collapsible sidebar with 6 logical groups: Overview, Operations, People, Communication, Marketing, Configuration.
- Global search (cmd+k) across bookings, customers, quotes with relevance ranking.
- Intelligence Dashboard displaying churn risk, anomaly alerts, customer segments, message status, and business metrics.
- Content Management System (CMS) for editing 6 sections: home_hero, home_welcome, about_page, services_intro, contact_page, footer.

**Referral Program**:
- Tiered rewards ($10/$15/$20) with multi-signal fraud detection (duplicate address/phone/IP, velocity limits).
- Automated anomaly alerts for suspicious patterns.

**Customer Management**:
- CLV tracking, personal referral codes, churn risk scoring, custom tags.
- Message status tracking (new/in_progress/replied/closed/spam).

**Scheduler Architecture**:
- 6 Cron Job Endpoints (`/api/cron/*`) for review emails, appointment reminders, recurring bookings, follow-up emails, payment reminders, and referral credit processing.
- Secured with `X-Cron-Secret` header in production.

### System Design Choices

- **Type Safety**: Full TypeScript coverage and Zod schemas for validation.
- **Error Handling**: Comprehensive try-catch blocks and specific HTTP status codes.
- **Performance & Caching**: Anti-caching strategy with `Cache-Control` headers, TanStack Query with aggressive staleness settings, background polling (30-second auto-refresh), and robust cache invalidation via `refetchQueries`/`invalidateQueries` on mutations.

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