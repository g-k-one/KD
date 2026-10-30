// Builds the static version of the prototype (hash routes, in-browser mock API, relative paths):
//   node scripts/build-artifact.mjs          → ./artifact, for the claude.ai artifact (a page fragment, under 511 files,
//                                              the big pictures in the artifact's asset store)
//   node scripts/build-artifact.mjs --pages  → ./pages, for GitHub Pages (a whole page, every file beside it; it works
//                                              from any sub-path, e.g. /KD/)
import { spawnSync } from 'node:child_process'
import { cpSync, existsSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { extname, join, relative } from 'node:path'

const root = process.cwd()
const src = join(root, '.output', 'public')
const pages = process.argv.includes('--pages')
const out = join(root, pages ? 'pages' : 'artifact')

const gen = spawnSync('npx', ['nuxt', 'generate'], {
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, KD_ARTIFACT: '1', ...(pages && { KD_PAGES: '1' }) },
})
if (gen.status !== 0) process.exit(gen.status ?? 1)

// Empty the folder instead of removing it: a local static server may be holding it open.
if (existsSync(out)) for (const n of readdirSync(out)) rmSync(join(out, n), { recursive: true, force: true })
cpSync(src, out, { recursive: true })
for (const f of ['200.html', '404.html', '_robots.txt']) rmSync(join(out, f), { force: true })

// The artifact host caps a version at 511 files. Forge loads atlases lazily by effect name and the app only
// plays our own kd* effects, so the stock atlases stay out (fx-strips is always loaded by the engine).
if (!pages) {
  const FORGE_KEEP = new Set(['forge.js', 'forge-image.js', 'forge-hits.js', 'forge-matter.js', 'forge-rarity.js', 'forge-motion.js', 'fx-aura.webp', 'fx-noise.png', 'fx-strips.webp'])
  const forgeDir = join(out, 'vendor', 'forge')
  if (existsSync(forgeDir)) for (const n of readdirSync(forgeDir)) if (!FORGE_KEEP.has(n) && !n.startsWith('fx-kd-')) rmSync(join(forgeDir, n), { force: true })

  // Pictures that live in the artifact's asset store (app/mock/artifact-assets.json) stay out of the files
  const stored = Object.keys(JSON.parse(readFileSync(join(root, 'app', 'mock', 'artifact-assets.json'), 'utf8')))
  for (const p of stored) rmSync(join(out, p), { force: true })
}

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
  // a CSS url() resolves against the stylesheet (assets/), not the page: public images are one level up
  if (ext === '.css') s = s.replace(/url\((["']?)img\//g, 'url($1../img/')
  if (s !== before) writeFileSync(file, s)
}

const html = readFileSync(join(out, 'index.html'), 'utf8')
const head = (html.match(/<head>([\s\S]*?)<\/head>/) ?? [])[1] ?? ''
const body = (html.match(/<body[^>]*>([\s\S]*?)<\/body>/) ?? [])[1] ?? ''
// Nuxt normalizes baseURL to "/", so point asset URLs and the runtime base at the page instead.
const relativize = (s) =>
  s.replace(/(["'])\/assets\//g, '$1assets/').replace('baseURL:"/"', 'baseURL:"./"').replace('buildAssetsDir:"/assets/"', 'buildAssetsDir:"assets/"')
// GitHub Pages serves the page as it is: the whole document, made relative, and no Jekyll pass over the files
if (pages) {
  writeFileSync(join(out, 'index.html'), relativize(html).replace('href="/favicon.svg"', 'href="favicon.svg"'))
  writeFileSync(join(out, '.nojekyll'), '')
  console.log(`pages ready: ${walk(out).length} files`)
  process.exit(0)
}
// The artifact host wraps the page in its own <html>/<head>/<body>, so publish a fragment.
const headKeep = relativize(head)
  .replace(/<meta charset[^>]*>/i, '')
  .replace(/<meta name="viewport"[^>]*>/i, '')
  .replace(/<title>[\s\S]*?<\/title>/i, '')
  .replace('href="/favicon.svg"', 'href="favicon.svg"')
writeFileSync(join(out, 'index.html'), `<title>KurwaDROP</title>\n${headKeep.trim()}\n${relativize(body).trim()}\n`)

const files = walk(out).map((f) => relative(out, f).replaceAll('\\', '/'))
writeFileSync(join(out, 'files.json'), JSON.stringify(files.filter((f) => f !== 'index.html' && f !== 'files.json'), null, 2))
console.log(`artifact ready: ${files.length} files`)
if (!existsSync(join(out, 'index.html'))) process.exit(1)
