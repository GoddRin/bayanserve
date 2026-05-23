# BayanServe

BayanServe is a white-label Local Government Unit (LGU) civic services platform for the Philippines. This production-ready repository is structured as a monorepo utilizing npm workspaces to share database models, TypeScript interfaces, and UI configurations.

## Monorepo Architecture

```
/
├── apps/
│   ├── web/       # Next.js 14 App Router (Citizen Portal & Admin Dashboard)
│   └── api/       # Express.js REST API
├── packages/
│   ├── db/        # Prisma schema + shared PostgreSQL Client
│   ├── ui/        # Shared shadcn/ui custom components & Tailwind presets
│   └── types/     # Shared TypeScript interfaces & types
├── package.json   # Root monorepo workspace configuration
└── tsconfig.json  # Root TypeScript options (extends tsconfig.base.json)
```

## Tech Stack

- **Web App**: Next.js 14 (App Router), React, NextAuth.js v5, Tailwind CSS
- **REST API**: Express.js, TypeScript
- **Database / ORM**: PostgreSQL, Prisma ORM
- **Styling**: Tailwind CSS + Custom theme styling (deep blues, clean government palette, Philippines-centric accents)
- **Tooling**: TypeScript, ESLint, Prettier

---

## Prerequisites

- **Node.js**: version `v18.x` or `v20.x` (LTS recommended)
- **npm**: version `9.x` or above (standard with modern Node)
- **PostgreSQL**: An active PostgreSQL server database instance

---

## Getting Started

### 1. Clone & Install Dependencies

From the repository root, install dependencies and link workspaces:

```bash
npm install
```

### 2. Environment Variables Configuration

Copy the environment files for both apps and customize them:

```bash
# Set up Next.js application environment variables
cp apps/web/.env.example apps/web/.env

# Set up Express.js REST API environment variables
cp apps/api/.env.example apps/api/.env
```

Ensure you update `DATABASE_URL` in both configuration files to point to your PostgreSQL instance, and populate the NextAuth secrets.

### 3. Database Initialization

Generate the Prisma client and run migrations:

```bash
# Generate the client
npm run prisma:generate --workspace=@bayanserve/db

# Apply migrations and create schemas (requires active DATABASE_URL)
npm run prisma:migrate --workspace=@bayanserve/db
```

### 4. Run Development Servers

Start both the Next.js frontend application and Express.js REST API concurrently:

```bash
npm run dev
```

The web application runs on `http://localhost:3000` by default.
The REST API runs on `http://localhost:5000` by default.

---

## Code Quality

To lint the codebase:

```bash
npm run lint
```

To format code using Prettier:

```bash
npm run format
```
