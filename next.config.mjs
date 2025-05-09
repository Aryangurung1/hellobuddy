/** @type {import('next').NextConfig} */
const nextConfig = {
    async redirects() {
        return [
            {
                source: '/sign-in',
                destination: '/api/auth/login',
                permanent: true,
            },
            {
                source: '/sign-up',
                destination: '/api/auth/register',
                permanent: true,
            },
            {
                source: '/log-out',
                destination: '/api/auth/logout',
                permanent: true,
            },
        ];
    },
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'gravatar.com',
                port: '',
                pathname: '/**', // Allows all paths
            },
        ],
    },
    webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
        config.resolve.alias.canvas = false;
        config.resolve.alias.encoding = false;

        return config;
    },
};

export default nextConfig;
