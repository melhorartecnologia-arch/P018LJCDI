// Evidências da conversa por pedido (revenda × Loja Cidade Imperial).
// Percorre o fluxo real nos dois sentidos: a revenda abre a conversa, a Loja
// recebe a não lida e responde, a revenda vê a resposta. Captura também o
// e-mail de aviso, a trilha do pedido e a auditoria.
// Requer a aplicação no ar em http://localhost:3344 com base limpa.
import { chromium } from 'playwright'
import { renderTemplate } from '../../server/src/email-templates.js'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const OUT = resolve(here, '../evidencias/chat-pedidos')
mkdirSync(OUT, { recursive: true })
const B = 'http://localhost:3344'
const log = []
const GOLD = '#B38335', DARK = '#272525', ROXO = '#5d3f96'

const MSG_REV = 'Bom dia! O item de 600 ml pode vir em caixa fechada? A entrega é no depósito dos fundos, das 8h às 11h.'
const MSG_LOJA = 'Bom dia! Sim, seguimos com caixa fechada e já anotamos a janela de entrega no pedido. Qualquer mudança, avisamos por aqui.'

const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true })
const ctx = await br.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1.5 })
const pg = await ctx.newPage()

const shot = async (n) => { await pg.screenshot({ path: join(OUT, n + '.png') }); log.push(n) }
const recorte = async (loc, n) => { await loc.screenshot({ path: join(OUT, n + '.png') }); log.push(n) }
const entrar = async (rot) => {
  await pg.goto(B, { waitUntil: 'networkidle' }); await pg.waitForTimeout(1500)
  await pg.getByText(rot, { exact: true }).click(); await pg.waitForTimeout(300)
  await pg.getByText('Entrar na plataforma', { exact: true }).click(); await pg.waitForTimeout(2300)
}
const ir = async (t) => { await pg.getByText(t, { exact: true }).first().click(); await pg.waitForTimeout(1300) }
const cela = (ped, ix) => pg.locator('tr', { hasText: ped }).first().locator('td').nth(ix).locator('div').first()
// a janela da conversa (o cartão branco dentro do overlay)
const janela = () => pg.locator('div[style*="width: 680px"]').first()
const escrever = async (txt) => {
  await pg.locator('textarea').last().fill(txt); await pg.waitForTimeout(300)
}
const enviar = async () => { await pg.getByText('Enviar', { exact: true }).click(); await pg.waitForTimeout(1400) }
const fechar = async () => { await pg.getByTitle('Fechar').last().click(); await pg.waitForTimeout(900) }
const menu = () => pg.locator('div[style*="width: 228px"]').first()

try {
  // ── SMTP ligado para o aviso sair de verdade ────────────────────────────
  const st = await (await fetch(B + '/api/state')).json()
  st.configEmail = { host: '127.0.0.1', porta: '2526', seguranca: 'nenhuma', usuario: '', senha: '',
    remetenteNome: 'Cidade Imperial', remetenteEmail: 'plataforma@cidadeimperial.com.br',
    responderPara: '', emailLoja: 'ana@cidadeimperial.com.br', ativo: true }
  await fetch(B + '/api/state', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(st) })

  // ══ Lado da revenda — abre a conversa ═══════════════════════════════════
  await entrar('Revenda (Bar do Imperador)')
  await ir('Meus pedidos')
  const ped = (await pg.locator('tbody tr').first().locator('td').first().innerText()).split('\n')[0].trim()
  await shot('01-lista-revenda')

  await cela(ped, 4).click(); await pg.waitForTimeout(1100)
  await recorte(janela(), '02-conversa-vazia')

  await escrever(MSG_REV)
  await recorte(janela(), '03-revenda-escrevendo')
  await enviar()
  await recorte(janela(), '04-mensagem-enviada')
  await fechar()
  await shot('05-lista-revenda-com-conversa')

  // ══ O aviso que chega para a Loja ═══════════════════════════════════════
  const email = renderTemplate('pedido_mensagem', {
    pedidoId: ped, revendaNome: 'Bar do Imperador', autor: 'Marina Duarte',
    origem: 'pela revenda Bar do Imperador', mensagem: MSG_REV,
    quando: new Date().toLocaleString('pt-BR'),
  })
  const ctxMail = await br.newContext({ viewport: { width: 660, height: 200 }, deviceScaleFactor: 2 })
  const pe = await ctxMail.newPage()
  await pe.setContent(email.html); await pe.waitForTimeout(250)
  await pe.screenshot({ path: join(OUT, '06-email-aviso.png'), fullPage: true }); log.push('06-email-aviso')
  writeFileSync(join(OUT, '06-email-aviso.html'), email.html)
  await pe.close(); await ctxMail.close()

  // ══ Lado da Loja — a não lida ═══════════════════════════════════════════
  await entrar('Loja (Ana Ribeiro)')
  await recorte(menu(), '07-menu-loja-nao-lidas')
  await ir('Pedidos')
  await shot('08-lista-loja-nova')
  await recorte(pg.locator('tr', { hasText: ped }).first(), '09-linha-com-nova')

  await cela(ped, 5).click(); await pg.waitForTimeout(1200)
  await recorte(janela(), '10-loja-lendo')
  await escrever(MSG_LOJA); await enviar()
  await recorte(janela(), '11-conversa-completa')
  await fechar()

  // ══ Detalhe do pedido: atalho e trilha ══════════════════════════════════
  await pg.locator('tr', { hasText: ped }).first().locator('td').first().click(); await pg.waitForTimeout(1600)
  await shot('12-detalhe-pedido')
  await recorte(pg.getByText('Trilha do pedido — data, hora e usuário', { exact: true }).locator('xpath=..'), '13-trilha-do-pedido')

  // ══ Auditoria ═══════════════════════════════════════════════════════════
  await ir('Segurança & Auditoria'); await pg.waitForTimeout(900)
  await shot('14-auditoria')

  // ══ Volta para a revenda: a resposta chega como não lida ════════════════
  await entrar('Revenda (Bar do Imperador)')
  await ir('Meus pedidos')
  await shot('15-revenda-resposta-nova')

  // ── Quadro de abertura: quem pode iniciar, e quando ─────────────────────
  const lado = (tit, sub, cor, itens) => `
    <div style="flex:1;background:#fff;border:1px solid ${cor};border-radius:13px;overflow:hidden">
      <div style="padding:14px 18px;border-bottom:1px solid #f1ece2;background:${cor === '#ddd0ee' ? '#f7f3fc' : '#faf7f0'}">
        <div style="font-size:14px;font-weight:700;color:${DARK}">${tit}</div>
        <div style="font-size:11.5px;color:#8a8378;margin-top:2px">${sub}</div>
      </div>
      <div style="padding:14px 18px">${itens.map((i) => `<div style="display:flex;gap:8px;font-size:12.5px;color:#4a453d;line-height:1.55;padding:4px 0"><span style="color:${GOLD};flex:none">▸</span><span>${i}</span></div>`).join('')}</div>
    </div>`
  const quadro = `<div style="width:1400px;background:#f7f4ee;font-family:-apple-system,Segoe UI,Roboto,sans-serif;padding:28px 30px;box-sizing:border-box">
      <div style="font-size:20px;font-weight:700;color:${DARK};margin-bottom:3px">Um canal por pedido — aberto pelos dois lados, em qualquer etapa</div>
      <div style="font-size:13px;color:#8a8378;margin-bottom:18px">A conversa nasce junto com o pedido e continua depois de faturado. Quem escreve primeiro é indiferente.</div>
      <div style="display:flex;gap:16px;align-items:stretch">
        ${lado('A revenda inicia', 'Meus pedidos · coluna Conversa', '#ddd0ee', [
          'Dúvidas sobre o item, a embalagem ou o prazo',
          'Ocorrências na entrega e no recebimento',
          'Observações que precisam ficar registradas no pedido',
          'A Loja recebe aviso por e-mail e vê o contador de não lidas'])}
        ${lado('A Loja inicia', 'Pedidos · coluna Conversa, ou pelo detalhe do pedido', '#eae3d6', [
          'Confirmação de ajustes combinados',
          'Pedido de informação antes de decidir o atendimento',
          'Aviso sobre cotação, faturamento ou entrega',
          'A revenda recebe aviso por e-mail e vê o contador de não lidas'])}
      </div>
      <div style="margin-top:16px;background:#fff;border:1px solid #eae3d6;border-radius:11px;padding:14px 18px;font-size:12.5px;color:#4a453d;line-height:1.6">
        <b style="color:${ROXO}">Em ambos os sentidos:</b> a mensagem fica guardada dentro do pedido, o outro lado é avisado por e-mail com o texto e o número do pedido, a auditoria registra o sentido do envio e a abertura da conversa entra na trilha do pedido.
      </div></div>`
  const p3 = await ctx.newPage(); await p3.setViewportSize({ width: 1400, height: 520 })
  await p3.setContent(quadro); await p3.waitForTimeout(300)
  await p3.locator('div').first().screenshot({ path: join(OUT, '00-dois-lados.png') })
  log.push('00-dois-lados'); await p3.close()

  writeFileSync(join(OUT, 'dados.json'), JSON.stringify({ pedido: ped, msgRevenda: MSG_REV, msgLoja: MSG_LOJA, assunto: email.subject }, null, 2))
} catch (e) { log.push('ERRO: ' + e.message) }

console.log(log.join('\n'))
await br.close()
