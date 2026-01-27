import { useMemo } from 'react'
import { parse, format } from 'date-fns'
import type { PriceRecord } from '@/types'

interface ReportViewProps {
  records: PriceRecord[]
  reportTitle: string
  sectionName: string
  viewStartDate: Date
  viewEndDate: Date
}

export function ReportView({
  records,
  reportTitle,
  sectionName,
  viewStartDate,
  viewEndDate,
}: ReportViewProps) {
  // Group records by date and format as plaintext report
  const reportText = useMemo(() => {
    if (records.length === 0) return ''

    // Filter to view date range
    const viewStart = viewStartDate.getTime()
    const viewEnd = viewEndDate.getTime()
    const filteredRecords = records.filter(r => {
      const t = parse(r.report_date, 'MM/dd/yyyy', new Date()).getTime()
      return t >= viewStart && t <= viewEnd
    })

    // Group by date
    const byDate = new Map<string, PriceRecord[]>()
    for (const record of filteredRecords) {
      const existing = byDate.get(record.report_date) || []
      existing.push(record)
      byDate.set(record.report_date, existing)
    }

    // Sort dates descending (most recent first)
    const sortedDates = Array.from(byDate.keys()).sort((a, b) => {
      const dateA = parse(a, 'MM/dd/yyyy', new Date())
      const dateB = parse(b, 'MM/dd/yyyy', new Date())
      return dateB.getTime() - dateA.getTime()
    })

    // Build report text
    const lines: string[] = []
    lines.push('=' .repeat(80))
    lines.push(reportTitle.toUpperCase())
    lines.push(sectionName)
    lines.push('=' .repeat(80))
    lines.push('')

    for (const date of sortedDates) {
      const dateRecords = byDate.get(date) || []
      const formattedDate = format(parse(date, 'MM/dd/yyyy', new Date()), 'EEEE, MMMM d, yyyy')

      lines.push('-'.repeat(80))
      lines.push(`Report Date: ${formattedDate}`)
      lines.push('-'.repeat(80))
      lines.push('')

      // Header
      lines.push(
        'Item Description'.padEnd(45) +
        'Low'.padStart(10) +
        'High'.padStart(10) +
        'Wtd Avg'.padStart(10) +
        'Trades'.padStart(8) +
        'Volume'.padStart(12)
      )
      lines.push('-'.repeat(95))

      // Sort by item description
      dateRecords.sort((a, b) => a.item_description.localeCompare(b.item_description))

      for (const record of dateRecords) {
        const itemName = record.item_description.length > 43
          ? record.item_description.slice(0, 40) + '...'
          : record.item_description

        lines.push(
          itemName.padEnd(45) +
          `$${record.price_range_low.toFixed(2)}`.padStart(10) +
          `$${record.price_range_high.toFixed(2)}`.padStart(10) +
          `$${record.weighted_average.toFixed(2)}`.padStart(10) +
          record.number_trades.toLocaleString().padStart(8) +
          `${record.total_pounds.toLocaleString()} lbs`.padStart(12)
        )
      }
      lines.push('')
    }

    lines.push('')
    lines.push('=' .repeat(80))
    lines.push(`Total Records: ${filteredRecords.length.toLocaleString()}`)
    lines.push(`Date Range: ${format(viewStartDate, 'MMM d, yyyy')} - ${format(viewEndDate, 'MMM d, yyyy')}`)
    lines.push('Source: USDA Market Price Reporting (mpr.datamart.ams.usda.gov)')
    lines.push('=' .repeat(80))

    return lines.join('\n')
  }, [records, reportTitle, sectionName, viewStartDate, viewEndDate])

  const handleCopy = () => {
    navigator.clipboard.writeText(reportText)
  }

  const handleDownload = () => {
    const blob = new Blob([reportText], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${sectionName.replace(/[^a-zA-Z0-9]/g, '-')}-report.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-4 h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-gray-900">Plaintext Report</h3>
        <div className="flex gap-2">
          <button
            onClick={handleCopy}
            className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
          >
            Copy
          </button>
          <button
            onClick={handleDownload}
            className="px-3 py-1 text-sm bg-ranch-blue text-white hover:bg-blue-700 rounded-md transition-colors"
          >
            Download
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-auto bg-gray-900 rounded-md p-4">
        <pre className="text-green-400 text-xs font-mono whitespace-pre overflow-x-auto">
          {reportText || 'No data to display'}
        </pre>
      </div>
    </div>
  )
}
