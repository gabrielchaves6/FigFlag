// Plugin genérico: insere um SVG como camadas editáveis no arquivo atual.
// Recebe o SVG via fetch (servidor local) ou colado na UI.
figma.showUI(__html__, { width: 320, height: 320 });

function insertSvg(svg) {
  const node = figma.createNodeFromSvg(svg);
  node.name = 'Página importada';
  node.x = Math.round(figma.viewport.center.x - node.width / 2);
  node.y = Math.round(figma.viewport.center.y - node.height / 2);
  figma.currentPage.selection = [node];
  figma.viewport.scrollAndZoomIntoView([node]);
  figma.closePlugin('Importado ✓');
}

figma.ui.onmessage = async (msg) => {
  try {
    if (msg.type === 'svg') {
      insertSvg(msg.svg);
    } else if (msg.type === 'fetch') {
      const res = await fetch(msg.url);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      insertSvg(await res.text());
    } else if (msg.type === 'export') {
      // VOLTA: exporta a seleção (ou a página) como SVG + PNG (print 2x) e manda pra UI postar
      const sel = figma.currentPage.selection;
      const node = sel.length ? sel[0] : figma.currentPage;
      if (!node.exportAsync) throw new Error('seleção não exportável');
      const svg = await node.exportAsync({ format: 'SVG' });
      const png = await node.exportAsync({ format: 'PNG', constraint: { type: 'SCALE', value: 2 } });
      figma.ui.postMessage({ type: 'exported', svg: Array.from(svg), png: Array.from(png) });
    }
  } catch (e) {
    figma.ui.postMessage({ error: (e && e.message) ? e.message : String(e) });
  }
};
