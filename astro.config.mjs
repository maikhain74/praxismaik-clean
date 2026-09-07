import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://www.praxismaik.de',

  redirects: {
    '/pruefung/fallbeispiele/fall-behinderung-kommunikation-eskalation/':
      '/pruefung/fallbeispiele/fall-asthma-jugendlicher-nonadherence/',
  },

  integrations: [sitemap()],

  adapter: vercel(),
});