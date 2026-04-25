import { defineConfig } from 'astro/config'
import starlight from '@astrojs/starlight'
import mermaid from 'astro-mermaid'

export default defineConfig({
  site: 'https://yagudaev.github.io',
  base: '/voiceclaw',
  integrations: [
    mermaid({
      theme: 'dark',
      autoTheme: true,
      mermaidConfig: {
        themeVariables: {
          // VoiceClaw brand palette
          primaryColor: '#1c1636',
          primaryTextColor: '#f5f3ff',
          primaryBorderColor: '#6c63ff',
          secondaryColor: '#4a3fd9',
          secondaryTextColor: '#f5f3ff',
          secondaryBorderColor: '#8b84ff',
          tertiaryColor: '#14102a',
          tertiaryTextColor: '#c4c1ff',
          tertiaryBorderColor: '#c4c1ff',
          lineColor: '#8b84ff',
          textColor: '#e6e3ff',
          mainBkg: '#1c1636',
          secondBkg: '#14102a',
          background: 'transparent',
          // Flowchart edge labels (the pill boxes on arrows)
          edgeLabelBackground: '#1c1636',
          clusterBkg: '#0f0b1e',
          clusterBorder: '#6c63ff',
          nodeBorder: '#6c63ff',
          defaultLinkColor: '#8b84ff',
          titleColor: '#f5f3ff',
          // Sequence diagrams
          actorBkg: '#1c1636',
          actorBorder: '#6c63ff',
          actorTextColor: '#f5f3ff',
          actorLineColor: '#8b84ff',
          signalColor: '#c4c1ff',
          signalTextColor: '#f5f3ff',
          labelBoxBkgColor: '#4a3fd9',
          labelBoxBorderColor: '#6c63ff',
          labelTextColor: '#f5f3ff',
          loopTextColor: '#c4c1ff',
          noteBkgColor: '#4a3fd9',
          noteTextColor: '#f5f3ff',
          noteBorderColor: '#8b84ff',
          activationBkgColor: '#6c63ff',
          activationBorderColor: '#c4c1ff',
          sequenceNumberColor: '#0f0b1e',
        },
        flowchart: { curve: 'basis' },
        sequence: { useMaxWidth: true, mirrorActors: false },
      },
    }),
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
            { slug: 'desktop/onboarding', label: 'Desktop: onboarding wizard' },
            { slug: 'desktop/call-bar', label: 'Desktop: floating call bar' },
            { slug: 'desktop/volume-control', label: 'Desktop: agent volume control' },
            { slug: 'desktop/releasing', label: 'Desktop: releasing' },
            { slug: 'mobile-app' },
          ],
        },
        {
          label: 'Brain Agent Guides',
          items: [
            { slug: 'guides/openclaw' },
            { slug: 'guides/hermes' },
            { slug: 'guides/custom-agent' },
          ],
        },
        {
          label: 'Tools',
          items: [
            { slug: 'guides/web-search', label: 'Web Search (Tavily)' },
          ],
        },
        {
          label: 'Observability',
          items: [
            { slug: 'guides/tracing' },
            { slug: 'tracing-ui/spec', label: 'Tracing UI spec' },
            { slug: 'tracing/session-media', label: 'Session media timeline' },
          ],
        },
        {
          label: 'Development',
          items: [
            { slug: 'development/releasing', label: 'Releasing and versioning' },
          ],
        },
        {
          label: 'Operations',
          items: [
            { slug: 'operations/telemetry', label: 'Telemetry (PostHog)' },
          ],
        },
      ],
      customCss: ['./src/styles/custom.css'],
      lastUpdated: true,
    }),
  ],
})
