import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// POST: 약 동기화 (upsert 방식 - 로그 보존)
export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 })
    }

    const body = await req.json()
    const userId = session.user.id

    // 전체 동기화: { sync: true, medications: [...] }
    if (body.sync) {
      const meds: {
        id: string
        name: string
        dosage: string
        scheduledTimes: string[]
        daysOfWeek: number[]
        color: string
      }[] = body.medications || []

      const localIds = meds.map(m => m.id)

      // 로컬에 없는 약은 DB에서 삭제 (로그도 cascade 삭제)
      if (localIds.length > 0) {
        await prisma.medication.deleteMany({
          where: {
            userId,
            id: { notIn: localIds },
          },
        })
      } else {
        // 로컬에 약이 없으면 DB도 비움
        await prisma.medication.deleteMany({ where: { userId } })
      }

      // 각 약을 upsert (있으면 업데이트, 없으면 생성)
      for (const m of meds) {
        await prisma.medication.upsert({
          where: { id: m.id },
          update: {
            name: m.name,
            dosage: m.dosage,
            scheduledTimes: m.scheduledTimes,
            daysOfWeek: m.daysOfWeek,
            color: m.color || '#4a90d9',
          },
          create: {
            id: m.id,
            userId,
            name: m.name,
            dosage: m.dosage,
            scheduledTimes: m.scheduledTimes,
            daysOfWeek: m.daysOfWeek,
            color: m.color || '#4a90d9',
          },
        })
      }

      return NextResponse.json({ ok: true, count: meds.length })
    }

    // 단건 등록
    const { name, dosage, scheduledTimes, daysOfWeek, color, id } = body
    if (!name || !dosage || !scheduledTimes) {
      return NextResponse.json({ error: '필수 항목이 누락되었습니다' }, { status: 400 })
    }

    const med = await prisma.medication.upsert({
      where: { id: id || 'new' },
      update: { name, dosage, scheduledTimes, daysOfWeek, color },
      create: {
        id: id || undefined,
        userId,
        name,
        dosage,
        scheduledTimes,
        daysOfWeek: daysOfWeek || [0, 1, 2, 3, 4, 5, 6],
        color: color || '#4a90d9',
      },
    })

    return NextResponse.json({ ok: true, medication: med })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[medications] POST error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// DELETE: 약 삭제
export async function DELETE(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 })
    }

    const { id } = await req.json()
    if (!id) {
      return NextResponse.json({ error: 'id가 필요합니다' }, { status: 400 })
    }

    await prisma.medication.deleteMany({
      where: { id, userId: session.user.id },
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
