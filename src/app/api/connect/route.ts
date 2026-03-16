import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// POST: 보호자가 초대 코드로 어르신과 연결
export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({ where: { id: session.user.id } })
    if (!user || user.mode !== 'guardian') {
      return NextResponse.json({ error: '보호자 모드에서만 연결할 수 있습니다' }, { status: 403 })
    }

    const { inviteCode } = await req.json()
    if (!inviteCode || typeof inviteCode !== 'string' || inviteCode.length !== 6) {
      return NextResponse.json({ error: '올바른 6자리 초대 코드를 입력해주세요' }, { status: 400 })
    }

    // 초대 코드 조회
    const link = await prisma.elderGuardianLink.findUnique({
      where: { inviteCode: inviteCode.toUpperCase() },
      include: { elder: { select: { id: true, name: true } } },
    })

    if (!link) {
      return NextResponse.json({ error: '존재하지 않는 초대 코드예요' }, { status: 404 })
    }

    if (link.status !== 'pending') {
      return NextResponse.json({ error: '이미 사용된 초대 코드예요' }, { status: 400 })
    }

    if (link.expiresAt && link.expiresAt < new Date()) {
      return NextResponse.json({ error: '만료된 초대 코드예요. 어르신에게 새 코드를 요청하세요.' }, { status: 400 })
    }

    if (link.elderId === user.id) {
      return NextResponse.json({ error: '본인의 초대 코드에는 연결할 수 없어요' }, { status: 400 })
    }

    // 이미 연결된 관계인지 확인
    const alreadyLinked = await prisma.elderGuardianLink.findFirst({
      where: {
        elderId: link.elderId,
        guardianId: user.id,
        status: 'active',
      },
    })

    if (alreadyLinked) {
      // 이 pending 코드는 삭제
      await prisma.elderGuardianLink.delete({ where: { id: link.id } })
      return NextResponse.json({ error: '이미 연결된 어르신이에요' }, { status: 400 })
    }

    // 연결 완료: pending 레코드를 active로 업데이트
    await prisma.elderGuardianLink.update({
      where: { id: link.id },
      data: {
        guardianId: user.id,
        status: 'active',
        inviteCode: null,
        expiresAt: null,
      },
    })

    return NextResponse.json({
      elderName: link.elder.name,
      elderId: link.elder.id,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[connect] POST error:', message)
    return NextResponse.json({ error: '연결 중 오류가 발생했어요. 다시 시도해주세요.' }, { status: 500 })
  }
}

// GET: 보호자의 연결된 어르신 목록
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 })
    }

    const links = await prisma.elderGuardianLink.findMany({
      where: {
        guardianId: session.user.id,
        status: 'active',
      },
      include: {
        elder: { select: { id: true, name: true, email: true } },
      },
    })

    return NextResponse.json({
      elders: links.map(l => ({
        linkId: l.id,
        elderId: l.elder.id,
        name: l.elder.name,
        email: l.elder.email,
        connectedAt: l.createdAt,
      })),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
