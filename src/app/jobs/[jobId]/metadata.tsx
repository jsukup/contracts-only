// Server-side metadata generation for job detail pages
import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { generateMetadata as generateSEOMetadata, StructuredData } from '@/lib/seo'

interface Props {
  params: { jobId: string }
  searchParams: { [key: string]: string | string[] | undefined }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    // Fetch job data for metadata
    const job = await prisma.job.findUnique({
      where: { id: params.jobId },
      include: {
        postedBy: {
          select: {
            name: true,
            title: true,
          }
        },
        jobSkills: {
          include: {
            skill: {
              select: {
                name: true,
              }
            }
          }
        },
        _count: {
          select: {
            applications: true,
          }
        }
      }
    })

    if (!job) {
      return {
        title: 'Job Not Found | ContractsOnly',
        description: 'The requested job posting could not be found.',
      }
    }

    // Generate SEO-optimized title and description
    const skills = job.jobSkills.map(js => js.skill.name).join(', ')
    const location = job.isRemote ? 'Remote' : (job.location || 'Location TBD')
    const rateRange = `$${job.hourlyRateMin}-$${job.hourlyRateMax}/hr`
    
    const title = `${job.title} - ${location} ${rateRange} | ContractsOnly`
    const description = `${job.title} contract position at ${job.company}. ${location} work, ${rateRange}. ${skills ? `Skills: ${skills}. ` : ''}${job.description.slice(0, 100)}...`

    return generateSEOMetadata({
      title,
      description,
      keywords: [
        job.title.toLowerCase(),
        job.company.toLowerCase(),
        'contract job',
        'freelance',
        'remote work',
        location.toLowerCase(),
        ...job.jobSkills.map(js => js.skill.name.toLowerCase())
      ],
      url: `/jobs/${job.id}`,
      type: 'article',
      publishedTime: job.createdAt.toISOString(),
      modifiedTime: job.updatedAt.toISOString(),
      author: job.postedBy.name,
    })
  } catch (error) {
    console.error('Error generating job metadata:', error)
    return {
      title: 'Job Details | ContractsOnly',
      description: 'Find your next contract job on ContractsOnly.',
    }
  }
}

// Generate structured data for the job posting
export async function generateJobStructuredData(jobId: string) {
  try {
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: {
        postedBy: {
          select: {
            name: true,
            title: true,
          }
        },
        jobSkills: {
          include: {
            skill: {
              select: {
                name: true,
              }
            }
          }
        }
      }
    })

    if (!job) return null

    return StructuredData.jobPosting({
      id: job.id,
      title: job.title,
      description: job.description,
      company: job.company,
      location: job.location,
      createdAt: job.createdAt.toISOString(),
      expiresAt: job.expiresAt.toISOString(),
      type: job.jobType,
      hourlyRateMin: job.hourlyRateMin,
      hourlyRateMax: job.hourlyRateMax,
      hoursPerWeek: job.hoursPerWeek,
      isRemote: job.isRemote,
      skills: job.jobSkills.map(js => ({ name: js.skill.name })),
      requirements: [], // Add if you have requirements field
    })
  } catch (error) {
    console.error('Error generating job structured data:', error)
    return null
  }
}