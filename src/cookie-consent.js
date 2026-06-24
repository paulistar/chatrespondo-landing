const STORAGE_KEY = 'cr_cookie_consent';

export function getCookieConsent() {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    if (value === 'accepted' || value === 'rejected') return value;
  } catch {
    /* private mode */
  }
  return null;
}

export function setCookieConsent(value) {
  try {
    localStorage.setItem(STORAGE_KEY, value);
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new CustomEvent('cr:cookie-consent', { detail: value }));
}

function pushConsentMode(granted) {
  window.dataLayer = window.dataLayer || [];
  const state = granted ? 'granted' : 'denied';
  window.dataLayer.push({
    event: 'consent_update',
    analytics_storage: state,
    ad_storage: state,
    ad_user_data: state,
    ad_personalization: state,
  });
}

function renderBanner(onAccept, onReject) {
  if (document.querySelector('[data-cookie-consent]')) return;

  const banner = document.createElement('div');
  banner.dataset.cookieConsent = 'true';
  banner.setAttribute('role', 'dialog');
  banner.setAttribute('aria-label', 'Consentimento de cookies');
  banner.className =
    'fixed inset-x-0 bottom-0 z-50 border-t border-muted bg-bg/95 p-4 shadow-lg backdrop-blur';

  banner.innerHTML = `
    <div class="mx-auto flex max-w-5xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p class="text-sm text-text-muted">
        Usamos cookies essenciais e, com seu consentimento, analytics para medir conversões.
        <a href="/privacidade.html" class="underline">Política de Privacidade</a>.
      </p>
      <div class="flex shrink-0 gap-2">
        <button type="button" data-cookie-reject class="rounded-lg border border-muted px-3 py-2 text-sm font-medium">
          Recusar
        </button>
        <button type="button" data-cookie-accept class="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white">
          Aceitar
        </button>
      </div>
    </div>
  `;

  banner.querySelector('[data-cookie-accept]')?.addEventListener('click', onAccept);
  banner.querySelector('[data-cookie-reject]')?.addEventListener('click', onReject);
  document.body.appendChild(banner);
}

export function initCookieConsent(onAnalyticsAllowed) {
  const existing = getCookieConsent();
  if (existing === 'accepted') {
    pushConsentMode(true);
    onAnalyticsAllowed();
    return;
  }
  if (existing === 'rejected') {
    pushConsentMode(false);
    return;
  }

  pushConsentMode(false);

  renderBanner(
    () => {
      setCookieConsent('accepted');
      pushConsentMode(true);
      document.querySelector('[data-cookie-consent]')?.remove();
      onAnalyticsAllowed();
    },
    () => {
      setCookieConsent('rejected');
      pushConsentMode(false);
      document.querySelector('[data-cookie-consent]')?.remove();
    },
  );
}
