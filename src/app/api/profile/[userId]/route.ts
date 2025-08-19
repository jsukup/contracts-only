import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  req: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: params.userId },
      select: {
        id: true,
        name: true,
        title: true,
        bio: true,
        location: true,
        website: true,
        linkedinUrl: true,
        hourlyRateMin: true,
        hourlyRateMax: true,
        availability: true,
        image: true,
        createdAt: true,
        userSkills: {
          include: {
            skill: true
          }
        },
        // Don't include sensitive data
        email: false,
        role: false
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json(user)
  } catch (error) {
    console.error('Error fetching user profile:', error)
    return NextResponse.json(
      { error: 'Failed to fetch user profile' },
      { status: 500 }
    )
  }
}