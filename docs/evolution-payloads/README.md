# Evolution API — fixtures de webhook (Fase 0 / S0)

Payloads reais capturados da Evolution API **v2.3.7** no EasyPanel (`evolution.chatrespondo.com`).

## Status da captura

| Evento | Arquivo | Status |
|--------|---------|--------|
| `qrcode.updated` | `qrcode_updated.json` | ✅ capturado (PoC) |
| `connection.update` | `connection_update.json` | ✅ capturado (`state=connecting`) |
| `connection.update` (`open`) | — | ⏳ precisa escanear QR no celular |
| `messages.upsert` (DM) | — | ⏳ após conectar + enviar DM |
| `messages.upsert` (grupo `@g.us`) | — | ⏳ após conectar + mensagem em grupo |
| `messages.update` / `send.message` | — | ⏳ após mensagens reais |

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

1. Abrir o catcher atual (ou criar novo em https://webhook.site).
2. Garantir que a instância PoC aponta o webhook para essa URL (já configurado em `cr_poc_s0` no PoC).
3. Escaneie o QR (ver `../EVOLUTION-OPS-S0.md`).
4. Envie 1 DM e 1 mensagem em grupo para o número conectado.
5. Baixe os JSON do catcher e salve aqui como:
   - `messages_upsert_dm.json`
   - `messages_upsert_group.json`
   - `connection_update_open.json`
6. **Scrub** antes de commit: apagar `apikey` real, `base64` de mídia/QR, telefones reais se necessário.

## Convenção

- Nomes: `evento_com_underscore.json`
- Sempre incluir `meta.source`, `meta.capturedAt`, `headers` (mesmo que vazios de auth) e `payload`.
