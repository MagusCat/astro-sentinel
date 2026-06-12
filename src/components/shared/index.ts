/**
 * Shared Components Re-exports
 *
 * Central barrel file that groups all shared components by responsibility.
 * Any new shared component added to subdirectories MUST be re-exported here.
 */

// ── Layout ──────────────────────────────────────────────
export { PageShell } from "./layout/page-shell"
export { PageHeader } from "./layout/page-header"
export { default as Logo } from "./layout/logo"
export { default as SessionLoading } from "./layout/session-loading"
export { AppSidebar, AppSidebarGroup, AppSidebarItem } from "./layout/app-sidebar"

// ── Form ──────────────────────────────────────────────
export { TextField } from "./form/text-field"
export { TextareaField } from "./form/textarea-field"
export { SelectField } from "./form/select-field"
export { PhoneField } from "./form/phone-field"
export { SearchInput } from "./form/search-input"
export { FormActions } from "./form/form-actions"
export { ToggleButtonGroup } from "./form/toggle-button-group"
export { DatePicker } from "./form/date-picker"
export { default as ImageUploader } from "./form/image-uploader"
export { Button } from "./form/button"

// ── Feedback ──────────────────────────────────────────
export { default as Toast } from "./feedback/toast"
export type { ToastType } from "./feedback/toast"
export { EmptyState } from "./feedback/empty-state"
export { LoadingState } from "./feedback/loading-state"
export { ProgressBar } from "./feedback/progress-bar"
export { WarningAlert } from "./feedback/warning-alert"
export { ConfirmDialog } from "./feedback/confirm-dialog"
export { default as Modal } from "./feedback/modal"
export { default as Tooltip } from "./feedback/tooltip"
export { Skeleton, TableSkeleton, CardSkeleton, ClientDetailSkeleton } from "./feedback/skeleton"

// ── Data Display ──────────────────────────────────────
export { DataTable } from "./data-display/data-table"
export { SectionCard } from "./data-display/section-card"
export { StatusBadge } from "./data-display/status-badge"
export { DashboardListWidget } from "./data-display/dashboard-list-widget"
export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent, CardAction } from "./data-display/card"
export { MetricCard } from "./data-display/metric-card"
export { PriceDisplay } from "./data-display/price-display"
