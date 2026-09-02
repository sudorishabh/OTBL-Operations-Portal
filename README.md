# OTBL Monorepo

Welcome to the OTBL (Oil & Gas / Remediation Services Management) monorepo. This project is a comprehensive digital solution designed to manage complex industrial workflows, field operations, and remediation processes such as "Oil Zapping" and "Bioremediation."

Built with a modern, scalable architecture, this monorepo streamlines the lifecycle of work orders, site activities, and project proposals.

## 🏗️ Architecture & Core Components

This project uses **Turborepo** and **PNPM** for high-performance monorepo management. It is organized into distinct applications for different user roles and shared packages for reusable logic.

### Applications (`/apps`)

- **[web](file:///c:/Users/Rishabh.Negi_i/OneDrive%20-%20The%20Energy%20and%20Resources%20Institute/Desktop/My_Files/Projects/OTBL/otbl-monorepo-2/apps/web)**: A powerful Next.js 15 administrative dashboard for managing work orders, clients, sites, and remediation activities.
- **[server](file:///c:/Users/Rishabh.Negi_i/OneDrive%20-%20The%20Energy%20and%20Resources%20Institute/Desktop/My_Files/Projects/OTBL/otbl-monorepo-2/apps/server)**: An Express-based backend serving as the tRPC API provider, handling business logic, database orchestration, and external integrations (AWS S3, email).

### Shared Packages (`/packages`)

- **[@pkg/trpc](file:///c:/Users/Rishabh.Negi_i/OneDrive%20-%20The%20Energy%20and%20Resources%20Institute/Desktop/My_Files/Projects/OTBL/otbl-monorepo-2/packages/trpc)**: End-to-end typesafe API definitions shared between the server and all clients.
- **[@pkg/db](file:///c:/Users/Rishabh.Negi_i/OneDrive%20-%20The%20Energy%20and%20Resources%20Institute/Desktop/My_Files/Projects/OTBL/otbl-monorepo-2/packages/db)**: Database schema and Drizzle ORM configuration for MySQL.
- **[@pkg/auth](file:///c:/Users/Rishabh.Negi_i/OneDrive%20-%20The%20Energy%20and%20Resources%20Institute/Desktop/My_Files/Projects/OTBL/otbl-monorepo-2/packages/auth)**: Shared authentication logic and JWT handling.
- **[@pkg/schema](file:///c:/Users/Rishabh.Negi_i/OneDrive%20-%20The%20Energy%20and%20Resources%20Institute/Desktop/My_Files/Projects/OTBL/otbl-monorepo-2/packages/schema)**: Zod validation schemas used across the entire stack.
- **[@pkg/utils](file:///c:/Users/Rishabh.Negi_i/OneDrive%20-%20The%20Energy%20and%20Resources%20Institute/Desktop/My_Files/Projects/OTBL/otbl-monorepo-2/packages/utils)**: Common utility functions and helpers.
- **[@repo/ui](file:///c:/Users/Rishabh.Negi_i/OneDrive%20-%20The%20Energy%20and%20Resources%20Institute/Desktop/My_Files/Projects/OTBL/otbl-monorepo-2/packages/ui)**: A shared React component library (Tailwind CSS, Radix UI).

---

## 🛠️ Technology Stack

- **Frameworks**: Next.js 15 (App Router), Expo (React Native), Express
- **API**: tRPC (Typesafe API)
- **Database**: MySQL with Drizzle ORM
- **Styling**: Tailwind CSS & Lucide Icons
- **Validation**: Zod
- **Infrastructure**: AWS S3 (File Storage), Nodemailer (Notifications)

---

## 🚀 Getting Started

### Prerequisites

- **Node.js**: version 18 or higher.
- **PNPM**: Installed globally (`npm i -g pnpm`).
- **MySQL**: A running instance for the database.

### Setup

1. **Install dependencies**:
   ```bash
   pnpm install
   ```

2. **Environment Variables**:
   Copy `.env.example` to `.env` in the root and relevant apps/packages, then fill in your credentials.

3. **Database Setup**:
   ```bash
   pnpm db:generate # Generate migrations
   pnpm db:migrate  # Apply migrations
   ```

4. **Start Development**:
   ```bash
   pnpm dev
   ```
   This will start the web app, mobile bundler, and server concurrently.

---

## 🧪 Development Workflow

- **Build all projects**: `pnpm build`
- **Lint codes**: `pnpm lint`
- **Type checking**: `pnpm check-types`
- **Database Studio**: `pnpm db:studio` (Visualize your data)

---

## 🧩 Business Domains

This platform manages several key remediation workflows:
- **Work Orders**: Lifecycle management from creation to completion.
- **Site Activities**: Tracking daily tasks and progress on-site.
- **Oil Zapping**: Specialized remediation data tracking.
- **Proposals & Billing**: Managing client interactions and financial tracking.
