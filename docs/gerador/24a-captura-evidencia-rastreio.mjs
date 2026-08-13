// Evidências do rastreio da entrega. Percorre o fluxo real: a Loja encaminha
// o pedido a um fornecedor, a plataforma cobra o rastreio, o faturamento é
// recusado sem ele, o fornecedor informa a transportadora no padrão dela e a
// Loja e a revenda passam a acompanhar a entrega.
// Requer a aplicação no ar em http://localhost:3344 com base limpa e o SMTP
// de teste na porta 2526.
import { chromium } from 'playwright'
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { renderTemplate } from '../../server/src/email-templates.js'

const here = dirname(fileURLToPath(import.meta.url))
const OUT = resolve(here, '../evidencias/rastreio')
mkdirSync(OUT, { recursive: true })
const B = 'http://localhost:3344'
const log = []
const GOLD = '#B38335', DARK = '#272525', VERDE = '#2f6b39', VERM = '#a33a2b'

const COD = 'AB123456789BR'
const COD2 = 'ZZ987654321BR'
const PREV = '30/09/2026'
const OBS = '2 volumes; entrega das 8h às 12h, falar com a expedição.'

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
const linha = (ped) => pg.locator('tr', { hasText: ped }).first()
const janela = () => pg.locator('div[style*="width: 500px"]').first()
const janelaFat = () => pg.locator('div[style*="width: 420px"]').first()

const arqNf = join(OUT, 'nota-de-apoio.pdf')
writeFileSync(arqNf, '%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n')

try {
  // SMTP ligado; a análise fiscal por IA fica de fora (o anexo aqui é de apoio)
  const st = await (await fetch(B + '/api/state')).json()
  st.configEmail = { host: '127.0.0.1', porta: '2526', seguranca: 'nenhuma', usuario: '', senha: '',
    remetenteNome: 'Cidade Imperial', remetenteEmail: 'plataforma@cidadeimperial.com.br',
    responderPara: '', emailLoja: 'ana@cidadeimperial.com.br', ativo: true }
  st.configPlataforma = { ...(st.configPlataforma || {}), analiseFiscalIA: false }
  await fetch(B + '/api/state', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(st) })

  const st0 = await estado()
  const forn = st0.fornecedores.find((f) => /Serra Verde/.test(f.nome))
  const PED = st0.pedidos.find((p) => p.status === 'pendente' && p.itens.length > 1).id
  const rev = st0.revendas.find((r) => r.id === st0.pedidos.find((p) => p.id === PED).revendaId)

  // ── A Loja recebe e encaminha ao fornecedor ─────────────────────────────
  await entrar('Loja (Ana Ribeiro)')
  await ir('Pedidos')
  await linha(PED).getByText('Receber', { exact: true }).click(); await pg.waitForTimeout(2500)
  await linha(PED).locator('td').first().click(); await pg.waitForTimeout(1700)
  await pg.getByText('Envio direto a um fornecedor…', { exact: false }).first().click(); await pg.waitForTimeout(1300)
  await pg.getByText(forn.nome, { exact: true }).last().click(); await pg.waitForTimeout(500)
  await pg.getByText('Encaminhar itens selecionados', { exact: true }).click(); await pg.waitForTimeout(2700)

  // ── A Loja cobra o rastreio ─────────────────────────────────────────────
  await ir('Pedidos')
  await recorte(linha(PED), '01-linha-rastreio-pendente')
  await linha(PED).locator('td').first().click(); await pg.waitForTimeout(1700)
  await recorte(pg.getByText('Aguardando o rastreio do fornecedor', { exact: false }).first().locator('xpath=../..'),
    '02-detalhe-cobra-rastreio')
  await ir('Pedidos')

  // ── Fornecedor · o card e o faturamento travado ─────────────────────────
  await entrar('Fornecedor (Serra Verde)')
  await ir('Pedidos recebidos')
  const card = () => pg.locator('div[style*="border-radius: 12px"]').filter({ hasText: PED }).first()
  await recorte(card(), '03-card-do-fornecedor')

  await card().getByText('Registrar faturamento…', { exact: false }).click(); await pg.waitForTimeout(1500)
  await pg.locator('input[accept=".pdf,.xml"]').setInputFiles(arqNf); await pg.waitForTimeout(1200)
  await pg.getByText('Confirmar faturamento', { exact: true }).click(); await pg.waitForTimeout(2300)
  await recorte(janelaFat(), '05-faturamento-recusado')
  await pg.getByText('Cancelar', { exact: true }).click(); await pg.waitForTimeout(1000)

  // ── A janela de rastreio e o padrão da transportadora ───────────────────
  await card().getByText('Informar rastreio…', { exact: false }).click(); await pg.waitForTimeout(1400)
  await recorte(janela(), '06-janela-de-rastreio')

  const campoCod = janela().locator('input[maxlength="30"]')
  const campoUrl = janela().locator('input[placeholder="https://…"]')

  await campoCod.fill('123'); await pg.waitForTimeout(500)
  await pg.getByText('Salvar rastreio', { exact: true }).click(); await pg.waitForTimeout(1000)
  await recorte(janela(), '07-codigo-fora-do-padrao')

  await campoCod.fill(COD); await pg.waitForTimeout(800)
  const urlPad = await campoUrl.inputValue()
  await recorte(janela(), '08-link-montado-pelo-padrao')

  await janela().locator('select').selectOption('jadlog'); await pg.waitForTimeout(900)
  const codJad = await campoCod.inputValue()
  const urlJad = await campoUrl.inputValue()
  await recorte(janela(), '09-troca-de-transportadora')

  await janela().locator('select').selectOption('correios'); await pg.waitForTimeout(700)
  await campoCod.fill(COD); await pg.waitForTimeout(600)
  await janela().locator('input[placeholder="dd/mm/aaaa"]').fill(PREV); await pg.waitForTimeout(400)
  await janela().locator('textarea').fill(OBS); await pg.waitForTimeout(500)
  await recorte(janela(), '10-janela-preenchida')
  await pg.getByText('Salvar rastreio', { exact: true }).click(); await pg.waitForTimeout(2600)
  await recorte(card(), '11-card-com-rastreio')

  // ── Agora o faturamento passa ───────────────────────────────────────────
  await card().getByText('Registrar faturamento…', { exact: false }).click(); await pg.waitForTimeout(1500)
  await pg.locator('input[accept=".pdf,.xml"]').setInputFiles(arqNf); await pg.waitForTimeout(1200)
  await pg.getByText('Confirmar faturamento', { exact: true }).click(); await pg.waitForTimeout(3200)

  // ── Loja e revenda acompanham ───────────────────────────────────────────
  await entrar('Loja (Ana Ribeiro)')
  await ir('Pedidos')
  await recorte(linha(PED), '12-linha-com-rastreio')
  await linha(PED).locator('td').first().click(); await pg.waitForTimeout(1700)
  await recorte(pg.getByText('Entrega em trânsito', { exact: false }).first().locator('xpath=../..'),
    '13-detalhe-em-transito')

  const [doc] = await Promise.all([
    ctx.waitForEvent('page'),
    pg.getByText('Documento do pedido (PDF)', { exact: false }).first().click(),
  ])
  await doc.waitForLoadState('load'); await doc.waitForTimeout(1000)
  await recorte(doc.locator('section.bl').filter({ hasText: 'Rastreio da entrega' }).first(),
    '14-bloco-no-documento')
  await doc.close()
  await ir('Pedidos')

  await entrar('Revenda (Bar do Imperador)')
  await ir('Meus pedidos')
  await recorte(linha(PED), '15-linha-da-revenda')

  // ── O e-mail que chega aos dois lados ───────────────────────────────────
  const stA = await estado()
  const pA = stA.pedidos.find((p) => p.id === PED)
  const email = renderTemplate('pedido_rastreio', {
    pedidoId: PED, revendaNome: rev.nome, transportadora: pA.rastreio.transportadora,
    codigo: pA.rastreio.codigo, url: pA.rastreio.url, previsao: pA.rastreio.previsao,
    observacao: pA.rastreio.obs, por: pA.rastreio.por, quando: pA.rastreio.quando,
    ocultarValor: true,
    itensLista: pA.itens.filter((i) => i.st !== 'rejeitado').map((i) => {
      const pr = stA.produtos.find((x) => x.id === i.produtoId) || {}
      return { codigo: pr.codigo || '', descricao: pr.descricao || '', qtd: i.qtd, unidade: pr.unidade || '' }
    }),
  })
  const ctxMail = await br.newContext({ viewport: { width: 660, height: 200 }, deviceScaleFactor: 2 })
  const pe = await ctxMail.newPage()
  await pe.setContent(email.html); await pe.waitForTimeout(250)
  await pe.screenshot({ path: join(OUT, '16-email-do-rastreio.png'), fullPage: true }); log.push('16-email-do-rastreio')
  writeFileSync(join(OUT, '16-email-do-rastreio.html'), email.html)
  await pe.close(); await ctxMail.close()

  // ── Correção do rastreio e histórico ────────────────────────────────────
  await entrar('Fornecedor (Serra Verde)')
  await ir('Pedidos recebidos')
  await card().getByText('Atualizar rastreio…', { exact: false }).click(); await pg.waitForTimeout(1400)
  await recorte(janela(), '17-atualizar-rastreio')
  await janela().locator('input[maxlength="30"]').fill(COD2); await pg.waitForTimeout(700)
  await pg.getByText('Salvar rastreio', { exact: true }).click(); await pg.waitForTimeout(2600)

  await entrar('Loja (Ana Ribeiro)')
  await ir('Pedidos')
  await linha(PED).locator('td').first().click(); await pg.waitForTimeout(1700)
  await recorte(pg.getByText('Entrega em trânsito', { exact: false }).first().locator('xpath=../..'),
    '18-historico-de-rastreios')
  await recorte(pg.getByText('Trilha do pedido — data, hora e usuário', { exact: true }).locator('xpath=..'),
    '19-trilha-do-pedido')
  await ir('Segurança & Auditoria'); await pg.waitForTimeout(900)
  await shot('20-auditoria')

  // ── Quadros: a regra e o catálogo de transportadoras ────────────────────
  const col = (tit, sub, cor, bg, itens) => `
    <div style="flex:1;background:${bg};border:1px solid ${cor}44;border-radius:13px;padding:14px 17px">
      <div style="font-size:14px;font-weight:700;color:${cor};margin-bottom:3px">${tit}</div>
      <div style="font-size:11.5px;color:#8a8378;margin-bottom:8px">${sub}</div>
      ${itens.map((i) => `<div style="display:flex;gap:8px;font-size:12px;color:#4a453d;line-height:1.55;padding:3px 0"><span style="color:${cor};flex:none">▸</span><span>${i}</span></div>`).join('')}
    </div>`
  const quadro = `<div style="width:1400px;background:#f7f4ee;font-family:-apple-system,Segoe UI,Roboto,sans-serif;padding:28px 30px;box-sizing:border-box">
      <div style="font-size:20px;font-weight:700;color:${DARK};margin-bottom:3px">Quem paga o frete informa como acompanhar a entrega</div>
      <div style="font-size:13px;color:#8a8378;margin-bottom:18px">A responsabilidade do frete sai da própria negociação — e é ela que decide se o rastreio é obrigatório ou opcional.</div>
      <div style="display:flex;gap:14px;align-items:stretch">
        ${col('Frete do fornecedor (CIF) · obrigatório', 'Proposta vencedora CIF — ou pedido sem cotação', GOLD, '#faf3e4', [
          'O fornecedor <b>precisa</b> informar transportadora, código e link',
          'Sem isso, a plataforma <b>não conclui o faturamento</b>',
          'Enquanto não informa, a Loja vê "🚚 Rastreio pendente"',
          'Informado, a revenda e a Loja recebem e-mail com o link'])}
        ${col('Frete da revenda (FOB) · opcional', 'Proposta vencedora FOB', '#5b4a86', '#f2effa', [
          'Quem contrata a transportadora é a revenda',
          'O rastreio continua disponível, mas não é exigido',
          'Se o fornecedor informar, aparece do mesmo jeito nas duas telas',
          'O painel do pedido sempre mostra a base usada para decidir'])}
      </div>
      <div style="margin-top:14px;background:#fff;border:1px solid ${VERDE}44;border-left:3px solid ${VERDE};border-radius:11px;padding:13px 17px;font-size:12.5px;color:#4a453d;line-height:1.6">
        <b style="color:${VERDE}">Corrigir é sempre possível:</b> trocar a transportadora ou o código guarda o rastreio anterior no histórico do pedido, registra a mudança na trilha e na auditoria com autor e horário, e dispara um novo aviso por e-mail para a revenda e para a Loja.
      </div></div>`
  const p3 = await ctx.newPage(); await p3.setViewportSize({ width: 1400, height: 500 })
  await p3.setContent(quadro); await p3.waitForTimeout(300)
  await p3.locator('div').first().screenshot({ path: join(OUT, '00-regra.png') })
  log.push('00-regra'); await p3.close()

  // catálogo das transportadoras, lido do próprio código da aplicação
  const fonte = readFileSync(resolve(here, '../../web/index.html'), 'utf8')
  const bruto = fonte.slice(fonte.indexOf('TRANSPS=['))
  const literal = bruto.slice(bruto.indexOf('['), bruto.indexOf('}];') + 2)
  const lista = new Function('return ' + literal)()
  const tabela = `<div style="width:1400px;background:#f7f4ee;font-family:-apple-system,Segoe UI,Roboto,sans-serif;padding:28px 30px;box-sizing:border-box">
      <div style="font-size:20px;font-weight:700;color:${DARK};margin-bottom:3px">O padrão de cada transportadora</div>
      <div style="font-size:13px;color:#8a8378;margin-bottom:16px">A plataforma sabe como o documento se chama em cada transportadora, que formato ele tem e onde se consulta — valida o código e monta o link. O link continua editável.</div>
      <div style="background:#fff;border:1px solid #eae3d6;border-radius:12px;overflow:hidden">
        <table style="width:100%;border-collapse:collapse;font-size:12.5px">
          <tr style="background:#faf7f0">
            ${['Transportadora', 'Documento pedido', 'Formato aceito', 'Consulta'].map((h, i) => `<th style="text-align:left;padding:9px 16px;font-size:10.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#a89f90;width:${[20, 20, 30, 30][i]}%">${h}</th>`).join('')}
          </tr>
          ${lista.map((t) => `<tr>
            <td style="padding:9px 16px;font-weight:700;border-top:1px solid #f5f1e8">${t.nome}</td>
            <td style="padding:9px 16px;color:#6b6459;border-top:1px solid #f5f1e8">${t.doc}</td>
            <td style="padding:9px 16px;color:#8a8378;border-top:1px solid #f5f1e8">${t.dica}</td>
            <td style="padding:9px 16px;color:#8f682a;border-top:1px solid #f5f1e8;font-size:11px;word-break:break-all">${t.url ? t.url.replace('{cod}', '<b>código</b>') : '— sem consulta on-line —'}</td></tr>`).join('')}
        </table>
      </div>
      <div style="font-size:12px;color:#a89f90;margin-top:11px;line-height:1.6">Escolhendo <b>Outra transportadora</b>, o fornecedor informa o nome e cola o link que a transportadora forneceu. Escolhendo <b>Frota própria</b>, não há link: o contato da entrega vai na observação.</div>
    </div>`
  const p5 = await ctx.newPage(); await p5.setViewportSize({ width: 1400, height: 700 })
  await p5.setContent(tabela); await p5.waitForTimeout(300)
  await p5.locator('div').first().screenshot({ path: join(OUT, '00-transportadoras.png') })
  log.push('00-transportadoras'); await p5.close()

  const stF = await estado()
  const pF = stF.pedidos.find((p) => p.id === PED)
  writeFileSync(join(OUT, 'dados.json'), JSON.stringify({
    pedido: PED, fornecedor: forn.nome, revenda: rev.nome,
    codigo: COD, codigoCorrigido: COD2, previsao: PREV,
    urlPadraoCorreios: urlPad, codigoNaJadlog: codJad, urlJadlog: urlJad,
    transportadoras: lista.length, catalogo: lista.map((t) => t.nome),
    rastreioAtual: pF.rastreio, historico: (pF.rastreioHist || []).length,
    assuntoEmail: email.subject,
    faturado: stF.faturamentos.some((f) => f.pedidoId === PED),
  }, null, 2))
} catch (e) { log.push('ERRO: ' + e.message) }

console.log(log.join('\n'))
await br.close()
