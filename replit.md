# Clean and Green - Eco-Friendly Cleaning Service Platform

## Overview

Clean and Green is a professional cleaning service booking platform focused on eco-friendly cleaning solutions in Oklahoma. It enables customers to book residential, commercial, and deep cleaning services online or request custom quotes. The platform also includes an admin dashboard for managing bookings, quotes, business metrics, customer reviews, newsletters, and team directories. The core purpose is to streamline the booking process for eco-friendly cleaning services, build customer trust, and provide efficient business management tools.

### Recent Enhancements (November 2025)

**Customer Engagement Features:**
- **Promo Banner**: Automatically displays active promo codes on the homepage with dismissible functionality (7-day localStorage)
- **Social Proof System**: Live recent bookings ticker, animated statistics counter, and featured before/after photo gallery
- **30-Day Follow-Up Automation**: Automated email system that sends "Book Again" emails to customers 30 days after service completion

**Admin Tools:**
- **Analytics Dashboard**: Comprehensive business intelligence with interactive charts and downloadable reports
  - **Date Range Filtering**: 6 preset options (Today, 7 Days, 30 Days, 90 Days, 1 Year, Custom) with dual-month calendar picker
  - **Downloadable Reports**: PDF and CSV export options with date-stamped filenames
  - Revenue trends with configurable time periods
  - Booking status breakdown with pie charts
  - Top services by revenue with bar charts
  - Customer acquisition trends over time
  - Key performance indicators: total revenue, avg booking value, total customers, total bookings
  - Top 10 customers by lifetime revenue
  - All analytics data filters based on selected date range
- **Calendar View**: Visual monthly calendar for booking management
  - Color-coded bookings by status (pending, confirmed, completed, cancelled)
  - Month navigation with "Today" quick jump
  - Booking details dialog with full information
  - Multi-booking day support with overflow badges
- **Customer Lifetime Value (CLV) Tracking**: Advanced customer analytics
  - Lifetime revenue calculation from paid invoices
  - Average booking value and repeat customer rate
  - Customer status classification (New/Active/Loyal)
  - Days as customer and booking history metrics
  - Integrated into customer profile pages
- **Service Area Management**: Geographic service coverage control
  - Define serviceable regions with zip code arrays
  - Admin interface for CRUD operations on service areas
  - Real-time zip code validation during booking
  - User-facing alerts for unsupported service areas
  - Simple display of service area names on booking form
  - **Complete Oklahoma Coverage**: 8 primary service areas with 97 total zip codes
    - Oklahoma City (76 zips), Edmond (6 zips), Norman (6 zips), Moore (4 zips)
    - Yukon (2 zips), Piedmont (1 zip), Mustang (1 zip), El Reno (1 zip)
- **Customer Profile System**: Comprehensive customer history view with booking/quote/invoice tracking, custom notes, and customer lifetime value metrics
- **Customer Notes**: Admins can add and manage notes about customer preferences, special requests, allergies, and gate codes
- **Email Template System**: Pre-made reusable email templates for bulk emails and newsletters
  - 8 default templates covering promotions, announcements, seasonal greetings, thank you messages, and follow-ups
  - Template categories: promotion, announcement, thank_you, seasonal, follow_up
  - Quick template selection in both Newsletter and Customer bulk email features
  - Templates can be edited before sending for customization
- **Automated Payment Reminders**: Intelligent overdue invoice management
  - Automatic detection of overdue invoices (unpaid/partially paid past due date)
  - Escalating reminder emails at 3, 7, and 14 days overdue
  - Email tone escalates from friendly to urgent
  - Direct payment links included in all reminders
  - Tracking of reminder count and last sent date to prevent duplicates
  - Hourly scheduler checks for eligible invoices
  - **Customizable Email Templates**: Admins can customize subject and body for all 3 reminder levels
    - Editable templates for 3-day, 7-day, and 14-day overdue reminders
    - Support for placeholders: {{customerName}}, {{invoiceNumber}}, {{amountDue}}, {{daysOverdue}}, {{paymentLink}}
    - Falls back to professional default templates if left blank
    - On/off toggle to enable/disable payment reminders globally
- **Customer Autocomplete**: Manual booking form includes searchable dropdown to select existing customers, automatically filling email, phone, and address to prevent duplicate customer records
- **Search Functionality**: 
  - Customers table: Search by name, email, or phone number with instant filtering
  - Bookings table: Search by customer name, email, phone, address, or service type
  - Quotes table: Search by customer name, email, phone, address, or service type
  - Invoices table: Search by customer name, email, phone, address, or invoice number
  - Promo Codes table: Search by code or description
  - Service Areas table: Search by region name or zip code
  - "Select All" checkbox respects active search filters
- **Bulk Actions**:
  - Select All checkbox in Bookings table (respects search filters)
  - Bulk email functionality for sending emails to multiple booking customers
  - Clear selection functionality after bulk actions
- **CSV Export**:
  - Export Customers to CSV (all filtered customers with name, email, phone, address, created date)
  - Export Bookings to CSV (filtered bookings with customer info, service, date, time, status, employees)
  - Export Invoices to CSV (filtered invoices with invoice number, customer, service, amounts, status, due date)
  - Currency values automatically converted from cents to dollars in exports
  - All exports respect active search filters
- **Mobile-First Design**: Fully responsive admin interface
  - All tables support horizontal scrolling on mobile devices
  - Responsive dialog widths for optimal mobile viewing
  - Touch-friendly UI with proper touch target sizing (44x44px minimum)
  - Responsive grid layouts adapt to screen size
  - Charts resize dynamically for mobile screens
- **Chronological Ordering**: Both customers and bookings automatically display newest entries first (descending by creation date)

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
- **Email Templates**: Reusable email templates with name, category, subject, and body fields for bulk communications.
- **Service Areas**: Geographic coverage with region names and zip code arrays for service area validation.
- **Invoices**: Enhanced with lastReminderSentAt and reminderCount for automated payment reminders.
- **Customers**: Comprehensive customer records with CLV tracking integration.
- **Business Settings**: Extended with payment reminder template fields (paymentReminderEnabled, paymentReminder3DaySubject/Body, paymentReminder7DaySubject/Body, paymentReminder14DaySubject/Body) for customizable automated email templates.
Zod schemas are generated from Drizzle tables for runtime validation and type inference.

### Authentication & Authorization

Authentication uses Passport.js with a Local Strategy (username/password) and Express sessions stored in PostgreSQL via `connect-pg-simple`. Passwords are secured with Bcrypt. The system includes endpoints for setup, login, logout, and fetching the current user. All admin routes are protected and require authentication, redirecting unauthenticated users to `/login`. A setup flow ensures initial admin account creation before locking access.

### Page Structure & Routing

**Public Pages**: Include Home (with promo banner, recent bookings ticker, stats counter, featured gallery), Services, About, Contact, Booking, Quote, Customer Portal, Invoice Payment, Reviews, Privacy Policy, and Terms of Service.

**Admin Pages** (authentication required): Dashboard, Analytics, Bookings, Calendar View, Recurring Bookings, Quotes, Invoices, Promo Codes, Service Areas, Employees, Customer Profiles (with CLV metrics, notes and history), Messages, Reviews, Newsletter, Team Management, and Business Settings.

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