import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    const { searchParams } = new URL(req.url)
    const category = searchParams.get('category')

    let query = supabase
      .from('skills')
      .select('*')
      .order('category', { ascending: true })
      .order('name', { ascending: true })

    if (category) {
      query = query.eq('category', category)
    }

    const { data: skills, error } = await query

    if (error) {
      console.error('Error fetching skills:', error)
      throw error
    }

    return NextResponse.json(skills || [])
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
    const supabase = createServerSupabaseClient()
    const body = await req.json()
    const { name, category } = body

    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { error: 'Invalid skill name' },
        { status: 400 }
      )
    }

    const { data: skill, error } = await supabase
      .from('skills')
      .insert({
        name: name.trim(),
        category: category?.trim() || 'General'
      })
      .select()
      .single()

    if (error) {
      // Check for unique constraint violation
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'Skill already exists' },
          { status: 409 }
        )
      }
      
      console.error('Error creating skill:', error)
      throw error
    }

    return NextResponse.json(skill, { status: 201 })
  } catch (error: unknown) {
    console.error('Error creating skill:', error)
    return NextResponse.json(
      { error: 'Failed to create skill' },
      { status: 500 }
    )
  }
}