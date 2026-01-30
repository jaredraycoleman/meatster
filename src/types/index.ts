export interface Report {
  slug_id: string
  slug_name: string
  report_title: string
}

export interface Section {
  slug_id: string
  slug_name: string
}

export interface PriceRecord {
  report_date: string
  item_description: string
  number_trades: number
  total_pounds: number
  price_range_low: number
  price_range_high: number
  weighted_average: number
}

export interface PriceSummary {
  mean: number
  median: number
  min: number
  max: number
  mode: number
  total: number
}

export interface FilterState {
  reportId: string
  sectionId: string
  itemDescription: string
  startDate: Date
  endDate: Date
}

export interface ChartDataPoint {
  date: string
  displayDate: string
  priceLow: number
  priceHigh: number
  weightedAverage: number
  trades: number
  pounds: number
  itemDescription?: string
}

export type MetricKey = 'priceLow' | 'priceHigh' | 'weightedAverage' | 'trades' | 'pounds'

export interface MetricConfig {
  key: MetricKey
  label: string
  color: string
  yAxisId: 'price' | 'volume'
  enabled: boolean
}

export interface DataManifest {
  generatedAt: string
  dataStartDate: string
  dataEndDate: string
  reports: ManifestReport[]
}

export interface ManifestReport {
  slug_id: number
  slug_name: string
  report_title: string
  sections: string[]
}
