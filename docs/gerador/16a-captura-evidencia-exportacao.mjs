// Captura as evidências da exportação de cadastros: os botões nas telas e as
// planilhas realmente baixadas, renderizadas com cara de planilha.
// Requer a aplicação no ar em http://localhost:3344 com base limpa.
import { chromium } from 'playwright'
import XLSX from 'xlsx'
import { mkdirSync, rmSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const OUT = resolve(here, '../evidencias/exportacao-cadastros')
const DL = join(process.env.SC || '/tmp', 'exp-evid-dl')
rmSync(DL, { recursive: true, force: true }); mkdirSync(DL, { recursive: true })
mkdirSync(OUT, { recursive: true })
const B = 'http://localhost:3344'
const log = []

const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true })
const ctx = await br.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1.5, acceptDownloads: true })
const pg = await ctx.newPage()

const shot = async (n) => { await pg.screenshot({ path: join(OUT, n + '.png') }); log.push(n) }
const entrar = async (rot) => {
  await pg.goto(B, { waitUntil: 'networkidle' }); await pg.waitForTimeout(1400)
  await pg.getByText(rot, { exact: true }).click(); await pg.waitForTimeout(300)
  await pg.getByText('Entrar na plataforma', { exact: true }).click(); await pg.waitForTimeout(2100)
}
const ir = async (t) => { await pg.getByText(t, { exact: true }).first().click(); await pg.waitForTimeout(1300) }
const baixar = async (rot) => {
  const [dl] = await Promise.all([pg.waitForEvent('download'), pg.getByText(rot, { exact: true }).last().click()])
  const p = join(DL, dl.suggestedFilename()); await dl.saveAs(p); await pg.waitForTimeout(500); return p
}

// Renderiza uma aba da planilha como imagem, no visual de uma planilha.
const MAX_LINHAS = 14
const planilhaPng = async (arquivo, aba, nome, titulo, sub, abas) => {
  const rows = XLSX.utils.sheet_to_json(XLSX.readFile(arquivo).Sheets[aba], { header: 1, defval: '' })
  const total = rows.length - 1
  const mostra = rows.slice(0, MAX_LINHAS + 1)
  const nCols = Math.max(...mostra.map((r) => r.length))
  const letra = (i) => (i < 26 ? String.fromCharCode(65 + i) : 'A' + String.fromCharCode(65 + i - 26))
  const esc = (v) => String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;')
  const html = `<div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;background:#f7f4ee;padding:26px;display:inline-block;min-width:1388px;box-sizing:border-box">
    <div style="font-size:19px;font-weight:700;color:#272525">${titulo}</div>
    <div style="font-size:13px;color:#8a8378;margin:3px 0 14px">${sub}</div>
    <div style="background:#fff;border:1px solid #d9d3c6;border-radius:8px 8px 0 0;overflow:hidden">
      <table style="border-collapse:collapse;font-size:12px;color:#272525;width:100%;table-layout:auto">
        <tr><td style="background:#eceade;border:1px solid #d9d3c6;width:30px"></td>
        ${Array.from({ length: nCols }, (_, i) => `<td style="background:#eceade;border:1px solid #d9d3c6;padding:4px 8px;text-align:center;font-size:10.5px;font-weight:700;color:#7a7364">${letra(i)}</td>`).join('')}</tr>
        ${mostra.map((r, ri) => `<tr>
          <td style="background:#eceade;border:1px solid #d9d3c6;padding:4px 5px;text-align:center;font-size:10.5px;font-weight:700;color:#7a7364">${ri + 1}</td>
          ${Array.from({ length: nCols }, (_, ci) => {
            const v = r[ci]; const cab = ri === 0
            const num = typeof v === 'number'
            return `<td style="border:1px solid #e6e1d6;padding:5px 8px;white-space:nowrap;${cab ? 'background:#faf3e4;font-weight:700;color:#8f682a;' : (num ? 'text-align:right;font-variant-numeric:tabular-nums;' : '')}">${esc(v)}</td>`
          }).join('')}</tr>`).join('')}
      </table>
    </div>
    ${total > MAX_LINHAS ? `<div style="background:#faf7f0;border:1px solid #d9d3c6;border-top:0;padding:7px 12px;font-size:11.5px;color:#8a8378">… e mais ${total - MAX_LINHAS} linha(s) — a planilha traz os ${total} registros do cadastro</div>` : ''}
    ${abas ? `<div style="display:flex;gap:3px;margin-top:10px;align-items:flex-end">${abas.map((a, i) => `<div style="font-size:11.5px;font-weight:${i === 0 ? '700' : '500'};color:${i === 0 ? '#272525' : '#7a7364'};background:${i === 0 ? '#fff' : '#eceade'};border:1px solid #d9d3c6;border-bottom:0;border-radius:5px 5px 0 0;padding:6px 13px">${a}</div>`).join('')}</div>` : ''}
  </div>`
  const p2 = await ctx.newPage(); await p2.setViewportSize({ width: 1440, height: 900 })
  await p2.setContent(html); await p2.waitForTimeout(250)
  await p2.locator('div').first().screenshot({ path: join(OUT, nome + '.png') })
  log.push(nome); await p2.close()
}

try {
  await entrar('Loja (Ana Ribeiro)')

  // ── Fornecedores: os dois botões e as duas planilhas ────────────────────
  await ir('Fornecedores & Contratos')
  await shot('01-botoes-fornecedores')
  await planilhaPng(await baixar('⬇ Exportar XLSX'), 'Fornecedores', '02-planilha-fornecedores',
    'Fornecedores exportados — cidade-imperial-fornecedores-AAAA-MM-DD.xlsx',
    'Além dos campos do cadastro, o contrato vigente, o royalty, os produtos vinculados e o faturado — valores como número, prontos para somar')
  await planilhaPng(await baixar('⬇ Exportar contratos'), 'Contratos', '03-planilha-contratos',
    'Contratos de royalty exportados',
    'Percentual, vigência, dia acordado, gatilho de pagamento e parcelamento de cada contrato')

  // ── Produtos ────────────────────────────────────────────────────────────
  await ir('Produtos homologados')
  await shot('04-botoes-produtos')
  await planilhaPng(await baixar('⬇ Exportar XLSX'), 'Produtos', '05-planilha-produtos',
    'Produtos homologados exportados',
    'Catálogo com categoria, preço, fornecedores do De/Para, saldo em estoque e o quanto cada item já vendeu')

  // ── Categorias ──────────────────────────────────────────────────────────
  await ir('Categorias de produtos')
  await planilhaPng(await baixar('⬇ Exportar XLSX'), 'Categorias', '06-planilha-categorias',
    'Categorias de produtos exportadas',
    'Situação, quantos produtos usam cada grupo e a participação no catálogo')

  // ── De/Para (matriz) ────────────────────────────────────────────────────
  await ir('De/Para Produto × Fornecedor')
  await shot('07-botao-depara')
  await planilhaPng(await baixar('⬇ Exportar De/Para'), 'De-Para', '08-planilha-depara',
    'De/Para Produto × Fornecedor exportado',
    'Matriz com uma coluna por fornecedor ativo — a mesma leitura da tela, agora filtrável no Excel')

  // ── Revendas ────────────────────────────────────────────────────────────
  await ir('Revendas')
  await planilhaPng(await baixar('⬇ Exportar XLSX'), 'Revendas', '09-planilha-revendas',
    'Revendas exportadas',
    'Cadastro, visibilidade de fornecedores, produtos bloqueados, pedidos e valor em pedidos')

  // ── Estoque ─────────────────────────────────────────────────────────────
  await ir('Inventário de estoque')
  await planilhaPng(await baixar('⬇ Exportar saldo'), 'Estoque', '10-planilha-estoque',
    'Saldo de estoque exportado',
    'Contagem do último inventário, consumido desde então e saldo disponível por produto')

  // ── Consolidada (Loja: sem a aba Usuários) ──────────────────────────────
  await ir('Relatórios')
  await shot('11-botao-consolidado')
  const tudoLoja = await baixar('⬇ Exportar todos os cadastros')
  const abasLoja = XLSX.readFile(tudoLoja).SheetNames
  await planilhaPng(tudoLoja, 'Resumo', '12-pasta-consolidada',
    'Pasta consolidada — uma aba por cadastro',
    'A aba Resumo abre a pasta com a contagem de cada cadastro; as abas seguintes trazem os dados. Perfil Loja: sem a aba Usuários, que exige permissão de gestão de usuários',
    abasLoja)

  // ── Administrador: usuários e a pasta completa ──────────────────────────
  await entrar('Administrador Técnico')
  await ir('Usuários e permissões')
  await shot('13-botoes-usuarios')
  await planilhaPng(await baixar('⬇ Exportar XLSX'), 'Usuários', '14-planilha-usuarios',
    'Usuários exportados — sem senha e sem hash',
    'Perfil, vínculo, permissões personalizadas, último acesso e o histórico de envios de acesso. Nenhuma coluna de senha é exportada')
  await ir('Relatórios')
  const tudoAdm = await baixar('⬇ Exportar todos os cadastros')
  await planilhaPng(tudoAdm, 'Resumo', '15-pasta-consolidada-admin',
    'Mesma pasta, exportada pelo Administrador',
    'Com permissão de gestão de usuários, a aba Usuários entra na pasta — a exportação respeita as permissões de quem a executa',
    XLSX.readFile(tudoAdm).SheetNames)

  // ── Auditoria ───────────────────────────────────────────────────────────
  await ir('Segurança & Auditoria')
  await pg.waitForTimeout(800)
  await shot('16-auditoria')
} catch (e) { log.push('ERRO: ' + e.message) }

console.log(log.join('\n'))
await br.close()
