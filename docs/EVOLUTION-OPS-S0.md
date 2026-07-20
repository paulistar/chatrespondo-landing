# Evolution API — Ops Fase 0 (S0)

Guia operacional do spike Evolution no EasyPanel (projeto `chatrespondo`). **Sem integração de código no ChatRespondo ainda.**

## Serviços EasyPanel

| Serviço | Tipo | Imagem / notas |
|---------|------|----------------|
| `evolution-postgres` | Postgres 16 | DB `evolution`, user `evolution` (dedicado) |
| `evolution-redis` | Redis 7 | Senha no env EasyPanel (dedicado) |
| `evolution-api` | App (image) | `evoapicloud/evolution-api:v2.3.7` |
| Manager v2 | — | **Adiado** (API primeiro) |

Serviços existentes (`api`, `web`, `landing`, `postgres`, `redis`) **não foram alterados**.

## URLs

| Recurso | URL |
|---------|-----|
| Evolution API (público HTTPS) | https://evolution.chatrespondo.com |
| Health / welcome | `GET /` → `{"status":200,"version":"2.3.7",...}` |
| Manager embutido | https://evolution.chatrespondo.com/manager (opcional) |

DNS: CNAME `evolution` → Cloudflare Tunnel (mesmo dos outros hosts ChatRespondo).  
Traefik: `Host(evolution.chatrespondo.com)` → `chatrespondo_evolution-api:8080`.

## Segredos (NÃO commitar)

No EasyPanel → `evolution-api` → Environment:

- `AUTHENTICATION_API_KEY` — chave global (header `apikey` nas chamadas REST admin)
- `DATABASE_CONNECTION_URI` — Postgres dedicado
- `CACHE_REDIS_URI` — Redis dedicado (`redis://:SENHA@evolution-redis:6379/1`)
- `SERVER_URL=https://evolution.chatrespondo.com`

Ao atualizar env: **sempre merge** (nunca wipe). Copiar o bloco atual do painel, editar, colar de volta.

## Instância PoC

Já criada: **`cr_poc_s0`** (Baileys, `groupsIgnore=false`).

- **Estado atual (2026-07-20 ~11:35 BRT):** `connectionState` = **`connecting`** (não `open`). Owner JID residual aponta para `5515997554870@s.whatsapp.net` / perfil **Mart Studios**, mas **sessão não está aberta**.
- **Rate limit WhatsApp (confirmado por sintomas):** QR → “tente novamente mais tarde”; pairing code → “errado” / inválido após muitas regenerações. **NÃO gerar mais QR nem pairing agora.**
- Histórico: chegou a `open` no mesmo dia; logout indevido derrubou; várias tentativas de QR + pairing (incl. restart/logout/connect) agravaram o throttle.
- `hash` retornado no create = **apikey da instância** (guardar no EasyPanel/ops, não no git).
- Webhook PoC: https://webhook.site/63f839ce-ad71-4c33-9a59-092dfdfbc0ab (captura de payloads).
- Apikey global EasyPanel (`AUTHENTICATION_API_KEY`): mascarada `2860…23da` (não commitar valor completo).

> **⚠️ NUNCA faça logout de uma PoC live só para regenerar QR.**  
> Se `connectionState` = `open`, **não** chame `DELETE /instance/logout/{name}`. Logout derruba a sessão WhatsApp já pareada.  
> Para renovar QR só quando o estado for `close` / `connecting` (sem sessão útil): use `GET /instance/connect/{name}`. Se já estiver `open`, reporte sucesso e não faça nada destrutivo.

### Cooldown / rate limit WhatsApp (obrigatório)

Sintomas típicos após muitas tentativas de QR/pairing no **mesmo número**:

| Sintoma no celular | Causa provável |
|--------------------|----------------|
| QR: “não é possível ler / tente novamente mais tarde” | Throttle do WhatsApp |
| Código de pareamento: “errado” / inválido logo ao digitar | Código expirado **ou** throttle (não necessariamente formato do número) |

**Ação:**

1. **Parar** — zero `GET /instance/connect`, zero QR novo, zero pairing novo.
2. **Esperar 30–60 minutos** (se ainda falhar após 1 tentativa pós-cooldown → **pausar até o dia seguinte** ou usar **outro número** só para PoC).
3. Só então seguir o [plano de recuperação](#plano-de-recuperação-após-cooldown) abaixo.
4. No máximo **1** tentativa de pairing (ou 1 QR) por janela de cooldown.

### Pairing code — fluxo Evolution v2.3.7 (documentado)

Endpoint oficial:

```http
GET /instance/connect/{instanceName}?number={E164_DIGITS}
Header: apikey: <AUTHENTICATION_API_KEY>
```

Exemplo:

```bash
curl -sS -H "apikey: $EVO_GLOBAL_KEY" \
  "$EVO_URL/instance/connect/cr_poc_s0?number=5515997554870"
```

Resposta esperada (quando WhatsApp aceita):

```json
{
  "pairingCode": "ABCD1234",
  "code": "2@...",
  "base64": "data:image/png;base64,...",
  "count": 1
}
```

- Query param: **`number`** (só dígitos, com DDI `55`, **sem** `+`, espaços ou hífens).
- Formato BR celular moderno: **`55` + DDD + `9` + 8 dígitos** → ex. `5515997554870`.
- Alternativa sem o 9 (`551597554870`): só se a primeira falhar por formato — **no máximo 1 tentativa** do formato alternativo, depois **STOP**.
- Exibir o código como **XXXX-XXXX** (8 chars; hífen só visual). Digitar **exatamente** o que a API devolveu.
- Código expira rápido (~1 min). Não reutilizar código antigo (`MXVK-PN8A` etc. já inválidos).
- Melhor prática (issues Evolution/Baileys): pedir pairing **logo após** create (ou logout limpo de sessão não-`open`), com `number` na query — não spammar connect.

**No celular:**

1. WhatsApp → **Aparelhos conectados** → **Conectar um aparelho**
2. **Conectar com número de telefone** (não escanear QR se estiver em throttle)
3. Digitar o código **exatamente** (maiúsculas, com hífen se a tela mostrar)

### Plano de recuperação (após cooldown)

1. Esperar **30–60 min** sem nenhum connect/QR/pairing.
2. Conferir estado (só leitura):

   ```bash
   curl -sS -H "apikey: $EVO_GLOBAL_KEY" \
     "$EVO_URL/instance/connectionState/cr_poc_s0"
   ```

   Se já for `open` → **parar** (sucesso).
3. Se ainda `connecting`/`close`: **uma vez** — deletar instância e recriar limpa (`WHATSAPP-BAILEYS`, `qrcode: true`, `groupsIgnore: false`). Ideal: passar `number` no create **ou** chamar connect com `?number=` imediatamente após create.
4. **Uma única** tentativa de pairing code com `5515997554870`.
5. Se falhar de novo com “tente mais tarde” / código errado: **não insistir** — pausar S0 até amanhã **ou** usar outro chip/número só para PoC.
6. S1 (código ChatRespondo) pode avançar em paralelo **sem** WhatsApp live; PoC de conexão fica bloqueada pelo throttle.

### Criar outra instância

```bash
export EVO_URL=https://evolution.chatrespondo.com
export EVO_GLOBAL_KEY='<AUTHENTICATION_API_KEY do EasyPanel>'

curl -sS -X POST "$EVO_URL/instance/create" \
  -H "apikey: $EVO_GLOBAL_KEY" \
  -H 'Content-Type: application/json' \
  -d '{
    "instanceName": "cr_poc_s0b",
    "integration": "WHATSAPP-BAILEYS",
    "qrcode": true,
    "groupsIgnore": false,
    "webhook": {
      "url": "https://webhook.site/<seu-token>",
      "byEvents": false,
      "base64": true,
      "events": [
        "QRCODE_UPDATED",
        "CONNECTION_UPDATE",
        "MESSAGES_UPSERT",
        "MESSAGES_UPDATE",
        "SEND_MESSAGE"
      ]
    }
  }' | jq .
```

Resposta: `instance.status=connecting`, `hash` (apikey da instância), `qrcode.base64` (PNG).

### Obter / renovar QR

**Antes de qualquer connect/logout:** confira o estado. Se `open` → pare. Não regenerar QR nem logout.

```bash
# 1) estado primeiro
curl -sS -H "apikey: $EVO_GLOBAL_KEY" \
  "$EVO_URL/instance/connectionState/cr_poc_s0" | jq .

# 2) só se NÃO for open — renovar QR
curl -sS -H "apikey: $EVO_GLOBAL_KEY" \
  "$EVO_URL/instance/connect/cr_poc_s0" | jq '{pairingCode, count, hasBase64: (.base64!=null), codePrefix: (.code|tostring[0:2])}'
```

QR de pareamento WhatsApp válido começa com `2@`. **Não** use `DELETE /instance/logout/...` como atalho para “forçar” QR novo numa sessão `open`.

### Escanear no celular (ação humana)

1. No celular: WhatsApp → **Aparelhos conectados** → **Conectar um aparelho**.
2. Escaneie o QR (`docs/evolution-payloads/cr_poc_s0-qr.png` ou `qrcode.base64` / Manager).
3. Confirme `connectionState` → `open`.
4. **Próximo (fixtures de mensagem):** ver seção abaixo.

QR expira rápido (~30s–1min). Se a sessão cair (`close`): chame `/instance/connect/{name}` de novo e reescaneie.

### Endpoints REST v2.3.7 (mensagens / chats) — confirmados

Base: `https://evolution.chatrespondo.com` · header `apikey: $EVO_GLOBAL_KEY`

| Método | Path | HTTP | Notas |
|--------|------|------|-------|
| `POST` | `/chat/findChats/{instance}` | **200** | body `{}` ok; lista chats (`@s.whatsapp.net`, `@g.us`, `@lid`) |
| `POST` | `/chat/findMessages/{instance}` | **200** | body `{"where":{"key":{...}},"limit":N}`; paginação em `messages.{total,pages,currentPage,records}` |
| `POST` | `/chat/findStatusMessage/{instance}` | **200** | status broadcasts |
| `GET` | `/chat/findMessages/{instance}` | **404** | GET não existe |
| `GET` | `/chat/findChats/{instance}` | **404** | GET não existe |
| `POST`/`GET` | `/message/findMessages/{instance}` | **404** | path errado |

Exemplo (DM inbound):

```bash
curl -sS -X POST "$EVO_URL/chat/findMessages/cr_poc_s0" \
  -H "apikey: $EVO_GLOBAL_KEY" \
  -H 'Content-Type: application/json' \
  -d '{"where":{"key":{"remoteJid":"5511XXXXXXXXX@s.whatsapp.net","fromMe":false}},"limit":5}' \
  | jq '{total: .messages.total, n: (.messages.records|length), sample: .messages.records[0].key}'
```

PoC: `findMessages` com `fromMe:false` → `messages.total≈2031` após sync.

### Fixtures de mensagem (REST vs webhook)

Já salvos (scrubbed) a partir do histórico:

- `docs/evolution-payloads/messages_find_dm.json`
- `docs/evolution-payloads/messages_find_group.json` (`@g.us`)

**Não** são shape de webhook (`event`/`apikey`/`data`). O catcher webhook.site ainda **não** recebeu `messages.upsert`.

### Capturar fixtures webhook DM + grupo (passo humano restante)

Com a sessão **open**, de **outro celular**:

1. Envie **1 DM** para o número conectado na PoC.
2. Em um **grupo** onde esse número é membro, envie **1 mensagem** (texto simples).
3. Catcher: https://webhook.site/63f839ce-ad71-4c33-9a59-092dfdfbc0ab — eventos `messages.upsert`.
4. Salve scrubbed:
   - `messages_upsert_dm.json`
   - `messages_upsert_group.json`

### Enviar texto de teste (após `open`)

```bash
export EVO_INSTANCE_KEY='<hash da instância>'
curl -sS -X POST "$EVO_URL/message/sendText/cr_poc_s0" \
  -H "apikey: $EVO_INSTANCE_KEY" \
  -H 'Content-Type: application/json' \
  -d '{"number":"5511999999999","text":"PoC ChatRespondo Evolution"}' | jq .
```

## Auth webhook (confirmado no PoC)

- Header HTTP: **sem** `apikey`.
- Body: campo `apikey` + `instance` + `event` + `data`.
- Ver fixtures em `evolution-payloads/`.

## Pin de versão

Imagem pinada em **`evoapicloud/evolution-api:v2.3.7`**.  
A partir de v2.4.0 a Foundation exige ativação/licença — evitar `latest` até decidir modelo de license.

## Pronto para S1?

Infra + URL + fixtures `qrcode`/`connection.update` + samples REST `findMessages` (DM+grupo): ✅  

**Bloqueio PoC live (2026-07-20):** sessão **não** `open`; WhatsApp em **rate limit** no número `5515997554870`. Não gera QR/pairing até cooldown (30–60 min) ou outro número / amanhã.

Pendência formal S0 (webhook): `messages.upsert` DM + grupo no catcher (1 envio cada).  

S1 (enum `WHATSAPP_EVOLUTION` + `EvolutionHttpClient` + QR endpoints) **pode avançar sem WhatsApp live** (código + mocks/fixtures). Reconexão humana do `cr_poc_s0` fica para depois do cooldown.

## S2 — status (2026-07-20)

Código S2 entregue (API + painel):
- `GET /channels/:id/qrcode`, `GET /channels/:id/connection-state`, `POST /channels/:id/logout`
- Inbound parcial: `connection.update` / `qrcode.updated` → `config` + realtime
- UI: wizard Evolution + diálogo QR + badge de estado

**Não** chamar connect no `cr_poc_s0` enquanto rate-limited. Para testar ao voltar:
1. Painel → Novo canal → WhatsApp (Evolution) → nome → Criar e conectar
2. Escanear QR no celular (Aparelhos conectados)
3. Badge deve ir para **Conectado** (polling 3s + webhook)

## S6 — Hardening (2026-07-20)

Código de produção (API):

| Item | Comportamento |
|------|----------------|
| Retry REST | 3 tentativas, backoff exponencial + jitter em 408/429/5xx/rede |
| Idempotência webhook | `jobId` estável `inbound:{channelId}:{externalId}` + `claimProcessing` + unique DB |
| Orphan cleanup | Cron diário 04:30 UTC — deleta `cr_*` sem Channel ativo; **nunca** `cr_poc_s0` |
| Monitor | Cron 15min — canais `open` no DB vs remoto; drift → close + alerta |
| Alertas | Slack + Sentry + Notification SYSTEM em disconnect / UNROUTED (debounce) |
| Health | `GET /ready` → `optional.evolution` soft (não derruba readiness) |
| QR cooldown | 60s entre pedidos de QR no mesmo canal (HTTP 429) |

Env relevantes (já existentes / opcionais): `EVOLUTION_API_URL`, `EVOLUTION_API_KEY`, `SLACK_WEBHOOK_URL`, `SENTRY_DSN`.
