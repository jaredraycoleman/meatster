/**
 * Lightweight script to check if USDA has new data
 * Compares latest published_date timestamp from API against deployed manifest
 * Exits with code 0 if new data available, 1 if no updates
 */

const API_BASE = 'https://mpr.datamart.ams.usda.gov/services/v1.1'
const DEPLOYED_MANIFEST_URL = 'https://meatster.kubishi.com/data/manifest.json'

// Daily reports to check (PM reports publish around 2:30 PM ET)
const DAILY_REPORTS = [
  { id: 2453, section: 'Summary', name: 'National Daily Boxed Beef Cutout (PM)' },
  { id: 2459, section: 'Summary', name: 'National Daily Boxed Beef Cutout (Comprehensive)' },
]

interface Manifest {
  generatedAt: string
  dataEndDate: string
  latestPublishedDate?: string // ISO timestamp of latest USDA published_date
}

interface PriceDataResponse {
  results: Array<{ report_date: string; published_date: string }>
}

async function getDeployedPublishedDate(): Promise<string | null> {
  try {
    const response = await fetch(DEPLOYED_MANIFEST_URL)
    if (!response.ok) {
      console.log('Could not fetch deployed manifest (first deploy?)')
      return null
    }
    const manifest: Manifest = await response.json()
    // Prefer latestPublishedDate if available, fall back to generatedAt
    return manifest.latestPublishedDate || manifest.generatedAt
  } catch (error) {
    console.log('Error fetching deployed manifest:', error)
    return null
  }
}

function parseUSDATimestamp(timestamp: string): Date {
  // USDA format: "MM/DD/YYYY HH:MM:SS" (assumed ET timezone)
  const [datePart, timePart] = timestamp.split(' ')
  const [month, day, year] = datePart.split('/')
  const [hour, minute, second] = timePart.split(':')
  // Create date assuming ET (UTC-5), convert to UTC for comparison
  const etDate = new Date(
    parseInt(year),
    parseInt(month) - 1,
    parseInt(day),
    parseInt(hour),
    parseInt(minute),
    parseInt(second)
  )
  // Add 5 hours to convert ET to UTC (simplified, doesn't handle DST)
  return new Date(etDate.getTime() + 5 * 60 * 60 * 1000)
}

async function getLatestUSDAPublishedDate(): Promise<string | null> {
  const formatDate = (d: Date) => {
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${month}/${day}/${d.getFullYear()}`
  }

  const endDate = new Date()
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - 7)

  let latestTimestamp: Date | null = null

  for (const report of DAILY_REPORTS) {
    try {
      const url = `${API_BASE}/reports/${report.id}/${encodeURIComponent(report.section)}?q=report_date=${formatDate(startDate)}:${formatDate(endDate)}`
      console.log(`Checking ${report.name}: ${url}`)

      const response = await fetch(url)
      if (!response.ok) {
        console.log(`  HTTP ${response.status} - skipping`)
        continue
      }

      const data: PriceDataResponse = await response.json()
      const results = data.results || []

      if (results.length === 0) {
        console.log('  No recent data')
        continue
      }

      // Find the latest published_date in this report
      for (const r of results) {
        if (r.published_date) {
          const timestamp = parseUSDATimestamp(r.published_date)
          if (!latestTimestamp || timestamp > latestTimestamp) {
            latestTimestamp = timestamp
            console.log(`  Latest: ${r.published_date}`)
          }
        }
      }
    } catch (error) {
      console.log(`  Error: ${error}`)
    }
  }

  return latestTimestamp ? latestTimestamp.toISOString() : null
}

async function main(): Promise<void> {
  console.log('Checking for USDA data updates...\n')

  const [deployedTimestamp, latestTimestamp] = await Promise.all([
    getDeployedPublishedDate(),
    getLatestUSDAPublishedDate(),
  ])

  console.log(`\nDeployed published: ${deployedTimestamp || 'unknown'}`)
  console.log(`Latest USDA:        ${latestTimestamp || 'unknown'}`)

  if (!latestTimestamp) {
    console.log('\nCould not determine latest USDA timestamp. Skipping build.')
    process.exit(1)
  }

  if (!deployedTimestamp) {
    console.log('\nNo deployed manifest found. New data available!')
    process.exit(0)
  }

  const deployedTime = new Date(deployedTimestamp).getTime()
  const latestTime = new Date(latestTimestamp).getTime()

  if (latestTime > deployedTime) {
    console.log(`\nNew data available! Triggering build.`)
    process.exit(0)
  } else {
    console.log('\nNo new data. Skipping build.')
    process.exit(1)
  }
}

main().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})
