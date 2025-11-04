# Clean and Green - Eco-Friendly Cleaning Service Platform

## Overview

Clean and Green is a professional cleaning service booking platform focused on eco-friendly cleaning solutions in Oklahoma. The application enables customers to book cleaning services online (residential, commercial, deep cleaning) or request custom quotes. An admin dashboard allows staff to manage bookings, quotes, and track business metrics.

**Core Purpose**: Streamline the booking process for eco-friendly cleaning services while providing trust-building features and efficient business management tools.

**Tech Stack**: React + TypeScript (frontend), Express.js (backend), PostgreSQL with Drizzle ORM (database), TanStack Query (data fetching), shadcn/ui + Tailwind CSS (UI components)

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework & Routing**
- React 18 with TypeScript in strict mode
- Client-side routing using Wouter (lightweight alternative to React Router)
- Single-page application (SPA) with Vite as the build tool and dev server
- Component-based architecture with functional components and hooks

**State Management Strategy**
- TanStack Query (React Query) for server state management
  - Handles API data fetching, caching, and synchronization
  - Configured with `staleTime: Infinity` and disabled auto-refetch to reduce unnecessary requests
  - Custom query client with error handling utilities
- Local component state using React hooks (useState) for form inputs and UI state
- No global state management library (Redux/Zustand) - server state handled by React Query, UI state kept local

**UI Component System**
- shadcn/ui component library (Radix UI primitives with Tailwind styling)
- Design system based on "New York" style variant
- Comprehensive component set: buttons, forms, cards, dialogs, tables, calendars, etc.
- Theme support (light/dark mode) with CSS variables for customization
- Mobile-responsive design with Tailwind's responsive utilities

**Design Philosophy**
- Trust-first approach inspired by TaskRabbit and Thumbtack
- Clean, modern aesthetics using Inter font family
- Green/eco-friendly identity with nature-inspired color palette
- Oklahoma-local, approachable community focus
- Minimal friction booking flow with clear progress indicators

### Backend Architecture

**Server Framework**
- Express.js with TypeScript
- ESM modules (type: "module" in package.json)
- Middleware stack: JSON body parsing, raw body capture for webhooks, request logging

**API Design Pattern**
- RESTful API endpoints under `/api` namespace
- CRUD operations for bookings and quotes
- Status update endpoints using PATCH method
- Standard HTTP status codes (404 for not found, 400 for validation errors, 500 for server errors)
- JSON request/response format

**Request/Response Flow**
1. Client sends requests via custom `apiRequest` utility (includes credentials)
2. Express middleware logs requests with duration tracking
3. Route handlers validate input using Zod schemas
4. Storage layer interacts with database via Drizzle ORM
5. Responses returned as JSON with appropriate status codes

**Error Handling**
- Try-catch blocks in route handlers
- Validation errors return 400 status with error messages
- Database errors logged and return 500 status
- Client-side error handling via React Query's onError callbacks

### Data Storage & Schema

**Database Solution**: PostgreSQL via Neon (serverless PostgreSQL)
- Connection pooling using `@neondatabase/serverless`
- WebSocket connections for serverless environments
- Environment variable `DATABASE_URL` for connection string

**ORM**: Drizzle ORM
- Type-safe database queries
- Schema-first approach with automatic TypeScript type inference
- Migration support via `drizzle-kit`
- Integration with Zod for runtime validation

**Database Schema**:

1. **Users Table**
   - Purpose: Authentication and admin user management
   - Fields: id (UUID), username (unique), password (hashed)
   - Note: Basic auth structure, no session management implemented yet

2. **Bookings Table**
   - Purpose: Store customer cleaning service bookings
   - Fields: id, service type, property size, date, time slot, customer contact info (name, email, phone, address), status, created timestamp
   - Status workflow: pending → confirmed → completed
   - Default status: "pending"

3. **Quotes Table**
   - Purpose: Store custom quote requests
   - Fields: id, service type, property size, custom size, details, customer contact info, status, created timestamp
   - Status workflow: pending → approved → completed
   - Allows custom property sizes for non-standard requests

**Schema Validation**: Zod schemas generated from Drizzle tables using `drizzle-zod`
- Insert schemas omit auto-generated fields (id, timestamps)
- Runtime validation before database operations
- Type inference ensures frontend/backend type consistency

### Authentication & Authorization

**Current State**: Basic structure in place but not fully implemented
- User schema exists with username/password fields
- No active authentication middleware
- No session management or JWT implementation
- Admin routes are currently unprotected

**Intended Design** (based on schema presence):
- Username/password authentication
- Session-based auth likely intended (connect-pg-simple package present for PostgreSQL session store)
- Admin panel should require authentication

### Page Structure & Routing

**Public Pages**:
- `/` - Home page with hero, services overview, how it works, testimonials, CTA
- `/services` - Detailed services page with FAQ accordion
- `/about` - Company information, values, team photo
- `/contact` - Contact form and business information
- `/book` - Multi-step booking form for scheduling cleaning services
- `/quote` - Custom quote request form

**Admin Pages** (currently unprotected):
- `/admin` - Dashboard with statistics and recent bookings table
- `/admin/bookings` - Full bookings management table with status updates
- `/admin/quotes` - Quote requests management table with status updates

### Build & Deployment

**Development Mode**:
- Vite dev server with HMR (Hot Module Replacement)
- Express server in middleware mode serving Vite assets
- TSX for running TypeScript server code without compilation
- Replit-specific plugins for runtime errors and dev banner

**Production Build**:
- Vite builds React app to `dist/public`
- esbuild bundles server code to `dist` directory
- Server serves pre-built static files
- Environment variable `NODE_ENV` controls build behavior

**Type Checking**: Separate `tsc --noEmit` for type validation without compilation

## External Dependencies

### Third-Party Services

**Database**: Neon (Serverless PostgreSQL)
- Managed PostgreSQL database with serverless architecture
- Accessed via `DATABASE_URL` environment variable
- WebSocket connections for compatibility with serverless/edge environments

### UI Libraries & Frameworks

**Component Libraries**:
- Radix UI - Unstyled, accessible component primitives (20+ components imported)
- shadcn/ui - Pre-styled components built on Radix UI
- Tailwind CSS - Utility-first CSS framework for styling

**Icon Library**: Lucide React - Icon set for UI elements

**Form Management**:
- React Hook Form - Form state management and validation
- @hookform/resolvers - Integration with Zod validation schemas

**Date Handling**:
- date-fns - Date formatting and manipulation
- react-day-picker - Calendar component for date selection

**Carousel**: embla-carousel-react - Touch-friendly carousel component

### Development Tools

**Build Tools**:
- Vite - Frontend build tool and dev server
- esbuild - Fast JavaScript bundler for server code
- TypeScript - Type-safe JavaScript

**Replit Integration**:
- @replit/vite-plugin-runtime-error-modal - Runtime error overlay
- @replit/vite-plugin-cartographer - Code navigation
- @replit/vite-plugin-dev-banner - Development mode indicator

### Asset Management

**Images**: Static assets stored in `attached_assets/generated_images/` directory
- Hero images, service showcases, customer testimonials
- Team photos and before/after cleaning examples
- Imported directly into components using Vite's asset handling

### API Communication

**Data Fetching**: TanStack Query (React Query)
- Custom `apiRequest` utility for fetch wrapper
- Automatic retry and caching strategies
- Optimistic updates for status changes

**Request Configuration**:
- Credentials included in all requests (session cookies)
- JSON content-type headers for POST/PATCH requests
- Custom error handling for 401 unauthorized responses