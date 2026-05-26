/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Every Steam CDN subdomain we've seen in the wild, plus the
    // ByMykel mirror. If a new one appears, add it here — next/image
    // throws a hard error on any non-allowlisted host.
    remotePatterns: [
      { protocol: "https", hostname: "community.cloudflare.steamstatic.com" },
      { protocol: "https", hostname: "community.akamai.steamstatic.com" },
      { protocol: "https", hostname: "community.fastly.steamstatic.com" },
      { protocol: "https", hostname: "steamcommunity-a.akamaihd.net" },
      { protocol: "https", hostname: "cdn.steamstatic.com" },
      { protocol: "https", hostname: "raw.githubusercontent.com" },
    ],
  },
};

export default nextConfig;
