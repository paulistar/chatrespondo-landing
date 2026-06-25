import { getCookieConsent } from './cookie-consent';

/** @type {import('posthog-js').PostHog | null} */
let posthogClient = null;

function getPostHogKey() {
  return import.meta.env.VITE_POSTHOG_KEY?.trim();
}

function getPostHogHost() {
  return import.meta.env.VITE_POSTHOG_HOST?.trim() || 'https://us.i.posthog.com';
}

function pushDataLayer(event, payload = {}) {
  if (getCookieConsent() !== 'accepted') return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event, ...payload });
}

async function loadPostHog() {
  const key = getPostHogKey();
  if (!key || posthogClient || getCookieConsent() !== 'accepted') return;

  const { default: posthog } = await import('posthog-js');
  posthog.init(key, {
    api_host: getPostHogHost(),
    person_profiles: 'identified_only',
    capture_pageview: false,
    persistence: 'localStorage+cookie',
  });
  posthogClient = posthog;
  posthog.capture('pageview', { path: window.location.pathname });
}

export function initAnalytics() {
  const onConsent = () => {
    if (getCookieConsent() === 'accepted') {
      void loadPostHog();
      pushDataLayer('pageview', { path: window.location.pathname });
    }
  };

  window.addEventListener('cr:cookie-consent', onConsent);
  onConsent();
}

export function trackCtaClick(payload) {
  pushDataLayer('cta_click', payload);
  if (payload.cta_type === 'register') {
    pushDataLayer('signup_click', {
      cta_medium: payload.cta_medium,
      cta_url: payload.cta_url,
    });
  }
  if (posthogClient) {
    posthogClient.capture('cta_click', payload);
    if (payload.cta_type === 'register') {
      posthogClient.capture('signup_click', payload);
    }
  }
}
