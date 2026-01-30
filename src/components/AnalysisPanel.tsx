import { useMemo, useState } from 'react'
import {
  X,
  TrendingUp,
  TrendingDown,
  Minus,
  BarChart3,
  Calendar,
  Target,
  Activity,
  ArrowUpDown,
} from 'lucide-react'
import {
  analyzeTrend,
  analyzeVolatility,
  analyzePercentile,
  compareYoY,
  analyzeSeasonalPatterns,
  calculateSupportResistance,
  calculateMovingAverages,
  analyzeDayOfWeekPatterns,
} from '@/utils/analysis'
import type { PriceRecord } from '@/types'

interface AnalysisPanelProps {
  isOpen: boolean
  onClose: () => void
  records: PriceRecord[]
  allRecords: PriceRecord[] // Full 2-year dataset for historical analysis
  viewStartDate: Date
  viewEndDate: Date
  itemName: string | null
  sectionName: string | null
}

type TabId = 'overview' | 'trends' | 'comparison' | 'timing'

export function AnalysisPanel({
  isOpen,
  onClose,
  records,
  allRecords,
  viewStartDate,
  viewEndDate,
  itemName,
  sectionName,
}: AnalysisPanelProps) {
  const [activeTab, setActiveTab] = useState<TabId>('overview')

  // Prepare price data
  const priceData = useMemo(() => {
    const viewPrices = records
      .filter(r => r.weighted_average > 0)
      .map(r => r.weighted_average)

    const allPricesWithDates = allRecords
      .filter(r => r.weighted_average > 0)
      .map(r => ({
        date: new Date(r.report_date),
        price: r.weighted_average,
      }))
      .sort((a, b) => a.date.getTime() - b.date.getTime())

    const allPrices = allPricesWithDates.map(p => p.price)
    const currentPrice = viewPrices.length > 0 ? viewPrices[viewPrices.length - 1] : 0

    return { viewPrices, allPrices, allPricesWithDates, currentPrice }
  }, [records, allRecords])

  // Run analyses
  const analyses = useMemo(() => {
    const { viewPrices, allPrices, allPricesWithDates, currentPrice } = priceData

    return {
      trend: analyzeTrend(viewPrices),
      volatility: analyzeVolatility(viewPrices),
      percentile: analyzePercentile(allPrices, currentPrice),
      yoy: compareYoY(allPricesWithDates, viewStartDate, viewEndDate),
      seasonal: analyzeSeasonalPatterns(allPricesWithDates),
      supportResistance: calculateSupportResistance(allPrices),
      movingAverages: calculateMovingAverages(viewPrices),
      dayOfWeek: analyzeDayOfWeekPatterns(allPricesWithDates),
      currentPrice,
    }
  }, [priceData, viewStartDate, viewEndDate])

  if (!isOpen) return null

  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Overview', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'trends', label: 'Trends', icon: <Activity className="w-4 h-4" /> },
    { id: 'comparison', label: 'Comparison', icon: <ArrowUpDown className="w-4 h-4" /> },
    { id: 'timing', label: 'Timing', icon: <Calendar className="w-4 h-4" /> },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 bg-gradient-to-r from-ranch-blue to-ranch-light text-white">
          <div>
            <h2 className="text-lg sm:text-xl font-bold">Price Analysis</h2>
            <p className="text-xs sm:text-sm text-blue-200 truncate max-w-[200px] sm:max-w-none">
              {itemName || sectionName || 'Selected Data'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex overflow-x-auto border-b border-gray-200 bg-gray-50">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1 sm:gap-2 px-3 sm:px-6 py-3 text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0 ${
                activeTab === tab.id
                  ? 'text-ranch-blue border-b-2 border-ranch-blue bg-white'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              {tab.icon}
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6">
          {activeTab === 'overview' && (
            <OverviewTab analyses={analyses} />
          )}
          {activeTab === 'trends' && (
            <TrendsTab analyses={analyses} />
          )}
          {activeTab === 'comparison' && (
            <ComparisonTab analyses={analyses} />
          )}
          {activeTab === 'timing' && (
            <TimingTab analyses={analyses} />
          )}
        </div>
      </div>
    </div>
  )
}

// Overview Tab
function OverviewTab({ analyses }: { analyses: AnalysesResult }) {
  const { trend, volatility, percentile, currentPrice, supportResistance } = analyses

  return (
    <div className="space-y-3 sm:space-y-6">
      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
        {/* Current Price */}
        <MetricCard
          title="Current Price"
          value={`$${currentPrice.toFixed(2)}`}
          subtitle="Most recent"
          icon={<Target className="w-4 h-4 sm:w-5 sm:h-5" />}
          color="blue"
        />

        {/* Trend */}
        <MetricCard
          title="Trend"
          value={`${trend.changePercent >= 0 ? '+' : ''}${trend.changePercent.toFixed(1)}%`}
          subtitle={trend.direction === 'up' ? 'Up' : trend.direction === 'down' ? 'Down' : 'Stable'}
          icon={
            trend.direction === 'up' ? <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" /> :
            trend.direction === 'down' ? <TrendingDown className="w-4 h-4 sm:w-5 sm:h-5" /> :
            <Minus className="w-4 h-4 sm:w-5 sm:h-5" />
          }
          color={trend.direction === 'up' ? 'red' : trend.direction === 'down' ? 'green' : 'gray'}
        />

        {/* Percentile */}
        <MetricCard
          title="Percentile"
          value={`${percentile.currentPercentile.toFixed(0)}th`}
          subtitle="vs 2yr"
          icon={<BarChart3 className="w-4 h-4 sm:w-5 sm:h-5" />}
          color={percentile.currentPercentile <= 40 ? 'green' : percentile.currentPercentile >= 70 ? 'red' : 'yellow'}
        />

        {/* Volatility */}
        <MetricCard
          title="Volatility"
          value={volatility.level.charAt(0).toUpperCase() + volatility.level.slice(1)}
          subtitle={`CV: ${volatility.coefficientOfVariation.toFixed(1)}%`}
          icon={<Activity className="w-4 h-4 sm:w-5 sm:h-5" />}
          color={volatility.level === 'low' ? 'green' : volatility.level === 'high' ? 'red' : 'yellow'}
        />
      </div>

      {/* Interpretation */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4">
        <h3 className="font-semibold text-blue-900 mb-1 sm:mb-2 text-sm sm:text-base">Market Insight</h3>
        <p className="text-blue-800 text-xs sm:text-sm">{percentile.interpretation}</p>
      </div>

      {/* Support/Resistance - hidden on mobile */}
      {supportResistance && (
        <div className="hidden sm:block bg-gray-50 rounded-lg p-4">
          <h3 className="font-semibold text-gray-900 mb-3">Support & Resistance Levels</h3>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-green-600 font-medium">Support: ${supportResistance.support.toFixed(2)}</span>
                <span className="text-red-600 font-medium">Resistance: ${supportResistance.resistance.toFixed(2)}</span>
              </div>
              <div className="relative h-3 bg-gray-200 rounded-full">
                <div
                  className="absolute top-0 bottom-0 left-0 bg-green-500 rounded-l-full"
                  style={{ width: '10%' }}
                />
                <div
                  className="absolute top-0 bottom-0 right-0 bg-red-500 rounded-r-full"
                  style={{ width: '10%' }}
                />
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-blue-600 rounded-full border-2 border-white shadow"
                  style={{
                    left: `${Math.min(100, Math.max(0, ((supportResistance.currentPrice - supportResistance.support) / (supportResistance.resistance - supportResistance.support)) * 100))}%`,
                    transform: 'translate(-50%, -50%)',
                  }}
                />
              </div>
              <div className="text-center text-sm text-gray-600 mt-1">
                Current: ${supportResistance.currentPrice.toFixed(2)}
                {supportResistance.nearSupport && (
                  <span className="ml-2 text-green-600 font-medium">(Near Support)</span>
                )}
                {supportResistance.nearResistance && (
                  <span className="ml-2 text-red-600 font-medium">(Near Resistance)</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Trends Tab
function TrendsTab({ analyses }: { analyses: AnalysesResult }) {
  const { trend, movingAverages, currentPrice } = analyses

  return (
    <div className="space-y-3 sm:space-y-6">
      {/* Trend Direction */}
      <div className={`rounded-lg p-3 sm:p-6 ${
        trend.direction === 'up' ? 'bg-red-50 border border-red-200' :
        trend.direction === 'down' ? 'bg-green-50 border border-green-200' :
        'bg-gray-50 border border-gray-200'
      }`}>
        <div className="flex items-center gap-3 sm:gap-4">
          <div className={`p-2 sm:p-3 rounded-full ${
            trend.direction === 'up' ? 'bg-red-100' :
            trend.direction === 'down' ? 'bg-green-100' :
            'bg-gray-100'
          }`}>
            {trend.direction === 'up' ? <TrendingUp className="w-5 h-5 sm:w-8 sm:h-8 text-red-600" /> :
             trend.direction === 'down' ? <TrendingDown className="w-5 h-5 sm:w-8 sm:h-8 text-green-600" /> :
             <Minus className="w-5 h-5 sm:w-8 sm:h-8 text-gray-600" />}
          </div>
          <div>
            <h3 className="text-base sm:text-xl font-bold text-gray-900">
              {trend.direction === 'up' ? 'Prices Rising' :
               trend.direction === 'down' ? 'Prices Falling' :
               'Prices Stable'}
            </h3>
            <p className="text-xs sm:text-base text-gray-600">
              {trend.changePercent >= 0 ? '+' : ''}{trend.changePercent.toFixed(2)}% change
            </p>
          </div>
        </div>
      </div>

      {/* Moving Averages */}
      <div className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4">
        <h3 className="font-semibold text-gray-900 mb-2 sm:mb-4 text-sm sm:text-base">Moving Averages</h3>
        <div className="space-y-2 sm:space-y-3">
          <MovingAverageRow
            label="7-Day"
            value={movingAverages.ma7}
            currentPrice={currentPrice}
          />
          <MovingAverageRow
            label="30-Day"
            value={movingAverages.ma30}
            currentPrice={currentPrice}
          />
          <MovingAverageRow
            label="90-Day"
            value={movingAverages.ma90}
            currentPrice={currentPrice}
          />
        </div>
      </div>

      {/* Trading Signals - hidden on mobile */}
      <div className="hidden sm:block bg-white border border-gray-200 rounded-lg p-4">
        <h3 className="font-semibold text-gray-900 mb-3">Trading Signals</h3>
        <div className="space-y-2">
          {movingAverages.ma7 && movingAverages.ma30 && (
            <SignalRow
              signal={currentPrice > movingAverages.ma7 ? 'bullish' : 'bearish'}
              description={`Price ${currentPrice > movingAverages.ma7 ? 'above' : 'below'} 7-day MA`}
            />
          )}
          {movingAverages.ma7 && movingAverages.ma30 && (
            <SignalRow
              signal={movingAverages.ma7 > movingAverages.ma30 ? 'bullish' : 'bearish'}
              description={`7-day MA ${movingAverages.ma7 > movingAverages.ma30 ? 'above' : 'below'} 30-day MA`}
            />
          )}
          {movingAverages.ma30 && movingAverages.ma90 && (
            <SignalRow
              signal={movingAverages.ma30 > movingAverages.ma90 ? 'bullish' : 'bearish'}
              description={`30-day MA ${movingAverages.ma30 > movingAverages.ma90 ? 'above' : 'below'} 90-day MA`}
            />
          )}
        </div>
      </div>
    </div>
  )
}

// Comparison Tab
function ComparisonTab({ analyses }: { analyses: AnalysesResult }) {
  const { yoy, seasonal } = analyses

  return (
    <div className="space-y-3 sm:space-y-6">
      {/* Year-over-Year */}
      {yoy ? (
        <div className={`rounded-lg p-3 sm:p-6 ${
          yoy.changePercent < 0 ? 'bg-green-50 border border-green-200' :
          yoy.changePercent > 0 ? 'bg-red-50 border border-red-200' :
          'bg-gray-50 border border-gray-200'
        }`}>
          <h3 className="font-semibold text-gray-900 mb-2 sm:mb-4 text-sm sm:text-base">Year-over-Year</h3>
          <div className="grid grid-cols-3 gap-2 sm:gap-4 text-center">
            <div>
              <p className="text-xs sm:text-sm text-gray-600">Last Year</p>
              <p className="text-lg sm:text-2xl font-bold text-gray-900">${yoy.lastYearAvg.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs sm:text-sm text-gray-600">Change</p>
              <p className={`text-lg sm:text-2xl font-bold ${yoy.changePercent < 0 ? 'text-green-600' : 'text-red-600'}`}>
                {yoy.changePercent >= 0 ? '+' : ''}{yoy.changePercent.toFixed(1)}%
              </p>
            </div>
            <div>
              <p className="text-xs sm:text-sm text-gray-600">Current</p>
              <p className="text-lg sm:text-2xl font-bold text-gray-900">${yoy.currentAvg.toFixed(2)}</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-gray-50 rounded-lg p-3 sm:p-6 text-center text-gray-500 text-sm">
          Not enough historical data
        </div>
      )}

      {/* Seasonal Patterns */}
      {seasonal && (
        <div className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4">
          <h3 className="font-semibold text-gray-900 mb-2 sm:mb-4 text-sm sm:text-base">Seasonal Patterns</h3>
          <div className="grid grid-cols-2 gap-2 sm:gap-4">
            <div className="bg-green-50 rounded-lg p-2 sm:p-3 text-center">
              <p className="text-xs sm:text-sm text-gray-600">Best Month</p>
              <p className="text-base sm:text-lg font-bold text-green-700">{seasonal.bestMonth.slice(0, 3)}</p>
            </div>
            <div className="bg-red-50 rounded-lg p-2 sm:p-3 text-center">
              <p className="text-xs sm:text-sm text-gray-600">Worst Month</p>
              <p className="text-base sm:text-lg font-bold text-red-700">{seasonal.worstMonth.slice(0, 3)}</p>
            </div>
          </div>

          {/* Monthly Chart - hidden on mobile */}
          <div className="hidden sm:block space-y-2 mt-4">
            {seasonal.monthlyAverages.map((m: { month: string; avg: number }) => {
              const maxAvg = Math.max(...seasonal.monthlyAverages.map((x: { avg: number }) => x.avg))
              const minAvg = Math.min(...seasonal.monthlyAverages.map((x: { avg: number }) => x.avg))
              const range = maxAvg - minAvg
              const width = range > 0 ? ((m.avg - minAvg) / range) * 100 : 50
              const isCurrentMonth = new Date().toLocaleString('en-US', { month: 'long' }) === m.month

              return (
                <div key={m.month} className="flex items-center gap-2">
                  <span className={`w-24 text-sm ${isCurrentMonth ? 'font-bold text-ranch-blue' : 'text-gray-600'}`}>
                    {m.month.slice(0, 3)}
                  </span>
                  <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        m.month === seasonal.bestMonth ? 'bg-green-500' :
                        m.month === seasonal.worstMonth ? 'bg-red-500' :
                        isCurrentMonth ? 'bg-blue-500' :
                        'bg-gray-400'
                      }`}
                      style={{ width: `${Math.max(5, width)}%` }}
                    />
                  </div>
                  <span className="w-20 text-sm text-right text-gray-700">${m.avg.toFixed(2)}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// Timing Tab
function TimingTab({ analyses }: { analyses: AnalysesResult }) {
  const { dayOfWeek, percentile, supportResistance, volatility } = analyses

  // Find best day (lowest average price)
  const sortedDays = [...dayOfWeek].sort((a, b) => a.avg - b.avg)
  const bestDay = sortedDays[0]
  const worstDay = sortedDays[sortedDays.length - 1]

  return (
    <div className="space-y-3 sm:space-y-6">
      {/* Buying Recommendation */}
      <div className={`rounded-lg p-3 sm:p-6 ${
        percentile.currentPercentile <= 30 ? 'bg-green-50 border border-green-200' :
        percentile.currentPercentile >= 70 ? 'bg-red-50 border border-red-200' :
        'bg-yellow-50 border border-yellow-200'
      }`}>
        <h3 className="font-semibold text-gray-900 mb-1 sm:mb-2 text-sm sm:text-base">Buying Recommendation</h3>
        <p className={`text-base sm:text-lg font-bold ${
          percentile.currentPercentile <= 30 ? 'text-green-700' :
          percentile.currentPercentile >= 70 ? 'text-red-700' :
          'text-yellow-700'
        }`}>
          {percentile.currentPercentile <= 20 ? 'Strong Buy' :
           percentile.currentPercentile <= 40 ? 'Buy - Good Value' :
           percentile.currentPercentile <= 60 ? 'Hold - Fair Price' :
           percentile.currentPercentile <= 80 ? 'Wait' :
           'Caution - Near Highs'}
        </p>
        <p className="text-gray-600 mt-1 text-xs sm:text-sm">{percentile.interpretation}</p>
      </div>

      {/* Day of Week Patterns */}
      {dayOfWeek.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4">
          <h3 className="font-semibold text-gray-900 mb-2 sm:mb-4 text-sm sm:text-base">Day of Week Patterns</h3>
          <div className="grid grid-cols-2 gap-2 sm:gap-4 mb-3 sm:mb-4">
            <div className="bg-green-50 rounded-lg p-2 sm:p-3 text-center">
              <p className="text-xs sm:text-sm text-gray-600">Best Day</p>
              <p className="text-base sm:text-lg font-bold text-green-700">{bestDay?.day.slice(0, 3)}</p>
              <p className="text-xs text-gray-500">${bestDay?.avg.toFixed(2)}</p>
            </div>
            <div className="bg-red-50 rounded-lg p-2 sm:p-3 text-center">
              <p className="text-xs sm:text-sm text-gray-600">Worst Day</p>
              <p className="text-base sm:text-lg font-bold text-red-700">{worstDay?.day.slice(0, 3)}</p>
              <p className="text-xs text-gray-500">${worstDay?.avg.toFixed(2)}</p>
            </div>
          </div>

          {/* Day-of-week chart - hidden on mobile */}
          <div className="hidden sm:block space-y-2">
            {dayOfWeek.map((d: { day: string; avg: number; count: number }) => {
              const maxAvg = Math.max(...dayOfWeek.map((x: { avg: number }) => x.avg))
              const minAvg = Math.min(...dayOfWeek.map((x: { avg: number }) => x.avg))
              const range = maxAvg - minAvg
              const width = range > 0 ? ((d.avg - minAvg) / range) * 100 : 50

              return (
                <div key={d.day} className="flex items-center gap-2">
                  <span className="w-24 text-sm text-gray-600">{d.day.slice(0, 3)}</span>
                  <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        d.day === bestDay?.day ? 'bg-green-500' :
                        d.day === worstDay?.day ? 'bg-red-500' :
                        'bg-gray-400'
                      }`}
                      style={{ width: `${Math.max(5, width)}%` }}
                    />
                  </div>
                  <span className="w-20 text-sm text-right text-gray-700">${d.avg.toFixed(2)}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Market Conditions Summary */}
      <div className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4">
        <h3 className="font-semibold text-gray-900 mb-2 sm:mb-3 text-sm sm:text-base">Market Conditions</h3>
        <div className="space-y-1 sm:space-y-2">
          <ConditionRow
            label="Price Level"
            value={
              percentile.currentPercentile <= 30 ? 'Low' :
              percentile.currentPercentile >= 70 ? 'High' : 'Avg'
            }
            status={percentile.currentPercentile <= 40 ? 'good' : percentile.currentPercentile >= 70 ? 'bad' : 'neutral'}
          />
          <ConditionRow
            label="Volatility"
            value={volatility.level.charAt(0).toUpperCase() + volatility.level.slice(1)}
            status={volatility.level === 'low' ? 'good' : volatility.level === 'high' ? 'bad' : 'neutral'}
          />
          {/* Support/Resistance - hidden on mobile */}
          {supportResistance && (
            <div className="hidden sm:block">
              <ConditionRow
                label="Near Support"
                value={supportResistance.nearSupport ? 'Yes' : 'No'}
                status={supportResistance.nearSupport ? 'good' : 'neutral'}
              />
              <ConditionRow
                label="Near Resistance"
                value={supportResistance.nearResistance ? 'Yes' : 'No'}
                status={supportResistance.nearResistance ? 'bad' : 'neutral'}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Helper Components
function MetricCard({
  title,
  value,
  subtitle,
  icon,
  color,
}: {
  title: string
  value: string
  subtitle: string
  icon: React.ReactNode
  color: 'blue' | 'green' | 'red' | 'yellow' | 'gray'
}) {
  const colors = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    red: 'bg-red-50 text-red-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    gray: 'bg-gray-50 text-gray-600',
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-2 sm:p-4">
      <div className="flex items-center gap-1 sm:gap-2 mb-1 sm:mb-2">
        <div className={`p-1 sm:p-2 rounded-lg ${colors[color]}`}>{icon}</div>
        <span className="text-xs sm:text-sm font-medium text-gray-600">{title}</span>
      </div>
      <p className="text-lg sm:text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-xs sm:text-sm text-gray-500">{subtitle}</p>
    </div>
  )
}

function MovingAverageRow({
  label,
  value,
  currentPrice,
}: {
  label: string
  value: number | null
  currentPrice: number
}) {
  if (value === null) {
    return (
      <div className="flex items-center justify-between py-2 border-b border-gray-100">
        <span className="text-gray-600">{label}</span>
        <span className="text-gray-400">Not enough data</span>
      </div>
    )
  }

  const diff = currentPrice - value
  const diffPercent = (diff / value) * 100

  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-100">
      <span className="text-gray-600">{label}</span>
      <div className="text-right">
        <span className="font-medium text-gray-900">${value.toFixed(2)}</span>
        <span className={`ml-2 text-sm ${diff >= 0 ? 'text-red-600' : 'text-green-600'}`}>
          ({diff >= 0 ? '+' : ''}{diffPercent.toFixed(1)}%)
        </span>
      </div>
    </div>
  )
}

function SignalRow({
  signal,
  description,
}: {
  signal: 'bullish' | 'bearish'
  description: string
}) {
  return (
    <div className="flex items-center gap-2 py-1">
      <div className={`w-2 h-2 rounded-full ${signal === 'bullish' ? 'bg-red-500' : 'bg-green-500'}`} />
      <span className="text-sm text-gray-700">{description}</span>
      <span className={`text-xs font-medium ml-auto ${
        signal === 'bullish' ? 'text-red-600' : 'text-green-600'
      }`}>
        {signal === 'bullish' ? 'Rising' : 'Falling'}
      </span>
    </div>
  )
}

function ConditionRow({
  label,
  value,
  status,
}: {
  label: string
  value: string
  status: 'good' | 'bad' | 'neutral'
}) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-100">
      <span className="text-gray-600">{label}</span>
      <span className={`font-medium ${
        status === 'good' ? 'text-green-600' :
        status === 'bad' ? 'text-red-600' :
        'text-gray-600'
      }`}>
        {value}
      </span>
    </div>
  )
}

// Type helper for analyses object
interface AnalysesResult {
  trend: ReturnType<typeof analyzeTrend>
  volatility: ReturnType<typeof analyzeVolatility>
  percentile: ReturnType<typeof analyzePercentile>
  yoy: ReturnType<typeof compareYoY>
  seasonal: ReturnType<typeof analyzeSeasonalPatterns>
  supportResistance: ReturnType<typeof calculateSupportResistance>
  movingAverages: ReturnType<typeof calculateMovingAverages>
  dayOfWeek: ReturnType<typeof analyzeDayOfWeekPatterns>
  currentPrice: number
}
