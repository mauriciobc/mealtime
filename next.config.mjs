/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  productionBrowserSourceMaps: true,
  images: {
    remotePatterns: [
      // Production domain from environment variable
      {
        protocol: process.env.NEXT_PUBLIC_APP_URL?.startsWith('https') ? 'https' : 'http',
        hostname: process.env.NEXT_PUBLIC_APP_URL?.replace(/^https?:\/\//, '') || 'localhost',
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
        hostname: process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/^https?:\/\//, '') || 'zzvmyzyszsqptgyqwqwt.supabase.co',
      }
    ],
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    minimumCacheTTL: 60,
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb'
    },
    serverSourceMaps: true,
  },
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
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, DELETE, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
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

export default nextConfig
