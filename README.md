# Sentinel Academy Management Hub

Sentinel is a state-of-the-art academy management platform built to streamline the daily operations of dance academies, pole sport studios, and recreational sports centers. Designed for maximum usability, high contrast touch-targets, and an extremely premium dark-theme visual experience.

---

## 🚀 Phase 0 Accomplishments (Completed)

We have successfully initialized the workspace, configured the technical stack, resolved OS-level execution restrictions, and created the foundational Supabase database connectivity layer.

### 1. Framework & UI Initialization
* **Next.js 15.5 (App Router)**: Initialized as the hybrid rendering React 19 core framework.
* **Tailwind CSS v4**: Installed with inline variables and custom utilities.
* **shadcn/ui (base-nova style)**: Configured and integrated with components mapped to `@/components` and primitives in `@/components/ui/`.
* **TypeScript & ESLint**: Fully type-safe and lint-checked build pipeline (exit code `0`).

### 2. Supabase SSR Integration Layer
* **Browser Client (`lib/supabase/client.ts`)**: Secure utility for client-side queries and mutations.
* **Server Client (`lib/supabase/server.ts`)**: Configured with Next.js 15 asynchronous cookie handlers for fetch operations in React Server Components and Server Actions.
* **Middleware Handler (`lib/supabase/middleware.ts`)**: Automatically refreshes expired cookie sessions on page visits.
* **Global Interceptor (`middleware.ts`)**: Seamlessly binds session checking to all active pages.

### 3. Connection Diagnostics Dashboard
* **Diagnostics Daemon (`app/actions/diagnostics.ts`)**: A robust Server Action validating the environment, API handshake, and live PostgreSQL connection.
* **Diagnostic Panel (`app/page.tsx`)**: An interactive dashboard showing details, live indicators, and progress states.

---

## 🛠️ Tech Stack & Dependencies

* **Core**: Next.js `15.5.18` (App Router), React `19.1.0`
* **Styling**: Tailwind CSS `4.3.0`, tw-animate-css, clsx, tailwind-merge
* **UI Base**: shadcn/ui (Radix primitives), lucide-react
* **State**: Zustand `5.0.13`
* **Database**: Supabase JS `2.106.2`, Supabase SSR `0.10.3`
* **Package Manager**: pnpm `9.15.9`

---

## 🔒 Special Partition Fixes (Permission Denied / noexec Mounts)

If the workspace is mounted on a partition with `noexec` restrictions (e.g., `/mnt`), standard binary execution (like running `./node_modules/.bin/next` or `./node_modules/.bin/pnpm`) will throw `EACCES (Permission Denied)`.

We solved this using a double-layered shim strategy:

1. **Local pnpm Wrapper**:
   We wrote a executable wrapper inside the home directory (`/home/randomly/.gemini/antigravity/bin/pnpm`) that redirects execution using the explicit `node` interpreter:
   ```bash
   exec node /mnt/code/workspace/web/sentinel/node_modules/pnpm/bin/pnpm.cjs "$@"
   ```
2. **Explicit Node Interpreter Dev/Build**:
   For running Next.js compiler scripts, we explicitly call the `node` interpreter over the package binary:
   * **Build**: `node node_modules/next/dist/bin/next build`
   * **Dev Server**: `node node_modules/next/dist/bin/next dev`
   * **Start Server**: `node node_modules/next/dist/bin/next start`

---

## 💻 Development & Operations

### Environment Configuration
Copy the sample template to configure your local keys:
```bash
cp .env.example .env.local
```
Fill `.env.local` with your database credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key-here
```

### Running Locally
To launch the hot-reloading development server on [http://localhost:3000](http://localhost:3000):
```bash
node node_modules/next/dist/bin/next dev
```

### Building for Production
To compile and bundle assets under strict TypeScript and ESLint validation:
```bash
node node_modules/next/dist/bin/next build
```

---

## 📁 Architecture Directory Structure

```
sentinel/
├── app/                      # Next.js App Router (RSC and Client components)
│   ├── actions/
│   │   └── diagnostics.ts    # Database ping & env diagnostic Server Actions
│   ├── globals.css           # Tailwind v4 globals & shadcn/ui variables
│   ├── layout.tsx            # Global layout shell
│   └── page.tsx              # Interactive connection dashboard & phase roadmap
├── components/               # Domain-agnostic UI primitives
│   └── ui/
│       └── button.tsx        # Base shadcn button component
├── docs/                     # Architectural & development phases documentation
│   ├── architecture.md
│   ├── overview.md
│   └── phases.md
├── lib/                      # Core integration utilities
│   ├── supabase/
│   │   ├── client.ts         # Supabase Client-side SDK client
│   │   ├── middleware.ts     # Cookie session middleware resolver
│   │   └── server.ts         # Supabase RSC server client
│   └── utils.ts              # Tailwind merger helper
├── middleware.ts             # Route interceptor and session manager
├── tsconfig.json             # TypeScript settings
└── components.json           # shadcn configuration map
```

---

## 🎨 Premium Aesthetics Philosophy
The main screen utilizes a sleek glassmorphic layout, slate gradients, and a glowing cyan accent scheme that perfectly balances accessibility with modern professional web design. Hovering over cards, running diagnostics, and checking progress indicators are accompanied by fluid CSS transitions and interactive loading indicators.
