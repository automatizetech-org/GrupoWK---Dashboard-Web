'use client'

import { Component, ReactNode } from 'react'
import dynamic from 'next/dynamic'

// Dynamic import to avoid chunk loading issues with react-leaflet
const CompanyMap = dynamic(() => import('./CompanyMap'), {
  ssr: false,
  loading: () => (
    <div className="card-3d-elevated bg-gradient-to-br from-white via-white to-neutral-background border border-neutral-border/50 rounded-2xl p-8 shadow-3d relative overflow-hidden">
      <div className="h-[600px] flex items-center justify-center">
        <div className="text-neutral-text-secondary">Carregando mapa...</div>
      </div>
    </div>
  )
})

interface SafeCompanyMapProps {
  selectedCompanyIds?: string[]
  dateRange?: { start: string; end: string }
}

interface SafeCompanyMapState {
  hasError: boolean
  error: Error | null
}

export default class SafeCompanyMap extends Component<SafeCompanyMapProps, SafeCompanyMapState> {
  constructor(props: SafeCompanyMapProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): SafeCompanyMapState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Erro no CompanyMap:', error, errorInfo)
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="card-3d-elevated bg-gradient-to-br from-white via-white to-neutral-background border border-neutral-border/50 rounded-2xl p-8 shadow-3d relative overflow-hidden">
          <div className="h-[600px] flex items-center justify-center">
            <div className="text-center">
              <p className="text-neutral-text-secondary mb-2">Erro ao carregar mapa</p>
              <button
                onClick={() => this.setState({ hasError: false, error: null })}
                className="px-4 py-2 bg-primary-blue text-white rounded-lg hover:bg-primary-blue-dark transition-colors"
              >
                Tentar novamente
              </button>
            </div>
          </div>
        </div>
      )
    }

    return <CompanyMap key={`${this.props.selectedCompanyIds?.join(',')}-${this.props.dateRange?.start}-${this.props.dateRange?.end}`} selectedCompanyIds={this.props.selectedCompanyIds} dateRange={this.props.dateRange} />
  }
}
