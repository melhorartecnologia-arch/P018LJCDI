import express from 'express'
import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { pool } from './db.js'
import { migrate } from './migrate.js'
import { loadState, saveState, loadCollection, COLLECTION_KEYS } from './repo.js'

const here = dirname(fileURLToPath(import.meta.url))
const PORT = Number(process.env.PORT || 3000)

// Where the built web app lives. In the Docker image the web is built to
// web/dist and copied next to the server; locally we point at ../../web/dist.
const WEB_DIST =
  process.env.WEB_DIST ||
  [resolve(here, '../public'), resolve(here, '../../web/dist')].find((p) => existsSync(p)) ||
  resolve(here, '../../web/dist')

const app = express()
app.use(express.json({ limit: '8mb' }))

app.get('/api/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1')
    res.json({ ok: true })
  } catch (err) {
    res.status(503).json({ ok: false, error: String(err) })
  }
})

// Full application state — used by the web app to hydrate on load.
app.get('/api/state', async (_req, res, next) => {
  try {
    res.json(await loadState())
  } catch (err) {
    next(err)
  }
})

// Replace the full application state — the web app persists here after changes.
app.put('/api/state', async (req, res, next) => {
  try {
    const body = req.body
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return res.status(400).json({ error: 'Corpo inválido: esperado objeto de estado.' })
    }
    await saveState(body)
    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
})

// Individual REST resources (read-only) for integrations and inspection.
for (const key of COLLECTION_KEYS) {
  app.get(`/api/${key}`, async (_req, res, next) => {
    try {
      res.json(await loadCollection(key))
    } catch (err) {
      next(err)
    }
  })
}

// Serve the built web app and fall back to index.html for the SPA.
if (existsSync(WEB_DIST)) {
  app.use(express.static(WEB_DIST))
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next()
    res.sendFile(resolve(WEB_DIST, 'index.html'))
  })
} else {
  console.warn(`[server] web build not found at ${WEB_DIST} — API only`)
}

app.use((err, _req, res, _next) => {
  console.error('[server] error:', err)
  res.status(500).json({ error: 'Erro interno do servidor.' })
})

migrate()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`[server] Plataforma Cidade Imperial ouvindo em http://localhost:${PORT}`)
      console.log(`[server] servindo web de ${WEB_DIST}`)
    })
  })
  .catch((err) => {
    console.error('[server] falha ao iniciar:', err)
    process.exit(1)
  })
