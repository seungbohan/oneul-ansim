'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import BigButton from '@/components/ui/BigButton'

export default function LoginPage() {
  const router = useRouter()
  const [isRegister, setIsRegister] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [mode, setMode] = useState<'elder' | 'guardian'>('elder')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    setError('')
    setLoading(true)

    const result = await signIn('credentials', {
      username,
      password,
      redirect: false,
    })

    setLoading(false)

    if (result?.error) {
      setError('아이디 또는 비밀번호가 틀렸어요')
      return
    }

    router.push('/')
    router.refresh()
  }

  const handleRegister = async () => {
    setError('')

    if (!name.trim()) {
      setError('이름을 입력해주세요')
      return
    }
    if (username.length < 4) {
      setError('아이디는 4자 이상 입력해주세요')
      return
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      setError('아이디는 영문, 숫자, 밑줄(_)만 사용할 수 있어요')
      return
    }
    if (password.length < 4) {
      setError('비밀번호를 4자 이상 입력해주세요')
      return
    }

    setLoading(true)

    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, name: name.trim(), mode }),
    })

    const data = await res.json()

    if (!res.ok) {
      setLoading(false)
      setError(data.error || '회원가입에 실패했어요')
      return
    }

    // 가입 후 자동 로그인
    const result = await signIn('credentials', {
      username,
      password,
      redirect: false,
    })

    setLoading(false)

    if (result?.error) {
      setError('가입은 완료되었지만 로그인에 실패했어요. 다시 로그인해주세요.')
      setIsRegister(false)
      return
    }

    router.push('/onboarding')
    router.refresh()
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (isRegister) {
      handleRegister()
    } else {
      handleLogin()
    }
  }

  return (
    <div className="min-h-screen flex flex-col px-6 py-8 bg-background">
      <div className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full">
        {/* 로고 */}
        <div className="text-center mb-10">
          <p className="text-6xl mb-4" aria-hidden="true">🏠</p>
          <h1 className="text-3xl font-bold">오늘안심</h1>
          <p className="text-muted mt-2 text-lg">어르신 생활 도우미</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 회원가입: 모드 선택 */}
          {isRegister && (
            <div className="space-y-3 mb-2">
              <p className="text-lg font-bold text-center">누가 사용하시나요?</p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setMode('elder')}
                  className={`
                    p-4 rounded-2xl text-center transition-all duration-200
                    ${mode === 'elder'
                      ? 'bg-primary text-white shadow-lg'
                      : 'bg-card border-2 border-border'
                    }
                  `}
                >
                  <span className="text-3xl block mb-1">👴</span>
                  <span className="font-bold">어르신</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMode('guardian')}
                  className={`
                    p-4 rounded-2xl text-center transition-all duration-200
                    ${mode === 'guardian'
                      ? 'bg-primary text-white shadow-lg'
                      : 'bg-card border-2 border-border'
                    }
                  `}
                >
                  <span className="text-3xl block mb-1">👨‍👩‍👧</span>
                  <span className="font-bold">보호자</span>
                </button>
              </div>
            </div>
          )}

          {/* 회원가입: 이름 */}
          {isRegister && (
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="이름 (예: 홍길동)"
              className="
                w-full text-xl border-2 border-border rounded-2xl
                px-5 py-4 bg-card
                focus:outline-none focus:border-primary transition-colors
                min-h-[56px]
              "
            />
          )}

          {/* 아이디 */}
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
            placeholder="아이디 (영문, 숫자)"
            autoCapitalize="none"
            autoCorrect="off"
            required
            className="
              w-full text-xl border-2 border-border rounded-2xl
              px-5 py-4 bg-card
              focus:outline-none focus:border-primary transition-colors
              min-h-[56px]
            "
          />

          {/* 비밀번호 */}
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="비밀번호"
            required
            className="
              w-full text-xl border-2 border-border rounded-2xl
              px-5 py-4 bg-card
              focus:outline-none focus:border-primary transition-colors
              min-h-[56px]
            "
          />

          {/* 에러 */}
          {error && (
            <p className="text-danger text-center font-bold text-base">{error}</p>
          )}

          {/* 제출 */}
          <BigButton
            fullWidth
            type="submit"
            loading={loading}
            disabled={!username || !password}
          >
            {isRegister ? '가입하기' : '로그인'}
          </BigButton>
        </form>

        {/* 전환 */}
        <button
          onClick={() => {
            setIsRegister(!isRegister)
            setError('')
          }}
          className="mt-6 text-center text-primary font-bold text-lg w-full py-3"
        >
          {isRegister ? '이미 계정이 있어요' : '처음이에요 (회원가입)'}
        </button>
      </div>
    </div>
  )
}
