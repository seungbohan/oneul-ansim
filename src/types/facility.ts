export type FacilityType = 'pharmacy' | 'hospital' | 'welfare'

export type Facility = {
  id: string
  name: string
  type: FacilityType
  address: string
  phone: string
  distance: number
  isOpen: boolean
  lat: number
  lng: number
}
