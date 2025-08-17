import { PrismaClient } from "@prisma/client"
import { UserRole, JobType, AvailabilityStatus } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  // Create skills
  const skills = await Promise.all([
    prisma.skill.upsert({
      where: { name: "JavaScript" },
      update: {},
      create: { name: "JavaScript", category: "Programming" },
    }),
    prisma.skill.upsert({
      where: { name: "TypeScript" },
      update: {},
      create: { name: "TypeScript", category: "Programming" },
    }),
    prisma.skill.upsert({
      where: { name: "React" },
      update: {},
      create: { name: "React", category: "Frontend" },
    }),
    prisma.skill.upsert({
      where: { name: "Node.js" },
      update: {},
      create: { name: "Node.js", category: "Backend" },
    }),
    prisma.skill.upsert({
      where: { name: "Python" },
      update: {},
      create: { name: "Python", category: "Programming" },
    }),
    prisma.skill.upsert({
      where: { name: "AWS" },
      update: {},
      create: { name: "AWS", category: "Cloud" },
    }),
    prisma.skill.upsert({
      where: { name: "Docker" },
      update: {},
      create: { name: "Docker", category: "DevOps" },
    }),
    prisma.skill.upsert({
      where: { name: "PostgreSQL" },
      update: {},
      create: { name: "PostgreSQL", category: "Database" },
    }),
  ])

  // Create test users
  const contractor = await prisma.user.upsert({
    where: { email: "contractor@example.com" },
    update: {},
    create: {
      email: "contractor@example.com",
      name: "John Contractor",
      role: UserRole.USER,
      title: "Senior Full Stack Developer",
      bio: "Experienced developer with 10+ years in web development",
      location: "San Francisco, CA",
      hourlyRateMin: 100,
      hourlyRateMax: 150,
      availability: AvailabilityStatus.AVAILABLE,
    },
  })

  const employer = await prisma.user.upsert({
    where: { email: "employer@example.com" },
    update: {},
    create: {
      email: "employer@example.com",
      name: "Jane Employer",
      role: UserRole.USER,
      title: "Engineering Manager",
      bio: "Hiring manager at TechCorp",
      location: "New York, NY",
    },
  })

  // Add skills to contractor
  await Promise.all([
    prisma.userSkill.create({
      data: {
        userId: contractor.id,
        skillId: skills[0].id, // JavaScript
      },
    }).catch(() => {}), // Ignore if already exists
    prisma.userSkill.create({
      data: {
        userId: contractor.id,
        skillId: skills[1].id, // TypeScript
      },
    }).catch(() => {}),
    prisma.userSkill.create({
      data: {
        userId: contractor.id,
        skillId: skills[2].id, // React
      },
    }).catch(() => {}),
  ])

  // Create sample jobs
  const jobs = await Promise.all([
    prisma.job.create({
      data: {
        title: "Senior React Developer",
        description: `We're looking for an experienced React developer to help build our next-generation web application.
        
        Requirements:
        - 5+ years of React experience
        - Strong TypeScript skills
        - Experience with modern state management
        - Excellent communication skills
        
        This is a 6-month contract with possibility of extension.`,
        company: "TechCorp",
        location: "Remote",
        isRemote: true,
        jobType: JobType.CONTRACT,
        hourlyRateMin: 100,
        hourlyRateMax: 130,
        contractDuration: "6 months",
        hoursPerWeek: 40,
        applicationEmail: "jobs@techcorp.com",
        postedById: employer.id,
        jobSkills: {
          create: [
            { skillId: skills[2].id }, // React
            { skillId: skills[1].id }, // TypeScript
            { skillId: skills[0].id }, // JavaScript
          ],
        },
      },
    }),
    prisma.job.create({
      data: {
        title: "Backend Node.js Developer",
        description: `Join our team to build scalable backend services using Node.js and AWS.
        
        What you'll do:
        - Design and implement RESTful APIs
        - Work with PostgreSQL databases
        - Deploy services to AWS
        - Collaborate with frontend team
        
        3-month contract with competitive rates.`,
        company: "StartupXYZ",
        location: "San Francisco, CA",
        isRemote: false,
        jobType: JobType.CONTRACT,
        hourlyRateMin: 90,
        hourlyRateMax: 120,
        contractDuration: "3 months",
        hoursPerWeek: 40,
        applicationUrl: "https://startupxyz.com/apply",
        postedById: employer.id,
        jobSkills: {
          create: [
            { skillId: skills[3].id }, // Node.js
            { skillId: skills[5].id }, // AWS
            { skillId: skills[7].id }, // PostgreSQL
          ],
        },
      },
    }),
    prisma.job.create({
      data: {
        title: "Python Data Engineer",
        description: `We need a Python developer to help with our data pipeline infrastructure.
        
        Responsibilities:
        - Build ETL pipelines
        - Work with large datasets
        - Optimize data processing workflows
        - Document technical solutions
        
        Part-time contract, 20 hours per week.`,
        company: "DataCo",
        location: "Austin, TX",
        isRemote: true,
        jobType: JobType.PART_TIME,
        hourlyRateMin: 80,
        hourlyRateMax: 100,
        contractDuration: "Ongoing",
        hoursPerWeek: 20,
        applicationEmail: "hiring@dataco.com",
        postedById: employer.id,
        jobSkills: {
          create: [
            { skillId: skills[4].id }, // Python
            { skillId: skills[7].id }, // PostgreSQL
            { skillId: skills[5].id }, // AWS
          ],
        },
      },
    }),
  ])

  console.log("Seed data created successfully!")
  console.log(`Created ${skills.length} skills`)
  console.log(`Created ${jobs.length} jobs`)
  console.log(`Created 2 users (contractor and employer)`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })