# Evolution API — fixtures de webhook (Fase 0 / S0)

Payloads reais capturados da Evolution API **v2.3.7** no EasyPanel (`evolution.chatrespondo.com`).

## Status da captura

| Evento | Arquivo | Status |
|--------|---------|--------|
| `qrcode.updated` | `qrcode_updated.json` | ✅ capturado (PoC) |
| `connection.update` | `connection_update.json` | ✅ capturado (`state=connecting`) |
| `connection.update` (`open`) | `connection_update_open.json` | ✅ capturado (QR escaneado; S0 connection SUCCESS) |
| `messages.upsert` (DM) | — | ⏳ enviar 1 DM ao número conectado (outro celular) |
| `messages.upsert` (grupo `@g.us`) | — | ⏳ 1 mensagem em grupo onde o número é membro |
| `messages.update` / `send.message` | — | ⏳ após mensagens reais |

Catcher PoC: https://webhook.site/63f839ce-ad71-4c33-9a59-092dfdfbc0ab

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

Conexão já está **`open`**. Falta só mensagens:

1. Abrir o catcher: https://webhook.site/63f839ce-ad71-4c33-9a59-092dfdfbc0ab
2. De **outro celular**, enviar **1 DM** ao número conectado na PoC.
3. Em um **grupo** onde esse número é membro, enviar **1 mensagem** de texto.
4. Baixar do catcher os `messages.upsert` e salvar aqui como:
   - `messages_upsert_dm.json`
   - `messages_upsert_group.json`
5. **Scrub** antes de commit: apagar `apikey` real, `base64` de mídia, telefones reais se necessário.

## Convenção

- Nomes: `evento_com_underscore.json`
- Sempre incluir `meta.source`, `meta.capturedAt`, `headers` (mesmo que vazios de auth) e `payload`.
