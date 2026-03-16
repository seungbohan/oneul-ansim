import { WeatherInfo, OutingAdvice } from '@/types'

export function getOutingAdvice(weather: WeatherInfo): OutingAdvice {
  const reasons: string[] = []
  const tips: string[] = []
  let canGoOut = true

  if (weather.precipitationChance >= 60) {
    reasons.push('비가 올 수 있어요')
    tips.push('우산 꼭 챙기세요')
  }

  if (weather.pm10Grade === '나쁨' || weather.pm10Grade === '매우나쁨') {
    reasons.push('미세먼지가 나빠요')
    tips.push('마스크를 쓰세요')
    if (weather.pm10Grade === '매우나쁨') canGoOut = false
  }

  if (weather.pm25Grade === '나쁨' || weather.pm25Grade === '매우나쁨') {
    reasons.push('초미세먼지가 나빠요')
    tips.push('밖에 오래 있지 마세요')
    if (weather.pm25Grade === '매우나쁨') canGoOut = false
  }

  if (weather.feelsLike <= -5) {
    reasons.push('밖이 많이 추워요')
    tips.push('따뜻하게 입으세요')
    canGoOut = false
  }

  if (weather.feelsLike >= 35) {
    reasons.push('밖이 많이 더워요')
    tips.push('물 꼭 챙기세요')
    canGoOut = false
  }

  if (weather.windSpeed >= 10) {
    reasons.push('바람이 많이 불어요')
    tips.push('외출 시 조심하세요')
  }

  if (reasons.length === 0) {
    reasons.push('날씨가 좋아요')
    tips.push('가볍게 산책하기 좋아요')
  }

  return { canGoOut, reasons, tips }
}

export function getWeatherIcon(condition: string): string {
  switch (condition) {
    case '맑음': return '☀️'
    case '구름많음': return '⛅'
    case '흐림': return '☁️'
    case '비': return '🌧️'
    case '눈': return '🌨️'
    case '비/눈': return '🌧️'
    case '소나기': return '⛈️'
    default: return '🌤️'
  }
}

export function getWeatherGreeting(weather: WeatherInfo): string {
  if (weather.precipitationChance >= 60) return '오늘은 비 소식이 있어요'
  if (weather.feelsLike <= 0) return '오늘은 많이 추워요'
  if (weather.feelsLike >= 33) return '오늘은 많이 더워요'
  if (weather.pm10Grade === '나쁨' || weather.pm25Grade === '나쁨') return '미세먼지가 좀 있어요'
  if (weather.condition === '맑음') return '오늘 날씨 좋아요!'
  return '오늘 하루도 안심하세요'
}
