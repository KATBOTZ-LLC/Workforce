/** @type {import('next').NextConfig} */

// The API is served under the SAME ORIGIN as the site, via the rewrite below.
//
// Why: the browser then calls relative paths like /api/me, so there is no CORS
// preflight, no second URL to configure, and no NEXT_PUBLIC_API_BASE_URL baked
// into the bundle at build time. One public URL serves the whole application,
// which is what makes a single tunnel (or a single Cloud Run domain later) work.
//
// Set API_PROXY_TARGET to point at the FastAPI backend. Defaults to local dev.
const API_TARGET = process.env.API_PROXY_TARGET || 'http://127.0.0.1:8000'

const nextConfig = {
  reactStrictMode: true,
  // Cloud Run: emit a self-contained server bundle so the runtime image needs
  // neither node_modules nor a build step. Harmless locally.
  output: 'standalone',
  async rewrites() {
    return [{ source: '/api/:path*', destination: `${API_TARGET}/api/:path*` }]
  },
}

module.exports = nextConfig
