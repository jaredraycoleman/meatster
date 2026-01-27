import { TrendingUp, TrendingDown, DollarSign, Scale } from 'lucide-react'
import type { PriceSummary } from '@/types'

interface SummaryStatsProps {
  summary: PriceSummary | null
  isLoading: boolean
}

export function SummaryStats({ summary, isLoading }: SummaryStatsProps) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Summary Statistics</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-16 mb-2"></div>
              <div className="h-6 bg-gray-200 rounded w-20"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (!summary) {
    return null
  }

  const stats = [
    {
      label: 'Mean Price',
      value: `$${summary.mean.toFixed(2)}`,
      icon: DollarSign,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      label: 'Median Price',
      value: `$${summary.median.toFixed(2)}`,
      icon: DollarSign,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      label: 'Min Price',
      value: `$${summary.min.toFixed(2)}`,
      icon: TrendingDown,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      label: 'Max Price',
      value: `$${summary.max.toFixed(2)}`,
      icon: TrendingUp,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
    },
    {
      label: 'Mode Price',
      value: `$${summary.mode.toFixed(2)}`,
      icon: DollarSign,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
    },
    {
      label: 'Total Volume',
      value: formatVolume(summary.total),
      icon: Scale,
      color: 'text-gray-600',
      bgColor: 'bg-gray-50',
    },
  ]

  return (
    <div className="bg-white rounded-lg shadow-md p-4 mb-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Summary Statistics</h3>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {stats.map(stat => (
          <div
            key={stat.label}
            className={`${stat.bgColor} rounded-lg p-3 transition-transform hover:scale-105`}
          >
            <div className="flex items-center gap-2 mb-1">
              <stat.icon className={`w-4 h-4 ${stat.color}`} />
              <span className="text-xs text-gray-600">{stat.label}</span>
            </div>
            <p className={`text-lg font-bold ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function formatVolume(value: number): string {
  if (value >= 1000000000) {
    return `${(value / 1000000000).toFixed(2)}B lbs`
  }
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(2)}M lbs`
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K lbs`
  }
  return `${value.toFixed(0)} lbs`
}
