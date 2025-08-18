import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const category = searchParams.get('category')

    const skills = await prisma.skill.findMany({
      where: category ? { category } : undefined,
      orderBy: [
        { category: 'asc' },
        { name: 'asc' }
      ]
    })

    return NextResponse.json(skills)
  } catch (error) {
    console.error('Error fetching skills:', error)
    return NextResponse.json(
      { error: 'Failed to fetch skills' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, category } = body

    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { error: 'Invalid skill name' },
        { status: 400 }
      )
    }

    const skill = await prisma.skill.create({
      data: {
        name: name.trim(),
        category: category?.trim()
      }
    })

    return NextResponse.json(skill, { status: 201 })
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return NextResponse.json(
        { error: 'Skill already exists' },
        { status: 409 }
      )
    }
    
    console.error('Error creating skill:', error)
    return NextResponse.json(
      { error: 'Failed to create skill' },
      { status: 500 }
    )
  }
}