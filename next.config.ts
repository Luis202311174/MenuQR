import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.0.105"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "fkstxnetunqidfhcyfst.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
