// Server-side metadata generation for job detail pages
import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase'
import { generateMetadata as generateSEOMetadata, StructuredData } from '@/lib/seo'

interface Props {
  params: { jobId: string }
  searchParams: { [key: string]: string | string[] | undefined }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const supabase = createServerSupabaseClient()
    
    // Fetch job data for metadata
    const { data: job, error } = await supabase
      .from('jobs')
      .select(`
        *,
        users!jobs_poster_id_fkey(name, title),
        job_skills!inner(
          skill_id,
          skills!inner(name)
        )
      `)
      .eq('id', params.jobId)
      .single()

    if (error || !job) {
      return {
        title: 'Job Not Found | ContractsOnly',
        description: 'The requested job posting could not be found.',
      }
    }

    // Generate SEO-optimized title and description
    const skills = job.job_skills?.map(js => js.skills.name).join(', ') || ''
    const location = job.is_remote ? 'Remote' : (job.location || 'Location TBD')
    const rateRange = `$${job.hourly_rate_min}-$${job.hourly_rate_max}/hr`
    
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
        ...job.job_skills.map(js => js.skills.name.toLowerCase())
      ],
      url: `/jobs/${job.id}`,
      type: 'article',
      publishedTime: job.created_at,
      modifiedTime: job.updated_at,
      author: job.users?.name || '',
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
    const supabase = createServerSupabaseClient()
    
    const { data: job, error } = await supabase
      .from('jobs')
      .select(`
        *,
        users!jobs_poster_id_fkey(name, title),
        job_skills!inner(
          skill_id,
          skills!inner(name)
        )
      `)
      .eq('id', jobId)
      .single()

    if (error || !job) return null

    return StructuredData.jobPosting({
      id: job.id,
      title: job.title,
      description: job.description,
      company: job.company,
      location: job.location,
      createdAt: job.created_at,
      expiresAt: job.application_deadline || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      type: job.job_type,
      hourlyRateMin: job.hourly_rate_min,
      hourlyRateMax: job.hourly_rate_max,
      hoursPerWeek: job.hours_per_week,
      isRemote: job.is_remote,
      skills: job.job_skills?.map(js => ({ name: js.skills.name })) || [],
      requirements: [], // Add if you have requirements field
    })
  } catch (error) {
    console.error('Error generating job structured data:', error)
    return null
  }
}