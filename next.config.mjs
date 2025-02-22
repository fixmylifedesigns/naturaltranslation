/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Fix hydration issues with CSS in production
  optimizeFonts: false,
  // Ensure consistent behavior between dev and prod
  swcMinify: true,
};

export default nextConfig;
