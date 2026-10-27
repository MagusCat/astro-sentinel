# Sentinel System Comprehensive Audit Report

**Document Version**: 1.0.0  
**Audit Date**: October 11, 2026  
**Auditor**: Sentinel System Audit Team (Worker M1)  
**Target Workspace**: `/mnt/code/workspace/web/sentinel`  
**Reference Specification**: `ORIGINAL_REQUEST.md` (Requirements R1 & R2)  
**Project Roadmap**: `PROJECT.md` (Milestones M1–M6, Features F01–F22)  

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Verification Baseline & Diagnostic Status](#2-verification-baseline--diagnostic-status)
3. [Complete Route Status Catalog](#3-complete-route-status-catalog)
   - [3.1 App Router Top-Level Routes](#31-app-router-top-level-routes)
   - [3.2 Dashboard Sub-Routing & Tabs Catalog (13 Tabs)](#32-dashboard-sub-routing--tabs-catalog-13-tabs)
   - [3.3 Navigation Bugs & Routing Anomalies](#33-navigation-bugs--routing-anomalies)
4. [CMS Sections Catalog](#4-cms-sections-catalog)
   - [4.1 Active CMS Sections (10 Sections)](#41-active-cms-sections-10-sections)
   - [4.2 Orphaned HeaderEditor Component](#42-orphaned-headereditor-component)
   - [4.3 CMS Secondary Views & Setup Traps](#43-cms-secondary-views--setup-traps)
5. [Unfinished UI Elements, Dead Buttons & Placeholder Stubs](#5-unfinished-ui-elements-dead-buttons--placeholder-stubs)
6. [Security, Authentication & Authorization Audit](#6-security-authentication--authorization-audit)
   - [6.1 Architecture & Session Security Model](#61-architecture--session-security-model)
   - [6.2 Server Actions Inventory & Role Guard Verification](#62-server-actions-inventory--role-guard-verification)
   - [6.3 Security Guard Script Evaluation (`scripts/check-guards.sh`)](#63-security-guard-script-evaluation-scriptscheck-guardssh)
   - [6.4 Database RLS Policies & Transactional RPCs](#64-database-rls-policies--transactional-rpcs)
   - [6.5 Security Vulnerabilities & Information Leakage](#65-security-vulnerabilities--information-leakage)
7. [Error Handling & Boundaries Audit](#7-error-handling--boundaries-audit)
   - [7.1 Route Error Boundaries Deficit](#71-route-error-boundaries-deficit)
   - [7.2 Loading Boundaries Status](#72-loading-boundaries-status)
   - [7.3 Data Fetching & Query Failure Resilience](#73-data-fetching--query-failure-resilience)
   - [7.4 Client Form Validation & Inline Error Reporting](#74-client-form-validation--inline-error-reporting)
8. [Responsive Layout Audit](#8-responsive-layout-audit)
   - [8.1 Tablet Viewport (768px–1024px) Compression](#81-tablet-viewport-768px1024px-compression)
   - [8.2 Flex-Width Conflict in Modals](#82-flex-width-conflict-in-modals)
   - [8.3 Grid Breakpoint Skips](#83-grid-breakpoint-skips)
   - [8.4 Data Table Overflow Containment](#84-data-table-overflow-containment)
9. [Prioritized Remediation Action Plan & Milestone Traceability](#9-prioritized-remediation-action-plan--milestone-traceability)

---

## 1. Executive Summary

Sentinel is a specialized gym and martial arts academy management platform built with **Next.js 15 (App Router)**, **Supabase (PostgreSQL 17)**, and **Tailwind CSS v4**. It governs gym facility operations, multi-currency cashiers, student memberships, inventory point-of-sale, staff access control, and an integrated public content management system (CMS).

A comprehensive architectural and code-level audit was conducted across the entire codebase (`src/app`, `src/features`, `src/components`, `src/lib`, `supabase/migrations`, and `scripts`). A total of **92 TypeScript React components (`.tsx`)**, **24 server action and query modules (`.ts`)**, **22 database migrations**, and **4 automated test suites** were inspected.

### Core Audit Discoveries

1. **Production Build Failure (`pnpm build`)**:
   Next.js 15 static prerendering fails with exit code 1 on `/_not-found`. The root layout (`src/app/layout.tsx:42`) mounts `<NavigationIndicator />`, which calls `useSearchParams()` without a `<Suspense>` wrapper. This triggers an unhandled CSR bailout during static generation.
2. **Total Absence of Error Boundaries**:
   The entire application contains **zero error boundaries** (`error.tsx`, `global-error.tsx`, `not-found.tsx`). Any uncaught server component error or data fetching failure produces unstyled internal Next.js 500 error pages.
3. **Dead-End Controls & Orphaned Components**:
   - **Sales Reports**: The "Exportar" button has no `onClick` handler (`sales-reports.tsx:91–95`).
   - **Developer Panel**: The "Limpiar Caché" dialog exists in JSX but has no trigger button (`developer-panel.tsx:198–213`).
   - **Reception Search**: Client search results are non-interactive cards with no action buttons (`reception-panel.tsx:98–121`).
   - **Payments Log**: A complete `CreatePaymentModal` exists in the codebase but is never imported or rendered.
   - **CMS Editor**: `HeaderEditor` exists in `src/features/cms/editors/components/header-editor.tsx` but is completely omitted from the CMS shell.
   - **Checkout Search**: Dynamic client search does not retain the client object in state, resulting in blank athlete names on receipts.
4. **Security & Information Leakage**:
   - CMS server actions (`backups`, `core`, `media`) interpolate raw `err.message` strings directly into client-facing responses.
   - `publishSiteContent` writes raw JSON directly to storage without Zod schema validation.
   - `getMembershipsPanelData()` query lacks a `try/catch` block, causing unhandled promise rejections on authorization failure.
   - Mutations in `clients` and `memberships` omit `revalidateTag(DASHBOARD_CACHE_TAG)`, leaving dashboard counters stale.
5. **Responsive Layout Vulnerabilities**:
   - At 768px tablet portrait width, an expanded sidebar (256px) and page padding (80px) squeeze usable content width to **432px**.
   - `ClientDetailsModal` specifies column widths `md:w-[40%]` and `lg:w-2/3` (66.7%), which total `106.7%` on `lg:` viewports, inducing flex wrapping distortion.
   - Checkout catalog grid skips `md:`, jumping from 1 column directly to 2 columns on `lg:`.

---

## 2. Verification Baseline & Diagnostic Status

The baseline verification commands were executed in `/mnt/code/workspace/web/sentinel` with the following outcomes:

| Verification Gate | Command | Status | Details / Root Cause |
| :--- | :--- | :--- | :--- |
| **Static Types** | `pnpm typecheck` | **PASS (0)** | TypeScript compiler completes with zero type errors. |
| **Security Guardrails** | `bash scripts/check-guards.sh` | **PASS (0)** | 20 server action files checked against `requireRole()`; 2 allowlisted. |
| **Automated Tests** | `pnpm test` | **PASS (24/24)** | 4 test suites pass in ~1.1s (checkout utils, staff policies, format utils, domain roles). |
| **Production Build** | `pnpm build` | **FAIL (Exit 1)** | Static prerendering bails out on `/_not-found` due to un-suspensed `useSearchParams()`. |

### Build Failure Diagnostic (`pnpm build`)

```text
⨯ useSearchParams() should be wrapped in a suspense boundary at page "/_not-found".
Read more: https://nextjs.org/docs/messages/missing-suspense-with-csr-bailout
Error occurred prerendering page "/_not-found".
```

- **File**: `src/app/layout.tsx:42`
- **Root Cause**: Next.js 15 enforces strict CSR bailout boundaries during static site generation. `<NavigationIndicator />` in `src/components/shared/feedback/navigation-indicator.tsx` calls `useSearchParams()`. Because it is rendered unconditionally in root `layout.tsx`, Next.js bails out when attempting to prerender static 404 pages.
- **Remediation**: Wrap `<NavigationIndicator />` in `<Suspense fallback={null}>`.

---

## 3. Complete Route Status Catalog

Sentinel employs a hybrid routing architecture combining top-level App Router paths with URL query parameter sub-views (`?tab=...` on `/dashboard` and `?section=...` on `/editor`).

### 3.1 App Router Top-Level Routes

```text
src/app/
├── (admin)/
│   ├── dashboard/page.tsx       # Core management terminal
│   ├── layout.tsx               # Admin auth gate & shell layout
│   └── loading.tsx              # Admin loading boundary
├── (cms)/
│   ├── editor/page.tsx          # CMS editor
│   ├── layout.tsx               # CMS role gate & layout
│   └── loading.tsx              # CMS loading boundary
├── health/page.tsx              # Diagnostic health probe
├── login/page.tsx               # Authentication gateway (Local + Cloud Admin)
├── manifest.ts                  # PWA Manifest metadata route
├── layout.tsx                   # Root HTML layout
└── page.tsx                     # Gateway redirector
```

| Route Path | File Location | Route Type | Access Role | Status | Observations & Issues |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `/` | `src/app/page.tsx` | Server Component | Public (Auth Check) | **Complete** | Inspects `getCurrentUser()`. If authenticated, redirects to `/dashboard` (admin) or `/editor` (cms). If unauthenticated, redirects to `/login`. |
| `/login` | `src/app/login/page.tsx` | Hybrid (RSC + Client) | Public | **Complete** | Redirects authenticated users. Renders `LoginPanel`. Supports maintenance view when all modules disabled. |
| `/health` | `src/app/health/page.tsx` | Client Component | Public | **Orphaned (Dead End)** | Three-step live probe (`?debug=true`). Fully functional, but contains zero navigation controls to return to the application. |
| `/dashboard` | `src/app/(admin)/dashboard/page.tsx` | Server Component + Client | `maintainer`, `admin`, `reception` | **Complete Core / Navigation Bugs** | Main operations terminal. Gated by `AdminLayout`. Routes sub-modules via `?tab=...`. |
| `/editor` | `src/app/(cms)/editor/page.tsx` | Server Component + Client | `maintainer`, `admin` | **Complete Core / Partial Fallback** | Public website CMS editor. Gated by `CmsLayout`. Routes sub-modules via `?section=...`. Falls back to `SetupRequired` if storage buckets missing. |
| `/manifest.webmanifest` | `src/app/manifest.ts` | Next.js Metadata Route | Public | **Complete** | Generates dynamic PWA manifest with icons, theme colors, and scope. |

---

### 3.2 Dashboard Sub-Routing & Tabs Catalog (13 Tabs)

The admin terminal operates as a single-page application under `/dashboard`, reading the active tab from the `tab` query parameter (`src/features/admin/dashboard/components/dashboard-panel.tsx`).

- Default tab for `reception`: `reception`
- Default tab for `admin` and `maintainer`: `overview`
- Total registered tabs in `VALID_TABS`: 13

| Tab ID (`?tab=`) | View Component | Title Label | RBAC Access | Status | Detailed Findings & Defects |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `overview` | `DashboardOverview` | Administración | Admin, Maintainer | **Complete** | High-level metrics (income, active members, occupancy), lists (recent payments, expiring memberships), and discipline rankings. Lists lack drill-down links to respective tabs. |
| `reception` | `ReceptionPanel` | Recepción | All roles | **Complete (UX Dead End)** | Student lookup and attendance verification. Client search results display name and membership status, but cards have zero action buttons ("Cobrar" / "Ver Ficha"). |
| `checkout` | `CheckoutPanel` | Registro de Pagos | All roles | **Complete (UX Dead End)** | Plan selection, payment method, receipt generation. Empty state instructs user to configure plans, but provides no link or button to `/dashboard?tab=plans`. Missing `md:` grid breakpoint. |
| `store` | `ProductCheckoutPanel` | Punto de Venta | All roles | **Complete** | POS product checkout, barcode search, cash/card/transfer, stock deduction, PDF ticket generation. Experimental feature. Minor inner button bubbling quirk. |
| `reports` | `SalesReports` | Informes de Venta | All roles | **Partial (Dead Button)** | Daily and monthly aggregations, payment method breakdown. **"Exportar" header button has no `onClick` handler**. |
| `inventory` | `InventoryPanel` | Inventario de Tienda | All roles | **Complete** | Product catalogue, stock adjustment (ADD/SET), movements audit trail, low stock banner. Experimental feature. Full audit trail and SKU generator wired. |
| `memberships` | `MembershipsPanel` | Control de Membresías | All roles | **Complete (Unguarded Query)** | Memberships table, occupancy gauge, pause/resume/cancel actions, 72h expiration alert. `getMembershipsPanelData()` query lacks a `try/catch` block. |
| `clients` | `ClientRegistry` | Control de Clientes | All roles | **Complete (Layout Defect)** | Paginated table, search, create/edit/delete modals, client details modal with payments & history. Flex width ratio conflict `40% + 66.7%` on `lg:` viewports. |
| `plans` | `ClassPlans` | Gestión de Clases y Planes | All roles | **Complete (Query Defect)** | Disciplines and plans CRUD, pricing, duration configuration. `getClassPlans()` catches errors and silently returns `[]`, masking query failures. |
| `payments` | `PaymentsLog` | Historial de Pagos | All roles | **Partial (Orphaned Modal)** | Transaction ledger, payment method and date range filters, PDF reprint. Fully built `CreatePaymentModal` exists in codebase but is never mounted. |
| `admin_users` | `UserManagement` | Gestión de Personal | Admin, Maintainer | **Complete (Gated)** | Staff user CRUD, local passwords, role assignment, terminal audit trail. Properly gated via `hasAdminAccess`. |
| `settings` | `CurrencySettings` | Moneda y Tasas | Admin, Maintainer | **Complete (Gated)** | Base currency (USD) and display currency (NIO) configuration, exchange rate updates, custom currencies. Properly gated via `hasAdminAccess`. |
| `developer` | `DeveloperPanel` | Auditoría | Maintainer only | **Complete (Gated / Unreachable Dialog)** | Latency metrics, connected terminal sessions, token revocation. Maintainer only. Contains unreachable `showClearCacheConfirm` dialog with no trigger button. |

---

### 3.3 Navigation Bugs & Routing Anomalies

#### Bug 1: Sidebar Title Click Routes Admin into Access Denied Alert
- **Files**:
  - `src/features/admin/dashboard/components/sidebar-nav.tsx:45–48`
  - `src/features/admin/dashboard/hooks/use-sidebar-nav.ts:26–31`
  - `src/features/admin/dashboard/components/dashboard-panel.tsx:230–235`
- **Mechanism**:
  Clicking the sidebar brand header executes `navigateToAdmin(activeUser.role)`:
  ```typescript
  const navigateToAdmin = (role: string) => {
    if (Roles.canManageStaff(role)) {
      setIsNavigating(true, 'developer')
      void router.push('/dashboard?tab=developer')
    }
  }
  ```
  `Roles.canManageStaff('admin')` evaluates to `true`. Thus, clicking the title sends an `admin` user to `?tab=developer`. In `DashboardPanel`, the `developer` tab checks `hasDevAccess = Roles.canAccessDeveloper(activeUser.role)`. For `admin`, `canAccessDeveloper` is `false`. The admin is presented with an **"Acceso Restringido" error alert**.
- **Remediation**:
  Route to `/dashboard?tab=overview` for `admin`, and `/dashboard?tab=developer` only when `Roles.canAccessDeveloper(role)` is `true`.

#### Bug 2: Sidebar CMS Link Ignores Module Feature Flag
- **File**: `src/features/admin/dashboard/components/sidebar-nav.tsx:54–64`
- **Mechanism**:
  The sidebar footer renders the "Editor de Sitio Web" link whenever `showAdminMenu` is true (`Roles.canManageStaff(role)`). It does not inspect `cmsEnabled` from `getActiveModules()`. If `APP_CONFIG.modules.cms = false`, clicking the link routes to `/editor`, which is intercepted by `middleware.ts:32–35` and redirected back to `/dashboard`, creating a confusing redirect loop.
- **Remediation**:
  Condition link rendering on `{showAdminMenu && cmsEnabled && (...)}`.

#### Bug 3: Direct URL Query RBAC Inconsistency
- **File**: `src/features/admin/dashboard/components/dashboard-panel.tsx:147–213`
- **Mechanism**:
  `SidebarNav` hides management tabs (`reports`, `plans`, `inventory`, `overview`, `memberships`) from receptionists. However, if a receptionist manually types `?tab=reports` or `?tab=plans` in the URL, `DashboardPanel` renders those views without checking permissions. Only `admin_users`, `settings`, and `developer` enforce role gating.
- **Remediation**:
  Add `Roles.canManageStaff(activeUser.role)` checks for management tabs in `DashboardPanel`.

---

## 4. CMS Sections Catalog

The CMS editor operates under `/editor`, reading the active section from query parameter `section` (defaults to `base`).

### 4.1 Active CMS Sections (10 Sections)

- **Source Files**: `src/features/cms/core/components/cms-shell.tsx`, `src/features/cms/core/config.ts`

| Section ID (`?section=`) | Section Label | Component Rendered | Completeness | Functionality |
| :--- | :--- | :--- | :--- | :--- |
| `base` | Datos Generales | `GlobalsEditor`, `ContactEditor`, `FooterEditor` | **100%** | Business name, tagline, phones, WhatsApp, location coordinates, copyright text. |
| `about` | Sobre Nosotros | `AboutEditor`, `ArtEditor`, `PrinciplesEditor` | **100%** | Bio description, mission, martial arts disciplines list, core values. |
| `hero` | Banner Principal | `HeroEditor` | **100%** | Main headline, subtitle, carousel images, call-to-action buttons, social media links. |
| `gallery` | Galería | `GalleryEditor` | **100%** | Photo grid management, image upload, captions, ordering. |
| `schedule` | Horarios de Atención | `ScheduleEditor` | **100%** | Day-by-day class schedules, time slots, instructor tags. |
| `testimonials` | Testimonios | `CommentsEditor` | **100%** | Student reviews, star ratings, author photos, active toggle. |
| `faq` | Preguntas Frecuentes | `FaqEditor` | **100%** | Accordion Q&A items, categorization, ordering. |
| `storage` | Gestor de Archivos | `StorageEditor` | **100%** | Direct bucket inspector for `site-content` and `site-images`, file uploads, deletions. |
| `backups` | Historial de Versiones | `BackupsEditor` | **100%** | Automated snapshot history, JSON diff viewer, version rollback triggers. |
| `developer` | Desarrollador | `DeveloperEditor` | **100%** | Raw `content.json` import/export, syntax validation, emergency override. |

---

### 4.2 Orphaned HeaderEditor Component

- **File**: `src/features/cms/editors/components/header-editor.tsx` (Lines 1–76)
- **Data Model**: `SiteContent.header` (`navItems: Array<{ label, href }>`, `contactItem: { label, href, isVisible }`)
- **Defect**:
  `HeaderEditor` is fully implemented and permits editing public navigation items and header CTA buttons. However, `CmsShell.renderEditor()` never imports or renders it. `CMS_SECTIONS` has no entry for header editing, leaving the public header navigation completely uneditable from the admin interface.
- **Remediation**:
  Mount `<HeaderEditor value={draft.header} onChange={(v) => updateDraft('header', v)} />` inside the `'base'` section in `CmsShell`.

---

### 4.3 CMS Secondary Views & Setup Traps

#### SetupRequired Hardcoded Placeholder URL
- **File**: `src/features/cms/core/components/setup-required.tsx:14`
- **Code**:
  ```typescript
  const supabaseConsoleUrl = `https://supabase.com/dashboard/project/_/editor`
  ```
- **Defect**: The URL hardcodes an unreplaced `_` placeholder. When an administrator clicks "Abrir Supabase SQL Editor", it loads a broken 404 URL in the Supabase console. Furthermore, the component offers no button to return to `/dashboard`.
- **Remediation**:
  Use `https://supabase.com/dashboard` or extract the project reference from `NEXT_PUBLIC_SUPABASE_URL`, and add a "Regresar al Panel Principal" button.

---

## 5. Unfinished UI Elements, Dead Buttons & Placeholder Stubs

The audit identified 8 concrete unfinished UI elements and dead-end workflows across the application:

```
┌────────────────────────────────────────────────────────────────────────────────────────────────┐
│                         UNFINISHED UI ELEMENTS & DEAD-END CONTROLS                             │
├─────────────────────────┬────────────────────────────────────────┬─────────────────────────────┤
│ Component               │ File Location                          │ Defect Nature               │
├─────────────────────────┼────────────────────────────────────────┼─────────────────────────────┤
│ Sales Reports Export    │ dashboard/components/sales-reports.tsx │ Missing onClick handler     │
│ Developer Clear Cache   │ developer/components/developer-panel   │ Unreachable modal dialog    │
│ Reception Client Search │ reception/components/reception-panel   │ Non-interactive card list   │
│ Create Payment Modal    │ payments/components/create-payment     │ Completely orphaned modal   │
│ Checkout Client Search  │ checkout/components/checkout-modal.tsx │ State loss on client select │
│ Checkout Empty State    │ checkout/components/checkout-panel.tsx │ Missing action button       │
│ Orphaned HeaderEditor   │ cms/editors/components/header-editor   │ Unmounted editor component  │
│ POS Add Button Bubbling │ products/components/product-checkout   │ Missing explicit onClick    │
└─────────────────────────┴────────────────────────────────────────┴─────────────────────────────┘
```

### Detailed Component Defect Analysis

#### 1. Sales Reports "Exportar" Dead Button
- **File**: `src/features/admin/dashboard/components/sales-reports.tsx:91–95`
- **Code**:
  ```tsx
  <Button size="sm" variant="neutral" className="gap-2 shrink-0" disabled={!data}>
    <Download className="h-4 w-4" />
    Exportar
  </Button>
  ```
- **Defect**: Renders a styled button with icon and label, but contains no `onClick` prop. Clicking it does nothing.
- **Remediation**: Wire `onClick` to export aggregated report data (daily/monthly metrics) to CSV format using an RFC 4180 client download blob.

#### 2. Developer Panel Unreachable Clear Cache Dialog
- **File**: `src/features/admin/developer/components/developer-panel.tsx:21, 198–213`
- **Code**:
  ```tsx
  const [showClearCacheConfirm, setShowClearCacheConfirm] = useState(false)
  ...
  {showClearCacheConfirm && (
    <ConfirmDialog
      isOpen={showClearCacheConfirm}
      onClose={() => setShowClearCacheConfirm(false)}
      onConfirm={async () => {
        localStorage.clear();
        sessionStorage.clear();
        window.location.reload();
      }}
      title="Limpiar caché"
    />
  )}
  ```
- **Defect**: `showClearCacheConfirm` and the `ConfirmDialog` are fully implemented, but no button in the UI calls `setShowClearCacheConfirm(true)`.
- **Remediation**: Add a "Limpiar Almacenamiento Local" button to the Developer diagnostics actions bar.

#### 3. Reception Panel Non-Interactive Client Search
- **File**: `src/features/admin/reception/components/reception-panel.tsx:98–121`
- **Defect**: Searching for clients renders cards displaying full name and active membership status. However, there are no action controls. Receptionists cannot open client details, cannot register attendance, and cannot navigate to checkout for membership renewal.
- **Remediation**: Add action buttons to each client result:
  - "Cobrar" -> redirects to `/dashboard?tab=checkout` with client selected.
  - "Ver Ficha" -> opens `ClientDetailsModal`.

#### 4. Payments Log Orphaned `CreatePaymentModal`
- **File**: `src/features/admin/payments/components/create-payment-modal.tsx:1–111`
- **Defect**: A complete modal form with client selection, payment amount, payment method, and server action `saveNewPayment` exists in the codebase. However, `PaymentsLog` (`payments-log.tsx`) does not import or render it, nor does it have a "Nuevo Pago" trigger button.
- **Remediation**: Mount `CreatePaymentModal` in `PaymentsLog` and add a "Registrar Pago" button to the header.

#### 5. Checkout Modal State Loss on Dynamic Client Search
- **File**: `src/features/admin/checkout/components/checkout-modal.tsx:137, 280–284`
- **Code**:
  ```tsx
  // Dropdown selection:
  onClick={() => {
    setClientId(c.id)
    setClientSearch(c.full_name)
    setShowDropdown(false)
  }}
  ...
  // Receipt rendering:
  const selectedClient = clients.find(c => c.id === clientId)
  ```
- **Defect**: `clients` contains only the initial 15 clients preloaded in `DashboardData`. When a client is found via dynamic `searchClients`, selecting the client sets `clientId` in state, but does not store the client object. When `clients.find(c => c.id === clientId)` executes during ticket and PDF generation, it returns `undefined`. The receipt prints a blank or fallback "Cliente" label.
- **Remediation**: Store `selectedClientObject: ClientData | null` directly in state when an item is selected from the dropdown.

#### 6. Checkout Panel Empty State Dead End
- **File**: `src/features/admin/checkout/components/checkout-panel.tsx:37–43`
- **Code**:
  ```tsx
  if (activeClasses.length === 0 || activePlans.length === 0) {
    return (
      <div className="bg-card border border-border/40 p-6 rounded-xl shadow-sm w-full">
        <EmptyState message="No hay disciplinas o planes configurados. Ve a 'Gestión de Planes' para crear opciones de compra." />
      </div>
    )
  }
  ```
- **Defect**: Instructs the user to go to plan management, but provides no link or button to navigate there.
- **Remediation**: Add an action button in `EmptyState`: `<Button onClick={() => router.push('?tab=plans')}>Configurar Planes</Button>`.

#### 7. Product POS Nested Button Bubbling Quirk
- **File**: `src/features/admin/products/components/product-checkout-panel.tsx:159, 171`
- **Defect**: The "Agregar" `<Button>` inside product cards lacks an `onClick` or `type="button"`. It relies on event bubbling to the outer card `<div>`. This causes keyboard navigation confusion and accessibility warnings.
- **Remediation**: Add `onClick={(e) => { e.stopPropagation(); addToCart(product); }}` explicitly to the button.

---

## 6. Security, Authentication & Authorization Audit

### 6.1 Architecture & Session Security Model

Sentinel operates under a zero-trust browser security model:

1. **No Supabase Browser Client**: The browser never receives Supabase credentials, tokens, or sessions.
2. **HTTP-Only Custom JWT Session**: User authentication issues an encrypted, HTTP-only, Secure cookie (`sentinel_session`) signed with `SESSION_SECRET`.
3. **Database Deny-All RLS**: The database schema explicitly revokes all privileges and denies all access to `anon` and `authenticated` roles (`20260914090300_deny_public_schema.sql`).
4. **Service Role via `requireRole()`**: Server actions obtain an administrative client (`SUPABASE_SERVICE_ROLE_KEY`) only after verifying the JWT and re-querying `public.users` in Postgres to confirm the account is active.

---

### 6.2 Server Actions Inventory & Role Guard Verification

Every server action module was audited for `'use server'` declarations, role gating, and error sanitization:

| Server Action Module | Business Domain | Gated Role(s) | Error Sanitization | Status |
| :--- | :--- | :--- | :--- | :--- |
| `src/features/auth/actions.ts` | Authentication / Device Auth | Allowlisted (Public) | Handled (Custom) | **Pass** |
| `src/features/health/actions.ts` | Liveness Probe | Allowlisted (Public) | Handled (Booleans only) | **Pass** |
| `src/features/admin/checkout/mutations.ts` | Membership Sales | `requireRole()` (All active) | `toActionError()` | **Pass** |
| `src/features/admin/checkout/queries.ts` | Membership Verification | `requireRole()` (All active) | Handled fallback | **Pass** |
| `src/features/admin/classes/mutations.ts` | Classes / Plans Management | `requireRole(ADMIN, MAINTAINER)` | `toActionError()` | **Pass** |
| `src/features/admin/classes/queries.ts` | Classes / Plans Listings | `requireRole()` (All active) | `toActionError()` / fallback | **Pass** |
| `src/features/admin/clients/mutations.ts` | Client Management | `requireRole()` / `requireRole(ADMIN, MAINTAINER)` | `toActionError()` | **Pass** (Cache gap) |
| `src/features/admin/clients/queries.ts` | Client Listings & History | `requireRole()` (All active) | Handled fallback | **Pass** |
| `src/features/admin/dashboard/actions.ts` | Dashboard Metrics & Trends | `requireRole()` (All active) | Handled fallback | **Pass** |
| `src/features/admin/dashboard/reports-actions.ts` | Sales Reports Data | `requireRole()` (All active) | Handled fallback | **Pass** |
| `src/features/admin/developer/actions.ts` | Authorized Devices Management | `requireRole(MAINTAINER)` | `toActionError()` | **Pass** |
| `src/features/admin/memberships/mutations.ts` | Freeze / Unfreeze / Cancel | `requireRole(ADMIN, MAINTAINER)` | `toActionError()` | **Pass** (Cache gap) |
| `src/features/admin/memberships/queries.ts` | Memberships Panel View | `requireRole()` (All active) | **None (throws unhandled)** | **Fail (Uncaught)** |
| `src/features/admin/payments/mutations.ts` | Manual Payment Recording | `requireRole()` (All active) | `toActionError()` | **Pass** |
| `src/features/admin/payments/queries.ts` | Payments Ledger | `requireRole()` (All active) | Handled fallback | **Pass** |
| `src/features/admin/products/mutations.ts` | Inventory / Product Sales | `requireRole(ADMIN, MAINTAINER)` / `requireRole()` | `toActionError()` + SKU handler | **Pass** |
| `src/features/admin/products/queries.ts` | Products / Stock Movements | `requireRole()` (All active) | Handled fallback | **Pass** |
| `src/features/admin/settings/actions.ts` | Currencies & Exchange Rates | `requireRole(ADMIN, MAINTAINER)` / `requireRole(MAINTAINER)` | `toActionError()` | **Pass** |
| `src/features/admin/staff/mutations.ts` | Staff CRUD & Passwords | `requireRole(ADMIN, MAINTAINER)` | `toActionError()` | **Pass** |
| `src/features/admin/staff/queries.ts` | Staff Listings & History | `requireRole(ADMIN, MAINTAINER)` | `toActionError()` / fallback | **Pass** |
| `src/features/cms/backups/actions.ts` | Content Backups | `requireRole(ADMIN, MAINTAINER)` | **Raw string interpolation** | **Warn (Leakage)** |
| `src/features/cms/core/actions.ts` | Site Content & Publishing | `requireRole(ADMIN, MAINTAINER)` | **Raw string interpolation** | **Warn (Leakage)** |
| `src/features/cms/media/actions.ts` | Media Bucket Management | `requireRole(ADMIN, MAINTAINER)` | **Raw string interpolation** | **Warn (Leakage)** |

---

### 6.3 Security Guard Script Evaluation (`scripts/check-guards.sh`)

The automated security guard check is executed via:

```bash
bash scripts/check-guards.sh
```

**Result**: `Exit 0 — "All server actions are guarded by requireRole()"`

#### Structural Limitations of the Script

1. **File-Level Coarse Matching**: The script runs `grep -q "requireRole" "$file"`. If a file defines multiple server actions and only one invokes `requireRole()`, the entire file passes.
2. **Path Scope Blind Spot**: The script hardcodes search to `src/features`. Any server action placed in `src/app/**`, `src/components/**`, or `src/lib/**` bypasses verification.
3. **Extension Restriction**: The script specifies `--include='*.ts'`. Any server action declared in `.tsx` files is excluded from auditing.
4. **No Static AST Verification**: The script does not verify that exported async functions await `requireRole()` on their initial execution path.

---

### 6.4 Database RLS Policies & Transactional RPCs

The database schema encompasses **22 migration files** in `supabase/migrations/`:

- **Universal RLS**: `ENABLE ROW LEVEL SECURITY` is applied to all tables (`users`, `authorized_devices`, `clients`, `classes`, `class_plans`, `memberships`, `payments`, `payment_lines`, `products`, `inventory`, `inventory_movements`, `currencies`, `exchange_rates`, `product_categories`, `login_attempts`).
- **Deny-All Privileges (`20260914090300_deny_public_schema.sql`)**: All table, sequence, view, and function grants are revoked from `anon` and `authenticated`. Default privileges are altered so newly created objects inherit zero permissions.
- **Transactional Postgres RPCs**:
  - `process_membership_checkout`: Calculates membership dates and records payment atomically.
  - `process_product_checkout`: Verifies stock availability, decrements inventory, and records sale lines in a single transaction.
  - `register_stock_purchase`: Records inventory receipt and recalculates weighted average unit cost.
  - `set_base_currency`: Enforces strict audit locks to prevent historic exchange rate drift.

---

### 6.5 Security Vulnerabilities & Information Leakage

#### Vulnerability 1: Uncaught Authorization Error in `getMembershipsPanelData`
- **File**: `src/features/admin/memberships/queries.ts:6–63`
- **Defect**: The function awaits `requireRole()` but contains no `try/catch` block. If an unauthenticated or unauthorized user invokes this query, an `AuthorizationError` is thrown, triggering an unhandled server rejection.
- **Remediation**: Wrap query execution in `try/catch` and return safe empty fallback data `{ metrics: { totalActive: 0, expiringSoon: 0, frozen: 0 }, classOccupancy: [], membershipsList: [] }`.

#### Vulnerability 2: Information Leakage in CMS Server Actions
- **Files**:
  - `src/features/cms/backups/actions.ts:39, 74, 98`
  - `src/features/cms/core/actions.ts:53, 120, 184`
  - `src/features/cms/media/actions.ts:36, 60, 82, 117`
- **Defect**: Error handlers interpolate raw `err.message` strings directly into client returns (e.g. `'Error al restaurar copia: ${msg}'`). This exposes internal Supabase storage bucket paths, network timeouts, and PostgreSQL exception details to the browser.
- **Remediation**: Sanitize all error returns using `toActionError(err, 'Mensaje amigable')`.

#### Vulnerability 3: Unvalidated Input in `publishSiteContent`
- **File**: `src/features/cms/core/actions.ts:59`
- **Defect**: `publishSiteContent(newContent: SiteContent)` accepts raw JSON and serializes directly to storage without Zod schema validation. Malformed JSON payloads could corrupt the public website.
- **Remediation**: Validate `newContent` with a Zod schema before saving.

#### Vulnerability 4: Stale Dashboard Counters Due to Cache Invalidation Gaps
- **Files**:
  - `src/features/admin/clients/mutations.ts:72, 105` (`updateClient`, `deleteClient`)
  - `src/features/admin/memberships/mutations.ts:25, 48, 71` (`freezeMembership`, `unfreezeMembership`, `cancelMembership`)
- **Defect**: These mutation actions update database records but fail to call `revalidateTag(DASHBOARD_CACHE_TAG)`. Dashboard metric counters display stale numbers until the 30-second TTL expires.
- **Remediation**: Add `revalidateTag(DASHBOARD_CACHE_TAG)` to all client and membership mutations.

---

## 7. Error Handling & Boundaries Audit

### 7.1 Route Error Boundaries Deficit

A scan of the filesystem reveals a **complete absence of Next.js error boundaries**:

| Expected Boundary | File Path Checked | Status | User Impact |
| :--- | :--- | :--- | :--- |
| Root Error Boundary | `src/app/error.tsx` | **MISSING** | Runtime errors in pages render Next.js unstyled 500 error screen. |
| Global Error Boundary | `src/app/global-error.tsx` | **MISSING** | Layout-level crashes produce raw server failure without recovery. |
| Root 404 Page | `src/app/not-found.tsx` | **MISSING** | Invalid routes display unbranded default 404 page with no back link. |
| Admin Error Boundary | `src/app/(admin)/error.tsx` | **MISSING** | Dashboard exceptions crash the admin shell. |
| CMS Error Boundary | `src/app/(cms)/error.tsx` | **MISSING** | CMS storage exceptions crash the editor shell. |

---

### 7.2 Loading Boundaries Status

| Boundary Scope | Mechanism | Location | Status |
| :--- | :--- | :--- | :--- |
| Root Layout | `NavigationIndicator` | `src/app/layout.tsx` | **Fails prerender** (missing Suspense). |
| Admin Route Group | Route Loading File | `src/app/(admin)/loading.tsx` | **Functional** (renders `<SessionLoading />`). |
| Admin Tab Switch | UI Backdrop Overlay | `src/app/(admin)/_components/admin-shell.tsx` | **Functional** (uses `useNavigationStore`). |
| CMS Route Group | Route Loading File | `src/app/(cms)/loading.tsx` | **Functional** (renders `<SessionLoading />`). |
| Root Gateway `/` | None | `src/app/loading.tsx` | **Missing** (no visual cue during initial auth redirect). |
| Login Page | None | `src/app/login/loading.tsx` | **Missing**. |

---

### 7.3 Data Fetching & Query Failure Resilience

1. **Dashboard Data Fetch Swallows Errors**:
   `use-dashboard-data.ts:90–94` catches errors with `console.error` and sets `loadingData = false`. When Supabase is unreachable, the dashboard renders completely blank with no user notification or retry button.
2. **Class Plans Query Masks Errors**:
   `classes/queries.ts:26–29` catches query exceptions and returns `[]`. The interface displays "No hay clases registradas", misleading the administrator into believing the database is empty when a network error occurred.

---

### 7.4 Client Form Validation & Inline Error Reporting

Forms in `CreateClassModal`, `CreatePlanModal`, and `AdjustStockModal` catch server action errors and display them exclusively via floating toast notifications. Field inputs (`TextField`) do not receive an `error` prop with inline red borders and descriptive helper text.

---

## 8. Responsive Layout Audit

### 8.1 Tablet Viewport (768px–1024px) Compression

- **Files**: `src/app/(admin)/_components/admin-shell.tsx`, `src/components/shared/layout/app-sidebar.tsx`
- **Breakdown**:
  - The desktop breakpoint activates at `min-width: 768px` (`md:`).
  - On a standard iPad portrait display (768px wide), the sidebar expands to fixed desktop mode (`md:pl-64` = 256px).
  - Main container padding adds `md:px-10` (40px left + 40px right = 80px).
  - **Net usable width**: `768px - 256px - 80px = 432px`.
  - In a 432px space, multi-column cards, metric grids, and tables experience severe horizontal squeeze.
- **Remediation**:
  1. Default the sidebar to collapsed (`isCollapsed = true`, width 80px) on screens between 768px and 1024px.
  2. Reduce container padding on tablet from `md:px-10` to `md:px-6 lg:px-10`.

---

### 8.2 Flex-Width Conflict in Modals

- **File**: `src/features/admin/clients/components/client-details-modal.tsx:121, 186`
- **Code**:
  - Column 1: `md:w-[40%]`
  - Column 2: `md:w-[60%] lg:w-2/3` (66.7%)
  - Container Gap: `gap-6` (24px)
- **Defect**: On viewports between 1024px and 1280px (`lg:` breakpoint), Column 1 is 40% and Column 2 is 66.7%. The combined width is `106.7% + 24px`, exceeding 100% and forcing unwanted flex wrapping and distorted layout.
- **Remediation**: Adjust Column 1 to `md:w-[40%] lg:w-1/3` and Column 2 to `md:w-[60%] lg:w-2/3`.

---

### 8.3 Grid Breakpoint Skips

- **File**: `src/features/admin/checkout/components/checkout-panel.tsx:52`
- **Code**:
  ```tsx
  <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
  ```
- **Defect**: Skips `md:` (768px–1023px), jumping from 1 column directly to 2 columns on `lg:`. On tablet screens, cards stretch across the full width unnecessarily.
- **Remediation**: Update to `grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 lg:gap-8`.

---

### 8.4 Data Table Overflow Containment

All administrative data tables utilize `<DataTable>` (`src/components/shared/data-table/data-table.tsx`), which wraps tables in:

```tsx
<div className="w-full overflow-auto flex-1 min-h-0">
  <table className={cn("w-full h-full text-left border-collapse text-xs relative", tableClassName || "min-w-max")}>
```

This encapsulates table overflow within the table container. Even when tables specify `min-w-[900px]`, horizontal scrolling is isolated and does not cause page-level horizontal overflow on tablet or desktop screens.

---

## 9. Prioritized Remediation Action Plan & Milestone Traceability

To fulfill Requirements R1 & R2 of `ORIGINAL_REQUEST.md`, all identified defects are mapped to project features (F01–F22) and organized across Milestones M1 through M6:

```
┌────────────────────────────────────────────────────────────────────────────────────────────────┐
│                           REMEDIATION ROADMAP & MILESTONES                                     │
├───────────┬──────────────────────────────────────────┬──────────────┬──────────────────────────┤
│ Milestone │ Scope                                    │ Features     │ Status                   │
├───────────┼──────────────────────────────────────────┼──────────────┼──────────────────────────┤
│ M1        │ Comprehensive Audit Report Documentation │ F01          │ COMPLETED (This Report)  │
│ M2        │ Security & Backend Hardening             │ F02–F06      │ READY FOR IMPLEMENTATION │
│ M3        │ Route, Shell & Navigation Hardening      │ F07–F12      │ READY FOR IMPLEMENTATION │
│ M4        │ Feature & UI Control Wiring              │ F13–F18      │ READY FOR IMPLEMENTATION │
│ M5        │ Responsive Design Hardening              │ F19–F20      │ READY FOR IMPLEMENTATION │
│ M6        │ Test Expansion & Baseline Verification   │ F21–F22      │ READY FOR IMPLEMENTATION │
└───────────┴──────────────────────────────────────────┴──────────────┴──────────────────────────┘
```

### Complete Feature Remediation Traceability Matrix

| Feature ID | Feature Name | Description & Affected Files | Priority | Target Milestone | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **F01** | Comprehensive Audit Report | Authoritative documentation of routes, UI defects, security, and fixes in `docs/audit_report.md`. | P1 | M1 | **COMPLETED** |
| **F02** | Prerender Suspense Fix | Wrap `<NavigationIndicator />` in `<Suspense fallback={null}>` in `src/app/layout.tsx` to resolve `pnpm build` failure. | P1 | M2 | PLANNED |
| **F03** | CMS Error Sanitization | Replace raw `err.message` interpolations with `toActionError(err)` in `backups`, `core`, and `media` actions. | P1 | M2 | PLANNED |
| **F04** | CMS Publish Validation | Add Zod schema validation to `publishSiteContent` in `src/features/cms/core/actions.ts`. | P1 | M2 | PLANNED |
| **F05** | Cache Invalidation Consistency | Add `revalidateTag(DASHBOARD_CACHE_TAG)` to `clients/mutations.ts` and `memberships/mutations.ts`. | P2 | M2 | PLANNED |
| **F06** | Memberships Query Safety | Wrap `getMembershipsPanelData()` in `try/catch` with safe fallback to prevent unhandled rejections. | P1 | M2 | PLANNED |
| **F07** | App Router Error Boundaries | Create `src/app/error.tsx`, `global-error.tsx`, `not-found.tsx`, `(admin)/error.tsx`, and `(cms)/error.tsx`. | P1 | M3 | PLANNED |
| **F08** | Sidebar Title Navigation Fix | Update `navigateToAdmin` in `use-sidebar-nav.ts` so `admin` routes to `overview` instead of `developer`. | P1 | M3 | PLANNED |
| **F09** | Sidebar CMS Toggle Check | Check `cmsEnabled` before rendering `/editor` link in `sidebar-nav.tsx`. | P2 | M3 | PLANNED |
| **F10** | CMS HeaderEditor Integration | Mount orphaned `HeaderEditor` in `CmsShell.renderEditor()` under the `'base'` section. | P2 | M3 | PLANNED |
| **F11** | Secondary Pages In-App Nav | Add back navigation buttons to `/health` and CMS `SetupRequired` fallback. | P2 | M3 | PLANNED |
| **F12** | Checkout Empty State Action | Add "Configurar Planes" CTA button linking to `?tab=plans` in `checkout-panel.tsx` empty state. | P2 | M3 | PLANNED |
| **F13** | Sales Reports Export Wiring | Wire `onClick` handler on "Exportar" button in `sales-reports.tsx` to generate CSV report downloads. | P1 | M4 | PLANNED |
| **F14** | Dev Panel Clear Cache Trigger | Add button in `DeveloperPanel` to trigger `showClearCacheConfirm` dialog. | P2 | M4 | PLANNED |
| **F15** | Reception Search Actions | Add "Cobrar" and "Ver Ficha" action buttons to reception client search results in `reception-panel.tsx`. | P1 | M4 | PLANNED |
| **F16** | Payments Manual Payment Modal | Mount `CreatePaymentModal` in `PaymentsLog` with a "Registrar Pago" header button. | P1 | M4 | PLANNED |
| **F17** | Checkout Client Dynamic State | Retain selected client object in state in `checkout-modal.tsx` to prevent blank names on tickets/PDFs. | P1 | M4 | PLANNED |
| **F18** | Dashboard Fetch Error Feedback | Expose `fetchError` in `use-dashboard-data.ts` and render error banner with retry button in `dashboard-panel.tsx`. | P2 | M4 | PLANNED |
| **F19** | ClientDetailsModal Width Fix | Resolve `40% + 66.7%` flex width conflict by setting `md:w-[40%] lg:w-1/3` in `client-details-modal.tsx`. | P2 | M5 | PLANNED |
| **F20** | Tablet Breakpoint Hardening | Add intermediate `md:grid-cols-2` in `checkout-panel.tsx` and adjust tablet padding in `admin-shell.tsx`. | P2 | M5 | PLANNED |
| **F21** | Vitest Test Suite Expansion | Add unit and integration tests covering wired features, guards, navigation, and error handling. | P1 | M6 | PLANNED |
| **F22** | Final Baseline Verification | Verify `pnpm typecheck`, `bash scripts/check-guards.sh`, `pnpm test`, and `pnpm build` pass with 0 errors. | P1 | M6 | PLANNED |

---

## 10. Conclusion & Next Steps

This audit report establishes the definitive technical inventory, defect diagnosis, and prioritized remediation roadmap for Sentinel. With the completion of Milestone M1 (F01), downstream implementation workers can execute Milestones M2 through M6 in sequence, addressing build unblocking, security sanitization, navigation fixes, UI control wiring, responsive layout adjustments, and test suite expansion.
