// Converte QUALQUER página renderizada num SVG estático e editável.
// Genérico: serve pra qualquer projeto/site/localhost.
// Uso: node convert.js <url> [saida.svg] [seletorCSS]
//   url        : http://localhost:3000 , file:///..., https://site
//   saida.svg  : default ./out/latest.svg
//   seletorCSS : raiz a capturar (default "body")
const path = require('path');

function loadPlaywright() {
  try { return require('playwright'); } catch (e) {}
  const fs = require('fs');
  const cands = [];
  // npx cache (Windows/macOS/Linux)
  const local = process.env.LOCALAPPDATA || path.join(process.env.HOME || '', 'AppData/Local');
  cands.push(path.join(local, 'npm-cache', '_npx'));
  cands.push(path.join(process.env.HOME || '', '.npm', '_npx'));
  for (const cache of cands) {
    if (!fs.existsSync(cache)) continue;
    for (const d of fs.readdirSync(cache)) {
      const nm = path.join(cache, d, 'node_modules');
      if (fs.existsSync(path.join(nm, 'playwright'))) { module.paths.unshift(nm); try { return require('playwright'); } catch (e) {} }
    }
  }
  throw new Error('playwright não encontrado — rode: npx playwright install chromium');
}
const { chromium } = loadPlaywright();

const URL = process.argv[2];
const OUT = process.argv[3] || path.join(__dirname, 'out', 'latest.svg');
const SEL = process.argv[4] || 'body';
if (!URL) { console.error('uso: node convert.js <url> [saida.svg] [seletorCSS]'); process.exit(1); }

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 1400 } });
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);

  const svg = await page.evaluate((sel) => {
    const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const root = document.querySelector(sel) || document.body;
    const o = root.getBoundingClientRect();
    const W = Math.ceil(o.width), H = Math.ceil(Math.max(root.scrollHeight, o.height));
    const parts = [];
    const opaque = (c) => {
      if (!c || c === 'transparent') return false;
      const m = c.match(/rgba?\(([^)]+)\)/);
      if (!m) return true; // hex / nome de cor → opaco
      const v = m[1].split(',').map((s) => parseFloat(s));
      return v.length < 4 || v[3] !== 0; // só rgba(...,0) é transparente
    };

    const side = (r, cs, which) => {
      const w = parseFloat(cs['border' + which + 'Width']) || 0;
      const st = cs['border' + which + 'Style'];
      if (w <= 0 || st === 'none') return;
      const col = cs['border' + which + 'Color'];
      let x1, y1, x2, y2;
      if (which === 'Top') { x1 = r.left; y1 = r.top; x2 = r.right; y2 = r.top; }
      else if (which === 'Bottom') { x1 = r.left; y1 = r.bottom; x2 = r.right; y2 = r.bottom; }
      else if (which === 'Left') { x1 = r.left; y1 = r.top; x2 = r.left; y2 = r.bottom; }
      else { x1 = r.right; y1 = r.top; x2 = r.right; y2 = r.bottom; }
      const dash = st === 'dashed' ? ' stroke-dasharray="4 3"' : st === 'dotted' ? ' stroke-dasharray="1 2"' : '';
      parts.push(`<line x1="${(x1 - o.left).toFixed(1)}" y1="${(y1 - o.top).toFixed(1)}" x2="${(x2 - o.left).toFixed(1)}" y2="${(y2 - o.top).toFixed(1)}" stroke="${col}" stroke-width="${w}"${dash}/>`);
    };

    // fundos + bordas
    root.querySelectorAll('*').forEach((el) => {
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) return;
      const x = r.left - o.left, y = r.top - o.top;
      if (opaque(cs.backgroundColor) && r.width > 0 && r.height > 0) {
        const rx = parseFloat(cs.borderTopLeftRadius) || 0;
        parts.push(`<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${r.width.toFixed(1)}" height="${r.height.toFixed(1)}" fill="${cs.backgroundColor}"${rx ? ` rx="${rx}"` : ''}/>`);
      }
      ['Top', 'Bottom', 'Left', 'Right'].forEach((s) => side(r, cs, s));
    });

    // texto: percorre todos os nós de texto (pega conteúdo misto também)
    const angleOf = (el) => {
      if (!el) return 0;
      const m = getComputedStyle(el).transform;
      if (!m || m === 'none' || !m.startsWith('matrix')) return 0;
      const v = m.slice(7, -1).split(',').map(parseFloat);
      return Math.round(Math.atan2(v[1], v[0]) * 180 / Math.PI);
    };
    const tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = tw.nextNode())) {
      const txt = node.textContent.replace(/\s+/g, ' ').trim();
      if (!txt) continue;
      const range = document.createRange();
      range.selectNodeContents(node);
      const r = range.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) continue;
      const el = node.parentElement;
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) continue;
      const fs = parseFloat(cs.fontSize) || 12;
      const ff = cs.fontFamily.replace(/"/g, "'");
      const x = r.left - o.left, y = r.top - o.top;
      const ang = angleOf(el) || angleOf(el.parentElement);
      if (ang) {
        const cx = (x + r.width / 2).toFixed(1), cy = (y + r.height / 2).toFixed(1);
        parts.push(`<text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="middle" font-family="${ff}" font-size="${fs}" font-weight="${cs.fontWeight}" fill="${cs.color}" transform="rotate(${ang} ${cx} ${cy})">${esc(txt)}</text>`);
      } else {
        parts.push(`<text x="${x.toFixed(1)}" y="${(y + fs * 0.82).toFixed(1)}" font-family="${ff}" font-size="${fs}" font-weight="${cs.fontWeight}" fill="${cs.color}">${esc(txt)}</text>`);
      }
    }

    // fundo efetivo da página: 1º opaco subindo body -> html; senão branco (padrão do navegador)
    let bg = '#ffffff';
    for (const el of [document.body, document.documentElement]) {
      const c = getComputedStyle(el).backgroundColor;
      if (opaque(c)) { bg = c; break; }
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">\n<rect width="${W}" height="${H}" fill="${bg}"/>\n${parts.join('\n')}\n</svg>`;
  }, SEL);

  const fs = require('fs');
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, svg);
  console.log('SVG salvo: ' + OUT + ' (' + svg.length + ' bytes)');
  await browser.close();
})();
