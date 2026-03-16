'use client'

import { useState, useEffect, useCallback } from 'react'
import Header from '@/components/layout/Header'
import SectionCard from '@/components/ui/SectionCard'
import BigButton from '@/components/ui/BigButton'
import Modal from '@/components/ui/Modal'
import StatusBadge from '@/components/ui/StatusBadge'
import { useUserStore } from '@/lib/store/userStore'
import { useMedicationStore } from '@/lib/store/medicationStore'
import { getTodayProgress } from '@/lib/utils/medicationScheduler'
import { formatPhone } from '@/lib/utils/formatters'

/* ===== 어르신 모드: 보호자 초대 + 안부 보내기 ===== */
function ElderGuardianPage() {
  const { guardians, addGuardian, removeGuardian } = useUserStore()
  const { medications, logs } = useMedicationStore()
  const [showAdd, setShowAdd] = useState(false)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [relationship, setRelationship] = useState('')
  const [sentMessage, setSentMessage] = useState('')
  const [addError, setAddError] = useState('')

  // 초대 코드 상태
  const [inviteCode, setInviteCode] = useState<string | null>(null)
  const [codeExpiresAt, setCodeExpiresAt] = useState<string | null>(null)
  const [codeLoading, setCodeLoading] = useState(false)
  const [codeError, setCodeError] = useState('')
  const [remainingTime, setRemainingTime] = useState('')
  const [connectedGuardians, setConnectedGuardians] = useState<
    { linkId: string; name: string; email: string }[]
  >([])

  const progress = getTodayProgress(medications, logs)

  // DB 연결 정보 로드
  const loadInviteInfo = useCallback(async () => {
    try {
      const res = await fetch('/api/invite')
      if (res.ok) {
        const data = await res.json()
        if (data.activeCode) {
          setInviteCode(data.activeCode.inviteCode)
          setCodeExpiresAt(data.activeCode.expiresAt)
        } else {
          setInviteCode(null)
          setCodeExpiresAt(null)
        }
        setConnectedGuardians(data.guardians || [])
      }
    } catch {
      // 무시
    }
  }, [])

  useEffect(() => {
    loadInviteInfo()
  }, [loadInviteInfo])

  // 카운트다운
  useEffect(() => {
    if (!codeExpiresAt) { setRemainingTime(''); return }
    const update = () => {
      const diff = new Date(codeExpiresAt).getTime() - Date.now()
      if (diff <= 0) {
        setInviteCode(null)
        setCodeExpiresAt(null)
        setRemainingTime('')
        return
      }
      const min = Math.floor(diff / 60000)
      const sec = Math.floor((diff % 60000) / 1000)
      setRemainingTime(`${min}:${sec.toString().padStart(2, '0')}`)
    }
    update()
    const timer = setInterval(update, 1000)
    return () => clearInterval(timer)
  }, [codeExpiresAt])

  const handleCreateCode = async (forceNew = false) => {
    setCodeLoading(true)
    setCodeError('')
    try {
      const res = await fetch('/api/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ forceNew }),
      })
      const data = await res.json()
      if (res.ok) {
        setInviteCode(data.inviteCode)
        setCodeExpiresAt(data.expiresAt)
      } else {
        setCodeError(data.error || '코드 생성에 실패했어요')
      }
    } catch {
      setCodeError('코드 생성 중 오류가 발생했어요')
    }
    setCodeLoading(false)
  }

  const handleShareCode = () => {
    if (!inviteCode) return
    const msg = `[오늘안심] 보호자 연결 초대\n\n초대 코드: ${inviteCode}\n\n오늘안심 앱의 보호자 모드에서 이 코드를 입력하면 연결됩니다.\n(10분 내 입력해주세요)`
    if (navigator.share) {
      navigator.share({ title: '오늘안심 초대 코드', text: msg }).catch(() => {
        window.location.href = `sms:?body=${encodeURIComponent(msg)}`
      })
    } else {
      window.location.href = `sms:?body=${encodeURIComponent(msg)}`
    }
  }

  const handleAdd = () => {
    setAddError('')
    if (!name.trim()) { setAddError('이름을 입력해주세요.'); return }
    if (!phone.trim()) { setAddError('전화번호를 입력해주세요.'); return }
    const cleanPhone = phone.trim().replace(/\D/g, '')
    if (cleanPhone.length < 10 || cleanPhone.length > 11) {
      setAddError('전화번호를 다시 확인해주세요. (예: 010-1234-5678)')
      return
    }
    addGuardian({ name: name.trim(), phone: cleanPhone, relationship: relationship.trim() || '가족' })
    setName(''); setPhone(''); setRelationship(''); setAddError('')
    setShowAdd(false)
  }

  const sendSafety = (guardianPhone: string, guardianName: string) => {
    const msg = `[오늘안심] 어르신 안부 알림\n오늘 약: ${progress.taken}/${progress.total} 완료\n현재 상태: 괜찮아요`
    if (navigator.share) {
      navigator.share({ title: '오늘안심 안부', text: msg }).catch(() => {
        window.location.href = `sms:${guardianPhone}?body=${encodeURIComponent(msg)}`
      })
    } else {
      window.location.href = `sms:${guardianPhone}?body=${encodeURIComponent(msg)}`
    }
    setSentMessage(`${guardianName}에게 안부를 보냈어요!`)
    setTimeout(() => setSentMessage(''), 3000)
  }

  return (
    <>
      <section className="mt-2 mb-4 px-1">
        <h2 className="text-2xl font-bold">보호자 연결</h2>
        <p className="text-muted mt-1">가족과 연결하고 안부를 보내세요</p>
      </section>

      {sentMessage && (
        <div className="bg-primary-light text-primary rounded-xl p-4 mb-4 text-center font-bold">
          {sentMessage}
        </div>
      )}

      {/* 연결된 보호자 (DB) */}
      {connectedGuardians.length > 0 && (
        <SectionCard title={`연결된 보호자 (${connectedGuardians.length}명)`} icon="✅" className="mb-4">
          <div className="space-y-2">
            {connectedGuardians.map(g => (
              <div key={g.linkId} className="flex items-center gap-3 bg-background rounded-xl p-3">
                <span className="text-2xl">👤</span>
                <div className="flex-1 min-w-0">
                  <p className="font-bold">{g.name}</p>
                  <p className="text-sm text-muted truncate">{g.email}</p>
                </div>
                <StatusBadge variant="success">연결됨</StatusBadge>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {/* 초대 코드 섹션 */}
      <SectionCard title="보호자 초대하기" icon="🔗" className="mb-4">
        {inviteCode ? (
          <div className="text-center">
            <p className="text-muted text-sm mb-3">
              아래 코드를 보호자에게 알려주세요
            </p>
            <div className="bg-background border-2 border-primary rounded-2xl py-5 px-4 mb-3">
              <p className="text-4xl font-bold tracking-[0.3em] text-primary">
                {inviteCode}
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 mb-4">
              <span className="text-sm text-muted">남은 시간</span>
              <span className="text-sm font-bold text-danger">{remainingTime}</span>
            </div>
            <div className="flex gap-2">
              <BigButton fullWidth variant="primary" icon="📩" onClick={handleShareCode}>
                문자로 보내기
              </BigButton>
              <BigButton fullWidth variant="secondary" icon="🔄" onClick={() => handleCreateCode(true)} loading={codeLoading}>
                새 코드
              </BigButton>
            </div>
          </div>
        ) : (
          <div className="text-center">
            <p className="text-muted text-sm mb-4 leading-relaxed">
              초대 코드를 만들어서 보호자에게 전달하면<br />
              보호자 앱에서 연결할 수 있어요
            </p>
            <BigButton fullWidth variant="primary" icon="🔑" onClick={() => handleCreateCode(false)} loading={codeLoading}>
              초대 코드 만들기
            </BigButton>
            {codeError && <p className="text-danger text-sm font-bold mt-2">{codeError}</p>}
          </div>
        )}
      </SectionCard>

      {/* 오늘 상태 */}
      <SectionCard title="오늘 상태" icon="📊" className="mb-4">
        <div className="flex items-center justify-between">
          <span>약 복용</span>
          <StatusBadge variant={progress.taken === progress.total ? 'success' : 'warning'}>
            {progress.taken}/{progress.total} 완료
          </StatusBadge>
        </div>
      </SectionCard>

      {/* 연락처 기반 보호자 (로컬) - 안부 보내기 용 */}
      <section className="mb-4">
        <div className="flex items-center justify-between mb-2 px-1">
          <h3 className="text-lg font-bold">안부 보내기</h3>
          <button
            onClick={() => setShowAdd(true)}
            className="text-primary font-bold text-sm"
          >
            + 연락처 추가
          </button>
        </div>

        {guardians.length === 0 ? (
          <SectionCard>
            <div className="text-center py-4">
              <p className="text-muted text-sm mb-3">
                보호자 연락처를 추가하면<br />안부 메시지를 간편하게 보낼 수 있어요
              </p>
              <BigButton variant="secondary" icon="➕" onClick={() => setShowAdd(true)}>
                연락처 추가
              </BigButton>
            </div>
          </SectionCard>
        ) : (
          <div className="space-y-3">
            {guardians.map(g => (
              <SectionCard key={g.id}>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-bold text-lg">{g.name}</p>
                    <p className="text-muted text-sm">{g.relationship} · {formatPhone(g.phone)}</p>
                  </div>
                  <button onClick={() => removeGuardian(g.id)} className="text-danger text-sm px-2">삭제</button>
                </div>
                <div className="flex gap-2">
                  <BigButton size="md" variant="primary" icon="💌" fullWidth onClick={() => sendSafety(g.phone, g.name)}>
                    안부 보내기
                  </BigButton>
                  <a
                    href={`tel:${g.phone}`}
                    className="shrink-0 bg-info text-white rounded-2xl px-5 flex items-center justify-center font-bold min-h-[48px] active:scale-95 transition-transform"
                  >
                    📞
                  </a>
                </div>
              </SectionCard>
            ))}
          </div>
        )}
      </section>

      {/* 보호자 등록 모달 */}
      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="연락처 추가">
        <div className="space-y-3">
          <div>
            <label className="text-sm text-muted mb-1 block">이름</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="예: 딸, 아들" className="w-full bg-background border border-border rounded-xl px-4 py-3 text-lg" />
          </div>
          <div>
            <label className="text-sm text-muted mb-1 block">전화번호</label>
            <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="01012345678" className="w-full bg-background border border-border rounded-xl px-4 py-3 text-lg" />
          </div>
          <div>
            <label className="text-sm text-muted mb-1 block">관계</label>
            <div className="flex gap-2">
              {['딸', '아들', '배우자', '기타'].map(r => (
                <button key={r} onClick={() => setRelationship(r)} className={`flex-1 py-3 rounded-xl font-bold border ${relationship === r ? 'bg-primary text-white border-primary' : 'bg-card border-border'}`}>
                  {r}
                </button>
              ))}
            </div>
          </div>
          {addError && <p className="text-danger text-sm font-bold">{addError}</p>}
          <BigButton fullWidth variant="primary" icon="✅" onClick={handleAdd}>추가하기</BigButton>
        </div>
      </Modal>
    </>
  )
}

/* ===== 어르신 복약현황 카드 (보호자용) ===== */
type MedScheduleItem = {
  name: string
  dosage: string
  color: string | null
  time: string
  taken: boolean
  takenAt: string | null
}

function ElderMedicationCard({ elderId, elderName }: { elderId: string; elderName: string }) {
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [taken, setTaken] = useState(0)
  const [schedule, setSchedule] = useState<MedScheduleItem[]>([])
  const [expanded, setExpanded] = useState(true) // 기본 펼침

  const loadMedications = useCallback(async () => {
    try {
      const res = await fetch(`/api/connect/medications?elderId=${elderId}`)
      if (res.ok) {
        const data = await res.json()
        setTotal(data.total)
        setTaken(data.taken)
        setSchedule(data.schedule)
      }
    } catch {
      // 무시
    }
    setLoading(false)
  }, [elderId])

  useEffect(() => {
    loadMedications()
    const timer = setInterval(loadMedications, 60000)
    return () => clearInterval(timer)
  }, [loadMedications])

  const formatTimeStr = (t: string) => {
    const [h, m] = t.split(':').map(Number)
    const period = h < 12 ? '오전' : '오후'
    const hour = h === 0 ? 12 : h > 12 ? h - 12 : h
    return `${period} ${hour}:${m.toString().padStart(2, '0')}`
  }

  const now = new Date()
  const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
  const missed = schedule.filter(s => !s.taken && s.time < currentTime)

  if (loading) {
    return (
      <div className="bg-card rounded-2xl p-4 mb-3 border border-border animate-pulse">
        <div className="flex items-center gap-3">
          <span className="text-3xl">👴</span>
          <div>
            <p className="font-bold text-lg">{elderName}</p>
            <p className="text-sm text-muted">불러오는 중...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-card rounded-2xl p-4 mb-3 border border-border">
      <button className="w-full text-left" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center gap-3">
          <span className="text-3xl">👴</span>
          <div className="flex-1">
            <p className="font-bold text-lg">{elderName}</p>
            <div className="flex items-center gap-2 mt-1">
              <StatusBadge variant={taken === total && total > 0 ? 'success' : missed.length > 0 ? 'danger' : 'warning'}>
                {taken}/{total} 완료
              </StatusBadge>
              {missed.length > 0 && (
                <span className="text-xs text-danger font-bold">놓친 약 {missed.length}건</span>
              )}
            </div>
          </div>
          <span className={`text-xl text-muted transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}>▼</span>
        </div>
      </button>

      {expanded && (
        <div className="mt-3 pt-3 border-t border-border space-y-2">
          {total === 0 ? (
            <p className="text-muted text-sm text-center py-2">등록된 약이 없어요</p>
          ) : (
            schedule.map((s, i) => {
              const isMissed = !s.taken && s.time < currentTime
              return (
                <div key={i} className={`flex items-center gap-3 rounded-xl p-3 ${s.taken ? 'bg-primary/5' : isMissed ? 'bg-danger/5' : 'bg-background'}`}>
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: s.color || '#4a90d9' }} />
                  <div className="flex-1 min-w-0">
                    <p className={`font-bold ${s.taken ? 'text-muted line-through' : ''}`}>{s.name}</p>
                    <p className="text-xs text-muted">{s.dosage}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold">{formatTimeStr(s.time)}</p>
                    {s.taken ? (
                      <p className="text-xs text-primary">복용 완료</p>
                    ) : isMissed ? (
                      <p className="text-xs text-danger font-bold">미복용</p>
                    ) : (
                      <p className="text-xs text-muted">예정</p>
                    )}
                  </div>
                </div>
              )
            })
          )}
          <button
            onClick={(e) => { e.stopPropagation(); setLoading(true); loadMedications() }}
            className="w-full text-center text-sm text-primary font-bold py-2 active:opacity-60"
          >
            새로고침
          </button>
        </div>
      )}
    </div>
  )
}

/* ===== 보호자 모드: 어르신 연결 + 복약현황 + 연락처 ===== */
function GuardianElderPage() {
  const { elderContacts, addElderContact, removeElderContact } = useUserStore()
  const [inviteCode, setInviteCode] = useState('')
  const [connecting, setConnecting] = useState(false)
  const [message, setMessage] = useState('')
  const [connectedElders, setConnectedElders] = useState<
    { linkId: string; elderId: string; name: string; email: string }[]
  >([])
  const [loading, setLoading] = useState(true)

  // 연락처 추가 모달
  const [showAddContact, setShowAddContact] = useState(false)
  const [contactName, setContactName] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [contactRelation, setContactRelation] = useState('')
  const [contactError, setContactError] = useState('')

  const loadElders = useCallback(async () => {
    try {
      const res = await fetch('/api/connect')
      if (res.ok) {
        const data = await res.json()
        setConnectedElders(data.elders || [])
      }
    } catch {
      // 무시
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    loadElders()
  }, [loadElders])

  const handleConnect = async () => {
    if (!inviteCode.trim() || inviteCode.trim().length !== 6) {
      setMessage('6자리 초대 코드를 입력해주세요')
      return
    }
    setConnecting(true)
    try {
      const res = await fetch('/api/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteCode: inviteCode.trim().toUpperCase() }),
      })
      const data = await res.json()
      if (res.ok) {
        setMessage(`${data.elderName}님과 연결되었습니다!`)
        setInviteCode('')
        loadElders()
      } else {
        setMessage(data.error || '연결에 실패했어요')
      }
    } catch {
      setMessage('연결 중 오류가 발생했어요')
    }
    setConnecting(false)
    setTimeout(() => setMessage(''), 5000)
  }

  const handleAddContact = () => {
    setContactError('')
    if (!contactName.trim()) { setContactError('이름을 입력해주세요.'); return }
    if (!contactPhone.trim()) { setContactError('전화번호를 입력해주세요.'); return }
    const clean = contactPhone.trim().replace(/\D/g, '')
    if (clean.length < 10 || clean.length > 11) {
      setContactError('전화번호를 다시 확인해주세요.')
      return
    }
    addElderContact({ name: contactName.trim(), phone: clean, relationship: contactRelation.trim() || '어르신' })
    setContactName(''); setContactPhone(''); setContactRelation(''); setContactError('')
    setShowAddContact(false)
  }

  const sendMessage = (phone: string, name: string) => {
    const msg = `[오늘안심] ${name}님, 안녕하세요. 오늘 하루도 건강하세요!`
    if (navigator.share) {
      navigator.share({ title: '오늘안심', text: msg }).catch(() => {
        window.location.href = `sms:${phone}?body=${encodeURIComponent(msg)}`
      })
    } else {
      window.location.href = `sms:${phone}?body=${encodeURIComponent(msg)}`
    }
  }

  return (
    <>
      <section className="mt-2 mb-4 px-1">
        <h2 className="text-2xl font-bold">어르신 관리</h2>
        <p className="text-muted mt-1">돌보는 어르신의 복약 현황을 확인하세요</p>
      </section>

      {/* 연결된 어르신 복약현황 */}
      {!loading && connectedElders.length > 0 && (
        <section className="mb-4">
          {connectedElders.map(e => (
            <ElderMedicationCard key={e.elderId} elderId={e.elderId} elderName={e.name} />
          ))}
        </section>
      )}

      {/* 어르신 연락처 */}
      <section className="mb-4">
        <div className="flex items-center justify-between mb-2 px-1">
          <h3 className="text-lg font-bold">어르신 연락처</h3>
          <button onClick={() => setShowAddContact(true)} className="text-primary font-bold text-sm">
            + 추가
          </button>
        </div>

        {elderContacts.length === 0 ? (
          <SectionCard>
            <div className="text-center py-4">
              <p className="text-muted text-sm mb-3">
                어르신 전화번호를 등록하면<br />바로 전화·문자를 보낼 수 있어요
              </p>
              <BigButton variant="secondary" icon="➕" onClick={() => setShowAddContact(true)}>
                연락처 추가
              </BigButton>
            </div>
          </SectionCard>
        ) : (
          <div className="space-y-3">
            {elderContacts.map(c => (
              <SectionCard key={c.id}>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-bold text-lg">{c.name}</p>
                    <p className="text-muted text-sm">{c.relationship} · {formatPhone(c.phone)}</p>
                  </div>
                  <button onClick={() => removeElderContact(c.id)} className="text-danger text-sm px-2">삭제</button>
                </div>
                <div className="flex gap-2">
                  <BigButton size="md" variant="primary" icon="💌" fullWidth onClick={() => sendMessage(c.phone, c.name)}>
                    문자 보내기
                  </BigButton>
                  <a
                    href={`tel:${c.phone}`}
                    className="shrink-0 bg-info text-white rounded-2xl px-5 flex items-center justify-center font-bold min-h-[48px] active:scale-95 transition-transform"
                  >
                    📞
                  </a>
                </div>
              </SectionCard>
            ))}
          </div>
        )}
      </section>

      {/* 초대 코드 입력 */}
      <SectionCard title="어르신 연결하기" icon="🔗" className="mb-4">
        <p className="text-muted text-sm mb-3">
          어르신 앱에서 생성한 6자리 초대 코드를 입력하세요
        </p>
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={inviteCode}
            onChange={e => setInviteCode(e.target.value.toUpperCase())}
            placeholder="초대 코드 6자리"
            maxLength={6}
            className="flex-1 bg-background border border-border rounded-xl px-4 py-3 text-xl text-center font-bold tracking-widest focus:outline-none focus:border-primary"
          />
          <BigButton variant="primary" onClick={handleConnect} loading={connecting} disabled={inviteCode.length !== 6}>
            연결
          </BigButton>
        </div>
        {message && (
          <p className={`text-center font-bold text-sm ${message.includes('연결되었') ? 'text-primary' : 'text-danger'}`}>
            {message}
          </p>
        )}
      </SectionCard>

      {/* 어르신 없을 때 안내 */}
      {!loading && connectedElders.length === 0 && (
        <SectionCard className="mb-4">
          <div className="flex flex-col items-center py-8">
            <p className="text-5xl mb-4" aria-hidden="true">👴</p>
            <p className="text-lg font-bold mb-2">아직 연결된 어르신이 없어요</p>
            <p className="text-muted text-center text-sm leading-relaxed">
              어르신 앱에서 초대 코드를 받아<br />
              위에 입력하면 연결됩니다
            </p>
          </div>
        </SectionCard>
      )}

      {/* 긴급 전화 */}
      <section className="mb-4" aria-label="긴급 전화">
        <a
          href="tel:119"
          aria-label="긴급 전화 119 걸기"
          className="flex items-center justify-center gap-3 bg-danger text-white rounded-2xl py-5 text-xl font-bold shadow-lg transition-all duration-200 hover:bg-danger/90 active:scale-[0.97] min-h-[64px]"
        >
          <span className="text-3xl" aria-hidden="true">🚨</span>
          긴급 전화 (119)
        </a>
      </section>

      {/* 연락처 추가 모달 */}
      <Modal isOpen={showAddContact} onClose={() => setShowAddContact(false)} title="어르신 연락처 추가">
        <div className="space-y-3">
          <div>
            <label className="text-sm text-muted mb-1 block">이름</label>
            <input type="text" value={contactName} onChange={e => setContactName(e.target.value)} placeholder="예: 어머니, 아버지" className="w-full bg-background border border-border rounded-xl px-4 py-3 text-lg" />
          </div>
          <div>
            <label className="text-sm text-muted mb-1 block">전화번호</label>
            <input type="tel" value={contactPhone} onChange={e => setContactPhone(e.target.value)} placeholder="01012345678" className="w-full bg-background border border-border rounded-xl px-4 py-3 text-lg" />
          </div>
          <div>
            <label className="text-sm text-muted mb-1 block">관계</label>
            <div className="flex gap-2">
              {['어머니', '아버지', '할머니', '기타'].map(r => (
                <button key={r} onClick={() => setContactRelation(r)} className={`flex-1 py-3 rounded-xl font-bold border ${contactRelation === r ? 'bg-primary text-white border-primary' : 'bg-card border-border'}`}>
                  {r}
                </button>
              ))}
            </div>
          </div>
          {contactError && <p className="text-danger text-sm font-bold">{contactError}</p>}
          <BigButton fullWidth variant="primary" icon="✅" onClick={handleAddContact}>추가하기</BigButton>
        </div>
      </Modal>
    </>
  )
}

/* ===== 메인: 모드별 분기 ===== */
export default function GuardianPage() {
  const { mode } = useUserStore()

  return (
    <div className="px-4 pb-6">
      <Header />
      {mode === 'elder' ? <ElderGuardianPage /> : <GuardianElderPage />}
    </div>
  )
}
