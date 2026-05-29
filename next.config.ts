import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "product-images.tcgplayer.com" },
      { protocol: "https", hostname: "tcgplayer-cdn.tcgplayer.com" },
      { protocol: "https", hostname: "images.pokemontcg.io" },
      { protocol: "https", hostname: "assets.tcgdex.net" },
      { protocol: "https", hostname: "den-cards.pokellector.com" },
      { protocol: "https", hostname: "images.scrydex.com" },
    ],
  },
};

export default nextConfig;
