const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토']

export function formatTime(time: string): string {
  const [h, m] = time.split(':').map(Number)
  const period = h < 12 ? '오전' : '오후'
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h
  if (m === 0) return `${period} ${hour12}시`
  return `${period} ${hour12}시 ${m}분`
}

export function formatDate(date: string): string {
  const d = new Date(date)
  const month = d.getMonth() + 1
  const day = d.getDate()
  const dayName = DAY_NAMES[d.getDay()]
  return `${month}월 ${day}일 ${dayName}요일`
}

export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)}m`
  return `${(meters / 1000).toFixed(1)}km`
}

export function getTimeOfDay(): string {
  const h = new Date().getHours()
  if (h < 6) return '밤'
  if (h < 12) return '아침'
  if (h < 18) return '낮'
  return '저녁'
}

export function getGreeting(): string {
  const tod = getTimeOfDay()
  switch (tod) {
    case '아침': return '좋은 아침이에요!'
    case '낮': return '안녕하세요!'
    case '저녁': return '편안한 저녁이에요!'
    case '밤': return '늦은 시간이에요, 푹 쉬세요!'
    default: return '안녕하세요!'
  }
}

export function getTodayString(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function formatPhone(phone: string): string {
  const clean = phone.replace(/\D/g, '')
  if (clean.length === 11) {
    return `${clean.slice(0, 3)}-${clean.slice(3, 7)}-${clean.slice(7)}`
  }
  if (clean.length === 10) {
    return `${clean.slice(0, 3)}-${clean.slice(3, 6)}-${clean.slice(6)}`
  }
  return phone
}
