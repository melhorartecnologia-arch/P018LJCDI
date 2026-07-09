import express from 'express'
import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { query, driver } from './db.js'
import { migrate } from './migrate.js'
import { loadState, saveState, loadCollection, COLLECTION_KEYS, loadConfigEmail } from './repo.js'
import { verifyConfig, sendTest, sendNotify } from './email.js'
import { config } from './config.js'

const here = dirname(fileURLToPath(import.meta.url))

// Where the built web app lives. In the Docker image the web is built to
// web/dist and copied next to the server; locally we point at ../../web/dist.
const WEB_DIST =
  config.webDist ||
  [resolve(here, '../public'), resolve(here, '../../web/dist')].find((p) => existsSync(p)) ||
  resolve(here, '../../web/dist')

const app = express()
app.use(express.json({ limit: config.jsonBodyLimit }))

app.get('/api/health', async (_req, res) => {
  try {
    await query('SELECT 1')
    res.json({ ok: true, driver })
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

// ── E-mail (SMTP) — gerenciado no painel de Configurações Técnicas ──────────
// Usa a configuração enviada no corpo; se ausente, a persistida no banco.
async function resolveEmailConfig(body) {
  if (body && body.config && typeof body.config === 'object') return body.config
  return (await loadConfigEmail()) || {}
}

app.post('/api/email/verify', async (req, res) => {
  try {
    await verifyConfig(await resolveEmailConfig(req.body))
    res.json({ ok: true, mensagem: 'Conexão SMTP verificada com sucesso.' })
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message || String(err) })
  }
})

app.post('/api/email/test', async (req, res) => {
  try {
    const info = await sendTest(await resolveEmailConfig(req.body), (req.body && req.body.to) || '')
    res.json({ ok: true, mensagem: 'E-mail de teste enviado.', ...info })
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message || String(err) })
  }
})

// Notificações automáticas dos fluxos (pedidos, cotações, faturamento,
// royalties). A configuração vem do banco; só envia se estiver ativa.
app.post('/api/email/notify', async (req, res) => {
  try {
    const cfg = (await loadConfigEmail()) || {}
    const { evento, to, vars } = req.body || {}
    if (!evento) return res.status(400).json({ ok: false, error: 'Evento não informado.' })
    const result = await sendNotify(cfg, evento, to || [], vars || {})
    res.json(result)
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message || String(err) })
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
    app.listen(config.port, config.host, () => {
      const shown = config.publicUrl || `http://localhost:${config.port}`
      console.log(`[server] Plataforma Cidade Imperial ouvindo em ${shown} (banco: ${driver})`)
      console.log(`[server] servindo web de ${WEB_DIST}`)
    })
  })
  .catch((err) => {
    console.error('[server] falha ao iniciar:', err)
    process.exit(1)
  })
