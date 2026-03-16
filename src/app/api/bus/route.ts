import { NextRequest, NextResponse } from 'next/server'
import { BusStop, BusArrival } from '@/types/bus'

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

function jsonResponse(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: corsHeaders() })
}

// -- Constants (TAGO 전국 버스 API) --

const TAGO_STOP_URL =
  'http://apis.data.go.kr/1613000/BusSttnInfoInqireService/getCrdntPrxmtSttnList'
const TAGO_ARRIVAL_URL =
  'http://apis.data.go.kr/1613000/ArvlInfoInqireService/getSttnAcctoArvlPrearngeInfoList'

const API_TIMEOUT_MS = 8000

// -- TAGO API response types --

interface TagoHeader {
  resultCode: string
  resultMsg: string
}

interface TagoStopItem {
  citycode: number
  gpslati: number
  gpslong: number
  nodeid: string
  nodenm: string
  nodeno?: number
}

interface TagoArrivalItem {
  arrprevstationcnt: number // remaining stops
  arrtime: number           // arrival time in seconds
  nodeid: string
  nodenm: string
  routeid: string
  routeno: string
  routetp: string           // route type (일반, 급행 etc.)
  vehicletp?: string
}

interface TagoResponse<T> {
  response: {
    header: TagoHeader
    body?: {
      items?: { item?: T[] | T }
      totalCount?: number
    }
  }
}

// -- Utility --

async function fetchWithTimeout(url: string, timeoutMs = API_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

function extractItems<T>(data: TagoResponse<T>): T[] {
  const items = data.response?.body?.items?.item
  if (!items) return []
  return Array.isArray(items) ? items : [items]
}

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2)
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)))
}

function secondsToMinutes(seconds: number): number {
  return Math.max(1, Math.ceil(seconds / 60))
}

// -- TAGO API clients --

async function fetchNearbyStopsFromTago(lat: string, lng: string): Promise<BusStop[]> {
  const apiKey = process.env.BUS_API_KEY
  if (!apiKey) return []

  const params = new URLSearchParams({
    serviceKey: apiKey,
    gpsLati: lat,
    gpsLong: lng,
    numOfRows: '10',
    pageNo: '1',
    _type: 'json',
  })

  try {
    const response = await fetchWithTimeout(`${TAGO_STOP_URL}?${params.toString()}`)
    if (!response.ok) {
      console.error(`[bus] TAGO stop API error: ${response.status}`)
      return []
    }

    const data: TagoResponse<TagoStopItem> = await response.json()
    const items = extractItems(data)

    if (items.length === 0) return []

    const latNum = parseFloat(lat)
    const lngNum = parseFloat(lng)

    return items.map(item => ({
      id: item.nodeid,
      name: item.nodenm,
      distance: haversineDistance(latNum, lngNum, item.gpslati, item.gpslong),
      cityCode: item.citycode,
    })).sort((a, b) => a.distance - b.distance)
  } catch (error) {
    console.error('[bus] TAGO stop API request failed:', error)
    return []
  }
}

async function fetchArrivalInfoFromTago(cityCode: string, nodeId: string): Promise<BusArrival[]> {
  const apiKey = process.env.BUS_API_KEY
  if (!apiKey) return []

  const params = new URLSearchParams({
    serviceKey: apiKey,
    cityCode,
    nodeId,
    numOfRows: '15',
    pageNo: '1',
    _type: 'json',
  })

  try {
    const response = await fetchWithTimeout(`${TAGO_ARRIVAL_URL}?${params.toString()}`)
    if (!response.ok) {
      console.error(`[bus] TAGO arrival API error: ${response.status}`)
      return []
    }

    const data: TagoResponse<TagoArrivalItem> = await response.json()
    const items = extractItems(data)

    if (items.length === 0) return []

    return items
      .filter(item => item.arrtime > 0)
      .map(item => ({
        routeName: `${item.routeno}번`,
        destination: item.routetp || '일반',
        arrivalMinutes: secondsToMinutes(item.arrtime),
        remainingStops: item.arrprevstationcnt || 0,
      }))
      .sort((a, b) => a.arrivalMinutes - b.arrivalMinutes)
      .slice(0, 10)
  } catch (error) {
    console.error('[bus] TAGO arrival API request failed:', error)
    return []
  }
}

// -- Mock fallback --

function getMockStops(): BusStop[] {
  return [
    { id: 'mock-1', name: '시청 앞', distance: 120, cityCode: 11 },
    { id: 'mock-2', name: '주민센터', distance: 280, cityCode: 11 },
    { id: 'mock-3', name: '사거리 정류장', distance: 450, cityCode: 11 },
  ]
}

function getMockArrivals(): BusArrival[] {
  return [
    { routeName: '146번', destination: '일반', arrivalMinutes: 3, remainingStops: 2 },
    { routeName: '341번', destination: '일반', arrivalMinutes: 7, remainingStops: 4 },
    { routeName: '472번', destination: '급행', arrivalMinutes: 12, remainingStops: 6 },
  ]
}

// -- Route handler --

/**
 * GET /api/bus?lat=37.5665&lng=126.978
 *   -> Returns nearby bus stops (TAGO 전국 API)
 *
 * GET /api/bus?stopId=xxxxx&cityCode=12345
 *   -> Returns bus arrival info for the given stop
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const stopId = searchParams.get('stopId')
  const cityCode = searchParams.get('cityCode')

  // -- Arrival info for a specific stop --
  if (stopId && cityCode) {
    let arrivals: BusArrival[] = []

    try {
      arrivals = await fetchArrivalInfoFromTago(cityCode, stopId)
    } catch (error) {
      console.error('[bus] Arrival API request failed:', error)
    }

    if (arrivals.length === 0) {
      arrivals = getMockArrivals()
    }

    return jsonResponse(arrivals)
  }

  // -- Nearby stops --
  const lat = searchParams.get('lat')
  const lng = searchParams.get('lng')

  if (!lat || !lng) {
    return jsonResponse(
      { error: '위치 정보(lat, lng) 또는 정류장 정보(stopId, cityCode)가 필요합니다' },
      400,
    )
  }

  let stops: BusStop[] = []

  try {
    stops = await fetchNearbyStopsFromTago(lat, lng)
  } catch (error) {
    console.error('[bus] Station API request failed:', error)
  }

  if (stops.length === 0) {
    stops = getMockStops()
  }

  return jsonResponse(stops)
}
