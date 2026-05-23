import { createServer } from 'node:http';
import { readFile, appendFile, mkdir } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import { extname, join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import handler from './api/research.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const LOG_DIR = join(__dirname, 'logs');
const LOG_FILE = join(LOG_DIR, 'server.log');
await mkdir(LOG_DIR, { recursive: true });

function ts() {
  return new Date().toISOString();
}

async function log(level, msg, extra) {
  const line = JSON.stringify({ ts: ts(), level, msg, ...(extra || {}) });
  const colored = level === 'error'
    ? `\x1b[31m${line}\x1b[0m`
    : level === 'warn'
    ? `\x1b[33m${line}\x1b[0m`
    : line;
  console.log(colored);
  try { await appendFile(LOG_FILE, line + '\n'); } catch {}
}

const envPath = join(__dirname, '.env.local');
if (existsSync(envPath)) {
  const raw = readFileSync(envPath, 'utf8');
  for (const line of raw.split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (!m) continue;
    let val = m[2];
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    process.env[m[1]] = val;
  }
}

if (!process.env.ANTHROPIC_API_KEY) {
  await log('warn', 'ANTHROPIC_API_KEY is not set; /api/research will fail');
} else {
  const k = process.env.ANTHROPIC_API_KEY;
  await log('info', 'env loaded', { key_prefix: k.slice(0, 12), key_suffix: k.slice(-4) });
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon'
};

const PUBLIC = resolve(__dirname, 'public');

async function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (c) => { data += c; });
    req.on('end', () => {
      if (!data) return resolve({});
      try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
    });
    req.on('error', reject);
  });
}

function wrapRes(res) {
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (obj) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify(obj));
    return res;
  };
  const origEnd = res.end.bind(res);
  res.end = (...args) => origEnd(...args);
  return res;
}

const server = createServer(async (req, res) => {
  wrapRes(res);
  const started = Date.now();
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;

  res.on('finish', () => {
    log('info', 'request', {
      method: req.method,
      path: pathname,
      status: res.statusCode,
      ms: Date.now() - started,
      ip: req.socket.remoteAddress
    });
  });

  if (pathname === '/api/research') {
    try {
      req.body = req.method === 'POST' ? await readJsonBody(req) : {};
    } catch (e) {
      await log('error', 'invalid JSON body', { err: e.message });
      return res.status(400).json({ error: 'Invalid JSON body' });
    }
    await log('info', 'research call', {
      type: req.body?.type,
      setting: req.body?.setting,
      tropes: req.body?.tropes
    });
    try {
      return await handler(req, res);
    } catch (e) {
      await log('error', 'handler threw', { err: e.message, stack: e.stack });
      if (!res.headersSent) res.status(500).json({ error: e.message });
      return;
    }
  }

  let filePath = pathname === '/' ? '/index.html' : pathname;
  const abs = resolve(PUBLIC, '.' + filePath);
  if (!abs.startsWith(PUBLIC)) {
    res.statusCode = 403;
    return res.end('Forbidden');
  }
  try {
    const data = await readFile(abs);
    res.setHeader('Content-Type', MIME[extname(abs)] || 'application/octet-stream');
    res.end(data);
  } catch {
    res.statusCode = 404;
    res.end('Not found');
  }
});

process.on('uncaughtException', (e) => log('error', 'uncaughtException', { err: e.message, stack: e.stack }));
process.on('unhandledRejection', (e) => log('error', 'unhandledRejection', { err: String(e) }));

const PORT = process.env.PORT || 3000;
server.listen(PORT, async () => {
  await log('info', `server listening`, { url: `http://localhost:${PORT}`, log_file: LOG_FILE });
});
