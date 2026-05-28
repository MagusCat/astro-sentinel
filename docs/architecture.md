# Architecture & Technical Stack

Sentinel relies on a modern, serverless-ready web stack focused on performance, rapid development, and maintainability.

## Technology Stack
- **Framework**: [Next.js 15](https://nextjs.org/) (App Router) for hybrid rendering (SSR/SSG), nested layouts, and seamless React Server Components (RSC).
- **UI & Component Library**: [shadcn/ui](https://ui.shadcn.com/) built on top of [Radix UI](https://www.radix-ui.com/) primitives for accessible, unstyled, and fully customizable components.
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/) for utility-first UI design and modern CSS-variable-based theming.
- **State Management**: [Zustand](https://zustand-demo.pmnd.rs/) for lightweight, centralized global UI state handling where React state isn't enough.
- **Backend & Database**: [Supabase](https://supabase.com/) (PostgreSQL) for persistence, authentication, and Row Level Security (RLS).
- **Package Manager**: [pnpm](https://pnpm.io/) for fast, disk-space efficient dependency management.

---

## Component Strategy
We strictly follow a **Modular Primitive Strategy** instead of rigid Atomic Design:
- **Primitives**: Base UI components (Buttons, Dialogs, Inputs) are managed via `shadcn/ui` inside the `/components/ui` directory. These are fully owned by our codebase and styled via Tailwind.
- **Composition**: Business logic is decoupled from pure presentation. Complex interfaces are built by composing these highly accessible primitives together into domain-specific features.

---

## How It Works

### 1. Routing & Layouts
Handled automatically by Next.js's file-based App Router inside the `/app` directory. 
- **Persistent Layouts**: Structural elements (Sidebar, Header) use nested `layout.tsx` files to preserve state and prevent unnecessary re-renders during navigation.
- **Pages**: Defined via `page.tsx` files, defaulting to Server Components for faster initial page loads.

### 2. Data Flow & Server Architecture
- **Server-First Mindset**: Data fetching happens directly on the server inside Server Components using the Supabase Server Client.
- **Mutations**: Data writes and sensitive operations utilize **React Server Actions** directly connected to Supabase, eliminating the need for separate API route maintenance.
- **Client State**: Local UI state is handled via React's `useState` and `useMemo`. Complex global state uses Zustand stores.

### 3. Authentication & Security
- **Session Management**: Supabase handles JWT generation and session persistence via cookies.
- **Route Protection**: Next.js Middleware (`middleware.tsx`) intercepts incoming requests to read the Supabase session, protecting authenticated routes and handling redirects before the page renders.
- **Data Safety**: Database security is enforced at the database level using PostgreSQL Row Level Security (RLS).