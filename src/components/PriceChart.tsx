import { useState, useMemo } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { parse } from 'date-fns'
import type { ChartDataPoint, MetricConfig } from '@/types'

function parseDate(dateStr: string): Date {
  return parse(dateStr, 'MM/dd/yyyy', new Date())
}

type ComparisonPeriod = '1m' | '1y'

interface PriceChartProps {
  data: ChartDataPoint[]
  metrics: MetricConfig[]
  onToggleMetric: (key: string) => void
  viewStartDate: Date
  viewEndDate: Date
  isAggregated?: boolean
}

interface MergedDataPoint {
  index: number
  currentDate: string
  comparisonDate: string
  priceLow?: number
  priceHigh?: number
  weightedAverage?: number
  trades?: number
  pounds?: number
  priceLow_prev?: number
  priceHigh_prev?: number
  weightedAverage_prev?: number
  trades_prev?: number
  pounds_prev?: number
}

export function PriceChart({ data, metrics, onToggleMetric, viewStartDate, viewEndDate, isAggregated = false }: PriceChartProps) {
  const [comparisonPeriod, setComparisonPeriod] = useState<ComparisonPeriod>('1y')

  const enabledMetrics = metrics.filter(m => m.enabled)
  const hasPriceMetric = enabledMetrics.some(m => m.yAxisId === 'price')
  const hasVolumeMetric = enabledMetrics.some(m => m.yAxisId === 'volume')

  // Merge current and comparison data for overlay
  const mergedData = useMemo(() => {
    if (data.length === 0) return []

    const offsetMs = comparisonPeriod === '1m' ? 30 * 24 * 60 * 60 * 1000 : 365 * 24 * 60 * 60 * 1000

    // Sort all data by date
    const sortedData = [...data].sort(
      (a, b) => parseDate(a.date).getTime() - parseDate(b.date).getTime()
    )

    // Filter to current viewing period
    const viewStart = viewStartDate.getTime()
    const viewEnd = viewEndDate.getTime()
    const currentData = sortedData.filter(d => {
      const t = parseDate(d.date).getTime()
      return t >= viewStart && t <= viewEnd
    })

    // Get comparison period (same duration, offset back)
    const comparisonStart = viewStart - offsetMs
    const comparisonEnd = viewEnd - offsetMs
    const comparisonData = sortedData.filter(d => {
      const t = parseDate(d.date).getTime()
      return t >= comparisonStart && t <= comparisonEnd
    })

    // Merge by finding nearest date in comparison data for each current data point
    // Also match by item description when viewing multiple items
    const merged: MergedDataPoint[] = []

    for (let i = 0; i < currentData.length; i++) {
      const curr = currentData[i]
      const currTime = parseDate(curr.date).getTime()
      const targetComparisonTime = currTime - offsetMs

      // Filter comparison data to same item if item descriptions exist
      const candidateComparisons = curr.itemDescription
        ? comparisonData.filter(c => c.itemDescription === curr.itemDescription)
        : comparisonData

      // Find the comparison data point with the nearest date to the target
      let nearestComp: ChartDataPoint | undefined
      let nearestDistance = Infinity

      for (const comp of candidateComparisons) {
        const compTime = parseDate(comp.date).getTime()
        const distance = Math.abs(compTime - targetComparisonTime)
        if (distance < nearestDistance) {
          nearestDistance = distance
          nearestComp = comp
        }
      }

      merged.push({
        index: i,
        currentDate: curr.displayDate,
        comparisonDate: nearestComp?.displayDate || '',
        priceLow: curr.priceLow,
        priceHigh: curr.priceHigh,
        weightedAverage: curr.weightedAverage,
        trades: curr.trades,
        pounds: curr.pounds,
        priceLow_prev: nearestComp?.priceLow,
        priceHigh_prev: nearestComp?.priceHigh,
        weightedAverage_prev: nearestComp?.weightedAverage,
        trades_prev: nearestComp?.trades,
        pounds_prev: nearestComp?.pounds,
      })
    }

    return merged
  }, [data, comparisonPeriod, viewStartDate, viewEndDate])

  const comparisonLabel = comparisonPeriod === '1m' ? '1 month ago' : '1 year ago'

  const getComparisonColor = (color: string) => {
    return color + '80'
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <div className="flex flex-wrap gap-2">
          {metrics.map(metric => (
            <button
              key={metric.key}
              onClick={() => onToggleMetric(metric.key)}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                metric.enabled
                  ? 'text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              style={metric.enabled ? { backgroundColor: metric.color } : undefined}
            >
              {metric.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Compare to:</span>
          <div className="flex rounded-lg border border-gray-200 overflow-hidden">
            <button
              onClick={() => setComparisonPeriod('1m')}
              className={`px-3 py-1 text-sm font-medium transition-colors ${
                comparisonPeriod === '1m'
                  ? 'bg-ranch-blue text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              1 Month
            </button>
            <button
              onClick={() => setComparisonPeriod('1y')}
              className={`px-3 py-1 text-sm font-medium transition-colors ${
                comparisonPeriod === '1y'
                  ? 'bg-ranch-blue text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              1 Year
            </button>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mb-2 text-xs text-gray-500">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <div className="w-6 h-0.5 bg-gray-800" />
            <span>Current</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-6 h-0.5" style={{ borderTop: '2px dashed #9ca3af' }} />
            <span>{comparisonLabel}</span>
          </div>
        </div>
        {isAggregated && (
          <span className="text-amber-600 font-medium">Averaged across all items</span>
        )}
      </div>

      <div className="h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={mergedData}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="currentDate"
              tick={{ fontSize: 11 }}
              tickMargin={10}
              interval="preserveStartEnd"
            />
            {hasPriceMetric && (
              <YAxis
                yAxisId="price"
                orientation="left"
                tick={{ fontSize: 12 }}
                tickFormatter={value => `$${value.toFixed(0)}`}
                label={{
                  value: 'Price ($/cwt)',
                  angle: -90,
                  position: 'insideLeft',
                  style: { textAnchor: 'middle', fontSize: 12 },
                }}
              />
            )}
            {hasVolumeMetric && (
              <YAxis
                yAxisId="volume"
                orientation="right"
                tick={{ fontSize: 12 }}
                tickFormatter={value => formatNumber(value)}
                label={{
                  value: 'Volume',
                  angle: 90,
                  position: 'insideRight',
                  style: { textAnchor: 'middle', fontSize: 12 },
                }}
              />
            )}
            <Tooltip content={<CustomTooltip comparisonLabel={comparisonLabel} />} />
            <Legend
              formatter={(value) => {
                if (value.endsWith(' (prev)')) {
                  return <span className="text-gray-400">{value.replace(' (prev)', ` ${comparisonLabel}`)}</span>
                }
                return value
              }}
            />

            {enabledMetrics.map(metric => (
              <Line
                key={metric.key}
                type="monotone"
                dataKey={metric.key}
                name={metric.label}
                stroke={metric.color}
                yAxisId={metric.yAxisId}
                dot={false}
                strokeWidth={2}
                connectNulls
                isAnimationActive={false}
              />
            ))}

            {enabledMetrics.map(metric => (
              <Line
                key={`${metric.key}_prev`}
                type="monotone"
                dataKey={`${metric.key}_prev`}
                name={`${metric.label} (prev)`}
                stroke={getComparisonColor(metric.color)}
                yAxisId={metric.yAxisId}
                dot={false}
                strokeWidth={2}
                strokeDasharray="5 5"
                connectNulls
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

interface TooltipProps {
  active?: boolean
  payload?: Array<{
    name: string
    value: number
    color: string
    dataKey: string
    payload?: MergedDataPoint
  }>
  label?: string
  comparisonLabel: string
}

function CustomTooltip({ active, payload, label, comparisonLabel }: TooltipProps) {
  if (!active || !payload || payload.length === 0) {
    return null
  }

  const currentValues = payload.filter(p => !p.dataKey.endsWith('_prev'))
  const comparisonValues = payload.filter(p => p.dataKey.endsWith('_prev'))
  const dataPoint = payload[0]?.payload
  const comparisonDate = dataPoint?.comparisonDate

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 min-w-[200px]">
      <div className="space-y-3">
        {currentValues.length > 0 && (
          <div>
            <p className="font-medium text-gray-900 mb-1 text-sm">{label}</p>
            <div className="space-y-1">
              {currentValues.map((entry, index) => (
                <div key={index} className="flex items-center justify-between gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: entry.color }}
                    />
                    <span className="text-gray-600">{entry.name}</span>
                  </div>
                  <span className="font-medium">
                    {formatTooltipValue(entry.dataKey, entry.value)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {comparisonValues.length > 0 && comparisonDate && (
          <div className="border-t border-gray-100 pt-2">
            <p className="font-medium text-gray-500 mb-1 text-sm">{comparisonDate} ({comparisonLabel})</p>
            <div className="space-y-1">
              {comparisonValues.map((entry, index) => (
                <div key={index} className="flex items-center justify-between gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full opacity-50"
                      style={{ backgroundColor: entry.color }}
                    />
                    <span className="text-gray-400">{entry.name.replace(' (prev)', '')}</span>
                  </div>
                  <span className="font-medium text-gray-500">
                    {formatTooltipValue(entry.dataKey.replace('_prev', ''), entry.value)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function formatTooltipValue(dataKey: string, value: number): string {
  if (['priceLow', 'priceHigh', 'weightedAverage'].includes(dataKey)) {
    return `$${value.toFixed(2)}`
  }
  if (dataKey === 'pounds') {
    return `${formatNumber(value)} lbs`
  }
  return formatNumber(value)
}

function formatNumber(value: number): string {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`
  }
  return value.toFixed(0)
}
