export type BusStop = {
  id: string
  name: string
  distance: number
  cityCode?: number
}

export type BusArrival = {
  routeName: string
  destination: string
  arrivalMinutes: number
  remainingStops: number
}
