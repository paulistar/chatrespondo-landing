# ChatRespondo HQ — Console de Operação SaaS (Admin Cross-Tenant)

> **Para workers agênticos:** este é um **plano de implementação** (spec + fases), não código. A implementação deve seguir TDD (RED → GREEN → REFACTOR), commits frequentes e deploy incremental sem quebrar produção. Cada fase é entregável de forma independente. Segurança cross-tenant é requisito de bloqueio: nenhum login de agência pode ganhar visibilidade sobre outra org.

**Objetivo (uma frase):** dar ao time ChatRespondo (login `contato@chatrespondo.com`) um console de operação SaaS que enxerga e gerencia **todas as organizações** (assinaturas, financeiro, clientes ativos/trial/inativos, integrações), sem misturar com o painel do tenant.

**Arquitetura (resumo):** novo papel de **plataforma** (`PlatformAdmin`) fora do RBAC por-org; namespace de API `/api/v1/admin/*` protegido por `PlatformAdminGuard` (que **não** passa pelo `OrgGuard`); frontend em route group `(admin)` sob `/admin/*` no painel atual, arquitetado para futura extração em `admin.chatrespondo.com`.

**Tech Stack:** NestJS + Prisma/Postgres + Redis + BullMQ (API), Next.js App Router + Zustand + TanStack Query (web), Stripe (billing), Resend/Sentry/Slack/PostHog/GTM/Evolution (integrações), EasyPanel + Cloudflare (infra).

---

## 1. Objetivo e Não-objetivos

### Objetivo
- Console **cross-tenant** para o operador da plataforma: visão de negócio (MRR, trials, churn, signups) e visão operacional (orgs, assinaturas, financeiro, integrações, suporte).
- **Isolamento total** do painel do cliente: a experiência atual do tenant (`panel.chatrespondo.com`) permanece inalterada.
- Ações operacionais auditadas: conceder `billingExempt`, forçar/alterar plano, notas de suporte, e (fase posterior) "ver como" (impersonation read-only).
- Fundação de segurança: papel de plataforma explícito, guard dedicado, trilha de auditoria append-only.

### Não-objetivos (fora deste plano)
- White-label / reseller / sub-contas de agência (o produto é self-serve, não white-label — ver `SAAS-ROADMAP.md`).
- Reescrever billing/Stripe: reaproveita o módulo existente (`modules/billing`), apenas adiciona visões e operações admin.
- Impersonation com **escrita** (agir como o cliente escrevendo mensagens/config) no MVP — só "ver como" read-only, e mesmo assim numa fase posterior com auditoria forte.
- Editor de conteúdo/CMS, cobrança manual fora do Stripe, emissão fiscal (NF) — fora do escopo.
- Multi-idioma do console (só pt-BR no MVP).

---

## 2. Problema atual

O ChatRespondo é multi-tenant **por design de isolamento**, e é exatamente isso que impede um console de operação hoje:

| Camada | Evidência no código | Consequência |
|--------|---------------------|--------------|
| **JWT** | `auth.service.ts` → payload `{ sub, email }`; `req.user` = usuário. **Sem claim de papel/plataforma.** | O token não carrega nenhuma noção de "operador da plataforma". |
| **Resolução de org** | `OrgGuard` (`common/guards/org.guard.ts`) exige header `x-organization-id` e valida `UserOrganization` (membership). | Todo endpoint de domínio só responde para orgs das quais o usuário é **membro**. `contato@` só vê as orgs em que está em `user_organizations`. |
| **RBAC** | `enum OrgRole { OWNER, ADMIN, AGENT }`; `RolesGuard` lê `request.organization.userRole`. | Papéis são **por organização**. Não existe papel acima da org. |
| **Domínio** | Todos os modelos Prisma têm `organizationId`; queries sempre filtram por org. | Não há nenhum caminho que liste/agrupe orgs entre tenants. |
| **HQ org** | `Organization.billingExempt` (default false); a org HQ está marcada `billingExempt=true`. | HQ é só "mais uma org isenta" — não confere superpoderes. |

**Resultado:** ao logar como `contato@`, o operador cai no mesmo painel de tenant, vê **apenas a própria org (HQ)** e não tem tela alguma de operação SaaS. Grep confirmou: **zero** ocorrências de `SUPER_ADMIN | PlatformAdmin | isPlatformAdmin`. O console precisa ser construído do zero, mas reaproveitando billing, Stripe, auth e componentes de UI.

---

## 3. Personas

| Persona | Quem | Escopo | Como autentica hoje | O que muda |
|---------|------|--------|---------------------|------------|
| **Platform Admin** (`contato@chatrespondo.com`) | Time ChatRespondo (fundador/ops/financeiro/suporte) | **Todas** as orgs; métricas globais; operações de billing/suporte | Mesma tela de login; cai no painel de tenant | Ganha papel `PlatformAdmin` + acesso ao console `/admin/*` |
| **Tenant Owner / Admin** (agências e clientes) | `OWNER`/`ADMIN` de cada org cliente | Apenas a própria org | Login → `x-organization-id` da própria org | **Nada muda** — nunca vê `/admin/*`; API admin retorna 403 |
| **Tenant Agent** | `AGENT` das orgs clientes | Canais liberados na própria org | Idem | **Nada muda** |

Sub-papéis de plataforma (previstos no data model, aplicados por fase):
- `SUPER_ADMIN` — tudo, inclusive conceder/revogar outros admins de plataforma.
- `FINANCE` — dashboard + financeiro + assinaturas (read + operações de billing).
- `SUPPORT` — orgs (read), notas de suporte, "ver como" (fase posterior); **sem** operações financeiras.

> No MVP basta `SUPER_ADMIN`; os demais são gates prontos para granularidade futura (YAGNI: implementar o enum agora, aplicar escopos por fase).

---

## 4. Arquitetura proposta

### 4.1 Opções avaliadas

| # | Opção | Prós | Contras | Veredito |
|---|-------|------|---------|----------|
| **A** | **Rotas `/admin/*` no painel atual + namespace `/api/v1/admin/*` com `PlatformAdminGuard`** | Reaproveita auth, sessão, componentes, deploy e infra existentes; entrega mais rápida; `contato@` usa o mesmo login | Bundle do painel inclui código admin (mitigável com route group + gate server-side); exige disciplina para o guard admin **nunca** cair no `OrgGuard` | ✅ **Recomendado (P0), arquitetado para virar B** |
| B | **Host separado `admin.chatrespondo.com`** (frontend próprio, mesma API com namespace admin) | Isolamento máximo de blast-radius; UI admin nunca chega ao tenant; modelo mental limpo | Novo serviço EasyPanel + DNS + build; duplica primitivos de UI; mais tempo | ⏭️ **Alvo de evolução (P2/P3)** — migração barata se P0 já separar namespace/route group |
| C | Serviço de API admin dedicado + frontend próprio (microserviço) | Isolamento físico | Over-engineering; duplica auth/Prisma; YAGNI | ❌ |
| D | "Modo admin" dentro do painel de tenant (flag na org HQ) | Zero rota nova | Mistura concerns; alto risco de vazamento cross-tenant; difícil auditar | ❌ |

### 4.2 Recomendação

**Opção A agora, desenhada para migrar para B.** Concretamente:

1. **Backend — módulo `AdminModule`** com controllers sob `@Controller('admin/...')`, protegidos por `@UseGuards(JwtAuthGuard, PlatformAdminGuard)`. **Nunca** aplicar `OrgGuard` nesses controllers — o admin **não** manda `x-organization-id`; ele passa `orgId` como parâmetro de rota/query e o serviço admin faz a query cross-tenant explicitamente.
2. **`PlatformAdminGuard`** resolve `req.user.id` → consulta `PlatformAdmin` (cacheável em Redis, TTL curto). Sem registro → `403`. Injeta `req.platformAdmin = { userId, role, scopes }`.
3. **Frontend — route group `(admin)`** em `src/app/(admin)/admin/*`, com layout próprio (sidebar admin) e um **gate server-side/client-side** que só renderiza se `GET /admin/me` retornar 200. Login e store de auth reaproveitados; nova store `admin-store` para contexto de plataforma.
4. **Isolamento de dados:** serviços admin usam um repositório dedicado (`AdminOrgsRepository`, etc.) com queries cross-tenant conscientes; **proibido** reutilizar serviços de tenant que assumem `organizationId` do request.
5. **Caminho para B:** como o namespace de API já é `/admin/*` e o frontend já é um route group isolado, extrair para `admin.chatrespondo.com` depois é mover o route group para um app novo apontando na mesma API — sem refatorar backend.

### 4.3 Diagrama

```mermaid
flowchart TB
  subgraph Clients[Navegadores]
    HQ[contato@ - Platform Admin]
    AG[Agências - Tenant Owner/Admin/Agent]
  end

  subgraph Web[Next.js panel.chatrespondo.com]
    T["(dashboard)/* - painel tenant<br/>usa x-organization-id"]
    A["(admin)/admin/* - console SaaS<br/>gate por /admin/me"]
  end

  subgraph API[NestJS api.chatrespondo.com]
    JWT[JwtAuthGuard]
    OG[OrgGuard - x-organization-id + membership]
    PAG[PlatformAdminGuard - consulta PlatformAdmin]
    TCTRL[Controllers de tenant]
    ACTRL[AdminModule - /api/v1/admin/*]
    DB[(Postgres cross-tenant)]
    STR[Stripe]
  end

  HQ --> A
  AG --> T
  A -->|Bearer, SEM x-organization-id| PAG --> ACTRL --> DB
  ACTRL -.-> STR
  T -->|Bearer + x-organization-id| OG --> TCTRL --> DB
  JWT --- OG
  JWT --- PAG
```

### 4.4 Nota sobre o JWT
O access token é curto (15m) e só carrega `{ sub, email }`. **Não é obrigatório** mudar o token: o `PlatformAdminGuard` faz lookup por `userId` (com cache Redis). Vantagem: revogar acesso admin é imediato (apagar a linha `PlatformAdmin`), sem esperar expirar token. Opcional (fase posterior): incluir claim `pa: true` para reduzir 1 query — só se virar gargalo.

---

## 5. Módulos / Menus a implementar

Mapa do menu do console (`/admin/*`):

### 5.1 Dashboard (`/admin`)
KPIs de negócio agregados cross-tenant:
- **MRR / ARR** (soma de assinaturas ativas por plano; deriva de Stripe + `Organization.plan/planStatus`).
- **Trials ativos** / **trials expirando** (D-3/D-1/D0) / **conversão trial→pago**.
- **Novos signups** (por dia/semana; deriva de `Organization.createdAt`).
- **Churn** (cancelamentos no período; `planStatus=canceled` + eventos Stripe).
- **Distribuição por status:** trialing / active / past_due / grace_period / expired / canceled / exempt.
- **Contadores rápidos:** orgs totais, usuários totais, canais conectados, mensagens/dia (opcional, P3).

### 5.2 Clientes / Orgs (`/admin/orgs`)
- **Lista** filtrável por status (ativo, trial, past_due, grace, expired, canceled, inativo/soft-deleted, exempt), plano, data de criação, busca por nome/slug/email do owner.
- **Detalhe da org** (`/admin/orgs/:id`): dados cadastrais, plano/status efetivo (`resolveEffectiveStatus`), trial/grace, uso vs limites (reusa `getBillingStatus`), membros/roles, canais, `billingCustomerId/subscriptionId`, notas de suporte, timeline de auditoria da org.
- Estados "inativo": org sem login há N dias, sem canal ativo, ou `deletedAt != null`.

### 5.3 Assinaturas & Planos (`/admin/subscriptions`)
- Visão por org: plano atual, status, preço, próxima cobrança, cupom (se houver).
- Catálogo de planos (`PLAN_CATALOG`) read-only + limites por plano.
- **Operações (auditadas):** forçar plano (`plan`/`settings` limits override), conceder/revogar `billingExempt`, ajustar limites custom via `Organization.settings` (`maxAgents/maxChannels/maxMembers`).
- Cupons/descontos: **read-only via Stripe no MVP** (criar cupom no Stripe Dashboard); gestão in-app é P3.

### 5.4 Financeiro (`/admin/finance`)
- **Overview:** MRR por plano, faturamento do mês, receita reconhecida (best-effort via Stripe).
- **Invoices:** lista de faturas (proxy read-only para Stripe API), status (paga/aberta/falha).
- **Pagamentos falhos / dunning:** orgs em `past_due`, `invoice.payment_failed` recentes (reusa/estende `StripeWebhookEvent`), CTA para abrir portal/reenviar.
- **Exempts:** lista de orgs `billingExempt` (cortesias) — controle de "quanto está sendo dado de graça".

### 5.5 Integrações (`/admin/integrations`)
Painel de **status** das integrações da plataforma (não credenciais):
- **Stripe** (chaves live vs test, webhook configurado, último evento).
- **Resend** (domínio verificado, últimos envios/falhas — via módulo email).
- **Sentry** (habilitado? último erro).
- **Slack** (webhook de alertas configurado).
- **Evolution API** (health do serviço, nº de instâncias, `/ready` soft — ver `EVOLUTION-API-PLAN.md`).
- **GTM / PostHog** (IDs configurados? eventos chegando?).
- Cada card: status (ok/degradado/off) + link para runbook. **Nunca** expor secrets.

### 5.6 Operações (`/admin/ops`)
- **Notas de suporte** por org (append-only, auditadas).
- **Conceder cortesia** (`billingExempt`) / **forçar plano** — mesmas ações de 5.3, agrupadas por contexto de suporte.
- **"Ver como" (impersonation read-only)** — **P2+**, com token de sessão escopado, banner permanente "MODO SUPORTE — SOMENTE LEITURA", expiração curta, e log de auditoria de cada acesso. Escrita nunca no MVP.
- **Reprocessar webhook / reenviar email** (P3, opcional).

### 5.7 Auditoria / Logs (`/admin/audit`)
- Trilha append-only de **toda** ação admin: quem, quando, org alvo, ação, valor antes/depois, IP/UA.
- Filtro por admin, org, tipo de ação, período. Export CSV (P3).

### 5.8 Configurações do console (`/admin/settings`)
- Gestão de `PlatformAdmin` (listar, convidar/conceder, revogar, definir role) — só `SUPER_ADMIN`.

---

## 6. Segurança

Requisito de bloqueio: **nenhum login de agência pode enxergar outro tenant**.

| Vetor | Medida |
|-------|--------|
| **Autorização de plataforma** | `PlatformAdminGuard` obrigatório em **todos** os controllers `/admin/*`; nega por padrão (sem linha `PlatformAdmin` → 403). Testes garantindo 403 para OWNER/ADMIN de tenant comum. |
| **Separação de guards** | Controllers admin **nunca** usam `OrgGuard`; controllers de tenant **nunca** aceitam “bypass admin”. Sem código compartilhado que confunda os dois caminhos. |
| **Isolamento de dados** | Serviços admin usam repositórios cross-tenant explícitos; proibido injetar serviços de tenant que assumem `organizationId` do request. Lint/review checa import. |
| **Menor privilégio** | Enum de roles de plataforma (`SUPER_ADMIN/FINANCE/SUPPORT`); operações financeiras exigem `FINANCE`/`SUPER_ADMIN`; suporte não altera billing. |
| **Auditoria** | Toda mutação admin grava `AdminAuditLog` (append-only) na mesma transação da ação. Sem log = ação recusada. |
| **Impersonation (P2+)** | Somente leitura; token escopado + curto; banner visível; cada acesso logado; **desativável por env** (`ADMIN_IMPERSONATION_ENABLED=false`); LGPD: acesso a dados de titular registrado. |
| **Superfície do frontend** | Route group `(admin)` com gate server-side (`/admin/me`); nenhuma tela admin renderiza sem confirmação da API. Migração para host separado remove o bundle admin do painel do tenant de vez. |
| **Rate limit & CSRF** | Reaproveita throttle/guards existentes; endpoints admin com throttle próprio. |
| **Segredos** | Painel de integrações mostra **status**, nunca chaves; secrets seguem em env (EasyPanel). |
| **Concessão inicial** | Primeiro `PlatformAdmin` (`contato@`) criado via **migration/seed idempotente** (por email), não por endpoint público. Revogação = deletar linha (efeito imediato via cache curto). |

---

## 7. Mudanças no data model (Prisma)

Aditivas e não-destrutivas.

```prisma
enum PlatformAdminRole {
  SUPER_ADMIN
  FINANCE
  SUPPORT
}

model PlatformAdmin {
  id          String            @id @default(cuid())
  userId      String            @unique @map("user_id")
  role        PlatformAdminRole @default(SUPER_ADMIN)
  grantedById String?           @map("granted_by_id")
  createdAt   DateTime          @default(now()) @map("created_at")
  revokedAt   DateTime?         @map("revoked_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@map("platform_admins")
}

model AdminAuditLog {
  id             String   @id @default(cuid())
  actorUserId    String   @map("actor_user_id")     // qual PlatformAdmin
  action         String                              // ex: "org.set_exempt", "org.force_plan", "impersonate.start"
  targetOrgId    String?  @map("target_org_id")      // org alvo (quando aplicável)
  targetUserId   String?  @map("target_user_id")
  fromValue      Json?    @map("from_value")
  toValue        Json?    @map("to_value")
  ip             String?
  userAgent      String?  @map("user_agent")
  metadata       Json     @default("{}")
  createdAt      DateTime @default(now()) @map("created_at")

  @@index([actorUserId, createdAt(sort: Desc)], name: "idx_admin_audit_actor_time")
  @@index([targetOrgId, createdAt(sort: Desc)], name: "idx_admin_audit_org_time")
  @@index([action, createdAt(sort: Desc)], name: "idx_admin_audit_action_time")
  @@map("admin_audit_logs")
}
```

- Adicionar relação inversa em `User`: `platformAdmin PlatformAdmin?`.
- **Seed idempotente**: garantir uma linha `PlatformAdmin` (SUPER_ADMIN) para o `User` de email `contato@chatrespondo.com` se existir (script `prisma/seed` ou migration data-safe).
- **Sem mudança** em `Organization` (já tem `billingExempt`, `plan`, `planStatus`, `settings`, `billing*`). Overrides de limite continuam em `Organization.settings`.
- Reusar `StripeWebhookEvent` para "pagamentos falhos"; se precisar de granularidade, estender com `eventType` já existente (basta consultar). Tabela dedicada de invoices **não** no MVP (Stripe é fonte da verdade).

---

## 8. Fases de implementação (P0–P3)

> Cada fase é mergeável e deployável sem tocar o painel de tenant. Enquanto `AdminModule` não estiver liberado, `/admin/*` simplesmente responde 403/404.

### P0 — Fundação + console + CRUD de admins
**Meta:** `contato@` acessa um console que lista **Clientes** (todas as orgs), métricas básicas e gerencia Platform Admins; tenant comum nunca acessa.
- Data model: `PlatformAdmin`, `PlatformAdminRole`, `AdminAuditLog` (migration) + seed/migration idempotente do `contato@`.
- `PlatformAdminGuard` (+ cache Redis) + `AdminModule` + `GET /admin/me`.
- `GET /admin/orgs` (lista + filtros/paginação, incl. **inativo** conforme §10) e `GET /admin/orgs/:id` (detalhe read-only, reusa `getBillingStatus`).
- `GET /admin/metrics/overview` (signups, trials, distribuição por status; MRR simplificado §10).
- **CRUD Platform Admins (P0+):** `GET/POST/DELETE /admin/platform-admins` (list/grant-by-email/revoke), só `SUPER_ADMIN`, auditado.
- Frontend: route group `(admin)`, sidebar admin, gate por `/admin/me`, Dashboard + **Clientes** (lista + detalhe) + **Configurações** (CRUD admins).
- Infra de auditoria (`AdminAuditLog`) pronta; mutações de admin já auditam.
- **Critérios de aceite:**
  - Logado como `contato@`, vejo lista de **todos os Clientes** e um dashboard com contadores reais.
  - Em `/admin/settings`, `contato@` lista/concede/revoga outros Platform Admins.
  - Logado como OWNER/ADMIN de org comum, `GET /admin/*` retorna **403** e a rota `/admin` não renderiza.
  - Nenhuma regressão no painel de tenant (smoke test).

### P1 — Assinaturas, Planos & Financeiro
**Meta:** operar billing com segurança e auditoria.
- `GET /admin/subscriptions` + `GET /admin/finance/overview` + `GET /admin/finance/invoices` (proxy Stripe read-only) + `GET /admin/finance/failed-payments`.
- Operações auditadas: `POST /admin/orgs/:id/exempt` (grant/revoke), `POST /admin/orgs/:id/plan` (forçar plano + limites em `settings`).
- Frontend: telas Assinaturas & Planos, Financeiro; modais de operação com confirmação e diff.
- **Critérios de aceite:** conceder/revogar `billingExempt` e forçar plano refletem no `getBillingStatus` da org e geram `AdminAuditLog`; lista de `past_due`/falhas de pagamento bate com Stripe.

### P2 — Operações, Integrações & Auditoria
**Meta:** suporte no dia a dia + observabilidade das integrações.
- `GET /admin/integrations/status` (Stripe/Resend/Sentry/Slack/Evolution/GTM/PostHog).
- Notas de suporte por org (CRUD auditado); tela Auditoria com filtros.
- **"Ver como" read-only** (feature-flag `ADMIN_IMPERSONATION_ENABLED`), token escopado + banner + log.
- **Critérios de aceite:** painel de integrações reflete estados reais; toda ação de suporte aparece na Auditoria; impersonation é read-only, sinalizada e logada.

### P3 — Analytics avançado & automações de ops
**Meta:** inteligência de negócio e eficiência.
- Churn/cohort, funil trial→pago (integra PostHog/GA4), export CSV de orgs/auditoria.
- Dunning ops (reenviar cobrança/portal), reprocessar webhook, alertas (spike de signups, pico de falhas).
- Gestão de cupons in-app (opcional) e board de saúde (uptime, filas BullMQ).
- **Critérios de aceite:** métricas de churn/conversão disponíveis; exports funcionam; ações de dunning auditadas.

---

## 9. Breakdown para Jira (Epic + Stories)

**Epic:** `CHAT-HQ — Console de Operação SaaS (Admin cross-tenant)` · projeto `SCRUM` · label `chatrespondo`, `admin-console`.

| Story | Fase | Resumo | Critérios de aceite |
|-------|------|--------|---------------------|
| **HQ-1** — Data model + guard | P0 | `PlatformAdmin`/`PlatformAdminRole`/`AdminAuditLog` (migration) + seed `contato@`; `PlatformAdminGuard` + cache; `AdminModule` + `GET /admin/me` | Migration aplica; seed idempotente; guard nega tenant (403) e libera admin |
| **HQ-1b** — CRUD Platform Admins | P0 | List/grant/revoke em `/admin/platform-admins` + UI Settings; só SUPER_ADMIN; auditado | `contato@` concede/revoga; tenant 403 |
| **HQ-2** — Clientes cross-tenant (API) | P0 | `GET /admin/orgs` (filtros incl. inativo §10 + paginação) + `GET /admin/orgs/:id` (reusa `getBillingStatus`) | Lista todos os Clientes; detalhe traz plano/status/uso |
| **HQ-3** — Métricas overview (API) | P0 | `GET /admin/metrics/overview` (signups, trials, distribuição, MRR simplificado) | Números batem com o banco |
| **HQ-4** — Frontend console base | P0 | Route group `(admin)`, sidebar, gate `/admin/me`, Dashboard + Clientes/Orgs | `contato@` navega; tenant nunca vê `/admin` |
| **HQ-5** — Assinaturas & Planos | P1 | `GET /admin/subscriptions`; operações forçar plano + exempt (auditadas) + UI | Ações refletem no billing e geram auditoria |
| **HQ-6** — Financeiro | P1 | Overview + invoices (proxy Stripe) + failed-payments + UI | Bate com Stripe; `past_due` listado |
| **HQ-7** — Integrações (status) | P2 | `GET /admin/integrations/status` + cards UI (Stripe/Resend/Sentry/Slack/Evolution/GTM/PostHog) | Estados reais; sem secrets expostos |
| **HQ-8** — Notas de suporte + Auditoria | P2 | CRUD notas (auditado) + tela Auditoria com filtros | Ações aparecem na trilha |
| **HQ-9** — Impersonation read-only | P2 | Token escopado + banner + flag + log | Read-only, sinalizado, auditado |
| **HQ-10** — Analytics + dunning + export | P3 | Churn/cohort/funil, export CSV, dunning ops | Métricas e exports funcionam |
| **HQ-11** — (Opcional) Extrair `admin.chatrespondo.com` | P3 | Mover route group `(admin)` para app/host próprio na mesma API | Console fora do bundle do tenant |

> Subtasks técnicas (migration, testes de guard, repositórios cross-tenant, UI) criadas dentro de cada story na execução. Reforçar em toda story de escrita: teste que garante 403 para login de tenant.

---

## 10. Decisões travadas (2026-07-20)

| # | Tema | Decisão |
|---|------|---------|
| 1 | **Seed inicial** | Apenas `contato@chatrespondo.com` como `SUPER_ADMIN` inicialmente (migration/seed idempotente). |
| 2 | **CRUD de Platform Admins** | Incluído no P0 (mínimo): listar / conceder (por e-mail) / revogar sob `/admin/settings`, **somente `SUPER_ADMIN`**, com auditoria. Não fica só no seed. |
| 3 | **Terminologia UI** | Usar **Clientes** (não só “agências”) — qualquer `Organization` que contrata o ChatRespondo. |
| 4 | **Definição de "Inativo"** | (a) esteve em **trial** e **não converteu** para plano pago (trial expirado / expirado sem assinatura ativa); **OU** (b) teve plano pago e **não renovou** (`canceled` / `expired` após ter estado ativo). `past_due` e `trialing` **não** são inativos. `billingExempt` **não** é inativo. |
| 5 | **Sub-papéis** | Enum `SUPER_ADMIN` / `FINANCE` / `SUPPORT` no data model; MVP aplica só `SUPER_ADMIN` (gates prontos). |
| 6 | **Host** | Rotas `/admin/*` no painel atual (`panel.chatrespondo.com`) no P0; extração para `admin.chatrespondo.com` fica para P3. |
| 7 | **MRR (dashboard P0)** | **Simplificado:** `PLAN_CATALOG.priceMonthlyBrl` × orgs com status efetivo `active` (e plano pago com preço). Stripe detalhado fica em P1. |

### Perguntas ainda abertas (não bloqueiam P0)

1. **Impersonation:** "ver como" read-only é desejado? Restrição LGPD/contratual?
2. **Financeiro P1:** invoices via proxy Stripe atende, ou persistir faturas localmente?
3. **Cupons:** Stripe Dashboard (MVP) vs gestão in-app em P1?

---

## 11. Estimativa (rough, 1 dev)

| Fase | Escopo | Estimativa |
|------|--------|------------|
| P0 | Data model + guard + orgs/metrics + console base | 5–7 dias |
| P1 | Assinaturas/planos + financeiro (Stripe) | 5–7 dias |
| P2 | Integrações + notas/auditoria + impersonation read-only | 5–7 dias |
| P3 | Analytics + dunning + export (+ extração host) | 5–8 dias |
| — | **Total** | **~4–5,5 semanas** (20–29 dias úteis) |

> Reaproveitamento de billing/Stripe/auth/UI reduz esforço. Maior risco/atenção: disciplina de isolamento cross-tenant (guards e repositórios) e cobertura de testes de autorização (403 para tenants).

---

## 12. Referências no código

- Guards: `chatrespondo-api/src/common/guards/{jwt-auth,org,roles}.guard.ts`
- Auth/JWT: `chatrespondo-api/src/modules/auth/auth.service.ts` (payload `{sub,email}`, `getMe`)
- Billing: `chatrespondo-api/src/modules/billing/{plans.ts,plan-limits.service.ts,billing.controller.ts}`
- Modelo: `chatrespondo-api/prisma/schema.prisma` (`Organization.billingExempt/plan/planStatus/settings`, `OrgRole`, `StripeWebhookEvent`)
- App wiring: `chatrespondo-api/src/app.module.ts`
- Web layout/auth: `chatrespondo-web/src/app/(dashboard)/layout.tsx`, `src/stores/auth-store.ts`, `src/hooks/use-org-role.ts`, `src/components/layout/app-sidebar.tsx`
- Integrações: Evolution (`docs/EVOLUTION-API-PLAN.md`), Roadmap SaaS (`docs/SAAS-ROADMAP.md`), Jira (`docs/JIRA-BACKLOG.md`)
