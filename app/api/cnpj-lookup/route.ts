import { NextRequest, NextResponse } from 'next/server'

/**
 * Consulta CNPJ para obter município (cidade) da empresa.
 * Usa OpenCNPJ (gratuita, sem 403) e fallback para BrasilAPI.
 * Usado quando a empresa tem apenas estado cadastrado.
 */
function normalizeCityName(municipio: string): string {
  return municipio
    .toLowerCase()
    .replace(/\b\w/g, (c: string) => c.toUpperCase())
    .replace(/\bD([aeiou])\b/gi, (_, v: string) => `D${v.toUpperCase()}`)
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const cnpj = searchParams.get('cnpj')?.trim()

  if (!cnpj) {
    return NextResponse.json(
      { error: 'Parâmetro cnpj é obrigatório' },
      { status: 400 }
    )
  }

  const cnpjDigits = cnpj.replace(/\D/g, '')
  if (cnpjDigits.length !== 14) {
    return NextResponse.json(
      { error: 'CNPJ deve conter 14 dígitos' },
      { status: 400 }
    )
  }

  // 1) Tentar OpenCNPJ (gratuita, costuma não retornar 403)
  try {
    const res = await fetch(`https://api.opencnpj.org/${cnpjDigits}`, {
      headers: { Accept: 'application/json' },
      next: { revalidate: 86400 },
    })

    if (res.ok) {
      const data = await res.json()
      const municipio = (data.municipio || '').toString().trim()
      const uf = (data.uf || '').toString().trim().toUpperCase()
      if (municipio && uf) {
        return NextResponse.json({
          city: normalizeCityName(municipio),
          state: uf,
          rawMunicipio: municipio,
        })
      }
    }
  } catch {
    // segue para fallback
  }

  // 2) Fallback: BrasilAPI (pode retornar 403 em alguns ambientes)
  try {
    const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpjDigits}`, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'DashboardEmpresas/1.0 (https://localhost)',
      },
      next: { revalidate: 86400 },
    })

    if (res.ok) {
      const data = await res.json()
      const municipio = (data.municipio || '').toString().trim()
      const uf = (data.uf || '').toString().trim().toUpperCase()
      if (municipio && uf) {
        return NextResponse.json({
          city: normalizeCityName(municipio),
          state: uf,
          rawMunicipio: municipio,
        })
      }
    }
  } catch {
    // ignora
  }

  return NextResponse.json(
    { error: 'CNPJ não encontrado ou dados de endereço indisponíveis' },
    { status: 404 }
  )
}
