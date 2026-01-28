'use client'

import { useState, useEffect } from 'react'
import { MapPin } from 'lucide-react'

interface PostLocation {
  id: string
  name: string
  region: string
  lat: number
  lng: number
  count?: number
}

interface WorldMapProps {
  posts?: PostLocation[]
}

// Mock data - substitua pelos dados reais do Supabase
const defaultPosts: PostLocation[] = [
  { id: '1', name: 'Post São Paulo', region: 'Sudeste', lat: -23.5505, lng: -46.6333, count: 150 },
  { id: '2', name: 'Post Rio de Janeiro', region: 'Sudeste', lat: -22.9068, lng: -43.1729, count: 120 },
  { id: '3', name: 'Post Belo Horizonte', region: 'Sudeste', lat: -19.9167, lng: -43.9345, count: 80 },
  { id: '4', name: 'Post Curitiba', region: 'Sul', lat: -25.4284, lng: -49.2733, count: 95 },
  { id: '5', name: 'Post Porto Alegre', region: 'Sul', lat: -30.0346, lng: -51.2177, count: 70 },
  { id: '6', name: 'Post Brasília', region: 'Centro-Oeste', lat: -15.7942, lng: -47.8822, count: 60 },
  { id: '7', name: 'Post Salvador', region: 'Nordeste', lat: -12.9714, lng: -38.5014, count: 85 },
  { id: '8', name: 'Post Recife', region: 'Nordeste', lat: -8.0476, lng: -34.8770, count: 75 },
  { id: '9', name: 'Post Fortaleza', region: 'Nordeste', lat: -3.7172, lng: -38.5433, count: 65 },
  { id: '10', name: 'Post Manaus', region: 'Norte', lat: -3.1190, lng: -60.0217, count: 45 },
]

const regionColors: Record<string, string> = {
  'Sudeste': '#2563EB',
  'Sul': '#10B981',
  'Nordeste': '#F59E0B',
  'Norte': '#7C3AED',
  'Centro-Oeste': '#EF4444',
}

// Convert lat/lng to SVG coordinates (simple projection for Brazil)
const latLngToSVG = (lat: number, lng: number, width: number, height: number) => {
  // Brazil bounds approximation
  const minLat = -35
  const maxLat = 5
  const minLng = -75
  const maxLng = -30
  
  const x = ((lng - minLng) / (maxLng - minLng)) * width
  const y = height - ((lat - minLat) / (maxLat - minLat)) * height
  
  return { x, y }
}

export default function WorldMap({ posts = defaultPosts }: WorldMapProps) {
  const [selectedPost, setSelectedPost] = useState<PostLocation | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className="card-3d-elevated bg-gradient-to-br from-white via-white to-neutral-background border border-neutral-border/50 rounded-2xl p-8 shadow-3d relative overflow-hidden">
        <div className="h-[500px] flex items-center justify-center">
          <div className="text-neutral-text-secondary">Carregando mapa...</div>
        </div>
      </div>
    )
  }

  const mapWidth = 800
  const mapHeight = 600

  return (
    <div className="card-3d-elevated bg-gradient-to-br from-white via-white to-neutral-background border border-neutral-border/50 rounded-2xl p-8 shadow-3d relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary-blue/5 via-transparent to-secondary-purple/5"></div>
      <div className="relative z-10">
        <h3 className="text-xl font-bold text-neutral-text-primary mb-6 flex items-center gap-2">
          <div className="w-1 h-6 bg-gradient-to-b from-primary-blue to-secondary-purple rounded-full shadow-lg"></div>
          Rede de Posts - Localização por Região
        </h3>
        
        <div className="rounded-xl overflow-hidden shadow-lg bg-gradient-to-br from-blue-50 to-purple-50 relative" style={{ height: '500px' }}>
          <svg 
            width="100%" 
            height="100%" 
            viewBox="0 0 800 600" 
            preserveAspectRatio="xMidYMid meet"
            className="absolute inset-0"
          >
            {/* Background grid */}
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#E5E7EB" strokeWidth="0.5" opacity="0.3"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
            
            {/* Region connections (optional - show connections between posts) */}
            {posts.map((post, index) => {
              if (index === 0) return null
              const prevPost = posts[index - 1]
              const start = latLngToSVG(prevPost.lat, prevPost.lng, mapWidth, mapHeight)
              const end = latLngToSVG(post.lat, post.lng, mapWidth, mapHeight)
              return (
                <line
                  key={`line-${index}`}
                  x1={start.x}
                  y1={start.y}
                  x2={end.x}
                  y2={end.y}
                  stroke={regionColors[post.region] || '#2563EB'}
                  strokeWidth="1"
                  strokeDasharray="4,4"
                  opacity="0.3"
                />
              )
            })}

            {/* Post markers */}
            {posts.map((post) => {
              const pos = latLngToSVG(post.lat, post.lng, mapWidth, mapHeight)
              const color = regionColors[post.region] || '#2563EB'
              
              return (
                <g key={post.id}>
                  {/* Glow effect */}
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r="20"
                    fill={color}
                    opacity="0.2"
                    className="animate-ping"
                    style={{ animation: 'none' }}
                  />
                  {/* Outer circle */}
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r="12"
                    fill={color}
                    opacity="0.6"
                    stroke="white"
                    strokeWidth="2"
                    className="cursor-pointer hover:r-14 transition-all"
                    onClick={() => setSelectedPost(post)}
                  />
                  {/* Inner circle */}
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r="6"
                    fill="white"
                    className="cursor-pointer"
                    onClick={() => setSelectedPost(post)}
                  />
                  {/* Label */}
                  <text
                    x={pos.x}
                    y={pos.y - 20}
                    textAnchor="middle"
                    className="text-xs font-semibold fill-neutral-text-primary pointer-events-none"
                    style={{ fontSize: '10px' }}
                  >
                    {post.name.split(' ')[1]}
                  </text>
                </g>
              )
            })}
          </svg>

          {/* Info panel */}
          {selectedPost && (
            <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-sm rounded-xl p-4 shadow-2xl border border-neutral-border/50 max-w-xs">
              <div className="flex items-start gap-3">
                <div 
                  className="w-3 h-3 rounded-full mt-1"
                  style={{ backgroundColor: regionColors[selectedPost.region] }}
                ></div>
                <div className="flex-1">
                  <h4 className="font-bold text-sm text-neutral-text-primary mb-1">{selectedPost.name}</h4>
                  <p className="text-xs text-neutral-text-secondary mb-2">Região: {selectedPost.region}</p>
                  {selectedPost.count && (
                    <p className="text-xs font-semibold text-primary-blue">Posts: {selectedPost.count}</p>
                  )}
                  <button
                    onClick={() => setSelectedPost(null)}
                    className="mt-2 text-xs text-neutral-text-secondary hover:text-primary-blue"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="mt-6 flex flex-wrap gap-4 justify-center">
          {Object.entries(regionColors).map(([region, color]) => {
            const count = posts.filter(p => p.region === region).length
            if (count === 0) return null
            return (
              <div key={region} className="flex items-center gap-2 px-3 py-1.5 bg-white/60 backdrop-blur-sm rounded-lg border border-neutral-border/50">
                <div 
                  className="w-4 h-4 rounded-full border-2 border-white shadow-sm"
                  style={{ backgroundColor: color }}
                ></div>
                <span className="text-sm font-medium text-neutral-text-primary">
                  {region} ({count})
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
