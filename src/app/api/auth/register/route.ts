import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function POST(req: NextRequest) {
  try {
    const { username, password, name, mode } = await req.json()

    if (!username || !password || !name || !mode) {
      return NextResponse.json(
        { error: '모든 항목을 입력해주세요' },
        { status: 400 }
      )
    }

    if (username.length < 4) {
      return NextResponse.json(
        { error: '아이디는 4자 이상이어야 해요' },
        { status: 400 }
      )
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return NextResponse.json(
        { error: '아이디는 영문, 숫자, 밑줄(_)만 사용할 수 있어요' },
        { status: 400 }
      )
    }

    const existing = await prisma.user.findUnique({ where: { username } })
    if (existing) {
      return NextResponse.json(
        { error: '이미 사용 중인 아이디예요' },
        { status: 409 }
      )
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    const user = await prisma.user.create({
      data: {
        username,
        password: hashedPassword,
        name,
        mode,
        isOnboarded: false,
      },
    })

    return NextResponse.json({
      id: user.id,
      username: user.username,
      name: user.name,
      mode: user.mode,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('회원가입 오류:', message)
    return NextResponse.json(
      { error: `회원가입 실패: ${message}` },
      { status: 500 }
    )
  }
}
