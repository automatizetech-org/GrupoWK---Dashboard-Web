'use client'

import { useEffect } from 'react'

export default function LeafletLoader() {
  useEffect(() => {
    // Load Leaflet CSS via CDN (avoids bundler/TS issues)
    if (typeof window !== 'undefined') {
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
      link.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY='
      link.crossOrigin = ''
      if (!document.querySelector('link[href*="unpkg.com/leaflet"]')) {
        document.head.appendChild(link)
      }
    }
  }, [])

  return null
}
