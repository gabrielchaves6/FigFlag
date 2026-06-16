// Servidor estático mínimo (sem dependências) pra o plugin do Figma buscar o SVG.
// Serve a pasta ./out em http://127.0.0.1:8787  (deixe rodando em 2º plano).
const http = require('http');
const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, 'out');
const PORT = process.env.PORT || 8787;

http.createServer((req, res) => {
  const name = decodeURIComponent((req.url || '/').split('?')[0]).replace(/^\/+/, '') || 'latest.svg';
  const file = path.join(DIR, name);
  if (!file.startsWith(DIR) || !fs.existsSync(file)) { res.writeHead(404); return res.end('not found'); }
  res.writeHead(200, {
    'Content-Type': name.endsWith('.svg') ? 'image/svg+xml' : 'application/octet-stream',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'no-store',
  });
  fs.createReadStream(file).pipe(res);
}).listen(PORT, () => console.log('page-to-figma servindo ./out em http://localhost:' + PORT));
// bind sem host => atende localhost (IPv6 ::1) e 127.0.0.1, evitando o "connection refused" do Windows
