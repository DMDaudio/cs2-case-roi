/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "community.cloudflare.steamstatic.com" },
      { protocol: "https", hostname: "community.akamai.steamstatic.com" },
      { protocol: "https", hostname: "community.fastly.steamstatic.com" },
      { protocol: "https", hostname: "steamcommunity-a.akamaihd.net" },
      { protocol: "https", hostname: "raw.githubusercontent.com" },
    ],
  },
};

export default nextConfig;
