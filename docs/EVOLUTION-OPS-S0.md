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

- `hash` retornado no create = **apikey da instância** (guardar no EasyPanel/ops, não no git).
- Webhook PoC apontou para webhook.site (captura de payloads).

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

```bash
curl -sS -H "apikey: $EVO_GLOBAL_KEY" \
  "$EVO_URL/instance/connect/cr_poc_s0" | jq '{pairingCode, count, hasBase64: (.base64!=null)}'

# estado
curl -sS -H "apikey: $EVO_GLOBAL_KEY" \
  "$EVO_URL/instance/connectionState/cr_poc_s0" | jq .
```

### Escanear no celular (ação humana)

1. No celular: WhatsApp → **Aparelhos conectados** → **Conectar um aparelho**.
2. Escaneie o QR (`qrcode.base64` ou Manager).
3. Confirme `connectionState` → `open`.
4. Envie 1 DM e 1 mensagem de grupo para o número → salve fixtures em `evolution-payloads/` (ver README da pasta).

QR expira rápido (~30s–1min). Se falhar: chame `/instance/connect/{name}` de novo.

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

Infra + URL + QR API + fixtures parciais: **sim, com ressalva**.  
Falta scan humano + fixtures `messages.upsert` (DM + grupo) antes de fechar o aceite formal da S0 — mas S1 (enum + HttpClient) já pode começar em paralelo.
