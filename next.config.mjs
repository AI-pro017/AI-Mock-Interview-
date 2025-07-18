/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'images.unsplash.com',
                port: '',
                pathname: '**',
            },
        ],
    },
    experimental: {
        serverComponentsExternalPackages: ['bcryptjs'],
    },
    webpack: (config, { isServer }) => {
        if (isServer) {
            config.externals.push('bcryptjs');
        }
        return config;
    },
};

export default nextConfig;
 