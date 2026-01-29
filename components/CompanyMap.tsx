'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import type { PathOptions, Layer } from 'leaflet'
import { MapPin, Layers, Satellite, Globe, Mountain, ChevronDown, ChevronUp, FileText, Receipt, CreditCard, DollarSign, TrendingUp, TrendingDown } from 'lucide-react'
import { getCompanyLocations as getMockCompanyLocations, type CompanyLocation, type TaxData } from '@/lib/data'
import { getCompanyLocations as getSupabaseCompanyLocations, getTaxData } from '@/lib/supabase-queries'
import { isSupabaseConfigured } from '@/lib/supabase'
import dynamic from 'next/dynamic'
import LeafletLoader from './LeafletLoader'

const BRAZIL_GEOJSON_URL = 'https://raw.githubusercontent.com/codeforamerica/click_that_hood/master/public/data/brazil-states.geojson'

/** Base URL para GeoJSON de municípios por estado (geodata-br, código IBGE) */
const MUN_GEOJSON_BASE = 'https://raw.githubusercontent.com/tbrugz/geodata-br/master/geojson'

/** UF → código IBGE (usado no nome do arquivo geojs-XX-mun.json) */
const UF_TO_IBGE: Record<string, string> = {
  AC: '12', AL: '27', AM: '13', AP: '16', BA: '29', CE: '23', DF: '53', ES: '32', GO: '52',
  MA: '21', MG: '31', MS: '50', MT: '51', PA: '15', PB: '25', PE: '26', PI: '22', PR: '41',
  RJ: '33', RN: '24', RO: '11', RR: '14', RS: '43', SC: '42', SE: '28', SP: '35', TO: '17',
}

/** Limites do Brasil [[S, O], [N, L]] – evita zoom/pan fora do país */
const BRAZIL_BOUNDS: [[number, number], [number, number]] = [
  [-33.75, -73.99], // SW
  [5.27, -34.79],   // NE
]

// Dynamic import to avoid SSR issues with Leaflet
// Import components individually
const MapContainer = dynamic(
  () => import('react-leaflet').then(mod => mod.MapContainer),
  { 
    ssr: false,
    loading: () => <div className="h-[600px] flex items-center justify-center">Carregando mapa...</div>
  }
)
const TileLayer = dynamic(
  () => import('react-leaflet').then(mod => mod.TileLayer),
  { ssr: false }
)
const Marker = dynamic(
  () => import('react-leaflet').then(mod => mod.Marker),
  { ssr: false }
)
const Popup = dynamic(
  () => import('react-leaflet').then(mod => mod.Popup),
  { ssr: false }
)
const GeoJSON = dynamic(
  () => import('react-leaflet').then(mod => mod.GeoJSON),
  { ssr: false }
)
const CircleMarker = dynamic(
  () => import('react-leaflet').then(mod => mod.CircleMarker),
  { ssr: false }
)
const Tooltip = dynamic(
  () => import('react-leaflet').then(mod => mod.Tooltip),
  { ssr: false }
)

interface CompanyMapProps {
  selectedCompanyIds?: string[]
  dateRange?: { start: string; end: string }
}

const regionColors: Record<string, string> = {
  'Sudeste': '#2563EB',
  'Sul': '#10B981',
  'Nordeste': '#F59E0B',
  'Norte': '#7C3AED',
  'Centro-Oeste': '#EF4444',
}

// Map layer definitions
const mapLayers = {
  custom: {
    name: 'Personalizado',
    icon: Layers,
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    labelUrl: null,
  },
  standard: {
    name: 'Padrão',
    icon: Globe,
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    labelUrl: null,
  },
  satellite: {
    name: 'Satélite',
    icon: Satellite,
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; <a href="https://www.esri.com/">Esri</a>',
    labelUrl: 'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
  },
  topographic: {
    name: 'Topográfico',
    icon: Mountain,
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://opentopomap.org">OpenTopoMap</a>',
    labelUrl: null,
  },
}

// Component to fit map bounds to show all markers
function FitBounds({ locations }: { locations: CompanyLocation[] }) {
  const [MapHook, setMapHook] = useState<any>(null)
  
  useEffect(() => {
    import('react-leaflet').then((mod) => {
      const { useMap } = mod
      const { LatLngBounds } = require('leaflet')
      
      function InnerFitBounds() {
        const map = useMap()
        
        useEffect(() => {
          const minZoom = 4
          if (locations.length > 0) {
            const bounds = new LatLngBounds(
              locations.map(loc => [loc.lat, loc.lng] as [number, number])
            )
            map.fitBounds(bounds, { padding: [80, 80], animate: false })
            if (map.getZoom() < minZoom) map.setZoom(minZoom)
          } else {
            map.setView([-14.235, -51.925], minZoom)
          }
        }, [locations, map])
        
        return null
      }
      
      setMapHook(() => InnerFitBounds)
    })
  }, [locations])
  
  if (!MapHook) return null
  return <MapHook />
}

// Zoom na cidade e popup com card das empresas ao selecionar na lista
function FlyToCityAndPopup(props: {
  selectedCityKey: string | null
  cityPoints: Array<{ key: string; city: string; state: string; lat: number; lng: number; companyIds: string[] }>
  enrichedLocations: CompanyLocation[]
  taxDataByCompany: Record<string, TaxData[]>
  onClose: () => void
}) {
  const { selectedCityKey, cityPoints, enrichedLocations, taxDataByCompany, onClose } = props
  const [Inner, setInner] = useState<React.ComponentType<any> | null>(null)
  useEffect(() => {
    import('react-leaflet').then((mod) => {
      const { useMap, Popup } = mod
      function InnerFlyTo(innerProps: typeof props) {
        const map = useMap()
        const sk = innerProps.selectedCityKey
        const point = innerProps.cityPoints.find((p) => p.key === sk)
        useEffect(() => {
          if (!sk || !point) return
          map.flyTo([point.lat, point.lng], 12, { duration: 0.5 })
        }, [sk, point, map])
        if (!sk || !point) return null
        const companiesInCity = innerProps.enrichedLocations.filter(
          (l) =>
            (l.city || '').trim() &&
            (l.state || '').toUpperCase().trim() &&
            cityKey((l.city || '').trim(), (l.state || '').toUpperCase().trim()) === sk
        )
        const cityTotals = companiesInCity.reduce(
          (acc, c) => {
            const tax = (innerProps.taxDataByCompany[c.companyId] || []).reduce(
              (a: { xmlCount: number; nfCount: number; nfcCount: number }, t: TaxData) => ({
                xmlCount: a.xmlCount + t.xmlCount,
                nfCount: a.nfCount + t.nfCount,
                nfcCount: a.nfcCount + t.nfcCount,
              }),
              { xmlCount: 0, nfCount: 0, nfcCount: 0 }
            )
            return {
              xmlCount: acc.xmlCount + tax.xmlCount,
              nfCount: acc.nfCount + tax.nfCount,
              nfcCount: acc.nfcCount + tax.nfcCount,
            }
          },
          { xmlCount: 0, nfCount: 0, nfcCount: 0 }
        )
        const [cityName, stateCode] = sk.split('|')
        return (
          <Popup position={[point.lat, point.lng]} eventHandlers={{ remove: innerProps.onClose }}>
            <div className="min-w-[200px] max-w-[320px] text-left popup-city-content">
              <div className="font-bold text-sm text-slate-800 border-b border-slate-200 pb-2 mb-2 break-words">
                {cityName} · {stateCode}
              </div>
              <p className="text-xs text-slate-600 mb-2">{companiesInCity.length} empresa(s)</p>
              <div className="flex flex-wrap gap-1.5 mb-2">
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-blue-100 text-blue-700">
                  {cityTotals.xmlCount} XML
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-purple-100 text-purple-700">
                  {cityTotals.nfCount} NF
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-green-100 text-green-700">
                  {cityTotals.nfcCount} NFC
                </span>
              </div>
              <ul className="space-y-1.5 max-h-64 overflow-y-auto list-none pl-0">
                {companiesInCity.map((c) => (
                  <li key={c.companyId} className="text-xs p-2 rounded border border-slate-200/80 bg-slate-100/80 hover:bg-slate-200/60 transition-colors cursor-default select-text">
                    <span className="font-semibold text-slate-800 block break-words">{c.companyName}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Popup>
        )
      }
      setInner(() => InnerFlyTo)
    })
  }, [])
  if (!Inner) return null
  return <Inner {...props} />
}

// Original marker icon – no back/glow effect
const createCustomIcon = (color: string) => {
  if (typeof window === 'undefined') return null
  
  const { Icon } = require('leaflet')
  return new Icon({
    iconUrl: `data:image/svg+xml;base64,${btoa(`
      <svg width="40" height="56" viewBox="0 0 40 56" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="markerGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" style="stop-color:${color};stop-opacity:1" />
            <stop offset="100%" style="stop-color:${color}dd;stop-opacity:1" />
          </linearGradient>
        </defs>
        <path d="M20 0C8.954 0 0 8.954 0 20c0 12.5 20 36 20 36s20-23.5 20-36C40 8.954 31.046 0 20 0z" fill="url(#markerGrad)" stroke="white" stroke-width="3" stroke-linejoin="round"/>
        <circle cx="20" cy="20" r="8" fill="white" opacity="0.9"/>
        <circle cx="20" cy="20" r="5" fill="${color}"/>
      </svg>
    `)}`,
    iconSize: [40, 56],
    iconAnchor: [20, 56],
    popupAnchor: [0, -56],
  })
}

/** Gera data URL do SVG do alfinete (cor em hex). Tamanho maior para ficar visível quando longe. */
function getCityPinSvgDataUrl(color: string): string {
  const svg = `<svg width="32" height="44" viewBox="0 0 40 56" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="cityPinGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:${color};stop-opacity:1"/>
      <stop offset="100%" style="stop-color:${color}dd;stop-opacity:1"/>
    </linearGradient></defs>
    <path d="M20 0C8.954 0 0 8.954 0 20c0 12.5 20 36 20 36s20-23.5 20-36C40 8.954 31.046 0 20 0z" fill="url(#cityPinGrad)" stroke="white" stroke-width="2.5" stroke-linejoin="round"/>
    <circle cx="20" cy="20" r="6" fill="white" opacity="0.9"/>
    <circle cx="20" cy="20" r="3.5" fill="${color}"/>
  </svg>`
  try {
    return `data:image/svg+xml;base64,${btoa(svg)}`
  } catch {
    return ''
  }
}

type BrazilStatesGeoJSON = GeoJSON.FeatureCollection & { features: Array<{ properties?: { sigla?: string; name?: string }; geometry: GeoJSON.Geometry }> }

/** Chave única para cidade: "Cidade|UF" */
function cityKey(city: string, state: string) {
  return `${(city || '').trim()}|${(state || '').toUpperCase().trim()}`
}

/** Normaliza nome de município para comparação (mesma lógica do cnpj-lookup) */
function normalizeCityName(name: string): string {
  return (name || '')
    .toLowerCase()
    .replace(/\b\w/g, (c: string) => c.toUpperCase())
    .replace(/\bD([aeiou])\b/gi, (_: string, v: string) => `D${v.toUpperCase()}`)
    .trim()
}

export default function CompanyMap({ selectedCompanyIds = [], dateRange }: CompanyMapProps) {
  const [mounted, setMounted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [companyLocations, setCompanyLocations] = useState<CompanyLocation[]>([])
  const [enrichedLocations, setEnrichedLocations] = useState<CompanyLocation[]>([])
  const [cityCoords, setCityCoords] = useState<Record<string, { lat: number; lng: number }>>({})
  const [loadingCityApi, setLoadingCityApi] = useState(false)
  const [loading, setLoading] = useState(true)
  const [selectedLayer, setSelectedLayer] = useState<keyof typeof mapLayers>('custom')
  const [brazilGeoJson, setBrazilGeoJson] = useState<BrazilStatesGeoJSON | null>(null)
  const [taxDataByCompany, setTaxDataByCompany] = useState<Record<string, TaxData[]>>({})
  const [expandedCompanies, setExpandedCompanies] = useState<Set<string>>(new Set())
  /** Cidades ativas = só as que o usuário clicou no polígono aparecem na lista. Padrão: nenhuma. */
  const [activeCityKeys, setActiveCityKeys] = useState<Record<string, boolean>>({})
  /** Cidade selecionada na lista para dar zoom e mostrar card (key ou null) */
  const [selectedCityForZoom, setSelectedCityForZoom] = useState<string | null>(null)
  /** GeoJSON de municípios por estado (código IBGE) */
  const [municipalityGeoByState, setMunicipalityGeoByState] = useState<Record<string, GeoJSON.FeatureCollection>>({})

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return
    let cancelled = false
    fetch(BRAZIL_GEOJSON_URL)
      .then((r) => r.json())
      .then((data: BrazilStatesGeoJSON) => {
        if (!cancelled) setBrazilGeoJson(data)
      })
      .catch(() => { if (!cancelled) setBrazilGeoJson(null) })
    return () => { cancelled = true }
  }, [mounted])

  useEffect(() => {
    if (!mounted) return
    
    const fetchLocations = async () => {
      setLoading(true)
      setError(null)
      try {
        if (isSupabaseConfigured) {
          const locations = await getSupabaseCompanyLocations(selectedCompanyIds)
          setCompanyLocations(locations as CompanyLocation[])
        } else {
          setCompanyLocations(getMockCompanyLocations(selectedCompanyIds))
        }
      } catch (err) {
        console.error('Erro ao buscar localizações:', err)
        setError('Erro ao carregar localizações')
        try {
          setCompanyLocations(getMockCompanyLocations(selectedCompanyIds))
        } catch (mockError) {
          console.error('Erro ao carregar dados mock:', mockError)
          setCompanyLocations([])
        }
      } finally {
        setLoading(false)
      }
    }

    if (selectedCompanyIds && Array.isArray(selectedCompanyIds) && selectedCompanyIds.length > 0) {
      fetchLocations()
    } else {
      setCompanyLocations([])
      setLoading(false)
      setError(null)
    }
  }, [selectedCompanyIds, mounted])

  // Enriquecer localizações: para empresas com estado mas sem cidade, buscar cidade na API Receita (CNPJ)
  useEffect(() => {
    if (!mounted) return
    setEnrichedLocations(companyLocations)
    if (companyLocations.length === 0) return

    const needsCity = companyLocations.filter(
      (c) => (!c.city || !c.city.trim()) && (c.state && c.state.trim()) && c.cnpj
    )
    if (needsCity.length === 0) return

    let cancelled = false
    setLoadingCityApi(true)

    const run = async () => {
      const enriched = [...companyLocations]
      for (const loc of needsCity) {
        if (cancelled) break
        const cnpjClean = (loc.cnpj || '').replace(/\D/g, '')
        if (cnpjClean.length !== 14) continue
        try {
          const r = await fetch(`/api/cnpj-lookup?cnpj=${encodeURIComponent(cnpjClean)}`)
          if (!r.ok || cancelled) continue
          const data = await r.json()
          const idx = enriched.findIndex((e) => e.companyId === loc.companyId)
          if (idx >= 0 && data.city && data.state) {
            enriched[idx] = { ...enriched[idx], city: data.city, state: data.state }
          }
        } catch {
          // ignora erro por empresa
        }
      }
      if (!cancelled) setEnrichedLocations(enriched)
      if (!cancelled) setLoadingCityApi(false)
    }
    run()
    return () => { cancelled = true }
  }, [mounted, companyLocations])

  // Geocoding: para cada cidade única (com nome preenchido), obter lat/lng se ainda não tiver
  useEffect(() => {
    if (!mounted || enrichedLocations.length === 0) return

    const citiesToGeocode: Array<{ city: string; state: string }> = []
    for (const loc of enrichedLocations) {
      const city = (loc.city || '').trim()
      const state = (loc.state || '').toUpperCase().trim()
      if (!city || !state) continue
      const key = cityKey(city, state)
      if (cityCoords[key]) continue
      if (loc.lat && loc.lng && loc.lat !== 0 && loc.lng !== 0) continue
      if (citiesToGeocode.some((c) => cityKey(c.city, c.state) === key)) continue
      citiesToGeocode.push({ city, state })
    }

    if (citiesToGeocode.length === 0) return

    let cancelled = false
    const newCoords: Record<string, { lat: number; lng: number }> = { ...cityCoords }

    const run = async () => {
      for (const { city, state } of citiesToGeocode) {
        if (cancelled) break
        const key = cityKey(city, state)
        try {
          const r = await fetch(
            `/api/geocode-city?city=${encodeURIComponent(city)}&state=${encodeURIComponent(state)}`
          )
          if (!r.ok || cancelled) continue
          const data = await r.json()
          if (data.lat != null && data.lng != null && !cancelled) {
            newCoords[key] = { lat: data.lat, lng: data.lng }
            setCityCoords((prev) => ({ ...prev, [key]: { lat: data.lat, lng: data.lng } }))
          }
        } catch {
          // ignora
        }
      }
    }
    run()
    return () => { cancelled = true }
  }, [mounted, enrichedLocations])

  // Busca dados fiscais das empresas selecionadas (para o painel por cidade)
  useEffect(() => {
    if (!dateRange || selectedCompanyIds.length === 0) {
      setTaxDataByCompany({})
      return
    }

    const fetchTaxData = async () => {
      try {
        const data = await getTaxData(selectedCompanyIds, dateRange.start, dateRange.end)
        const grouped: Record<string, TaxData[]> = {}
        data.forEach((item) => {
          if (!grouped[item.companyId]) grouped[item.companyId] = []
          grouped[item.companyId].push(item)
        })
        setTaxDataByCompany(grouped)
      } catch (err) {
        console.error('Erro ao buscar dados fiscais:', err)
        setTaxDataByCompany({})
      }
    }
    fetchTaxData()
  }, [selectedCompanyIds, dateRange])

  // Cidades únicas com coordenadas para desenhar no mapa (sublinhar cidade)
  const cityPoints = useMemo(() => {
    const byKey: Record<string, { city: string; state: string; lat: number; lng: number; companyIds: string[] }> = {}
    for (const loc of enrichedLocations) {
      const city = (loc.city || '').trim()
      const state = (loc.state || '').toUpperCase().trim()
      if (!city || !state) continue
      const key = cityKey(city, state)
      let lat = loc.lat
      let lng = loc.lng
      if ((!lat && lat !== 0) || (!lng && lng !== 0) || (lat === 0 && lng === 0)) {
        const coords = cityCoords[key]
        if (coords) {
          lat = coords.lat
          lng = coords.lng
        }
      }
      if (lat == null || lng == null || (lat === 0 && lng === 0)) continue
      if (!byKey[key]) {
        byKey[key] = { city, state, lat, lng, companyIds: [] }
      }
      if (!byKey[key].companyIds.includes(loc.companyId)) {
        byKey[key].companyIds.push(loc.companyId)
      }
    }
    return Object.entries(byKey).map(([key, v]) => ({ key, ...v }))
  }, [enrichedLocations, cityCoords])

  // Buscar GeoJSON de municípios por estado (para desenhar polígonos)
  useEffect(() => {
    if (!mounted || cityPoints.length === 0) return
    const statesNeeded = [...new Set(cityPoints.map((p) => p.state))]
    let cancelled = false
    const run = async () => {
      for (const uf of statesNeeded) {
        if (cancelled) break
        const ibge = UF_TO_IBGE[uf]
        if (!ibge || municipalityGeoByState[uf]) continue
        try {
          const url = `${MUN_GEOJSON_BASE}/geojs-${ibge}-mun.json`
          const r = await fetch(url)
          if (!r.ok || cancelled) continue
          const data: GeoJSON.FeatureCollection = await r.json()
          if (!cancelled) {
            setMunicipalityGeoByState((prev) => ({ ...prev, [uf]: data }))
          }
        } catch {
          // ignora falha por estado
        }
      }
    }
    run()
    return () => { cancelled = true }
  }, [mounted, cityPoints, municipalityGeoByState])

  // FeatureCollections de municípios – todas as cidades das empresas (toggle ativo na lista pelo clique no mapa)
  const municipalityLayersByState = useMemo(() => {
    const result: Array<{ state: string; data: GeoJSON.FeatureCollection }> = []
    for (const [uf, fc] of Object.entries(municipalityGeoByState)) {
      if (!fc?.features?.length) continue
      const citiesInState = cityPoints.filter((p) => p.state === uf)
      const wantedNames = new Set(citiesInState.map((p) => normalizeCityName(p.city)))
      const features = fc.features.filter((f) => {
        const name = (f.properties as { name?: string })?.name
        if (!name) return false
        return wantedNames.has(normalizeCityName(name))
      })
      if (features.length > 0) {
        result.push({ state: uf, data: { type: 'FeatureCollection', features } })
      }
    }
    return result
  }, [municipalityGeoByState, cityPoints])

  const geoJsonStyle = useCallback(
    (feature?: { properties?: { sigla?: string } }): PathOptions => {
      const isDarkMap = selectedLayer === 'custom'
      return {
        fillColor: isDarkMap ? '#1e293b' : '#2563EB',
        fillOpacity: isDarkMap ? 0.25 : 0.15,
        color: isDarkMap ? '#334155' : '#3B82F6',
        weight: 1,
        className: 'geo-state-default',
      }
    },
    [selectedLayer]
  )

  // Sem tooltip nos estados para não competir com o tooltip da cidade no hover
  const onEachFeature = useCallback((_feature: unknown, _layer: Layer) => {}, [])

  const municipalityStyle = useCallback(
    (): PathOptions => ({
      fillColor: '#6366F1',
      fillOpacity: 0.45,
      color: '#4F46E5',
      weight: 2,
      className: 'geo-municipality',
    }),
    []
  )

  /** Ícone de alfinete para cidades – usa padrão do Leaflet para sempre aparecer no mapa */
  const [cityPinIcon, setCityPinIcon] = useState<any>(null)
  useEffect(() => {
    if (!mounted) return
    let cancelled = false
    import('leaflet').then((L) => {
      if (cancelled) return
      // Alfinete padrão do Leaflet (imagem oficial) para sempre aparecer no mapa
      const defaultIcon = new L.Icon({
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
      })
      setCityPinIcon(defaultIcon)
      // Trocar por ícone roxo customizado se a data URL gerar certo
      try {
        const iconUrl = getCityPinSvgDataUrl('#4F46E5')
        if (iconUrl) {
          const icon = new L.Icon({
            iconUrl,
            iconSize: [32, 44],
            iconAnchor: [16, 44],
            popupAnchor: [0, -44],
            className: 'city-pin-marker',
          })
          setCityPinIcon(icon)
        }
      } catch (_) {
        /* mantém ícone padrão */
      }
    })
    return () => { cancelled = true }
  }, [mounted])

  /** Por estado (uf), retorna onEachFeature: _cityKey, tooltip e clique ativa/desativa (ligado direto no layer) */
  const getOnEachMunicipalityFeature = useCallback(
    (uf: string) => (feature: GeoJSON.Feature, layer: Layer) => {
      const name = (feature.properties as { name?: string })?.name
      if (!name || !layer) return
      const key = cityPoints.find(
        (p) => p.state === uf && normalizeCityName(p.city) === normalizeCityName(name)
      )?.key
      if (!key) return
      ;(layer as any)._cityKey = key
      // Clique no polígono: ativa/desativa na lista (ligado no layer para funcionar)
      ;(layer as any).on('click', () => {
        setActiveCityKeys((prev) => ({ ...prev, [key]: !prev[key] }))
      })
      const companiesInCity = enrichedLocations.filter(
        (l) =>
          (l.city || '').trim() &&
          (l.state || '').toUpperCase().trim() &&
          cityKey((l.city || '').trim(), (l.state || '').toUpperCase().trim()) === key
      )
      const companyNames = companiesInCity.map((c) => c.companyName || '—')
      const escapedName = name.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
      const html =
        `<div class="city-tooltip-inner p-2 text-left">` +
        `<div class="city-tooltip-title">${escapedName} · ${companiesInCity.length} ${companiesInCity.length === 1 ? 'empresa' : 'empresas'}</div>` +
        `<ul class="city-tooltip-list">${companyNames.map((n) => `<li>${(n || '—').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</li>`).join('')}</ul>` +
        `<div class="city-tooltip-hint">Clique para ativar/desativar na lista</div>` +
        `</div>`
      if (typeof (layer as any).bindTooltip === 'function') {
        ;(layer as any).bindTooltip(html, {
          sticky: true,
          direction: 'top',
          offset: [0, -8],
          opacity: 0.97,
          className: 'city-companies-tooltip',
        })
      }
    },
    [cityPoints, enrichedLocations]
  )

  // Ensure Leaflet CSS is loaded
  if (!mounted) {
    return (
      <>
        <LeafletLoader />
        <div className="card-3d-elevated bg-gradient-to-br from-white via-white to-neutral-background border border-neutral-border/50 rounded-2xl p-8 shadow-3d relative overflow-hidden">
          <div className="h-[600px] flex items-center justify-center">
            <div className="text-neutral-text-secondary">Carregando mapa...</div>
          </div>
        </div>
      </>
    )
  }

  if (error) {
    return (
      <>
        <LeafletLoader />
        <div className="card-3d-elevated bg-gradient-to-br from-white via-white to-neutral-background border border-neutral-border/50 rounded-xl md:rounded-2xl p-4 md:p-8 shadow-3d relative overflow-hidden">
          <div className="h-[400px] md:h-[500px] lg:h-[600px] flex items-center justify-center">
            <div className="text-center px-4">
              <p className="text-sm md:text-base text-neutral-text-secondary">Erro ao carregar mapa. Tente novamente.</p>
            </div>
          </div>
        </div>
      </>
    )
  }

  if (loading) {
    return (
      <>
        <LeafletLoader />
        <div className="card-3d-elevated bg-gradient-to-br from-white via-white to-neutral-background border border-neutral-border/50 rounded-xl md:rounded-2xl p-4 md:p-8 shadow-3d relative overflow-hidden">
          <div className="h-[400px] md:h-[500px] lg:h-[600px] flex items-center justify-center">
            <div className="text-sm md:text-base text-neutral-text-secondary">Carregando mapa...</div>
          </div>
        </div>
      </>
    )
  }

  if (companyLocations.length === 0) {
    return (
      <div className="card-3d-elevated bg-gradient-to-br from-white via-white to-neutral-background border border-neutral-border/50 rounded-xl md:rounded-2xl p-4 md:p-8 shadow-3d relative overflow-hidden">
        <div className="h-[400px] md:h-[500px] lg:h-[600px] flex items-center justify-center">
          <div className="text-center px-4">
            <MapPin className="mx-auto text-neutral-text-secondary mb-2 w-9 h-9 md:w-12 md:h-12" />
            <p className="text-sm md:text-base text-neutral-text-secondary break-words">Selecione empresas nos filtros para visualizar no mapa</p>
          </div>
        </div>
      </div>
    )
  }

  const currentLayer = mapLayers[selectedLayer]

  return (
    <>
      <LeafletLoader />
      <div className="card-3d-elevated bg-gradient-to-br from-white via-white to-neutral-background border border-neutral-border/50 rounded-xl md:rounded-2xl p-4 md:p-8 shadow-3d relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary-blue/5 via-transparent to-secondary-purple/5 pointer-events-none rounded-xl md:rounded-2xl" aria-hidden="true"></div>
      <div className="relative z-10">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4 md:mb-6">
          <h3 className="text-lg md:text-xl font-bold text-neutral-text-primary flex items-center gap-2">
            <div className="w-1 h-5 md:h-6 bg-gradient-to-b from-primary-blue to-secondary-purple rounded-full shadow-lg flex-shrink-0"></div>
            <span className="break-words">Localização das Empresas por Cidade</span>
          </h3>
          {(enrichedLocations.length > 0 || companyLocations.length > 0) && (
            <div className="text-xs md:text-sm text-neutral-text-secondary">
              {(enrichedLocations.length || companyLocations.length)} empresa(s) · cidades destacadas no mapa
            </div>
          )}
        </div>
        
        {/* Map Container – altura maior para melhor visualização */}
        <div
          className={`rounded-lg md:rounded-xl overflow-hidden border-2 border-primary-blue/20 relative w-full min-w-0 min-h-[420px] h-[56vh] md:h-[65vh] lg:h-[72vh] max-h-[900px] ${selectedLayer === 'custom' ? 'map-personalizado-3d' : 'shadow-2xl'}`}
          style={{ maxWidth: '100%' }}
        >
          {/* Camadas + Lista de cidades (card abaixo das camadas); clicar na cidade = zoom + popup com empresas */}
          <div className="absolute top-2 right-2 md:top-4 md:right-4 z-[1000] flex flex-col gap-2 max-h-[85%] overflow-hidden">
            <div className="bg-gradient-to-br from-white/95 via-white/90 to-white/95 backdrop-blur-xl rounded-lg md:rounded-xl p-1.5 md:p-2 shadow-lg border border-primary-blue/20 card-3d flex-shrink-0">
              <div className="flex flex-col gap-1">
                <div className="text-[9px] md:text-[10px] font-bold text-neutral-text-primary mb-0.5 md:mb-1 px-1 md:px-1.5 uppercase tracking-wider">
                  Camadas
                </div>
                {Object.entries(mapLayers).map(([key, layer]) => {
                  const Icon = layer.icon
                  const isActive = selectedLayer === key
                  return (
                    <button
                      key={key}
                      onClick={() => setSelectedLayer(key as keyof typeof mapLayers)}
                      className={`
                        flex items-center gap-1.5 md:gap-2 px-2 md:px-2.5 py-1 md:py-1.5 rounded-md md:rounded-lg transition-all duration-300 touch-manipulation active:scale-95
                        ${isActive 
                          ? 'bg-gradient-to-br from-primary-blue via-primary-blue to-secondary-purple text-white shadow-md transform scale-[1.02]' 
                          : 'bg-neutral-background text-neutral-text-primary hover:bg-white/90 hover:shadow-sm hover:scale-[1.01]'
                        }
                        card-3d
                      `}
                    >
                      <div className={`
                        p-0.5 md:p-1 rounded-md transition-all duration-300 flex-shrink-0
                        ${isActive 
                          ? 'bg-white/20' 
                          : 'bg-primary-blue/10'
                        }
                      `}>
                        <Icon size={12} className="md:w-[14px] md:h-[14px]" style={{ width: '12px', height: '12px' }} />
                      </div>
                      <span className="text-[10px] md:text-xs font-semibold flex-1 text-left break-words">{layer.name}</span>
                      {isActive && (
                        <div className="w-1 h-1 md:w-1.5 md:h-1.5 bg-white rounded-full animate-pulse shadow flex-shrink-0"></div>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
            {(() => {
              const companiesWithCity = enrichedLocations.filter(
                (loc) => (loc.city || '').trim() && (loc.state || '').trim()
              )
              return (
                <div className="bg-gradient-to-br from-white/95 via-white/90 to-white/95 backdrop-blur-xl rounded-lg md:rounded-xl p-2 shadow-lg border border-primary-blue/20 card-3d flex-shrink min-h-0 overflow-hidden flex flex-col max-h-[200px]">
                  <div className="text-[9px] md:text-[10px] font-bold text-neutral-text-primary mb-1.5 px-1 uppercase tracking-wider flex-shrink-0">
                    Cidades
                  </div>
                  {companiesWithCity.length === 0 ? (
                    <p className="text-[10px] text-neutral-text-secondary py-1 px-1">Empresas com cidade aparecem aqui.</p>
                  ) : (
                    <ul className="space-y-0.5 overflow-y-auto min-h-0">
                      {companiesWithCity.map((loc) => {
                        const key = cityKey((loc.city || '').trim(), (loc.state || '').toUpperCase().trim())
                        return (
                          <li key={loc.companyId}>
                            <button
                              type="button"
                              onClick={() => setSelectedCityForZoom(key)}
                              className={`w-full text-left px-2 py-1.5 rounded-md text-xs font-medium transition-colors truncate ${
                                selectedCityForZoom === key
                                  ? 'bg-primary-blue text-white'
                                  : 'text-neutral-text-primary hover:bg-primary-blue/10'
                              }`}
                              title={`${loc.companyName} · ${loc.city} (${loc.state})`}
                            >
                              {loc.companyName}
                            </button>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </div>
              )
            })()}
          </div>

          {/* Map */}
          {mounted && (
            <MapContainer
              key={`map-container-${selectedLayer}-${selectedCompanyIds?.join(',') || 'all'}`}
              center={[-14.235, -51.925]}
              zoom={4}
              minZoom={2}
              maxZoom={18}
              style={{ height: '100%', width: '100%', zIndex: 1 }}
              scrollWheelZoom={true}
              boxZoom={false}
              className={`rounded-lg md:rounded-xl ${selectedLayer === 'custom' ? 'custom-map-dark' : ''}`}
            >
            <TileLayer
              key={`${selectedLayer}-base`}
              attribution={currentLayer.attribution}
              url={currentLayer.url}
              className={selectedLayer === 'custom' ? 'dark-tiles' : ''}
            />
            
            {/* Labels layer for satellite and custom views */}
            {currentLayer.labelUrl && (
              <TileLayer
                key={`${selectedLayer}-labels`}
                attribution=""
                url={currentLayer.labelUrl}
                opacity={0.85}
                zIndex={1000}
              />
            )}

            {/* Brazil states GeoJSON – base do mapa (sem destaque por estado) */}
            {brazilGeoJson && (
              <GeoJSON
                key={`brazil-states-${selectedLayer}`}
                data={brazilGeoJson}
                style={geoJsonStyle}
                onEachFeature={onEachFeature}
              />
            )}

            {/* Polígonos dos municípios (overlayPane 400) – abaixo dos marcadores (markerPane 600) */}
            {municipalityLayersByState.map(({ state: uf, data }) => (
              <GeoJSON
                key={`mun-${uf}`}
                data={data}
                style={municipalityStyle}
                onEachFeature={getOnEachMunicipalityFeature(uf)}
                eventHandlers={{
                  mouseover: (e) => {
                    const layer = e.target
                    layer.setStyle({ fillOpacity: 0.65, weight: 3 })
                  },
                  mouseout: (e) => {
                    e.target.setStyle({ fillOpacity: 0.45, weight: 2 })
                  },
                }}
              />
            ))}

            {/* Marcadores (alfinete) no centro de cada cidade – sempre por cima (markerPane 600 > overlayPane 400) */}
            {cityPinIcon && cityPoints.map((p) => (
              <Marker
                key={`marker-${p.key}`}
                position={[p.lat, p.lng]}
                icon={cityPinIcon}
                zIndexOffset={1000}
                eventHandlers={{
                  click: () => setSelectedCityForZoom(p.key),
                }}
              >
                <Tooltip direction="top" offset={[0, -12]} opacity={0.95} permanent={false}>
                  {p.city} · {p.state} ({p.companyIds.length} {p.companyIds.length === 1 ? 'empresa' : 'empresas'})
                </Tooltip>
              </Marker>
            ))}

            {/* Zoom + popup ao selecionar cidade na lista */}
            <FlyToCityAndPopup
              selectedCityKey={selectedCityForZoom}
              cityPoints={cityPoints}
              enrichedLocations={enrichedLocations}
              taxDataByCompany={taxDataByCompany}
              onClose={() => setSelectedCityForZoom(null)}
            />
          </MapContainer>
          )}
        </div>

        {/* Painel de detalhes por cidade – só cidades ativadas pelo clique no polígono */}
        {(() => {
          const byCity: Record<string, CompanyLocation[]> = {}
          for (const loc of enrichedLocations) {
            const city = (loc.city || '').trim()
            const state = (loc.state || '').toUpperCase().trim()
            if (!city || !state) continue
            const key = cityKey(city, state)
            if (activeCityKeys[key] !== true) continue
            if (!byCity[key]) byCity[key] = []
            byCity[key].push(loc)
          }
          const cityEntries = Object.entries(byCity)

          return (
            <div className="mt-6 space-y-4">
              <span className="text-sm font-semibold text-neutral-text-primary block">
                Cidades ativadas — clique no polígono no mapa para ativar ou desativar
              </span>
              {cityEntries.length === 0 && (
                <p className="text-sm text-neutral-text-secondary py-2">
                  Nenhuma cidade ativada. Clique em um polígono de cidade no mapa para ela aparecer aqui.
                </p>
              )}
              {loadingCityApi && (
                <p className="text-sm text-neutral-text-secondary">Buscando cidade das empresas na Receita Federal...</p>
              )}
              {cityEntries.map(([key, companiesInCity]) => {
                const [city, state] = key.split('|')
                const cityTaxData = companiesInCity.flatMap((c) => taxDataByCompany[c.companyId] || [])
                const cityTotals = cityTaxData.reduce(
                  (acc, item) => ({
                    xmlCount: acc.xmlCount + item.xmlCount,
                    nfCount: acc.nfCount + item.nfCount,
                    nfcCount: acc.nfcCount + item.nfcCount,
                    faturamento: acc.faturamento + (item.faturamento || 0),
                    despesa: acc.despesa + (item.despesa || 0),
                    resultado: acc.resultado + (item.resultado || 0),
                  }),
                  { xmlCount: 0, nfCount: 0, nfcCount: 0, faturamento: 0, despesa: 0, resultado: 0 }
                )
                return (
                  <div
                    key={key}
                    className="bg-gradient-to-br from-white via-white to-neutral-background/95 backdrop-blur-xl rounded-2xl p-6 shadow-2xl border-2 border-primary-blue/20 card-3d relative overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-primary-blue/5 via-transparent to-secondary-purple/5 rounded-2xl" />
                    <div className="relative z-10">
                      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                        <div className="flex items-center gap-3">
                          <div className="p-3 rounded-xl bg-gradient-to-br from-primary-blue to-secondary-purple shadow-lg">
                            <MapPin className="text-white" size={24} />
                          </div>
                          <div>
                            <h4 className="font-bold text-lg text-neutral-text-primary">{city}</h4>
                            <p className="text-sm text-neutral-text-secondary">
                              {state} · {companiesInCity.length} {companiesInCity.length === 1 ? 'empresa' : 'empresas'}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSelectedCityForZoom(key)}
                          className="text-sm font-medium text-primary-blue hover:bg-primary-blue/10 px-3 py-1.5 rounded-lg transition-colors"
                        >
                          Ver no mapa
                        </button>
                      </div>
                      {(cityTotals.xmlCount > 0 || cityTotals.nfCount > 0 || cityTotals.nfcCount > 0 || cityTotals.faturamento > 0 || cityTotals.despesa > 0) && (
                        <div className="mb-4 space-y-3">
                          <div className="p-4 bg-gradient-to-br from-primary-blue/10 to-secondary-purple/10 rounded-xl border border-primary-blue/20">
                            <p className="text-xs text-neutral-text-secondary mb-3 font-semibold">Documentos na cidade</p>
                            <div className="grid grid-cols-3 gap-3">
                              <div className="text-center">
                                <p className="text-xs text-neutral-text-secondary mb-1">XML</p>
                                <p className="text-lg font-bold text-primary-blue">{cityTotals.xmlCount.toLocaleString()}</p>
                              </div>
                              <div className="text-center">
                                <p className="text-xs text-neutral-text-secondary mb-1">NF</p>
                                <p className="text-lg font-bold text-secondary-purple">{cityTotals.nfCount.toLocaleString()}</p>
                              </div>
                              <div className="text-center">
                                <p className="text-xs text-neutral-text-secondary mb-1">NFC</p>
                                <p className="text-lg font-bold text-green-600">{cityTotals.nfcCount.toLocaleString()}</p>
                              </div>
                            </div>
                          </div>
                          {(cityTotals.faturamento > 0 || cityTotals.despesa > 0) && (
                            <div className="p-4 bg-gradient-to-br from-white/50 to-neutral-background/50 rounded-xl border border-neutral-border/50">
                              <p className="text-xs text-neutral-text-secondary mb-3 font-semibold">Financeiro na cidade</p>
                              <div className="space-y-2">
                                <div className="flex items-center justify-between p-2 bg-green-50 rounded-lg border border-green-200">
                                  <span className="text-xs text-neutral-text-secondary">Faturamento</span>
                                  <span className="text-sm font-bold text-green-600">
                                    R$ {cityTotals.faturamento.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between p-2 bg-red-50 rounded-lg border border-red-200">
                                  <span className="text-xs text-neutral-text-secondary">Despesa</span>
                                  <span className="text-sm font-bold text-red-600">
                                    R$ {cityTotals.despesa.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </span>
                                </div>
                                <div className={`flex items-center justify-between p-2 rounded-lg border ${cityTotals.resultado >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                                  <span className="text-xs text-neutral-text-secondary">Resultado</span>
                                  <span className={`text-sm font-bold ${cityTotals.resultado >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    R$ {Math.abs(cityTotals.resultado).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </span>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                      <div className="space-y-2">
                        {companiesInCity.map((c) => {
                          const companyTaxData = taxDataByCompany[c.companyId] || []
                          const companyTotals = companyTaxData.reduce(
                            (acc, item) => ({
                              xmlCount: acc.xmlCount + item.xmlCount,
                              nfCount: acc.nfCount + item.nfCount,
                              nfcCount: acc.nfcCount + item.nfcCount,
                              faturamento: acc.faturamento + (item.faturamento || 0),
                              despesa: acc.despesa + (item.despesa || 0),
                              resultado: acc.resultado + (item.resultado || 0),
                            }),
                            { xmlCount: 0, nfCount: 0, nfcCount: 0, faturamento: 0, despesa: 0, resultado: 0 }
                          )
                          const isExpanded = expandedCompanies.has(c.companyId)
                          return (
                            <div key={c.companyId} className="bg-neutral-background rounded-lg border border-neutral-border/50 hover:border-primary-blue/30 transition-colors overflow-hidden">
                              <button
                                onClick={() => {
                                  setExpandedCompanies((prev) => {
                                    const newSet = new Set(prev)
                                    if (newSet.has(c.companyId)) newSet.delete(c.companyId)
                                    else newSet.add(c.companyId)
                                    return newSet
                                  })
                                }}
                                className="w-full flex items-center justify-between p-3 hover:bg-white/50 transition-colors text-left"
                              >
                                <div className="flex-1 min-w-0">
                                  <p className="font-semibold text-sm text-neutral-text-primary">{c.companyName}</p>
                                  <p className="text-xs text-neutral-text-secondary">{c.city || '-'} · {c.region || c.state}</p>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                  {companyTotals.xmlCount > 0 && (
                                    <span className="text-xs font-bold text-primary-blue bg-primary-blue/10 px-2 py-1 rounded">{companyTotals.xmlCount} XML</span>
                                  )}
                                  {companyTotals.nfCount > 0 && (
                                    <span className="text-xs font-bold text-secondary-purple bg-secondary-purple/10 px-2 py-1 rounded">{companyTotals.nfCount} NF</span>
                                  )}
                                  {companyTotals.nfcCount > 0 && (
                                    <span className="text-xs font-bold text-green-600 bg-green-100 px-2 py-1 rounded">{companyTotals.nfcCount} NFC</span>
                                  )}
                                  {isExpanded ? <ChevronUp className="w-4 h-4 text-neutral-text-secondary" /> : <ChevronDown className="w-4 h-4 text-neutral-text-secondary" />}
                                </div>
                              </button>
                              {isExpanded && (
                                <div className="p-4 bg-white/30 border-t border-neutral-border/50 space-y-4">
                                  <div className="grid grid-cols-3 gap-2">
                                    <div className="p-2 bg-primary-blue/10 rounded-lg text-center">
                                      <p className="text-xs text-neutral-text-secondary">XML</p>
                                      <p className="text-sm font-bold text-primary-blue">{companyTotals.xmlCount.toLocaleString()}</p>
                                    </div>
                                    <div className="p-2 bg-secondary-purple/10 rounded-lg text-center">
                                      <p className="text-xs text-neutral-text-secondary">NF</p>
                                      <p className="text-sm font-bold text-secondary-purple">{companyTotals.nfCount.toLocaleString()}</p>
                                    </div>
                                    <div className="p-2 bg-green-100 rounded-lg text-center">
                                      <p className="text-xs text-neutral-text-secondary">NFC</p>
                                      <p className="text-sm font-bold text-green-600">{companyTotals.nfcCount.toLocaleString()}</p>
                                    </div>
                                  </div>
                                  <div className="space-y-2">
                                    <div className="flex justify-between p-2 bg-green-50 rounded-lg border border-green-200">
                                      <span className="text-xs text-neutral-text-secondary">Faturamento</span>
                                      <span className="text-sm font-bold text-green-600">R$ {companyTotals.faturamento.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                    </div>
                                    <div className="flex justify-between p-2 bg-red-50 rounded-lg border border-red-200">
                                      <span className="text-xs text-neutral-text-secondary">Despesa</span>
                                      <span className="text-sm font-bold text-red-600">R$ {companyTotals.despesa.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                    </div>
                                    <div className={`flex justify-between p-2 rounded-lg border ${companyTotals.resultado >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                                      <span className="text-xs text-neutral-text-secondary">Resultado</span>
                                      <span className={`text-sm font-bold ${companyTotals.resultado >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        R$ {Math.abs(companyTotals.resultado).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )
        })()}

        {/* Legend – regiões das empresas (por cidade) */}
        <div className="mt-6 flex flex-wrap gap-3 justify-center">
          {Object.entries(regionColors).map(([region, color]) => {
            const locs = enrichedLocations.length ? enrichedLocations : companyLocations
            const count = locs.filter((c) => c.region === region).length
            if (count === 0) return null
            return (
              <div key={region} className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-br from-white to-neutral-background backdrop-blur-sm rounded-xl border-2 border-neutral-border/50 shadow-md hover:shadow-lg transition-all duration-300 card-3d">
                <div
                  className="w-5 h-5 rounded-full border-2 border-white shadow-lg"
                  style={{ backgroundColor: color }}
                />
                <span className="text-sm font-semibold text-neutral-text-primary">{region}</span>
                <span className="text-xs font-bold text-primary-blue bg-primary-blue/10 px-2 py-0.5 rounded-full">{count}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
    </>
  )
}
