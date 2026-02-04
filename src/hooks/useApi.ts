import { useQuery } from '@tanstack/react-query'
import {
  fetchManifest,
  fetchReports,
  fetchSections,
  fetchItemDescriptions,
  fetchPriceData,
} from '@/services/staticApi'
import type { ChartDataPoint, PriceSummary } from '@/types'
import { format, parse } from 'date-fns'

export function useManifest() {
  return useQuery({
    queryKey: ['manifest'],
    queryFn: fetchManifest,
    staleTime: Infinity, // Static data never changes during session
  })
}

export function useReports() {
  return useQuery({
    queryKey: ['reports'],
    queryFn: fetchReports,
    staleTime: Infinity, // Static data never changes during session
  })
}

export function useSections(reportId: string | null) {
  return useQuery({
    queryKey: ['sections', reportId],
    queryFn: () => fetchSections(reportId!),
    enabled: !!reportId,
    staleTime: Infinity,
  })
}

export function useItemDescriptions(reportId: string | null, sectionId: string | null) {
  return useQuery({
    queryKey: ['items', reportId, sectionId],
    queryFn: () => fetchItemDescriptions(reportId!, sectionId!),
    enabled: !!reportId && !!sectionId,
    staleTime: Infinity,
  })
}

export function usePriceData(
  reportId: string | null,
  sectionId: string | null,
  startDate: Date | null,
  endDate: Date | null,
  itemDescription: string | null
) {
  return useQuery({
    queryKey: ['priceData', reportId, sectionId, startDate?.toISOString(), endDate?.toISOString(), itemDescription],
    queryFn: async () => {
      const data = await fetchPriceData(
        reportId!,
        sectionId!,
        startDate!,
        endDate!,
        itemDescription || undefined
      )

      // Transform to chart data
      const chartData: ChartDataPoint[] = data.map(record => {
        // Parse MM/DD/YYYY format from USDA API
        const parsedDate = parse(record.report_date, 'MM/dd/yyyy', new Date())
        return {
          date: record.report_date,
          displayDate: format(parsedDate, 'MMM d, yyyy'),
          priceLow: record.price_range_low,
          priceHigh: record.price_range_high,
          weightedAverage: record.weighted_average,
          trades: record.number_trades,
          pounds: record.total_pounds,
          itemDescription: record.item_description,
        }
      })

      // Calculate summary statistics
      const prices = data.map(r => r.weighted_average).filter(p => p > 0)
      const summary: PriceSummary = {
        mean: prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : 0,
        median: calculateMedian(prices),
        min: prices.length > 0 ? Math.min(...prices) : 0,
        max: prices.length > 0 ? Math.max(...prices) : 0,
        total: data.reduce((sum, r) => sum + r.total_pounds, 0),
      }

      return { chartData, summary, records: data }
    },
    enabled: !!reportId && !!sectionId && !!startDate && !!endDate,
    staleTime: Infinity, // Static data never changes during session
  })
}

function calculateMedian(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2
}
