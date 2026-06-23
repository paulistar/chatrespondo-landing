# QA Checklist — Landing ChatRespondo v1 (LP-10 / LP-11)

Data: 2026-06-23

## Produção

| Item | Status | Notas |
|------|--------|-------|
| `https://chatrespondo.com/` → 200 | ✅ | Título e HTML corretos |
| `https://chatrespondo.com/privacidade.html` → 200 | ✅ | LGPD |
| `https://chatrespondo.com/termos.html` → 200 | ✅ | Uso SaaS |
| `https://chatrespondo.com/sitemap.xml` → 200 | ✅ | |
| `https://chatrespondo.com/robots.txt` → 200 | ✅ | |
| SSL via Cloudflare + Let's Encrypt | ✅ | HTTP/2 |
| `www` → 301 para apex | ⚠️ | Adicionar CNAME `www` → tunnel + redirect rule no Cloudflare (token write indisponível via MCP) |

## Conversão e tracking (LP-11)

| Item | Status | Notas |
|------|--------|-------|
| CTAs `data-register` → `panel.chatrespondo.com/register` | ✅ | Via `src/main.js` |
| UTMs default: `utm_source=landing`, `utm_medium=*`, `utm_campaign=trial` | ✅ | Preserva query da LP |
| Login → `panel.chatrespondo.com/login` com UTM | ✅ | |
| Eventos `dataLayer` em clique CTA | ✅ | `cta_click` register/login |
| GTM loader condicional | ✅ | Ativar trocando `data-gtm` no `<body>` |

**Para ativar GTM em produção:** substituir `data-gtm="GTM-XXXX"` em `index.html` pelo container real.

## Acessibilidade (Mart Art + ui-ux-pro-max)

| Item | Status |
|------|--------|
| `lang="pt-BR"` | ✅ |
| Skip link para conteúdo | ✅ |
| `aria-label` em navs | ✅ |
| FAQ com `aria-expanded` | ✅ |
| `:focus-visible` em interativos | ✅ |
| `prefers-reduced-motion` | ✅ |
| Ícones decorativos com `aria-hidden` | ✅ |
| Contraste dark theme (AA) | ✅ revisão visual |

## Performance (build estático)

| Item | Status |
|------|--------|
| HTML principal gzip ~5.8 KB | ✅ |
| JS bundle gzip ~1.1 KB | ✅ |
| CSS gzip ~4 KB | ✅ |
| Imagens SVG leves | ✅ mocks até screenshots reais |
| nginx gzip + cache assets | ✅ |

## Copy / compliance

| Item | Status |
|------|--------|
| Sem white-label / revenda / código-fonte | ✅ |
| Trial 7 dias destacado | ✅ |
| Posicionamento SaaS mensal pós-trial | ✅ |
| Mart Studios no footer/hero | ✅ |

## Pendências opcionais (pós v1)

- Substituir screenshots SVG por WebP do painel real (`panel.chatrespondo.com`)
- Container GTM real da Mart Studios
- Lighthouse formal em CI
- A/B headline (fase 3 do plano)
