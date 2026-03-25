/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  basePath: '/ecobio-nextjs-ui',
  assetPrefix: '/ecobio-nextjs-ui',
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
