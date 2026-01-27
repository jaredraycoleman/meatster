/**
 * Analysis utility functions for beef price data
 */

export interface PricePoint {
  date: Date
  price: number
}

export interface TrendAnalysis {
  direction: 'up' | 'down' | 'flat'
  changePercent: number
  slope: number
}

export interface VolatilityAnalysis {
  standardDeviation: number
  coefficientOfVariation: number
  level: 'low' | 'moderate' | 'high'
}

export interface PercentileAnalysis {
  currentPercentile: number
  interpretation: string
}

export interface YoYComparison {
  currentAvg: number
  lastYearAvg: number
  changePercent: number
  dataPoints: { current: number; lastYear: number }
}

export interface SeasonalPattern {
  bestMonth: string
  worstMonth: string
  currentMonthAvg: number
  monthlyAverages: { month: string; avg: number }[]
}

export interface MovingAverages {
  ma7: number | null
  ma30: number | null
  ma90: number | null
  prices: number[]
}

export interface SupportResistance {
  support: number
  resistance: number
  currentPrice: number
  nearSupport: boolean
  nearResistance: boolean
}

/**
 * Calculate simple moving average
 */
export function calculateSMA(prices: number[], period: number): number | null {
  if (prices.length < period) return null
  const slice = prices.slice(-period)
  return slice.reduce((sum, p) => sum + p, 0) / period
}

/**
 * Calculate moving averages for the dataset
 */
export function calculateMovingAverages(prices: number[]): MovingAverages {
  return {
    ma7: calculateSMA(prices, 7),
    ma30: calculateSMA(prices, 30),
    ma90: calculateSMA(prices, 90),
    prices,
  }
}

/**
 * Analyze price trend using linear regression
 */
export function analyzeTrend(prices: number[]): TrendAnalysis {
  if (prices.length < 2) {
    return { direction: 'flat', changePercent: 0, slope: 0 }
  }

  // Simple linear regression
  const n = prices.length
  const xMean = (n - 1) / 2
  const yMean = prices.reduce((sum, p) => sum + p, 0) / n

  let numerator = 0
  let denominator = 0
  for (let i = 0; i < n; i++) {
    numerator += (i - xMean) * (prices[i] - yMean)
    denominator += (i - xMean) ** 2
  }

  const slope = denominator !== 0 ? numerator / denominator : 0

  // Calculate percent change from start to end
  const startPrice = prices[0]
  const endPrice = prices[prices.length - 1]
  const changePercent = startPrice !== 0
    ? ((endPrice - startPrice) / startPrice) * 100
    : 0

  // Determine direction based on slope significance
  const threshold = yMean * 0.001 // 0.1% of mean as threshold
  let direction: 'up' | 'down' | 'flat'
  if (slope > threshold) {
    direction = 'up'
  } else if (slope < -threshold) {
    direction = 'down'
  } else {
    direction = 'flat'
  }

  return { direction, changePercent, slope }
}

/**
 * Calculate price volatility
 */
export function analyzeVolatility(prices: number[]): VolatilityAnalysis {
  if (prices.length < 2) {
    return { standardDeviation: 0, coefficientOfVariation: 0, level: 'low' }
  }

  const mean = prices.reduce((sum, p) => sum + p, 0) / prices.length
  const squaredDiffs = prices.map(p => (p - mean) ** 2)
  const variance = squaredDiffs.reduce((sum, d) => sum + d, 0) / prices.length
  const standardDeviation = Math.sqrt(variance)
  const coefficientOfVariation = mean !== 0 ? (standardDeviation / mean) * 100 : 0

  // Categorize volatility
  let level: 'low' | 'moderate' | 'high'
  if (coefficientOfVariation < 5) {
    level = 'low'
  } else if (coefficientOfVariation < 15) {
    level = 'moderate'
  } else {
    level = 'high'
  }

  return { standardDeviation, coefficientOfVariation, level }
}

/**
 * Calculate current price percentile within historical range
 */
export function analyzePercentile(prices: number[], currentPrice: number): PercentileAnalysis {
  if (prices.length === 0) {
    return { currentPercentile: 50, interpretation: 'No data available' }
  }

  const sorted = [...prices].sort((a, b) => a - b)
  const belowCount = sorted.filter(p => p < currentPrice).length
  const currentPercentile = (belowCount / sorted.length) * 100

  let interpretation: string
  if (currentPercentile <= 20) {
    interpretation = 'Excellent buying opportunity - prices are near historical lows'
  } else if (currentPercentile <= 40) {
    interpretation = 'Good value - prices are below average'
  } else if (currentPercentile <= 60) {
    interpretation = 'Fair price - near historical average'
  } else if (currentPercentile <= 80) {
    interpretation = 'Above average - consider timing'
  } else {
    interpretation = 'Near historical highs - premium pricing'
  }

  return { currentPercentile, interpretation }
}

/**
 * Compare current period to same period last year
 */
export function compareYoY(
  allPrices: { date: Date; price: number }[],
  viewStart: Date,
  viewEnd: Date
): YoYComparison | null {
  // Get prices in current view range
  const currentPrices = allPrices.filter(
    p => p.date >= viewStart && p.date <= viewEnd
  )

  // Get prices from same period last year
  const lastYearStart = new Date(viewStart)
  lastYearStart.setFullYear(lastYearStart.getFullYear() - 1)
  const lastYearEnd = new Date(viewEnd)
  lastYearEnd.setFullYear(lastYearEnd.getFullYear() - 1)

  const lastYearPrices = allPrices.filter(
    p => p.date >= lastYearStart && p.date <= lastYearEnd
  )

  if (currentPrices.length === 0 || lastYearPrices.length === 0) {
    return null
  }

  const currentAvg = currentPrices.reduce((sum, p) => sum + p.price, 0) / currentPrices.length
  const lastYearAvg = lastYearPrices.reduce((sum, p) => sum + p.price, 0) / lastYearPrices.length
  const changePercent = ((currentAvg - lastYearAvg) / lastYearAvg) * 100

  return {
    currentAvg,
    lastYearAvg,
    changePercent,
    dataPoints: { current: currentPrices.length, lastYear: lastYearPrices.length },
  }
}

/**
 * Analyze seasonal patterns
 */
export function analyzeSeasonalPatterns(
  allPrices: { date: Date; price: number }[]
): SeasonalPattern | null {
  if (allPrices.length < 30) return null

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  // Group prices by month
  const monthlyPrices: number[][] = Array.from({ length: 12 }, () => [])
  for (const p of allPrices) {
    monthlyPrices[p.date.getMonth()].push(p.price)
  }

  // Calculate monthly averages
  const monthlyAverages = monthlyPrices.map((prices, idx) => ({
    month: monthNames[idx],
    avg: prices.length > 0 ? prices.reduce((sum, p) => sum + p, 0) / prices.length : 0,
  })).filter(m => m.avg > 0)

  if (monthlyAverages.length === 0) return null

  // Find best (lowest) and worst (highest) months
  const sorted = [...monthlyAverages].sort((a, b) => a.avg - b.avg)
  const bestMonth = sorted[0].month
  const worstMonth = sorted[sorted.length - 1].month

  // Get current month average
  const currentMonth = new Date().getMonth()
  const currentMonthData = monthlyAverages.find(m => m.month === monthNames[currentMonth])
  const currentMonthAvg = currentMonthData?.avg || 0

  return {
    bestMonth,
    worstMonth,
    currentMonthAvg,
    monthlyAverages,
  }
}

/**
 * Calculate support and resistance levels
 */
export function calculateSupportResistance(prices: number[]): SupportResistance | null {
  if (prices.length < 10) return null

  const sorted = [...prices].sort((a, b) => a - b)
  const currentPrice = prices[prices.length - 1]

  // Support = 10th percentile, Resistance = 90th percentile
  const supportIdx = Math.floor(sorted.length * 0.1)
  const resistanceIdx = Math.floor(sorted.length * 0.9)

  const support = sorted[supportIdx]
  const resistance = sorted[resistanceIdx]

  // Check if current price is near support/resistance (within 5%)
  const nearSupport = currentPrice <= support * 1.05
  const nearResistance = currentPrice >= resistance * 0.95

  return {
    support,
    resistance,
    currentPrice,
    nearSupport,
    nearResistance,
  }
}

/**
 * Calculate day-of-week patterns
 */
export function analyzeDayOfWeekPatterns(
  allPrices: { date: Date; price: number }[]
): { day: string; avg: number; count: number }[] {
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const dayPrices: number[][] = Array.from({ length: 7 }, () => [])

  for (const p of allPrices) {
    dayPrices[p.date.getDay()].push(p.price)
  }

  return dayPrices.map((prices, idx) => ({
    day: dayNames[idx],
    avg: prices.length > 0 ? prices.reduce((sum, p) => sum + p, 0) / prices.length : 0,
    count: prices.length,
  })).filter(d => d.count > 0)
}
