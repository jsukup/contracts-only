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
      where: { email: session.user.email }
    })
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    
    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type') || 'sent' // 'sent' or 'received'
    const status = searchParams.get('status')
    
    let applications
    
    if (type === 'sent') {
      // Applications sent by the user
      applications = await prisma.jobApplication.findMany({
        where: {
          userId: user.id,
          ...(status && { status })
        },
        include: {
          job: {
            include: {
              postedBy: {
                select: {
                  id: true,
                  name: true,
                  image: true
                }
              },
              jobSkills: {
                include: {
                  skill: true
                }
              }
            }
          }
        },
        orderBy: {
          appliedAt: 'desc'
        }
      })
    } else {
      // Applications received for user's job postings
      applications = await prisma.jobApplication.findMany({
        where: {
          job: {
            postedById: user.id
          },
          ...(status && { status })
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
              title: true,
              bio: true,
              hourlyRateMin: true,
              hourlyRateMax: true,
              userSkills: {
                include: {
                  skill: true
                }
              }
            }
          },
          job: {
            select: {
              id: true,
              title: true,
              company: true
            }
          }
        },
        orderBy: {
          appliedAt: 'desc'
        }
      })
    }
    
    return NextResponse.json(applications)
  } catch (error) {
    console.error('Error fetching applications:', error)
    return NextResponse.json(
      { error: 'Failed to fetch applications' },
      { status: 500 }
    )
  }
}