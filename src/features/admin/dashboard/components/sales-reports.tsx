'use client'

import React, { useState, useEffect } from 'react'
import { TrendingUp, Download, Calendar as CalendarIcon, Activity } from 'lucide-react'
import { getSalesReports, SalesReportData } from '../reports-actions'
import { Button, DataTable, PriceDisplay, SectionCard, Sparkline, ToggleButtonGroup } from '@/components/shared';
import { sumMoney } from '@/lib/format'

import { DashboardSnapshots } from '../types'
import { addDays, formatCalendarDate, todayStr } from '@/lib/dates'

interface SalesReportsProps {
  snapshots: DashboardSnapshots | null
}

interface SalesRow {
  date?: string
  month?: string
  total: number
  membership_total: number
  product_total: number
  count: number
}

function escapeCsvCell(val: string | number | null | undefined): string {
  if (val === null || val === undefined) return ''
  const str = String(val)
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

export function generateSalesReportCsv(
  reportData: SalesReportData,
  reportType: 'daily' | 'monthly'
): string {
  const lines: string[] = []

  // Section 1: Period Sales Metrics
  if (reportType === 'daily') {
    lines.push(['Fecha', 'Membresías ($)', 'Productos ($)', 'Ventas (Transacciones)', 'Total ($)'].map(escapeCsvCell).join(','))
    for (const row of reportData.daily || []) {
      lines.push([
        row.date || '',
        Number(row.membership_total || 0).toFixed(2),
        Number(row.product_total || 0).toFixed(2),
        row.count,
        Number(row.total || 0).toFixed(2)
      ].map(escapeCsvCell).join(','))
    }
  } else {
    lines.push(['Mes', 'Membresías ($)', 'Productos ($)', 'Ventas (Transacciones)', 'Total ($)'].map(escapeCsvCell).join(','))
    for (const row of reportData.monthly || []) {
      lines.push([
        row.month || '',
        Number(row.membership_total || 0).toFixed(2),
        Number(row.product_total || 0).toFixed(2),
        row.count,
        Number(row.total || 0).toFixed(2)
      ].map(escapeCsvCell).join(','))
    }
  }

  // Section 2: Summary by Category
  if (reportData.by_category && reportData.by_category.length > 0) {
    lines.push('')
    lines.push(['Categoría', 'Ventas (Transacciones)', 'Total ($)'].map(escapeCsvCell).join(','))
    for (const cat of reportData.by_category) {
      const catLabel = cat.category === 'MEMBERSHIP' ? 'Membresías' : cat.category === 'PRODUCT' ? 'Productos' : cat.category
      lines.push([
        catLabel,
        cat.count,
        Number(cat.total || 0).toFixed(2)
      ].map(escapeCsvCell).join(','))
    }
  }

  return lines.join('\r\n')
}

export default function SalesReports({ snapshots }: SalesReportsProps) {
  const [reportType, setReportType] = useState<'daily' | 'monthly'>('daily')
  const [data, setData] = useState<SalesReportData | null>(null)
  const [, setLoading] = useState(true)

  useEffect(() => {
    const fetchReport = async () => {
      setLoading(true)
      const end = todayStr()
      const start = addDays(end, -183).slice(0, 8) + '01' // ~6 months back, from the 1st
      const res = await getSalesReports(start, end)
      setData(res)
      setLoading(false)
    }
    fetchReport()
  }, [])

  const handleExport = () => {
    if (!data) return
    const csvContent = generateSalesReportCsv(data, reportType)
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    const dateStr = todayStr()
    link.href = url
    link.download = `reporte_ventas_${reportType}_${dateStr}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const columns = [
    {
      key: 'period',
      header: reportType === 'daily' ? 'Fecha' : 'Mes',
      render: (row: SalesRow) => (
        <span className="font-mono font-bold">
          {reportType === 'daily' ? formatCalendarDate(row.date!) : row.month}
        </span>
      )
    },
    {
      key: 'memberships',
      header: 'Membresías',
      render: (row: SalesRow) => <PriceDisplay amount={row.membership_total} variant="badge" />
    },
    {
      key: 'products',
      header: 'Productos',
      render: (row: SalesRow) => <PriceDisplay amount={row.product_total} variant="badge" />
    },
    {
      key: 'count',
      header: 'Ventas',
      render: (row: SalesRow) => <span className="text-xs text-muted-foreground">{row.count} transacciones</span>
    },
    {
      key: 'total',
      header: 'Total',
      render: (row: SalesRow) => <PriceDisplay amount={row.total} className="font-bold text-sm" />
    }
  ]

  const tableData = reportType === 'daily' ? data?.daily || [] : data?.monthly || []

  return (
    <SectionCard
      title="Informes de Ventas"
      description="Análisis consolidado de ingresos por membresías y tienda"
      titleAction={
        <div className="flex flex-wrap items-center justify-center lg:justify-end gap-3 w-full">
          <ToggleButtonGroup
            className="shrink-0"
            value={reportType}
            onChange={(val) => setReportType(val as 'daily' | 'monthly')}
            options={[
              { label: 'Diario', value: 'daily' },
              { label: 'Mensual', value: 'monthly' }
            ]}
          />
          <Button size="sm" variant="neutral" className="gap-2 shrink-0" disabled={!data} onClick={handleExport}>
            <Download className="h-4 w-4" />
            Exportar
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Quick Stats & Trend */}
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-4">
            {data?.by_category.map((cat, idx) => (
              <div key={idx} className="p-5 rounded-2xl bg-muted/30 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                  {cat.category === 'MEMBERSHIP' ? 'Ingresos Membresías' : 'Ingresos Tienda'}
                </span>
                <div className="flex justify-between items-end mt-4">
                  <PriceDisplay amount={cat.total} className="text-primary font-black text-2xl" />
                  <span className="text-xs text-muted-foreground font-medium bg-background px-2 py-1 rounded-md">{cat.count} ventas</span>
                </div>
              </div>
            ))}
            <div className="p-5 rounded-2xl bg-primary/10 shadow-sm flex flex-col justify-between">
              <span className="text-[10px] uppercase font-bold text-primary tracking-wider">Total Acumulado</span>
              <div className="flex justify-between items-end mt-4">
                <PriceDisplay amount={sumMoney((data?.by_category ?? []).map(c => c.total))} className="text-primary font-black text-2xl" showSecondary />
                <TrendingUp className="text-primary w-6 h-6 mb-1 opacity-80" />
              </div>
            </div>
          </div>

          {snapshots && (
            <div className="lg:w-1/3 p-5 rounded-2xl bg-muted/20 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest flex items-center gap-1.5">
                  <Activity className="w-3 h-3" /> Tendencia (30d)
                </span>
                <span className="text-[10px] font-mono text-emerald-500 font-bold uppercase bg-emerald-500/10 px-2 py-0.5 rounded-full">Pulso Activo</span>
              </div>
              <div className="flex-1 flex items-center justify-center py-2">
                <Sparkline 
                  data={snapshots.revenueTrend} 
                  width={240} 
                  height={60} 
                  strokeWidth={3}
                  color="var(--primary)" 
                />
              </div>
            </div>
          )}
        </div>

        {/* Breakdown Table */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-foreground">
            <CalendarIcon className="w-4 h-4 text-muted-foreground" />
            Desglose {reportType === 'daily' ? 'por Día' : 'por Mes'}
          </div>
          <DataTable
            columns={columns}
            data={tableData}
            keyExtractor={(row) => row.date || row.month || ''}
          />
        </div>
      </div>
    </SectionCard>
  )
}
