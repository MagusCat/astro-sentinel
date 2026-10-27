import { describe, it, expect } from 'vitest'
import { generateSalesReportCsv } from './sales-reports'
import type { SalesReportData } from '../reports-actions'

/**
 * Strict RFC 4180 State Machine Parser Oracle.
 * Implements the authoritative RFC 4180 specification:
 * - Line breaks inside fields must be CRLF or LF when quoted.
 * - Double quotes inside quoted fields must be escaped as double-quote pairs ("").
 * - Fields containing quotes, commas, CR, or LF MUST be enclosed in double quotes.
 */
function strictRfc4180Oracle(csv: string): string[][] {
  const records: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false
  let i = 0

  while (i < csv.length) {
    const c = csv[i]

    if (inQuotes) {
      if (c === '"') {
        if (i + 1 < csv.length && csv[i + 1] === '"') {
          field += '"'
          i += 2
        } else {
          inQuotes = false
          i++
        }
      } else {
        field += c
        i++
      }
    } else {
      if (c === '"') {
        inQuotes = true
        i++
      } else if (c === ',') {
        row.push(field)
        field = ''
        i++
      } else if (c === '\r' && i + 1 < csv.length && csv[i + 1] === '\n') {
        row.push(field)
        records.push(row)
        row = []
        field = ''
        i += 2
      } else if (c === '\n') {
        row.push(field)
        records.push(row)
        row = []
        field = ''
        i++
      } else {
        field += c
        i++
      }
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field)
    records.push(row)
  }

  return records
}

describe('Adversarial RFC 4180 CSV Stress Testing', () => {
  describe('Boundary cases & String sanitization', () => {
    it('handles heavy punctuation, nested quotes, and mixed newlines safely', () => {
      const adversarialCategories = [
        '""',
        '","',
        '",\r\n,"',
        'Normal category',
        'Quotes "inside" word',
        'Trailing comma,',
        ',Leading comma',
        'Newline \n inside',
        'CRLF \r\n inside',
        'Solo CR \r inside',
        'Special chars: ; | \t \\ / $ & % # @ !',
        'Emojis: 🏋️‍♂️ 🔥 💰 🥊',
        'Accents & Spanish: Ñandú, Éxito, Canción, Günter',
        'Formula triggers: =1+1, -500, +100, @SUM(A1:B10)',
      ]

      const reportData: SalesReportData = {
        daily: [],
        monthly: [],
        by_category: adversarialCategories.map((cat, idx) => ({
          category: cat,
          total: idx * 10.5,
          count: idx + 1,
        })),
      }

      const csv = generateSalesReportCsv(reportData, 'daily')
      const records = strictRfc4180Oracle(csv)

      // Section 1: Daily header (row 0)
      expect(records[0]).toEqual(['Fecha', 'Membresías ($)', 'Productos ($)', 'Ventas (Transacciones)', 'Total ($)'])
      // Empty separator line (row 1)
      expect(records[1]).toEqual([''])
      // Section 2: Category header (row 2)
      expect(records[2]).toEqual(['Categoría', 'Ventas (Transacciones)', 'Total ($)'])

      // Check each category restored verbatim
      for (let i = 0; i < adversarialCategories.length; i++) {
        const parsedCategoryRow = records[3 + i]
        expect(parsedCategoryRow).toBeDefined()
        expect(parsedCategoryRow[0]).toBe(adversarialCategories[i])
        expect(parsedCategoryRow[1]).toBe(String(i + 1))
        expect(parsedCategoryRow[2]).toBe((i * 10.5).toFixed(2))
      }
    })

    it('handles zero amounts, negative numbers, and boundary numbers without omission', () => {
      const numericEdgeCases = [
        { date: '2026-01-01', total: 0, membership_total: 0, product_total: 0, count: 0 },
        { date: '2026-01-02', total: -0, membership_total: -0, product_total: -0, count: 0 },
        { date: '2026-01-03', total: -150.25, membership_total: -100.0, product_total: -50.25, count: 1 },
        { date: '2026-01-04', total: 0.00001, membership_total: 0.004, product_total: 0.001, count: 5 },
        { date: '2026-01-05', total: 999999999.99, membership_total: 500000000.0, product_total: 499999999.99, count: 999999 },
      ]

      const reportData: SalesReportData = {
        daily: numericEdgeCases,
        monthly: [],
        by_category: [],
      }

      const csv = generateSalesReportCsv(reportData, 'daily')
      const records = strictRfc4180Oracle(csv)

      expect(records[1]).toEqual(['2026-01-01', '0.00', '0.00', '0', '0.00'])
      expect(records[2]).toEqual(['2026-01-02', '0.00', '0.00', '0', '0.00'])
      expect(records[3]).toEqual(['2026-01-03', '-100.00', '-50.25', '1', '-150.25'])
      expect(records[4]).toEqual(['2026-01-04', '0.00', '0.00', '5', '0.00'])
      expect(records[5]).toEqual(['2026-01-05', '500000000.00', '499999999.99', '999999', '999999999.99'])
    })

    it('handles null, undefined, empty strings, and missing fields across all models', () => {
      const malformedData = {
        daily: [
          {
            date: undefined,
            total: (null as unknown) as number,
            membership_total: (undefined as unknown) as number,
            product_total: (null as unknown) as number,
            count: (undefined as unknown) as number,
          },
          {
            date: '',
            total: 0,
            membership_total: 0,
            product_total: 0,
            count: 0,
          },
        ],
        monthly: [
          {
            month: null as unknown as string,
            total: NaN as unknown as number,
            membership_total: NaN as unknown as number,
            product_total: NaN as unknown as number,
            count: 0,
          },
        ],
        by_category: [
          {
            category: (undefined as unknown) as string,
            total: (null as unknown) as number,
            count: (undefined as unknown) as number,
          },
          {
            category: (null as unknown) as string,
            total: 0,
            count: 0,
          },
        ],
      } as unknown as SalesReportData

      const dailyCsv = generateSalesReportCsv(malformedData, 'daily')
      const dailyRecords = strictRfc4180Oracle(dailyCsv)

      expect(dailyRecords[1]).toEqual(['', '0.00', '0.00', '', '0.00'])
      expect(dailyRecords[2]).toEqual(['', '0.00', '0.00', '0', '0.00'])
      // Empty separator line
      expect(dailyRecords[3]).toEqual([''])
      // Category header
      expect(dailyRecords[4]).toEqual(['Categoría', 'Ventas (Transacciones)', 'Total ($)'])
      // Undefined category -> empty string
      expect(dailyRecords[5]).toEqual(['', '', '0.00'])
      // Null category -> empty string
      expect(dailyRecords[6]).toEqual(['', '0', '0.00'])

      const monthlyCsv = generateSalesReportCsv(malformedData, 'monthly')
      const monthlyRecords = strictRfc4180Oracle(monthlyCsv)
      expect(monthlyRecords[1]).toEqual(['', '0.00', '0.00', '0', '0.00'])
    })

    it('translates known categories while escaping custom categories with embedded quotes', () => {
      const reportData: SalesReportData = {
        daily: [],
        monthly: [],
        by_category: [
          { category: 'MEMBERSHIP', total: 100, count: 1 },
          { category: 'PRODUCT', total: 50, count: 2 },
          { category: 'CUSTOM, "GOLD" VIP', total: 200, count: 3 },
        ],
      }

      const csv = generateSalesReportCsv(reportData, 'daily')
      const records = strictRfc4180Oracle(csv)

      expect(records[3]).toEqual(['Membresías', '1', '100.00'])
      expect(records[4]).toEqual(['Productos', '2', '50.00'])
      expect(records[5]).toEqual(['CUSTOM, "GOLD" VIP', '3', '200.00'])
    })
  })

  describe('Scale & Stress harness (10,000 records)', () => {
    it('efficiently generates and round-trips 10,000 records without corruption or stack overflow', () => {
      const rowCount = 10000
      const largeRows = []

      for (let i = 0; i < rowCount; i++) {
        largeRows.push({
          date: `2026-10-${String((i % 30) + 1).padStart(2, '0')}`,
          total: (i * 1.25) % 5000,
          membership_total: (i * 0.75) % 3000,
          product_total: (i * 0.5) % 2000,
          count: (i % 10) + 1,
        })
      }

      const reportData: SalesReportData = {
        daily: largeRows,
        monthly: [],
        by_category: [],
      }

      const start = performance.now()
      const csv = generateSalesReportCsv(reportData, 'daily')
      const duration = performance.now() - start

      // Generation should be performant (less than 1000ms for 10k rows)
      expect(duration).toBeLessThan(1000)

      // Verify line counts: 1 header + 10,000 data rows = 10,001 lines
      const lines = csv.split('\r\n')
      expect(lines.length).toBe(rowCount + 1)
      expect(lines[0]).toBe('Fecha,Membresías ($),Productos ($),Ventas (Transacciones),Total ($)')

      // Check first and last row
      const firstRowParsed = lines[1].split(',')
      expect(firstRowParsed[0]).toBe('2026-10-01')

      const lastRow = lines[rowCount]
      expect(lastRow).toBeDefined()
    })
  })
})
