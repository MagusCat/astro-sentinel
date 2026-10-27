import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

describe('Empirical Verification: Responsive Layout Integrity (Tablet 768px-1024px & Desktop 1280px+)', () => {
  const rootDir = process.cwd()

  describe('ClientDetailsModal Responsive Architecture', () => {
    const modalPath = path.join(
      rootDir,
      'src/features/admin/clients/components/client-details-modal.tsx'
    )
    const content = fs.readFileSync(modalPath, 'utf-8')

    it('uses 4xl modal size to provide sufficient viewport width on tablet and desktop', () => {
      expect(content).toContain('size="4xl"')
    })

    it('implements responsive 2-column flex layout starting at tablet breakpoint (md: 768px)', () => {
      // Container transitions from vertical flex on mobile to horizontal row on tablet
      expect(content).toContain('flex flex-col md:flex-row gap-6 w-full md:overflow-hidden')
    })

    it('applies calibrated column widths across tablet (md) and desktop (lg/xl)', () => {
      // Left column: 40% on tablet (md), 38% on desktop (lg)
      expect(content).toContain('md:w-[40%] lg:w-[38%]')
      // Right column: 60% on tablet (md), 62% on desktop (lg)
      expect(content).toContain('md:w-[60%] lg:w-[62%]')
    })

    it('enforces min-w-0 to prevent flex item blow-out and horizontal scrollbars', () => {
      // Both columns must have min-w-0 for flex clipping
      const matches = content.match(/min-w-0/g)
      expect(matches).not.toBeNull()
      expect(matches!.length).toBeGreaterThanOrEqual(4)
    })

    it('enforces text truncation on user-generated string labels', () => {
      // Truncate client full name
      expect(content).toContain('truncate">{client.full_name}')
      // Truncate phone & email
      expect(content).toContain('truncate font-medium">{client.phone_number')
      expect(content).toContain('truncate font-medium">{client.email')
      // Truncate future membership plan name
      expect(content).toContain('truncate">{fut.plan_name}')
    })

    it('allows date chips and badges to wrap gracefully without clipping on tablet viewports', () => {
      expect(content).toContain('flex flex-wrap items-center gap-x-4 gap-y-1')
    })
  })

  describe('CheckoutPanel Responsive Grid Architecture', () => {
    const panelPath = path.join(
      rootDir,
      'src/features/admin/checkout/components/checkout-panel.tsx'
    )
    const content = fs.readFileSync(panelPath, 'utf-8')

    it('defines responsive grid scaling: 1-col mobile, 2-col tablet (md: 768px-1024px), 3-col desktop (xl: 1280px+)', () => {
      expect(content).toContain('grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 md:gap-8')
    })

    it('prevents card titles and descriptions from expanding cards horizontally', () => {
      expect(content).toContain('min-w-0')
      expect(content).toContain('truncate">{cls.name}')
      expect(content).toContain('line-clamp-2')
    })

    it('contains plan name overflow inside plan selector cards', () => {
      expect(content).toContain('min-w-0 pr-2')
      expect(content).toContain('truncate')
    })
  })

  describe('AdminShell Responsive Layout & Viewport Resilience', () => {
    const shellPath = path.join(
      rootDir,
      'src/app/(admin)/_components/admin-shell.tsx'
    )
    const content = fs.readFileSync(shellPath, 'utf-8')

    it('switches shell layout from vertical column on mobile to horizontal row on tablet (md: 768px)', () => {
      expect(content).toContain('flex flex-col md:flex-row w-full overflow-hidden')
    })

    it('hides mobile topbar header at tablet breakpoint (md: 768px+)', () => {
      expect(content).toContain('md:hidden')
      expect(content).toContain('h-[65px]')
    })

    it('dynamically adapts main content padding to sidebar collapsed / expanded state at md breakpoint', () => {
      expect(content).toContain('isCollapsed ? "md:pl-20" : "md:pl-64"')
    })

    it('sets responsive horizontal padding scale from mobile to desktop screens', () => {
      expect(content).toContain('px-4 sm:px-6 md:px-6 lg:px-8 xl:px-10 py-6')
    })

    it('strictly locks horizontal overflow on the main content container to prevent horizontal scrollbars', () => {
      expect(content).toContain('overflow-y-auto overflow-x-hidden')
    })
  })
})
