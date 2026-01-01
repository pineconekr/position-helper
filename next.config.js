/** @type {import('next').NextConfig} */
const nextConfig = {
    // Enable React Strict Mode
    reactStrictMode: true,

    // Transpile specific packages that need it
    transpilePackages: ['plotly.js-dist-min', 'react-plotly.js'],
}

module.exports = nextConfig
