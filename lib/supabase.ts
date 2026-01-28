import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

// Verifica se Supabase está configurado
export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey)

// Cliente com anon key (para leitura no frontend)
export const supabase = isSupabaseConfigured 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null

// Cliente com service role key (para escrita no backend/API routes)
// IMPORTANTE: Use apenas em API routes do Next.js, nunca no frontend!
export const supabaseAdmin = (supabaseUrl && supabaseServiceRoleKey)
  ? createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null

// Types for our database structure
export interface Company {
  id: string
  name: string
  cnpj?: string
  created_at: string
}

export interface Automation {
  id: string
  department_id: string
  name: string
  description: string
  type: string
  created_at: string
}

export interface Department {
  id: string
  name: string
  description: string
  created_at: string
}

export interface TaxData {
  id: string
  company_id: string
  automation_id: string
  xml_count: number
  nf_count: number
  nfc_count: number
  total_amount: number
  period: string
  created_at: string
}
