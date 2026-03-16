import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// POST: 복용 체크 기록
export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 })
    }

    const { medicationId, scheduledTime, date, takenAt } = await req.json()
    if (!medicationId || !scheduledTime || !date) {
      return NextResponse.json({ error: '필수 항목이 누락되었습니다' }, { status: 400 })
    }

    // upsert: 이미 있으면 업데이트, 없으면 생성
    const dateObj = new Date(date + 'T00:00:00+09:00')
    const log = await prisma.medicationLog.upsert({
      where: {
        medicationId_scheduledTime_date: {
          medicationId,
          scheduledTime,
          date: dateObj,
        },
      },
      update: {
        takenAt: takenAt ? new Date(takenAt) : new Date(),
      },
      create: {
        userId: session.user.id,
        medicationId,
        scheduledTime,
        date: dateObj,
        takenAt: takenAt ? new Date(takenAt) : new Date(),
      },
    })

    return NextResponse.json({ ok: true, log })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[medications/log] POST error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
