/**
 * Genuine screenshot capture for the TraceLens public site and analyst workspace.
 *
 *   node scripts/capture_screenshots.mjs
 *
 * Requires the dev server at http://127.0.0.1:5173 and the installed Chrome at
 * C:\Program Files\Google\Chrome\Application\chrome.exe (override with CHROME_PATH).
 *
 * Every PNG written by this script comes from a real Chrome Page.captureScreenshot
 * response. If a route does not contain the expected content, the file is NOT
 * overwritten and the manifest records it as skipped. Nothing is fabricated.
 */

import { spawn } from 'node:child_process'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(SCRIPT_DIR, '..')
const OUT_DIR = path.join(ROOT, 'frontend', 'public', 'screenshots')
const CHROME = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const BASE = (process.env.TRACELENS_BASE || 'http://127.0.0.1:5173').replace(/\/$/, '')

const SHOTS = [
  { file: 'hero.png', route: '/', expect: 'See Beyond the Alert', label: 'Landing hero', scrollTo: null },
  { file: 'storytelling.png', route: '/', expect: 'Six acts', label: 'Six scroll acts', scrollTo: 'story-acts-heading' },
  { file: 'about.png', route: '/about', expect: 'About TraceLens', label: 'About page', scrollTo: null },
  { file: 'login.png', route: '/login', expect: 'Sign in to TraceLens', label: 'Sign-in page', scrollTo: null },
  { file: 'judge-mode.png', route: '/judge', expect: 'Guided judge mode', label: 'Judge walkthrough', scrollTo: null },
  { file: 'overview.png', route: '/app/overview', expect: 'Platform Overview', label: 'Analyst overview', scrollTo: null, heading: true },
  { file: 'data-lab.png', route: '/app/data', expect: 'Data Lab', label: 'Data Lab', scrollTo: null, heading: true },
  { file: 'detection.png', route: '/app/detect', expect: 'Anomaly Detection', label: 'Detection results', scrollTo: null, heading: true },
  { file: 'investigation.png', route: '/app/investigate', expect: 'Investigation & Incident Lifecycle', label: 'Incident investigation', scrollTo: null, heading: true },
  { file: 'escalation.png', route: '/app/investigate', expect: 'Escalate incident', label: 'Incident escalation form', scrollTo: 'esc-reason' },
  { file: 'explainability.png', route: '/app/explain', expect: 'Explainability', label: 'Explainability', scrollTo: null, heading: true },
  { file: 'experiments.png', route: '/app/experiments', expect: 'Experiment Lab', label: 'Experiment lab', scrollTo: null, heading: true },
  { file: 'reports.png', route: '/app/reports', expect: 'Reports', label: 'Reports', scrollTo: null, heading: true },
]

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function serverIsUp() {
  try {
    const res = await fetch(BASE, { signal: AbortSignal.timeout(4000) })
    return res.ok
  } catch {
    return false
  }
}

async function findDevToolsPort(profile, child) {
  const file = path.join(profile, 'DevToolsActivePort')
  for (let i = 0; i < 60; i += 1) {
    if (child.exitCode !== null) throw new Error(`Chrome exited early (code ${child.exitCode}).`)
    try {
      const text = await readFile(file, 'utf8')
      const port = Number(text.split(/\r?\n/)[0])
      if (Number.isInteger(port) && port > 0) return port
    } catch { /* not written yet */ }
    await delay(250)
  }
  throw new Error('Chrome did not publish a debugging port in time.')
}

/** Minimal Chrome DevTools Protocol client using Node's built-in WebSocket. */
class Cdp {
  constructor(ws) {
    this.ws = ws
    this.id = 0
    this.pending = new Map()
    this.listeners = new Map()
    ws.addEventListener('message', (event) => {
      let msg
      try { msg = JSON.parse(event.data) } catch { return }
      if (msg.id != null && this.pending.has(msg.id)) {
        const { resolve, reject, timer } = this.pending.get(msg.id)
        clearTimeout(timer)
        this.pending.delete(msg.id)
        if (msg.error) reject(new Error(msg.error.message || 'CDP error'))
        else resolve(msg.result)
        return
      }
      if (msg.method && this.listeners.has(msg.method)) {
        for (const fn of this.listeners.get(msg.method)) fn(msg.params)
      }
    })
  }

  on(method, fn) {
    if (!this.listeners.has(method)) this.listeners.set(method, [])
    this.listeners.get(method).push(fn)
    return () => {
      const arr = this.listeners.get(method) || []
      const i = arr.indexOf(fn)
      if (i >= 0) arr.splice(i, 1)
    }
  }

  send(method, params = {}) {
    const id = ++this.id
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id)
        reject(new Error(`CDP timeout: ${method}`))
      }, 20000)
      this.pending.set(id, { resolve, reject, timer })
      this.ws.send(JSON.stringify({ id, method, params }))
    })
  }
}

async function connectToPage(port) {
  let targets
  for (let i = 0; i < 40; i += 1) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/list`)
      targets = await res.json()
      const page = targets.find((t) => t.type === 'page')
      if (page?.webSocketDebuggerUrl) {
        const ws = new WebSocket(page.webSocketDebuggerUrl)
        await new Promise((resolve, reject) => {
          ws.addEventListener('open', resolve, { once: true })
          ws.addEventListener('error', () => reject(new Error('WebSocket connection failed.')), { once: true })
        })
        return new Cdp(ws)
      }
    } catch { /* waiting for the page target */ }
    await delay(250)
  }
  throw new Error('Could not connect to a Chrome page target.')
}

async function navigateAndSettle(cdp, url) {
  const loaded = new Promise((resolve) => {
    const off = cdp.on('Page.loadEventFired', () => { off(); resolve() })
    setTimeout(() => { off(); resolve() }, 12000)
  })
  await cdp.send('Page.navigate', { url })
  await loaded
  await delay(1400) // allow React render, lazy charts and fonts to settle
}

async function pageText(cdp) {
  const result = await cdp.send('Runtime.evaluate', {
    expression: 'document.body ? document.body.innerText : ""',
    returnByValue: true,
  })
  return String(result?.result?.value || '')
}

/**
 * Wait until the page shows its real content, not the auth gate or loading
 * skeletons. A fixed delay used to capture seven identical loading screens.
 */
async function waitForReady(cdp, expect, heading = false, timeoutMs = 12000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    const state = await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const text = document.body ? document.body.innerText : '';
        const h1 = document.querySelector('h1');
        const heading = h1 ? h1.innerText : '';
        return {
          text,
          gated: /Checking your session/i.test(text),
          matches: (${heading} ? heading : text).toLowerCase().includes(${JSON.stringify(expect.toLowerCase())}),
        };
      })()`,
      returnByValue: true,
    })
    const v = state?.result?.value || {}
    if (v.matches && !v.gated) return true
    await delay(250)
  }
  return false
}

async function main() {
  if (!(await serverIsUp())) {
    console.error(`Refusing to capture: ${BASE} is not reachable. Start the dev server first.`)
    process.exit(1)
  }

  await mkdir(OUT_DIR, { recursive: true })
  const profile = await mkdtemp(path.join(os.tmpdir(), 'tracelens-shot-'))
  let child = null
  let ws = null
  const results = []

  try {
    child = spawn(CHROME, [
      '--headless=new',
      '--disable-gpu',
      '--hide-scrollbars',
      '--no-first-run',
      '--no-default-browser-check',
      '--force-device-scale-factor=1',
      '--window-size=1440,1000',
      `--user-data-dir=${profile}`,
      '--remote-debugging-port=0',
      'about:blank',
    ], { stdio: 'ignore', windowsHide: true })

    const port = await findDevToolsPort(profile, child)
    const cdp = await connectToPage(port)
    ws = cdp.ws
    await cdp.send('Page.enable')
    await cdp.send('Runtime.enable')

    // Establish the origin, then opt into the documented demo session so
    // analyst routes render without a real sign-in.
    await navigateAndSettle(cdp, `${BASE}/`)
    await cdp.send('Runtime.evaluate', {
      expression: "try { sessionStorage.setItem('tracelens:demo-session','1'); } catch (e) {} true",
      returnByValue: true,
    })

    for (const shot of SHOTS) {
      try {
        await navigateAndSettle(cdp, `${BASE}${shot.route}`)
        if (shot.click) {
          // Select the first incident row so the escalation form is visible,
          // then let React render the detail panel.
          await waitForReady(cdp, 'Incidents (', false)
          await cdp.send('Runtime.evaluate', {
            expression: `(() => { const el = document.querySelector(${JSON.stringify(shot.click)}); if (el) { el.click(); return true } return false })()`,
            returnByValue: true,
          })
          await delay(900)
        }
        if (shot.scrollTo) {
          await cdp.send('Runtime.evaluate', {
            expression: `(() => { const el = document.getElementById(${JSON.stringify(shot.scrollTo)}); if (el) el.scrollIntoView({block:'start'}); return true })()`,
            returnByValue: true,
          })
          await delay(700)
        }
        const ready = await waitForReady(cdp, shot.expect, Boolean(shot.heading))
        const text = await pageText(cdp)
        // A bare "404" can appear inside legitimate dataset names or numbers,
        // so only match unambiguous server/error-page phrases.
        const looksLikeError = /Cannot GET|Internal Server Error|Page not found|404 Not Found/i.test(text)
        // innerText reflects CSS text-transform, so compare case-insensitively.
        const verified = ready && text.toLowerCase().includes(shot.expect.toLowerCase()) && !looksLikeError && text.trim().length > 80
        const target = path.join(OUT_DIR, shot.file)

        if (!verified) {
          results.push({ file: shot.file, route: shot.route, status: 'skipped', reason: 'expected content not found; existing file left untouched' })
          console.warn(`SKIP ${shot.file} — ${shot.route} did not contain "${shot.expect}". ready=${ready} textLen=${text.length} hasExpect=${text.toLowerCase().includes(shot.expect.toLowerCase())} error=${looksLikeError}`)
          continue
        }

        const image = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })
        if (!image?.data) throw new Error('Chrome returned no image data.')
        await writeFile(target, Buffer.from(image.data, 'base64'))
        results.push({ file: shot.file, route: shot.route, status: 'captured', label: shot.label, bytes: Buffer.from(image.data, 'base64').length, capturedAt: new Date().toISOString() })
        console.log(`CAPTURED ${shot.file} <- ${shot.route}`)
      } catch (err) {
        results.push({ file: shot.file, route: shot.route, status: 'failed', reason: err instanceof Error ? err.message : String(err) })
        console.warn(`FAIL ${shot.file}: ${err instanceof Error ? err.message : String(err)}`)
      }
    }
  } finally {
    if (ws) { try { ws.close() } catch { /* ignore */ } }
    if (child && child.exitCode === null) child.kill('SIGTERM')
    await delay(400)
    if (child && child.exitCode === null) child.kill('SIGKILL')
    await rm(profile, { recursive: true, force: true }).catch(() => {})
  }

  const manifest = {
    generatedAt: new Date().toISOString(),
    source: 'headless Chrome Page.captureScreenshot',
    chrome: CHROME,
    base: BASE,
    viewport: { width: 1440, height: 1000 },
    note: 'Only images with status "captured" were written by this run. No image is generated or fabricated.',
    shots: results,
  }
  await writeFile(path.join(OUT_DIR, 'CAPTURE_MANIFEST.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')

  const captured = results.filter((r) => r.status === 'captured').length
  console.log(`\n${captured}/${SHOTS.length} screenshots captured genuinely. Manifest: ${path.join(OUT_DIR, 'CAPTURE_MANIFEST.json')}`)
  if (captured === 0) process.exitCode = 1
}

main().catch((err) => {
  console.error(err instanceof Error ? err.stack || err.message : String(err))
  process.exitCode = 1
})
