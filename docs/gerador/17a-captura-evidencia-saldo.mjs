// Evidências do saldo de estoque como posição: o último inventário lançado É o
// saldo. Percorre os três momentos do mesmo produto — posição inicial,
// atendimento com estoque (que não abate) e nova carga (que redefine).
// Requer a aplicação no ar em http://localhost:3344 com base limpa.
import { chromium } from 'playwright'
import XLSX from 'xlsx'
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const OUT = resolve(here, '../evidencias/saldo-estoque')
const DL = join(process.env.SC || '/tmp', 'saldo-evid-dl')
rmSync(DL, { recursive: true, force: true }); mkdirSync(DL, { recursive: true })
mkdirSync(OUT, { recursive: true })
const B = 'http://localhost:3344'
const log = []
const GOLD = '#B38335', DARK = '#272525'

const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true })
const ctx = await br.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1.5, acceptDownloads: true })
const pg = await ctx.newPage()

const shot = async (n) => { await pg.screenshot({ path: join(OUT, n + '.png') }); log.push(n) }
const ir = async (t) => { await pg.getByText(t, { exact: true }).first().click(); await pg.waitForTimeout(1300) }
const baixar = async (r) => {
  const [dl] = await Promise.all([pg.waitForEvent('download'), pg.getByText(r, { exact: true }).last().click()])
  const p = join(DL, dl.suggestedFilename()); await dl.saveAs(p); await pg.waitForTimeout(500); return p
}
const estado = async () => (await (await fetch(B + '/api/state')).json())
// recorta a tabela "Saldo atual por produto" — é onde a regra fica visível
const recorteSaldo = async (nome) => {
  const bloco = pg.locator('div').filter({ hasText: /^Saldo atual por produto/ }).last()
  await bloco.screenshot({ path: join(OUT, nome + '.png') }); log.push(nome)
}
const linhaProduto = async (codigo) => {
  const t = await pg.locator('tr', { hasText: codigo }).first().innerText()
  return t.split('\t').map((s) => s.trim())
}

const planilhaPng = async (arquivo, aba, nome, titulo, sub) => {
  const rows = XLSX.utils.sheet_to_json(XLSX.readFile(arquivo).Sheets[aba], { header: 1, defval: '' })
  const mostra = rows.slice(0, 12)
  const nCols = Math.max(...mostra.map((r) => r.length))
  const letra = (i) => String.fromCharCode(65 + i)
  const esc = (v) => String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;')
  const html = `<div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;background:#f7f4ee;padding:26px;display:inline-block;min-width:1388px;box-sizing:border-box">
    <div style="font-size:19px;font-weight:700;color:${DARK}">${titulo}</div>
    <div style="font-size:13px;color:#8a8378;margin:3px 0 14px">${sub}</div>
    <div style="background:#fff;border:1px solid #d9d3c6;border-radius:8px;overflow:hidden">
      <table style="border-collapse:collapse;font-size:12px;color:${DARK};width:100%">
        <tr><td style="background:#eceade;border:1px solid #d9d3c6;width:30px"></td>
        ${Array.from({ length: nCols }, (_, i) => `<td style="background:#eceade;border:1px solid #d9d3c6;padding:4px 8px;text-align:center;font-size:10.5px;font-weight:700;color:#7a7364">${letra(i)}</td>`).join('')}</tr>
        ${mostra.map((r, ri) => `<tr>
          <td style="background:#eceade;border:1px solid #d9d3c6;padding:4px 5px;text-align:center;font-size:10.5px;font-weight:700;color:#7a7364">${ri + 1}</td>
          ${Array.from({ length: nCols }, (_, ci) => { const v = r[ci]; const cab = ri === 0; const num = typeof v === 'number'
            return `<td style="border:1px solid #e6e1d6;padding:5px 8px;white-space:nowrap;${cab ? 'background:#faf3e4;font-weight:700;color:#8f682a;' : (num ? 'text-align:right;font-variant-numeric:tabular-nums;' : '')}">${esc(v)}</td>` }).join('')}</tr>`).join('')}
      </table>
    </div>${rows.length - 1 > 11 ? `<div style="font-size:11.5px;color:#8a8378;margin-top:8px">… e mais ${rows.length - 12} linha(s)</div>` : ''}</div>`
  const p2 = await ctx.newPage(); await p2.setViewportSize({ width: 1440, height: 800 })
  await p2.setContent(html); await p2.waitForTimeout(250)
  await p2.locator('div').first().screenshot({ path: join(OUT, nome + '.png') })
  log.push(nome); await p2.close()
}

try {
  await pg.goto(B, { waitUntil: 'networkidle' }); await pg.waitForTimeout(1500)
  await pg.getByText('Loja (Ana Ribeiro)', { exact: true }).click(); await pg.waitForTimeout(300)
  await pg.getByText('Entrar na plataforma', { exact: true }).click(); await pg.waitForTimeout(2200)

  // ── Momento 1: a posição vigente ────────────────────────────────────────
  await ir('Inventário de estoque')
  await shot('01-tela-inventario')
  await recorteSaldo('02-posicao-inicial')
  const st0 = await estado()
  const inv0 = st0.inventarios.reduce((a, b) => ((b.ts || 0) > (a.ts || 0) ? b : a))

  // ── Momento 2: atender um pedido com estoque da Loja ────────────────────
  await ir('Pedidos')
  await pg.getByText('Receber', { exact: true }).first().click(); await pg.waitForTimeout(2600)
  await pg.locator('tr', { hasText: 'Pedido recebido' }).first().click(); await pg.waitForTimeout(1600)
  await pg.getByText('Atender com estoque da Loja…', { exact: false }).first().click(); await pg.waitForTimeout(1000)
  await shot('03-atender-com-estoque')
  await pg.getByText('Atender com estoque', { exact: true }).click(); await pg.waitForTimeout(2400)

  const st1 = await estado()
  const atend = st1.pedidos.flatMap((p) => p.itens).filter((i) => i.st === 'estoque' && i.estoqueTs)
  const alvo = st1.produtos.find((p) => p.id === atend[0].produtoId)
  const contAntes = +(inv0.itens[alvo.id] || 0)
  const saiu = atend.filter((i) => i.produtoId === alvo.id).reduce((a, i) => a + i.qtd, 0)

  // ── Momento 3: a posição NÃO mudou ──────────────────────────────────────
  await ir('Inventário de estoque')
  await recorteSaldo('04-posicao-apos-atendimento')
  const depois = await linhaProduto(alvo.codigo)

  // ── Momento 4: nova carga redefine a posição ────────────────────────────
  const mod = await baixar('⬇ Todos os produtos')
  const nomeAba = XLSX.readFile(mod).SheetNames[0]
  const rows = XLSX.utils.sheet_to_json(XLSX.readFile(mod).Sheets[nomeAba], { header: 1, defval: '' })
  const hIx = rows.findIndex((r) => String(r[0]).toLowerCase() === 'código')
  const NOVO = 120
  rows.forEach((r, i) => { if (i > hIx && r[0]) r[3] = r[0] === alvo.codigo ? NOVO : Math.max(1, (i - hIx) * 5) })
  const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), 'Inventário')
  const arqNovo = join(DL, 'nova-posicao.xlsx'); XLSX.writeFile(wb, arqNovo)
  await planilhaPng(arqNovo, 'Inventário', '05-planilha-nova-posicao',
    'A planilha da nova posição de estoque',
    `Preenchida sobre o modelo baixado. O produto ${alvo.codigo} vai a ${NOVO} — e é isso que passa a valer como saldo`)

  await pg.locator('#inv-file-input').setInputFiles(arqNovo); await pg.waitForTimeout(1900)
  await shot('06-janela-lancamento')
  await pg.getByText('Lançar inventário', { exact: true }).click(); await pg.waitForTimeout(2600)
  await recorteSaldo('07-posicao-apos-carga')
  const final = await linhaProduto(alvo.codigo)

  // ── A linha do tempo do mesmo produto, em um quadro ─────────────────────
  const cartao = (rot, sub, contagem, atendido, saldo, cor, nota) => `
    <div style="flex:1;background:#fff;border:1px solid ${cor === 'ok' ? '#cfe0d1' : '#eae3d6'};border-radius:13px;overflow:hidden">
      <div style="padding:13px 17px;border-bottom:1px solid #f1ece2;background:${cor === 'ok' ? '#f4f9f4' : '#faf7f0'}">
        <div style="font-size:13.5px;font-weight:700;color:${DARK}">${rot}</div>
        <div style="font-size:11.5px;color:#8a8378;margin-top:2px;line-height:1.45">${sub}</div>
      </div>
      <div style="padding:16px 17px">
        <div style="display:flex;justify-content:space-between;font-size:12px;color:#8a8378;padding:5px 0"><span>Contagem lançada</span><b style="color:${DARK}">${contagem}</b></div>
        <div style="display:flex;justify-content:space-between;font-size:12px;color:#a89f90;padding:5px 0;border-bottom:1px solid #f1ece2"><span>Atendido desde o lançamento</span><span>${atendido}</span></div>
        <div style="display:flex;justify-content:space-between;align-items:baseline;padding:11px 0 3px"><span style="font-size:12.5px;font-weight:700">Saldo em estoque</span><b style="font-size:25px;color:${GOLD}">${saldo}</b></div>
        <div style="font-size:11.5px;color:${cor === 'ok' ? '#2f6b39' : '#8a8378'};line-height:1.5;margin-top:7px">${nota}</div>
      </div>
    </div>`
  const linha = `<div style="width:1400px;background:#f7f4ee;font-family:-apple-system,Segoe UI,Roboto,sans-serif;padding:28px 30px;box-sizing:border-box">
      <div style="font-size:20px;font-weight:700;color:${DARK};margin-bottom:3px">O mesmo produto nos três momentos — ${alvo.codigo} · ${alvo.descricao}</div>
      <div style="font-size:13px;color:#8a8378;margin-bottom:18px">O saldo só muda quando um novo inventário é lançado. A saída por atendimento aparece, mas não abate.</div>
      <div style="display:flex;gap:16px;align-items:stretch">
        ${cartao('1 · Posição vigente', 'Inventário de ' + inv0.data, contAntes, 0, contAntes, '', 'O saldo é a quantidade do arquivo carregado.')}
        ${cartao('2 · Depois de atender com estoque', saiu + ' unidade(s) saíram para um pedido', contAntes, saiu, depois[depois.length - 2] || contAntes, '', 'O saldo <b>não muda</b>: a saída é informada, não deduzida.')}
        ${cartao('3 · Depois de carregar a planilha', 'Nova posição enviada por arquivo', NOVO, 0, final[final.length - 2] || NOVO, 'ok', 'O arquivo redefine o saldo — a contagem anterior deixa de valer.')}
      </div></div>`
  const p3 = await ctx.newPage(); await p3.setViewportSize({ width: 1400, height: 460 })
  await p3.setContent(linha); await p3.waitForTimeout(300)
  await p3.locator('div').first().screenshot({ path: join(OUT, '00-linha-do-tempo.png') })
  log.push('00-linha-do-tempo'); await p3.close()

  // ── Exportação e histórico ──────────────────────────────────────────────
  await planilhaPng(await baixar('⬇ Exportar saldo'), 'Estoque', '08-planilha-exportada',
    'A exportação reflete a mesma posição',
    'Coluna "Saldo em estoque" com a quantidade do último inventário; as saídas vêm marcadas como informativas')
  await pg.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
  await pg.waitForTimeout(700)
  await shot('09-historico-lancamentos')

  await ir('Segurança & Auditoria'); await pg.waitForTimeout(800)
  await shot('10-auditoria')

  writeFileSync(join(OUT, 'dados.json'), JSON.stringify({ produto: alvo.codigo, descricao: alvo.descricao, contAntes, saiu, NOVO }, null, 2))
} catch (e) { log.push('ERRO: ' + e.message) }

console.log(log.join('\n'))
await br.close()
