# Clean and Green - Design Guidelines

## Design Approach

**Reference-Based Approach** drawing from service marketplace leaders:
- **Primary Inspiration**: TaskRabbit (service booking flow), Thumbtack (quote requests)
- **Secondary References**: Airbnb (trust-building elements), modern SaaS dashboards (admin interface)
- **Rationale**: This cleaning service needs to build immediate trust while making booking effortless. The eco-friendly angle requires fresh, professional aesthetics that convey reliability and environmental consciousness.

## Core Design Principles

1. **Trust First**: Professional imagery, clear pricing, testimonials prominently featured
2. **Effortless Booking**: Minimal friction in form completion with clear progress indicators
3. **Green Identity**: Nature-inspired without clichés - think modern eco-brand
4. **Oklahoma Local**: Authentic, approachable, community-focused

## Typography

**Font Stack** (Google Fonts):
- **Headings**: Inter (600, 700) - Clean, modern, professional
- **Body**: Inter (400, 500) - Excellent readability, friendly
- **Accents/CTAs**: Inter (500, 600)

**Hierarchy**:
- Hero Headline: text-5xl md:text-6xl lg:text-7xl, font-bold
- Section Headers: text-3xl md:text-4xl, font-semibold
- Subsections: text-xl md:text-2xl, font-semibold
- Body Text: text-base md:text-lg
- Small Text/Labels: text-sm

## Layout System

**Spacing Primitives**: Tailwind units of 2, 4, 6, 8, 12, 16, 20, 24
- Tight spacing: gap-2, gap-4 (form elements, icon-text pairs)
- Standard spacing: p-6, p-8, gap-8 (cards, sections)
- Generous spacing: py-16, py-20, py-24 (page sections)
- Hero padding: py-20 md:py-32

**Container Strategy**:
- Page containers: max-w-7xl mx-auto px-4 md:px-6 lg:px-8
- Content sections: max-w-6xl
- Text content: max-w-3xl (forms, about text)
- Full-width: Background sections with inner constrained content

**Grid Patterns**:
- Services: 3-column grid (grid-cols-1 md:grid-cols-2 lg:grid-cols-3)
- Testimonials: 2-column (grid-cols-1 md:grid-cols-2)
- Admin dashboard: Responsive table with card fallback on mobile

## Component Library

### Navigation
- **Desktop**: Horizontal nav with logo left, links center, "Book Now" CTA right
- **Mobile**: Hamburger menu with slide-in drawer
- Sticky header with subtle shadow on scroll
- Links: Home, Services, About, Contact, Get Quote
- CTA button elevated with distinct treatment

### Hero Section (Homepage)
- **Large Hero Image**: Professional cleaning team in action, bright natural lighting
- Full-width background image with overlay gradient (dark overlay for text contrast)
- Centered content with max-w-4xl
- Headline + subheadline + dual CTAs ("Book Cleaning" primary, "Get Quote" secondary)
- Trust indicators below CTAs: "★★★★★ 500+ Happy Customers | Eco-Friendly Products | Serving Oklahoma"
- Height: min-h-[600px] md:min-h-[700px]

### Service Cards
- Rounded corners (rounded-lg)
- Icon at top (large, 48px)
- Service name (text-xl font-semibold)
- Description (2-3 lines)
- Price range or "From $X"
- "Learn More" link
- Hover: Subtle lift effect (shadow enhancement)

### Booking Form
- Multi-step wizard (3 steps):
  1. Service Selection (visual cards)
  2. Details & Schedule (form fields + date picker)
  3. Contact & Confirmation
- Progress bar at top showing current step
- Large, clear input fields with labels above
- Date picker with calendar UI
- Time slot selection as buttons
- Floating labels or clear placeholder text
- Validation feedback inline
- Sticky footer with "Back" and "Next/Submit" buttons

### Quote Request Form
- Single-page form with clear sections
- File upload area for property photos (drag-and-drop zone)
- Textarea for detailed requirements (min-h-32)
- Property size selector (visual buttons: Small/Medium/Large/Custom)
- Contact information fields grouped
- Large "Submit Quote Request" button

### Admin Dashboard
- **Sidebar Navigation**: Fixed left sidebar (w-64) with:
  - Logo/Brand at top
  - Dashboard, Bookings, Quotes, Customers, Settings links
  - Logout at bottom
- **Main Content Area**: ml-64 with full-width tables
- **Stats Cards** at top: Total Bookings, Pending Quotes, Revenue, Active Customers (grid-cols-4)
- **Data Tables**: Clean borders, alternating row backgrounds, sortable columns
- **Status Badges**: Pill-shaped with status-specific treatments (Pending/Confirmed/Completed)
- **Action Buttons**: Icon buttons for view/edit/delete

### Testimonial Cards
- Customer photo (circular, 64px)
- Star rating (visual stars)
- Quote text (italic)
- Customer name + location
- Service type received
- Rounded card with subtle shadow

### Footer
- **Three Columns**:
  1. About Clean & Green + social links
  2. Quick Links (Services, Book Now, Quote, Contact)
  3. Contact Info + Newsletter signup
- Bottom bar: Copyright, Privacy Policy, Terms
- Background distinguished from page content

### Buttons
- **Primary CTA**: Large (px-8 py-4), bold text, rounded-lg
- **Secondary**: Outlined version of primary
- **Text Links**: Underline on hover
- Consistent sizing: Small (px-4 py-2), Medium (px-6 py-3), Large (px-8 py-4)
- Disabled states: Reduced opacity

## Images

### Required Images with Descriptions:

1. **Hero Image (Homepage)**: Professional cleaning team of 2-3 people in Clean & Green uniforms, cleaning a modern bright living room, smiling at camera, natural window lighting, eco-friendly cleaning products visible, wide shot showing pristine results

2. **Services Section**: Three supporting images
   - Residential cleaning: Sparkling clean modern kitchen
   - Commercial cleaning: Clean office space with desks
   - Deep cleaning: Before/after split or detailed surface close-up

3. **About Section**: Team photo of Clean & Green staff, friendly and professional, outdoor shot showing Oklahoma setting

4. **Testimonials**: Customer headshots (placeholder: diverse group, friendly expressions)

5. **Process/How It Works**: Icon-based illustrations or simple photos showing: Book → Clean → Enjoy

## Page-Specific Layouts

### Homepage Structure
1. Hero with large image and CTAs
2. Trust Bar (stats/certifications)
3. Services Grid (3 columns)
4. How It Works (3-step process)
5. Testimonials (2 columns, 4-6 reviews)
6. Call-to-Action section (full-width with booking prompt)
7. Footer

### Services Page
1. Services hero (smaller, text-focused)
2. Detailed service cards with pricing tiers
3. Add-ons section
4. Service area map
5. FAQ accordion
6. CTA to book

### Booking Page
- Clean, focused layout with form wizard
- No distractions, progress clearly shown
- Confirmation screen with booking details

### Admin Dashboard
- Sidebar + main content layout
- Stats overview cards
- Sortable, filterable tables
- Modal overlays for detail views

## Accessibility & Forms

- All form inputs have visible labels
- Focus states clearly indicated (ring-2 with offset)
- Error messages in red with icons
- Success states in green
- Keyboard navigation fully supported
- ARIA labels on interactive elements
- Color contrast meets WCAG AA standards

## Visual Consistency Notes

- Consistent border radius: rounded-lg (8px) for cards/buttons
- Consistent shadow levels: shadow-sm (subtle), shadow-md (cards), shadow-lg (elevated)
- Icon size consistency: 20px (inline), 24px (buttons), 48px (feature icons)
- Maintain 8px spacing grid throughout

This design creates a trustworthy, professional cleaning service brand that's easy to navigate and book while showcasing Clean & Green's eco-friendly values and Oklahoma roots.