import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config, {dev}) => {
    if(!dev){
      config.cache = false;
    }

    return config;
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '20mb',
    },
  }
};

export default nextConfig;
