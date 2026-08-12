// Evidências da confirmação de recebimento do material (10ª etapa do pedido).
// Percorre o fluxo pelos dois lados: a revenda confirma um pedido e a Loja
// confirma outro em nome da revenda. Captura também o e-mail de aviso, a
// trilha do pedido e a auditoria.
// Requer a aplicação no ar em http://localhost:3344 com base limpa.
import { chromium } from 'playwright'
import { renderTemplate } from '../../server/src/email-templates.js'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const OUT = resolve(here, '../evidencias/recebimento-material')
mkdirSync(OUT, { recursive: true })
const B = 'http://localhost:3344'
const log = []
const GOLD = '#B38335', DARK = '#272525', VERDE = '#2f6b39'
const OBS = 'Material conferido item a item, sem avarias. Recebido por João no depósito às 9h40.'

const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true })
const ctx = await br.newContext({ viewport: { width: 1460, height: 1040 }, deviceScaleFactor: 1.5 })
const pg = await ctx.newPage()

const shot = async (n) => { await pg.screenshot({ path: join(OUT, n + '.png') }); log.push(n) }
const recorte = async (loc, n) => { await loc.screenshot({ path: join(OUT, n + '.png') }); log.push(n) }
const entrar = async (rot) => {
  await pg.goto(B, { waitUntil: 'networkidle' }); await pg.waitForTimeout(1500)
  await pg.getByText(rot, { exact: true }).click(); await pg.waitForTimeout(300)
  await pg.getByText('Entrar na plataforma', { exact: true }).click(); await pg.waitForTimeout(2300)
}
const ir = async (t) => { await pg.getByText(t, { exact: true }).first().click(); await pg.waitForTimeout(1400) }
const estado = async () => (await (await fetch(B + '/api/state')).json())
const janela = () => pg.locator('div[style*="width: 480px"]').first()
// A régua de 10 etapas rola dentro do cartão: captura o trecho final, onde
// estão justamente as duas etapas novas.
const reguaFim = async (nome) => {
  const r = pg.locator('div[style*="overflow-x: auto"]').first()
  await r.evaluate((el) => { el.scrollLeft = el.scrollWidth })
  await pg.waitForTimeout(500)
  await r.screenshot({ path: join(OUT, nome + '.png') }); log.push(nome)
}
const linha = (ped) => pg.locator('tr', { hasText: ped }).first()

try {
  // SMTP ligado para o aviso sair de verdade
  const st = await (await fetch(B + '/api/state')).json()
  st.configEmail = { host: '127.0.0.1', porta: '2526', seguranca: 'nenhuma', usuario: '', senha: '',
    remetenteNome: 'Cidade Imperial', remetenteEmail: 'plataforma@cidadeimperial.com.br',
    responderPara: '', emailLoja: 'ana@cidadeimperial.com.br', ativo: true }
  await fetch(B + '/api/state', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(st) })

  const st0 = await estado()
  const fats = st0.pedidos.filter((p) => p.itens.some((i) => i.st === 'faturado'))
  const pedA = fats[0].id, pedB = fats[1] ? fats[1].id : null
  const revA = (st0.revendas.find((r) => r.id === fats[0].revendaId) || {}).nome || ''

  // ══ Loja · o pedido faturado para na etapa 9 ════════════════════════════
  await entrar('Loja (Ana Ribeiro)')
  await ir('Pedidos')
  await shot('01-lista-loja-etapa9')
  await recorte(linha(pedA), '02-linha-aguardando')

  await linha(pedA).locator('td').first().click(); await pg.waitForTimeout(1700)
  await shot('03-detalhe-aguardando')
  await reguaFim('04-regua-etapa9')
  await recorte(pg.getByText('Aguardando confirmação de recebimento', { exact: true }).locator('xpath=..'), '05-painel-aguardando')

  // ══ Revenda · confirma o recebimento ════════════════════════════════════
  await entrar('Revenda (Bar do Imperador)')
  await ir('Meus pedidos')
  await shot('06-lista-revenda-botao')

  await linha(pedA).getByText('Confirmar recebimento…', { exact: false }).click(); await pg.waitForTimeout(1400)
  await recorte(janela(), '07-janela-revenda')
  await pg.locator('textarea').last().fill(OBS); await pg.waitForTimeout(600)
  await recorte(janela(), '08-janela-preenchida')
  await pg.getByText('Confirmar recebimento', { exact: true }).click(); await pg.waitForTimeout(2600)
  await shot('09-revenda-confirmado')
  await recorte(linha(pedA), '10-linha-com-selo')

  // ══ O aviso que chega para a Loja ═══════════════════════════════════════
  const stA = await estado()
  const pA = stA.pedidos.find((p) => p.id === pedA)
  const email = renderTemplate('pedido_recebido', {
    pedidoId: pedA, revendaNome: revA, por: pA.recebimento.por, quando: pA.recebimento.quando,
    origem: 'a revenda ' + revA, observacao: OBS,
    itensLista: pA.itens.filter((i) => i.st !== 'rejeitado').map((i) => {
      const pr = stA.produtos.find((x) => x.id === i.produtoId) || {}
      return { codigo: pr.codigo || '', descricao: pr.descricao || '', qtd: i.qtd, unidade: pr.unidade || '',
        valor: 'R$ ' + Number(i.precoNeg != null ? i.precoNeg : i.qtd * i.preco).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) }
    }),
  })
  const ctxMail = await br.newContext({ viewport: { width: 660, height: 200 }, deviceScaleFactor: 2 })
  const pe = await ctxMail.newPage()
  await pe.setContent(email.html); await pe.waitForTimeout(250)
  await pe.screenshot({ path: join(OUT, '11-email-aviso.png'), fullPage: true }); log.push('11-email-aviso')
  writeFileSync(join(OUT, '11-email-aviso.html'), email.html)
  await pe.close(); await ctxMail.close()

  // ══ Loja · confirma outro pedido em nome da revenda ═════════════════════
  await entrar('Loja (Ana Ribeiro)')
  await ir('Pedidos')
  if (pedB) {
    await linha(pedB).getByText('Confirmar recebimento…', { exact: false }).click(); await pg.waitForTimeout(1400)
    await recorte(janela(), '12-janela-loja')
    await pg.getByText('Confirmar recebimento', { exact: true }).click(); await pg.waitForTimeout(2600)
  }

  // ══ Detalhe concluído: painel verde, linha do tempo e trilha ════════════
  await linha(pedA).locator('td').first().click(); await pg.waitForTimeout(1700)
  await shot('13-detalhe-concluido')
  await reguaFim('14-regua-etapa10')
  await recorte(pg.getByText('✓ Material recebido', { exact: true }).locator('xpath=..'), '15-painel-recebido')
  await recorte(pg.getByText('Trilha do pedido — data, hora e usuário', { exact: true }).locator('xpath=..'), '16-trilha')

  // ══ Auditoria ═══════════════════════════════════════════════════════════
  await ir('Segurança & Auditoria'); await pg.waitForTimeout(900)
  await shot('17-auditoria')

  // ══ Permissão nova ══════════════════════════════════════════════════════
  await entrar('Administrador Técnico')
  await ir('Usuários e permissões')
  await pg.locator('tr', { hasText: 'Carlos Mota' }).first().getByText(/padrão do perfil|personalizada/).first().click()
  await pg.waitForTimeout(1500)
  await recorte(pg.getByText('Confirmar recebimento do material (entrega)', { exact: true }).locator('xpath=../../..'), '18-permissao')

  // ── Quadro de abertura: as duas etapas novas ────────────────────────────
  const etapa = (n, tit, sub, cor, bg) => `
    <div style="flex:1;background:${bg};border:1px solid ${cor}44;border-radius:13px;padding:14px 17px">
      <div style="display:flex;align-items:baseline;gap:9px;margin-bottom:4px">
        <span style="font-family:Consolas,monospace;font-size:12px;font-weight:800;color:#fff;background:${cor};border-radius:7px;padding:2px 9px">${n}</span>
        <span style="font-size:14px;font-weight:700;color:${DARK}">${tit}</span>
      </div>
      <div style="font-size:12px;color:#4a453d;line-height:1.55">${sub}</div>
    </div>`
  const quadro = `<div style="width:1400px;background:#f7f4ee;font-family:-apple-system,Segoe UI,Roboto,sans-serif;padding:28px 30px;box-sizing:border-box">
      <div style="font-size:20px;font-weight:700;color:${DARK};margin-bottom:3px">O pedido não conclui sozinho depois de faturado</div>
      <div style="font-size:13px;color:#8a8378;margin-bottom:18px">O workflow passa de 9 para 10 etapas: entre o faturamento e a conclusão entra a confirmação de que o material chegou.</div>
      <div style="display:flex;gap:14px;align-items:stretch">
        ${etapa('8', 'Faturamento', 'O fornecedor emite a nota e anexa os documentos na plataforma.', '#8a8378', '#fff')}
        ${etapa('9', 'Entrega — aguardando confirmação', 'Material entregue (faturado ou atendido pelo estoque da Loja). O pedido <b>para aqui</b> até alguém confirmar o recebimento.', GOLD, '#faf3e4')}
        ${etapa('10', 'Conclusão', 'Alcançada somente com a confirmação. O ciclo se encerra com data, hora, autor e observação registrados.', VERDE, '#eef5ef')}
      </div>
      <div style="display:flex;gap:14px;margin-top:14px">
        <div style="flex:1;background:#fff;border:1px solid #ddd0ee;border-radius:13px;padding:14px 17px">
          <div style="font-size:13.5px;font-weight:700;color:#5d3f96;margin-bottom:5px">Quem confirma · a revenda</div>
          <div style="font-size:12px;color:#4a453d;line-height:1.6">Em “Meus pedidos”, botão verde na linha do pedido. É quem recebeu o material e confere o que chegou.</div>
        </div>
        <div style="flex:1;background:#fff;border:1px solid #e6cf9e;border-radius:13px;padding:14px 17px">
          <div style="font-size:13.5px;font-weight:700;color:#8f682a;margin-bottom:5px">Quem confirma · a Loja Cidade Imperial</div>
          <div style="font-size:12px;color:#4a453d;line-height:1.6">Na lista de Pedidos ou no detalhe, quando a Loja faz a conferência em nome da revenda — e fica registrado que foi ela.</div>
        </div>
      </div>
      <div style="margin-top:14px;background:#fff;border:1px solid #eae3d6;border-radius:11px;padding:13px 17px;font-size:12.5px;color:#4a453d;line-height:1.6">
        <b style="color:${VERDE}">Em qualquer um dos dois casos:</b> a observação (avarias, divergências, quem recebeu) é opcional e fica guardada; o outro lado é avisado por e-mail; a confirmação entra na trilha do pedido e na auditoria com data, hora e autor.
      </div></div>`
  const p3 = await ctx.newPage(); await p3.setViewportSize({ width: 1400, height: 560 })
  await p3.setContent(quadro); await p3.waitForTimeout(300)
  await p3.locator('div').first().screenshot({ path: join(OUT, '00-etapas.png') })
  log.push('00-etapas'); await p3.close()

  writeFileSync(join(OUT, 'dados.json'), JSON.stringify({
    pedidoRevenda: pedA, pedidoLoja: pedB, revenda: revA, obs: OBS,
    confirmadoPor: pA.recebimento.por, quando: pA.recebimento.quando, assunto: email.subject,
  }, null, 2))
} catch (e) { log.push('ERRO: ' + e.message) }

console.log(log.join('\n'))
await br.close()
