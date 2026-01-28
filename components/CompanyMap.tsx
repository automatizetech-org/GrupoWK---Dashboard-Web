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

type BrazilStatesGeoJSON = GeoJSON.FeatureCollection & { features: Array<{ properties?: { sigla?: string; name?: string }; geometry: GeoJSON.Geometry }> }

type SelectedState = { sigla: string; name: string }

export default function CompanyMap({ selectedCompanyIds = [], dateRange }: CompanyMapProps) {
  const [selectedStates, setSelectedStates] = useState<SelectedState[]>([])
  const [mounted, setMounted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [companyLocations, setCompanyLocations] = useState<CompanyLocation[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedLayer, setSelectedLayer] = useState<keyof typeof mapLayers>('custom')
  const [brazilGeoJson, setBrazilGeoJson] = useState<BrazilStatesGeoJSON | null>(null)
  const [taxDataByCompany, setTaxDataByCompany] = useState<Record<string, TaxData[]>>({})
  const [expandedCompanies, setExpandedCompanies] = useState<Set<string>>(new Set())

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

  // Não limpa estados selecionados ao mudar de layer - mantém seleção
  // useEffect removido para permitir seleção em todos os mapas

  // Busca dados fiscais quando estados são selecionados e dateRange está disponível
  useEffect(() => {
    if (!dateRange || selectedStates.length === 0) {
      setTaxDataByCompany({})
      return
    }

    const fetchTaxData = async () => {
      // Coleta todas as empresas dos estados selecionados
      const companiesInSelectedStates = companyLocations.filter(
        (c) => selectedStates.some((s) => (c.state || '').toUpperCase().trim() === s.sigla)
      )
      
      const companyIds = companiesInSelectedStates.map((c) => c.companyId).filter(Boolean) as string[]
      
      if (companyIds.length === 0) {
        setTaxDataByCompany({})
        return
      }

      try {
        const data = await getTaxData(companyIds, dateRange.start, dateRange.end)
        
        // Agrupa dados por empresa
        const grouped: Record<string, TaxData[]> = {}
        data.forEach((item) => {
          if (!grouped[item.companyId]) {
            grouped[item.companyId] = []
          }
          grouped[item.companyId].push(item)
        })
        
        setTaxDataByCompany(grouped)
      } catch (err) {
        console.error('Erro ao buscar dados fiscais:', err)
        setTaxDataByCompany({})
      }
    }

    fetchTaxData()
  }, [selectedStates, companyLocations, dateRange])

  const highlightedStates = useMemo(
    () => new Set(companyLocations.map((l) => (l.state || '').toUpperCase().trim()).filter(Boolean)),
    [companyLocations]
  )

  const selectedStatesSet = useMemo(
    () => new Set(selectedStates.map(s => s.sigla)),
    [selectedStates]
  )

  const geoJsonStyle = useCallback(
    (feature?: { properties?: { sigla?: string } }): PathOptions => {
      const sigla = (feature?.properties?.sigla || '').toUpperCase().trim()
      const highlighted = sigla && highlightedStates.has(sigla)
      const isSelected = sigla && selectedStatesSet.has(sigla)
      
      // Estilo adaptativo baseado no layer selecionado
      const isDarkMap = selectedLayer === 'custom'
      
      if (isSelected) {
        return {
          fillColor: '#6366F1',
          fillOpacity: isDarkMap ? 0.85 : 0.4,
          color: '#818CF8',
          weight: 2.5,
          className: 'geo-state-selected',
        }
      }
      if (highlighted) {
        return {
          fillColor: '#4F46E5',
          fillOpacity: isDarkMap ? 0.65 : 0.3,
          color: '#6366F1',
          weight: 1.5,
          className: 'geo-state-highlighted',
        }
      }
      // Estados não destacados - estilo sutil para todos os mapas
      return {
        fillColor: isDarkMap ? '#1e293b' : '#2563EB',
        fillOpacity: isDarkMap ? 0.25 : 0.15,
        color: isDarkMap ? '#334155' : '#3B82F6',
        weight: 1,
        className: 'geo-state-default',
      }
    },
    [highlightedStates, selectedStatesSet, selectedLayer]
  )

  const onEachFeature = useCallback(
    (feature: { properties?: { sigla?: string; name?: string } }, layer: Layer) => {
      const sigla = (feature?.properties?.sigla || '').toUpperCase().trim()
      const name = feature?.properties?.name || sigla || ''
      const highlighted = sigla && highlightedStates.has(sigla)
      
      // Encontra empresas neste estado
      const companiesInState = companyLocations.filter(
        (c) => (c.state || '').toUpperCase().trim() === sigla
      )
      
      // Calcula totais do estado
      const stateTaxData = companiesInState.flatMap((c) => taxDataByCompany[c.companyId] || [])
      const stateTotals = stateTaxData.reduce(
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
      
      // Tooltip permanente para estados destacados
      const opts = { direction: 'center' as const, className: 'state-label-tooltip' }
      if (highlighted && name) {
        layer.bindTooltip(name, { ...opts, permanent: true })
      } else if (name) {
        layer.bindTooltip(name, { ...opts, permanent: false })
      }
      
      // Tooltip ao passar o mouse - mostra apenas nome do estado e número de empresas
      layer.on('mouseover', () => {
        const tooltipContent = `
          <div style="padding: 12px; min-width: 200px; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
            <strong style="font-size: 16px; display: block; margin-bottom: 10px; color: #1F2937; font-weight: 700;">${name}</strong>
            <div style="font-size: 13px; color: #4B5563;">
              <span style="color: #6B7280;">Empresas:</span> <strong style="color: #1F2937;">${companiesInState.length}</strong>
            </div>
          </div>
        `
        layer.bindPopup(tooltipContent, { 
          closeButton: false,
          className: 'state-hover-popup',
          autoPan: false
        }).openPopup()
      })
      
      layer.on('mouseout', () => {
        layer.closePopup()
      })
      
      layer.on('click', (e) => {
        if (e.originalEvent) {
          e.originalEvent.preventDefault()
          e.originalEvent.stopPropagation()
          e.originalEvent.stopImmediatePropagation()
        }
        const leafletEvent = e as { stopPropagation?: () => void }
        if (leafletEvent.stopPropagation) {
          leafletEvent.stopPropagation()
        }
        setSelectedStates((prev) => {
          const existingIndex = prev.findIndex(s => s.sigla === sigla)
          if (existingIndex >= 0) {
            // Remove se já está selecionado (toggle off)
            return prev.filter((_, i) => i !== existingIndex)
          } else {
            // Adiciona se não está selecionado (toggle on)
            return [...prev, { sigla, name: name || sigla }]
          }
        })
      })
    },
    [highlightedStates, companyLocations, taxDataByCompany]
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
            <span className="break-words">Localização das Empresas Processadas</span>
          </h3>
          {companyLocations.length > 0 && (
            <div className="text-xs md:text-sm text-neutral-text-secondary">
              {companyLocations.length} {companyLocations.length === 1 ? 'empresa' : 'empresas'} no mapa
            </div>
          )}
        </div>
        
        {/* Map Container – contido no bloco; 3D reforçado só no Personalizado */}
        <div
          className={`rounded-lg md:rounded-xl overflow-hidden border-2 border-primary-blue/20 relative w-full min-w-0 md:h-[500px] lg:h-[600px] ${selectedLayer === 'custom' ? 'map-personalizado-3d' : 'shadow-2xl'}`}
          style={{ height: '400px', maxWidth: '100%' }}
        >
          {/* Layer Selector - Compact */}
          <div className="absolute top-2 right-2 md:top-4 md:right-4 z-[1000] bg-gradient-to-br from-white/95 via-white/90 to-white/95 backdrop-blur-xl rounded-lg md:rounded-xl p-1.5 md:p-2 shadow-lg border border-primary-blue/20 card-3d">
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

            {/* Brazil states GeoJSON – Personalizado only: clicável, “se levanta” ao selecionar */}
            {/* GeoJSON com estados destacados - aplicado em todos os mapas */}
            {brazilGeoJson && (
              <GeoJSON
                key={`brazil-states-${selectedLayer}-${Array.from(highlightedStates).sort().join(',')}-${selectedStates.map(s => s.sigla).sort().join(',')}`}
                data={brazilGeoJson}
                style={geoJsonStyle}
                onEachFeature={onEachFeature}
              />
            )}
            
            {/* FitBounds removido - mapa livre, sem ajuste automático aos marcadores */}
            
            {/* Marcadores removidos - apenas estados destacados são mostrados */}
          </MapContainer>
          )}
        </div>

        {/* State Info Panel – Aparece quando há estados selecionados, mostra todos separados */}
        {selectedStates.length > 0 && (
          <div className="mt-6 space-y-4">
            {selectedStates.map((state) => {
              const companiesInState = companyLocations.filter(
                (c) => (c.state || '').toUpperCase().trim() === state.sigla
              )
              
              // Calcula totais do estado a partir dos dados fiscais
              const stateTaxData = companiesInState.flatMap((c) => taxDataByCompany[c.companyId] || [])
              const stateTotals = stateTaxData.reduce(
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
                  key={state.sigla}
                  className="bg-gradient-to-br from-white via-white to-neutral-background/95 backdrop-blur-xl rounded-2xl p-6 shadow-2xl border-2 border-primary-blue/20 card-3d relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-primary-blue/5 via-transparent to-secondary-purple/5 rounded-2xl" />
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="p-3 rounded-xl bg-gradient-to-br from-primary-blue to-secondary-purple shadow-lg">
                          <MapPin className="text-white" size={24} />
                        </div>
                        <div>
                          <h4 className="font-bold text-lg text-neutral-text-primary">{state.name}</h4>
                          <p className="text-sm text-neutral-text-secondary">
                            {companiesInState.length} {companiesInState.length === 1 ? 'empresa' : 'empresas'} neste estado
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setSelectedStates((prev) => prev.filter((s) => s.sigla !== state.sigla))
                        }}
                        className="p-2 text-neutral-text-secondary hover:text-primary-blue hover:bg-primary-blue/5 rounded-lg transition-colors"
                        title="Remover estado"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    
                    {/* Totais do estado */}
                    {(stateTotals.xmlCount > 0 || stateTotals.nfCount > 0 || stateTotals.nfcCount > 0 || stateTotals.faturamento > 0 || stateTotals.despesa > 0) && (
                      <div className="mb-4 space-y-3">
                        {/* Documentos */}
                        <div className="p-4 bg-gradient-to-br from-primary-blue/10 to-secondary-purple/10 rounded-xl border border-primary-blue/20">
                          <p className="text-xs text-neutral-text-secondary mb-3 font-semibold">Documentos Processados no Estado</p>
                          <div className="grid grid-cols-3 gap-3">
                            <div className="text-center">
                              <p className="text-xs text-neutral-text-secondary mb-1">XML</p>
                              <p className="text-lg font-bold text-primary-blue">{stateTotals.xmlCount.toLocaleString()}</p>
                            </div>
                            <div className="text-center">
                              <p className="text-xs text-neutral-text-secondary mb-1">NF</p>
                              <p className="text-lg font-bold text-secondary-purple">{stateTotals.nfCount.toLocaleString()}</p>
                            </div>
                            <div className="text-center">
                              <p className="text-xs text-neutral-text-secondary mb-1">NFC</p>
                              <p className="text-lg font-bold text-green-600">{stateTotals.nfcCount.toLocaleString()}</p>
                            </div>
                          </div>
                        </div>
                        
                        {/* Financeiro do Estado */}
                        {(stateTotals.faturamento > 0 || stateTotals.despesa > 0) && (
                          <div className="p-4 bg-gradient-to-br from-white/50 to-neutral-background/50 rounded-xl border border-neutral-border/50">
                            <p className="text-xs text-neutral-text-secondary mb-3 font-semibold">Informações Financeiras do Estado</p>
                            <div className="space-y-2">
                              <div className="flex items-center justify-between p-2 bg-green-50 rounded-lg border border-green-200">
                                <div className="flex items-center gap-2">
                                  <DollarSign className="w-4 h-4 text-green-600" />
                                  <span className="text-xs text-neutral-text-secondary">Faturamento (Saída)</span>
                                </div>
                                <span className="text-sm font-bold text-green-600">
                                  R$ {stateTotals.faturamento.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                              </div>
                              <div className="flex items-center justify-between p-2 bg-red-50 rounded-lg border border-red-200">
                                <div className="flex items-center gap-2">
                                  <DollarSign className="w-4 h-4 text-red-600" />
                                  <span className="text-xs text-neutral-text-secondary">Despesa (Entrada)</span>
                                </div>
                                <span className="text-sm font-bold text-red-600">
                                  R$ {stateTotals.despesa.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                              </div>
                              <div className={`flex items-center justify-between p-2 rounded-lg border ${
                                stateTotals.resultado >= 0 
                                  ? 'bg-green-50 border-green-200' 
                                  : 'bg-red-50 border-red-200'
                              }`}>
                                <div className="flex items-center gap-2">
                                  {stateTotals.resultado >= 0 ? (
                                    <TrendingUp className="w-4 h-4 text-green-600" />
                                  ) : (
                                    <TrendingDown className="w-4 h-4 text-red-600" />
                                  )}
                                  <span className="text-xs text-neutral-text-secondary">Resultado (Saída - Entrada)</span>
                                </div>
                                <span className={`text-sm font-bold ${
                                  stateTotals.resultado >= 0 ? 'text-green-600' : 'text-red-600'
                                }`}>
                                  R$ {Math.abs(stateTotals.resultado).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Lista de empresas */}
                    <div className="space-y-2">
                      {companiesInState.length === 0 ? (
                        <p className="text-sm text-neutral-text-secondary py-2">Nenhuma empresa neste estado.</p>
                      ) : (
                        companiesInState.map((c) => {
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
                            <div
                              key={c.companyId}
                              className="bg-neutral-background rounded-lg border border-neutral-border/50 hover:border-primary-blue/30 transition-colors overflow-hidden"
                            >
                              <button
                                onClick={() => {
                                  setExpandedCompanies((prev) => {
                                    const newSet = new Set(prev)
                                    if (newSet.has(c.companyId)) {
                                      newSet.delete(c.companyId)
                                    } else {
                                      newSet.add(c.companyId)
                                    }
                                    return newSet
                                  })
                                }}
                                className="w-full flex items-center justify-between p-3 hover:bg-white/50 transition-colors"
                              >
                                <div className="flex-1 text-left">
                                  <p className="font-semibold text-sm text-neutral-text-primary">{c.companyName}</p>
                                  <p className="text-xs text-neutral-text-secondary">{c.city} · {c.region}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                  {companyTotals.xmlCount > 0 && (
                                    <span className="text-xs font-bold text-primary-blue bg-primary-blue/10 px-2 py-1 rounded">
                                      {companyTotals.xmlCount} XML
                                    </span>
                                  )}
                                  {companyTotals.nfCount > 0 && (
                                    <span className="text-xs font-bold text-secondary-purple bg-secondary-purple/10 px-2 py-1 rounded">
                                      {companyTotals.nfCount} NF
                                    </span>
                                  )}
                                  {companyTotals.nfcCount > 0 && (
                                    <span className="text-xs font-bold text-green-600 bg-green-100 px-2 py-1 rounded">
                                      {companyTotals.nfcCount} NFC
                                    </span>
                                  )}
                                  {isExpanded ? (
                                    <ChevronUp className="w-4 h-4 text-neutral-text-secondary" />
                                  ) : (
                                    <ChevronDown className="w-4 h-4 text-neutral-text-secondary" />
                                  )}
                                </div>
                              </button>
                              
                              {isExpanded && (
                                <div className="p-4 bg-white/30 border-t border-neutral-border/50 space-y-4">
                                  {/* Documentos */}
                                  <div>
                                    <p className="text-xs font-semibold text-neutral-text-secondary mb-2">Documentos Processados</p>
                                    <div className="grid grid-cols-3 gap-2">
                                      <div className="p-2 bg-primary-blue/10 rounded-lg text-center">
                                        <FileText className="w-4 h-4 text-primary-blue mx-auto mb-1" />
                                        <p className="text-xs text-neutral-text-secondary">XML</p>
                                        <p className="text-sm font-bold text-primary-blue">{companyTotals.xmlCount.toLocaleString()}</p>
                                      </div>
                                      <div className="p-2 bg-secondary-purple/10 rounded-lg text-center">
                                        <Receipt className="w-4 h-4 text-secondary-purple mx-auto mb-1" />
                                        <p className="text-xs text-neutral-text-secondary">NF</p>
                                        <p className="text-sm font-bold text-secondary-purple">{companyTotals.nfCount.toLocaleString()}</p>
                                      </div>
                                      <div className="p-2 bg-green-100 rounded-lg text-center">
                                        <CreditCard className="w-4 h-4 text-green-600 mx-auto mb-1" />
                                        <p className="text-xs text-neutral-text-secondary">NFC</p>
                                        <p className="text-sm font-bold text-green-600">{companyTotals.nfcCount.toLocaleString()}</p>
                                      </div>
                                    </div>
                                  </div>
                                  
                                  {/* Financeiro */}
                                  <div>
                                    <p className="text-xs font-semibold text-neutral-text-secondary mb-2">Informações Financeiras</p>
                                    <div className="space-y-2">
                                      <div className="flex items-center justify-between p-2 bg-green-50 rounded-lg border border-green-200">
                                        <div className="flex items-center gap-2">
                                          <DollarSign className="w-4 h-4 text-green-600" />
                                          <span className="text-xs text-neutral-text-secondary">Faturamento (Saída)</span>
                                        </div>
                                        <span className="text-sm font-bold text-green-600">
                                          R$ {companyTotals.faturamento.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </span>
                                      </div>
                                      <div className="flex items-center justify-between p-2 bg-red-50 rounded-lg border border-red-200">
                                        <div className="flex items-center gap-2">
                                          <DollarSign className="w-4 h-4 text-red-600" />
                                          <span className="text-xs text-neutral-text-secondary">Despesa (Entrada)</span>
                                        </div>
                                        <span className="text-sm font-bold text-red-600">
                                          R$ {companyTotals.despesa.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </span>
                                      </div>
                                      <div className={`flex items-center justify-between p-2 rounded-lg border ${
                                        companyTotals.resultado >= 0 
                                          ? 'bg-green-50 border-green-200' 
                                          : 'bg-red-50 border-red-200'
                                      }`}>
                                        <div className="flex items-center gap-2">
                                          {companyTotals.resultado >= 0 ? (
                                            <TrendingUp className="w-4 h-4 text-green-600" />
                                          ) : (
                                            <TrendingDown className="w-4 h-4 text-red-600" />
                                          )}
                                          <span className="text-xs text-neutral-text-secondary">Resultado (Saída - Entrada)</span>
                                        </div>
                                        <span className={`text-sm font-bold ${
                                          companyTotals.resultado >= 0 ? 'text-green-600' : 'text-red-600'
                                        }`}>
                                          R$ {Math.abs(companyTotals.resultado).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          )
                        })
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
            {selectedStates.length > 0 && (
              <button
                onClick={() => setSelectedStates([])}
                className="w-full py-2.5 text-sm text-neutral-text-secondary hover:text-primary-blue font-medium transition-colors border border-neutral-border/50 rounded-xl hover:border-primary-blue/30 hover:bg-primary-blue/5"
              >
                Limpar todas as seleções
              </button>
            )}
          </div>
        )}

        {/* Painel de empresa removido - apenas estados são selecionáveis */}

        {/* Legend */}
        <div className="mt-6 flex flex-wrap gap-3 justify-center">
          {Object.entries(regionColors).map(([region, color]) => {
            const count = companyLocations.filter(c => c.region === region).length
            if (count === 0) return null
            return (
              <div key={region} className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-br from-white to-neutral-background backdrop-blur-sm rounded-xl border-2 border-neutral-border/50 shadow-md hover:shadow-lg transition-all duration-300 card-3d">
                <div 
                  className="w-5 h-5 rounded-full border-2 border-white shadow-lg"
                  style={{ backgroundColor: color }}
                ></div>
                <span className="text-sm font-semibold text-neutral-text-primary">
                  {region}
                </span>
                <span className="text-xs font-bold text-primary-blue bg-primary-blue/10 px-2 py-0.5 rounded-full">
                  {count}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
    </>
  )
}
