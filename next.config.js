/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Disable image optimization cache for static images
  images: {
    unoptimized: false,
  },
  // Add cache headers for static files
  async headers() {
    return [
      {
        source: '/images/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
        ],
      },
    ]
  },
  webpack: (config, { isServer }) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
    }
    
    // Exclude pdfjs-dist from server-side bundle only
    if (isServer) {
      config.externals = config.externals || []
      config.externals.push('pdfjs-dist')
    }
    
    // Fix for Leaflet - keep original configuration
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
      }
    }
    
    // Improve chunk loading for react-leaflet - keep original configuration
    config.optimization = {
      ...config.optimization,
      splitChunks: {
        ...config.optimization.splitChunks,
        cacheGroups: {
          ...config.optimization.splitChunks.cacheGroups,
          reactLeaflet: {
            test: /[\\/]node_modules[\\/]react-leaflet[\\/]/,
            name: 'react-leaflet',
            chunks: 'all',
            priority: 10,
          },
        },
      },
    }
    
    return config
  },
}

module.exports = nextConfig
