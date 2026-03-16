/**
 * Lambert Conformal Conic projection converter
 * Converts latitude/longitude to KMA (Korea Meteorological Administration) grid coordinates.
 *
 * Reference: KMA open API documentation
 * https://www.data.go.kr/data/15084084/openapi.do
 */

const GRID_PARAMS = {
  RE: 6371.00877, // Earth radius (km)
  GRID: 5.0, // Grid spacing (km)
  SLAT1: 30.0, // Projection latitude 1 (degree)
  SLAT2: 60.0, // Projection latitude 2 (degree)
  OLON: 126.0, // Reference longitude (degree)
  OLAT: 38.0, // Reference latitude (degree)
  XO: 43, // Reference X coordinate (grid)
  YO: 136, // Reference Y coordinate (grid)
} as const

const DEG_TO_RAD = Math.PI / 180.0

/**
 * Converts WGS84 latitude/longitude to KMA grid coordinates (nx, ny).
 *
 * @param lat - Latitude in degrees (WGS84)
 * @param lng - Longitude in degrees (WGS84)
 * @returns Grid coordinates { nx, ny } used by KMA short-term forecast API
 *
 * @example
 * // Seoul City Hall
 * const grid = latLngToGrid(37.5665, 126.978)
 * // => { nx: 60, ny: 127 }
 */
export function latLngToGrid(lat: number, lng: number): { nx: number; ny: number } {
  const { RE, GRID, SLAT1, SLAT2, OLON, OLAT, XO, YO } = GRID_PARAMS

  const re = RE / GRID
  const slat1Rad = SLAT1 * DEG_TO_RAD
  const slat2Rad = SLAT2 * DEG_TO_RAD
  const olonRad = OLON * DEG_TO_RAD
  const olatRad = OLAT * DEG_TO_RAD

  let sn = Math.tan(Math.PI * 0.25 + slat2Rad * 0.5) / Math.tan(Math.PI * 0.25 + slat1Rad * 0.5)
  sn = Math.log(Math.cos(slat1Rad) / Math.cos(slat2Rad)) / Math.log(sn)

  let sf = Math.tan(Math.PI * 0.25 + slat1Rad * 0.5)
  sf = (Math.pow(sf, sn) * Math.cos(slat1Rad)) / sn

  let ro = Math.tan(Math.PI * 0.25 + olatRad * 0.5)
  ro = (re * sf) / Math.pow(ro, sn)

  let ra = Math.tan(Math.PI * 0.25 + lat * DEG_TO_RAD * 0.5)
  ra = (re * sf) / Math.pow(ra, sn)

  let theta = lng * DEG_TO_RAD - olonRad
  if (theta > Math.PI) theta -= 2.0 * Math.PI
  if (theta < -Math.PI) theta += 2.0 * Math.PI
  theta *= sn

  const nx = Math.floor(ra * Math.sin(theta) + XO + 0.5)
  const ny = Math.floor(ro - ra * Math.cos(theta) + YO + 0.5)

  return { nx, ny }
}
