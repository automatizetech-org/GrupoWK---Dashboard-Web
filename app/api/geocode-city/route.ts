import { NextRequest, NextResponse } from 'next/server'

/**
 * Geocoding de cidade no Brasil via Nominatim (OpenStreetMap) para obter
 * latitude e longitude e exibir a cidade no mapa.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const city = searchParams.get('city')?.trim()
  const state = searchParams.get('state')?.trim()

  if (!city || !state) {
    return NextResponse.json(
      { error: 'Parâmetros city e state são obrigatórios' },
      { status: 400 }
    )
  }

  const query = encodeURIComponent(`${city}, ${state}, Brasil`)
  const url = `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1&countrycodes=br`

  try {
    const res = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'DashboardEmpresas/1.0 (local)',
      },
      next: { revalidate: 86400 * 7 }, // cache 7 dias
    })

    if (!res.ok) {
      return NextResponse.json(
        { error: 'Erro ao buscar coordenadas da cidade' },
        { status: 502 }
      )
    }

    const data = await res.json()
    if (!Array.isArray(data) || data.length === 0) {
      return NextResponse.json(
        { error: 'Cidade não encontrada para geocoding' },
        { status: 404 }
      )
    }

    const lat = parseFloat(data[0].lat)
    const lng = parseFloat(data[0].lon)
    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      return NextResponse.json(
        { error: 'Coordenadas inválidas' },
        { status: 502 }
      )
    }

    return NextResponse.json({ lat, lng })
  } catch (err) {
    console.error('Erro no geocode:', err)
    return NextResponse.json(
      { error: 'Erro ao buscar coordenadas' },
      { status: 502 }
    )
  }
}
