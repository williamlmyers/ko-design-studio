/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingIncludes: {
    '/api/**/*': ['./src/generated/prisma/**/*'],
    '/*': ['./src/generated/prisma/**/*'],
  },
  turbopack: {
    resolveAlias: {
      canvas: './src/lib/empty-canvas.js',
    },
  },
};

export default nextConfig;
