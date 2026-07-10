import express from 'express'
import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { query, driver } from './db.js'
import { migrate } from './migrate.js'
import { loadState, saveState, loadCollection, COLLECTION_KEYS, loadConfigEmail, saveAnexo, loadAnexo } from './repo.js'
import { verifyConfig, sendTest, sendNotify } from './email.js'
import { analisarDocumento, engineAtual, claudeDisponivel } from './analise-fiscal.js'
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

// ── Anexos (documento fiscal do faturamento) e análise por IA ───────────────
// Upload do anexo (JSON com base64) — devolve o id para vincular ao faturamento.
app.post('/api/anexos', async (req, res) => {
  try {
    const { nome, tipo, dados } = req.body || {}
    if (!dados || typeof dados !== 'string') {
      return res.status(400).json({ ok: false, error: 'Anexo não informado.' })
    }
    const ext = String(nome || '').split('.').pop().toLowerCase()
    if (!['pdf', 'xml'].includes(ext)) {
      return res.status(400).json({ ok: false, error: 'O anexo deve ser um PDF ou XML do documento fiscal.' })
    }
    const tamanho = Math.floor(dados.length * 0.75)
    if (tamanho > 5 * 1024 * 1024) {
      return res.status(400).json({ ok: false, error: 'Anexo muito grande (máximo 5 MB).' })
    }
    const id = 'ax' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
    await saveAnexo({
      id,
      nome: String(nome || 'documento.' + ext),
      tipo: String(tipo || (ext === 'pdf' ? 'application/pdf' : 'text/xml')),
      tamanho,
      criadoEm: new Date().toISOString(),
      dados,
    })
    res.json({ ok: true, id })
  } catch (err) {
    console.error('[server] anexo:', err)
    res.status(500).json({ ok: false, error: 'Falha ao gravar o anexo.' })
  }
})

// Download do anexo pelo id (link 📎 nas telas de faturamento).
app.get('/api/anexos/:id', async (req, res) => {
  try {
    const a = await loadAnexo(req.params.id)
    if (!a) return res.status(404).json({ ok: false, error: 'Anexo não encontrado.' })
    const buf = Buffer.from(a.dados, 'base64')
    res.setHeader('Content-Type', a.tipo || 'application/octet-stream')
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(a.nome || 'documento')}"`)
    res.send(buf)
  } catch (err) {
    console.error('[server] anexo download:', err)
    res.status(500).json({ ok: false, error: 'Falha ao ler o anexo.' })
  }
})

// Motor de análise disponível (Claude via API Anthropic ou analisador local).
app.get('/api/analise-fiscal/status', (_req, res) => {
  res.json({ ok: true, engine: engineAtual(), claudeDisponivel: claudeDisponivel() })
})

// Analisa se o documento fiscal anexado se refere ao pedido sendo faturado.
// Corpo: { anexoId, pedido: { pedidoId, valor, fornecedorNome, fornecedorCnpj,
//          revendaNome, revendaCnpj, itens: [{descricao, qtd}] } }
app.post('/api/faturamento/analisar', async (req, res) => {
  try {
    const { anexoId, pedido } = req.body || {}
    if (!anexoId) return res.status(400).json({ ok: false, error: 'Anexo não informado.' })
    if (!pedido || !pedido.pedidoId) return res.status(400).json({ ok: false, error: 'Contexto do pedido não informado.' })
    const a = await loadAnexo(anexoId)
    if (!a) return res.status(404).json({ ok: false, error: 'Anexo não encontrado.' })
    const r = await analisarDocumento({ nome: a.nome, tipo: a.tipo, dadosB64: a.dados, pedido })
    res.json({ ok: true, ...r })
  } catch (err) {
    console.error('[server] analise fiscal:', err)
    res.status(500).json({ ok: false, error: 'Falha na análise do documento.' })
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
