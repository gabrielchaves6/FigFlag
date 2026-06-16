// Servidor estático mínimo (sem dependências) pra o plugin do Figma buscar o SVG.
// Serve a pasta ./out em http://127.0.0.1:8787  (deixe rodando em 2º plano).
const http = require('http');
const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, 'out');
const PORT = process.env.PORT || 8787;

const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' };

http.createServer((req, res) => {
  if (req.method === 'OPTIONS') { res.writeHead(204, CORS); return res.end(); }

  // VOLTA do Figma: POST /upload[?name=arquivo.svg] grava em ./out
  if (req.method === 'POST' && (req.url || '').split('?')[0] === '/upload') {
    const q = (req.url.split('?')[1] || '');
    const m = q.match(/name=([^&]+)/);
    const name = (m ? decodeURIComponent(m[1]) : 'from-figma.svg').replace(/[^\w.\-]/g, '_');
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      fs.writeFileSync(path.join(DIR, name), Buffer.concat(chunks));
      res.writeHead(200, { ...CORS, 'Content-Type': 'text/plain' });
      res.end('ok: ' + name);
      console.log('recebido do Figma -> out/' + name);
    });
    return;
  }

  // IDA: GET serve a pasta ./out
  const name = decodeURIComponent((req.url || '/').split('?')[0]).replace(/^\/+/, '') || 'latest.svg';
  const file = path.join(DIR, name);
  if (!file.startsWith(DIR) || !fs.existsSync(file)) { res.writeHead(404, CORS); return res.end('not found'); }
  res.writeHead(200, { ...CORS, 'Content-Type': name.endsWith('.svg') ? 'image/svg+xml' : 'application/octet-stream', 'Cache-Control': 'no-store' });
  fs.createReadStream(file).pipe(res);
}).listen(PORT, () => console.log('page-to-figma servindo ./out em http://localhost:' + PORT));
// bind sem host => atende localhost (IPv6 ::1) e 127.0.0.1, evitando o "connection refused" do Windows
