import { parse } from 'date-fns'
import type { Report, Section, PriceRecord, DataManifest } from '@/types'

const DATA_BASE = '/data'

// Cache for loaded data
const cache = new Map<string, unknown>()

async function fetchJson<T>(path: string): Promise<T> {
  const cached = cache.get(path)
  if (cached) return cached as T

  const response = await fetch(`${DATA_BASE}${path}`)
  if (!response.ok) {
    throw new Error(`Failed to load ${path}: ${response.status}`)
  }
  const data = await response.json()
  cache.set(path, data)
  return data
}

export async function fetchManifest(): Promise<DataManifest> {
  return fetchJson<DataManifest>('/manifest.json')
}

export async function fetchReports(): Promise<Report[]> {
  const manifest = await fetchManifest()
  return manifest.reports.map((r) => ({
    slug_id: String(r.slug_id),
    slug_name: r.slug_name,
    report_title: r.report_title,
  }))
}

export async function fetchSections(reportId: string): Promise<Section[]> {
  return fetchJson<Section[]>(`/reports/${reportId}/sections.json`)
}

export async function fetchItemDescriptions(
  reportId: string,
  sectionId: string
): Promise<string[]> {
  const sectionPath = sanitizePath(sectionId)
  return fetchJson<string[]>(`/reports/${reportId}/${sectionPath}/items.json`)
}

export async function fetchPriceData(
  reportId: string,
  sectionId: string,
  startDate: Date,
  endDate: Date,
  itemDescription?: string
): Promise<PriceRecord[]> {
  const sectionPath = sanitizePath(sectionId)
  let records = await fetchJson<PriceRecord[]>(
    `/reports/${reportId}/${sectionPath}/prices.json`
  )

  // Filter by date range (dates from API are MM/DD/YYYY format)
  const startTime = startDate.getTime()
  const endTime = endDate.getTime()
  records = records.filter((r) => {
    const recordTime = parse(r.report_date, 'MM/dd/yyyy', new Date()).getTime()
    return recordTime >= startTime && recordTime <= endTime
  })

  // Filter by item description if specified
  if (itemDescription) {
    records = records.filter((r) => r.item_description === itemDescription)
  }

  // Filter out rows with no actual trade data (zero prices distort the chart)
  records = records.filter(
    (r) => r.weighted_average > 0 || r.number_trades > 0 || r.total_pounds > 0
  )

  return records
}

function sanitizePath(name: string): string {
  return name.replace(/[^a-zA-Z0-9-]/g, '-').replace(/-+/g, '-')
}
