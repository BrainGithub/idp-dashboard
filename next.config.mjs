/** @type {import('next').NextConfig} */

const nextConfig = {
    experimental: {
        ppr: 'incremental', // partial prerendering
    },
};

export default nextConfig;
