// Evidências da cotação com quantidade maior que a do pedido da revenda.
// Percorre o fluxo real: a Loja recebe o pedido, cota um lote maior, e a
// evidência mostra que o pedido da revenda não muda, o que o fornecedor
// enxerga e o que fica registrado.
// Requer a aplicação no ar em http://localhost:3344 com base limpa.
import { chromium } from 'playwright'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const OUT = resolve(here, '../evidencias/qtd-cotacao')
mkdirSync(OUT, { recursive: true })
const B = 'http://localhost:3344'
const log = []
const GOLD = '#B38335', DARK = '#272525', VERDE = '#2f6b39'

const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true })
const ctx = await br.newContext({ viewport: { width: 1460, height: 1080 }, deviceScaleFactor: 1.5 })
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
const campos = () => pg.locator('input[maxlength="5"][inputmode="numeric"]')
const cartaoItem = (n) => pg.locator('div[style*="border-radius: 9px"]')
  .filter({ hasText: /Quantidade (a cotar|neste caminho)/ }).nth(n)

try {
  await entrar('Loja (Ana Ribeiro)')

  // ── Recebe o pedido e abre a janela de cotação ──────────────────────────
  await ir('Pedidos')
  await pg.getByText('Receber', { exact: true }).first().click(); await pg.waitForTimeout(2600)
  await pg.locator('tr', { hasText: 'Pedido recebido' }).first().click(); await pg.waitForTimeout(1700)
  const pedId = (await pg.locator('body').innerText()).match(/PED-\d+/)[0]
  const st0 = await estado()
  const ped0 = st0.pedidos.find((p) => p.id === pedId)
  const qA = ped0.itens[0].qtd, qB = ped0.itens[1] ? ped0.itens[1].qtd : null
  const totalPed0 = ped0.total

  await pg.getByText('Abrir cotação…', { exact: false }).first().click(); await pg.waitForTimeout(1400)
  await recorte(janela(), '01-janela-quantidade-do-pedido')
  await recorte(cartaoItem(0), '02-item-na-quantidade-pedida')

  // ── Cota um lote maior ─────────────────────────────────────────────────
  const NOVA_A = 12, NOVA_B = 40
  await campos().nth(0).fill(String(NOVA_A)); await pg.waitForTimeout(700)
  await recorte(cartaoItem(0), '03-item-acima-do-pedido')
  if (qB != null) { await campos().nth(1).fill(String(NOVA_B)); await pg.waitForTimeout(800) }
  await recorte(janela(), '04-janela-com-lote-maior')
  await recorte(pg.getByText(/Total estimado da cotação/).locator('xpath=../..'), '05-total-com-excedente')

  // ── O teto continua valendo no envio direto ────────────────────────────
  await pg.getByText('Cancelar', { exact: true }).click(); await pg.waitForTimeout(1000)
  await pg.getByText('Envio direto a um fornecedor…', { exact: false }).first().click(); await pg.waitForTimeout(1400)
  await campos().nth(0).fill(String(NOVA_A)); await pg.waitForTimeout(800)
  await recorte(cartaoItem(0), '06-envio-direto-continua-limitado')
  await pg.getByText('Cancelar', { exact: true }).click(); await pg.waitForTimeout(1000)

  // ── Abre a cotação de verdade ──────────────────────────────────────────
  await pg.getByText('Abrir cotação…', { exact: false }).first().click(); await pg.waitForTimeout(1400)
  await campos().nth(0).fill(String(NOVA_A)); await pg.waitForTimeout(500)
  if (qB != null) { await campos().nth(1).fill(String(NOVA_B)); await pg.waitForTimeout(500) }
  await pg.getByText('Distribuidora Serra Verde', { exact: true }).last().click(); await pg.waitForTimeout(500)
  await pg.getByText('Atacadão Fluminense', { exact: true }).last().click(); await pg.waitForTimeout(500)
  await pg.getByPlaceholder('dd/mm/aaaa').last().fill('30/09/2026'); await pg.waitForTimeout(400)
  await pg.getByText('Abrir cotação e notificar', { exact: true }).click(); await pg.waitForTimeout(2800)

  const st1 = await estado()
  const cot = st1.cotacoes[0]
  const ped1 = st1.pedidos.find((p) => p.id === pedId)

  // ── Loja · detalhe da cotação ──────────────────────────────────────────
  await ir('Cotações')
  await pg.locator('tr', { hasText: cot.id }).first().click(); await pg.waitForTimeout(1700)
  await shot('07-detalhe-cotacao')
  await recorte(pg.getByText(/Demanda cotada:/).locator('xpath=..'), '08-demanda-cotada')

  // ── O pedido da revenda continua igual ─────────────────────────────────
  await ir('Pedidos')
  await pg.locator('tr', { hasText: pedId }).first().locator('td').first().click(); await pg.waitForTimeout(1700)
  await shot('09-pedido-inalterado')
  await recorte(pg.getByText('Itens do pedido', { exact: true }).locator('xpath=..'), '10-itens-do-pedido')
  await recorte(pg.getByText('Trilha do pedido — data, hora e usuário', { exact: true }).locator('xpath=..'), '11-trilha')

  // ── Fornecedor · o que ele enxerga ─────────────────────────────────────
  await entrar('Fornecedor (Serra Verde)')
  await ir('Cotações convidadas')
  await recorte(pg.locator('div[style*="border-radius: 12px"]').filter({ hasText: cot.id }).first(), '12-cartao-fornecedor')
  await pg.getByText(/^Enviar proposta…$/).first().click(); await pg.waitForTimeout(1600)
  await recorte(pg.locator('div[style*="width: 460px"]').first(), '13-proposta-fornecedor')

  // ── Auditoria ──────────────────────────────────────────────────────────
  await entrar('Loja (Ana Ribeiro)')
  await ir('Segurança & Auditoria'); await pg.waitForTimeout(900)
  await shot('14-auditoria')

  // ── Quadro da regra ────────────────────────────────────────────────────
  const via = (tit, sub, cor, bg, itens) => `
    <div style="flex:1;background:${bg};border:1px solid ${cor}44;border-radius:13px;padding:14px 17px">
      <div style="font-size:14px;font-weight:700;color:${cor};margin-bottom:3px">${tit}</div>
      <div style="font-size:11.5px;color:#8a8378;margin-bottom:8px">${sub}</div>
      ${itens.map((i) => `<div style="display:flex;gap:8px;font-size:12px;color:#4a453d;line-height:1.55;padding:3px 0"><span style="color:${cor};flex:none">▸</span><span>${i}</span></div>`).join('')}
    </div>`
  const quadro = `<div style="width:1400px;background:#f7f4ee;font-family:-apple-system,Segoe UI,Roboto,sans-serif;padding:28px 30px;box-sizing:border-box">
      <div style="font-size:20px;font-weight:700;color:${DARK};margin-bottom:3px">Cotar mais do que a revenda pediu — sem mexer no pedido dela</div>
      <div style="font-size:13px;color:#8a8378;margin-bottom:18px">O excedente é volume de negociação: o fornecedor precifica o lote maior, e a revenda continua sendo faturada pelo que pediu.</div>
      <div style="display:flex;gap:14px;align-items:stretch">
        ${via('Na cotação · sem teto', 'Janela "Abrir cotação"', GOLD, '#faf3e4', [
          'A quantidade pode ser <b>menor ou maior</b> que a pedida',
          'Acima do pedido, o item fica âmbar com o excedente declarado',
          'O total estimado soma o volume maior',
          'Os fornecedores cotam a quantidade que a Loja digitou'])}
        ${via('No envio direto e no estoque · com teto', 'Janelas "Envio direto" e "Atender com estoque"', '#a33a2b', '#fbeae7', [
          'O limite continua sendo a quantidade do pedido',
          'Acima disso o campo fica vermelho e a operação é recusada',
          'Faz sentido: não se entrega o que não foi pedido',
          'Menos que o pedido continua valendo — o saldo fica aprovado'])}
      </div>
      <div style="margin-top:14px;background:#fff;border:1px solid ${VERDE}44;border-left:3px solid ${VERDE};border-radius:11px;padding:13px 17px;font-size:12.5px;color:#4a453d;line-height:1.6">
        <b style="color:${VERDE}">O que NÃO muda:</b> a quantidade dos itens do pedido da revenda, o valor do pedido e o que ela vai pagar. A cotação guarda as duas quantidades — a cotada e a pedida — e a diferença aparece no detalhe da cotação, para o fornecedor e na trilha do pedido.
      </div></div>`
  const p3 = await ctx.newPage(); await p3.setViewportSize({ width: 1400, height: 480 })
  await p3.setContent(quadro); await p3.waitForTimeout(300)
  await p3.locator('div').first().screenshot({ path: join(OUT, '00-regra.png') })
  log.push('00-regra'); await p3.close()

  const itA = (cot.itens || [])[0] || {}
  writeFileSync(join(OUT, 'dados.json'), JSON.stringify({
    pedido: pedId, cotacao: cot.id,
    itemQtdPedido: qA, itemQtdCotada: NOVA_A,
    item2QtdPedido: qB, item2QtdCotada: qB != null ? NOVA_B : null,
    excedente: (NOVA_A - qA) + (qB != null ? NOVA_B - qB : 0),
    guardaQtdPedido: itA.qtdPedido != null,
    totalPedidoAntes: totalPed0, totalPedidoDepois: ped1.total,
  }, null, 2))
} catch (e) { log.push('ERRO: ' + e.message) }

console.log(log.join('\n'))
await br.close()
