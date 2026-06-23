import { defineConfig, loadEnv } from 'vite';
import { resolve } from 'path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const gtmId = env.VITE_GTM_ID?.trim() || 'GTM-XXXX';

  return {
    define: {
      __VITE_GTM_ID__: JSON.stringify(gtmId),
    },
    build: {
      rollupOptions: {
        input: {
          main: resolve(__dirname, 'index.html'),
          privacidade: resolve(__dirname, 'privacidade.html'),
          termos: resolve(__dirname, 'termos.html'),
        },
      },
    },
    plugins: [
      {
        name: 'inject-gtm',
        transformIndexHtml(html) {
          if (!gtmId || gtmId === 'GTM-XXXX') {
            return html.replace('data-gtm="GTM-XXXX"', 'data-gtm=""');
          }
          const noscript = `<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=${gtmId}" height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>`;
          return html
            .replace('data-gtm="GTM-XXXX"', `data-gtm="${gtmId}"`)
            .replace('<!-- GTM_NOSCRIPT -->', noscript);
        },
      },
    ],
  };
});
