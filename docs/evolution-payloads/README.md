# Evolution API — fixtures de webhook (Fase 0 / S0)

Payloads reais capturados da Evolution API **v2.3.7** no EasyPanel (`evolution.chatrespondo.com`).

## Status da captura

| Evento | Arquivo | Status |
|--------|---------|--------|
| `qrcode.updated` | `qrcode_updated.json` | ✅ capturado (PoC) |
| `connection.update` | `connection_update.json` | ✅ capturado (`state=connecting`) |
| `connection.update` (`open`) | `connection_update_open.json` | ✅ capturado (QR escaneado; S0 connection SUCCESS) |
| `messages.upsert` (DM) | `messages_upsert_dm.synthetic.json` | ✅ **sintético** (shape doc oficial + fields findMessages) — live webhook.site ainda ⏳ |
| `messages.upsert` (grupo `@g.us`) | `messages_upsert_group.synthetic.json` | ✅ **sintético** (S4) — live webhook.site ainda ⏳ |
| `messages.upsert` (imagem) | `messages_upsert_image.synthetic.json` | ✅ **sintético** (S4; URL `.enc` omitida no mapper) |
| REST `findMessages` (DM) | `messages_find_dm.json` | ✅ scrubbed (histórico sync; **não** é shape de webhook) |
| REST `findMessages` (grupo `@g.us`) | `messages_find_group.json` | ✅ scrubbed (histórico sync; **não** é shape de webhook) |
| `messages.update` / `send.message` | — | ⏳ após mensagens reais via webhook |

Catcher PoC: https://webhook.site/63f839ce-ad71-4c33-9a59-092dfdfbc0ab

### Diferença de shape: webhook vs `findMessages`

| | Webhook `messages.upsert` | REST `POST /chat/findMessages/{instance}` |
|--|---------------------------|-------------------------------------------|
| Envelope | `event` + `instance` + `apikey` + `data` | `{ messages: { total, pages, currentPage, records[] } }` |
| Auth no body | `apikey` da instância | — (auth só no header `apikey`) |
| Uso no adapter | **canônico** para inbound | útil para smoke/mapper de campos `key`/`message`/`messageType` |

Fixtures `messages_find_*.json` **não substituem** `messages_upsert_*.json`.

## Achado crítico: autenticação do webhook

A Evolution **não** envia `apikey` no header HTTP do webhook.

A `apikey` da instância vem no **body JSON**:

```json
{
  "event": "connection.update",
  "instance": "cr_poc_s0",
  "apikey": "<instance-apikey>",
  "data": { "...": "..." }
}
```

No adapter (S1+): validar `payload.apikey` com `crypto.timingSafeEqual` (além de casar `payload.instance` com `config.instanceName`). Não assumir header `apikey` como no Zappfy sem confirmar.

## Como capturar o restante (ops)

Fixtures REST de mensagem já existem (`messages_find_*`). Falta o envelope **webhook** `messages.upsert`:

1. Confirmar `GET /instance/connectionState/cr_poc_s0` → `state=open` (se `connecting`/`close`, reescanear QR).
2. Abrir o catcher: https://webhook.site/63f839ce-ad71-4c33-9a59-092dfdfbc0ab
3. De **outro celular**, enviar **1 DM** ao número conectado na PoC.
4. Em um **grupo** onde esse número é membro, enviar **1 mensagem** de texto.
5. Baixar do catcher os `messages.upsert` e salvar aqui como:
   - `messages_upsert_dm.json`
   - `messages_upsert_group.json`
6. **Scrub** antes de commit: apagar `apikey` real, `base64` de mídia, telefones reais se necessário.

## Convenção

- Nomes: `evento_com_underscore.json`
- Sempre incluir `meta.source`, `meta.capturedAt`, `headers` (mesmo que vazios de auth) e `payload`.
