# Jira Backlog — ChatRespondo

## Epic: CHAT-SAAS — Self-serve Multi-tenant Go-Live

| Campo | Valor |
|-------|-------|
| **Projeto** | `SCRUM` (Mart Software) |
| **Epic** | `SCRUM-45` |
| **Label** | `chatrespondo` em todas as issues |
| **JQL** | `project = SCRUM AND parent = SCRUM-45` |
| **Roadmap** | `docs/SAAS-ROADMAP.md` |

### Fase 0 — Fundação entregue ✅

| Key | Título | Status |
|-----|--------|--------|
| SCRUM-46 | Rebrand e deploy api/web/postgres/redis | Concluído |
| SCRUM-47 | Landing page live com screenshots e UTMs | Concluído |
| SCRUM-48 | Billing sandbox Stripe checkout/portal/webhook | Concluído |
| SCRUM-49 | Trial 7 dias com enforcement na criação | Concluído |
| SCRUM-50 | Registro cria org com trial automático | Concluído |
| SCRUM-51 | Página billing no painel | Concluído |

### Fase 1 — Blockers go-live (P0)

| Key | Título |
|-----|--------|
| SCRUM-52 | Enforcement global billing/trial |
| SCRUM-53 | Módulo email transacional Resend |
| SCRUM-54 | Forgot password API + UI |
| SCRUM-55 | Verificação de email |
| SCRUM-56 | Aceite termos no signup LGPD |
| SCRUM-57 | Rate limit auth/register/login |
| SCRUM-58 | Stripe live mode cutover |
| SCRUM-59 | Idempotência webhooks Stripe |
| SCRUM-60 | Health checks /health e /ready |
| SCRUM-61 | CAPTCHA em auth público |
| SCRUM-62 | UX trial/billing banners e bloqueios |
| SCRUM-63 | Sentry error tracking API + Web |

### Fase 2 — Self-serve completo (P1)

| Key | Título |
|-----|--------|
| SCRUM-64 | Cron trial expiration e notificações |
| SCRUM-65 | Grace period e modo read-only |
| SCRUM-66 | Wizard onboarding pós-registro |
| SCRUM-67 | Convites por email e aceite logado |
| SCRUM-68 | Perfil conta e settings org |
| SCRUM-69 | RBAC na UI por role |
| SCRUM-70 | Persistir preferências notificação |
| SCRUM-71 | Hardening auth e Swagger prod |
| SCRUM-72 | Testes automatizados billing/auth |
| SCRUM-73 | GTM container ID na landing |

### Fase 3 — Compliance + operações

| Key | Título |
|-----|--------|
| SCRUM-74 | LGPD exportação e exclusão dados |
| SCRUM-75 | Cookie consent banner LGPD |
| SCRUM-76 | Stripe Tax Brasil |
| SCRUM-77 | Backup Postgres automatizado |
| SCRUM-78 | CI/CD deploy api + web |
| SCRUM-79 | Alertas operacionais produção |
| SCRUM-80 | Product analytics funil conversão |

### Fase 4 — Polish pagantes (P2)

| Key | Título |
|-----|--------|
| SCRUM-81 | Histórico faturas na UI |
| SCRUM-82 | Usage metering exportável |
| SCRUM-83 | Feature flags por plano |
| SCRUM-84 | Plano Business checkout Stripe |
| SCRUM-85 | Help center e suporte no app |
| SCRUM-86 | Centro notificações navbar |

---

## Epic: CHAT-LP — Landing Page ChatRespondo v1 (referência local)

| ID | Story | Status |
|----|-------|--------|
| LP-01 | Posicionamento + copy doc | Done — `docs/POSITIONING.md` |
| LP-02 | Design system Figma | Done — `docs/FIGMA-HANDOFF.md` + `design-system/` |
| LP-03 | Screenshots produto | Done — `public/images/screenshots/*.svg` |
| LP-04 | Repo + scaffold | Done — `chatrespondo-landing` |
| LP-05 | Seções Hero → Comparativo | Done |
| LP-06 | Seções Features → Prova | Done |
| LP-07 | ICP → Pricing → FAQ | Done |
| LP-08 | Páginas legais | Done — `privacidade.html`, `termos.html` |
| LP-09 | Deploy EasyPanel | Done — serviço `landing` @ chatrespondo.com |
| LP-10 | QA + Lighthouse | Done — `docs/QA-CHECKLIST.md` |
| LP-11 | Analytics + UTMs | Done — UTMs + `dataLayer` CTA clicks + GTM via `data-gtm` |
