import { NextRequest, NextResponse } from 'next/server'

// API Documentation endpoint
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const format = searchParams.get('format') || 'openapi'

  if (format === 'openapi') {
    return NextResponse.json(getOpenAPISpec())
  } else if (format === 'html') {
    return new NextResponse(getHTMLDocumentation(), {
      headers: { 'Content-Type': 'text/html' }
    })
  } else {
    return NextResponse.json({ error: 'Invalid format. Use openapi or html' }, { status: 400 })
  }
}

function getOpenAPISpec() {
  return {
    openapi: '3.0.0',
    info: {
      title: 'ContractsOnly API',
      description: 'REST API for ContractsOnly job board platform specializing in contract positions with transparent hourly rates',
      version: '1.0.0',
      contact: {
        name: 'ContractsOnly Support',
        email: 'support@contractsonly.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'https://contractsonly.com/api',
        description: 'Production server'
      },
      {
        url: 'http://localhost:3000/api',
        description: 'Development server'
      }
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          description: 'NextAuth.js JWT token'
        }
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            email: { type: 'string', format: 'email' },
            name: { type: 'string' },
            role: { type: 'string', enum: ['USER', 'EMPLOYER', 'ADMIN'] },
            bio: { type: 'string', nullable: true },
            location: { type: 'string', nullable: true },
            isRemote: { type: 'boolean' },
            hourlyRateMin: { type: 'number', nullable: true },
            hourlyRateMax: { type: 'number', nullable: true },
            availability: { type: 'string', enum: ['available', 'busy', 'not_looking'] },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        Job: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            title: { type: 'string' },
            description: { type: 'string' },
            company: { type: 'string' },
            category: { type: 'string' },
            location: { type: 'string', nullable: true },
            isRemote: { type: 'boolean' },
            jobType: { type: 'string', enum: ['CONTRACT', 'FREELANCE', 'PART_TIME', 'TEMPORARY'] },
            hourlyRateMin: { type: 'number' },
            hourlyRateMax: { type: 'number' },
            currency: { type: 'string', default: 'USD' },
            contractDuration: { type: 'string', nullable: true },
            hoursPerWeek: { type: 'number', nullable: true },
            experienceLevel: { type: 'string', enum: ['entry', 'mid', 'senior', 'lead'] },
            applicationUrl: { type: 'string', format: 'uri' },
            status: { type: 'string', enum: ['draft', 'open', 'closed', 'filled'] },
            expiresAt: { type: 'string', format: 'date-time' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        Application: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            userId: { type: 'string', format: 'uuid' },
            jobId: { type: 'string', format: 'uuid' },
            status: { type: 'string', enum: ['applied', 'reviewed', 'interview', 'offer', 'rejected', 'withdrawn'] },
            appliedAt: { type: 'string', format: 'date-time' },
            notes: { type: 'string', nullable: true }
          }
        },
        Skill: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            category: { type: 'string', nullable: true },
            isActive: { type: 'boolean' }
          }
        },
        Review: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            reviewerId: { type: 'string', format: 'uuid' },
            revieweeId: { type: 'string', format: 'uuid' },
            jobId: { type: 'string', format: 'uuid' },
            rating: { type: 'integer', minimum: 1, maximum: 5 },
            comment: { type: 'string', nullable: true },
            isPublic: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' }
          }
        },
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' },
            code: { type: 'integer' }
          }
        }
      }
    },
    security: [
      { BearerAuth: [] }
    ],
    paths: {
      '/jobs': {
        get: {
          summary: 'List all jobs',
          description: 'Retrieve a paginated list of contract job postings with filtering and search capabilities',
          parameters: [
            {
              name: 'page',
              in: 'query',
              schema: { type: 'integer', default: 1 },
              description: 'Page number for pagination'
            },
            {
              name: 'limit',
              in: 'query',
              schema: { type: 'integer', default: 20, maximum: 100 },
              description: 'Number of jobs per page'
            },
            {
              name: 'search',
              in: 'query',
              schema: { type: 'string' },
              description: 'Search term for job title, description, or company'
            },
            {
              name: 'category',
              in: 'query',
              schema: { type: 'string' },
              description: 'Filter by job category'
            },
            {
              name: 'isRemote',
              in: 'query',
              schema: { type: 'boolean' },
              description: 'Filter for remote jobs only'
            },
            {
              name: 'minRate',
              in: 'query',
              schema: { type: 'number' },
              description: 'Minimum hourly rate filter'
            },
            {
              name: 'maxRate',
              in: 'query',
              schema: { type: 'number' },
              description: 'Maximum hourly rate filter'
            },
            {
              name: 'skills',
              in: 'query',
              schema: { type: 'string' },
              description: 'Comma-separated list of required skills'
            },
            {
              name: 'sortBy',
              in: 'query',
              schema: { type: 'string', enum: ['createdAt', 'hourlyRateMax', 'applications'], default: 'createdAt' },
              description: 'Sort field'
            },
            {
              name: 'sortOrder',
              in: 'query',
              schema: { type: 'string', enum: ['asc', 'desc'], default: 'desc' },
              description: 'Sort order'
            }
          ],
          responses: {
            '200': {
              description: 'Successfully retrieved jobs',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      jobs: {
                        type: 'array',
                        items: { $ref: '#/components/schemas/Job' }
                      },
                      pagination: {
                        type: 'object',
                        properties: {
                          page: { type: 'integer' },
                          limit: { type: 'integer' },
                          total: { type: 'integer' },
                          totalPages: { type: 'integer' }
                        }
                      }
                    }
                  }
                }
              }
            },
            '400': {
              description: 'Bad request',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' }
                }
              }
            }
          }
        },
        post: {
          summary: 'Create a new job posting',
          description: 'Create a new contract job posting (requires employer role)',
          security: [{ BearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['title', 'description', 'company', 'category', 'jobType', 'hourlyRateMin', 'hourlyRateMax', 'applicationUrl'],
                  properties: {
                    title: { type: 'string', maxLength: 200 },
                    description: { type: 'string' },
                    company: { type: 'string', maxLength: 100 },
                    category: { type: 'string' },
                    location: { type: 'string', nullable: true },
                    isRemote: { type: 'boolean', default: false },
                    jobType: { type: 'string', enum: ['CONTRACT', 'FREELANCE', 'PART_TIME', 'TEMPORARY'] },
                    hourlyRateMin: { type: 'number', minimum: 0 },
                    hourlyRateMax: { type: 'number', minimum: 0 },
                    currency: { type: 'string', default: 'USD' },
                    contractDuration: { type: 'string', nullable: true },
                    hoursPerWeek: { type: 'number', nullable: true },
                    experienceLevel: { type: 'string', enum: ['entry', 'mid', 'senior', 'lead'] },
                    applicationUrl: { type: 'string', format: 'uri' },
                    skills: {
                      type: 'array',
                      items: { type: 'string' },
                      description: 'Array of skill names'
                    }
                  }
                }
              }
            }
          },
          responses: {
            '201': {
              description: 'Job created successfully',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Job' }
                }
              }
            },
            '400': {
              description: 'Validation error',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' }
                }
              }
            },
            '401': {
              description: 'Unauthorized',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' }
                }
              }
            }
          }
        }
      },
      '/jobs/{jobId}': {
        get: {
          summary: 'Get job details',
          description: 'Retrieve detailed information about a specific job posting',
          parameters: [
            {
              name: 'jobId',
              in: 'path',
              required: true,
              schema: { type: 'string', format: 'uuid' },
              description: 'Unique identifier for the job'
            }
          ],
          responses: {
            '200': {
              description: 'Job details retrieved successfully',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Job' }
                }
              }
            },
            '404': {
              description: 'Job not found',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' }
                }
              }
            }
          }
        }
      },
      '/jobs/{jobId}/apply': {
        post: {
          summary: 'Apply to a job',
          description: 'Create an application record and redirect user to external application URL',
          security: [{ BearerAuth: [] }],
          parameters: [
            {
              name: 'jobId',
              in: 'path',
              required: true,
              schema: { type: 'string', format: 'uuid' }
            }
          ],
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    notes: { type: 'string', nullable: true }
                  }
                }
              }
            }
          },
          responses: {
            '201': {
              description: 'Application created successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      application: { $ref: '#/components/schemas/Application' },
                      redirectUrl: { type: 'string', format: 'uri' }
                    }
                  }
                }
              }
            },
            '400': {
              description: 'Bad request (already applied, job closed, etc.)',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' }
                }
              }
            },
            '401': {
              description: 'Authentication required',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' }
                }
              }
            }
          }
        }
      },
      '/profile': {
        get: {
          summary: 'Get current user profile',
          security: [{ BearerAuth: [] }],
          responses: {
            '200': {
              description: 'Profile retrieved successfully',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/User' }
                }
              }
            },
            '401': {
              description: 'Authentication required',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' }
                }
              }
            }
          }
        },
        put: {
          summary: 'Update user profile',
          security: [{ BearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    bio: { type: 'string' },
                    location: { type: 'string' },
                    isRemote: { type: 'boolean' },
                    hourlyRateMin: { type: 'number' },
                    hourlyRateMax: { type: 'number' },
                    availability: { type: 'string', enum: ['available', 'busy', 'not_looking'] },
                    skills: {
                      type: 'array',
                      items: { type: 'string' }
                    }
                  }
                }
              }
            }
          },
          responses: {
            '200': {
              description: 'Profile updated successfully',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/User' }
                }
              }
            },
            '400': {
              description: 'Validation error',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' }
                }
              }
            },
            '401': {
              description: 'Authentication required',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' }
                }
              }
            }
          }
        }
      },
      '/skills': {
        get: {
          summary: 'List all skills',
          description: 'Retrieve list of available skills for job postings and profiles',
          responses: {
            '200': {
              description: 'Skills retrieved successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/Skill' }
                  }
                }
              }
            }
          }
        }
      },
      '/applications': {
        get: {
          summary: 'List user applications',
          description: 'Retrieve applications made by the authenticated user',
          security: [{ BearerAuth: [] }],
          parameters: [
            {
              name: 'status',
              in: 'query',
              schema: { type: 'string', enum: ['applied', 'reviewed', 'interview', 'offer', 'rejected', 'withdrawn'] }
            }
          ],
          responses: {
            '200': {
              description: 'Applications retrieved successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/Application' }
                  }
                }
              }
            },
            '401': {
              description: 'Authentication required',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' }
                }
              }
            }
          }
        }
      },
      '/reviews': {
        get: {
          summary: 'List reviews',
          description: 'Retrieve reviews for a user or job',
          parameters: [
            {
              name: 'userId',
              in: 'query',
              schema: { type: 'string', format: 'uuid' },
              description: 'Get reviews for specific user'
            },
            {
              name: 'jobId',
              in: 'query',
              schema: { type: 'string', format: 'uuid' },
              description: 'Get reviews for specific job'
            }
          ],
          responses: {
            '200': {
              description: 'Reviews retrieved successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/Review' }
                  }
                }
              }
            }
          }
        },
        post: {
          summary: 'Create a review',
          description: 'Leave a review after contract completion',
          security: [{ BearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['revieweeId', 'jobId', 'rating'],
                  properties: {
                    revieweeId: { type: 'string', format: 'uuid' },
                    jobId: { type: 'string', format: 'uuid' },
                    rating: { type: 'integer', minimum: 1, maximum: 5 },
                    comment: { type: 'string', nullable: true },
                    isPublic: { type: 'boolean', default: true }
                  }
                }
              }
            }
          },
          responses: {
            '201': {
              description: 'Review created successfully',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Review' }
                }
              }
            },
            '400': {
              description: 'Validation error or review not allowed',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' }
                }
              }
            },
            '401': {
              description: 'Authentication required',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' }
                }
              }
            }
          }
        }
      },
      '/matching/user/{userId}': {
        get: {
          summary: 'Get job matches for user',
          description: 'Retrieve personalized job recommendations based on user skills and preferences',
          security: [{ BearerAuth: [] }],
          parameters: [
            {
              name: 'userId',
              in: 'path',
              required: true,
              schema: { type: 'string', format: 'uuid' }
            },
            {
              name: 'limit',
              in: 'query',
              schema: { type: 'integer', default: 20, maximum: 50 }
            },
            {
              name: 'minScore',
              in: 'query',
              schema: { type: 'integer', default: 50, minimum: 0, maximum: 100 }
            }
          ],
          responses: {
            '200': {
              description: 'Job matches retrieved successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      matches: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            userId: { type: 'string', format: 'uuid' },
                            jobId: { type: 'string', format: 'uuid' },
                            overallScore: { type: 'integer', minimum: 0, maximum: 100 },
                            skillsScore: { type: 'integer', minimum: 0, maximum: 100 },
                            rateScore: { type: 'integer', minimum: 0, maximum: 100 },
                            locationScore: { type: 'integer', minimum: 0, maximum: 100 },
                            confidence: { type: 'string', enum: ['low', 'medium', 'high'] },
                            reasonsMatched: { type: 'array', items: { type: 'string' } },
                            job: { $ref: '#/components/schemas/Job' }
                          }
                        }
                      },
                      total: { type: 'integer' }
                    }
                  }
                }
              }
            },
            '401': {
              description: 'Authentication required',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' }
                }
              }
            },
            '403': {
              description: 'Access denied - can only view own matches',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' }
                }
              }
            }
          }
        }
      },
      '/analytics': {
        get: {
          summary: 'Get platform analytics',
          description: 'Retrieve comprehensive analytics data (admin only)',
          security: [{ BearerAuth: [] }],
          parameters: [
            {
              name: 'type',
              in: 'query',
              schema: { type: 'string', enum: ['summary', 'jobs', 'users', 'platform'], default: 'summary' }
            },
            {
              name: 'start',
              in: 'query',
              schema: { type: 'string', format: 'date' },
              description: 'Start date for analytics period'
            },
            {
              name: 'end',
              in: 'query',
              schema: { type: 'string', format: 'date' },
              description: 'End date for analytics period'
            }
          ],
          responses: {
            '200': {
              description: 'Analytics data retrieved successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      type: { type: 'string' },
                      dateRange: {
                        type: 'object',
                        nullable: true,
                        properties: {
                          start: { type: 'string', format: 'date-time' },
                          end: { type: 'string', format: 'date-time' }
                        }
                      },
                      data: { type: 'object' },
                      generatedAt: { type: 'string', format: 'date-time' }
                    }
                  }
                }
              }
            },
            '401': {
              description: 'Admin access required',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' }
                }
              }
            }
          }
        }
      }
    }
  }
}

function getHTMLDocumentation() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ContractsOnly API Documentation</title>
    <style>
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
            max-width: 1200px; 
            margin: 0 auto; 
            padding: 20px; 
            line-height: 1.6; 
            color: #333; 
        }
        .header { 
            background: linear-gradient(135deg, #3B82F6 0%, #1E40AF 100%); 
            color: white; 
            padding: 40px; 
            border-radius: 10px; 
            margin-bottom: 30px; 
        }
        .section { 
            background: #f8f9fa; 
            padding: 20px; 
            border-radius: 8px; 
            margin-bottom: 20px; 
        }
        .endpoint { 
            background: white; 
            border: 1px solid #ddd; 
            border-radius: 6px; 
            padding: 15px; 
            margin-bottom: 15px; 
        }
        .method { 
            display: inline-block; 
            padding: 4px 8px; 
            border-radius: 4px; 
            color: white; 
            font-weight: bold; 
            font-size: 12px; 
            margin-right: 10px; 
        }
        .get { background: #28a745; }
        .post { background: #007bff; }
        .put { background: #ffc107; color: #333; }
        .delete { background: #dc3545; }
        code { 
            background: #f1f3f4; 
            padding: 2px 6px; 
            border-radius: 3px; 
            font-family: 'Courier New', monospace; 
        }
        .schema { 
            background: #f8f9fa; 
            border-left: 4px solid #3B82F6; 
            padding: 10px; 
            margin: 10px 0; 
        }
        table { 
            width: 100%; 
            border-collapse: collapse; 
            margin: 10px 0; 
        }
        th, td { 
            border: 1px solid #ddd; 
            padding: 8px; 
            text-align: left; 
        }
        th { 
            background: #f8f9fa; 
            font-weight: 600; 
        }
        .nav { 
            background: white; 
            padding: 15px; 
            border-radius: 8px; 
            margin-bottom: 20px; 
            border: 1px solid #ddd; 
        }
        .nav a { 
            color: #3B82F6; 
            text-decoration: none; 
            margin-right: 20px; 
            font-weight: 500; 
        }
        .nav a:hover { 
            text-decoration: underline; 
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🚀 ContractsOnly API Documentation</h1>
        <p>REST API for the specialized job board platform focusing on contract positions with transparent hourly rates</p>
        <p><strong>Version:</strong> 1.0.0 | <strong>Base URL:</strong> <code>/api</code></p>
    </div>

    <div class="nav">
        <a href="#overview">Overview</a>
        <a href="#authentication">Authentication</a>
        <a href="#jobs">Jobs API</a>
        <a href="#users">Users API</a>
        <a href="#applications">Applications</a>
        <a href="#matching">Job Matching</a>
        <a href="#reviews">Reviews</a>
        <a href="#analytics">Analytics</a>
    </div>

    <div id="overview" class="section">
        <h2>🎯 API Overview</h2>
        <p>The ContractsOnly API provides programmatic access to our job board platform. Key features include:</p>
        <ul>
            <li><strong>Job Listings:</strong> Browse contract opportunities with transparent hourly rates</li>
            <li><strong>User Profiles:</strong> Manage contractor and employer profiles</li>
            <li><strong>Applications:</strong> Track job applications (redirects to external company processes)</li>
            <li><strong>Job Matching:</strong> Get personalized job recommendations</li>
            <li><strong>Reviews & Ratings:</strong> Post-contract feedback system</li>
            <li><strong>Analytics:</strong> Platform insights and performance metrics</li>
        </ul>
        
        <h3>🏗️ Platform Architecture</h3>
        <p>ContractsOnly operates as a <strong>job board</strong>, not a project management platform:</p>
        <ul>
            <li>Companies post contract jobs with transparent rates</li>
            <li>Contractors browse and apply through external company processes</li>
            <li>All hiring, contracts, and payments happen directly between parties</li>
            <li>Platform provides discovery, matching, and reputation services</li>
        </ul>
    </div>

    <div id="authentication" class="section">
        <h2>🔐 Authentication</h2>
        <p>The API uses <strong>NextAuth.js</strong> with JWT tokens for authentication.</p>
        
        <h3>Authorization Header</h3>
        <div class="schema">
            <code>Authorization: Bearer &lt;jwt_token&gt;</code>
        </div>

        <h3>User Roles</h3>
        <table>
            <tr><th>Role</th><th>Description</th><th>Permissions</th></tr>
            <tr><td><code>USER</code></td><td>Contractor/Freelancer</td><td>Browse jobs, apply, manage profile</td></tr>
            <tr><td><code>EMPLOYER</code></td><td>Company/Hiring Manager</td><td>Post jobs, view applications, manage company profile</td></tr>
            <tr><td><code>ADMIN</code></td><td>Platform Administrator</td><td>Full access, analytics, user management</td></tr>
        </table>
    </div>

    <div id="jobs" class="section">
        <h2>💼 Jobs API</h2>
        <p>Manage contract job postings with transparent hourly rates.</p>

        <div class="endpoint">
            <span class="method get">GET</span><strong>/api/jobs</strong>
            <p>List all contract job postings with advanced filtering and search.</p>
            
            <h4>Query Parameters:</h4>
            <table>
                <tr><th>Parameter</th><th>Type</th><th>Description</th></tr>
                <tr><td>search</td><td>string</td><td>Search job titles, descriptions, companies</td></tr>
                <tr><td>category</td><td>string</td><td>Filter by job category</td></tr>
                <tr><td>isRemote</td><td>boolean</td><td>Filter for remote positions only</td></tr>
                <tr><td>minRate</td><td>number</td><td>Minimum hourly rate filter</td></tr>
                <tr><td>maxRate</td><td>number</td><td>Maximum hourly rate filter</td></tr>
                <tr><td>skills</td><td>string</td><td>Comma-separated skill requirements</td></tr>
                <tr><td>page</td><td>integer</td><td>Page number (default: 1)</td></tr>
                <tr><td>limit</td><td>integer</td><td>Results per page (max: 100)</td></tr>
            </table>
        </div>

        <div class="endpoint">
            <span class="method post">POST</span><strong>/api/jobs</strong> 🔐
            <p>Create a new job posting (employers only).</p>
            
            <h4>Required Fields:</h4>
            <div class="schema">
                <code>title, description, company, category, jobType, hourlyRateMin, hourlyRateMax, applicationUrl</code>
            </div>
        </div>

        <div class="endpoint">
            <span class="method get">GET</span><strong>/api/jobs/{jobId}</strong>
            <p>Get detailed information about a specific job posting.</p>
        </div>

        <div class="endpoint">
            <span class="method post">POST</span><strong>/api/jobs/{jobId}/apply</strong> 🔐
            <p>Apply to a job (creates application record and redirects to company's application URL).</p>
        </div>
    </div>

    <div id="users" class="section">
        <h2>👥 Users & Profiles API</h2>
        <p>Manage user profiles for contractors and employers.</p>

        <div class="endpoint">
            <span class="method get">GET</span><strong>/api/profile</strong> 🔐
            <p>Get current user's profile information.</p>
        </div>

        <div class="endpoint">
            <span class="method put">PUT</span><strong>/api/profile</strong> 🔐
            <p>Update user profile (bio, skills, rates, availability, etc.).</p>
        </div>

        <div class="endpoint">
            <span class="method get">GET</span><strong>/api/profile/{userId}</strong>
            <p>Get public profile information for any user.</p>
        </div>
    </div>

    <div id="applications" class="section">
        <h2>📋 Applications API</h2>
        <p>Track job applications and their status.</p>

        <div class="endpoint">
            <span class="method get">GET</span><strong>/api/applications</strong> 🔐
            <p>List applications made by the authenticated user.</p>
            
            <h4>Application Flow:</h4>
            <ol>
                <li>User clicks "Apply Now" on a job</li>
                <li>Application record created in ContractsOnly</li>
                <li>User redirected to company's external application URL</li>
                <li>All hiring communication happens directly with company</li>
                <li>Status updates tracked when possible</li>
            </ol>
        </div>
    </div>

    <div id="matching" class="section">
        <h2>🎯 Job Matching API</h2>
        <p>Intelligent job recommendations based on skills, rates, and preferences.</p>

        <div class="endpoint">
            <span class="method get">GET</span><strong>/api/matching/user/{userId}</strong> 🔐
            <p>Get personalized job matches for a user.</p>
            
            <h4>Match Scoring:</h4>
            <ul>
                <li><strong>Skills Match (30%):</strong> Alignment with required skills</li>
                <li><strong>Rate Match (20%):</strong> Hourly rate compatibility</li>
                <li><strong>Location Match (15%):</strong> Geographic/remote preferences</li>
                <li><strong>Preference Match (15%):</strong> Job type and duration preferences</li>
                <li><strong>Other factors (20%):</strong> Availability, competition, profile completeness</li>
            </ul>
        </div>

        <div class="endpoint">
            <span class="method get">GET</span><strong>/api/matching/job/{jobId}</strong> 🔐
            <p>Get candidate matches for a job (employers only).</p>
        </div>
    </div>

    <div id="reviews" class="section">
        <h2>⭐ Reviews & Ratings API</h2>
        <p>Post-contract review and rating system.</p>

        <div class="endpoint">
            <span class="method get">GET</span><strong>/api/reviews</strong>
            <p>Get reviews for a user or job.</p>
        </div>

        <div class="endpoint">
            <span class="method post">POST</span><strong>/api/reviews</strong> 🔐
            <p>Leave a review after contract completion (mutual rating system).</p>
        </div>
    </div>

    <div id="analytics" class="section">
        <h2>📊 Analytics API</h2>
        <p>Platform performance metrics and insights (admin only).</p>

        <div class="endpoint">
            <span class="method get">GET</span><strong>/api/analytics</strong> 🔐👑
            <p>Get comprehensive platform analytics.</p>
            
            <h4>Analytics Types:</h4>
            <ul>
                <li><strong>summary:</strong> Executive dashboard with KPIs</li>
                <li><strong>jobs:</strong> Job posting and application metrics</li>
                <li><strong>users:</strong> User growth and engagement data</li>
                <li><strong>platform:</strong> Search, conversion, and performance metrics</li>
            </ul>
        </div>

        <div class="endpoint">
            <span class="method get">GET</span><strong>/api/analytics/export</strong> 🔐👑
            <p>Export analytics data in JSON or CSV format.</p>
        </div>
    </div>

    <div class="section">
        <h2>🔧 Additional Resources</h2>
        
        <h3>Skills API</h3>
        <div class="endpoint">
            <span class="method get">GET</span><strong>/api/skills</strong>
            <p>Get list of all available skills for job postings and profiles.</p>
        </div>

        <h3>Email Automation</h3>
        <div class="endpoint">
            <span class="method post">POST</span><strong>/api/email/automation</strong> 🔐👑
            <p>Trigger automated email campaigns (admin only).</p>
        </div>

        <h3>OpenAPI Specification</h3>
        <p>Get the complete OpenAPI specification: <a href="/api/docs?format=openapi">JSON Format</a></p>
        
        <h3>Rate Limits</h3>
        <ul>
            <li><strong>General API:</strong> 100 requests per minute per user</li>
            <li><strong>Search/Browse:</strong> 200 requests per minute</li>
            <li><strong>Job Posting:</strong> 10 posts per hour per employer</li>
            <li><strong>Analytics:</strong> 50 requests per hour (admin only)</li>
        </ul>

        <h3>Error Codes</h3>
        <table>
            <tr><th>Status</th><th>Description</th><th>Common Causes</th></tr>
            <tr><td>400</td><td>Bad Request</td><td>Invalid parameters, validation errors</td></tr>
            <tr><td>401</td><td>Unauthorized</td><td>Missing or invalid authentication</td></tr>
            <tr><td>403</td><td>Forbidden</td><td>Insufficient permissions</td></tr>
            <tr><td>404</td><td>Not Found</td><td>Resource doesn't exist</td></tr>
            <tr><td>429</td><td>Too Many Requests</td><td>Rate limit exceeded</td></tr>
            <tr><td>500</td><td>Server Error</td><td>Internal application error</td></tr>
        </table>
    </div>

    <div class="section">
        <p><strong>📞 Support:</strong> For API questions or issues, contact <a href="mailto:support@contractsonly.com">support@contractsonly.com</a></p>
        <p><strong>🌐 Platform:</strong> <a href="https://contractsonly.com">https://contractsonly.com</a></p>
    </div>
</body>
</html>`
}