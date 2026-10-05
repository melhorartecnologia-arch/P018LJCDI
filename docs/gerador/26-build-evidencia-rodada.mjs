// Relatório resumido da rodada de 10 itens (ata de 05/10/2026): o que está
// implementado, com uma evidência por item. PNG + PDF.
import { chromium } from 'playwright'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const DIR = resolve(here, '../evidencias/rodada-10-itens')
const GOLD = '#B38335', DARK = '#272525', VERDE = '#2f6b39', AZUL = '#2b6cb0'
const img = (f) => `data:image/png;base64,${readFileSync(resolve(DIR, f)).toString('base64')}`
const D = JSON.parse(readFileSync(resolve(DIR, 'dados.json'), 'utf8'))

// status: 'ok' = entregue e funcionando · 'analise' = análise entregue
const ITENS = [
  { n: '01', st: 'ok', fit: 'contain', alt: 520, t: 'Bloqueio automático de usuário por vencimento do contrato',
    resumo: `Quem decide é a <b>data</b>, não a marcação "vigente": contrato com vigência expirada deixa de valer sozinho e os usuários daquele fornecedor param de entrar — sem ninguém inativar nada. Renovado o contrato, o acesso volta na mesma hora. O cadastro do usuário não é alterado, então não há nada a desfazer depois.`,
    aceite: `Com ${D.contrato} vencido em ${D.vencimento}, ${D.usuarioForn} não entra; renovada a vigência, entra de novo sem ação manual.`,
    fotos: [['01a-login-bloqueado.png', 'O acesso é negado, dizendo qual contrato venceu e quando — e que o acesso volta com a renovação.'],
            ['01b-painel-loja.png', 'A Loja vê quem está bloqueado, os usuários atingidos e os contratos que vencem nos próximos 30 dias.'],
            ['01c-usuario-bloqueado.png', 'Em Usuários, a conta aparece como "bloqueado" com o motivo — distinta de quem foi inativado à mão.']] },

  { n: '02', st: 'ok', fit: 'contain', alt: 560, t: 'Informações de entrega e cotação de frete para o fornecedor',
    resumo: `Ao responder a cotação, o fornecedor passa a ver um bloco de entrega <b>acima do campo de frete</b>: nome da revenda, cidade/UF, endereço completo com CEP, telefone e as observações de entrega do cadastro. A mesma informação vai no e-mail do convite e no lembrete.`,
    aceite: `Na ${D.cotacao}, o destino aparece antes do campo "Valor do frete": ${D.revenda} · ${D.cidade} · ${D.endereco}.`,
    fotos: [['02b-modal-proposta.png', 'Na tela do fornecedor, o bloco "Entrega — para onde vai a mercadoria" abre no topo da proposta, acima do campo "Valor do frete".']] },

  { n: '03', st: 'ok', t: 'Nomenclatura do destino no documento do Pedido de Compra',
    resumo: `"Destino do Atendimento" trazia o <b>fornecedor</b> — nome, CNPJ e telefone — sob um rótulo que a logística lê como endereço de entrega. Corrigimos os dois lados: o bloco do fornecedor passou a se chamar "Fornecedor que atende o pedido", e entrou uma seção nova <b>"Destino logístico de entrega da mercadoria (Local de entrega)"</b> com o endereço real.`,
    aceite: `No documento de ${D.pedidoDoc}: o rótulo antigo não existe mais e a seção nova traz quem recebe, CNPJ, endereço completo, CEP e observações de entrega.`,
    fotos: [['03a-doc-destino.png', 'A seção de destino logístico no documento do pedido, com o endereço de entrega da revenda.']] },

  { n: '04', st: 'ok', t: 'Dados cadastrais e fiscais no pedido enviado ao fornecedor',
    resumo: `O documento ganhou a seção <b>"Dados cadastrais e fiscais dos itens"</b> com descrição completa, categoria, unidade, NCM, GTIN/EAN, pesos bruto e líquido, dimensões e cubagem. Item com ficha incompleta é apontado, nomeando o que falta, em vez de sair omitido. O e-mail do encaminhamento leva os mesmos dados.`,
    aceite: 'O fornecedor recebe, no próprio pedido, o necessário para faturar e expedir sem pedir complemento.',
    fotos: [['04a-doc-ficha.png', 'A seção fiscal do documento: NCM, GTIN/EAN, pesos, dimensões e cubagem por item.']] },

  { n: '05', st: 'ok', t: 'Anexo do pedido segregado por fornecedor',
    resumo: `O documento passou a ser <b>recortado por fornecedor</b>: cada um recebe só os itens adjudicados a ele, e o nome dos demais participantes não aparece. A Loja continua vendo o pedido inteiro. O fornecedor ganhou o botão "📄 PDF dos meus itens" na tela de pedidos recebidos.`,
    aceite: `Em ${D.pedidoDoc}, dividido entre ${D.fornA} e ${D.fornB}: o documento do fornecedor traz ${D.codA} e não traz ${D.codB}.`,
    fotos: [['05c-doc-fornecedor.png', 'O documento do fornecedor diz que é o recorte dele e lista apenas os itens que lhe foram adjudicados.'],
            ['05a-doc-loja-completo.png', 'A mesma tela pela Loja: o pedido inteiro, com os dois fornecedores.']] },

  { n: '06', st: 'ok', fit: 'contain', alt: 420, t: 'Retorno de status pela Loja para correção de documentos',
    resumo: `A Loja ganhou a ação <b>"Recusar documento…"</b> no faturamento: informa o motivo, o faturamento volta a pendente de regularização e o fornecedor reenvia a documentação corrigida. O fornecedor não edita um faturamento já enviado — ele reenvia, e todo o histórico fica preservado.`,
    aceite: `${D.nf} retornada com motivo; o histórico registra quem devolveu e quando, e a trilha do pedido também.`,
    fotos: [['06b-modal-recusa.png', 'A recusa exige o motivo e avisa o que acontece em seguida.'],
            ['06d-fornecedor-corrige.png', 'Do lado do fornecedor, o faturamento volta a aparecer pendente de regularização, com o motivo.']] },

  { n: '07', st: 'ok', alt: 520, t: 'Confirmação e recusa parcial de recebimento por fornecedor',
    resumo: `O recebimento deixou de ser global. A revenda passa a ver <b>"Recebimento por fornecedor"</b>, com Confirmar e Recusar para cada um: confirmar um não encerra os demais, e recusar um (com motivo obrigatório) não desfaz a confirmação dos outros. O status geral do pedido reflete a situação consolidada.`,
    aceite: `Em ${D.pedidoDoc}, com dois fornecedores: um confirmado e o outro ainda pendente, sem o pedido concluir.`,
    fotos: [['07a-recebimento-por-fornecedor.png', 'Na tela da revenda, cada fornecedor do pedido tem a sua própria situação e as suas próprias ações.'],
            ['07c-modal-confirmar.png', 'O modal deixa explícito que a confirmação vale só para aquele fornecedor.']] },

  { n: '08', st: 'analise', t: 'Restrição de visualização de produtos por revenda ou perfil',
    resumo: `<b>Análise entregue</b> (docs/analise-restricao-produtos-e-branding.md). A funcionalidade existe e é mais estreita que a necessidade: restringe <b>por revenda individual</b>, em dois mecanismos — visibilidade por fornecedor e bloqueio de produto a produto — aplicados ao catálogo, à busca e, por consequência, à criação de pedidos. <b>Gaps:</b> não há restrição por grupo, categoria ou região; não há visão "quem vê este produto"; o padrão é aberto; e a restrição é de interface, não de sigilo.`,
    aceite: 'Comportamento atual documentado e cinco gaps priorizados, com recomendação em ordem de custo/benefício.',
    fotos: [['08a-restricao-revenda.png', 'A configuração atual, no detalhe da revenda: visibilidade por fornecedor e bloqueio produto a produto.']] },

  { n: '09', st: 'ok', t: 'Filtro de período flexível na área de relatórios',
    resumo: `A página de relatórios ganhou uma barra única de <b>Data Inicial e Data Final</b>, válida para as duas visões, para os indicadores, para as tabelas e para as exportações. Atalhos: Hoje, Últimos 7 dias, Últimos 30 dias, Mês atual, Mês anterior e Todo o período. O filtro de data isolado da visão de produtos foi removido para não haver dois períodos concorrentes.`,
    aceite: 'Período aplicado recalcula tudo na página; a exportação de pedidos traz exatamente as linhas do período.',
    fotos: [['09a-barra-periodo.png', 'A barra de período no topo da página, com os atalhos e o aviso de que vale para a página toda.'],
            ['09c-outra-visao-mesmo-periodo.png', 'A visão de produtos herda o mesmo período — não pede datas de novo.']] },

  { n: '10', st: 'analise', fit: 'contain', alt: 460, t: 'Identidade visual e branding da plataforma',
    resumo: `<b>Análise entregue</b> (mesmo documento). A marca aparece em quatro camadas: selo "CI" (CSS puro, 4 pontos), nome na interface (29 ocorrências), e-mails (um único layout alcança os 29 modelos) e domínio (já configurável por tela). A troca é viável e de baixo risco. O ponto que exige decisão: "Loja Cidade Imperial" é o <b>papel</b> de quem compra do fornecedor — trocar por Bravva mudaria o sentido das mensagens.`,
    aceite: 'Pendente de definição do negócio: logo em SVG, nome exato, paleta, domínio com SPF/DKIM e se o nome da operadora vira configuração.',
    fotos: [['10a-identidade-atual.png', 'A identidade atual na entrada da plataforma — o que seria substituído pela marca Bravva.']] },
]

const ok = ITENS.filter((i) => i.st === 'ok').length
const an = ITENS.filter((i) => i.st === 'analise').length

const selo = (st) => st === 'ok'
  ? `<span style="font-size:10.5px;font-weight:700;letter-spacing:.08em;color:${VERDE};background:#e9f3ea;border:1px solid #cfe0d1;border-radius:7px;padding:4px 10px;white-space:nowrap">IMPLEMENTADO ✓</span>`
  : `<span style="font-size:10.5px;font-weight:700;letter-spacing:.08em;color:${AZUL};background:#e9f0fa;border:1px solid #cfd9ea;border-radius:7px;padding:4px 10px;white-space:nowrap">ANÁLISE ENTREGUE</span>`

const html = `
<div style="width:1400px;background:#f7f4ee;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:${DARK}">

  <div style="background:${DARK};padding:34px 48px 30px;color:#fff">
    <div style="display:flex;align-items:center;gap:14px;margin-bottom:26px">
      <div style="width:44px;height:44px;border-radius:11px;background:linear-gradient(135deg,#cfa055,${GOLD} 60%,#8a6428);display:flex;align-items:center;justify-content:center;font-family:Georgia,serif;font-weight:700;font-size:19px;color:#fff">CI</div>
      <div>
        <div style="font-family:Georgia,serif;font-weight:700;font-size:17px;letter-spacing:.12em">CIDADE IMPERIAL</div>
        <div style="font-size:10.5px;letter-spacing:.16em;color:#b9b0a2;margin-top:2px">PLATAFORMA DA LOJA</div>
      </div>
      <div style="margin-left:auto;font-size:11px;font-weight:700;letter-spacing:.1em;color:#8fd39c;border:1px solid #3f5a45;background:#26332a;border-radius:7px;padding:6px 13px">${ok} IMPLEMENTADOS · ${an} ANÁLISES</div>
    </div>
    <div style="font-size:30px;font-weight:700;line-height:1.2">Rodada de 10 itens — situação e evidências</div>
    <div style="font-size:14px;color:#b9b0a2;line-height:1.6;margin-top:10px;max-width:980px">Resposta item a item à ata de 05/10/2026. Cada item traz o que foi feito, o critério de aceite verificado e a tela que comprova. As evidências foram capturadas da aplicação em execução, sobre base limpa.</div>
  </div>

  <div style="padding:28px 48px 6px">
    <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:11px">
      ${ITENS.map((i) => `<div style="background:#fff;border:1px solid ${i.st === 'ok' ? '#cfe0d1' : '#cfd9ea'};border-radius:11px;padding:12px 13px">
        <div style="font-size:11px;font-weight:700;color:#a89f90;letter-spacing:.08em">ITEM ${i.n}</div>
        <div style="font-size:12px;font-weight:600;line-height:1.4;margin:5px 0 8px;height:50px;overflow:hidden">${i.t}</div>
        <div style="font-size:9.5px;font-weight:700;letter-spacing:.06em;color:${i.st === 'ok' ? VERDE : AZUL}">${i.st === 'ok' ? '✓ IMPLEMENTADO' : '◆ ANÁLISE'}</div>
      </div>`).join('')}
    </div>
    <div style="font-size:12px;color:#a89f90;margin-top:14px;line-height:1.6">Os itens 08 e 10 foram classificados na ata como <b>análise para resposta</b>; a resposta escrita de ambos está em <b>docs/analise-restricao-produtos-e-branding.md</b>. Os oito demais foram implementados, testados e publicados.</div>
  </div>

  <div style="padding:20px 48px 40px">
    ${ITENS.map((i) => `
    <div style="background:#fff;border:1px solid #eae3d6;border-radius:13px;overflow:hidden;margin-bottom:22px">
      <div style="padding:17px 22px;border-bottom:1px solid #f1ece2">
        <div style="display:flex;align-items:center;gap:13px">
          <div style="width:34px;height:34px;border-radius:9px;background:#faf3e4;border:1px solid #e6cf9e;color:#8f682a;font-size:14px;font-weight:700;display:flex;align-items:center;justify-content:center;flex:none">${i.n}</div>
          <div style="font-size:16px;font-weight:700;flex:1">${i.t}</div>
          ${selo(i.st)}
        </div>
        <div style="font-size:13px;color:#4a453d;line-height:1.65;margin-top:11px">${i.resumo}</div>
        <div style="font-size:12px;color:${i.st === 'ok' ? VERDE : AZUL};background:${i.st === 'ok' ? '#f4f9f4' : '#f1f5fb'};border:1px solid ${i.st === 'ok' ? '#d9e8db' : '#d5dfee'};border-radius:9px;padding:9px 12px;line-height:1.55;margin-top:11px"><b>${i.st === 'ok' ? 'Critério de aceite verificado:' : 'Resultado da análise:'}</b> ${i.aceite}</div>
      </div>
      <div>
        <div style="font-size:12px;color:#8a8378;line-height:1.5;padding:11px 22px 9px">${i.fotos[0][1]}</div>
        <img src="${img(i.fotos[0][0])}" style="width:100%;height:${i.alt || 440}px;object-fit:${i.fit || 'cover'};object-position:top center;background:#f7f4ee;display:block">
      </div>
      ${i.fotos.length > 1 ? `<div style="font-size:11.5px;color:#a89f90;line-height:1.55;padding:10px 22px;border-top:1px solid #f5f1e8">Também verificado: ${i.fotos.slice(1).map(([, l]) => l).join(' · ')}</div>` : ''}
    </div>`).join('')}
  </div>

  <div style="background:${DARK};color:#9c948a;font-size:11.5px;padding:17px 48px;display:flex;justify-content:space-between">
    <span>Plataforma Cidade Imperial · Cervejaria Cidade Imperial · evidências de implementação</span>
    <span>Rodada de 10 itens — ata de 05/10/2026</span>
  </div>
</div>`

const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true })
const pg = await br.newPage({ viewport: { width: 1400, height: 1200 }, deviceScaleFactor: 1.5 })
await pg.setContent(html)
await pg.waitForTimeout(1200)
// fatias para conferência visual do relatório montado
if (process.env.FATIAS) {
  await pg.setViewportSize({ width: 1400, height: 1400 })
  const alt = await pg.evaluate(() => document.documentElement.scrollHeight)
  for (let y = 0, i = 1; y < alt; y += 1400, i++) {
    await pg.evaluate((yy) => window.scrollTo(0, yy), y)
    await pg.waitForTimeout(250)
    await pg.screenshot({ path: resolve(DIR, 'fatia-' + String(i).padStart(2, '0') + '.png') })
  }
  await pg.evaluate(() => window.scrollTo(0, 0))
}
const pdf = resolve(here, '../Plataforma-Cidade-Imperial-Evidencias-Rodada-10-Itens.pdf')
await pg.emulateMedia({ media: 'print' })
await pg.addStyleTag({ content: '@page{margin:0;size:1400px 1000px} img{break-inside:avoid} div{break-inside:avoid}' })
await pg.pdf({ path: pdf, width: '1400px', height: '1000px', printBackground: true })
await br.close()
console.log('PDF ok:', pdf)
