/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  basePath: '/ecobio-nextjs-ui',
  // Removing assetPrefix as it may cause issues with GitHub Pages deployment
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
