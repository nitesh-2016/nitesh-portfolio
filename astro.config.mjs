import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  site: 'https://nitesh-2016.github.io',
  base: '/nitesh-portfolio',
  integrations: [tailwind()],
  output: 'static',
  build: {
    inlineStylesheets: 'auto',
  },
});
