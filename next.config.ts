import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { hostname: "images.pokemontcg.io" },
      { hostname: "ytkqimcpyjweggivufuh.supabase.co" },
    ],
  },
};

export default nextConfig;
