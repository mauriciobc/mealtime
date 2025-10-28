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
  // Turbopack é o bundler padrão no Next.js 16
  // Config vazio indica que queremos usar Turbopack sem configuração customizada
  turbopack: {},
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
