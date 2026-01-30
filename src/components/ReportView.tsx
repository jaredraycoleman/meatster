import { useMemo, useState, useRef, useEffect, useCallback } from 'react'
import { parse, format } from 'date-fns'
import { Search, ChevronUp, ChevronDown, Highlighter, List } from 'lucide-react'
import type { PriceRecord } from '@/types'

interface ReportViewProps {
  records: PriceRecord[]
  allRecords: PriceRecord[]
  reportTitle: string
  sectionName: string
  viewStartDate: Date
  viewEndDate: Date
  highlightedItem?: string | null
}

export function ReportView({
  records,
  allRecords,
  reportTitle,
  sectionName,
  viewStartDate,
  viewEndDate,
  highlightedItem,
}: ReportViewProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0)
  const [highlightsEnabled, setHighlightsEnabled] = useState(!!highlightedItem)
  const [showAllDates, setShowAllDates] = useState(false)
  const lineRefs = useRef<Map<number, HTMLSpanElement>>(new Map())
  const containerRef = useRef<HTMLDivElement>(null)

  // Reset highlights based on item selection
  useEffect(() => {
    setHighlightsEnabled(!!highlightedItem)
  }, [highlightedItem])

  // Group records by date and format as plaintext report with highlighting
  interface ReportLine {
    text: string
    highlighted: boolean
  }

  const { lines: reportLines, plainText, totalDates } = useMemo(() => {
    const sourceRecords = allRecords.length > 0 ? allRecords : records
    if (sourceRecords.length === 0) return { lines: [], plainText: '' }

    const viewStart = viewStartDate.getTime()
    const viewEnd = viewEndDate.getTime()

    // Check if a record is in the highlighted range
    const isHighlighted = (record: PriceRecord) => {
      const t = parse(record.report_date, 'MM/dd/yyyy', new Date()).getTime()
      const inDateRange = t >= viewStart && t <= viewEnd
      const matchesItem = !highlightedItem || record.item_description === highlightedItem
      return inDateRange && matchesItem
    }

    // Check if a date has any highlighted records
    const dateHasHighlight = (dateRecords: PriceRecord[]) => {
      return dateRecords.some(isHighlighted)
    }

    // Group by date
    const byDate = new Map<string, PriceRecord[]>()
    for (const record of sourceRecords) {
      const existing = byDate.get(record.report_date) || []
      existing.push(record)
      byDate.set(record.report_date, existing)
    }

    // Sort dates descending (most recent first)
    const allSortedDates = Array.from(byDate.keys()).sort((a, b) => {
      const dateA = parse(a, 'MM/dd/yyyy', new Date())
      const dateB = parse(b, 'MM/dd/yyyy', new Date())
      return dateB.getTime() - dateA.getTime()
    })

    // Limit to most recent date if not showing all
    const sortedDates = showAllDates ? allSortedDates : allSortedDates.slice(0, 1)

    // Build report lines with highlight info
    const lines: ReportLine[] = []
    lines.push({ text: '='.repeat(80), highlighted: false })
    lines.push({ text: reportTitle.toUpperCase(), highlighted: false })
    lines.push({ text: sectionName, highlighted: false })
    lines.push({ text: '='.repeat(80), highlighted: false })
    lines.push({ text: '', highlighted: false })

    for (const date of sortedDates) {
      const dateRecords = byDate.get(date) || []
      const formattedDate = format(parse(date, 'MM/dd/yyyy', new Date()), 'EEEE, MMMM d, yyyy')
      const hasHighlight = dateHasHighlight(dateRecords)

      lines.push({ text: '-'.repeat(80), highlighted: hasHighlight })
      lines.push({ text: `Report Date: ${formattedDate}`, highlighted: hasHighlight })
      lines.push({ text: '-'.repeat(80), highlighted: hasHighlight })
      lines.push({ text: '', highlighted: false })

      // Header
      lines.push({
        text: 'Item Description'.padEnd(45) +
          'Low'.padStart(10) +
          'High'.padStart(10) +
          'Wtd Avg'.padStart(10) +
          'Trades'.padStart(8) +
          'Volume'.padStart(12),
        highlighted: false
      })
      lines.push({ text: '-'.repeat(95), highlighted: false })

      // Sort by item description
      dateRecords.sort((a, b) => a.item_description.localeCompare(b.item_description))

      for (const record of dateRecords) {
        const itemName = record.item_description.length > 43
          ? record.item_description.slice(0, 40) + '...'
          : record.item_description

        lines.push({
          text: itemName.padEnd(45) +
            `$${record.price_range_low.toFixed(2)}`.padStart(10) +
            `$${record.price_range_high.toFixed(2)}`.padStart(10) +
            `$${record.weighted_average.toFixed(2)}`.padStart(10) +
            record.number_trades.toLocaleString().padStart(8) +
            `${record.total_pounds.toLocaleString()} lbs`.padStart(12),
          highlighted: isHighlighted(record)
        })
      }
      lines.push({ text: '', highlighted: false })
    }

    const displayedRecords = sortedDates.flatMap(date => byDate.get(date) || [])
    const highlightedCount = displayedRecords.filter(isHighlighted).length

    lines.push({ text: '', highlighted: false })
    lines.push({ text: '='.repeat(80), highlighted: false })
    lines.push({ text: `Showing: ${sortedDates.length} of ${allSortedDates.length} report dates`, highlighted: false })
    lines.push({ text: `Records: ${displayedRecords.length.toLocaleString()} (${highlightedCount.toLocaleString()} highlighted)`, highlighted: false })
    lines.push({ text: `Highlighted Range: ${format(viewStartDate, 'MMM d, yyyy')} - ${format(viewEndDate, 'MMM d, yyyy')}`, highlighted: false })
    lines.push({ text: 'Source: USDA Market Price Reporting (mpr.datamart.ams.usda.gov)', highlighted: false })
    lines.push({ text: '='.repeat(80), highlighted: false })

    return {
      lines,
      plainText: lines.map(l => l.text).join('\n'),
      totalDates: allSortedDates.length
    }
  }, [records, allRecords, reportTitle, sectionName, viewStartDate, viewEndDate, highlightedItem, showAllDates])

  // Find matching line indices for search
  const searchMatches = useMemo(() => {
    if (!searchQuery.trim()) return []
    const query = searchQuery.toLowerCase()
    return reportLines
      .map((line, index) => ({ line, index }))
      .filter(({ line }) => line.text.toLowerCase().includes(query))
      .map(({ index }) => index)
  }, [reportLines, searchQuery])

  // Reset match index when search changes
  useEffect(() => {
    setCurrentMatchIndex(0)
  }, [searchQuery])

  // Scroll to current match
  useEffect(() => {
    if (searchMatches.length > 0 && currentMatchIndex < searchMatches.length) {
      const lineIndex = searchMatches[currentMatchIndex]
      const element = lineRefs.current.get(lineIndex)
      if (element && containerRef.current) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }
  }, [currentMatchIndex, searchMatches])

  const goToNextMatch = useCallback(() => {
    if (searchMatches.length > 0) {
      setCurrentMatchIndex(prev => (prev + 1) % searchMatches.length)
    }
  }, [searchMatches.length])

  const goToPrevMatch = useCallback(() => {
    if (searchMatches.length > 0) {
      setCurrentMatchIndex(prev => (prev - 1 + searchMatches.length) % searchMatches.length)
    }
  }, [searchMatches.length])

  // Calculate minimap markers for highlighted lines and search matches
  const minimapMarkers = useMemo(() => {
    if (reportLines.length === 0) return []

    const markers: { position: number; type: 'highlight' | 'search' | 'current' }[] = []

    // Add highlight markers
    if (highlightsEnabled) {
      reportLines.forEach((line, i) => {
        if (line.highlighted) {
          markers.push({ position: i / reportLines.length, type: 'highlight' })
        }
      })
    }

    // Add search match markers
    searchMatches.forEach((lineIndex, matchIndex) => {
      const type = matchIndex === currentMatchIndex ? 'current' : 'search'
      markers.push({ position: lineIndex / reportLines.length, type })
    })

    return markers
  }, [reportLines, highlightsEnabled, searchMatches, currentMatchIndex])

  // Handle minimap click to scroll to position
  const handleMinimapClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return
    const rect = e.currentTarget.getBoundingClientRect()
    const clickPosition = (e.clientY - rect.top) / rect.height
    const targetLine = Math.floor(clickPosition * reportLines.length)
    const element = lineRefs.current.get(targetLine)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [reportLines.length])

  const handleCopy = () => {
    navigator.clipboard.writeText(plainText)
  }

  const handleDownload = () => {
    const blob = new Blob([plainText], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${sectionName.replace(/[^a-zA-Z0-9]/g, '-')}-report.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Render line text with search highlighting
  const renderLineText = (text: string, lineIndex: number) => {
    if (!searchQuery.trim()) return text

    const query = searchQuery.toLowerCase()
    const lowerText = text.toLowerCase()
    const matchIndex = lowerText.indexOf(query)

    if (matchIndex === -1) return text

    const isCurrentMatch = searchMatches[currentMatchIndex] === lineIndex
    const before = text.slice(0, matchIndex)
    const match = text.slice(matchIndex, matchIndex + searchQuery.length)
    const after = text.slice(matchIndex + searchQuery.length)

    return (
      <>
        {before}
        <span className={isCurrentMatch ? 'bg-orange-400 text-gray-900' : 'bg-blue-300 text-gray-900'}>
          {match}
        </span>
        {after}
      </>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-4 h-full flex flex-col">
      <div className="flex flex-col gap-3 mb-3">
        <div className="flex items-center justify-between">
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

        <div className="flex items-center gap-2">
          {/* Search input */}
          <div className="flex-1 relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search report..."
              className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-ranch-blue/50"
            />
          </div>

          {/* Search navigation */}
          {searchQuery && (
            <div className="flex items-center gap-1">
              <span className="text-sm text-gray-500 min-w-[60px] text-center">
                {searchMatches.length > 0
                  ? `${currentMatchIndex + 1}/${searchMatches.length}`
                  : '0/0'}
              </span>
              <button
                onClick={goToPrevMatch}
                disabled={searchMatches.length === 0}
                className="p-1 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                title="Previous match"
              >
                <ChevronUp className="w-4 h-4" />
              </button>
              <button
                onClick={goToNextMatch}
                disabled={searchMatches.length === 0}
                className="p-1 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                title="Next match"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Highlight toggle */}
          <button
            onClick={() => setHighlightsEnabled(prev => !prev)}
            className={`flex items-center gap-1 px-2 py-1.5 text-sm rounded-md transition-colors ${
              highlightsEnabled
                ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            title={highlightsEnabled ? 'Disable highlights' : 'Enable highlights'}
          >
            <Highlighter className="w-4 h-4" />
          </button>

          {/* Show all dates toggle */}
          <button
            onClick={() => setShowAllDates(prev => !prev)}
            className={`flex items-center gap-1 px-2 py-1.5 text-sm rounded-md transition-colors ${
              showAllDates
                ? 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            title={showAllDates ? 'Show only latest report' : `Show all ${totalDates} report dates`}
          >
            <List className="w-4 h-4" />
            <span className="hidden sm:inline">{showAllDates ? 'Latest' : 'All'}</span>
          </button>
        </div>
      </div>

      <div className="flex-1 flex rounded-md border border-gray-200 overflow-hidden">
        {/* Main content area */}
        <div ref={containerRef} className="flex-1 overflow-auto bg-gray-50 p-4">
          <pre className="text-xs font-mono whitespace-pre overflow-x-auto">
            {reportLines.length > 0 ? (
              reportLines.map((line, i) => {
                const isSearchMatch = searchMatches.includes(i)
                const isCurrentSearchMatch = searchMatches[currentMatchIndex] === i

                let className = 'text-gray-700'
                if (highlightsEnabled && line.highlighted) {
                  className = 'text-gray-900 bg-yellow-100'
                }
                if (isCurrentSearchMatch) {
                  className = 'text-gray-900 bg-orange-200'
                } else if (isSearchMatch) {
                  className = 'text-gray-900 bg-blue-100'
                }

                return (
                  <span
                    key={i}
                    ref={el => {
                      if (el) lineRefs.current.set(i, el)
                    }}
                    className={className}
                  >
                    {renderLineText(line.text, i)}
                    {'\n'}
                  </span>
                )
              })
            ) : (
              <span className="text-gray-700">No data to display</span>
            )}
          </pre>
        </div>

        {/* Scrollbar minimap */}
        {reportLines.length > 0 && (
          <div
            className="w-3 bg-gray-100 border-l border-gray-200 relative cursor-pointer flex-shrink-0"
            onClick={handleMinimapClick}
            title="Click to jump to position"
          >
            {minimapMarkers.map((marker, i) => (
              <div
                key={i}
                className={`absolute left-0 right-0 h-0.5 ${
                  marker.type === 'current'
                    ? 'bg-orange-500'
                    : marker.type === 'search'
                    ? 'bg-blue-400'
                    : 'bg-yellow-400'
                }`}
                style={{ top: `${marker.position * 100}%` }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
