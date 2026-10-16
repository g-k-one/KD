// Builds the static artifact version of the prototype into ./artifact
// Usage: node scripts/build-artifact.mjs
import { spawnSync } from 'node:child_process'
import { cpSync, existsSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { extname, join, relative } from 'node:path'

const root = process.cwd()
const src = join(root, '.output', 'public')
const out = join(root, 'artifact')

const gen = spawnSync('npx', ['nuxt', 'generate'], {
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, KD_ARTIFACT: '1' },
})
if (gen.status !== 0) process.exit(gen.status ?? 1)

// Empty the folder instead of removing it: a local static server may be holding it open.
if (existsSync(out)) for (const n of readdirSync(out)) rmSync(join(out, n), { recursive: true, force: true })
cpSync(src, out, { recursive: true })
for (const f of ['200.html', '404.html', '_robots.txt']) rmSync(join(out, f), { force: true })

const walk = (dir) =>
  readdirSync(dir).flatMap((n) => {
    const p = join(dir, n)
    return statSync(p).isDirectory() ? walk(p) : [p]
  })

// Absolute paths break inside the artifact: make them relative to the page (hash routing keeps the page at /).
for (const file of walk(out)) {
  const ext = extname(file)
  if (!['.js', '.css', '.html', '.mjs'].includes(ext)) continue
  let s = readFileSync(file, 'utf8')
  const before = s
  s = s.replace(/(["'`(])\/img\//g, '$1img/')
  // The artifact host rejects a literal U+FFFD (vue-i18n uses one in a string); the escape is equivalent.
  if (ext === '.js') s = s.replaceAll('�', '\\uFFFD')
  if (ext === '.css') s = s.replace(/url\((["']?)\/_nuxt\//g, 'url($1./')
  if (s !== before) writeFileSync(file, s)
}

// The artifact host wraps the page in its own <html>/<head>/<body>, so publish a fragment.
const html = readFileSync(join(out, 'index.html'), 'utf8')
const head = (html.match(/<head>([\s\S]*?)<\/head>/) ?? [])[1] ?? ''
const body = (html.match(/<body[^>]*>([\s\S]*?)<\/body>/) ?? [])[1] ?? ''
// Nuxt normalizes baseURL to "/", so point asset URLs and the runtime base at the page instead.
const relativize = (s) =>
  s.replace(/(["'])\/assets\//g, '$1assets/').replace('baseURL:"/"', 'baseURL:"./"').replace('buildAssetsDir:"/assets/"', 'buildAssetsDir:"assets/"')
const headKeep = relativize(head)
  .replace(/<meta charset[^>]*>/i, '')
  .replace(/<meta name="viewport"[^>]*>/i, '')
  .replace(/<title>[\s\S]*?<\/title>/i, '')
writeFileSync(join(out, 'index.html'), `<title>KurwaDROP</title>\n${headKeep.trim()}\n${relativize(body).trim()}\n`)

const files = walk(out).map((f) => relative(out, f).replaceAll('\\', '/'))
writeFileSync(join(out, 'files.json'), JSON.stringify(files.filter((f) => f !== 'index.html' && f !== 'files.json'), null, 2))
console.log(`artifact ready: ${files.length} files`)
if (!existsSync(join(out, 'index.html'))) process.exit(1)
