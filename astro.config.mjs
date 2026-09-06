import { defineConfig } from 'astro/config';

import vercel from '@astrojs/vercel';

import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://www.praxismaik.de',

  redirects: {
    '/themen/pflegeprozess/durchfuehrung/':
      '/themen/pflegeausbildung/pflegeprozess/durchfuehrung/',

    '/themen/pflegeprozess/evaluation/':
      '/themen/pflegeausbildung/pflegeprozess/evaluation/',

    '/themen/pflegeprozess/informationssammlung/':
      '/themen/pflegeausbildung/pflegeprozess/informationssammlung/',

    '/themen/pflegeprozess/pflegediagnosen/':
      '/themen/pflegeausbildung/pflegeprozess/pflegediagnosen/',

    '/themen/pflegeprozess/pflegemassnahmen/':
      '/themen/pflegeausbildung/pflegeprozess/pflegemassnahmen/',

    '/themen/pflegeprozess/pflegeprobleme-ressourcen/':
      '/themen/pflegeausbildung/pflegeprozess/pflegeprobleme-ressourcen/',

    '/themen/pflegeprozess/pflegeprozess-grundlagen/':
      '/themen/pflegeausbildung/pflegeprozess/pflegeprozess-grundlagen/',

    '/themen/pflegeprozess/pflegeziele/':
      '/themen/pflegeausbildung/pflegeprozess/pflegeziele/',
  },

  integrations: [sitemap()],

  adapter: vercel()
});