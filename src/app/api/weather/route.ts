/**
 * Weather API Route
 *
 * GET /api/weather?lat=37.5665&lng=126.978
 *
 * Fetches current weather from KMA (Korea Meteorological Administration)
 * and air quality from AirKorea, then returns a unified WeatherInfo response.
 *
 * Required environment variables:
 *   WEATHER_API_KEY     - KMA short-term forecast API key (URL-decoded, from data.go.kr)
 *   AIR_QUALITY_API_KEY - AirKorea air quality API key (from data.go.kr)
 *
 * Falls back to mock data when API keys are missing or API calls fail.
 */

import { NextRequest, NextResponse } from 'next/server'
import { WeatherCondition, AirQualityGrade, WeatherInfo } from '@/types/weather'
import { latLngToGrid } from '@/lib/utils/weatherGrid'

// -- CORS helper --

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() })
}

function jsonWithCors(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: corsHeaders() })
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const KMA_BASE_URL = 'http://apis.data.go.kr/1360000/VilageFcstInfoService_2.0'
const AIR_STATION_URL = 'http://apis.data.go.kr/B552584/MsrstnInfoInqireSvc/getNearbyMsrstnList'
const AIR_QUALITY_URL = 'http://apis.data.go.kr/B552584/ArpltnInforInqireSvc/getMsrstnAcctoRltmMesureDnsty'

const FORECAST_BASE_TIMES = ['0200', '0500', '0800', '1100', '1400', '1700', '2000', '2300'] as const

const PRECIPITATION_TYPE_MAP: Record<string, WeatherCondition> = {
  '1': '비',
  '2': '비/눈',
  '3': '눈',
  '4': '소나기',
}

const SKY_CONDITION_MAP: Record<string, WeatherCondition> = {
  '1': '맑음',
  '3': '구름많음',
  '4': '흐림',
}

const API_TIMEOUT_MS = 8000

// ---------------------------------------------------------------------------
// Date / time helpers
// ---------------------------------------------------------------------------

/** Returns KST Date (UTC+9). */
function getKSTDate(): Date {
  const now = new Date()
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60_000
  return new Date(utcMs + 9 * 60 * 60_000)
}

/** Formats a Date as YYYYMMDD string. */
function formatDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}${m}${d}`
}

/**
 * Determines the latest available ultra-short-term observation base_time.
 * Observations are available every hour on the hour, but data is actually
 * published ~10 minutes after the hour.
 *
 * If current time is before 00:10, falls back to 23:00 of the previous day.
 */
function getUltraSrtNcstBaseTime(kst: Date): { baseDate: string; baseTime: string } {
  const hour = kst.getHours()
  const minute = kst.getMinutes()

  if (hour === 0 && minute < 10) {
    // Use previous day 23:00
    const prev = new Date(kst.getTime() - 24 * 60 * 60_000)
    return { baseDate: formatDate(prev), baseTime: '2300' }
  }

  const availableHour = minute < 10 ? hour - 1 : hour
  return {
    baseDate: formatDate(kst),
    baseTime: String(availableHour).padStart(2, '0') + '00',
  }
}

/**
 * Determines the latest available short-term forecast base_time.
 * Forecasts are published at 02, 05, 08, 11, 14, 17, 20, 23 hours,
 * but data is available ~10 minutes after the base time.
 */
function getVilageFcstBaseTime(kst: Date): { baseDate: string; baseTime: string } {
  const hour = kst.getHours()
  const minute = kst.getMinutes()
  const currentMinutes = hour * 60 + minute

  // Find the latest base time that has passed (+10 min buffer)
  let selectedTime: string | null = null
  for (let i = FORECAST_BASE_TIMES.length - 1; i >= 0; i--) {
    const bt = FORECAST_BASE_TIMES[i]
    const btHour = parseInt(bt.slice(0, 2), 10)
    const btMinutes = btHour * 60 + 10 // 10-minute publication delay
    if (currentMinutes >= btMinutes) {
      selectedTime = bt
      break
    }
  }

  if (selectedTime) {
    return { baseDate: formatDate(kst), baseTime: selectedTime }
  }

  // Before 02:10 KST - use previous day's 23:00 forecast
  const prev = new Date(kst.getTime() - 24 * 60 * 60_000)
  return { baseDate: formatDate(prev), baseTime: '2300' }
}

// ---------------------------------------------------------------------------
// KMA API types
// ---------------------------------------------------------------------------

interface KmaItem {
  category: string
  obsrValue?: string // ultra-short-term observation
  fcstValue?: string // short-term forecast
  fcstDate?: string
  fcstTime?: string
}

interface KmaResponse {
  response: {
    header: { resultCode: string; resultMsg: string }
    body?: {
      items?: { item?: KmaItem[] }
    }
  }
}

// ---------------------------------------------------------------------------
// Fetch helpers
// ---------------------------------------------------------------------------

async function fetchWithTimeout(url: string, timeoutMs: number = API_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(url, { signal: controller.signal })
    return response
  } finally {
    clearTimeout(timer)
  }
}

/** Builds a URL with query params, properly encoding the service key. */
function buildKmaUrl(endpoint: string, params: Record<string, string | number>): string {
  const fullUrl = `${KMA_BASE_URL}${endpoint}`
  const searchParams = new URLSearchParams()

  for (const [key, value] of Object.entries(params)) {
    searchParams.set(key, String(value))
  }

  return `${fullUrl}?${searchParams.toString()}`
}

// ---------------------------------------------------------------------------
// KMA data fetchers
// ---------------------------------------------------------------------------

interface CurrentWeather {
  temperature: number
  humidity: number
  windSpeed: number
  condition: WeatherCondition
}

async function fetchCurrentWeather(
  apiKey: string,
  nx: number,
  ny: number,
): Promise<CurrentWeather | null> {
  const kst = getKSTDate()
  const { baseDate, baseTime } = getUltraSrtNcstBaseTime(kst)

  const url = buildKmaUrl('/getUltraSrtNcst', {
    serviceKey: apiKey,
    numOfRows: 1000,
    pageNo: 1,
    dataType: 'JSON',
    base_date: baseDate,
    base_time: baseTime,
    nx,
    ny,
  })

  try {
    const response = await fetchWithTimeout(url)
    const data: KmaResponse = await response.json()

    if (data.response.header.resultCode !== '00') {
      console.error('[Weather] KMA ultra-short-term error:', data.response.header.resultMsg)
      return null
    }

    const items = data.response.body?.items?.item
    if (!items || items.length === 0) return null

    let temperature = 0
    let humidity = 0
    let windSpeed = 0
    let pty = '0'
    let sky = '1' // Default: clear

    for (const item of items) {
      const value = item.obsrValue ?? ''
      switch (item.category) {
        case 'T1H':
          temperature = parseFloat(value)
          break
        case 'REH':
          humidity = parseFloat(value)
          break
        case 'WSD':
          windSpeed = parseFloat(value)
          break
        case 'PTY':
          pty = value
          break
        case 'SKY':
          sky = value
          break
      }
    }

    // Ultra-short-term observation does not include SKY.
    // We will fill it from the forecast if available.
    const condition = deriveCondition(pty, sky)

    return { temperature, humidity, windSpeed, condition }
  } catch (error) {
    console.error('[Weather] Failed to fetch current weather:', error)
    return null
  }
}

interface ForecastData {
  maxTemp: number | null
  minTemp: number | null
  precipitationChance: number
  skyCondition: string | null // Used to supplement ultra-short-term (which lacks SKY)
}

async function fetchForecast(
  apiKey: string,
  nx: number,
  ny: number,
): Promise<ForecastData | null> {
  const kst = getKSTDate()
  const { baseDate, baseTime } = getVilageFcstBaseTime(kst)
  const todayStr = formatDate(kst)

  const url = buildKmaUrl('/getVilageFcst', {
    serviceKey: apiKey,
    numOfRows: 1000,
    pageNo: 1,
    dataType: 'JSON',
    base_date: baseDate,
    base_time: baseTime,
    nx,
    ny,
  })

  try {
    const response = await fetchWithTimeout(url)
    const data: KmaResponse = await response.json()

    if (data.response.header.resultCode !== '00') {
      console.error('[Weather] KMA forecast error:', data.response.header.resultMsg)
      return null
    }

    const items = data.response.body?.items?.item
    if (!items || items.length === 0) return null

    let maxTemp: number | null = null
    let minTemp: number | null = null
    let maxPop = 0
    let skyCondition: string | null = null
    const currentHourStr = String(kst.getHours()).padStart(2, '0') + '00'

    for (const item of items) {
      const value = item.fcstValue ?? ''
      const fcstDate = item.fcstDate ?? ''

      // Only process today's data
      if (fcstDate !== todayStr) continue

      switch (item.category) {
        case 'TMX':
          maxTemp = parseFloat(value)
          break
        case 'TMN':
          minTemp = parseFloat(value)
          break
        case 'POP': {
          const pop = parseInt(value, 10)
          if (pop > maxPop) maxPop = pop
          break
        }
        case 'SKY':
          // Use the forecast closest to current time for sky condition
          if (skyCondition === null || item.fcstTime === currentHourStr) {
            skyCondition = value
          }
          break
      }
    }

    return {
      maxTemp,
      minTemp,
      precipitationChance: maxPop,
      skyCondition,
    }
  } catch (error) {
    console.error('[Weather] Failed to fetch forecast:', error)
    return null
  }
}

// ---------------------------------------------------------------------------
// AirKorea data fetcher
// ---------------------------------------------------------------------------

interface AirQualityData {
  pm10: number
  pm25: number
  pm10Grade: AirQualityGrade
  pm25Grade: AirQualityGrade
}

async function fetchAirQuality(
  apiKey: string,
  lat: number,
  lng: number,
): Promise<AirQualityData | null> {
  try {
    // Step 1: Find the nearest monitoring station using TM coordinates
    const stationUrl = `${AIR_STATION_URL}?${new URLSearchParams({
      serviceKey: apiKey,
      returnType: 'json',
      tmX: String(lng),
      tmY: String(lat),
      ver: '1.1',
    }).toString()}`

    const stationResponse = await fetchWithTimeout(stationUrl)
    const stationData = await stationResponse.json()

    const stationItems = stationData?.response?.body?.items
    if (!stationItems || stationItems.length === 0) {
      console.error('[Weather] No nearby air quality station found')
      return null
    }

    const stationName: string = stationItems[0].stationName

    // Step 2: Get real-time measurements from the station
    const qualityUrl = `${AIR_QUALITY_URL}?${new URLSearchParams({
      serviceKey: apiKey,
      returnType: 'json',
      stationName,
      dataTerm: 'DAILY',
      ver: '1.5',
      numOfRows: '1',
      pageNo: '1',
    }).toString()}`

    const qualityResponse = await fetchWithTimeout(qualityUrl)
    const qualityData = await qualityResponse.json()

    const qualityItems = qualityData?.response?.body?.items
    if (!qualityItems || qualityItems.length === 0) {
      console.error('[Weather] No air quality data for station:', stationName)
      return null
    }

    const latest = qualityItems[0]
    const pm10 = parseInt(latest.pm10Value, 10) || 0
    const pm25 = parseInt(latest.pm25Value, 10) || 0

    return {
      pm10,
      pm25,
      pm10Grade: classifyPm10(pm10),
      pm25Grade: classifyPm25(pm25),
    }
  } catch (error) {
    console.error('[Weather] Failed to fetch air quality:', error)
    return null
  }
}

// ---------------------------------------------------------------------------
// Classification helpers
// ---------------------------------------------------------------------------

function deriveCondition(pty: string, sky: string): WeatherCondition {
  if (pty !== '0' && PRECIPITATION_TYPE_MAP[pty]) {
    return PRECIPITATION_TYPE_MAP[pty]
  }
  return SKY_CONDITION_MAP[sky] ?? '맑음'
}

function classifyPm10(value: number): AirQualityGrade {
  if (value <= 30) return '좋음'
  if (value <= 80) return '보통'
  if (value <= 150) return '나쁨'
  return '매우나쁨'
}

function classifyPm25(value: number): AirQualityGrade {
  if (value <= 15) return '좋음'
  if (value <= 35) return '보통'
  if (value <= 75) return '나쁨'
  return '매우나쁨'
}

/**
 * Calculates approximate wind chill or heat index to derive "feels like" temperature.
 * Uses a simplified formula suitable for general advisory purposes.
 */
function calculateFeelsLike(temperature: number, windSpeed: number, humidity: number): number {
  // Wind chill (below 10 C with wind > 1.3 m/s)
  if (temperature <= 10 && windSpeed > 1.3) {
    const wc =
      13.12 +
      0.6215 * temperature -
      11.37 * Math.pow(windSpeed * 3.6, 0.16) +
      0.3965 * temperature * Math.pow(windSpeed * 3.6, 0.16)
    return Math.round(wc * 10) / 10
  }

  // Heat index (above 27 C)
  if (temperature >= 27) {
    const hi =
      -8.7847 +
      1.6114 * temperature +
      2.3385 * humidity -
      0.14612 * temperature * humidity -
      0.01245 * temperature * temperature -
      0.01674 * humidity * humidity +
      0.002211 * temperature * temperature * humidity +
      0.0007255 * temperature * humidity * humidity -
      0.000003582 * temperature * temperature * humidity * humidity
    return Math.round(hi * 10) / 10
  }

  return temperature
}

// ---------------------------------------------------------------------------
// Mock data (fallback for development)
// ---------------------------------------------------------------------------

function getMockWeather(): WeatherInfo {
  return {
    temperature: 12,
    feelsLike: 10,
    condition: '맑음',
    humidity: 45,
    windSpeed: 3.2,
    precipitationChance: 10,
    pm10: 35,
    pm25: 18,
    pm10Grade: '보통',
    pm25Grade: '좋음',
    maxTemp: 15,
    minTemp: 4,
    updatedAt: new Date().toISOString(),
  }
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const latStr = searchParams.get('lat')
  const lngStr = searchParams.get('lng')

  if (!latStr || !lngStr) {
    return jsonWithCors(
      { error: '위치 정보가 필요합니다 (lat, lng)' },
      400,
    )
  }

  const lat = parseFloat(latStr)
  const lng = parseFloat(lngStr)

  if (isNaN(lat) || isNaN(lng)) {
    return jsonWithCors(
      { error: '올바른 좌표 형식이 아닙니다' },
      400,
    )
  }

  const weatherApiKey = process.env.WEATHER_API_KEY
  const airApiKey = process.env.AIR_QUALITY_API_KEY

  // If API keys are not configured, return mock data for development
  if (!weatherApiKey) {
    console.warn('[Weather] WEATHER_API_KEY is not set. Returning mock data.')
    return jsonWithCors(getMockWeather())
  }

  // Convert lat/lng to KMA grid coordinates
  const { nx, ny } = latLngToGrid(lat, lng)

  // Fetch weather data and air quality in parallel
  const [currentWeather, forecast, airQuality] = await Promise.all([
    fetchCurrentWeather(weatherApiKey, nx, ny),
    fetchForecast(weatherApiKey, nx, ny),
    airApiKey ? fetchAirQuality(airApiKey, lat, lng) : Promise.resolve(null),
  ])

  // If both KMA calls failed, fall back to mock data
  if (!currentWeather && !forecast) {
    console.warn('[Weather] All KMA API calls failed. Returning mock data.')
    return jsonWithCors(getMockWeather())
  }

  const temperature = currentWeather?.temperature ?? 0
  const humidity = currentWeather?.humidity ?? 0
  const windSpeed = currentWeather?.windSpeed ?? 0

  // Determine sky condition: prefer current observation, supplement with forecast
  let condition: WeatherCondition = currentWeather?.condition ?? '맑음'
  if (condition === '맑음' && forecast?.skyCondition) {
    // Ultra-short-term observation lacks SKY category; use forecast's SKY
    condition = deriveCondition('0', forecast.skyCondition)
  }

  const result: WeatherInfo = {
    temperature,
    feelsLike: calculateFeelsLike(temperature, windSpeed, humidity),
    condition,
    humidity,
    windSpeed,
    precipitationChance: forecast?.precipitationChance ?? 0,
    pm10: airQuality?.pm10 ?? 0,
    pm25: airQuality?.pm25 ?? 0,
    pm10Grade: airQuality?.pm10Grade ?? '좋음',
    pm25Grade: airQuality?.pm25Grade ?? '좋음',
    maxTemp: forecast?.maxTemp ?? temperature,
    minTemp: forecast?.minTemp ?? temperature,
    updatedAt: new Date().toISOString(),
  }

  return jsonWithCors(result)
}
