/**
 * Build-time data generation script
 * Fetches USDA beef price data and writes static JSON files
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs'
import { join } from 'path'

const API_BASE = 'https://mpr.datamart.ams.usda.gov/services/v1.1'
const OUTPUT_DIR = join(process.cwd(), 'public', 'data')

// Sections relevant to beef pricing (from existing api.ts)
const BEEF_SECTIONS = [
  'Upper 2-3 Choice Items',
  'Lower 1-3 Choice Items',
  'Branded Select',
  'Choice Cuts',
  'Select Cuts',
  'Choice/Select Cuts',
  'Ground Beef',
  'Blended Ground Beef',
  'Beef Trimmings',
]

interface Report {
  slug_id: number
  slug_name: string
  report_title: string
}

interface Section {
  slug_id: string
  slug_name: string
}

interface ReportResponse {
  reportSections: string[]
}

interface PriceDataResponse {
  results: Array<Record<string, string>>
}

interface PriceRecord {
  report_date: string
  item_description: string
  number_trades: number
  total_pounds: number
  price_range_low: number
  price_range_high: number
  weighted_average: number
}

interface DataManifest {
  generatedAt: string
  dataStartDate: string
  dataEndDate: string
  reports: Array<{
    slug_id: number
    slug_name: string
    report_title: string
    sections: string[]
  }>
}

function parseNumericValue(value: string | number | undefined): number {
  if (value === undefined || value === null || value === '') return 0
  if (typeof value === 'number') return value
  const cleaned = value.toString().replace(/,/g, '')
  const parsed = parseFloat(cleaned)
  return isNaN(parsed) ? 0 : parsed
}

function formatDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const year = date.getFullYear()
  return `${month}/${day}/${year}`
}

function sanitizePath(name: string): string {
  return name.replace(/[^a-zA-Z0-9-]/g, '-').replace(/-+/g, '-')
}

async function fetchJson<T>(url: string): Promise<T> {
  console.log(`  Fetching: ${url}`)
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${url}`)
  }
  return response.json()
}

async function fetchReports(): Promise<Report[]> {
  const data = await fetchJson<Report[]>(`${API_BASE}/reports`)
  // Filter to beef-related reports
  return data.filter(
    (report) =>
      report.report_title?.toLowerCase().includes('beef') ||
      report.slug_name?.toLowerCase().includes('beef')
  )
}

async function fetchSections(reportId: number): Promise<Section[]> {
  const data = await fetchJson<ReportResponse>(`${API_BASE}/reports/${reportId}`)
  // API returns { reportSections: ['Summary', 'Choice Cuts', ...] }
  const sectionNames = data.reportSections || []
  // Filter to relevant beef sections and convert to Section objects
  return sectionNames
    .filter((name) => BEEF_SECTIONS.some((s) => name.includes(s)))
    .map((name) => ({ slug_id: name, slug_name: name }))
}

async function fetchPriceData(
  reportId: number,
  sectionName: string,
  startDate: Date,
  endDate: Date
): Promise<PriceRecord[]> {
  const formattedStart = formatDate(startDate)
  const formattedEnd = formatDate(endDate)
  const url = `${API_BASE}/reports/${reportId}/${encodeURIComponent(sectionName)}?q=report_date=${formattedStart}:${formattedEnd}`

  const response = await fetchJson<PriceDataResponse>(url)
  const data = response.results || []

  return data.map((item) => ({
    report_date: item.report_date,
    item_description: item.item_description || '',
    number_trades: parseNumericValue(item.number_trades),
    total_pounds: parseNumericValue(item.total_pounds),
    price_range_low: parseNumericValue(item.price_range_low),
    price_range_high: parseNumericValue(item.price_range_high),
    weighted_average: parseNumericValue(item.weighted_average),
  }))
}

function extractUniqueItems(records: PriceRecord[]): string[] {
  const items = new Set<string>()
  for (const record of records) {
    if (record.item_description) {
      items.add(record.item_description)
    }
  }
  return Array.from(items).sort()
}

function ensureDir(dirPath: string): void {
  if (!existsSync(dirPath)) {
    mkdirSync(dirPath, { recursive: true })
  }
}

function writeJson(filePath: string, data: unknown): void {
  writeFileSync(filePath, JSON.stringify(data, null, 2))
  console.log(`  Wrote: ${filePath}`)
}

async function main(): Promise<void> {
  console.log('Starting USDA data generation...\n')

  // Date range: 2 years of historical data
  const endDate = new Date()
  const startDate = new Date()
  startDate.setFullYear(startDate.getFullYear() - 2)

  console.log(`Date range: ${formatDate(startDate)} to ${formatDate(endDate)}\n`)

  // Ensure output directory exists
  ensureDir(OUTPUT_DIR)

  // Fetch all beef reports
  console.log('Fetching reports...')
  const reports = await fetchReports()
  console.log(`Found ${reports.length} beef-related reports\n`)

  const manifest: DataManifest = {
    generatedAt: new Date().toISOString(),
    dataStartDate: startDate.toISOString().split('T')[0],
    dataEndDate: endDate.toISOString().split('T')[0],
    reports: [],
  }

  // Process each report
  for (const report of reports) {
    console.log(`\nProcessing report: ${report.report_title} (${report.slug_id})`)

    const reportDir = join(OUTPUT_DIR, 'reports', String(report.slug_id))
    ensureDir(reportDir)

    // Fetch sections for this report
    const sections = await fetchSections(report.slug_id)
    console.log(`  Found ${sections.length} relevant sections`)

    if (sections.length === 0) {
      continue
    }

    // Write sections list
    writeJson(join(reportDir, 'sections.json'), sections)

    const sectionNames: string[] = []

    // Process each section
    for (const section of sections) {
      console.log(`\n  Processing section: ${section.slug_name}`)
      sectionNames.push(section.slug_name)

      const sectionDir = join(reportDir, sanitizePath(section.slug_name))
      ensureDir(sectionDir)

      try {
        // Fetch price data for this section
        const priceData = await fetchPriceData(
          report.slug_id,
          section.slug_name,
          startDate,
          endDate
        )
        console.log(`    Fetched ${priceData.length} price records`)

        // Sort by date
        priceData.sort(
          (a, b) =>
            new Date(a.report_date).getTime() - new Date(b.report_date).getTime()
        )

        // Write price data
        writeJson(join(sectionDir, 'prices.json'), priceData)

        // Extract and write unique items
        const items = extractUniqueItems(priceData)
        writeJson(join(sectionDir, 'items.json'), items)
        console.log(`    Found ${items.length} unique items`)
      } catch (error) {
        console.error(`    Error fetching section data: ${error}`)
      }

      // Small delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 200))
    }

    manifest.reports.push({
      slug_id: report.slug_id,
      slug_name: report.slug_name,
      report_title: report.report_title,
      sections: sectionNames,
    })
  }

  // Write manifest
  writeJson(join(OUTPUT_DIR, 'manifest.json'), manifest)

  console.log('\n\nData generation complete!')
  console.log(`Output directory: ${OUTPUT_DIR}`)
  console.log(`Reports processed: ${manifest.reports.length}`)
}

main().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})
