const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 5173;
const PUBLIC_DIR = path.join(__dirname, 'www');
const DATA_FILE = path.join(__dirname, 'data.json');
const DEFAULT_FILE = path.join(__dirname, 'portable_default_data.json');

function sendJSON(res, obj, status = 200) {
  const s = JSON.stringify(obj, null, 2);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(s);
}

function serveStatic(req, res) {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(req.url, 'http://127.0.0.1').pathname);
  } catch {
    res.writeHead(400);
    res.end('Invalid URL');
    return;
  }
  if (pathname === '/') pathname = '/index.html';
  const filePath = path.join(PUBLIC_DIR, pathname.replace(/^\//, ''));
  if (!filePath.startsWith(PUBLIC_DIR + path.sep) && filePath !== path.join(PUBLIC_DIR, 'index.html')) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }
  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      // fallback to index.html
      const index = path.join(PUBLIC_DIR, 'index.html');
      fs.readFile(index, (e, data) => {
        if (e) { res.writeHead(404); res.end('Not found'); return; }
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(data);
      });
      return;
    }
    const stream = fs.createReadStream(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const map = {
      '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2'
    };
    res.writeHead(200, { 'Content-Type': map[ext] || 'application/octet-stream' });
    stream.pipe(res);
  });
}

const server = http.createServer((req, res) => {
  const pathname = new URL(req.url, 'http://127.0.0.1').pathname;
  if (req.method === 'GET' && pathname === '/api/data') {
    fs.readFile(DATA_FILE, 'utf8', (err, data) => {
      if (err) {
        fs.readFile(DEFAULT_FILE, 'utf8', (defaultErr, defaultData) => {
          if (defaultErr) return sendJSON(res, { error: 'Data file is unavailable' }, 500);
          try { return sendJSON(res, JSON.parse(defaultData)); }
          catch { return sendJSON(res, { error: 'Default data file is invalid' }, 500); }
        });
        return;
      }
      try { sendJSON(res, JSON.parse(data)); }
      catch { sendJSON(res, { error: 'Data file is invalid JSON' }, 500); }
    });
    return;
  }

  if (req.method === 'POST' && pathname === '/api/data') {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 10 * 1024 * 1024) {
        res.writeHead(413);
        res.end('Data file is too large');
        req.destroy();
      }
    });
    req.on('end', () => {
      try {
        const value = JSON.parse(body);
        if (!value || typeof value !== 'object' || Array.isArray(value)) {
          return sendJSON(res, { ok: false, error: 'Data must be a JSON object' }, 400);
        }
        const temporaryFile = DATA_FILE + '.tmp';
        fs.writeFileSync(temporaryFile, body, 'utf8');
        fs.renameSync(temporaryFile, DATA_FILE);
        sendJSON(res, { ok: true });
      } catch (e) {
        sendJSON(res, { ok: false, error: e.message }, 400);
      }
    });
    return;
  }

  // serve static files
  serveStatic(req, res);
});

server.listen(PORT, '127.0.0.1', () => {
  console.log('Portable server running on http://127.0.0.1:' + PORT);
});
