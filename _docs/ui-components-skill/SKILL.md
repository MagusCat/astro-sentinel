# React UI Components Skill

## Skill: ui-components-skill

description: Use ONLY when the user is editing, creating, or suggesting React UI components in a Next.js project using Tailwind CSS and shadcn/ui. Also use when the user needs to add a new page, feature, or form. Triggers on words: "component", "UI", "form", "button", "modal", "table", "input", "card", "layout", "page", "dashboard", "refactor HTML".

---

# UI Components Skill

## Purpose

This skill enforces the usage of the project's existing shared components over raw HTML/Tailwind in order to maintain visual and behavioral consistency across the entire application.

## Philosophy

Every time you write raw `<div className="...">` in a feature component, **ask yourself: "Does a component already exist for this pattern?"**

The codebase already contains robust, tested shared components. Duplicating their structure inline creates maintenance debt, visual drift, and bugs.

## Component Inventory (Prioritized by frequency of use)

### 1. Forms: ALWAYS use `TextField`

**Before (Do NOT do this):**
```tsx
<div className="flex flex-col gap-1.5">
  <label className="text-[11px] font-bold text-muted-foreground uppercase font-mono tracking-wider">
    Name
  </label>
  <input
    className="w-full text-xs px-3 py-2.5 rounded-md border border-border/60 bg-muted/40 focus:outline-none focus:border-primary transition-colors text-foreground font-medium"
    type="text"
  />
</div>
```

**After (Do this):**
```tsx
import { TextField } from "@/components/shared/text-field"

<TextField
  label="Name"
  type="text"
  value={name}
  onChange={(e) => setName(e.target.value)}
/>
```

### 2. Buttons: ALWAYS use `shadcn/ui/Button`

**Before (Do NOT do this):**
```tsx
<button className="bg-primary hover:bg-primary/95 text-white font-semibold text-xs px-4 py-2.5 rounded-md ...">
  Guardar
</button>
```

**After (Do this):**
```tsx
import { Button } from "@/components/ui/button"

<Button size="sm">Guardar</Button>
```

Available variants: `default`, `outline`, `secondary`, `ghost`, `destructive`, `link`
Available sizes: `default`, `xs`, `sm`, `lg`, `icon`, `icon-xs`, `icon-sm`, `icon-lg`

### 3. Cards: ALWAYS use `SectionCard` or `Card`

**Before (Do NOT do this):**
```tsx
<div className="bg-card border border-border/40 rounded-2xl p-6 shadow-sm flex flex-col gap-5">
  <h3 className="font-extrabold ...">Title</h3>
  ...
</div>
```

**After (Do this):**
```tsx
import { SectionCard } from "@/components/shared/section-card"

<SectionCard title="Title" description="...">
  ...
</SectionCard>
```

### 4. Tables: ALWAYS use `DataTable`

**Before (Do NOT do this):**
```tsx
<table className="w-full text-left border-collapse text-xs">
  <thead><tr className="border-b border-border/40 bg-muted/40 ...">...</tr></thead>
  <tbody>...</tbody>
</table>
```

**After (Do this):**
```tsx
import { DataTable } from "@/components/shared/data-table"

<DataTable
  data={users}
  keyExtractor={(u) => u.id}
  columns={[
    { key: "name", header: "Nombre" },
    { key: "email", header: "Correo" },
    { key: "role", header: "Rol", render: (u) => <StatusBadge status={u.role} /> },
  ]}
  emptyState={<EmptyState message="No hay usuarios" />}
/>
```

### 5. Empty States: ALWAYS use `EmptyState`

**Before:**
```tsx
<div className="text-center text-xs text-muted-foreground/60 italic py-6">
  No hay registros
</div>
```

**After:**
```tsx
import { EmptyState } from "@/components/shared/empty-state"

<EmptyState message="No hay registros" />
```

### 6. Search: ALWAYS use `SearchInput`

**Before:**
```tsx
<div className="relative w-full sm:max-w-xs">
  <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
  <input className="w-full text-xs pl-9 pr-3.5 py-2.5 rounded-md ..." />
</div>
```

**After:**
```tsx
import { SearchInput } from "@/components/shared/search-input"

<SearchInput
  placeholder="Buscar..."
  value={query}
  onChange={(e) => setQuery(e.target.value)}
/>
```

### 7. Loading: ALWAYS use `LoadingState`

**Before:**
```tsx
<div className="max-w-md w-full mx-auto my-12 flex flex-col gap-6 items-center p-12">
  <RefreshCw className="w-6 h-6 text-primary animate-spin" />
  <span className="text-xs text-muted-foreground font-mono">Cargando...</span>
</div>
```

**After:**
```tsx
import { LoadingState } from "@/components/shared/loading-state"

<LoadingState text="Cargando usuarios..." />
```

### 8. Page Layouts: ALWAYS use `PageShell`

**Before:**
```tsx
<div className="min-h-screen bg-background text-foreground flex flex-col justify-center antialiased ...">
  <main className="w-full max-w-5xl mx-auto px-6 py-8">{children}</main>
</div>
```

**After:**
```tsx
import { PageShell } from "@/components/shared/page-shell"

<PageShell variant="auth">
  <main className="w-full max-w-5xl mx-auto px-6 py-8">{children}</main>
</PageShell>
```

### 9. Confirmation Dialogs: ALWAYS use `ConfirmDialog`

**Before:**
```tsx
<Modal ...>
  <p className="text-sm text-muted-foreground mb-4">Seguro que deseas eliminar?</p>
  <div className="flex gap-2 justify-end">
    <button className="text-xs font-semibold px-4 ... bg-muted ...">Cancelar</button>
    <button className="text-xs font-bold px-4 ... bg-destructive ...">Eliminar</button>
  </div>
</Modal>
```

**After:**
```tsx
import { ConfirmDialog } from "@/components/shared/confirm-dialog"

<ConfirmDialog
  isOpen={showDelete}
  onClose={() => setShowDelete(false)}
  onConfirm={handleDelete}
  title="Eliminar Registro"
  message="Seguro que deseas eliminar este registro? Esta accion no se puede deshacer."
  variant="danger"
/>
```

### 10. Status Badges: ALWAYS use `StatusBadge`

**Before:**
```tsx
<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold text-emerald-600 bg-emerald-500/10">
  Active
</span>
```

**After:**
```tsx
import { StatusBadge } from "@/components/shared/status-badge"

<StatusBadge status="active" />
```

### 11. Progress: ALWAYS use `ProgressBar`

**Before:**
```tsx
<div className="relative h-1 w-full bg-muted rounded-full overflow-hidden">
  <div className="absolute h-full bg-primary rounded-full" style={{ width: "50%" }} />
</div>
```

**After:**
```tsx
import { ProgressBar } from "@/components/shared/progress-bar"

<ProgressBar value={50} />
// o indeterminado:
<ProgressBar indeterminate />
```

### 12. Alerts: ALWAYS use `WarningAlert`

**Before:**
```tsx
<div className="w-12 h-12 rounded-md bg-rose-500/10 border border-rose-500/20 ...">
  <ShieldAlert className="w-6 h-6 text-rose-500" />
</div>
<h2 className="font-extrabold ...">Dispositivo No Autorizado</h2>
```

**After:**
```tsx
import { WarningAlert } from "@/components/shared/warning-alert"

<WarningAlert
  title="Dispositivo No Autorizado"
  message="Esta terminal debe ser autorizada por un Administrador..."
  variant="error"
/>
```

### 13. Toggle Groups: ALWAYS use `ToggleButtonGroup`

**Before:**
```tsx
<div className="grid grid-cols-2 bg-muted p-1 rounded-lg ...">
  <button className={`... ${active ? 'bg-background' : 'text-muted-foreground'}`}>Local</button>
  <button className={`... ${active ? 'bg-background' : 'text-muted-foreground'}`}>Admin</button>
</div>
```

**After:**
```tsx
import { ToggleButtonGroup } from "@/components/shared/toggle-button-group"

<ToggleButtonGroup
  value={mode}
  onChange={setMode}
  options={[
    { value: "local", label: "Personal", icon: <User className="w-3.5 h-3.5" /> },
    { value: "admin", label: "Administrador", icon: <Lock className="w-3.5 h-3.5" /> },
  ]}
/>
```

## Decision Tree

When adding a new UI element, follow this flow:

```
1. Is it a page wrapper/outer layout?
   → Use PageShell

2. Is it an input form field with label?
   → Use TextField

3. Is it a button (any style: primary, secondary, danger, ghost)?
   → Use Button from @/components/ui/button

4. Is it a card-like container?
   → Use SectionCard or Card from @/components/ui/card

5. Is it a data table?
   → Use DataTable

6. Is it a search box?
   → Use SearchInput

7. Is it a loading spinner?
   → Use LoadingState

8. Is it a confirmation/cancel dialog?
   → Use ConfirmDialog or Modal

9. Is it a status label?
   → Use StatusBadge

10. Is it a progress indicator?
   → Use ProgressBar

11. Is it an alert or warning block?
   → Use WarningAlert

12. Is it a tab/toggle switcher?
   → Use ToggleButtonGroup

13. Is it empty state / no data?
   → Use EmptyState

14. Otherwise:
   → Write minimal raw JSX, then extract to a new component
     in src/components/shared/ if it repeats more than once.
```

## Rules

- **DONT** write inline `className` strings longer than 60 characters on a single element. If the class string is long, it probably represents a reusable pattern.
- **DONT** copy-paste the same `<div className="...">` structure across files. Extract it.
- **ALWAYS** check `src/components/shared/` and `src/components/ui/` before implementing a new visual element. The component likely already exists.
- **ALWAYS** use `cn()` helper from `@/lib/utils` when conditionally merging classes.
- **PREFER** composition over inline styling: wrap feature-specific logic in small feature components that compose shared primitives.

## Migration Notes

Older components still contain raw inline HTML/Tailwind. When you touch a file, opportunistically migrate inline patterns to the shared components listed above. Every edit is a chance to replace duplication with composition.
