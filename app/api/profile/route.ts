import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        userSkills: {
          include: {
            skill: true
          }
        }
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json(user)
  } catch (error) {
    console.error('Error fetching profile:', error)
    return NextResponse.json(
      { error: 'Failed to fetch profile' },
      { status: 500 }
    )
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const {
      name,
      title,
      bio,
      location,
      website,
      linkedinUrl,
      hourlyRateMin,
      hourlyRateMax,
      availability,
      skills
    } = body

    const user = await prisma.user.update({
      where: { email: session.user.email },
      data: {
        name,
        title,
        bio,
        location,
        website,
        linkedinUrl,
        hourlyRateMin,
        hourlyRateMax,
        availability
      }
    })

    // Update skills if provided
    if (skills && Array.isArray(skills)) {
      // Remove existing skills
      await prisma.userSkill.deleteMany({
        where: { userId: user.id }
      })

      // Add new skills
      if (skills.length > 0) {
        await prisma.userSkill.createMany({
          data: skills.map((skillId: string) => ({
            userId: user.id,
            skillId
          }))
        })
      }
    }

    const updatedUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        userSkills: {
          include: {
            skill: true
          }
        }
      }
    })

    return NextResponse.json(updatedUser)
  } catch (error) {
    console.error('Error updating profile:', error)
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    )
  }
}