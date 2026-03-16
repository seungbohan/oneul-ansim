import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// 6자리 영숫자 코드 생성
function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // 혼동 문자 제외 (0,O,1,I)
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

// POST: 초대 코드 생성 (어르신 전용)
export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({ where: { id: session.user.id } })
    if (!user || user.mode !== 'elder') {
      return NextResponse.json({ error: '어르신 모드에서만 초대 코드를 생성할 수 있습니다' }, { status: 403 })
    }

    // body에서 forceNew 여부 확인
    let forceNew = false
    try {
      const body = await req.json()
      forceNew = body?.forceNew === true
    } catch {
      // body 없으면 무시
    }

    // 기존 미사용(pending) 코드가 아직 유효하면 재사용 (forceNew가 아닌 경우)
    if (!forceNew) {
      const existing = await prisma.elderGuardianLink.findFirst({
        where: {
          elderId: user.id,
          status: 'pending',
          expiresAt: { gt: new Date() },
        },
      })

      if (existing) {
        return NextResponse.json({
          inviteCode: existing.inviteCode,
          expiresAt: existing.expiresAt,
        })
      }
    }

    // 기존 pending 코드 모두 정리 (만료 + forceNew일 때 유효한 것도)
    await prisma.elderGuardianLink.deleteMany({
      where: {
        elderId: user.id,
        status: 'pending',
      },
    })

    // 새 코드 생성 (중복 방지 루프)
    let code: string
    let attempts = 0
    do {
      code = generateCode()
      const dup = await prisma.elderGuardianLink.findUnique({ where: { inviteCode: code } })
      if (!dup) break
      attempts++
    } while (attempts < 10)

    if (attempts >= 10) {
      return NextResponse.json({ error: '코드 생성에 실패했습니다. 다시 시도해주세요.' }, { status: 500 })
    }

    const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10분 유효

    const link = await prisma.elderGuardianLink.create({
      data: {
        elderId: user.id,
        inviteCode: code,
        status: 'pending',
        expiresAt,
      },
    })

    return NextResponse.json({
      inviteCode: link.inviteCode,
      expiresAt: link.expiresAt,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// GET: 내 초대 코드 + 연결된 보호자 목록 조회
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 })
    }

    const userId = session.user.id

    // 활성 초대 코드 (pending + 유효기간 내)
    const pendingCode = await prisma.elderGuardianLink.findFirst({
      where: {
        elderId: userId,
        status: 'pending',
        expiresAt: { gt: new Date() },
      },
    })

    // 연결된 보호자 목록
    const connectedLinks = await prisma.elderGuardianLink.findMany({
      where: {
        elderId: userId,
        status: 'active',
      },
      include: {
        guardian: { select: { id: true, name: true, email: true } },
      },
    })

    return NextResponse.json({
      activeCode: pendingCode ? {
        inviteCode: pendingCode.inviteCode,
        expiresAt: pendingCode.expiresAt,
      } : null,
      guardians: connectedLinks.map(l => ({
        linkId: l.id,
        guardianId: l.guardian?.id,
        name: l.guardian?.name,
        email: l.guardian?.email,
        connectedAt: l.createdAt,
      })),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
