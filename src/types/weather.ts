export type WeatherCondition = '맑음' | '구름많음' | '흐림' | '비' | '눈' | '비/눈' | '소나기'
export type AirQualityGrade = '좋음' | '보통' | '나쁨' | '매우나쁨'

export type WeatherInfo = {
  temperature: number
  feelsLike: number
  condition: WeatherCondition
  humidity: number
  windSpeed: number
  precipitationChance: number
  pm10: number
  pm25: number
  pm10Grade: AirQualityGrade
  pm25Grade: AirQualityGrade
  maxTemp: number
  minTemp: number
  updatedAt: string
}

export type OutingAdvice = {
  canGoOut: boolean
  reasons: string[]
  tips: string[]
}
