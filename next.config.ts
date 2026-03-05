import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Required for Twilio SDK (uses some Node.js built-ins)
  serverExternalPackages: ['twilio'],
};

export default nextConfig;
