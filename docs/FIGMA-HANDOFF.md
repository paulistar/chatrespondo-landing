# Figma Handoff — ChatRespondo Landing (LP-02)

## Arquivo Figma

Criar manualmente ou via Figma MCP: **ChatRespondo — Landing**

## Frames

| Frame | Tamanho | Conteúdo |
|-------|---------|----------|
| Desktop | 1440 × auto | Long-scroll completo |
| Mobile | 375 × auto | Hero + nav + pricing + FAQ |

## Tokens (Brand Override)

Ver [design-system/MASTER.md](../design-system/MASTER.md)

- Background: `#0d0d0d`
- Elevated: `#171717`
- Accent: `#3b82f6`
- Display: Instrument Serif
- Body: Plus Jakarta Sans

## Seções (ordem)

1. Header fixo + CTA
2. Hero (badge trial, headline, 2 CTAs, screenshot inbox)
3. Problema (4 cards)
4. Comparativo 2 colunas
5. Features zig-zag (6 blocos)
6. Prova social (4 métricas)
7. Como funciona (3 passos)
8. Segmentos ICP (5 cards)
9. Pricing (4 planos)
10. FAQ accordion
11. CTA final
12. Footer

## Implementação

O código em `index.html` + Tailwind é a fonte de verdade para v1. Após deploy, usar `generate_figma_design` para captura pixel-perfect de volta ao Figma.

## Assets para export

- Logo SVG (`public/favicon.svg`)
- OG image 1200×630
- 6 screenshots do painel (`public/images/screenshots/`)
