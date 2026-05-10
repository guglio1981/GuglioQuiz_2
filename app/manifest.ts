import type { MetadataRoute } from 'next'
 
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'GuglioQuiz',
    short_name: 'GuglioQuiz',
    description: 'Il quiz multiplayer - Rispondi veloce. Vinci tutto.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0a0a0a',
    theme_color: '#eab308',
    icons: [
      {
        src: '/logo-gq.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/logo-gq.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
}
