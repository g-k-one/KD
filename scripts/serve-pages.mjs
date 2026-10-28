// Serves ./pages (node scripts/build-artifact.mjs --pages) under /KD/, as GitHub Pages does: no SPA fallback, an
// unknown path is a 404. Usage: node scripts/serve-pages.mjs [port]  → http://127.0.0.1:4321/KD/
import { readFile } from 'node:fs'
import { createServer } from 'node:http'
import { extname, join } from 'node:path'

const ROOT = join(process.cwd(), 'pages')
const PORT = Number(process.argv[2]) || 4321
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.json': 'application/json', '.mp3': 'audio/mpeg', '.woff2': 'font/woff2' }

createServer((req, res) => {
  const url = decodeURIComponent((req.url ?? '/').split('?')[0])
  if (url === '/' || url === '/KD') return res.writeHead(301, { Location: '/KD/' }).end()
  if (!url.startsWith('/KD/') || url.includes('..')) return res.writeHead(404).end('404')
  const file = join(ROOT, url.slice(4), url.endsWith('/') ? 'index.html' : '')
  readFile(file, (err, body) => {
    if (err) return res.writeHead(404).end('404')
    res.writeHead(200, { 'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream' }).end(body)
  })
}).listen(PORT, '127.0.0.1', () => console.log(`pages on http://127.0.0.1:${PORT}/KD/`))
