# page-to-figma

Converte **qualquer página web renderizada** num **SVG estático e editável** e
insere no Figma como camadas (retângulos + textos + linhas). Genérico — serve
pra qualquer projeto, localhost ou site.

## Requisitos
- Node.js
- Chromium do Playwright: `npx playwright install chromium` (uma vez por máquina)

## Setup do plugin no Figma (uma vez)
Precisa do **Figma Desktop**. Menu **Plugins → Development → Import plugin from
manifest…** e escolha `figma-plugin/manifest.json` desta pasta.

## Uso
```bash
# 1) gera o SVG da página (qualquer URL) e sobe o servidor local p/ o plugin
bash page2figma.sh http://localhost:3000
#    opcional: capturar só um trecho via seletor CSS
bash page2figma.sh http://localhost:3000 "#app"

# 2) no Figma (arquivo aberto): Plugins → Development → "FigFlag"
#    → "Buscar e inserir"  (busca http://127.0.0.1:8787/latest.svg)
```

Sem servidor / outra máquina: abra `out/latest.svg`, copie o conteúdo e use o
campo **"…ou cole o SVG"** do plugin.

### Volta (Figma → código)
Depois de editar no Figma, selecione o que quiser e no plugin **FigFlag** clique
**"Exportar pro Claude (SVG + PNG)"**: ele exporta a seleção como **SVG** (valores
exatos) e **PNG 2x** (print) e faz `POST` pro servidor local, gravando em
`out/from-figma.svg` e `out/from-figma.png`. Quem for implementar lê esses
arquivos. Sem seleção, exporta a página inteira.

## Peças
- `convert.js` — DOM → SVG (Playwright headless). `node convert.js <url> [out.svg] [seletor]`
- `serve.js` — servidor estático mínimo da pasta `out/` na porta 8787
- `page2figma.sh` — junta os dois num comando
- `figma-plugin/` — plugin local (`createNodeFromSvg`)

## Fundo (claro × escuro)
O fundo do SVG é o **primeiro fundo opaco** subindo `body → html`. Se a página
não define fundo, usa **branco** (padrão do navegador). Cor é considerada
transparente só quando é `rgba(...,0)` de verdade (alpha 0) — preto `rgb(0,0,0)`
e qualquer cor terminando em `0` continuam opacos.

## Limitações
Import **estático**: cores sólidas, textos e linhas (incl. tracejados). Não traz
hover, sombras nem gradientes (viram fill sólido). Cada forma é uma camada —
selecione tudo e agrupe (`Ctrl+G`) no Figma.
