import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Sentinel CMS',
    short_name: 'Sentinel',
    description: 'Sistema de Gestión y CMS para Academias de Artes Marciales',
    start_url: '/',
    display: 'standalone',
    background_color: '#090e11',
    theme_color: '#4953ac',
    icons: [
      {
        src: '/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
    ],
  }
}
