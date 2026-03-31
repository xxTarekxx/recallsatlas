/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  trailingSlash: false,
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
