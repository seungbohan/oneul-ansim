import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function POST(req: NextRequest) {
  try {
    const { email, password, name, mode } = await req.json()

    if (!email || !password || !name || !mode) {
      return NextResponse.json(
        { error: '모든 항목을 입력해주세요' },
        { status: 400 }
      )
    }

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json(
        { error: '이미 가입된 이메일입니다' },
        { status: 409 }
      )
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        mode,
        isOnboarded: false,
      },
    })

    return NextResponse.json({
      id: user.id,
      email: user.email,
      name: user.name,
      mode: user.mode,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('회원가입 오류:', message, error)
    return NextResponse.json(
      { error: `회원가입 실패: ${message}` },
      { status: 500 }
    )
  }
}
