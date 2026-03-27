/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  basePath: '/ecobio-nextjs-ui',
  images: {
    unoptimized: true,
  },
  // Experimental: Force static export to work properly
  experimental: {
    outputFileTracingExcludes: {
      '*': ['./node_modules/@swc/core-linux-x64-gnu'],
    },
  },
};

export default nextConfig;
