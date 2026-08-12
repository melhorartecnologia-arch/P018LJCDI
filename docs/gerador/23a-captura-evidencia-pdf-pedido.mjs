// Evidências do documento do pedido em PDF, gerado pela lista da Loja e pela
// lista da revenda. Percorre o fluxo real: a Loja conversa no pedido, a revenda
// confirma o recebimento, e então o documento é emitido pelos dois lados — com
// recorte de cada bloco impresso.
// Requer a aplicação no ar em http://localhost:3344 com base limpa.
import { chromium } from 'playwright'
import { mkdirSync, writeFileSync, statSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const OUT = resolve(here, '../evidencias/pdf-pedido')
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

// abre o documento pelo botão da linha e devolve a aba
const abrirDoc = async (ped) => {
  const [pop] = await Promise.all([
    ctx.waitForEvent('page'),
    pg.locator('tr', { hasText: ped }).first().getByText('PDF', { exact: false }).first().click(),
  ])
  await pop.waitForLoadState('load'); await pop.waitForTimeout(1200)
  return pop
}
const fechar = async () => { await pg.getByTitle('Fechar').last().click(); await pg.waitForTimeout(900) }
const bloco = (doc, tit) => doc.locator('section.bl').filter({ hasText: tit }).first()

const PED = 'PED-0040'   // faturado, com cotação COT-007 e NF-1204
const PEND = 'PED-0044'  // pendente, para mostrar o documento enxuto
const dados = { pedido: PED, pendente: PEND }

try {
  // ── A Loja abre a conversa do pedido ────────────────────────────────────
  await entrar('Loja (Ana Ribeiro)')
  await ir('Pedidos')
  await pg.locator('tr', { hasText: PED }).first().getByText('💬', { exact: false }).first().click()
  await pg.waitForTimeout(1300)
  await pg.locator('textarea').first().fill('Boa tarde! A NF-1204 saiu hoje pelo Atacadão Fluminense. Assim que o material chegar, confirme o recebimento pela plataforma.')
  await pg.getByText('Enviar', { exact: true }).first().click(); await pg.waitForTimeout(2200)
  await fechar()

  // ── A revenda responde e confirma o recebimento ─────────────────────────
  await entrar('Revenda (Bar do Imperador)')
  await ir('Meus pedidos')
  await pg.locator('tr', { hasText: PED }).first().getByText('💬', { exact: false }).first().click()
  await pg.waitForTimeout(1300)
  await pg.locator('textarea').first().fill('Combinado, obrigado! Já registramos a entrada da nota no nosso financeiro.')
  await pg.getByText('Enviar', { exact: true }).first().click(); await pg.waitForTimeout(2200)
  await fechar()

  await pg.locator('tr', { hasText: PED }).first().getByText('Confirmar recebimento', { exact: false }).first().click()
  await pg.waitForTimeout(1300)
  const obs = pg.locator('textarea').first()
  await obs.fill('Material conferido na chegada, sem avarias. Volumes batendo com a NF-1204.')
  await pg.waitForTimeout(300)
  await pg.getByText('Confirmar recebimento', { exact: true }).click()
  await pg.waitForTimeout(2600)

  // ── Loja · o botão na lista de pedidos ──────────────────────────────────
  await entrar('Loja (Ana Ribeiro)')
  await ir('Pedidos')
  await shot('01-lista-da-loja')
  await recorte(pg.locator('tr', { hasText: PED }).first(), '02-botao-na-linha')

  // ── O documento, bloco a bloco ──────────────────────────────────────────
  const doc = await abrirDoc(PED)
  await recorte(doc.locator('.cab').first(), '03-cabecalho-do-documento')
  await recorte(bloco(doc, 'Partes e destino'), '04-partes-e-destino')
  await recorte(bloco(doc, 'Situação, prazos e datas'), '05-situacao-prazos-e-datas')
  await recorte(bloco(doc, 'Condições comerciais'), '06-condicoes-comerciais')
  await recorte(bloco(doc, 'Itens do pedido'), '07-itens-com-foto-e-ficha')
  await recorte(bloco(doc, 'Cotação vinculada'), '09-cotacao-com-o-comparativo')
  await recorte(bloco(doc, 'Faturamento e documentos'), '10-faturamento-e-notas')
  await recorte(bloco(doc, 'Conversa do pedido'), '11-conversa-do-pedido')
  await recorte(bloco(doc, 'Trilha completa'), '12-trilha-completa')

  const arqL = join(OUT, 'documento-loja.pdf')
  await doc.pdf({ path: arqL, format: 'A4', printBackground: true })
  dados.pdfLojaKB = Math.round(statSync(arqL).size / 1024)
  dados.blocos = await doc.locator('section.bl').count()
  dados.lojaVeComparativo = await bloco(doc, 'Cotação vinculada').locator('table.dt').count() > 0
  dados.fotos = await doc.evaluate(() =>
    Array.from(document.querySelectorAll('.itens img')).filter((i) => i.complete && i.naturalWidth > 0).length)
  dados.linhasDoc = (await doc.locator('body').innerText()).split('\n').filter((l) => l.trim()).length
  await doc.close()

  // ── O mesmo documento a partir do detalhe do pedido ─────────────────────
  await pg.locator('tr', { hasText: PED }).first().locator('td').first().click(); await pg.waitForTimeout(1700)
  await recorte(pg.getByText('Documento do pedido (PDF)', { exact: false }).first().locator('xpath=..'), '08-botao-no-detalhe')
  await ir('Pedidos')

  // ── Pedido ainda pendente: o documento sai enxuto ───────────────────────
  const docP = await abrirDoc(PEND)
  dados.blocosPendente = await docP.locator('section.bl').count()
  await recorte(docP.locator('body'), '13-pedido-pendente-enxuto')
  await docP.close()

  // ── Auditoria ───────────────────────────────────────────────────────────
  await ir('Segurança & Auditoria'); await pg.waitForTimeout(900)
  await shot('14-auditoria')

  // ── Revenda · o mesmo documento, com a regra de visibilidade ────────────
  await entrar('Revenda (Bar do Imperador)')
  await ir('Meus pedidos')
  await shot('15-lista-da-revenda')

  const docR = await abrirDoc(PED)
  await recorte(docR.locator('.cab').first(), '16-documento-da-revenda')
  await recorte(bloco(docR, 'Cotação vinculada'), '17-cotacao-sem-o-comparativo')
  dados.blocosRevenda = await docR.locator('section.bl').count()
  dados.revendaVeComparativo = await bloco(docR, 'Cotação vinculada').locator('table.dt').count() > 0
  dados.revendaVeContagemDePropostas = /Propostas recebidas/.test(await docR.locator('body').innerText())
  const arqR = join(OUT, 'documento-revenda.pdf')
  await docR.pdf({ path: arqR, format: 'A4', printBackground: true })
  dados.pdfRevendaKB = Math.round(statSync(arqR).size / 1024)
  await docR.close()

  // pedido ainda não negociado com a revenda: valores saem como "a definir"
  const st = await estado()
  const rev = st.revendas.find((r) => r.nome.includes('Imperador'))
  const semNeg = st.pedidos.find((p) => p.revendaId === rev.id
    && p.itens.some((i) => i.precoNeg == null && i.st !== 'faturado'))
  if (semNeg) {
    const docN = await abrirDoc(semNeg.id)
    await recorte(bloco(docN, 'Itens do pedido'), '18-valor-a-definir-para-a-revenda')
    dados.pedidoSemNegociacao = semNeg.id
    await docN.close()
  }

  // ── Quadro da regra ─────────────────────────────────────────────────────
  const col = (tit, sub, cor, bg, itens) => `
    <div style="flex:1;background:${bg};border:1px solid ${cor}44;border-radius:13px;padding:14px 17px">
      <div style="font-size:14px;font-weight:700;color:${cor};margin-bottom:3px">${tit}</div>
      <div style="font-size:11.5px;color:#8a8378;margin-bottom:8px">${sub}</div>
      ${itens.map((i) => `<div style="display:flex;gap:8px;font-size:12px;color:#4a453d;line-height:1.55;padding:3px 0"><span style="color:${cor};flex:none">▸</span><span>${i}</span></div>`).join('')}
    </div>`
  const quadro = `<div style="width:1400px;background:#f7f4ee;font-family:-apple-system,Segoe UI,Roboto,sans-serif;padding:28px 30px;box-sizing:border-box">
      <div style="font-size:20px;font-weight:700;color:${DARK};margin-bottom:3px">Um clique na lista de pedidos, o pedido inteiro em um documento</div>
      <div style="font-size:13px;color:#8a8378;margin-bottom:18px">O mesmo documento nas duas visões, montado na hora com a situação atual do pedido — e com uma regra de visibilidade que protege o que ainda não foi negociado.</div>
      <div style="display:flex;gap:14px;align-items:stretch">
        ${col('Visão da Loja', 'Lista de pedidos e detalhe do pedido', GOLD, '#faf3e4', [
          'Botão <b>📄 PDF</b> em cada linha e no detalhe do pedido',
          'Traz o comparativo das propostas recebidas na cotação',
          'Mostra todos os preços, negociados ou de referência',
          'Serve de ficha para o fornecedor, o financeiro e a auditoria'])}
        ${col('Visão da revenda', 'Tela "Meus pedidos"', '#5b4a86', '#f2effa', [
          'Mesmo botão <b>📄 PDF</b>, mesmo documento',
          'Sem o comparativo de propostas entre fornecedores',
          'Item ainda não negociado sai como <b>"a definir"</b>',
          'Serve de comprovante do pedido e da entrega'])}
      </div>
      <div style="margin-top:14px;background:#fff;border:1px solid ${VERDE}44;border-left:3px solid ${VERDE};border-radius:11px;padding:13px 17px;font-size:12.5px;color:#4a453d;line-height:1.6">
        <b style="color:${VERDE}">O documento acompanha a fase do pedido:</b> blocos sem informação não são impressos. Um pedido pendente sai com partes, itens e trilha; depois da cotação ganha as condições negociadas e as propostas; depois do faturamento, as notas, o boleto e a confirmação de recebimento. Nada fica guardado como arquivo — a cada clique o documento é montado com os dados do momento, e a emissão entra na auditoria.
      </div></div>`
  const p3 = await ctx.newPage(); await p3.setViewportSize({ width: 1400, height: 520 })
  await p3.setContent(quadro); await p3.waitForTimeout(300)
  await p3.locator('div').first().screenshot({ path: join(OUT, '00-regra.png') })
  log.push('00-regra'); await p3.close()

  const st2 = await estado()
  const pd = st2.pedidos.find((p) => p.id === PED)
  dados.cotacao = pd.cotacaoId
  dados.itens = pd.itens.length
  dados.totalPedido = pd.total
  dados.mensagens = (pd.conversa || []).length
  dados.recebidoEm = (pd.recebimento || {}).quando || null
  dados.nf = (st2.faturamentos.find((f) => f.pedidoId === PED) || {}).id || null
  writeFileSync(join(OUT, 'dados.json'), JSON.stringify(dados, null, 2))
} catch (e) { log.push('ERRO: ' + e.message) }

console.log(log.join('\n'))
await br.close()
