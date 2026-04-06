/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co', // Suas capas do Storage
      },
      {
        protocol: 'https',
        hostname: 'image.tmdb.org', // Filmes/Séries
      },
      {
        protocol: 'https',
        hostname: 'cdn.myanimelist.net', // Animes/Mangás
      },
      {
        protocol: 'https',
        hostname: 'books.google.com', // Livros
      },
    ],
  },
};

module.exports = nextConfig;