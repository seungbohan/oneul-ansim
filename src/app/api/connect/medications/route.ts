import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET: 보호자가 연결된 어르신의 오늘 복약 현황 조회
export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 })
    }

    const elderId = req.nextUrl.searchParams.get('elderId')
    if (!elderId) {
      return NextResponse.json({ error: 'elderId가 필요합니다' }, { status: 400 })
    }

    // 이 보호자가 해당 어르신과 연결되어 있는지 확인
    const link = await prisma.elderGuardianLink.findFirst({
      where: {
        elderId,
        guardianId: session.user.id,
        status: 'active',
      },
    })

    if (!link) {
      return NextResponse.json({ error: '연결되지 않은 어르신입니다' }, { status: 403 })
    }

    // 오늘 날짜 (KST)
    const now = new Date()
    const kstOffset = 9 * 60 * 60 * 1000
    const kstNow = new Date(now.getTime() + kstOffset)
    const todayStr = kstNow.toISOString().slice(0, 10) // YYYY-MM-DD
    const todayStart = new Date(todayStr + 'T00:00:00+09:00')
    const todayEnd = new Date(todayStr + 'T23:59:59+09:00')

    // 어르신의 약 목록
    const medications = await prisma.medication.findMany({
      where: { userId: elderId },
    })

    // 오늘 복약 로그
    const logs = await prisma.medicationLog.findMany({
      where: {
        userId: elderId,
        date: {
          gte: todayStart,
          lte: todayEnd,
        },
      },
    })

    // 오늘 요일 (0=일, 6=토)
    const todayDow = kstNow.getDay()

    // 오늘 복용해야 할 약+시간 목록
    const todaySchedule: {
      medicationId: string
      name: string
      dosage: string
      color: string | null
      time: string
      taken: boolean
      takenAt: string | null
    }[] = []

    for (const med of medications) {
      if (!med.daysOfWeek.includes(todayDow)) continue
      for (const time of med.scheduledTimes) {
        const log = logs.find(
          l => l.medicationId === med.id && l.scheduledTime === time
        )
        todaySchedule.push({
          medicationId: med.id,
          name: med.name,
          dosage: med.dosage,
          color: med.color,
          time,
          taken: !!log?.takenAt,
          takenAt: log?.takenAt?.toISOString() ?? null,
        })
      }
    }

    // 시간순 정렬
    todaySchedule.sort((a, b) => a.time.localeCompare(b.time))

    const total = todaySchedule.length
    const taken = todaySchedule.filter(s => s.taken).length

    return NextResponse.json({
      elderId,
      date: todayStr,
      total,
      taken,
      schedule: todaySchedule,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
