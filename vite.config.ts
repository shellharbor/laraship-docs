import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const siteUrl = process.env.SITE_URL?.replace(/\/$/, '');
if (siteUrl && !/^https:\/\/[A-Za-z0-9.-]+(?:\/[^\s<>"']*)?$/.test(siteUrl)) {
  throw new Error('SITE_URL must be an absolute HTTPS URL without quotes or whitespace');
}

export default defineConfig({
  base: process.env.BASE_PATH || '/',
  server: { watch: { ignored: ['**/tmp/**', '**/test-results/**', '**/playwright-report/**', '**/dist/**'] } },
  plugins: [react(), {
    name: 'site-metadata',
    transformIndexHtml(html) {
      return siteUrl ? html.replace('<!-- production-metadata -->',
        `<link rel="canonical" href="${siteUrl}/"><meta property="og:url" content="${siteUrl}/">`) : html;
    },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: '.nojekyll', source: '' });
      this.emitFile({ type: 'asset', fileName: 'robots.txt', source: `User-agent: *\nAllow: /\n${siteUrl ? `Sitemap: ${siteUrl}/sitemap.xml\n` : ''}` });
      if (siteUrl) this.emitFile({ type: 'asset', fileName: 'sitemap.xml', source:
        `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${siteUrl.replaceAll('&', '&amp;')}/</loc></url></urlset>` });
    },
  }],
});
