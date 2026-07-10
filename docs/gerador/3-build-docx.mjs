// Gera o documento Word (.docx) dos fluxos de e-mail, destacando o requisito
// "processo inteiro OU por item" e mostrando cada template já com a lista de itens.
// Uso:  node 3-build-docx.mjs
import pw from '/opt/node22/lib/node_modules/playwright/index.js'
import { writeFileSync } from 'node:fs'
import {
  Document, Packer, Paragraph, TextRun, HeadingLevel, ImageRun,
  Table, TableRow, TableCell, WidthType, AlignmentType, BorderStyle, ShadingType,
} from 'docx'
const { chromium } = pw
const { renderTemplate } = await import('file:///home/user/P018LJCDI/server/src/email-templates.js')
const OUT = '/home/user/P018LJCDI/docs/Plataforma-Cidade-Imperial-Fluxos-Email.docx'

const GOLD = 'B38335', DARK = '272525', GREY = '6B6459', CREAM = 'F7F4EE'

// Conjuntos de itens de exemplo (coerentes com os cenários)
const ped44 = [
  { codigo:'PRD-001', descricao:'Chopp Pilsen Imperial 30L', qtd:2, unidade:'Barril', valor:'R$ 1.240,00' },
  { codigo:'PRD-008', descricao:'Copo Caldereta personalizado (cx 12)', qtd:3, unidade:'Caixa', valor:'R$ 288,00' },
]
const cot08 = [
  { codigo:'PRD-002', descricao:'Chopp Pilsen Imperial 50L', qtd:2, unidade:'Barril', valor:'R$ 1.780,00' },
  { codigo:'PRD-001', descricao:'Chopp Pilsen Imperial 30L', qtd:1, unidade:'Barril', valor:'R$ 620,00' },
]
const cot07 = [
  { codigo:'PRD-007', descricao:'Cilindro CO₂ 10kg (recarga)', qtd:8, unidade:'Unidade', valor:'R$ 1.600,00' },
  { codigo:'PRD-008', descricao:'Copo Caldereta personalizado (cx 12)', qtd:6, unidade:'Caixa', valor:'R$ 612,00' },
]
const fat41 = [
  { codigo:'PRD-001', descricao:'Chopp Pilsen Imperial 30L', qtd:4, unidade:'Barril', valor:'R$ 2.480,00' },
  { codigo:'PRD-003', descricao:'Chopp IPA Imperial 30L', qtd:1, unidade:'Barril', valor:'R$ 740,00' },
]
const forn42 = [
  { codigo:'PRD-004', descricao:'Cerveja Puro Malte 600ml (cx 12)', qtd:15, unidade:'Caixa', valor:'R$ 2.220,00' },
  { codigo:'PRD-006', descricao:'Growler Cerâmica 1L', qtd:5, unidade:'Unidade', valor:'R$ 445,00' },
]
const rej46 = [{ codigo:'PRD-003', descricao:'Chopp IPA Imperial 30L', qtd:6, unidade:'Barril', valor:'R$ 4.440,00' }]

const WF = [
  { nome:'Pedidos', resumo:'Do carrinho da revenda à decisão de atendimento da Loja. A aprovação e a rejeição podem ser do pedido inteiro ou item a item.',
    eventos:[
      { id:'pedido_novo_loja', titulo:'Novo pedido para aprovação', gatilho:'A revenda finaliza um pedido', dest:'Loja (e-mail interno)', itens:true, contexto:'A Loja é avisada na hora de que há um pedido aguardando análise, com a lista de itens para decidir a aprovação (total ou por item).', vars:{pedidoId:'PED-0044',revendaNome:'Bar do Imperador',total:'R$ 1.528,00',data:'09/07/2026',itensLista:ped44} },
      { id:'pedido_recebido_revenda', titulo:'Confirmação de pedido recebido', gatilho:'A revenda finaliza o pedido', dest:'Revenda', itens:true, contexto:'Confirma ao cliente o recebimento do pedido, listando os itens solicitados.', vars:{pedidoId:'PED-0044',total:'R$ 1.528,00',data:'09/07/2026',itensLista:ped44} },
      { id:'pedido_aprovado', titulo:'Pedido aprovado', gatilho:'A Loja aprova o pedido (todos os itens)', dest:'Revenda', itens:true, contexto:'Aprovação do processo inteiro: o e-mail lista todos os itens aprovados.', vars:{pedidoId:'PED-0044',revendaNome:'Bar do Imperador',total:'R$ 1.528,00',itensLista:ped44} },
      { id:'item_aprovado', titulo:'Item aprovado', gatilho:'A Loja aprova um item específico', dest:'Revenda', itens:true, contexto:'Aprovação por item: o e-mail identifica o produto aprovado, mesmo quando o restante do pedido segue em análise.', vars:{pedidoId:'PED-0044',produto:'Chopp Pilsen Imperial 30L'} },
      { id:'pedido_rejeitado', titulo:'Pedido rejeitado', gatilho:'A Loja rejeita o pedido com justificativa', dest:'Revenda', itens:true, contexto:'Rejeição do processo inteiro: o e-mail traz o motivo e a lista de itens rejeitados.', vars:{pedidoId:'PED-0046',revendaNome:'Choperia Alto da Serra',justificativa:'Limite de crédito da revenda excedido no período.',itensLista:rej46} },
      { id:'item_rejeitado', titulo:'Item rejeitado', gatilho:'A Loja rejeita um item com justificativa', dest:'Revenda', itens:true, contexto:'Rejeição por item: identifica o produto recusado e o motivo, de forma rastreável.', vars:{pedidoId:'PED-0044',produto:'Copo Caldereta personalizado (cx 12)',justificativa:'Produto temporariamente indisponível.'} },
      { id:'pedido_fornecedor', titulo:'Pedido encaminhado ao fornecedor', gatilho:'A Loja define envio direto (itens selecionados)', dest:'Fornecedor', itens:true, contexto:'Só os itens encaminhados àquele fornecedor entram no e-mail — suporta atendimento por item.', vars:{pedidoId:'PED-0042',fornecedorNome:'Imperial Bebidas Ltda',revendaNome:'Empório Colonial',itensLista:forn42} },
      { id:'pedido_encaminhado_revenda', titulo:'Pedido encaminhado (aviso à revenda)', gatilho:'A Loja define envio direto', dest:'Revenda', itens:true, contexto:'Informa quais itens foram para qual fornecedor.', vars:{pedidoId:'PED-0042',fornecedorNome:'Imperial Bebidas Ltda',itensLista:forn42} },
      { id:'pedido_estoque_revenda', titulo:'Atendido pelo estoque da Loja', gatilho:'A Loja atende itens com estoque próprio', dest:'Revenda', itens:true, contexto:'Lista os itens que a própria Loja entregará, sem fornecedor.', vars:{pedidoId:'PED-0044',itensLista:ped44} },
    ]},
  { nome:'Cotações', resumo:'Processo competitivo de compra. A cotação pode incluir o pedido inteiro ou apenas itens selecionados; a decisão pode ser por vencedor único ou item a item.',
    eventos:[
      { id:'cotacao_convite', titulo:'Convite para cotação', gatilho:'A Loja abre cotação (itens selecionados)', dest:'Fornecedores convidados', itens:true, contexto:'O fornecedor recebe exatamente os itens a cotar e cota o preço por item.', vars:{cotacao:'COT-008',fornecedorNome:'Distribuidora Serra Verde',prazo:'15/07/2026',itensLista:cot08} },
      { id:'cotacao_lembrete', titulo:'Lembrete de proposta', gatilho:'A Loja envia um lembrete', dest:'Fornecedor', itens:true, contexto:'Relembra o fornecedor dos itens pendentes de proposta.', vars:{cotacao:'COT-008',fornecedorNome:'Imperial Bebidas Ltda',prazo:'15/07/2026',itensLista:cot08} },
      { id:'cotacao_proposta_loja', titulo:'Nova proposta recebida', gatilho:'O fornecedor registra a proposta (por item)', dest:'Loja', itens:true, contexto:'A Loja recebe o valor por item proposto, base para comparar e adjudicar.', vars:{cotacao:'COT-008',fornecedorNome:'Atacadão Fluminense',total:'R$ 2.240,00',itensLista:cot08} },
      { id:'cotacao_vencedor', titulo:'Proposta vencedora', gatilho:'A Loja escolhe o vencedor (todos os itens)', dest:'Fornecedor vencedor', itens:true, contexto:'Decisão do processo inteiro: o e-mail lista os itens adjudicados ao vencedor.', vars:{cotacao:'COT-007',fornecedorNome:'Atacadão Fluminense',valor:'R$ 2.212,00',itensLista:cot07} },
      { id:'cotacao_item_vencedor', titulo:'Item adjudicado', gatilho:'A Loja adjudica um item a um fornecedor', dest:'Fornecedor', itens:true, contexto:'Decisão por item: cada produto pode ter um vencedor diferente.', vars:{cotacao:'COT-007',fornecedorNome:'Atacadão Fluminense',produto:'Cilindro CO₂ 10kg (recarga)',valor:'R$ 1.600,00'} },
      { id:'cotacao_cancelada', titulo:'Cotação cancelada', gatilho:'A Loja cancela a cotação com motivo', dest:'Fornecedores convidados', itens:true, contexto:'Encerra o processo informando os itens que estavam em cotação.', vars:{cotacao:'COT-008',fornecedorNome:'Distribuidora Serra Verde',motivo:'Pedido de origem cancelado pela revenda.',itensLista:cot08} },
    ]},
  { nome:'Faturamento', resumo:'O fornecedor fatura diretamente à revenda; o sistema registra a nota, os itens e a base do royalty.',
    eventos:[
      { id:'faturamento_revenda', titulo:'Pedido faturado', gatilho:'O fornecedor registra o faturamento (NF)', dest:'Revenda', itens:true, contexto:'Confirma a nota fiscal e lista os itens faturados.', vars:{pedidoId:'PED-0041',nf:'NF-1207',fornecedorNome:'Distribuidora Serra Verde',valor:'R$ 3.220,00',itensLista:fat41} },
      { id:'faturamento_loja', titulo:'Faturamento registrado', gatilho:'O fornecedor fatura', dest:'Loja', itens:true, contexto:'Registra para a Loja o valor, o royalty e os itens faturados.', vars:{nf:'NF-1207',pedidoId:'PED-0041',fornecedorNome:'Distribuidora Serra Verde',valor:'R$ 3.220,00',royalty:'R$ 96,60',itensLista:fat41} },
    ]},
  { nome:'Royalties e Cobrança', resumo:'A Loja cobra o percentual contratual sobre o faturamento de cada fornecedor. Como é financeiro por competência, não há lista de itens.',
    eventos:[
      { id:'royalty_cobranca', titulo:'Cobrança de royalties', gatilho:'A Loja emite a cobrança da competência', dest:'Fornecedor', itens:false, contexto:'Cobrança do percentual sobre o faturamento do período (por competência, não por item).', vars:{competencia:'06/2026',fornecedorNome:'Imperial Bebidas Ltda',valor:'R$ 171,20'} },
      { id:'royalty_pagamento', titulo:'Pagamento registrado', gatilho:'A Loja registra o pagamento', dest:'Fornecedor', itens:false, contexto:'Confirma a quitação da competência com data e comprovante.', vars:{competencia:'06/2026',fornecedorNome:'Imperial Bebidas Ltda',valor:'R$ 171,20',data:'08/07/2026',comprovante:'PIX-88213'} },
    ]},
]

// ── Renderiza os templates para imagem ──
const pngSize = (buf) => ({ w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) })
const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium' })
const shot = await browser.newPage({ viewport:{width:640,height:900}, deviceScaleFactor:2 })
for (const wf of WF) for (const ev of wf.eventos) {
  const { subject, html } = renderTemplate(ev.id, ev.vars)
  ev.subject = subject
  await shot.setContent(html, { waitUntil:'networkidle' })
  const buf = await shot.locator('body > div').first().screenshot({ type:'png' })
  const { w, h } = pngSize(buf)
  const dw = 360, dh = Math.round(h * (dw / w))
  ev.image = new ImageRun({ data: buf, type:'png', transformation:{ width:dw, height:dh } })
}
await browser.close()

// ── Helpers docx ──
const run = (text, o={}) => new TextRun({ text, bold:o.bold, italics:o.italics, color:o.color, size:o.size, font:o.font })
const P = (children, o={}) => new Paragraph({ children: Array.isArray(children)?children:[run(children, o)], spacing:{ after:o.after??120, before:o.before??0 }, alignment:o.align })
const H1 = (t) => new Paragraph({ heading:HeadingLevel.HEADING_1, spacing:{before:240,after:140}, children:[run(t,{color:DARK,bold:true})] })
const H2 = (t) => new Paragraph({ heading:HeadingLevel.HEADING_2, spacing:{before:220,after:100}, children:[run(t,{color:GOLD,bold:true})] })
const H3 = (t) => new Paragraph({ heading:HeadingLevel.HEADING_3, spacing:{before:160,after:60}, children:[run(t,{color:DARK,bold:true})] })
const NOBORDER = { top:{style:BorderStyle.NONE},bottom:{style:BorderStyle.NONE},left:{style:BorderStyle.NONE},right:{style:BorderStyle.NONE},insideHorizontal:{style:BorderStyle.NONE},insideVertical:{style:BorderStyle.NONE} }
const cell = (children, o={}) => new TableCell({ children, shading:o.shading?{type:ShadingType.CLEAR,fill:o.shading}:undefined, width:o.width?{size:o.width,type:WidthType.PERCENTAGE}:undefined, margins:{top:60,bottom:60,left:100,right:100} })
function grid(headers, rows) {
  const hdr = new TableRow({ tableHeader:true, children: headers.map(h => cell([P(h,{bold:true,color:'FFFFFF'})],{shading:GOLD})) })
  const body = rows.map((r,i) => new TableRow({ children: r.map(c => cell([P(Array.isArray(c)?c:String(c))],{shading:i%2?'FAF7F0':'FFFFFF'})) }))
  return new Table({ width:{size:100,type:WidthType.PERCENTAGE}, rows:[hdr,...body] })
}
function infoBox(ev) {
  const line = (k,v) => new TableRow({ children:[ cell([P(k,{bold:true,color:GOLD,size:18})],{width:26,shading:'FAF7F0'}), cell([P(v,{size:20})],{width:74}) ] })
  return new Table({ width:{size:100,type:WidthType.PERCENTAGE}, rows:[
    line('Gatilho', ev.gatilho), line('Destinatário', ev.dest), line('Assunto', ev.subject),
    line('Itens no e-mail', ev.itens ? 'Sim — lista de produtos, quantidade/unidade e valor' : 'Não se aplica (financeiro por competência)'),
  ]})
}

const children = []
// Capa
children.push(new Paragraph({ spacing:{before:600,after:0}, children:[run('PLATAFORMA CIDADE IMPERIAL',{color:GOLD,bold:true,size:26})] }))
children.push(new Paragraph({ spacing:{after:80}, children:[run('Cervejaria Cidade Imperial',{color:GREY,size:20})] }))
children.push(new Paragraph({ spacing:{before:200,after:120}, children:[run('Fluxos de aprovação e comunicação por e-mail',{color:DARK,bold:true,size:44})] }))
children.push(P([run('Requisito atendido: aprovação de pedido, cotação e resposta de cotação — ',{size:22,color:GREY}), run('sempre para o processo inteiro ou por item específico',{size:22,color:DARK,bold:true}), run('. As comunicações por e-mail passam a conter a lista de itens do processo.',{size:22,color:GREY})]))
children.push(new Paragraph({ spacing:{before:200}, children:[run('Documento técnico · fluxos, templates e contexto de negócio',{italics:true,color:GREY,size:18})] }))

// 1. Requisito e conformidade
children.push(H1('1. Requisito e conformidade'))
children.push(P('O sistema permite executar aprovação e decisão tanto para o processo inteiro quanto para itens específicos. A tabela resume onde cada modo acontece na aplicação:'))
children.push(grid(['Fluxo','Processo inteiro','Por item','Onde na aplicação'], [
  ['Aprovação de pedido','Sim','Sim','Lista de Pedidos (botão Aprovar) e Detalhe do pedido (Aprovar por item)'],
  ['Rejeição de pedido','Sim','Sim','Idem, com justificativa obrigatória (do pedido ou do item)'],
  ['Abertura de cotação','Sim','Sim','Modal "Abrir cotação" › "Itens a cotar (não precisa ser o pedido inteiro)"'],
  ['Resposta de cotação (proposta)','—','Sim','Fornecedor informa "Preço unitário por item"'],
  ['Decisão de cotação (vencedor)','Sim','Sim','"Vencedora (todos os itens)" e "Adjudicação por item"'],
  ['Atendimento (estoque / envio direto)','Sim','Sim','Modais com seleção de itens'],
]))
children.push(P([run('Conclusão: ',{bold:true}), run('as rotinas já atendem ao requisito de "inteiro ou por item" em todos os fluxos citados. A correção necessária estava nas comunicações.',{})], {before:80}))

// 2. Correção aplicada
children.push(H1('2. Correção aplicada — itens nas comunicações'))
children.push(P('Antes, os e-mails traziam apenas a contagem de itens. Agora, cada comunicação de pedido, cotação e faturamento inclui a tabela de itens do processo (código, descrição, quantidade/unidade e valor), coerente com a decisão que foi tomada — inteira ou por item.'))
const evAll = WF.flatMap(w => w.eventos.map(e => [w.nome, e.titulo, e.itens ? 'Sim' : 'Não']))
children.push(grid(['Fluxo','Comunicação','Inclui itens?'], evAll))

// 3. Fluxos e templates
children.push(H1('3. Fluxos e templates de e-mail'))
for (const wf of WF) {
  children.push(H2(wf.nome))
  children.push(P(wf.resumo, {color:GREY}))
  for (const ev of wf.eventos) {
    children.push(H3(ev.titulo))
    children.push(infoBox(ev))
    children.push(P([run('Contexto de negócio: ',{bold:true,color:GOLD,size:20}), run(ev.contexto,{size:20})], {before:80}))
    children.push(new Paragraph({ alignment:AlignmentType.CENTER, spacing:{before:80,after:160}, children:[ev.image] }))
  }
}

// 4. Como ativar
children.push(H1('4. Como ativar os e-mails'))
children.push(P('1. Loja › Configurações Técnicas › Configuração de e-mail: informe o servidor SMTP, o remetente e o e-mail interno da Loja.'))
children.push(P('2. Ative o envio e use "Verificar conexão" e "Enviar e-mail de teste" para validar.'))
children.push(P('3. A partir daí, cada ação de pedidos, cotações, faturamento e royalties dispara automaticamente o e-mail correspondente, já com os itens do processo.'))
children.push(P('Enquanto o envio permanece desativado, nenhum e-mail é enviado — ideal para homologação.', {italics:true, color:GREY}))

const doc = new Document({
  creator:'Plataforma Cidade Imperial', title:'Fluxos de aprovação e comunicação por e-mail',
  styles:{ default:{ document:{ run:{ font:'Calibri', size:22, color:DARK } } } },
  sections:[{ properties:{ page:{ margin:{ top:1000, bottom:1000, left:1000, right:1000 } } }, children }],
})
const buffer = await Packer.toBuffer(doc)
writeFileSync(OUT, buffer)
console.log('DOCX gerado:', OUT, '·', WF.reduce((a,w)=>a+w.eventos.length,0), 'templates')
