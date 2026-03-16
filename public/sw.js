const CACHE_NAME = 'oneul-ansim-v1'

// 오프라인에서도 보여줄 기본 리소스
const PRECACHE_URLS = [
  '/',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
]

// 설치: 기본 리소스 캐싱
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  )
})

// 활성화: 이전 캐시 정리
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  )
})

// 네트워크 요청 처리: Network First (API), Cache First (정적 리소스)
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // API 요청은 항상 네트워크 우선
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request).catch(() => new Response(
        JSON.stringify({ error: '오프라인 상태입니다' }),
        { headers: { 'Content-Type': 'application/json' }, status: 503 }
      ))
    )
    return
  }

  // 정적 리소스: 네트워크 우선, 실패 시 캐시
  event.respondWith(
    fetch(request)
      .then(response => {
        // 성공하면 캐시에 저장
        if (response.ok) {
          const clone = response.clone()
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone))
        }
        return response
      })
      .catch(() => caches.match(request))
  )
})
