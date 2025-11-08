# Clean & Green - Eco-Friendly Cleaning Services

A professional cleaning service booking platform focused on eco-friendly cleaning solutions in Oklahoma.

## Features

- 🏠 **Customer Features**
  - Book cleaning services online
  - Request custom quotes
  - View services and pricing
  - FAQ section
  - Gallery of work

- 👨‍💼 **Admin Dashboard**
  - Manage bookings and quotes
  - Update service offerings
  - Manage customer data
  - Create and track invoices
  - Edit FAQ items
  - Update gallery images
  - Business settings management

- 🌿 **Eco-Friendly Focus**
  - All services use environmentally safe products
  - Oklahoma-based, community-focused

## Tech Stack

- **Frontend**: React, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Express.js, Node.js
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Session-based auth
- **Build Tool**: Vite
- **Deployment**: Render.com (free tier)

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL database

### Installation

1. Clone the repository
```bash
git clone https://github.com/YOUR_USERNAME/clean-and-green-website.git
cd clean-and-green-website
```

2. Install dependencies
```bash
npm install
```

3. Set up environment variables
```bash
# Copy .env.example to .env and fill in your values
DATABASE_URL=your_postgresql_connection_string
SESSION_SECRET=your_secret_key
```

4. Push database schema
```bash
npm run db:push
```

5. Seed database with default data
```bash
npx tsx server/seed.ts
```

6. Start development server
```bash
npm run dev
```

Visit `http://localhost:5000`

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed instructions on deploying to Render.com for free!

## Project Structure

```
├── client/              # React frontend
│   ├── src/
│   │   ├── components/  # Reusable UI components
│   │   ├── pages/       # Page components
│   │   └── lib/         # Utilities
├── server/              # Express backend
│   ├── routes.ts        # API routes
│   ├── storage.ts       # Database layer
│   └── db.ts            # Database connection
├── shared/              # Shared types and schemas
│   └── schema.ts        # Drizzle schema & Zod validation
└── attached_assets/     # Static assets (images)
```

## Admin Access

The admin dashboard is available at `/admin` after authentication.

## License

MIT

## Support

For questions or support, please contact your administrator.

