/** @type {import('next').NextConfig} */
const isProd = process.env.NODE_ENV === "production";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  { key: "X-DNS-Prefetch-Control", value: "on" },
];

if (isProd) {
  securityHeaders.push({
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains; preload",
  });
}

const nextConfig = {
  reactStrictMode: true,
  trailingSlash: false,
  /** Smaller client bundles; server .maps may still exist (see deploy-next.ps1 strip step). */
  productionBrowserSourceMaps: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/recalls/vehicle/:campaignNumber/",
        destination: "/recalls/vehicle/:campaignNumber",
        permanent: true,
      },
      {
        source: "/:lang/recalls/vehicle/:campaignNumber/",
        destination: "/:lang/recalls/vehicle/:campaignNumber",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
