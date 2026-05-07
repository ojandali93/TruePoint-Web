import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { hostname: "images.pokemontcg.io" },
      { hostname: "images.scrydex.com" },
      { hostname: "images.tcggo.com" },
      { hostname: "ytkqimcpyjweggivufuh.supabase.co" },
    ],
  },
};

export default nextConfig;
