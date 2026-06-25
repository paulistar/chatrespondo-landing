# Google Tag Manager + GA4 — ChatRespondo

Container GTM em produção na landing: **`GTM-NXB98NQK`** (`chatrespondo.com`).

O código já envia eventos no `dataLayer` **somente após consentimento** (Consent Mode v2 + banner LGPD).

## Eventos enviados pelo site

| Evento | Onde | Payload principal |
|--------|------|-------------------|
| `pageview` | Landing (após aceitar cookies) | `path` |
| `cta_click` | Landing CTAs | `cta_type`, `cta_medium`, `cta_url` |
| `signup_click` | CTAs de registro na landing | `cta_medium`, `cta_url` |
| `consent_update` | Banner cookies | `analytics_storage`, etc. |
| `signup` | Painel `/register` | `method` |
| `login` | Painel `/login` | — |
| `billing_upgrade` | Painel billing | `plan` |
| `onboarding_completed` | Painel onboarding | `channel`, `agent`, `invite` |

## Passo a passo no GTM (landing)

### 1. Criar propriedade GA4 (se ainda não tiver)

1. Acesse [Google Analytics](https://analytics.google.com).
2. **Admin → Criar propriedade** → nome: `ChatRespondo`.
3. Fluxo de dados **Web** → URL: `https://chatrespondo.com`.
4. Copie o **Measurement ID** (`G-XXXXXXXXXX`).
5. Guarde em env: `GA_MEASUREMENT_ID=G-XXXXXXXXXX` (opcional no painel).

### 2. Tag GA4 Configuration

1. Abra [Tag Manager](https://tagmanager.google.com) → container `GTM-NXB98NQK`.
2. **Tags → Nova** → tipo **Google Analytics: GA4 Configuration**.
3. Measurement ID: `{{GA4 Measurement ID}}` (variável abaixo) ou cole `G-XXXXXXXXXX`.
4. Acionador: **Consent Initialization – All Pages** (ou **All Pages** se já usa Consent Mode default).
5. Em **Configurações avançadas → Configurações de consentimento**:
   - `analytics_storage` → **necessário**

### 3. Variável do Measurement ID

1. **Variáveis → Nova → Constante**  
   - Nome: `GA4 Measurement ID`  
   - Valor: `G-XXXXXXXXXX`

### 4. Tag GA4 — eventos customizados

Crie tag **GA4 Event** para cada evento do dataLayer:

| Nome da tag | Event name GA4 | Acionador |
|-------------|----------------|-----------|
| GA4 - CTA Click | `cta_click` | Custom Event `cta_click` |
| GA4 - Signup Click | `signup_click` | Custom Event `signup_click` |
| GA4 - Pageview custom | `page_view` | Custom Event `pageview` |

**Acionador (exemplo `cta_click`):**

- Tipo: **Evento personalizado**
- Nome do evento: `cta_click`

**Parâmetros da tag (opcional, recomendado):**

- `cta_type` → `{{DLV - cta_type}}`
- `cta_medium` → `{{DLV - cta_medium}}`

Crie variáveis **Data Layer Variable** para cada chave (`cta_type`, `cta_medium`, `cta_url`, `plan`, etc.).

### 5. Consent Mode v2 (já no HTML da landing)

A landing injeta default `denied` e o banner dispara `consent_update` com `granted`/`denied`.

No GTM, em **Admin → Configurações do container → Consent Overview**:

- Ative **Consent Mode**
- Tags GA4 devem exigir consentimento de **analytics_storage**

### 6. Publicar e validar

1. **Visualizar** → abra `https://chatrespondo.com` → aceite cookies → clique em CTA.
2. Tag Assistant ou **DebugView** no GA4.
3. **Enviar** versão do container.

## Painel (`panel.chatrespondo.com`)

O painel **não** carrega GTM por padrão. Eventos vão para:

- **PostHog** (`NEXT_PUBLIC_POSTHOG_KEY`) — product analytics
- **dataLayer** (para futuro GTM no painel) — `signup`, `login`, `billing_upgrade`, `onboarding_completed`

### Opção A — GTM no painel (recomendado se quiser GA4 unificado)

1. Crie container GTM separado ou use o mesmo com trigger hostname `panel.chatrespondo.com`.
2. Adicione snippet GTM no `chatrespondo-web` (via `next/script`) **após** consentimento.
3. Replique tags GA4 Event da tabela acima.

### Opção B — gtag direto no painel

1. Defina `NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX` no EasyPanel (serviço `web`).
2. Carregue gtag somente após `cr_cookie_consent === accepted` (mesmo padrão do banner).

## Env vars (EasyPanel)

| Serviço | Variável | Descrição |
|---------|----------|-----------|
| landing | `VITE_GTM_ID` | `GTM-NXB98NQK` (build arg Dockerfile) |
| landing | `VITE_POSTHOG_KEY` | Project API key PostHog |
| landing | `VITE_POSTHOG_HOST` | `https://us.i.posthog.com` |
| web | `NEXT_PUBLIC_POSTHOG_KEY` | Project API key PostHog |
| web | `NEXT_PUBLIC_POSTHOG_HOST` | `https://us.i.posthog.com` |
| web | `NEXT_PUBLIC_GA_MEASUREMENT_ID` | `G-XXXXXXXXXX` (opcional) |
| api | `SENTRY_DSN` | DSN projeto API Sentry |
| web | `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` | DSN projeto Web Sentry |
| api | `SLACK_WEBHOOK_URL` | Incoming Webhook para alertas ops |

## Checklist rápido

- [ ] GA4 property criada + Measurement ID anotado
- [ ] Tag GA4 Configuration publicada no GTM-NXB98NQK
- [ ] Triggers para `cta_click`, `signup_click`, `pageview`
- [ ] Consent Mode validado (sem cookies analytics antes do aceite)
- [ ] PostHog recebendo eventos (Live events)
- [ ] Sentry recebendo erros de api + panel
