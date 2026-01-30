import { useState, useCallback, useEffect, useMemo } from 'react'
import { subDays, format, parse } from 'date-fns'
import {
  Header,
  FilterPanel,
  PriceChart,
  SummaryStats,
  LoadingSpinner,
  ReportView,
  AnalysisPanel,
} from '@/components'
import {
  useManifest,
  useReports,
  useSections,
  useItemDescriptions,
  usePriceData,
} from '@/hooks/useApi'
import type { MetricConfig } from '@/types'

function calculateMedian(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2
}

function calculateMode(values: number[]): number {
  if (values.length === 0) return 0
  const frequency: Record<string, number> = {}
  let maxFreq = 0
  let mode = values[0]
  values.forEach(value => {
    const key = value.toFixed(2)
    frequency[key] = (frequency[key] || 0) + 1
    if (frequency[key] > maxFreq) {
      maxFreq = frequency[key]
      mode = value
    }
  })
  return mode
}

const DEFAULT_METRICS: MetricConfig[] = [
  { key: 'priceLow', label: 'Price Low', color: '#22c55e', yAxisId: 'price', enabled: true },
  { key: 'priceHigh', label: 'Price High', color: '#ef4444', yAxisId: 'price', enabled: true },
  { key: 'weightedAverage', label: 'Weighted Avg', color: '#3b82f6', yAxisId: 'price', enabled: true },
  { key: 'trades', label: 'Trades', color: '#f59e0b', yAxisId: 'volume', enabled: false },
  { key: 'pounds', label: 'Volume (lbs)', color: '#8b5cf6', yAxisId: 'volume', enabled: false },
]

// Default selections
const DEFAULT_REPORT = '2457'
const DEFAULT_SECTION = 'Upper 2-3 Choice Items'

function getInitialStateFromURL() {
  const params = new URLSearchParams(window.location.search)
  const report = params.get('report')
  const section = params.get('section')
  const item = params.get('item')
  const start = params.get('start')
  const end = params.get('end')

  let startDate = subDays(new Date(), 30)
  let endDate = new Date()

  if (start) {
    try {
      startDate = parse(start, 'yyyy-MM-dd', new Date())
    } catch {
      // Use default
    }
  }
  if (end) {
    try {
      endDate = parse(end, 'yyyy-MM-dd', new Date())
    } catch {
      // Use default
    }
  }

  return {
    report: report || DEFAULT_REPORT,
    section: section || DEFAULT_SECTION,
    item: item || null,
    startDate,
    endDate,
  }
}

function updateURL(params: {
  report: string | null
  section: string | null
  item: string | null
  startDate: Date
  endDate: Date
}) {
  const url = new URL(window.location.href)

  if (params.report) {
    url.searchParams.set('report', params.report)
  } else {
    url.searchParams.delete('report')
  }

  if (params.section) {
    url.searchParams.set('section', params.section)
  } else {
    url.searchParams.delete('section')
  }

  if (params.item) {
    url.searchParams.set('item', params.item)
  } else {
    url.searchParams.delete('item')
  }

  url.searchParams.set('start', format(params.startDate, 'yyyy-MM-dd'))
  url.searchParams.set('end', format(params.endDate, 'yyyy-MM-dd'))

  window.history.replaceState({}, '', url.toString())
}

export default function App() {
  // Initialize state from URL
  const initial = getInitialStateFromURL()

  // Filter state
  const [selectedReport, setSelectedReport] = useState<string | null>(initial.report)
  const [selectedSection, setSelectedSection] = useState<string | null>(initial.section)
  const [selectedItem, setSelectedItem] = useState<string | null>(initial.item)
  const [startDate, setStartDate] = useState<Date>(initial.startDate)
  const [endDate, setEndDate] = useState<Date>(initial.endDate)

  // Chart metrics state
  const [metrics, setMetrics] = useState<MetricConfig[]>(DEFAULT_METRICS)

  // View mode: 'chart', 'report', or 'split'
  const [viewMode, setViewMode] = useState<'chart' | 'report' | 'split'>('report')

  // Analysis panel state
  const [showAnalysis, setShowAnalysis] = useState(false)

  // Update URL when state changes
  useEffect(() => {
    updateURL({
      report: selectedReport,
      section: selectedSection,
      item: selectedItem,
      startDate,
      endDate,
    })
  }, [selectedReport, selectedSection, selectedItem, startDate, endDate])

  // Data fetching
  const { data: manifest } = useManifest()
  const { data: reports = [], isLoading: reportsLoading } = useReports()
  const { data: sections = [], isLoading: sectionsLoading } = useSections(selectedReport)
  const { data: items = [], isLoading: itemsLoading } = useItemDescriptions(
    selectedReport,
    selectedSection
  )
  // Fetch full 2-year dataset for comparison support (no item filter - we filter client-side)
  // Use useMemo to prevent recreating the date object on every render
  const fullStartDate = useMemo(() => subDays(new Date(), 730), []) // 2 years back
  const fullEndDate = useMemo(() => new Date(), [])
  const { data: allPriceData, isLoading: priceLoading } = usePriceData(
    selectedReport,
    selectedSection,
    fullStartDate,
    fullEndDate,
    null // Don't filter by item in the query - do it client-side
  )

  // Filter data client-side by selected item (instant, no refetch)
  const priceData = useMemo(() => {
    if (!allPriceData) return null
    if (!selectedItem) return allPriceData

    const filteredRecords = allPriceData.records.filter(
      r => r.item_description === selectedItem
    )
    const filteredChartData = allPriceData.chartData.filter(
      (_, idx) => allPriceData.records[idx]?.item_description === selectedItem
    )

    // Recalculate summary for filtered data
    const prices = filteredRecords.map(r => r.weighted_average).filter(p => p > 0)
    const summary = {
      mean: prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : 0,
      median: calculateMedian(prices),
      min: prices.length > 0 ? Math.min(...prices) : 0,
      max: prices.length > 0 ? Math.max(...prices) : 0,
      mode: calculateMode(prices),
      total: filteredRecords.reduce((sum, r) => sum + r.total_pounds, 0),
    }

    return { chartData: filteredChartData, summary, records: filteredRecords }
  }, [allPriceData, selectedItem])

  // Handlers
  const handleReportChange = useCallback((reportId: string) => {
    setSelectedReport(reportId || null)
    setSelectedSection(null)
    setSelectedItem(null)
  }, [])

  const handleSectionChange = useCallback((sectionId: string) => {
    setSelectedSection(sectionId || null)
    setSelectedItem(null)
  }, [])

  const handleItemChange = useCallback((item: string) => {
    setSelectedItem(item || null)
  }, [])

  const handleToggleMetric = useCallback((key: string) => {
    setMetrics(prev => {
      const clickedMetric = prev.find(m => m.key === key)
      if (!clickedMetric) return prev

      const isEnabling = !clickedMetric.enabled
      const clickedAxisId = clickedMetric.yAxisId

      // Volume metrics (trades, pounds) are mutually exclusive with each other AND with price metrics
      const isVolumeMetric = clickedAxisId === 'volume'

      return prev.map(m => {
        if (m.key === key) {
          // Toggle the clicked metric
          return { ...m, enabled: !m.enabled }
        } else if (isEnabling) {
          if (m.yAxisId !== clickedAxisId) {
            // Disable metrics on the other axis (price vs volume)
            return { ...m, enabled: false }
          } else if (isVolumeMetric && m.yAxisId === 'volume') {
            // Volume metrics are mutually exclusive with each other (trades vs pounds)
            return { ...m, enabled: false }
          }
        }
        return m
      })
    })
  }, [])

  const isLoading = reportsLoading || sectionsLoading || itemsLoading
  const dataAsOf = manifest?.generatedAt
    ? format(new Date(manifest.generatedAt), 'MMM d, yyyy h:mm a')
    : null

  // Build a descriptive name for the current view (for favorites)
  const currentViewName = useMemo(() => {
    const parts: string[] = []
    if (selectedSection) parts.push(selectedSection)
    if (selectedItem) parts.push(selectedItem)
    return parts.join(' - ') || 'Untitled View'
  }, [selectedSection, selectedItem])

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <Header dataAsOf={dataAsOf} currentViewName={currentViewName} />

      <main className="px-4 py-6 flex-1 w-full">
        <FilterPanel
          reports={reports}
          sections={sections}
          items={items}
          selectedReport={selectedReport}
          selectedSection={selectedSection}
          selectedItem={selectedItem}
          startDate={startDate}
          endDate={endDate}
          onReportChange={handleReportChange}
          onSectionChange={handleSectionChange}
          onItemChange={handleItemChange}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
          isLoading={isLoading}
        />

        <SummaryStats
          summary={priceData?.summary ?? null}
          isLoading={priceLoading}
          onAnalyze={priceData?.chartData && priceData.chartData.length > 0 ? () => setShowAnalysis(true) : undefined}
        />

        {/* Mobile-only toggle between Chart and Report */}
        {selectedReport && selectedSection && priceData?.chartData && priceData.chartData.length > 0 && (
          <div className="lg:hidden flex justify-end mb-4">
            <div className="flex rounded-lg border border-gray-200 overflow-hidden">
              <button
                onClick={() => setViewMode('chart')}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  viewMode === 'chart'
                    ? 'bg-ranch-blue text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                Chart
              </button>
              <button
                onClick={() => setViewMode('report')}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  viewMode === 'report'
                    ? 'bg-ranch-blue text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                Report
              </button>
            </div>
          </div>
        )}

        {!selectedReport || !selectedSection ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <p className="text-gray-500 text-lg">
              Select a report and section to view price data
            </p>
          </div>
        ) : priceLoading && !priceData ? (
          <div className="bg-white rounded-lg shadow-md">
            <LoadingSpinner message="Loading price data..." />
          </div>
        ) : priceData?.chartData && priceData.chartData.length > 0 ? (
          <>
            {/* Desktop: Always split view */}
            <div className="hidden lg:grid lg:grid-cols-2 gap-4">
              <div className="h-[600px]">
                <ReportView
                  records={priceData.records}
                  allRecords={allPriceData?.records || []}
                  reportTitle={reports.find(r => r.slug_id === selectedReport)?.report_title || ''}
                  sectionName={selectedSection}
                  viewStartDate={startDate}
                  viewEndDate={endDate}
                  highlightedItem={selectedItem}
                />
              </div>
              <PriceChart
                data={priceData.chartData}
                metrics={metrics}
                onToggleMetric={handleToggleMetric}
                viewStartDate={startDate}
                viewEndDate={endDate}
              />
            </div>

            {/* Mobile: Toggle between chart and report */}
            <div className="lg:hidden">
              {viewMode === 'chart' ? (
                <PriceChart
                  data={priceData.chartData}
                  metrics={metrics}
                  onToggleMetric={handleToggleMetric}
                  viewStartDate={startDate}
                  viewEndDate={endDate}
                />
              ) : (
                <div className="h-[600px]">
                  <ReportView
                    records={priceData.records}
                    allRecords={allPriceData?.records || []}
                    reportTitle={reports.find(r => r.slug_id === selectedReport)?.report_title || ''}
                    sectionName={selectedSection}
                    viewStartDate={startDate}
                    viewEndDate={endDate}
                    highlightedItem={selectedItem}
                  />
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <p className="text-gray-500 text-lg">
              No data available for the selected filters
            </p>
          </div>
        )}

      </main>

      <footer className="bg-white border-t border-gray-200 mt-auto">
        <div className="max-w-7xl mx-auto px-4 py-4 text-center text-sm text-gray-500">
          Data sourced from{' '}
          <a
            href="https://mpr.datamart.ams.usda.gov/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-beef-red hover:underline"
          >
            USDA Market Price Reporting
          </a>
        </div>
      </footer>

      {/* Analysis Panel */}
      <AnalysisPanel
        isOpen={showAnalysis}
        onClose={() => setShowAnalysis(false)}
        records={priceData?.records ?? []}
        allRecords={allPriceData?.records ?? []}
        viewStartDate={startDate}
        viewEndDate={endDate}
        itemName={selectedItem}
        sectionName={selectedSection}
      />
    </div>
  )
}
