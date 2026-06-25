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
            return html
              .replace('data-gtm="GTM-XXXX"', 'data-gtm=""')
              .replace('<!-- GTM_HEAD -->', '')
              .replace('<!-- GTM_NOSCRIPT -->', '');
          }
          const headScript = `<!-- Google Tag Manager -->
<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${gtmId}');</script>
<!-- End Google Tag Manager -->`;
          const noscript = `<!-- Google Tag Manager (noscript) -->
<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=${gtmId}"
height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
<!-- End Google Tag Manager (noscript) -->`;
          return html
            .replace('data-gtm="GTM-XXXX"', `data-gtm="${gtmId}"`)
            .replace('<!-- GTM_HEAD -->', headScript)
            .replace('<!-- GTM_NOSCRIPT -->', noscript);
        },
      },
    ],
  };
});
