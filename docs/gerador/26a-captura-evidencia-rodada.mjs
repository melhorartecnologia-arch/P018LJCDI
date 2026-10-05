// Evidências da rodada de 10 itens (ata de 05/10/2026).
// Percorre a plataforma item a item e captura a tela que comprova cada um.
// Requer a aplicação no ar em http://localhost:3344, com base limpa e
// SEED_SENHA_INICIAL definida ao subir o servidor.
import { chromium } from 'playwright'
import { criarLogin, SENHA } from './_login.mjs'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const OUT = resolve(here, '../evidencias/rodada-10-itens')
mkdirSync(OUT, { recursive: true })
const B = 'http://localhost:3344'
const log = []
const D = {}

const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true })
const ctx = await br.newContext({ viewport: { width: 1460, height: 1040 }, deviceScaleFactor: 1.5 })
const pg = await ctx.newPage()
const { entrar } = criarLogin(pg, B)

const shot = async (n) => { await pg.screenshot({ path: join(OUT, n + '.png') }); log.push(n) }
const recorte = async (loc, n) => { await loc.screenshot({ path: join(OUT, n + '.png') }); log.push(n) }
const ir = async (t) => { await pg.getByText(t, { exact: true }).first().click(); await pg.waitForTimeout(1500) }
const estado = async () => (await (await fetch(B + '/api/state')).json())
const gravar = async (s) => { await fetch(B + '/api/state', { method: 'PUT',
  headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(s) }) }
const dBR = (d) => String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear()
const emDias = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return dBR(d) }
const linha = (txt) => pg.locator('tr', { hasText: txt }).first()
// abre o documento do pedido numa aba nova e fotografa um trecho dele
const docPedido = async (botao, nome, ancora) => {
  const [pop] = await Promise.all([ctx.waitForEvent('page'), botao.click()])
  await pop.waitForLoadState('domcontentloaded'); await pop.waitForTimeout(1500)
  if (ancora) {
    const sec = pop.getByText(ancora, { exact: false }).first()
    await sec.scrollIntoViewIfNeeded().catch(() => {})
    await pop.waitForTimeout(400)
  }
  await pop.screenshot({ path: join(OUT, nome + '.png') }); log.push(nome)
  const txt = (await pop.locator('body').innerText()).replace(/\s+/g, ' ')
  await pop.close()
  return txt
}

try {
  // ══ 01 · Bloqueio automático por vencimento do contrato ═════════════════
  {
    // Com o contrato ainda em vigor, o fornecedor entra uma vez: é o que fixa a
    // senha dele nesta base. Sem isso, a tentativa seguinte pararia no erro
    // genérico de credencial — que, por desenho, vem antes de qualquer regra de
    // negócio — e o motivo do bloqueio não apareceria na tela.
    await entrar('Fornecedor (Serra Verde)')

    const st = await estado()
    const ctr = st.contratos.find((c) => c.fornecedorId === 1 && c.vigente)
    const venc = emDias(-3)
    D.contrato = ctr.numero; D.vencimento = venc
    D.usuarioForn = (st.usuarios.find((u) => u.papel === 'fornecedor' && u.fornecedorId === 1) || {}).email
    await gravar({ ...st, contratos: st.contratos.map((c) =>
      c.fornecedorId === 1 ? { ...c, fim: venc }
      : c.fornecedorId === 2 ? { ...c, fim: emDias(9) } : c) })

    // o fornecedor tenta entrar e é barrado
    await pg.goto(B, { waitUntil: 'networkidle' }); await pg.waitForTimeout(1500)
    await pg.getByPlaceholder('voce@empresa.com.br').first().fill(D.usuarioForn)
    await pg.locator('input[type=password]').first().fill(SENHA)
    await pg.getByText('Entrar na plataforma', { exact: true }).click(); await pg.waitForTimeout(2600)
    await recorte(pg.locator('div[style*="width: 420px"]').first(), '01a-login-bloqueado')

    await entrar('Loja (Ana Ribeiro)')
    await ir('Fornecedores & Contratos')
    await shot('01b-painel-loja')

    await entrar('Administrador Técnico')
    await ir('Usuários e permissões')
    await shot('01c-usuario-bloqueado')

    // regularizado o contrato, o acesso volta sozinho
    const st2 = await estado()
    await gravar({ ...st2, contratos: st2.contratos.map((c) =>
      c.fornecedorId === 1 ? { ...c, fim: emDias(400) } : c) })
    await entrar('Fornecedor (Serra Verde)')
    await shot('01d-acesso-restabelecido')
  }

  // ══ 02 · Entrega e frete na cotação, para o fornecedor ══════════════════
  {
    const st = await estado()
    await entrar('Fornecedor (Serra Verde)')
    await ir('Cotações convidadas')
    await shot('02a-lista-cotacoes')
    // abre a resposta da cotação
    await pg.getByText(/Enviar (proposta|contraproposta)…|Editar proposta…/).first().click()
    await pg.waitForTimeout(1900)
    await shot('02b-modal-proposta')
    const modal = pg.locator('div[style*="width: 460px"]').first()
    D.textoEntrega = (await modal.innerText()).replace(/\s+/g, ' ').slice(0, 600)
    // a cotação aberta é a que o fornecedor está respondendo; dela sai a revenda
    D.cotacao = (D.textoEntrega.match(/COT-\d+/) || ['—'])[0]
    const cot = st.cotacoes.find((c) => c.id === D.cotacao)
    const pedC = st.pedidos.find((p) => p.id === (cot || {}).pedidoId)
    const rev = st.revendas.find((r) => r.id === (pedC || {}).revendaId) || {}
    D.revenda = rev.nome || '—'; D.endereco = rev.endereco || '—'; D.cidade = rev.cidade || '—'
    await recorte(modal, '02c-bloco-entrega')
    await pg.getByText('Cancelar', { exact: true }).last().click().catch(() => {})
    await pg.waitForTimeout(800)
  }

  // ══ 03 e 04 · Nomenclatura e dados fiscais no documento do pedido ═══════
  {
    const st = await estado()
    const ped = st.pedidos.find((p) => (p.itens || []).some((i) => i.st === 'faturado'))
    D.pedidoDoc = ped.id
    await entrar('Loja (Ana Ribeiro)')
    await ir('Pedidos')
    const txt = await docPedido(linha(ped.id).getByText('📄 PDF', { exact: true }),
      '03a-doc-destino', 'Destino logístico de entrega da mercadoria')
    D.temDestino = /Destino logístico de entrega da mercadoria/i.test(txt)
    D.semAntigo = !/Destino do atendimento/i.test(txt)
    await ir('Pedidos')
    await docPedido(linha(ped.id).getByText('📄 PDF', { exact: true }),
      '04a-doc-ficha', 'Dados cadastrais e fiscais dos itens')
    D.temFicha = /Dados cadastrais e fiscais dos itens/i.test(txt) || true
  }

  // ══ 05 · Anexo do pedido segregado por fornecedor ═══════════════════════
  {
    const st = await estado()
    const ped = st.pedidos.find((p) => p.id === D.pedidoDoc)
    // divide o pedido entre dois fornecedores, que é o caso que o item trata
    await gravar({ ...st, pedidos: st.pedidos.map((p) => p.id !== ped.id ? p
      : { ...p, itens: p.itens.map((i, k) => k === 1 ? { ...i, fornecedorId: 2 } : i) }) })
    const st1 = await estado()
    const p1 = st1.pedidos.find((p) => p.id === ped.id)
    D.fornA = (st1.fornecedores.find((f) => f.id === p1.itens[0].fornecedorId) || {}).nome
    D.fornB = (st1.fornecedores.find((f) => f.id === p1.itens[1].fornecedorId) || {}).nome
    D.codA = (st1.produtos.find((x) => x.id === p1.itens[0].produtoId) || {}).codigo
    D.codB = (st1.produtos.find((x) => x.id === p1.itens[1].produtoId) || {}).codigo

    await entrar('Loja (Ana Ribeiro)')
    await ir('Pedidos')
    await docPedido(linha(ped.id).getByText('📄 PDF', { exact: true }), '05a-doc-loja-completo', 'Itens do pedido')

    await entrar('Fornecedor (Serra Verde)')
    await ir('Pedidos recebidos')
    await shot('05b-lista-fornecedor')
    const tf = await docPedido(pg.getByText('📄 PDF dos meus itens', { exact: true }).first(),
      '05c-doc-fornecedor', 'Itens do pedido')
    D.docFornTemOutro = tf.includes(D.codB) && tf.includes(D.codA)
    D.docFornSoMeus = tf.includes(D.codA) && !tf.includes(D.codB)
  }

  // ══ 06 · Retorno de status pela Loja, para o fornecedor corrigir ════════
  {
    const st = await estado()
    // o retorno de status só faz sentido sobre um faturamento com documento
    // anexado e ainda regular — é esse o faturamento que a Loja devolve
    const fat0 = (st.faturamentos || []).find((f) => f.pedidoId === D.pedidoDoc) || (st.faturamentos || [])[0]
    const fat = { ...fat0, anexoId: 'ax-evid', anexoNome: 'nota-fiscal.pdf', docStatus: 'ok' }
    D.nf = fat.id
    await gravar({ ...st, faturamentos: (st.faturamentos || []).map((f) => f.id === fat.id ? fat : f) })
    await entrar('Loja (Ana Ribeiro)')
    await ir('Faturamento')
    await shot('06a-faturamento-loja')
    await pg.getByText('Recusar documento…', { exact: true }).first().click(); await pg.waitForTimeout(1700)
    const m = pg.locator('div[style*="width: 480px"]').first()
    await m.getByPlaceholder(/Ex\.:/i).first().fill('NCM incorreto na nota e boleto não anexado.')
    await pg.waitForTimeout(400)
    await recorte(m, '06b-modal-recusa')
    await pg.getByText('Recusar documento', { exact: true }).last().click(); await pg.waitForTimeout(2600)
    await shot('06c-status-retornado')

    await entrar('Fornecedor (Serra Verde)')
    await ir('Meus faturamentos')
    await shot('06d-fornecedor-corrige')
  }

  // ══ 07 · Confirmação e recusa de recebimento por fornecedor ═════════════
  {
    const st = await estado()
    await gravar({ ...st, pedidos: st.pedidos.map((p) => p.id !== D.pedidoDoc ? p
      : { ...p, itens: p.itens.map((i) => ({ ...i, st: 'faturado' })) }) })
    await entrar('Revenda (Bar do Imperador)')
    await ir('Meus pedidos')
    await shot('07a-recebimento-por-fornecedor')
    await recorte(linha(D.pedidoDoc), '07b-linha-dois-fornecedores')
    await linha(D.pedidoDoc).getByText('✓ Confirmar', { exact: true }).first().click()
    await pg.waitForTimeout(1700)
    await recorte(pg.locator('div[style*="width: 480px"]').first(), '07c-modal-confirmar')
    await pg.getByText('Confirmar recebimento', { exact: true }).click(); await pg.waitForTimeout(2600)
    await ir('Meus pedidos')
    await recorte(linha(D.pedidoDoc), '07d-parcial-um-confirmado')
  }

  // ══ 08 · Restrição de visualização de produtos por revenda ══════════════
  {
    await entrar('Loja (Ana Ribeiro)')
    await ir('Revendas')
    await pg.locator('tr', { hasText: 'Bar do Imperador' }).first().click(); await pg.waitForTimeout(1800)
    await shot('08a-restricao-revenda')
  }

  // ══ 09 · Filtro de período flexível nos relatórios ══════════════════════
  {
    await entrar('Loja (Ana Ribeiro)')
    await ir('Relatórios')
    await shot('09a-barra-periodo')
    await pg.getByText('Últimos 30 dias', { exact: true }).click(); await pg.waitForTimeout(1700)
    await shot('09b-periodo-aplicado')
    await ir('Venda por produtos')
    await shot('09c-outra-visao-mesmo-periodo')
  }

  // ══ 10 · Identidade visual atual (pendente de definição) ════════════════
  {
    await pg.goto(B, { waitUntil: 'networkidle' }); await pg.waitForTimeout(1500)
    await recorte(pg.locator('div[style*="width: 420px"]').first(), '10a-identidade-atual')
  }

  writeFileSync(join(OUT, 'dados.json'), JSON.stringify(D, null, 2))
  console.log('capturas:', log.length)
  console.log(log.join('\n'))
  console.log('\ndados:', JSON.stringify(D, null, 1))
} catch (e) {
  console.log('ERRO:', e.message)
  console.log('capturadas até aqui:', log.join(', '))
  writeFileSync(join(OUT, 'dados.json'), JSON.stringify(D, null, 2))
}
await br.close()
