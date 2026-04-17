import { defineConfig } from 'astro/config'
import starlight from '@astrojs/starlight'

export default defineConfig({
  site: 'https://yagudaev.github.io',
  base: '/voiceclaw',
  integrations: [
    starlight({
      title: 'VoiceClaw',
      description: 'Voice interface for any AI',
      social: [
        {
          icon: 'github',
          label: 'GitHub',
          href: 'https://github.com/yagudaev/voiceclaw',
        },
      ],
      editLink: {
        baseUrl: 'https://github.com/yagudaev/voiceclaw/edit/main/docs/',
      },
      sidebar: [
        { label: 'Home', slug: 'index' },
        {
          label: 'Getting Started',
          items: [
            { slug: 'architecture' },
            { slug: 'contributing' },
          ],
        },
        {
          label: 'Guides',
          items: [
            { slug: 'relay-server' },
            { slug: 'desktop-app' },
            { slug: 'mobile-app' },
          ],
        },
      ],
      customCss: ['./src/styles/custom.css'],
      lastUpdated: true,
    }),
  ],
})
