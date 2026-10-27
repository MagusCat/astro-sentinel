import { describe, it, expect } from 'vitest'
import { generateSalesReportCsv } from './sales-reports'
import { SalesReportData } from '../reports-actions'

/**
 * Standard RFC 4180 CSV Parser utility for test verification.
 * Splits a CSV string into a 2D array of record fields while respecting
 * quotes, escaped double-quotes (""), embedded commas, and CRLF newlines.
 */
function parseRfc4180Csv(csvText: string): string[][] {
  const records: string[][] = []
  let currentRecord: string[] = []
  let currentField = ''
  let insideQuotes = false
  let i = 0

  while (i < csvText.length) {
    const char = csvText[i]

    if (insideQuotes) {
      if (char === '"') {
        if (i + 1 < csvText.length && csvText[i + 1] === '"') {
          // Escaped double-quote
          currentField += '"'
          i += 2
          continue
        } else {
          // End of quoted field
          insideQuotes = false
          i++
          continue
        }
      } else {
        currentField += char
        i++
        continue
      }
    } else {
      if (char === '"') {
        insideQuotes = true
        i++
        continue
      } else if (char === ',') {
        currentRecord.push(currentField)
        currentField = ''
        i++
        continue
      } else if (char === '\r' && i + 1 < csvText.length && csvText[i + 1] === '\n') {
        currentRecord.push(currentField)
        records.push(currentRecord)
        currentRecord = []
        currentField = ''
        i += 2
        continue
      } else if (char === '\n') {
        currentRecord.push(currentField)
        records.push(currentRecord)
        currentRecord = []
        currentField = ''
        i++
        continue
      } else {
        currentField += char
        i++
        continue
      }
    }
  }

  // Last field and record if content remaining
  if (currentField.length > 0 || currentRecord.length > 0) {
    currentRecord.push(currentField)
    records.push(currentRecord)
  }

  return records
}

describe('generateSalesReportCsv', () => {
  it('generates an RFC 4180 compliant CSV for daily sales', () => {
    const mockData: SalesReportData = {
      daily: [
        {
          date: '2026-10-10',
          total: 1500.5,
          membership_total: 1000.0,
          product_total: 500.5,
          count: 3
        },
        {
          date: '2026-10-09',
          total: 800.0,
          membership_total: 800.0,
          product_total: 0.0,
          count: 1
        }
      ],
      monthly: [],
      by_category: [
        { category: 'MEMBERSHIP', total: 1800.0, count: 4 },
        { category: 'PRODUCT', total: 500.5, count: 1 }
      ]
    }

    const csv = generateSalesReportCsv(mockData, 'daily')

    // Must use RFC 4180 CRLF line terminators
    expect(csv).toContain('\r\n')
    const lines = csv.split('\r\n')

    // Section 1 Header
    expect(lines[0]).toBe('Fecha,Membresías ($),Productos ($),Ventas (Transacciones),Total ($)')

    // Data rows
    expect(lines[1]).toBe('2026-10-10,1000.00,500.50,3,1500.50')
    expect(lines[2]).toBe('2026-10-09,800.00,0.00,1,800.00')

    // Empty separator line
    expect(lines[3]).toBe('')

    // Section 2 Header
    expect(lines[4]).toBe('Categoría,Ventas (Transacciones),Total ($)')
    expect(lines[5]).toBe('Membresías,4,1800.00')
    expect(lines[6]).toBe('Productos,1,500.50')
  })

  it('generates an RFC 4180 compliant CSV for monthly sales', () => {
    const mockData: SalesReportData = {
      daily: [],
      monthly: [
        {
          month: '2026-10',
          total: 12500.0,
          membership_total: 10000.0,
          product_total: 2500.0,
          count: 25
        }
      ],
      by_category: []
    }

    const csv = generateSalesReportCsv(mockData, 'monthly')
    const lines = csv.split('\r\n')

    expect(lines[0]).toBe('Mes,Membresías ($),Productos ($),Ventas (Transacciones),Total ($)')
    expect(lines[1]).toBe('2026-10,10000.00,2500.00,25,12500.00')
  })

  it('properly escapes quotes, commas, and newlines in cells per RFC 4180', () => {
    const mockData: SalesReportData = {
      daily: [],
      monthly: [],
      by_category: [
        { category: 'VIP, Gold "Special"', total: 200.0, count: 2 },
        { category: 'Multi\nLine', total: 100.0, count: 1 }
      ]
    }

    const csv = generateSalesReportCsv(mockData, 'daily')
    const lines = csv.split('\r\n')

    // Finds the escaped category row
    const escapedRow = lines.find((l) => l.includes('VIP, Gold ""Special""'))
    expect(escapedRow).toBeDefined()
    expect(escapedRow?.startsWith('"VIP, Gold ""Special"""')).toBe(true)

    // Newline in category cell should be surrounded by double quotes
    expect(csv).toContain('"Multi\nLine"')
  })

  it('handles empty data gracefully without throwing', () => {
    const emptyData: SalesReportData = {
      daily: [],
      monthly: [],
      by_category: []
    }

    const csv = generateSalesReportCsv(emptyData, 'daily')
    expect(csv).toBe('Fecha,Membresías ($),Productos ($),Ventas (Transacciones),Total ($)')
  })

  describe('Adversarial & Edge Cases (RFC 4180, Zeros, Escaping)', () => {
    it('accurately parses through RFC 4180 parser restoring complex strings verbatim', () => {
      const complexData: SalesReportData = {
        daily: [
          {
            date: '2026-10-11',
            total: 250.75,
            membership_total: 150.0,
            product_total: 100.75,
            count: 2,
          },
        ],
        monthly: [],
        by_category: [
          { category: 'A, B, C and "Quotes", with \r\n CRLF', total: 50.0, count: 1 },
          { category: 'Single"Quote', total: 20.0, count: 1 },
          { category: ',Leading and Trailing,', total: 30.0, count: 1 },
          { category: '""DoubleQuotesInQuotes""', total: 40.0, count: 1 },
        ],
      }

      const csv = generateSalesReportCsv(complexData, 'daily')
      const parsed = parseRfc4180Csv(csv)

      // Header row
      expect(parsed[0]).toEqual(['Fecha', 'Membresías ($)', 'Productos ($)', 'Ventas (Transacciones)', 'Total ($)'])
      // Data row
      expect(parsed[1]).toEqual(['2026-10-11', '150.00', '100.75', '2', '250.75'])
      // Empty separator line
      expect(parsed[2]).toEqual([''])
      // Category header
      expect(parsed[3]).toEqual(['Categoría', 'Ventas (Transacciones)', 'Total ($)'])

      // Check verbatim recovery of categories
      expect(parsed[4][0]).toBe('A, B, C and "Quotes", with \r\n CRLF')
      expect(parsed[4][1]).toBe('1')
      expect(parsed[4][2]).toBe('50.00')

      expect(parsed[5][0]).toBe('Single"Quote')
      expect(parsed[6][0]).toBe(',Leading and Trailing,')
      expect(parsed[7][0]).toBe('""DoubleQuotesInQuotes""')
    })

    it('formats exact zero numbers as 0.00 and 0 without skipping or converting to empty string', () => {
      const zeroData: SalesReportData = {
        daily: [
          {
            date: '2026-10-01',
            total: 0,
            membership_total: 0,
            product_total: 0,
            count: 0,
          },
        ],
        monthly: [],
        by_category: [
          { category: 'MEMBERSHIP', total: 0, count: 0 },
          { category: 'PRODUCT', total: 0, count: 0 },
        ],
      }

      const csv = generateSalesReportCsv(zeroData, 'daily')
      const parsed = parseRfc4180Csv(csv)

      expect(parsed[1]).toEqual(['2026-10-01', '0.00', '0.00', '0', '0.00'])
      expect(parsed[4]).toEqual(['Membresías', '0', '0.00'])
      expect(parsed[5]).toEqual(['Productos', '0', '0.00'])
    })

    it('handles null, undefined, or missing fields in rows gracefully', () => {
      const sparseData: SalesReportData = {
        daily: [
          {
            date: undefined,
            total: 0,
            membership_total: 0,
            product_total: 0,
            count: 0,
          },
        ],
        monthly: [
          {
            month: undefined,
            total: 0,
            membership_total: 0,
            product_total: 0,
            count: 0,
          },
        ],
        by_category: [
          { category: '', total: 0, count: 0 },
        ],
      }

      const dailyCsv = generateSalesReportCsv(sparseData, 'daily')
      const dailyParsed = parseRfc4180Csv(dailyCsv)
      expect(dailyParsed[1][0]).toBe('') // Empty date cell

      const monthlyCsv = generateSalesReportCsv(sparseData, 'monthly')
      const monthlyParsed = parseRfc4180Csv(monthlyCsv)
      expect(monthlyParsed[1][0]).toBe('') // Empty month cell
    })

    it('formats floating point numbers to exactly two decimal places', () => {
      const floatData: SalesReportData = {
        daily: [
          {
            date: '2026-10-05',
            total: 99.999,
            membership_total: 49.004,
            product_total: 50.996,
            count: 10,
          },
        ],
        monthly: [],
        by_category: [],
      }

      const csv = generateSalesReportCsv(floatData, 'daily')
      const parsed = parseRfc4180Csv(csv)
      expect(parsed[1]).toEqual(['2026-10-05', '49.00', '51.00', '10', '100.00'])
    })

    it('translates standard categories and preserves custom category strings', () => {
      const catData: SalesReportData = {
        daily: [],
        monthly: [],
        by_category: [
          { category: 'MEMBERSHIP', total: 100, count: 1 },
          { category: 'PRODUCT', total: 50, count: 2 },
          { category: 'SEMINARIO_ESPECIAL', total: 75, count: 3 },
          { category: 'CUSTOM_WORKSHOP', total: 200, count: 4 },
        ],
      }

      const csv = generateSalesReportCsv(catData, 'daily')
      const parsed = parseRfc4180Csv(csv)

      // parsed[0]: daily header
      // parsed[1]: empty separator line
      // parsed[2]: category header
      expect(parsed[2]).toEqual(['Categoría', 'Ventas (Transacciones)', 'Total ($)'])
      expect(parsed[3][0]).toBe('Membresías')
      expect(parsed[4][0]).toBe('Productos')
      expect(parsed[5][0]).toBe('SEMINARIO_ESPECIAL')
      expect(parsed[6][0]).toBe('CUSTOM_WORKSHOP')
    })

    it('handles negative totals or refunds cleanly', () => {
      const refundData: SalesReportData = {
        daily: [
          {
            date: '2026-10-08',
            total: -100.0,
            membership_total: -100.0,
            product_total: 0.0,
            count: 1,
          },
        ],
        monthly: [],
        by_category: [
          { category: 'MEMBERSHIP', total: -100.0, count: 1 },
        ],
      }

      const csv = generateSalesReportCsv(refundData, 'daily')
      const parsed = parseRfc4180Csv(csv)

      expect(parsed[1]).toEqual(['2026-10-08', '-100.00', '0.00', '1', '-100.00'])
      expect(parsed[4]).toEqual(['Membresías', '1', '-100.00'])
    })
  })
})
