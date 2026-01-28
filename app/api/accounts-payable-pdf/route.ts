// API route to insert accounts payable PDF data into Supabase
// This route uses service role key for INSERT operations (bypasses RLS)
import { NextRequest, NextResponse } from 'next/server'
import { insertAccountsPayablePDFData } from '@/lib/supabase-queries'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { clients, automationId, uploadDate } = body

    if (!clients || !Array.isArray(clients) || clients.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Nenhum cliente fornecido' },
        { status: 400 }
      )
    }

    if (!automationId) {
      return NextResponse.json(
        { success: false, error: 'ID da automação não fornecido' },
        { status: 400 }
      )
    }

    if (!uploadDate) {
      return NextResponse.json(
        { success: false, error: 'Data de upload não fornecida' },
        { status: 400 }
      )
    }

    // Insert data using service role (this function now uses supabaseAdmin internally)
    const result = await insertAccountsPayablePDFData(
      clients,
      automationId,
      uploadDate
    )

    if (result.success) {
      return NextResponse.json(result, { status: 200 })
    } else {
      return NextResponse.json(
        { success: false, error: result.error || 'Erro ao inserir dados' },
        { status: 500 }
      )
    }
  } catch (error: any) {
    console.error('Erro na API de inserção de PDF:', error)
    console.error('Stack trace:', error?.stack)
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Erro desconhecido ao processar requisição',
        details: process.env.NODE_ENV === 'development' ? error?.stack : undefined,
      },
      { status: 500 }
    )
  }
}

// GET endpoint para ler dados (usa service role para bypass RLS se necessário)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const automationId = searchParams.get('automationId') || 'contas-pagar'
    const startDate = searchParams.get('startDate') || undefined
    const endDate = searchParams.get('endDate') || undefined

    // Importar função de leitura
    const { getAccountsPayableDataFromPDF } = await import('@/lib/supabase-queries')
    
    // Buscar dados (a função já tenta usar service role como fallback)
    const result = await getAccountsPayableDataFromPDF(
      automationId,
      startDate,
      endDate
    )

    return NextResponse.json(result, { status: 200 })
  } catch (error: any) {
    console.error('Erro na API de leitura de PDF:', error)
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Erro desconhecido ao buscar dados',
      },
      { status: 500 }
    )
  }
}
