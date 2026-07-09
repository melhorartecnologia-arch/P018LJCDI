import nodemailer from 'nodemailer'
import { renderTemplate } from './email-templates.js'

// Monta um transporte SMTP a partir dos parâmetros configurados no painel.
// seguranca: 'ssl' (porta 465, TLS direto) | 'starttls' (STARTTLS) | 'none'.
export function buildTransport(cfg = {}) {
  const secure = cfg.seguranca === 'ssl'
  const port = Number(cfg.porta) || (secure ? 465 : 587)
  const opts = {
    host: (cfg.host || '').trim(),
    port,
    secure,
    connectionTimeout: 12000,
    greetingTimeout: 8000,
    socketTimeout: 15000,
  }
  if (cfg.seguranca === 'starttls') opts.requireTLS = true
  if (cfg.usuario) opts.auth = { user: cfg.usuario, pass: cfg.senha || '' }
  if (cfg.ignorarTLS) opts.tls = { rejectUnauthorized: false }
  return nodemailer.createTransport(opts)
}

export function fromHeader(cfg = {}) {
  const email = (cfg.remetenteEmail || cfg.usuario || '').trim()
  const nome = (cfg.remetenteNome || '').trim()
  return nome ? `"${nome.replace(/"/g, '')}" <${email}>` : email
}

function assertConfig(cfg) {
  if (!cfg || typeof cfg !== 'object') throw new Error('Configuração de e-mail ausente.')
  if (!cfg.host) throw new Error('Informe o servidor SMTP (host).')
  if (!cfg.remetenteEmail && !cfg.usuario) throw new Error('Informe o e-mail do remetente.')
}

// Testa a conexão/autenticação sem enviar mensagem.
export async function verifyConfig(cfg) {
  assertConfig(cfg)
  const transport = buildTransport(cfg)
  await transport.verify()
  return { ok: true }
}

// Envia uma mensagem de teste para o destinatário informado.
export async function sendTest(cfg, to) {
  assertConfig(cfg)
  if (!to || !/.+@.+\..+/.test(to)) throw new Error('Informe um destinatário válido para o teste.')
  const transport = buildTransport(cfg)
  const info = await transport.sendMail({
    from: fromHeader(cfg),
    to,
    replyTo: cfg.responderPara || undefined,
    subject: 'Teste de e-mail — Plataforma Cidade Imperial',
    text: 'Este é um e-mail de teste enviado pela Plataforma Cidade Imperial para validar a configuração de SMTP. Se você recebeu esta mensagem, o envio está funcionando.',
    html:
      '<div style="font-family:Arial,sans-serif;color:#272525;line-height:1.5">' +
      '<h2 style="color:#B38335;margin:0 0 8px">Cidade Imperial</h2>' +
      '<p>Este é um <b>e-mail de teste</b> enviado pela Plataforma Cidade Imperial para validar a configuração de SMTP.</p>' +
      '<p>Se você recebeu esta mensagem, o envio de e-mails está funcionando. ✅</p>' +
      '</div>',
  })
  return { ok: true, messageId: info.messageId, accepted: info.accepted, rejected: info.rejected }
}

// Envia um e-mail de notificação (template por caso de uso) a um ou mais
// destinatários. Só envia se a configuração estiver ativa. Cada destinatário
// recebe uma mensagem individual (sem expor os demais).
export async function sendNotify(cfg, evento, to, vars) {
  if (!cfg || !cfg.ativo) return { ok: true, skipped: 'envio de e-mail desativado' }
  assertConfig(cfg)
  const destinatarios = (Array.isArray(to) ? to : [to]).map((x) => String(x || '').trim()).filter((x) => /.+@.+\..+/.test(x))
  if (!destinatarios.length) return { ok: true, skipped: 'sem destinatários válidos' }
  const { subject, html } = renderTemplate(evento, vars || {})
  const transport = buildTransport(cfg)
  const from = fromHeader(cfg)
  const replyTo = cfg.responderPara || undefined
  const results = []
  for (const dest of destinatarios) {
    try {
      const info = await transport.sendMail({ from, to: dest, replyTo, subject, html })
      results.push({ to: dest, ok: true, messageId: info.messageId })
    } catch (err) {
      results.push({ to: dest, ok: false, error: err.message || String(err) })
    }
  }
  return { ok: results.every((r) => r.ok), evento, results }
}
