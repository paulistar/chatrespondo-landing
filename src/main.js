import './styles/main.css';

const REGISTER_BASE = 'https://panel.chatrespondo.com/register';
const LOGIN_BASE = 'https://panel.chatrespondo.com/login';

export function buildRegisterUrl(medium = 'cta') {
  const params = new URLSearchParams(window.location.search);
  if (!params.get('utm_source')) params.set('utm_source', 'landing');
  params.set('utm_medium', medium);
  if (!params.get('utm_campaign')) params.set('utm_campaign', 'trial');
  return `${REGISTER_BASE}?${params.toString()}`;
}

export function buildLoginUrl() {
  const params = new URLSearchParams(window.location.search);
  if (!params.get('utm_source')) params.set('utm_source', 'landing');
  params.set('utm_medium', 'login');
  return `${LOGIN_BASE}?${params.toString()}`;
}

function pushDataLayer(event, payload = {}) {
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event, ...payload });
}

function wireCtas() {
  document.querySelectorAll('[data-register]').forEach((el) => {
    const medium = el.getAttribute('data-register') || 'cta';
    const url = buildRegisterUrl(medium);
    el.setAttribute('href', url);
    el.addEventListener('click', () => {
      pushDataLayer('cta_click', {
        cta_type: 'register',
        cta_medium: medium,
        cta_url: url,
      });
    });
  });
  document.querySelectorAll('[data-login]').forEach((el) => {
    const url = buildLoginUrl();
    el.setAttribute('href', url);
    el.addEventListener('click', () => {
      pushDataLayer('cta_click', { cta_type: 'login', cta_url: url });
    });
  });
}

function wireFaq() {
  document.querySelectorAll('[data-faq-trigger]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const item = btn.closest('[data-faq-item]');
      const panel = item?.querySelector('[data-faq-panel]');
      const expanded = btn.getAttribute('aria-expanded') === 'true';

      document.querySelectorAll('[data-faq-trigger]').forEach((other) => {
        if (other !== btn) {
          other.setAttribute('aria-expanded', 'false');
          other.closest('[data-faq-item]')?.querySelector('[data-faq-panel]')?.classList.add('hidden');
        }
      });

      btn.setAttribute('aria-expanded', String(!expanded));
      panel?.classList.toggle('hidden', expanded);
    });
  });
}

function wireMobileNav() {
  const toggle = document.querySelector('[data-nav-toggle]');
  const menu = document.querySelector('[data-nav-menu]');
  if (!toggle || !menu) return;

  toggle.addEventListener('click', () => {
    const open = menu.classList.toggle('hidden');
    toggle.setAttribute('aria-expanded', String(!open));
  });
}

function wireHeader() {
  const header = document.querySelector('[data-header]');
  if (!header) return;

  const onScroll = () => {
    header.classList.toggle('border-muted', window.scrollY > 8);
    header.classList.toggle('bg-bg/90', window.scrollY > 8);
    header.classList.toggle('backdrop-blur-md', window.scrollY > 8);
  };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
}

function initAnalytics() {
  const gtmId = document.body.dataset.gtm;
  if (!gtmId || gtmId === 'GTM-XXXX') return;

  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' });
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtm.js?id=${gtmId}`;
  document.head.appendChild(script);
}

wireCtas();
wireFaq();
wireMobileNav();
wireHeader();
initAnalytics();
