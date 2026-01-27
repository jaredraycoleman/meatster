/**
 * Lightweight script to check if USDA has new data
 * Compares latest report date from API against deployed manifest
 * Exits with code 0 if new data available, 1 if no updates
 */

const API_BASE = 'https://mpr.datamart.ams.usda.gov/services/v1.1'
const DEPLOYED_MANIFEST_URL = 'https://meatster.kubishi.com/data/manifest.json'

// Primary report to check (National Daily Boxed Beef Cutout)
const CHECK_REPORT_ID = 2453
const CHECK_SECTION = 'Choice Cuts'

interface Manifest {
  generatedAt: string
  dataEndDate: string
}

interface PriceDataResponse {
  results: Array<{ report_date: string }>
}

async function getDeployedDataDate(): Promise<string | null> {
  try {
    const response = await fetch(DEPLOYED_MANIFEST_URL)
    if (!response.ok) {
      console.log('Could not fetch deployed manifest (first deploy?)')
      return null
    }
    const manifest: Manifest = await response.json()
    return manifest.dataEndDate
  } catch (error) {
    console.log('Error fetching deployed manifest:', error)
    return null
  }
}

async function getLatestUSDADate(): Promise<string | null> {
  try {
    // Fetch recent data (last 7 days) to find the latest report date
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - 7)

    const formatDate = (d: Date) => {
      const month = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      return `${month}/${day}/${d.getFullYear()}`
    }

    const url = `${API_BASE}/reports/${CHECK_REPORT_ID}/${encodeURIComponent(CHECK_SECTION)}?q=report_date=${formatDate(startDate)}:${formatDate(endDate)}`
    console.log(`Checking USDA API: ${url}`)

    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const data: PriceDataResponse = await response.json()
    const results = data.results || []

    if (results.length === 0) {
      console.log('No recent data from USDA')
      return null
    }

    // Find the latest date (format: MM/DD/YYYY)
    const dates = results.map((r) => {
      const [month, day, year] = r.report_date.split('/')
      return `${year}-${month}-${day}` // Convert to YYYY-MM-DD for comparison
    })
    dates.sort()
    return dates[dates.length - 1]
  } catch (error) {
    console.log('Error fetching USDA data:', error)
    return null
  }
}

async function main(): Promise<void> {
  console.log('Checking for USDA data updates...\n')

  const [deployedDate, latestDate] = await Promise.all([
    getDeployedDataDate(),
    getLatestUSDADate(),
  ])

  console.log(`\nDeployed data date: ${deployedDate || 'unknown'}`)
  console.log(`Latest USDA date:   ${latestDate || 'unknown'}`)

  if (!latestDate) {
    console.log('\nCould not determine latest USDA date. Skipping build.')
    process.exit(1)
  }

  if (!deployedDate) {
    console.log('\nNo deployed manifest found. New data available!')
    process.exit(0)
  }

  if (latestDate > deployedDate) {
    console.log(`\nNew data available! (${deployedDate} -> ${latestDate})`)
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
