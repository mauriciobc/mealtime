/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  productionBrowserSourceMaps: true,
  images: {
    remotePatterns: [
      // Production domain from environment variable
      {
        protocol: process.env.NEXT_PUBLIC_APP_URL?.startsWith('https') ? 'https' : 'http',
        hostname: safeGetHostname(process.env.NEXT_PUBLIC_APP_URL) || 'localhost',
      },
      // Avatar generation domain from environment variable
      {
        protocol: 'https',
        hostname: process.env.NEXT_PUBLIC_AVATAR_DOMAIN || 'api.dicebear.com',
      },
      // Placeholder image domain from environment variable
      {
        protocol: 'https',
        hostname: process.env.NEXT_PUBLIC_PLACEHOLDER_DOMAIN || 'placekitten.com',
      },
      {
        protocol: 'https',
        hostname: '*.googleusercontent.com', // For Google profile images
      },
      {
        protocol: 'http',
        hostname: 'localhost',
      },
      {
        protocol: 'http',
        hostname: 'mealtime.local',
      },
      // Supabase domain from environment variable
      {
        protocol: 'https',
        hostname: safeGetHostname(process.env.NEXT_PUBLIC_SUPABASE_URL) || 'zzvmyzyszsqptgyqwqwt.supabase.co',
      }
    ],
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    minimumCacheTTL: 14400, // Changed from 60 to 14400 (4 hours - new default)
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [32, 48, 64, 96, 128, 256], // Removed 16 and 384 — not needed for our image strategy
    dangerouslyAllowLocalIP: false, // New security restriction (default: false)
    maximumRedirects: 3, // New default: 3 redirects maximum
    localPatterns: [ // For local images with query strings
      {
        pathname: '/**',
        search: '',
      },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb'
    },
    serverSourceMaps: true,
  },
  turbopack: {}, // Empty config to silence Turbopack/webpack conflict warning
  webpack: (config, { dev, isServer }) => {
    if (!isServer) {
      config.devtool = dev ? 'eval-source-map' : 'source-map';
      
      config.output = {
        ...config.output,
        devtoolModuleFilenameTemplate: (info) =>
          `webpack:///${info.resourcePath}?${info.loaders}`,
      };
    }

    config.resolve.alias = {
      ...config.resolve.alias,
      '@': '.',
    }
    config.watchOptions = {
      ...config.watchOptions,
      aggregateTimeout: 300,
    }
    return config
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; img-src 'self' data: blob: https://*.supabase.co https://accounts.google.com https://*.googleusercontent.com https://api.dicebear.com https://placekitten.com; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; font-src 'self'; connect-src 'self' https://*.supabase.co wss://*.supabase.co;"
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains'
          }
        ],
      },
      {
        source: '/api/:path*',
        headers: [
          { 
            key: 'Access-Control-Allow-Origin', 
            value: process.env.NODE_ENV === 'production' 
              ? 'https://mealtime.app.br' 
              : 'http://localhost:3000'
          },
          { 
            key: 'Access-Control-Allow-Methods', 
            value: 'GET, POST, PUT, DELETE, OPTIONS, PATCH' 
          },
          { 
            key: 'Access-Control-Allow-Headers', 
            value: 'Content-Type, Authorization, X-Requested-With, Accept, Origin, X-User-ID' 
          },
          { 
            key: 'Access-Control-Allow-Credentials', 
            value: 'true' 
          },
          { 
            key: 'Access-Control-Max-Age', 
            value: '86400' 
          },
        ],
      },
      {
        source: '/profiles/cats/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
          { key: 'Vary', value: 'Accept' }
        ],
      },
    ]
  },
}

// Função utilitária para extrair hostname de uma URL de forma segura
function safeGetHostname(urlString) {
  if (!urlString) return null;
  try {
    return new URL(urlString).hostname;
  } catch {
    return null;
  }
}

export default nextConfig
