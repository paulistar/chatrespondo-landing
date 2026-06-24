# ChatRespondo — Roadmap SaaS Self-Serve Multi-tenant

> **Epic Jira:** `SCRUM-45` — CHAT-SAAS — Self-serve Multi-tenant Go-Live  
> **Projeto:** Mart Software (`SCRUM`)  
> **Label:** `chatrespondo` em todas as issues

## Visão

ChatRespondo é um SaaS self-serve (não white-label) para atendimento omnichannel com IA. O go-live exige signup público seguro, trial de 7 dias com enforcement real, billing Stripe em modo live e experiência self-service completa (senha, convites, billing).

### Stack

| Camada | Repo | URL |
|--------|------|-----|
| API | `chatrespondo-api` | api.chatrespondo.com |
| Painel | `chatrespondo-web` | panel.chatrespondo.com |
| Landing | `chatrespondo-landing` | chatrespondo.com |
| Infra | EasyPanel + Cloudflare | — |

---

## Auditoria resumida (jun/2026)

### Pontos fortes (já entregues)

- Multi-tenancy via `Organization` + header `x-organization-id`
- Billing Stripe: checkout, portal, webhooks (sandbox validado)
- Trial 7 dias com limites (agentes/canais/membros) na criação
- Registro público cria org + trial + departamento padrão
- Página de billing no painel com uso vs limites
- Landing live com screenshots, UTMs e dataLayer
- Deploy api/web/postgres/redis em produção

### Gaps críticos (P0 — não abrir signup sem isso)

| Área | Gap |
|------|-----|
| Billing | Trial expirado não bloqueia inbox/messaging/IA em runtime |
| Email | Resend documentado no `.env` mas **sem módulo implementado** |
| Auth | Sem forgot password, sem verificação de email |
| Legal | Sem aceite de termos no signup |
| Segurança | Sem rate limit em `/auth/register` e `/login`; senha mín. 6 chars |
| Stripe live | Sem idempotência de webhooks; keys ainda em test |
| Ops | Sem `/health` real; sem backup Postgres automatizado |

---

## Fases

### Fase 0 — Fundação entregue ✅

**Objetivo:** Infra, billing sandbox e landing operacionais.

| Entregável | Critério de aceite |
|------------|-------------------|
| Rebrand + deploy | api/web/postgres/redis no ar |
| Landing v1 | chatrespondo.com com screenshots reais |
| Billing sandbox | Checkout + portal + webhook E2E com test keys |
| Trial + limites | Register cria org trial; enforcement na criação de recursos |
| Settings billing | Página Plano no painel com uso e CTAs Stripe |

**Status:** Concluído — ver issues `phase-0` no Jira (marcadas Done).

---

### Fase 1 — Blockers go-live (P0)

**Objetivo:** Abrir signup público com segurança mínima e billing que governa o produto.

| Entregável | Critério de aceite |
|------------|-------------------|
| Enforcement global billing | Trial expirado / `past_due` / `canceled` bloqueia ações críticas (inbox, messaging, IA) |
| Módulo email Resend | Welcome, trial ending (D-3/D-1/D0), payment failed, convite |
| Forgot password | API + UI com token expirável por email |
| Verificação de email | Campo `emailVerified` + fluxo confirmar/reenviar (ou decisão documentada de lançar sem) |
| Aceite termos signup | Checkbox + `termsAcceptedAt` + links termos/privacidade |
| Rate limit auth | Throttle em register/login/refresh (Redis) |
| CAPTCHA público | Turnstile ou reCAPTCHA em login/register |
| Stripe live cutover | Live keys, price IDs, webhook prod, checklist validado |
| Idempotência webhooks | Tabela `stripe_events` + dedup por `event.id` |
| Health checks | `/health` (liveness) + `/ready` (DB + Redis) |
| UX trial/billing | Banner global trial; bloqueio UI expirado; CTA `past_due` → portal |
| Sentry | Error tracking API + Web |

**Gate de saída:** Signup público habilitado; primeiro pagante real em Stripe live.

---

### Fase 2 — Self-serve completo (P1)

**Objetivo:** Experiência madura para trial → conversão → retenção.

| Entregável | Critério de aceite |
|------------|-------------------|
| Cron trial + notificações | Job diário expira trials; emails + notificações in-app billing |
| Grace period | 3 dias read-only após trial (configurável) |
| Onboarding wizard | Pós-registro: conectar canal → criar agente → checklist |
| Convites por email | Envio automático + aceite para usuário já logado |
| Perfil + settings org | Nome, senha, avatar; settings gerais da organização |
| RBAC na UI | AGENT não vê billing/members |
| Hardening auth | Senha forte, rotação refresh token, proteger Swagger prod |
| Notificações persistidas | Preferências de notificação salvam na API |
| Testes billing/auth | Cobertura mínima dos fluxos críticos |

**Gate de saída:** Usuário completa trial → paga → convida time sem suporte manual.

---

### Fase 3 — Compliance + operações (P1–P2)

**Objetivo:** LGPD, observabilidade e confiabilidade operacional.

| Entregável | Critério de aceite |
|------------|-------------------|
| LGPD export/delete | Endpoints exportação e exclusão/anonimização de titular |
| Cookie consent | Banner LGPD no painel e landing |
| Stripe Tax BR | Configuração fiscal (se aplicável) |
| Backup Postgres | Rotina automatizada + teste de restore documentado |
| CI/CD deploy | Pipeline api + web com smoke test pós-deploy |
| Alertas | 5xx, webhook failures, spike de signups |
| Product analytics | PostHog/Plausible com eventos signup/trial/convert |

**Gate de saída:** Auditoria LGPD básica passa; RPO/RTO documentados.

#### Progresso jun/2026

| Issue | Status |
|-------|--------|
| SCRUM-74 LGPD export/delete | ✅ API + UI perfil |
| SCRUM-75 Cookie consent | ✅ Landing + painel |
| SCRUM-77 Backup Postgres | ✅ Script + runbook |
| SCRUM-78 CI/CD smoke | ✅ Workflow pós-CI (api) + CI web |
| SCRUM-76 Stripe Tax | ⏸ Requer Stripe Dashboard live |
| SCRUM-79 Alertas | ⏸ Requer canal Slack/Sentry rules |
| SCRUM-80 Analytics | ⏸ Requer conta PostHog/Plausible |

---

## Google Tag Manager (SCRUM-73)

A landing já expõe `dataLayer` (`cta_click`) e carrega GTM via `data-gtm` / `VITE_GTM_ID`.

### Ativar em produção

1. Criar container em [tagmanager.google.com](https://tagmanager.google.com) (conta Mart Studios).
2. Configurar tag **GA4 Configuration** + trigger em evento custom `cta_click`.
3. Habilitar **Consent Mode v2** no container (default denied; atualizado pelo banner).
4. No EasyPanel → serviço `landing` → **Build args**: `VITE_GTM_ID=GTM-XXXXXXX`
5. Redeploy landing e validar com [Tag Assistant](https://tagassistant.google.com).

**Bloqueio atual:** nenhum `GTM-*` real encontrado no workspace nem no env EasyPanel — aguardando ID do usuário.

---

### Fase 4 — Polish para pagantes (P2)

**Objetivo:** Diferenciação e upsell para clientes pagos.

| Entregável | Critério de aceite |
|------------|-------------------|
| Histórico faturas | UI ou deep-link Stripe Portal enriquecido |
| Usage metering | Mensagens, tokens IA, seats exportáveis |
| Feature flags por plano | Além de limites numéricos |
| Plano Business Stripe | Price ID + checkout self-serve |
| Help center | Link docs/suporte no app |
| Centro notificações | Sino no navbar com histórico |

---

## Checklist Stripe Live Cutover

- [ ] Criar produtos/preços live no Stripe Dashboard (Starter R$89, Pro R$197)
- [ ] Atualizar env API: `STRIPE_SECRET_KEY=sk_live_*`, `STRIPE_WEBHOOK_SECRET=whsec_*`
- [ ] Atualizar price IDs: `STRIPE_PRICE_STARTER`, `STRIPE_PRICE_PRO`
- [ ] Registrar webhook endpoint prod: `https://api.chatrespondo.com/billing/webhook`
- [ ] Eventos: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`
- [ ] Testar checkout real com cartão → portal → cancelamento
- [ ] Validar `checkoutAvailable=true` no painel (sem fallback mailto)
- [ ] Remover/desabilitar test keys em produção

---

## Métricas de sucesso (90 dias pós go-live)

| Métrica | Meta |
|---------|------|
| Signup → ativação (1º canal) | > 40% |
| Trial → pago | > 15% |
| Churn involuntário (cartão) | < 5% (com dunning) |
| Uptime API | > 99.5% |
| Tempo resposta suporte billing | < 24h |

---

## Referências

- Backlog Jira: `docs/JIRA-BACKLOG.md`
- Landing backlog: Epic CHAT-LP (local)
- Billing API: `chatrespondo-api/src/modules/billing/`
- Billing UI: `chatrespondo-web/src/app/(dashboard)/settings/billing/`
