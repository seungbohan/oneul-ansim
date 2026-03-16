import { NextRequest, NextResponse } from 'next/server'
import { Facility, FacilityType } from '@/types/facility'

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

// -- Constants --

const VALID_TYPES: FacilityType[] = ['pharmacy', 'hospital', 'welfare']

const KAKAO_API_URL = 'https://dapi.kakao.com/v2/local/search/keyword.json'

const TYPE_TO_QUERY: Record<FacilityType, string> = {
  pharmacy: '약국',
  hospital: '병원',
  welfare: '노인복지관',
}

/** Assumed operating hours per facility type for isOpen estimation */
const OPERATING_HOURS: Record<FacilityType, { open: number; close: number }> = {
  pharmacy: { open: 9, close: 21 },
  hospital: { open: 9, close: 18 },
  welfare: { open: 9, close: 18 },
}

const SEARCH_RADIUS = 2000
const MAX_RESULTS = 5

// -- Kakao API response type --

interface KakaoDocument {
  place_name: string
  address_name: string
  phone: string
  distance: string
  x: string
  y: string
  category_name: string
  id: string
}

interface KakaoSearchResponse {
  documents: KakaoDocument[]
}

// -- Business logic --

function estimateIsOpen(type: FacilityType): boolean {
  const now = new Date()
  const hour = now.getHours()
  const { open, close } = OPERATING_HOURS[type]
  return hour >= open && hour < close
}

function mapKakaoDocumentToFacility(
  doc: KakaoDocument,
  type: FacilityType,
): Facility {
  return {
    id: doc.id,
    name: doc.place_name,
    type,
    address: doc.address_name,
    phone: doc.phone || '전화번호 없음',
    distance: parseInt(doc.distance, 10) || 0,
    isOpen: estimateIsOpen(type),
    lat: parseFloat(doc.y),
    lng: parseFloat(doc.x),
  }
}

// -- Kakao API client --

async function searchFacilitiesFromKakao(
  lat: string,
  lng: string,
  type: FacilityType,
): Promise<Facility[]> {
  const apiKey = process.env.KAKAO_REST_API_KEY
  if (!apiKey) {
    return []
  }

  const query = TYPE_TO_QUERY[type]
  const params = new URLSearchParams({
    query,
    x: lng,
    y: lat,
    radius: String(SEARCH_RADIUS),
    sort: 'distance',
    size: String(MAX_RESULTS),
  })

  const response = await fetch(`${KAKAO_API_URL}?${params.toString()}`, {
    headers: {
      Authorization: `KakaoAK ${apiKey}`,
    },
    next: { revalidate: 60 },
  })

  if (!response.ok) {
    console.error(
      `[facilities] Kakao API error: ${response.status} ${response.statusText}`,
    )
    return []
  }

  const data: KakaoSearchResponse = await response.json()
  return data.documents.map((doc) => mapKakaoDocumentToFacility(doc, type))
}

// -- Mock fallback --

/** 좌표로 대략적인 지역명 추정 */
function guessRegionName(lat: number, lng: number): string {
  const regions = [
    { name: '서울', lat: 37.5665, lng: 126.978 },
    { name: '대구 중구', lat: 35.8714, lng: 128.6014 },
    { name: '부산 중구', lat: 35.1796, lng: 129.0756 },
    { name: '인천 남동구', lat: 37.4563, lng: 126.7052 },
    { name: '광주 동구', lat: 35.1595, lng: 126.8526 },
    { name: '대전 서구', lat: 36.3504, lng: 127.3845 },
    { name: '울산 남구', lat: 35.5384, lng: 129.3114 },
    { name: '세종', lat: 36.4800, lng: 127.2590 },
    { name: '수원', lat: 37.2750, lng: 127.0094 },
    { name: '춘천', lat: 37.8228, lng: 128.1555 },
    { name: '청주', lat: 36.6357, lng: 127.4912 },
    { name: '천안', lat: 36.6588, lng: 126.6728 },
    { name: '전주', lat: 35.8203, lng: 127.1088 },
    { name: '목포', lat: 34.8161, lng: 126.4629 },
    { name: '포항', lat: 36.4919, lng: 128.8889 },
    { name: '창원', lat: 35.4606, lng: 128.2132 },
    { name: '제주', lat: 33.4996, lng: 126.5312 },
  ]
  let closest = regions[0]
  let minDist = Infinity
  for (const r of regions) {
    const d = Math.pow(r.lat - lat, 2) + Math.pow(r.lng - lng, 2)
    if (d < minDist) { minDist = d; closest = r }
  }
  return closest.name
}

function getMockFacilities(type: FacilityType, lat: number, lng: number): Facility[] {
  const isOpen = estimateIsOpen(type)
  const region = guessRegionName(lat, lng)

  const mockData: Record<FacilityType, Facility[]> = {
    pharmacy: [
      { id: 'mock-1', name: `${region} 온누리약국`, type: 'pharmacy', address: `${region} 중앙로 123`, phone: '전화번호 없음', distance: 150, isOpen, lat, lng },
      { id: 'mock-2', name: `${region} 건강약국`, type: 'pharmacy', address: `${region} 대로 456`, phone: '전화번호 없음', distance: 320, isOpen, lat, lng },
      { id: 'mock-3', name: `${region} 행복약국`, type: 'pharmacy', address: `${region} 길 789`, phone: '전화번호 없음', distance: 500, isOpen: false, lat, lng },
    ],
    hospital: [
      { id: 'mock-4', name: `${region} 연세내과`, type: 'hospital', address: `${region} 중앙로 111`, phone: '전화번호 없음', distance: 200, isOpen, lat, lng },
      { id: 'mock-5', name: `${region} 정형외과`, type: 'hospital', address: `${region} 대로 222`, phone: '전화번호 없음', distance: 450, isOpen, lat, lng },
      { id: 'mock-6', name: `${region} 이비인후과`, type: 'hospital', address: `${region} 길 333`, phone: '전화번호 없음', distance: 600, isOpen: false, lat, lng },
    ],
    welfare: [
      { id: 'mock-7', name: `${region} 노인복지관`, type: 'welfare', address: `${region} 복지로 444`, phone: '전화번호 없음', distance: 350, isOpen, lat, lng },
      { id: 'mock-8', name: `${region} 시니어플라자`, type: 'welfare', address: `${region} 복지로 555`, phone: '전화번호 없음', distance: 700, isOpen, lat, lng },
    ],
  }

  return mockData[type]
}

// -- Route handler --

/**
 * GET /api/facilities?lat=37.5665&lng=126.978&type=pharmacy
 *
 * Searches nearby facilities using Kakao Local API.
 * Falls back to mock data when KAKAO_REST_API_KEY is not set or API fails.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const lat = searchParams.get('lat')
  const lng = searchParams.get('lng')
  const type = searchParams.get('type') as FacilityType | null

  if (!lat || !lng) {
    return jsonWithCors(
      { error: '위치 정보가 필요합니다 (lat, lng)' },
      400,
    )
  }

  if (!type || !VALID_TYPES.includes(type)) {
    return jsonWithCors(
      { error: `유효한 시설 유형이 필요합니다: ${VALID_TYPES.join(', ')}` },
      400,
    )
  }

  // Try Kakao API first, fall back to mock on failure or missing key
  let facilities: Facility[] = []

  try {
    facilities = await searchFacilitiesFromKakao(lat, lng, type)
  } catch (error) {
    console.error('[facilities] Kakao API request failed:', error)
  }

  if (facilities.length === 0) {
    facilities = getMockFacilities(type, parseFloat(lat), parseFloat(lng))
  }

  return jsonWithCors(facilities)
}
