/** @type {import('next').NextConfig} */
const nextConfig = {
  // REMOVIDO: output: 'standalone' - incompatível com Netlify
  // Netlify usa OpenNext v3 automaticamente
  productionBrowserSourceMaps: false,
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
    minimumCacheTTL: 86400,
    qualities: [75, 90],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    // Removido 16 (não mais padrão no Next.js 16)
    imageSizes: [32, 48, 64, 96, 128, 256],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb'
    },
    serverSourceMaps: true,
  },
  // Security headers - override any automatic CSP from Next.js runtime
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy-Report-Only',
            value: "default-src 'self'; script-src 'self' https:; style-src 'self' https://fonts.googleapis.com 'unsafe-inline'; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https: wss:; object-src 'none'; base-uri 'self'; frame-ancestors 'self'; report-uri /api/csp-violation/report;"
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload'
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
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()'
          }
        ]
      }
    ];
  },

  // Flutter client compatibility rewrites
  async rewrites() {
    return [
      // Meals → Feedings
      { source: '/api/meals', destination: '/api/feedings' },
      { source: '/api/meals/:id', destination: '/api/feedings/:id' },
      { source: '/api/meals/:id/complete', destination: '/api/feedings/:id/complete' },
      { source: '/api/meals/:id/skip', destination: '/api/feedings/:id/skip' },
      
      // Homes → Households
      { source: '/api/homes/:path*', destination: '/api/households/:path*' },
      
      // User profile alias
      { source: '/api/user/profile', destination: '/api/users/me' },
    ];
  },
  
  // Turbopack é o bundler padrão no Next.js 15
  // Config vazio indica que queremos usar Turbopack sem configuração customizada
  turbopack: {},
  webpack: (config, { isServer }) => {
    // Exclude Node.js modules from client bundle
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        dns: false,
        child_process: false,
      };
    }
    return config;
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
