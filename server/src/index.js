import express from 'express'
import { existsSync, readFileSync } from 'node:fs'
import { createServer as createHttpServer } from 'node:http'
import { createServer as createHttpsServer } from 'node:https'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { query, driver } from './db.js'
import { migrate } from './migrate.js'
import { loadState, saveState, loadCollection, COLLECTION_KEYS, loadConfigEmail, saveAnexo, loadAnexo,
  lerUsuarioPorEmail, lerUsuarioPorId, atualizarUsuario } from './repo.js'
import * as auth from './auth.js'
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

// ── Autenticação ───────────────────────────────────────────────────────────
// A senha é conferida aqui, não no navegador. O cliente manda e-mail e senha e
// recebe "entra" ou "não entra" — o hash nunca atravessa a rede.

const origemDe = (req) => String(req.ip || (req.socket && req.socket.remoteAddress) || 'desconhecida')
const semSegredoUsr = (u) => {
  const { senhaHash, bloqLogin, ...resto } = u
  return { ...resto, temSenha: !!senhaHash, trocarSenha: !!u.trocarSenha }
}

// A resposta de falha é sempre a mesma para e-mail inexistente e senha errada:
// quem está tentando adivinhar não descobre quais contas existem.
const CREDENCIAL_INVALIDA = { ok: false, erro: 'credenciais' }

app.post('/api/auth/login', async (req, res, next) => {
  try {
    const { email, senha } = req.body || {}
    const ip = origemDe(req)
    if (auth.freioOrigem(ip)) {
      return res.status(429).json({ ok: false, erro: 'excesso',
        mensagem: 'Tentativas demais a partir deste acesso. Aguarde alguns minutos.' })
    }
    if (!email || !senha) return res.status(400).json(CREDENCIAL_INVALIDA)

    const u = await lerUsuarioPorEmail(email)
    // Usuário inexistente: consome o mesmo tempo de um scrypt, para que a
    // demora da resposta também não denuncie quais e-mails estão cadastrados.
    if (!u) { auth.conferirSenha(String(senha), auth.hashSenha('referencia-de-tempo')); return res.status(401).json(CREDENCIAL_INVALIDA) }

    const preso = auth.travaAtiva(u.bloqLogin)
    if (preso) {
      return res.status(429).json({ ok: false, erro: 'bloqueado', minutos: preso,
        mensagem: `Acesso temporariamente bloqueado por tentativas incorretas. Tente de novo em ${preso} minuto(s).` })
    }

    if (!u.senhaHash || !auth.conferirSenha(String(senha), u.senhaHash)) {
      const b = u.bloqLogin || { falhas: 0, bloqueios: 0, ate: null }
      const falhas = (b.falhas || 0) + 1
      const patch = falhas >= auth.MAX_TENTATIVAS
        ? { falhas: 0, bloqueios: (b.bloqueios || 0) + 1,
            ate: new Date(Date.now() + auth.minutosDeEspera(b.bloqueios || 0) * 60000).toISOString() }
        : { ...b, falhas }
      await atualizarUsuario(u.id, { bloqLogin: patch })
      const travou = auth.travaAtiva(patch)
      if (travou) {
        return res.status(429).json({ ok: false, erro: 'bloqueado', minutos: travou,
          mensagem: `Acesso temporariamente bloqueado por ${travou} minuto(s) após ${auth.MAX_TENTATIVAS} tentativas incorretas.` })
      }
      // Nada de "restam N tentativas": isso só existiria para contas reais e
      // entregaria quais e-mails estão cadastrados.
      return res.status(401).json(CREDENCIAL_INVALIDA)
    }

    // Senha correta. O que impede o acesso a partir daqui pode ser dito com
    // clareza: quem chegou até aqui já provou ser o dono da conta.
    if (!u.ativo) {
      return res.status(403).json({ ok: false, erro: 'inativo',
        mensagem: 'Usuário inativo. Fale com o administrador da plataforma.' })
    }

    const patch = { bloqLogin: null }
    // Senha gravada no formato antigo: regrava em scrypt agora, com a senha em mãos.
    if (auth.ehLegado(u.senhaHash)) patch.senhaHash = auth.hashSenha(String(senha))
    const atualizado = await atualizarUsuario(u.id, patch)
    auth.limparFreio(ip)

    const token = auth.criarSessao(atualizado)
    res.json({ ok: true, token, usuario: semSegredoUsr(atualizado) })
  } catch (err) { next(err) }
})

app.post('/api/auth/logout', (req, res) => {
  auth.encerrarSessao((req.body || {}).token)
  res.json({ ok: true })
})

// Troca da própria senha — exige a senha atual, mesmo na troca obrigatória do
// primeiro acesso. É o caminho que tira o usuário da senha enviada por e-mail.
app.post('/api/auth/trocar-senha', async (req, res, next) => {
  try {
    const { email, senhaAtual, novaSenha } = req.body || {}
    if (auth.freioOrigem(origemDe(req))) {
      return res.status(429).json({ ok: false, erro: 'excesso', mensagem: 'Tentativas demais. Aguarde alguns minutos.' })
    }
    const u = await lerUsuarioPorEmail(email)
    if (!u || !u.senhaHash || !auth.conferirSenha(String(senhaAtual || ''), u.senhaHash)) {
      return res.status(401).json({ ok: false, erro: 'credenciais', mensagem: 'Senha atual incorreta.' })
    }
    const erro = auth.erroSenha(novaSenha, u.email)
    if (erro) return res.status(400).json({ ok: false, erro: 'politica', mensagem: erro })
    if (auth.conferirSenha(String(novaSenha), u.senhaHash)) {
      return res.status(400).json({ ok: false, erro: 'politica', mensagem: 'A nova senha deve ser diferente da atual.' })
    }
    const atualizado = await atualizarUsuario(u.id, {
      senhaHash: auth.hashSenha(String(novaSenha)), trocarSenha: false, bloqLogin: null,
      senhaAlteradaEm: new Date().toISOString() })
    // Trocar a senha derruba as outras sessões daquele usuário.
    auth.encerrarSessoesDe(u.id)
    res.json({ ok: true, token: auth.criarSessao(atualizado), usuario: semSegredoUsr(atualizado) })
  } catch (err) { next(err) }
})

// Senha inicial definida pela Loja (criação do usuário e reenvio de acesso).
// Só quem já está autenticado como administrador ou Loja pode chamar, e a senha
// definida aqui nasce com troca obrigatória no primeiro acesso.
app.post('/api/auth/definir-senha', async (req, res, next) => {
  try {
    const { token, usuarioId, senha } = req.body || {}
    const s = auth.lerSessao(token)
    if (!s || !['admin', 'loja'].includes(s.papel)) {
      return res.status(403).json({ ok: false, erro: 'sem_permissao',
        mensagem: 'Sessão sem permissão para definir senhas.' })
    }
    const alvo = await lerUsuarioPorId(usuarioId)
    if (!alvo) return res.status(404).json({ ok: false, erro: 'nao_encontrado' })
    const nova = String(senha || '') || auth.gerarSenha()
    const erro = auth.erroSenha(nova, alvo.email)
    if (erro) return res.status(400).json({ ok: false, erro: 'politica', mensagem: erro })
    await atualizarUsuario(usuarioId, { senhaHash: auth.hashSenha(nova), trocarSenha: true, bloqLogin: null })
    auth.encerrarSessoesDe(usuarioId)
    res.json({ ok: true, senha: nova })
  } catch (err) { next(err) }
})

// Senha inicial sugerida pela plataforma (dentro da política).
app.get('/api/auth/senha-sugerida', (_req, res) => res.json({ ok: true, senha: auth.gerarSenha() }))

// "Esqueci minha senha": registra o pedido e avisa a Loja. NÃO troca a senha de
// ninguém — se trocasse, bastaria saber o e-mail de alguém para derrubar o
// acesso dessa pessoa. A resposta é sempre a mesma, exista a conta ou não.
app.post('/api/auth/recuperar', async (req, res) => {
  const generica = { ok: true, mensagem: 'Se este e-mail estiver cadastrado, a Loja Cidade Imperial foi avisada e entrará em contato com as instruções de acesso.' }
  try {
    if (auth.freioOrigem(origemDe(req))) return res.json(generica)
    const { email } = req.body || {}
    const u = await lerUsuarioPorEmail(email)
    if (!u) return res.json(generica)
    const cfg = (await loadConfigEmail()) || {}
    const destino = cfg.emailLoja || cfg.remetenteEmail
    if (cfg.ativo && destino) {
      await sendNotify(cfg, 'recuperacao_senha', [destino], {
        usuarioNome: u.nome, usuarioEmail: u.email,
        papel: u.papel, quando: new Date().toLocaleString('pt-BR'),
      }).catch(() => {})
    }
    await atualizarUsuario(u.id, { pedidoAcesso: { quando: new Date().toISOString() } })
    res.json(generica)
  } catch (err) {
    console.error('[server] recuperar acesso:', err)
    res.json(generica)
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
    // PDF/XML para documentos fiscais; demais formatos para anexos de proposta
    // e de atendimento (Ata 5.7). O limite de 5 MB vale para todos.
    if (!['pdf', 'xml', 'xls', 'xlsx', 'csv', 'doc', 'docx', 'png', 'jpg', 'jpeg'].includes(ext)) {
      return res.status(400).json({ ok: false, error: 'Formato de anexo não permitido — use PDF, XML, Excel (XLS/XLSX/CSV), Word (DOC/DOCX) ou imagem (PNG/JPG).' })
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

// HTTPS nativo (sem proxy): com HTTPS_CERT e HTTPS_KEY definidos, a aplicação
// serve TLS diretamente em HTTPS_PORT e (opcionalmente) redireciona o HTTP da
// PORT para o HTTPS. Sem essas variáveis, serve HTTP puro em PORT — o cenário
// clássico atrás de um proxy (Nginx) que termina o TLS.
function iniciarEscuta() {
  if (config.httpsCert && config.httpsKey) {
    const creds = { cert: readFileSync(config.httpsCert), key: readFileSync(config.httpsKey) }
    createHttpsServer(creds, app).listen(config.httpsPort, config.host, () => {
      const shown = config.publicUrl || `https://localhost:${config.httpsPort}`
      console.log(`[server] Plataforma Cidade Imperial ouvindo em ${shown} (HTTPS, banco: ${driver})`)
      console.log(`[server] servindo web de ${WEB_DIST}`)
    })
    if (config.httpsRedirect) {
      createHttpServer((req, res) => {
        const host = String(req.headers.host || 'localhost').replace(/:\d+$/, '')
        const porta = config.httpsPort === 443 ? '' : `:${config.httpsPort}`
        res.writeHead(301, { Location: `https://${host}${porta}${req.url || '/'}` })
        res.end()
      }).listen(config.port, config.host, () => {
        console.log(`[server] HTTP na porta ${config.port} redirecionando para HTTPS ${config.httpsPort}`)
      })
    }
    return
  }
  app.listen(config.port, config.host, () => {
    const shown = config.publicUrl || `http://localhost:${config.port}`
    console.log(`[server] Plataforma Cidade Imperial ouvindo em ${shown} (banco: ${driver})`)
    console.log(`[server] servindo web de ${WEB_DIST}`)
  })
}

migrate()
  .then(iniciarEscuta)
  .catch((err) => {
    console.error('[server] falha ao iniciar:', err)
    process.exit(1)
  })
