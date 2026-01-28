'use client'

import { useEffect } from 'react'

export default function LeafletLoader() {
  useEffect(() => {
    // Dynamically import Leaflet CSS
    if (typeof window !== 'undefined') {
      import('leaflet/dist/leaflet.css').catch((err) => {
        console.warn('Failed to load Leaflet CSS:', err)
        // Fallback: load from CDN
        const link = document.createElement('link')
        link.rel = 'stylesheet'
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
        link.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY='
        link.crossOrigin = ''
        if (!document.querySelector('link[href*="leaflet"]')) {
          document.head.appendChild(link)
        }
      })
    }
  }, [])

  return null
}
