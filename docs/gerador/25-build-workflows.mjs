// Documento dos workflows da Plataforma Cidade Imperial — explicação completa
// e fluxogramas. As etapas, as situações, as permissões e os e-mails são lidos
// do próprio código da aplicação, para o documento não sair defasado.
import { chromium } from 'playwright'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { TEMPLATES } from '../../server/src/email-templates.js'

const here = dirname(fileURLToPath(import.meta.url))
const SRC = readFileSync(resolve(here, '../../web/index.html'), 'utf8')

// ── dados lidos da aplicação ────────────────────────────────────────────
// Recorta o literal do array pela contagem de colchetes: sobrevive a qualquer
// mudança de formatação no código da aplicação.
const arrayDe = (marca) => {
  const b = SRC.slice(SRC.indexOf(marca))
  const ini = b.indexOf('[')
  let d = 0, fim = -1
  for (let i = ini; i < b.length; i++) {
    const c = b[i]
    if (c === '[') d++
    else if (c === ']') { d--; if (d === 0) { fim = i; break } }
  }
  return new Function('return ' + b.slice(ini, fim + 1))()
}
const ETAPAS = arrayDe('ETAPAS_PED=[')
const PERMS = arrayDe('PERMS=[')
const TRANSPS = arrayDe('TRANSPS=[')
const EMAILS = Object.keys(TEMPLATES)

// ── paleta ──────────────────────────────────────────────────────────────
const GOLD = '#B38335', DARK = '#272525', VERDE = '#2f6b39', ROXO = '#5d3f96'
const AZUL = '#33568f', VERM = '#a33a2b', TEAL = '#1f6b5e', ROSA = '#9c3563'
const PAPEL = '#f7f4ee', BORDA = '#eae3d6', CINZA = '#8a8378'

const ATOR = {
  revenda: { cor: ROSA, bg: '#fdeef4', nome: 'Revenda' },
  loja: { cor: GOLD, bg: '#faf3e4', nome: 'Loja Cidade Imperial' },
  fornecedor: { cor: ROXO, bg: '#f3eefa', nome: 'Fornecedor' },
  sistema: { cor: AZUL, bg: '#e9eef8', nome: 'Plataforma (automático)' },
  alerta: { cor: VERM, bg: '#fbeae7', nome: 'Recusa / exceção' },
  ok: { cor: VERDE, bg: '#e9f3ea', nome: 'Conclusão' },
}

// ── helpers de SVG ──────────────────────────────────────────────────────
const esc = (s) => String(s == null ? '' : s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]))
// quebra o texto pela largura da caixa (aproximação por largura média do glifo)
const quebrar = (txt, larg, fonte) => {
  const max = Math.max(6, Math.floor(larg / (fonte * 0.53)))
  const linhas = []; let atual = ''
  String(txt).split(/\s+/).forEach((p) => {
    if (!atual) { atual = p; return }
    if ((atual + ' ' + p).length <= max) atual += ' ' + p
    else { linhas.push(atual); atual = p }
  })
  if (atual) linhas.push(atual)
  return linhas
}
const texto = (x, y, txt, { fonte = 12.5, cor = DARK, peso = 400, larg = 200, meio = true } = {}) => {
  const ls = quebrar(txt, larg, fonte)
  const alt = ls.length * (fonte * 1.28)
  const y0 = meio ? y - alt / 2 + fonte * 0.95 : y
  return ls.map((l, i) => `<text x="${x}" y="${y0 + i * fonte * 1.28}" font-size="${fonte}" fill="${cor}" font-weight="${peso}" text-anchor="${meio ? 'middle' : 'start'}">${esc(l)}</text>`).join('')
}
// caixa de ação, colorida pelo ator
const NO = (x, y, w, h, titulo, sub, ator = 'loja', tipo = 'acao') => {
  const a = ATOR[ator] || ATOR.loja
  const rx = tipo === 'inicio' ? h / 2 : 10
  const fundo = tipo === 'inicio' ? a.cor : a.bg
  const corTxt = tipo === 'inicio' ? '#fff' : DARK
  const tracejado = tipo === 'auto' ? 'stroke-dasharray="5 4"' : ''
  // o título e o subtítulo são centrados como um bloco só: caixa apertada
  // deixa de sobrepor as duas linhas quando o título quebra
  const altT = quebrar(titulo, w - 16, 12.5).length * 16
  const altS = sub ? quebrar(sub, w - 14, 10.5).length * 13.44 : 0
  const topo = y + (h - (altT + (sub ? 5 + altS : 0))) / 2
  return `<g><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fundo}" stroke="${a.cor}" stroke-width="1.6" ${tracejado}/>`
    + texto(x + w / 2, topo + altT / 2, titulo, { fonte: 12.5, peso: 700, larg: w - 16, cor: corTxt })
    + (sub ? texto(x + w / 2, topo + altT + 5 + altS / 2, sub, { fonte: 10.5, cor: tipo === 'inicio' ? '#f0e6d4' : CINZA, larg: w - 14 }) : '')
    + '</g>'
}
const DECISAO = (cx, cy, w, h, txt) =>
  `<g><polygon points="${cx},${cy - h / 2} ${cx + w / 2},${cy} ${cx},${cy + h / 2} ${cx - w / 2},${cy}" fill="#fff" stroke="${GOLD}" stroke-width="1.6"/>`
  + texto(cx, cy, txt, { fonte: 11.5, peso: 700, larg: w - 34 }) + '</g>'
// rótulo com fundo branco: a linha nunca risca o texto
const ROTULO = (x, y, txt, cor = '#9c948a', larg = 190) => {
  const f = 10.5
  const ls = quebrar(txt, larg, f)
  const w = Math.max(...ls.map((l) => l.length)) * f * 0.53 + 12
  const h = ls.length * f * 1.28 + 6
  return `<g><rect x="${x - w / 2}" y="${y - h / 2}" width="${w}" height="${h}" rx="5" fill="#fff" opacity=".95"/>`
    + texto(x, y, txt, { fonte: f, cor, peso: 700, larg }) + '</g>'
}
// seta ortogonal: reta, ou cotovelo 'hv' (anda na horizontal e desce) / 'vh'
const SETA = (x1, y1, x2, y2, rot, { via = 'reta', cor = '#9c948a', tracejada = false, rx = 0, ry = 0 } = {}) => {
  let d = `M ${x1} ${y1} L ${x2} ${y2}`
  let lx = (x1 + x2) / 2, ly = (y1 + y2) / 2
  const horizontal = Math.abs(x2 - x1) >= Math.abs(y2 - y1)
  if (via === 'reta') { if (horizontal) ly -= 13; else lx += 4 }
  if (via === 'hv') { d = `M ${x1} ${y1} L ${x2} ${y1} L ${x2} ${y2}`; lx = (x1 + x2) / 2; ly = y1 - 13 }
  if (via === 'vh') { d = `M ${x1} ${y1} L ${x1} ${y2} L ${x2} ${y2}`; lx = (x1 + x2) / 2; ly = y2 - 13 }
  return `<path d="${d}" fill="none" stroke="${cor}" stroke-width="1.7" marker-end="url(#seta)" ${tracejada ? 'stroke-dasharray="6 4"' : ''}/>`
    + (rot ? ROTULO(lx + rx, ly + ry, rot, cor) : '')
}
// ponto de junção: onde um caminho que voltou reencontra a linha principal
const JUNCAO = (x, y, cor = '#9c948a') => `<circle cx="${x}" cy="${y}" r="4.5" fill="${cor}"/>`
// caminho ortogonal livre, para desvios que precisam de mais de um cotovelo
const CAMINHO = (pts, { cor = '#9c948a', ponta = true, tracejada = false } = {}) =>
  `<path d="M ${pts.map((q) => q.join(' ')).join(' L ')}" fill="none" stroke="${cor}" stroke-width="1.7"${
    ponta ? ' marker-end="url(#seta)"' : ''}${tracejada ? ' stroke-dasharray="6 4"' : ''}/>`
const svg = (w, h, corpo) => `<svg viewBox="0 0 ${w} ${h}" width="100%" style="display:block">
  <defs><marker id="seta" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
    <path d="M 0 0 L 10 5 L 0 10 z" fill="#9c948a"/></marker></defs>${corpo}</svg>`

// ── helpers de página ───────────────────────────────────────────────────
const paginas = []
const pagina = (kicker, titulo, corpo) => paginas.push(`
  <section class="pg">
    <div class="cab"><div class="marca"><span class="ci">CI</span><span>CIDADE IMPERIAL · PLATAFORMA DA LOJA</span></div>
      <div class="kick">${esc(kicker)}</div></div>
    <h1>${esc(titulo)}</h1>
    ${corpo}
    <div class="rod"><span>Workflows da Plataforma Cidade Imperial</span><span class="pn"></span></div>
  </section>`)

const p = (t) => `<p class="tx">${t}</p>`
const nota = (t, cor = GOLD) => `<div class="nota" style="border-left-color:${cor}">${t}</div>`
const tabela = (cols, linhas, larguras) => `<table class="tb"><thead><tr>${cols.map((c, i) =>
  `<th${larguras && larguras[i] ? ` style="width:${larguras[i]}"` : ''}>${esc(c)}</th>`).join('')}</tr></thead><tbody>${
  linhas.map((l) => `<tr>${l.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table>`
const legenda = () => `<div class="leg">${Object.entries(ATOR).map(([k, a]) =>
  `<span><i style="background:${a.bg};border-color:${a.cor}"></i>${esc(a.nome)}</span>`).join('')}</div>`

// ════════════════════════════════════════════════════════════════════════
// CAPA
// ════════════════════════════════════════════════════════════════════════
paginas.push(`
  <section class="pg capa">
    <div class="capa-in">
      <div class="logo">CI</div>
      <div class="cmarca">CIDADE IMPERIAL</div>
      <div class="csub">PLATAFORMA DA LOJA · CERVEJARIA CIDADE IMPERIAL</div>
      <h1 class="ctit">Workflows da plataforma</h1>
      <div class="cdesc">Como funciona cada fluxo, do pedido da revenda à conclusão da entrega e ao acerto do royalty — com fluxograma, regras e o que cada perfil faz em cada passo.</div>
      <div class="cbox">
        <div><b>${ETAPAS.length}</b><span>etapas no workflow do pedido</span></div>
        <div><b>13</b><span>fluxos documentados</span></div>
        <div><b>${EMAILS.length}</b><span>avisos automáticos por e-mail</span></div>
        <div><b>${PERMS.reduce((a, m) => a + m.itens.length, 0)}</b><span>permissões controladas</span></div>
      </div>
      <div class="cfoot">Documento gerado a partir do código da aplicação — etapas, situações, permissões e e-mails são lidos da própria plataforma.</div>
    </div>
  </section>`)

// ════════════════════════════════════════════════════════════════════════
// 1 · MAPA GERAL
// ════════════════════════════════════════════════════════════════════════
{
  const d = svg(1300, 415, [
    NO(20, 30, 200, 62, 'Catálogo', 'a revenda monta o pedido', 'revenda', 'inicio'),
    SETA(220, 61, 280, 61),
    NO(280, 30, 200, 62, 'Pedido', 'a Loja recebe e decide', 'loja'),
    SETA(380, 92, 380, 140),
    NO(120, 140, 220, 66, 'Cotação', 'propostas e rodadas', 'fornecedor'),
    NO(370, 140, 220, 66, 'Envio direto', 'sem cotação', 'loja'),
    NO(620, 140, 220, 66, 'Estoque da Loja', 'a Loja como fornecedora', 'loja'),
    SETA(380, 92, 230, 140, '', { via: 'hv' }),
    SETA(380, 92, 730, 140, '', { via: 'hv' }),
    NO(370, 240, 220, 62, 'Aceite comercial', 'a revenda aprova', 'revenda'),
    SETA(230, 206, 480, 240, '', { via: 'vh' }),
    SETA(480, 206, 480, 240),
    SETA(730, 206, 480, 240, '', { via: 'vh' }),
    NO(370, 336, 220, 62, 'Atendimento', 'confirmação e produção', 'fornecedor'),
    SETA(480, 302, 480, 336),
    NO(660, 336, 200, 62, 'Faturamento', 'nota fiscal à revenda', 'fornecedor'),
    SETA(590, 367, 660, 367),
    NO(890, 336, 190, 62, 'Rastreio', 'transportadora e link', 'fornecedor'),
    SETA(860, 367, 890, 367),
    NO(1100, 336, 180, 62, 'Recebimento', 'a revenda confirma', 'ok'),
    SETA(1080, 367, 1100, 367),
    NO(890, 240, 190, 62, 'Royalties', 'fechamento e cobrança', 'loja'),
    SETA(760, 336, 985, 302, '', { via: 'vh' }),
    NO(1100, 30, 180, 62, 'Cadastros', 'produtos, revendas, fornecedores', 'loja'),
    NO(1100, 130, 180, 62, 'Estoque', 'inventário', 'loja'),
    NO(1100, 230, 180, 62, 'Acesso', 'usuários e permissões', 'sistema'),
    SETA(1100, 61, 480, 61, 'alimentam o catálogo e o atendimento', { cor: '#a89f90', tracejada: true, ry: -6 }),
  ].join(''))
  pagina('Visão geral', 'O mapa dos fluxos',
    p('A plataforma tem um fluxo principal — o <b>pedido</b> — e fluxos que se conectam a ele em pontos definidos. Tudo começa no catálogo da revenda e termina na confirmação de que o material chegou; entre os dois extremos, a Loja escolhe <b>como</b> o pedido será atendido, e essa escolha determina o caminho.')
    + `<div class="fig">${d}</div>` + legenda()
    + p('<b>Três caminhos de atendimento, um mesmo trilho.</b> Cotação, envio direto e estoque da Loja convergem para o mesmo ponto: o aceite comercial da revenda. A partir dali o caminho é idêntico — confirmação, produção, faturamento, rastreio, recebimento —, inclusive quando quem atende é a própria Loja com estoque próprio.')
    + nota('<b>Leitura do documento:</b> cada fluxo tem uma página com o fluxograma, as regras que a plataforma impõe e o que fica registrado. As cores identificam quem age: revenda, Loja, fornecedor ou a própria plataforma, quando a ação é automática.'))
}

// ════════════════════════════════════════════════════════════════════════
// 2 · ATORES
// ════════════════════════════════════════════════════════════════════════
{
  const linhas = [
    ['<b>Revenda</b>', 'Bar, choperia, adega ou empório que compra da Loja',
      'Monta o pedido no catálogo · aprova ou recusa as condições comerciais · conversa com a Loja no pedido · confirma o recebimento do material',
      'Só enxerga os próprios pedidos e o catálogo liberado para ela. No catálogo não vê fornecedores — compra da Loja.'],
    ['<b>Loja Cidade Imperial</b>', 'A operação da cervejaria — o centro do fluxo',
      'Recebe e analisa pedidos · decide o atendimento (cotação, envio direto ou estoque próprio) · negocia · escolhe a proposta vencedora · fatura o estoque próprio · apura e cobra royalties · mantém os cadastros',
      'Enxerga tudo. Cada ação é controlada por permissão individual e registrada na auditoria.'],
    ['<b>Fornecedor</b>', 'Quem produz ou distribui o que a Loja revende',
      'Responde cotações com preço, prazo, frete e condições · confirma o pedido recebido · informa o rastreio da entrega · fatura direto para a revenda · complementa a ficha técnica dos produtos',
      'Só enxerga cotações para as quais foi convidado e pedidos com itens seus. Nunca vê a proposta de outro fornecedor.'],
    ['<b>Administrador técnico</b>', 'Quem configura a plataforma',
      'Cria usuários e define permissões · configura o envio de e-mail · liga a análise fiscal por IA · consulta a auditoria completa',
      'Pode assumir a visão de qualquer perfil para conferência, sem deixar de ser identificado na auditoria.'],
  ]
  pagina('Quem faz o quê', 'Os quatro perfis e o que cada um enxerga',
    p('Cada perfil vê um recorte diferente da mesma operação. O que separa um do outro não é só o menu: é a <b>regra de visibilidade</b>, aplicada em cada tela, e a <b>permissão</b>, verificada em cada ação.')
    + tabela(['Perfil', 'Quem é', 'O que faz no fluxo', 'O que enxerga'], linhas, ['13%', '17%', '42%', '28%'])
    + nota('<b>Grupo econômico:</b> um mesmo usuário de revenda pode estar vinculado a várias revendas. Ele troca a revenda ativa sem novo login e tem uma visão consolidada do grupo — que é somente consulta: para criar pedido ou aprovar condições, é preciso escolher uma revenda.', ROSA)
    + nota('<b>Permissão é individual.</b> Cada usuário nasce com o padrão do seu perfil e pode ter qualquer permissão ligada ou desligada no editor. A ação negada é registrada na auditoria como tentativa — não é um erro silencioso.', AZUL))
}

// ════════════════════════════════════════════════════════════════════════
// 3 · FLUXO DO PEDIDO — AS 10 ETAPAS
// ════════════════════════════════════════════════════════════════════════
{
  const y = 60, w = 118, h = 78, gap = 10
  const cores = ['revenda', 'loja', 'fornecedor', 'revenda', 'loja', 'fornecedor', 'fornecedor', 'fornecedor', 'fornecedor', 'ok']
  const nos = ETAPAS.map((e, i) => {
    const x = 20 + i * (w + gap)
    return NO(x, y, w, h, String(i + 1) + '. ' + e, '', cores[i], i === 0 ? 'inicio' : 'acao')
      + (i < ETAPAS.length - 1 ? SETA(x + w, y + h / 2, x + w + gap, y + h / 2) : '')
  }).join('')
  const d = svg(1300, 212, nos
    + `<rect x="20" y="${y + h + 34}" width="256" height="30" rx="8" fill="#fff" stroke="${BORDA}"/>`
    + texto(148, y + h + 49, 'Criação e análise', { fonte: 11.5, peso: 700, cor: CINZA, larg: 240 })
    + `<rect x="${20 + 2 * (w + gap)}" y="${y + h + 34}" width="${2 * w + gap}" height="30" rx="8" fill="#fff" stroke="${BORDA}"/>`
    + texto(20 + 2 * (w + gap) + w + gap / 2, y + h + 49, 'Negociação', { fonte: 11.5, peso: 700, cor: CINZA, larg: 240 })
    + `<rect x="${20 + 4 * (w + gap)}" y="${y + h + 34}" width="${4 * w + 3 * gap}" height="30" rx="8" fill="#fff" stroke="${BORDA}"/>`
    + texto(20 + 4 * (w + gap) + (4 * w + 3 * gap) / 2, y + h + 49, 'Atendimento e faturamento', { fonte: 11.5, peso: 700, cor: CINZA, larg: 400 })
    + `<rect x="${20 + 8 * (w + gap)}" y="${y + h + 34}" width="${2 * w + gap}" height="30" rx="8" fill="#fff" stroke="${BORDA}"/>`
    + texto(20 + 8 * (w + gap) + w + gap / 2, y + h + 49, 'Entrega', { fonte: 11.5, peso: 700, cor: CINZA, larg: 240 })
    + texto(20, y - 26, 'A etapa do pedido é sempre a do item MAIS ATRASADO — um pedido com um item em cotação e outro já faturado mostra a etapa da cotação.', { fonte: 11.5, cor: CINZA, larg: 1260, meio: false }))
  pagina('Fluxo principal', 'O pedido e suas ' + ETAPAS.length + ' etapas',
    p('Todo pedido percorre a mesma régua de etapas, e a plataforma calcula a etapa a partir da <b>situação dos itens</b> — ninguém "muda o status" à mão. Etapas que não se aplicam ao caminho escolhido aparecem riscadas na linha do tempo do pedido: um pedido sem cotação não passa por "Seleção do vencedor".')
    + `<div class="fig">${d}</div>` + legenda()
    + tabela(['Etapa', 'Quem age', 'O que acontece', 'Como a plataforma sabe'], [
      ['1. ' + ETAPAS[0], 'Loja', 'O pedido criado pela revenda aguarda análise. A Loja recebe (aprova) ou rejeita, no todo ou item a item — rejeição exige justificativa.', 'Item na situação <i>pendente</i>'],
      ['2. ' + ETAPAS[1], 'Loja', 'Item aprovado aguarda a decisão de atendimento: cotação, envio direto ou estoque próprio da Loja.', 'Item <i>aprovado</i>'],
      ['3. ' + ETAPAS[2], 'Fornecedor', 'A cotação está aberta e já recebeu ao menos uma proposta.', 'Item <i>em cotação</i> com proposta registrada'],
      ['4. ' + ETAPAS[3], 'Revenda', 'As condições comerciais foram fechadas e aguardam o aceite da revenda, item a item.', 'Item <i>aguardando aceite</i>'],
      ['5. ' + ETAPAS[4], 'Loja', 'Aceito, o item segue para quem vai atender.', 'Item <i>no fornecedor</i>, sem confirmação'],
      ['6. ' + ETAPAS[5], 'Fornecedor', 'Quem atende confirma que recebeu o pedido e vai produzir/separar.', 'Item <i>no fornecedor</i>, aguardando confirmação'],
      ['7. ' + ETAPAS[6], 'Fornecedor', 'Pedido confirmado, em produção ou separação.', 'Confirmação registrada no pedido'],
      ['8. ' + ETAPAS[7], 'Fornecedor', 'A nota fiscal é emitida direto para a revenda, com anexo obrigatório.', 'Faturamento registrado'],
      ['9. ' + ETAPAS[8], 'Revenda', 'Material entregue: o pedido para aqui até alguém confirmar que chegou.', 'Item <i>faturado</i> sem confirmação de recebimento'],
      ['10. ' + ETAPAS[9], '—', 'Recebimento confirmado pela revenda (ou pela Loja em nome dela). Ciclo encerrado.', 'Confirmação de recebimento registrada'],
    ], ['21%', '9%', '48%', '22%'])
    + nota('<b>O pedido não conclui sozinho.</b> Faturado não é entregue: a etapa 9 só vira 10 quando alguém confirma o recebimento do material. É a diferença entre "a nota saiu" e "o material chegou".', VERDE))
}

// ════════════════════════════════════════════════════════════════════════
// 4 · MÁQUINA DE ESTADOS DO ITEM
// ════════════════════════════════════════════════════════════════════════
{
  const d = svg(1300, 400, [
    NO(30, 24, 170, 58, 'pendente', 'criado pela revenda', 'revenda', 'inicio'),
    SETA(200, 53, 285, 53, 'a Loja recebe'),
    NO(285, 24, 170, 58, 'aprovado', 'aguarda decisão', 'loja'),
    SETA(115, 82, 115, 300, 'rejeita', { cor: VERM }),
    NO(30, 300, 170, 58, 'rejeitado', 'com justificativa', 'alerta'),
    SETA(455, 53, 545, 53, 'abre cotação'),
    NO(545, 24, 170, 58, 'em cotação', 'aguarda propostas', 'fornecedor'),
    SETA(630, 82, 630, 165, 'escolhe vencedor', { rx: 8 }),
    NO(545, 165, 170, 58, 'aguardando aceite', 'condições fechadas', 'revenda'),
    SETA(370, 82, 545, 194, 'envio direto ou estoque da Loja', { via: 'vh' }),
    SETA(715, 194, 810, 194, 'a revenda aceita'),
    NO(810, 165, 170, 58, 'no fornecedor', 'em atendimento', 'fornecedor'),
    SETA(980, 194, 1075, 194, 'fatura'),
    NO(1075, 165, 170, 58, 'faturado', 'nota emitida', 'fornecedor'),
    // a recusa desce até uma faixa livre e volta pela esquerda
    `<path d="M 630 223 L 630 265 L 370 265 L 370 82" fill="none" stroke="${VERM}" stroke-width="1.7" marker-end="url(#seta)"/>`,
    ROTULO(500, 265, 'recusa: volta à negociação (ou à decisão da Loja)', VERM, 250),
    NO(810, 300, 435, 58, 'recebimento confirmado — pedido concluído', 'a revenda (ou a Loja) confirma que o material chegou', 'ok'),
    SETA(1160, 223, 1160, 300),
  ].join(''))
  pagina('Fluxo principal', 'As situações de um item — e como ele anda',
    p('O pedido é um conjunto de itens, e cada item tem a sua própria situação. É por isso que um mesmo pedido pode ter um item em cotação, outro já faturado e um terceiro rejeitado — e é por isso que a Loja pode <b>combinar caminhos</b> de atendimento no mesmo pedido.')
    + `<div class="fig">${d}</div>`
    + p('<b>Quantidade parcial.</b> Ao escolher o caminho de atendimento, a Loja pode enviar só parte da quantidade de um item; o saldo continua aprovado e pode seguir por outro caminho. O item se divide em dois, cada um com a sua situação.')
    + nota('<b>Situação antiga:</b> itens marcados como "Estoque da Loja" antes de a Loja passar a percorrer o fluxo inteiro continuam válidos como entregues — o histórico dos pedidos anteriores não muda.', CINZA)
    + nota('<b>Recusa da revenda tem dois destinos.</b> Item que veio de cotação volta para "em cotação" e uma nova rodada é aberta automaticamente com os fornecedores convidados. Item atendido pelo estoque da Loja volta para "aprovado" — não há cotação para reabrir, então a decisão volta inteira para a Loja.', VERM))
}

// ════════════════════════════════════════════════════════════════════════
// 5 · COTAÇÃO
// ════════════════════════════════════════════════════════════════════════
{
  const d = svg(1300, 372, [
    NO(20, 20, 185, 70, 'Loja abre a cotação', 'itens, quantidades, prazo e convidados', 'loja', 'inicio'),
    SETA(205, 55, 260, 55),
    NO(260, 20, 185, 70, 'Convite por e-mail', 'sem valores — o preço é o que se pede', 'sistema', 'auto'),
    SETA(445, 55, 500, 55),
    NO(500, 20, 185, 70, 'Fornecedor propõe', 'preço por item, frete, prazo e condições', 'fornecedor'),
    SETA(685, 55, 745, 55),
    DECISAO(855, 55, 215, 88, 'Prazo encerrado ou propostas suficientes?'),
    SETA(963, 55, 1050, 55, 'sim'),
    NO(1050, 20, 190, 70, 'Loja compara', 'mapa de propostas com frete e prazo', 'loja'),
    // lembrete e volta para a proposta, numa faixa livre
    SETA(855, 99, 855, 135, 'não', { rx: 22 }),
    NO(760, 135, 190, 58, 'Lembrete ao fornecedor', 'mesma lista, sem valores', 'sistema', 'auto'),
    `<path d="M 760 164 L 715 164 L 715 110 L 592 110 L 592 90" fill="none" stroke="#9c948a" stroke-width="1.7" marker-end="url(#seta)"/>`,
    SETA(1145, 90, 1145, 122),
    DECISAO(1145, 164, 215, 88, 'Preço satisfatório?'),
    SETA(1145, 208, 1145, 250, 'sim', { rx: 20 }),
    NO(1050, 250, 190, 66, 'Escolha do vencedor', 'total ou item a item', 'loja'),
    SETA(1050, 283, 785, 283),
    NO(545, 250, 240, 66, 'Aceite comercial da revenda', 'etapa 4 do pedido', 'revenda'),
    // nova rodada: volta pela faixa de baixo, sem cruzar nenhuma caixa
    `<path d="M 1037 164 L 1000 164 L 1000 345 L 300 345 L 300 316" fill="none" stroke="${GOLD}" stroke-width="1.7" marker-end="url(#seta)"/>`,
    ROTULO(1000, 230, 'não — nova rodada', GOLD, 120),
    NO(190, 250, 240, 66, 'Nova rodada', 'itens e fornecedores selecionados, com observação da Loja', 'loja'),
    `<path d="M 190 283 L 150 283 L 150 110 L 352 110 L 352 90" fill="none" stroke="${GOLD}" stroke-width="1.7" marker-end="url(#seta)"/>`,
    ROTULO(150, 200, 'novo convite', GOLD, 110),
  ].join(''))
  pagina('Fluxo de compra', 'Cotação: do convite à proposta vencedora',
    p('A cotação existe para descobrir preço. Quem recebe o convite é justamente quem vai propor o valor, então o convite <b>não mostra preço nenhum</b> — nem o de catálogo, para não ancorar a proposta. O fornecedor vê o que precisa cotar: item, código, quantidade, prazo e o que a Loja espera.')
    + `<div class="fig">${d}</div>`
    + nota('<b>Escolher proposta que não é a de menor preço com frete exige justificativa</b> — registrada na cotação e na auditoria. A plataforma não impede a escolha; ela obriga a explicar.', VERM)
    + tabela(['Regra', 'Como funciona'], [
      ['<b>Quantidade cotada</b>', 'Pode ser <b>maior</b> que a do pedido da revenda — cotar volume maior para conseguir preço melhor. O excedente é volume de negociação: o pedido da revenda não muda e é por ele que ela é faturada.'],
      ['<b>Convidados</b>', 'Só fornecedores homologados e vinculados aos produtos cotados. Com um único convidado a cotação funciona, mas não há comparação — a plataforma avisa.'],
      ['<b>Rodadas</b>', 'A Loja pode reabrir a negociação quantas vezes quiser, escolhendo itens e fornecedores. Cada rodada carrega uma observação ("preço do 30L 8% abaixo", "frete CIF") que vai no e-mail e aparece para o fornecedor ao montar a contraproposta.'],
      ['<b>Propostas efetivas</b>', 'O preço mais recente de cada item prevalece; a proposta anterior fica no histórico. A Loja pode dar a cotação inteira a um fornecedor ou dividir item a item entre vários.'],
      ['<b>Economia apurada</b>', 'A plataforma separa o ganho da <b>escolha</b> (menor proposta da 1ª rodada contra a referência) do ganho da <b>negociação</b> (1ª rodada contra o fechamento).'],
    ], ['16%', '84%']))
}

// ════════════════════════════════════════════════════════════════════════
// 6 · ACEITE COMERCIAL
// ════════════════════════════════════════════════════════════════════════
{
  const d = svg(1300, 400, [
    NO(20, 40, 190, 66, 'Condições fechadas', 'cotação encerrada, envio direto ou estoque da Loja', 'loja', 'inicio'),
    SETA(210, 73, 265, 73),
    NO(265, 40, 175, 66, 'E-mail à revenda', 'quem vai atender, valores, frete, prazo e pagamento', 'sistema', 'auto'),
    SETA(440, 73, 495, 73),
    NO(495, 40, 185, 66, 'Revenda abre a aprovação comercial', 'decide ITEM A ITEM', 'revenda'),
    SETA(680, 73, 760, 73),
    DECISAO(870, 73, 210, 90, 'Aceita as condições do item?'),
    SETA(975, 73, 1060, 73, 'sim'),
    NO(1060, 40, 215, 66, 'Item segue para atendimento', 'etapa 5 — encaminhamento', 'fornecedor'),
    SETA(870, 118, 870, 190, 'não — motivo obrigatório', { cor: VERM }),
    DECISAO(870, 240, 210, 84, 'Veio de cotação?'),
    SETA(765, 240, 560, 240, 'sim', { cor: VERM }),
    NO(350, 210, 210, 62, 'Nova rodada automática', 'itens recusados voltam à negociação, prazo de 7 dias', 'loja'),
    SETA(870, 282, 870, 330, 'não (estoque da Loja)', { cor: VERM }),
    NO(760, 330, 220, 56, 'Volta para a decisão da Loja', 'item volta a "aprovado", sem preço', 'loja'),
    SETA(350, 241, 200, 340, '', { via: 'vh', cor: VERM }),
    NO(20, 320, 180, 56, 'Fornecedores avisados', 'e-mail com a nova rodada', 'sistema', 'auto'),
  ].join(''))
  pagina('Fluxo de compra', 'Aceite comercial da revenda',
    p('Nenhum pedido é atendido sem que a revenda aprove as <b>condições comerciais</b> — preço negociado, frete, prazo de entrega e forma de pagamento. A aprovação é <b>por item</b>: a revenda pode aceitar parte do pedido e recusar o resto.')
    + `<div class="fig">${d}</div>`
    + p('A janela de aprovação mostra, para cada item, quem vai atender, o valor unitário e total negociado, o frete (modalidade e valor), o prazo de entrega e as condições de pagamento. Recusar exige <b>motivo</b> — que fica na trilha do pedido, na auditoria e no e-mail que a Loja recebe.')
    + nota('<b>Quem atende pode ser a própria Loja.</b> Quando o atendimento é pelo estoque próprio, a Loja aparece como parte que atende e passa pelo mesmo aceite — sem atalho. É o que garante que a revenda nunca é faturada por condições que não aprovou.', ROSA))
}

// ════════════════════════════════════════════════════════════════════════
// 7 · ATENDIMENTO PELA LOJA
// ════════════════════════════════════════════════════════════════════════
{
  const d = svg(1300, 385, [
    NO(20, 34, 195, 90, 'Loja marca "Atender com estoque da Loja"', 'itens e quantidades', 'loja', 'inicio'),
    SETA(215, 79, 265, 79),
    NO(265, 34, 195, 90, 'Informa as condições comerciais', 'preço por item, prazo, validade, pagamento e frete', 'loja'),
    SETA(460, 79, 515, 79),
    NO(515, 34, 185, 90, 'Aceite comercial da revenda', 'etapa 4 — igual a qualquer fornecedor', 'revenda'),
    SETA(700, 79, 770, 79, 'aceita'),
    NO(770, 34, 190, 90, 'Loja confirma a separação', 'equivale à confirmação do pedido pelo fornecedor', 'loja'),
    SETA(960, 79, 1020, 79),
    NO(1020, 34, 190, 90, 'Loja fatura', 'nota fiscal à revenda, sem royalty', 'loja'),
    SETA(1115, 124, 1115, 180),
    NO(1020, 180, 190, 64, 'Rastreio da entrega', 'obrigatório se o frete é da Loja (CIF)', 'loja'),
    SETA(1020, 212, 900, 212),
    NO(700, 180, 200, 64, 'Recebimento confirmado', 'pedido concluído — etapa 10', 'ok'),
    SETA(607, 124, 607, 300, 'recusa', { cor: VERM }),
    NO(500, 300, 220, 62, 'Item volta para a decisão da Loja', 'sem cotação para reabrir, sem preço negociado', 'alerta'),
    // a recusa volta pela faixa livre abaixo das caixas, sem cruzar nenhuma
    SETA(500, 331, 115, 124, 'a decisão volta inteira para a Loja', { via: 'hv', cor: VERM, ry: -14 }),
  ].join(''))
  pagina('Fluxo de compra', 'Atendimento pelo estoque da Loja',
    p('Atender com estoque próprio <b>não é atalho</b>. A Loja entra no fluxo como qualquer fornecedor cuja proposta foi aprovada: informa as condições comerciais, espera o aceite da revenda, confirma a separação, fatura, informa o rastreio e a entrega é confirmada.')
    + `<div class="fig">${d}</div>`
    + tabela(['O que a Loja informa', 'Por quê'], [
      ['Preço unitário de cada item', 'É o valor pelo qual a revenda será faturada — vem preenchido com o de catálogo e é editável.'],
      ['Prazo de entrega e validade da proposta', 'As mesmas exigências de uma proposta de fornecedor.'],
      ['Condições de pagamento', 'A revenda aprova sabendo como e quando vai pagar.'],
      ['Frete: modalidade, valor e transportadora', 'Define quem paga o frete e se o rastreio será obrigatório.'],
    ], ['30%', '70%'])
    + nota('<b>Sem royalty sobre o próprio estoque.</b> Royalty é o que o fornecedor paga à Loja pela venda feita através da plataforma; quando a vendedora é a própria Loja, não há o que cobrar de si mesma. A nota entra no faturamento do mês sem linha de royalty.', GOLD)
    + nota('<b>Efeito no estoque:</b> a saída só conta depois que a revenda aprova as condições — proposta recusada não tira nada da posição. O saldo em si continua sendo a contagem do último inventário lançado; o atendimento aparece na coluna "Atendido desde o lançamento", como sinal de que a posição pode estar envelhecendo.', TEAL))
}

// ════════════════════════════════════════════════════════════════════════
// 8 · FATURAMENTO E DOCUMENTOS FISCAIS
// ════════════════════════════════════════════════════════════════════════
{
  const d = svg(1300, 392, [
    // linha principal
    NO(20, 40, 180, 70, 'Fornecedor abre o faturamento', 'só os itens dele no pedido', 'fornecedor', 'inicio'),
    SETA(200, 75, 250, 75),
    NO(250, 40, 210, 70, 'Valor faturado + nota fiscal', 'PDF ou XML obrigatório; boleto opcional', 'fornecedor'),
    SETA(460, 75, 515, 75),
    DECISAO(620, 75, 205, 94, 'Frete é do fornecedor?'),
    SETA(723, 75, 833, 75, 'não'),
    DECISAO(935, 75, 205, 94, 'Análise fiscal por IA ligada?'),
    SETA(1038, 75, 1105, 75, 'não'),
    NO(1105, 40, 175, 70, 'Faturamento registrado', 'etapa 8 concluída', 'ok'),
    // os dois desvios de "sim" descem e voltam à linha por um ponto de junção
    SETA(620, 122, 620, 180, 'sim'),
    NO(520, 180, 200, 62, 'Rastreio obrigatório', 'transportadora, código e link do padrão dela', 'fornecedor'),
    CAMINHO([[620, 242], [620, 292], [780, 292], [780, 75]], { ponta: false }),
    JUNCAO(780, 75),
    SETA(935, 122, 935, 180, 'sim'),
    NO(835, 180, 200, 62, 'Documento conferido', 'a nota bate com o pedido', 'sistema', 'auto'),
    CAMINHO([[935, 242], [935, 292], [1072, 292], [1072, 75]], { ponta: false }),
    JUNCAO(1072, 75),
    // royalty e o caminho da recusa do documento
    SETA(1175, 110, 1175, 180),
    NO(1105, 180, 140, 62, 'Royalty apurado', 'percentual do contrato vigente', 'loja'),
    CAMINHO([[1265, 110], [1265, 332], [915, 332]], { cor: VERM }),
    ROTULO(1105, 332, 'documento recusado', VERM, 190),
    NO(700, 300, 215, 64, 'Loja ou revenda recusa o documento', 'motivo obrigatório', 'alerta'),
    SETA(700, 332, 530, 332, '', { cor: VERM }),
    NO(330, 300, 200, 64, 'Fornecedor reenvia', 'pedido volta para a etapa 8', 'fornecedor'),
    SETA(380, 300, 380, 110, '', { cor: VERM }),
  ].join(''))
  pagina('Fluxo financeiro', 'Faturamento e documentos fiscais',
    p('O fornecedor fatura <b>direto para a revenda</b> — a Loja não entra na nota. O anexo do documento fiscal é obrigatório: sem PDF ou XML não há faturamento. O royalty da Loja é calculado sobre o valor faturado, pelo percentual do contrato vigente do fornecedor.')
    + `<div class="fig">${d}</div>`
    + tabela(['Ponto de controle', 'O que a plataforma faz'], [
      ['<b>Anexo obrigatório</b>', 'Sem o documento fiscal o faturamento não é concluído. O arquivo fica disponível para a Loja e para a revenda.'],
      ['<b>Análise fiscal por IA</b>', 'Quando ligada, o documento é conferido contra o pedido (fornecedor, revenda, valor e itens) antes de o faturamento ser aceito. Recusa registra o motivo na auditoria.'],
      ['<b>Rastreio</b>', 'Com frete por conta do fornecedor, o faturamento não passa sem transportadora, código e link de rastreio.'],
      ['<b>Recusa do documento</b>', 'Loja ou revenda pode recusar a nota com motivo. O pedido volta a pendente de regularização, o fornecedor é avisado e reenvia — todo o histórico é preservado.'],
      ['<b>Estoque próprio da Loja</b>', 'A Loja fatura pelo mesmo caminho, com nota anexada, mas sem royalty: a vendedora é ela mesma. A nota não oferece a ela a opção de recusar o próprio documento.'],
    ], ['20%', '80%']))
}

// ════════════════════════════════════════════════════════════════════════
// 9 · RASTREIO
// ════════════════════════════════════════════════════════════════════════
{
  const d = svg(1300, 372, [
    NO(20, 40, 180, 66, 'Pedido encaminhado', 'quem atende já pode informar', 'loja', 'inicio'),
    SETA(200, 73, 255, 73),
    DECISAO(370, 73, 215, 90, 'Quem paga o frete?'),
    SETA(478, 73, 570, 73, 'fornecedor (CIF)'),
    NO(570, 40, 190, 66, 'Rastreio OBRIGATÓRIO', 'sem ele o faturamento não conclui', 'fornecedor'),
    SETA(370, 118, 370, 190, 'revenda (FOB)'),
    NO(270, 190, 200, 56, 'Rastreio opcional', 'quem contrata o transporte é a revenda', 'revenda'),
    SETA(760, 73, 820, 73),
    NO(820, 40, 200, 66, 'Escolhe a transportadora', 'catálogo com ' + TRANSPS.length + ' opções', 'fornecedor'),
    SETA(920, 106, 920, 175),
    NO(820, 175, 200, 62, 'Código no padrão dela', 'validado pelo formato da transportadora', 'sistema', 'auto'),
    SETA(920, 237, 920, 290),
    NO(820, 290, 200, 60, 'Link montado e editável', 'testável antes de salvar', 'sistema', 'auto'),
    SETA(1020, 320, 1075, 320),
    NO(1075, 285, 205, 70, 'Revenda e Loja acompanham', 'etiqueta clicável, detalhe do pedido, PDF e e-mail', 'ok'),
  ].join(''))
  pagina('Fluxo de entrega', 'Rastreio da entrega',
    p('Quem paga o frete informa como acompanhar a entrega — e é a <b>negociação</b> que define quem paga. Proposta vencedora CIF (ou pedido sem cotação, que é o padrão) coloca o frete no fornecedor e torna o rastreio obrigatório; FOB deixa o transporte com a revenda e o rastreio opcional.')
    + `<div class="fig">${d}</div>`
    + p('<b>Padrão da transportadora.</b> A plataforma sabe como o documento se chama em cada transportadora (código de rastreamento, nº do CT-e, AWB), que formato ele tem e onde se consulta. O código é validado contra esse formato e o link é montado a partir dele — e continua editável, porque site de rastreio muda de endereço.')
    + nota('<b>Correção é sempre possível.</b> O rastreio anterior fica no histórico do pedido, a troca entra na trilha e na auditoria, e um novo aviso é enviado à revenda e à Loja.', ROXO)
    + nota('<b>Transportadoras no catálogo:</b> ' + TRANSPS.map((t) => t.nome).join(' · ') + '.', TEAL))
}

// ════════════════════════════════════════════════════════════════════════
// 10 · RECEBIMENTO
// ════════════════════════════════════════════════════════════════════════
{
  const d = svg(1300, 285, [
    NO(20, 50, 190, 66, 'Pedido faturado ou atendido', 'etapa 9 — entrega em curso', 'fornecedor', 'inicio'),
    SETA(210, 83, 280, 83),
    DECISAO(410, 83, 230, 92, 'Quem confirma o recebimento?'),
    SETA(525, 83, 620, 83, 'a revenda'),
    NO(620, 46, 205, 76, 'Revenda confirma', 'em "Meus pedidos", com observação opcional', 'revenda'),
    SETA(410, 129, 410, 200, 'a Loja, em nome dela'),
    NO(310, 200, 200, 62, 'Loja confirma', 'fica registrado que foi a Loja', 'loja'),
    SETA(510, 231, 720, 231, '', { via: 'hv' }),
    SETA(722, 122, 722, 175),
    NO(620, 175, 200, 62, 'Etapa 10 — Conclusão', 'ciclo encerrado', 'ok'),
    SETA(820, 206, 900, 206),
    NO(900, 171, 205, 70, 'Aviso ao outro lado', 'e-mail com quem confirmou e a observação', 'sistema', 'auto'),
  ].join(''))
  pagina('Fluxo de entrega', 'Confirmação de recebimento e conclusão',
    p('O pedido faturado <b>não conclui sozinho</b>. Ele para na etapa 9 até que alguém confirme que o material chegou. A confirmação é da revenda — mas a Loja também pode fazê-la, quando faz a conferência em nome dela; nesse caso fica registrado que foi a Loja.')
    + `<div class="fig">${d}</div>`
    + nota('<b>A observação do recebimento</b> é onde se registra avaria, divergência de quantidade ou quem recebeu no depósito. Ela fica no pedido, na trilha do pedido e no documento em PDF — e vai no e-mail que avisa o outro lado.', ROSA)
    + nota('<b>Por que isso importa:</b> sem essa etapa, "faturado" seria confundido com "entregue". A separação torna visível o intervalo entre a emissão da nota e a chegada do material — que é justamente onde moram os problemas de logística.', VERDE))
}

// ════════════════════════════════════════════════════════════════════════
// 11 · ROYALTIES
// ════════════════════════════════════════════════════════════════════════
{
  const d = svg(1300, 392, [
    NO(20, 40, 175, 66, 'Faturamento registrado', 'valor da nota do fornecedor', 'fornecedor', 'inicio'),
    SETA(195, 73, 250, 73),
    NO(250, 40, 175, 66, 'Royalty apurado', 'percentual do contrato vigente', 'sistema', 'auto'),
    SETA(425, 73, 480, 73),
    NO(480, 40, 175, 66, 'Competência mensal', 'agrupa por fornecedor e mês', 'loja'),
    SETA(655, 73, 710, 73),
    NO(710, 40, 175, 66, 'Fechamento', 'total faturado × royalty devido', 'loja'),
    SETA(885, 73, 940, 73),
    NO(940, 40, 185, 66, 'Cobrança emitida', 'vencimento sugerido pelo gatilho do contrato', 'loja'),
    SETA(1032, 106, 1032, 175),
    DECISAO(1032, 220, 210, 90, 'Pago até o vencimento?'),
    SETA(927, 220, 760, 220, 'não'),
    NO(560, 190, 200, 62, 'Aviso de atraso', 'e-mail ao fornecedor', 'sistema', 'auto'),
    SETA(1032, 265, 1032, 320, 'sim'),
    NO(930, 320, 200, 60, 'Pagamento registrado', 'com comprovante anexado', 'ok'),
    // o parcelamento é uma variação da cobrança, não um passo do caminho
    CAMINHO([[970, 106], [970, 140], [380, 140], [380, 292]], { cor: '#c0b6a4', tracejada: true }),
    NO(250, 292, 260, 88, 'Parcelamento da cobrança', 'o fechamento pode ser dividido em parcelas, com vencimento e baixa próprios', 'loja'),
  ].join(''))
  pagina('Fluxo financeiro', 'Royalties: da nota ao pagamento',
    p('O royalty é a contrapartida do fornecedor à Loja pelo acesso à rede de revendas. Ele é calculado <b>automaticamente</b> sobre cada nota fiscal emitida pelo fornecedor, no percentual do contrato vigente, e apurado por competência mensal.')
    + `<div class="fig">${d}</div>`
    + tabela(['Conceito', 'O que significa'], [
      ['<b>Contrato vigente</b>', 'Define o percentual, o dia acordado de pagamento e o gatilho. Alterações de percentual ficam no histórico do contrato.'],
      ['<b>Competência</b>', 'Mês de referência do faturamento. O fechamento agrupa por fornecedor e competência.'],
      ['<b>Gatilho de pagamento</b>', 'A data-base do vencimento: emissão da NF (padrão), entrada do pedido, recebimento do boleto ou outro gatilho contratual.'],
      ['<b>Parcelamento</b>', 'Um fechamento pode ser dividido em parcelas, cada uma com vencimento e baixa próprios.'],
      ['<b>Previsto × realizado</b>', 'O painel de recebíveis mostra o previsto, o realizado, o em aberto e a data do próximo recebimento por fornecedor.'],
      ['<b>Estoque próprio da Loja</b>', 'Não gera royalty e fica fora do fechamento — a Loja não cobra de si mesma.'],
    ], ['20%', '80%'])
    + nota('<b>De onde sai o vencimento.</b> O gatilho do contrato define a data-base: emissão da nota, entrada do pedido, recebimento do boleto ou outro acordo. O vencimento cai no dia acordado do mês seguinte à data do gatilho — e continua editável na emissão da cobrança.', GOLD))
}

// ════════════════════════════════════════════════════════════════════════
// 12 · CADASTROS POR PLANILHA
// ════════════════════════════════════════════════════════════════════════
{
  const d = svg(1300, 322, [
    NO(20, 50, 175, 66, 'Baixar o modelo', 'em branco com exemplos ou com os cadastros atuais', 'loja', 'inicio'),
    SETA(195, 83, 250, 83),
    NO(250, 50, 175, 66, 'Preencher a planilha', 'uma linha por registro', 'loja'),
    SETA(425, 83, 480, 83),
    NO(480, 50, 175, 66, 'Carregar o arquivo', 'XLSX ou CSV', 'loja'),
    SETA(655, 83, 710, 83),
    NO(710, 46, 200, 74, 'Prévia linha a linha', 'novo, atualiza ou erro — com o motivo', 'sistema', 'auto'),
    SETA(810, 120, 810, 180),
    DECISAO(810, 225, 215, 90, 'Confirmar a gravação?'),
    SETA(918, 225, 1010, 225, 'sim'),
    NO(1010, 194, 205, 62, 'Registros gravados', 'linhas com erro são ignoradas; tudo fica na auditoria', 'ok'),
    SETA(703, 225, 520, 225, 'não'),
    NO(320, 194, 200, 62, 'Nada é gravado', 'corrija a planilha e recarregue', 'alerta'),
    SETA(420, 194, 337, 120, ''),
  ].join(''))
  pagina('Cadastros', 'Importação por planilha — o mesmo motor para todos os cadastros',
    p('Fornecedores, produtos, categorias, revendas e usuários entram em massa pelo mesmo caminho: baixar o modelo, preencher, carregar e <b>conferir a prévia</b>. Nada é gravado antes da confirmação, e a chave de cada cadastro decide se a linha inclui ou atualiza.')
    + `<div class="fig">${d}</div>`
    + tabela(['Cadastro', 'Chave (identifica o registro)', 'Validações que recusam a linha'], [
      ['Fornecedores e Revendas', 'CNPJ', 'Nome em branco · CNPJ em branco, com dígitos a menos ou repetido na própria planilha'],
      ['Produtos', 'Código (em branco, a plataforma gera)', 'Descrição em branco · código repetido · preço inválido · fornecedor não cadastrado · <b>categoria fora do cadastro de categorias ou inativa</b> · NCM fora de 8 dígitos · código de barras com tamanho inválido · peso ou dimensão não numérica · endereço de imagem inválido · estoque não inteiro'],
      ['Categorias', 'Nome', 'Nome em branco, longo demais ou repetido'],
      ['Usuários', 'E-mail', 'Nome, e-mail ou perfil em branco · e-mail inválido ou repetido · vínculo não cadastrado · senha inicial ausente em usuário novo'],
    ], ['18%', '20%', '62%'])
    + nota('<b>A planilha de produtos carrega o produto inteiro:</b> além do cadastro básico, a ficha técnica (NCM, código de barras, pesos, dimensões, unidade de medida e observações), os endereços das imagens e a posição de estoque na Loja — que gera um lançamento de inventário preservando a contagem dos produtos que não vieram na planilha. Campo em branco não apaga o que já está cadastrado.', GOLD))
}

// ════════════════════════════════════════════════════════════════════════
// 13 · INVENTÁRIO
// ════════════════════════════════════════════════════════════════════════
{
  const d = svg(1300, 272, [
    NO(20, 44, 215, 78, 'Contagem física', 'na tela, por planilha ou pela carga de produtos', 'loja', 'inicio'),
    SETA(235, 83, 270, 83),
    NO(270, 44, 190, 78, 'Lançamento do inventário', 'data, responsável e observação', 'loja'),
    SETA(460, 83, 520, 83),
    NO(520, 44, 200, 78, 'Posição de estoque', 'o último lançamento É o saldo', 'sistema', 'auto'),
    SETA(720, 83, 780, 83),
    NO(780, 44, 200, 78, 'Disponibilidade nos pedidos', 'cobre / cobre parcialmente / sem saldo', 'loja'),
    SETA(880, 122, 880, 180),
    NO(780, 180, 200, 72, 'Atendimento pelo estoque', 'aparece em "atendido desde o lançamento"', 'loja'),
    SETA(780, 216, 620, 216, 'NÃO abate o saldo', { cor: VERM }),
    NO(400, 180, 210, 72, 'Só um novo lançamento muda a posição', '', 'alerta'),
    SETA(505, 180, 365, 122, ''),
  ].join(''))
  pagina('Cadastros', 'Inventário de estoque',
    p('O estoque da Loja funciona por <b>posição declarada</b>: o último inventário lançado é a posição válida. Atender um pedido com estoque próprio não abate o saldo automaticamente — a saída aparece como informação, para indicar que a contagem pode estar envelhecendo.')
    + `<div class="fig">${d}</div>`
    + p('A saída só entra na conta de "atendido desde o lançamento" depois que a revenda <b>aprova as condições</b> do atendimento pela Loja: proposta recusada não tira nada da posição.')
    + nota('<b>Por que não abater automaticamente:</b> a plataforma não é o sistema de estoque da cervejaria. Ela registra a posição informada e mostra o quanto saiu desde então, deixando explícito quando vale recontar — em vez de manter um saldo calculado que ninguém conferiu.', TEAL))
}

// ════════════════════════════════════════════════════════════════════════
// 14 · ACESSO, PERMISSÕES E AUDITORIA
// ════════════════════════════════════════════════════════════════════════
{
  const d = svg(1300, 282, [
    NO(20, 50, 180, 62, 'Login', 'e-mail e senha', 'sistema', 'inicio'),
    SETA(200, 81, 255, 81),
    NO(255, 50, 180, 62, 'Perfil identificado', 'admin, Loja, fornecedor ou revenda', 'sistema', 'auto'),
    SETA(435, 81, 490, 81),
    NO(490, 50, 190, 62, 'Menu e telas do perfil', 'só o que a permissão libera', 'sistema', 'auto'),
    SETA(680, 81, 735, 81),
    DECISAO(850, 81, 200, 86, 'Tem a permissão da ação?'),
    SETA(950, 81, 1050, 81, 'sim'),
    NO(1050, 50, 190, 62, 'Ação executada', 'registrada na auditoria', 'ok'),
    SETA(850, 124, 850, 190, 'não'),
    NO(750, 190, 200, 60, 'Ação negada', 'tentativa registrada na auditoria', 'alerta'),
    NO(1050, 170, 190, 70, 'Trilha e auditoria', 'quem, quando, o quê e de/para', 'loja'),
    SETA(1145, 112, 1145, 170),
    SETA(950, 220, 1050, 205),
  ].join(''))
  const mods = PERMS.map((m) => [`<b>${esc(m.mod)}</b>`, String(m.itens.length),
    m.itens.map((i) => esc(i[1])).join(' · ')])
  pagina('Governança', 'Acesso, permissões e auditoria',
    p('O perfil define o que aparece; a <b>permissão</b> define o que pode ser feito. São ' + PERMS.reduce((a, m) => a + m.itens.length, 0) + ' permissões em ' + PERMS.length + ' módulos, cada uma com um padrão por perfil e ajuste individual por usuário.')
    + `<div class="fig">${d}</div>`
    + tabela(['Módulo', 'Nº', 'Permissões'], mods, ['12%', '5%', '83%']))
}

// ════════════════════════════════════════════════════════════════════════
// 15 · COMUNICAÇÃO
// ════════════════════════════════════════════════════════════════════════
{
  const grupos = [
    ['Pedido', EMAILS.filter((e) => e.startsWith('pedido_') || e.startsWith('item_'))],
    ['Cotação', EMAILS.filter((e) => e.startsWith('cotacao_'))],
    ['Faturamento e documentos', EMAILS.filter((e) => e.startsWith('faturamento_') || e.startsWith('nf_'))],
    ['Royalties', EMAILS.filter((e) => e.startsWith('royalty_'))],
    ['Acesso', EMAILS.filter((e) => e.startsWith('usuario_'))],
  ]
  const linhas = grupos.map(([g, ev]) => [`<b>${esc(g)}</b>`, String(ev.length),
    ev.map((e) => `<code>${esc(e)}</code>`).join(' ')])
  pagina('Comunicação', 'Conversa do pedido e avisos automáticos',
    p('Duas formas de comunicação convivem: a <b>conversa do pedido</b>, que é humana e fica guardada no próprio pedido, e os <b>avisos automáticos</b>, disparados por evento do fluxo.')
    + `<div class="cols">
        <div class="cx"><h3>Conversa do pedido</h3>
          <p class="tx">Todo pedido tem um canal entre a Loja e a revenda, aberto desde a criação até depois do faturamento. Qualquer um dos dois lados inicia. Cada mensagem avisa o outro por e-mail, entra na auditoria, e o contador de não lidas aparece no menu e na linha do pedido.</p>
          <p class="tx">O histórico fica no pedido — não em caixas de e-mail ou aplicativos de mensagem — e sai impresso no documento do pedido em PDF.</p></div>
        <div class="cx"><h3>Avisos automáticos</h3>
          <p class="tx">São ${EMAILS.length} modelos de e-mail, disparados pelo evento e endereçados a quem precisa agir. O envio só acontece com a configuração de e-mail ativa; o conteúdo respeita a regra de visibilidade de cada destinatário.</p>
          <p class="tx"><b>Exemplo da regra:</b> o convite de cotação não mostra preço nenhum ao fornecedor, porque o preço é justamente o que ele vai propor. Já o aviso à Loja sobre a proposta recebida traz os valores.</p></div>
      </div>`
    + tabela(['Grupo', 'Nº', 'Eventos'], linhas, ['16%', '5%', '79%']))
}

// ════════════════════════════════════════════════════════════════════════
// 16 · O QUE FICA REGISTRADO
// ════════════════════════════════════════════════════════════════════════
{
  pagina('Governança', 'O que fica registrado — e onde',
    p('Nenhuma decisão do fluxo se perde. Três registros diferentes, com propósitos diferentes, cobrem o ciclo inteiro.')
    + `<div class="cols3">
        <div class="cx"><h3>Trilha do pedido</h3>
          <p class="tx">A história daquele pedido, em ordem: criação, recebimento, decisão de atendimento, abertura de cotação, aceite ou recusa da revenda, confirmação do fornecedor, faturamento, rastreio, recebimento do material. Cada linha traz data, hora e usuário.</p>
          <p class="tx">Toda mudança de etapa entra com o de/para, para ficar claro o que avançou.</p></div>
        <div class="cx"><h3>Histórico da cotação</h3>
          <p class="tx">Convites, propostas por rodada, observações enviadas aos fornecedores, adjudicação item a item, justificativa quando a escolhida não é a de menor preço, cancelamento.</p>
          <p class="tx">É o registro que sustenta a decisão de compra diante de uma auditoria.</p></div>
        <div class="cx"><h3>Auditoria da plataforma</h3>
          <p class="tx">Todas as ações de todos os perfis, com usuário, e-mail, perfil, módulo e severidade — incluindo <b>tentativas negadas</b> por falta de permissão e falhas de login.</p>
          <p class="tx">É a visão transversal: o que aconteceu na plataforma, não só num pedido.</p></div>
      </div>`
    + tabela(['Documento gerado', 'O que traz', 'Quem emite'], [
      ['<b>Documento do pedido (PDF)</b>', 'Ficha completa: partes e destino, situação e prazos, condições comerciais, itens com foto e ficha fiscal, cotação vinculada, faturamento, rastreio, anexos, conversa e trilha.', 'Loja e revenda, pela lista de pedidos ou pelo detalhe'],
      ['<b>Exportações em Excel</b>', 'Cadastros completos com os dados derivados — vínculos, contagens, valores, ficha técnica, imagens e estoque.', 'Loja, em cada tela de cadastro'],
      ['<b>Relatórios</b>', 'Pedidos, faturamentos, vendas por produto, royalties e recebíveis, com os filtros aplicados.', 'Loja, na tela de Relatórios'],
    ], ['22%', '56%', '22%']))
}

// ════════════════════════════════════════════════════════════════════════
// 17 · REGRAS QUE ATRAVESSAM TODOS OS FLUXOS
// ════════════════════════════════════════════════════════════════════════
{
  pagina('Síntese', 'As regras que atravessam todos os fluxos',
    p('Se o documento inteiro tivesse de caber numa página, seria esta. São as decisões que valem em qualquer ponto do sistema.')
    + tabela(['Regra', 'Onde ela aparece'], [
      ['<b>A etapa é calculada, não digitada</b>', 'A etapa do pedido vem da situação dos itens. Ninguém "muda o status" — muda-se o fato, e a etapa acompanha.'],
      ['<b>O item mais atrasado manda</b>', 'Um pedido com itens em pontos diferentes mostra a etapa do mais atrasado. Nada parece pronto antes de estar.'],
      ['<b>Nada avança sem o aceite da revenda</b>', 'Cotação, envio direto ou estoque da Loja: as condições comerciais passam pela aprovação da revenda, item a item.'],
      ['<b>Recusa sempre exige motivo</b>', 'Rejeição de pedido ou item, recusa comercial, recusa de documento fiscal. O motivo fica visível para o outro lado.'],
      ['<b>Faturado não é entregue</b>', 'A confirmação de recebimento é uma etapa própria, com autor e observação.'],
      ['<b>Quem paga o frete informa o rastreio</b>', 'Com frete do fornecedor, o faturamento não passa sem transportadora, código e link.'],
      ['<b>Cada um vê o que lhe cabe</b>', 'A revenda não vê fornecedores no catálogo nem valores não negociados; o fornecedor não vê proposta de concorrente nem preço de referência no convite.'],
      ['<b>Nada é gravado sem conferência</b>', 'Toda carga por planilha passa por uma prévia linha a linha, com o motivo de cada recusa.'],
      ['<b>Correção é caminho, não exceção</b>', 'Rastreio trocado, documento recusado e reenviado, nova rodada de negociação: o histórico anterior é preservado, não sobrescrito.'],
      ['<b>Toda ação tem autor e hora</b>', 'Trilha, histórico da cotação e auditoria — inclusive para o que foi negado por falta de permissão.'],
    ], ['26%', '74%'])
    + nota('<b>Documento gerado a partir do código.</b> As ' + ETAPAS.length + ' etapas, as ' + PERMS.reduce((a, m) => a + m.itens.length, 0) + ' permissões, os ' + EMAILS.length + ' modelos de e-mail e as ' + TRANSPS.length + ' transportadoras citadas aqui são lidos da própria aplicação no momento da geração — se a plataforma mudar, basta gerar de novo.', VERDE))
}

// ── montagem do HTML ────────────────────────────────────────────────────
const html = `<style>
  *{box-sizing:border-box}
  body{margin:0;background:#fff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:${DARK}}
  .pg{width:1400px;height:1000px;padding:34px 46px 46px;background:${PAPEL};position:relative;overflow:hidden;page-break-after:always}
  .cab{display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid ${BORDA};padding-bottom:10px}
  .marca{display:flex;align-items:center;gap:9px;font-size:10.5px;font-weight:700;letter-spacing:.14em;color:#a89f90}
  .ci{width:23px;height:23px;border-radius:6px;background:linear-gradient(135deg,#cfa055,${GOLD} 60%,#8a6428);color:#fff;
      display:flex;align-items:center;justify-content:center;font-family:Georgia,serif;font-size:11px;letter-spacing:0}
  .kick{font-size:10.5px;font-weight:700;letter-spacing:.14em;color:${GOLD};text-transform:uppercase}
  h1{font-size:27px;font-weight:700;margin:16px 0 10px;line-height:1.15}
  h3{font-size:14px;font-weight:700;margin:0 0 6px}
  .tx{font-size:13px;line-height:1.62;color:#4a453d;margin:0 0 10px;max-width:1290px}
  .fig{background:#fff;border:1px solid ${BORDA};border-radius:13px;padding:14px 16px;margin:10px 0 12px}
  .nota{background:#fff;border:1px solid ${BORDA};border-left:3px solid ${GOLD};border-radius:10px;padding:11px 15px;
        font-size:12.5px;line-height:1.6;color:#4a453d;margin-top:10px}
  .leg{display:flex;gap:16px;flex-wrap:wrap;font-size:11px;color:${CINZA};margin:-4px 0 10px}
  .leg span{display:flex;align-items:center;gap:6px}
  .leg i{width:12px;height:12px;border-radius:4px;border:1.5px solid;display:inline-block}
  .tb{width:100%;border-collapse:collapse;font-size:12px;background:#fff;border:1px solid ${BORDA};border-radius:11px;overflow:hidden}
  .tb th{text-align:left;padding:8px 13px;font-size:10px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;
         color:#a89f90;background:#faf7f0;border-bottom:1px solid ${BORDA}}
  .tb td{padding:8px 13px;border-top:1px solid #f5f1e8;line-height:1.5;color:#4a453d;vertical-align:top}
  .tb code{font-size:11px;color:#8f682a;background:#faf5e9;border-radius:4px;padding:1px 5px}
  .cols{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin:8px 0 12px}
  .cols3{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin:8px 0 12px}
  .cx{background:#fff;border:1px solid ${BORDA};border-radius:12px;padding:14px 17px}
  .cx .tx{font-size:12.5px;margin-bottom:8px}
  .rod{position:absolute;left:46px;right:46px;bottom:18px;display:flex;justify-content:space-between;
       font-size:10.5px;color:#a89f90;border-top:1px solid ${BORDA};padding-top:8px}
  .capa{background:${DARK};color:#fff;display:flex;align-items:center}
  .capa-in{padding:0 70px}
  .logo{width:58px;height:58px;border-radius:14px;background:linear-gradient(135deg,#cfa055,${GOLD} 60%,#8a6428);
        display:flex;align-items:center;justify-content:center;font-family:Georgia,serif;font-weight:700;font-size:25px;margin-bottom:26px}
  .cmarca{font-family:Georgia,serif;font-weight:700;font-size:22px;letter-spacing:.14em}
  .csub{font-size:11px;letter-spacing:.18em;color:#b9b0a2;margin-top:5px}
  .ctit{font-size:52px;margin:34px 0 16px;line-height:1.08}
  .cdesc{font-size:16px;line-height:1.65;color:#c9c1b4;max-width:840px}
  .cbox{display:flex;gap:44px;margin:44px 0 34px}
  .cbox b{display:block;font-size:34px;color:${GOLD}}
  .cbox span{font-size:12.5px;color:#b9b0a2}
  .cfoot{font-size:11.5px;color:#8a8378;border-top:1px solid #3a3735;padding-top:16px;max-width:840px}
</style>${paginas.join('')}`

const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true })
const pg = await br.newPage({ viewport: { width: 1400, height: 1000 }, deviceScaleFactor: 1.5 })
await pg.setContent(html)
await pg.waitForTimeout(900)
const pdf = resolve(here, '../Plataforma-Cidade-Imperial-Workflows.pdf')
await pg.emulateMedia({ media: 'print' })
await pg.addStyleTag({ content: '@page{margin:0;size:1400px 1000px}' })
await pg.pdf({ path: pdf, width: '1400px', height: '1000px', printBackground: true })
// PNG_DIR=/caminho gera também uma imagem por página, para conferir os diagramas
if (process.env.PNG_DIR) {
  await pg.emulateMedia({ media: 'screen' })
  const secs = await pg.locator('section.pg').all()
  for (let i = 0; i < secs.length; i++) {
    await secs[i].screenshot({ path: process.env.PNG_DIR + '/pg' + String(i + 1).padStart(2, '0') + '.png' })
  }
  console.log('PNGs em', process.env.PNG_DIR)
}
await br.close()
console.log('PDF ok:', pdf, '·', paginas.length, 'páginas')
