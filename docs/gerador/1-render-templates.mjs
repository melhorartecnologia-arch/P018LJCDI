import pw from '/opt/node22/lib/node_modules/playwright/index.js';
import { writeFileSync } from 'node:fs';
const { chromium } = pw;
const { renderTemplate } = await import('file:///home/user/P018LJCDI/server/src/email-templates.js');

// ── Conteúdo: workflows, eventos, contexto de negócio, vars de exemplo ──
const WF = [
  { nome:'Pedidos', cor:'#8f682a', resumo:'Do carrinho da revenda à decisão de atendimento da Loja — cada mudança de status gera um aviso ao responsável.',
    eventos:[
      {id:'pedido_novo_loja', titulo:'Novo pedido para aprovação', gatilho:'A revenda finaliza um pedido no catálogo', dest:'Loja (e-mail interno)', contexto:'A Loja é avisada na hora de que há um pedido aguardando análise, reduzindo o tempo de resposta e evitando que pedidos fiquem parados.', vars:{pedidoId:'PED-0044',revendaNome:'Bar do Imperador',itens:'2',total:'R$ 1.528,00',data:'09/07/2026'}},
      {id:'pedido_recebido_revenda', titulo:'Confirmação de pedido recebido', gatilho:'A revenda finaliza o pedido', dest:'Revenda', contexto:'Dá segurança ao cliente de que o pedido chegou e está em análise — comunicação transacional que reduz dúvidas e recontatos.', vars:{pedidoId:'PED-0044',total:'R$ 1.528,00',data:'09/07/2026'}},
      {id:'pedido_aprovado', titulo:'Pedido aprovado', gatilho:'A Loja aprova o pedido (todos os itens)', dest:'Revenda', contexto:'Confirma que o pedido seguirá para atendimento e melhora a previsibilidade de compra da revenda.', vars:{pedidoId:'PED-0044',revendaNome:'Bar do Imperador',total:'R$ 1.528,00'}},
      {id:'item_aprovado', titulo:'Item aprovado', gatilho:'A Loja aprova um item específico', dest:'Revenda', contexto:'Suporta a aprovação por item: a revenda é informada quando parte do pedido avança, mesmo que o restante siga em análise.', vars:{pedidoId:'PED-0044',produto:'Chopp Pilsen Imperial 30L'}},
      {id:'pedido_rejeitado', titulo:'Pedido rejeitado', gatilho:'A Loja rejeita o pedido com justificativa', dest:'Revenda', contexto:'Transparência: a revenda recebe o motivo (ex.: limite de crédito), cumprindo a regra de justificativa obrigatória.', vars:{pedidoId:'PED-0046',revendaNome:'Choperia Alto da Serra',justificativa:'Limite de crédito da revenda excedido no período.'}},
      {id:'item_rejeitado', titulo:'Item rejeitado', gatilho:'A Loja rejeita um item com justificativa', dest:'Revenda', contexto:'Comunica recusas parciais de forma clara e rastreável, item a item.', vars:{pedidoId:'PED-0044',produto:'Copo Caldereta personalizado (cx 12)',justificativa:'Produto temporariamente indisponível.'}},
      {id:'pedido_fornecedor', titulo:'Pedido encaminhado ao fornecedor', gatilho:'A Loja define envio direto a um fornecedor', dest:'Fornecedor', contexto:'Aciona o fornecedor para faturar e entregar diretamente à revenda, agilizando o atendimento.', vars:{pedidoId:'PED-0042',fornecedorNome:'Imperial Bebidas Ltda',revendaNome:'Empório Colonial',itens:'2'}},
      {id:'pedido_encaminhado_revenda', titulo:'Pedido encaminhado (aviso à revenda)', gatilho:'A Loja define envio direto', dest:'Revenda', contexto:'Informa à revenda qual fornecedor fará a entrega, alinhando a expectativa de prazo.', vars:{pedidoId:'PED-0042',fornecedorNome:'Imperial Bebidas Ltda'}},
      {id:'pedido_estoque_revenda', titulo:'Atendido pelo estoque da Loja', gatilho:'A Loja atende com estoque próprio', dest:'Revenda', contexto:'Sinaliza que a própria Loja fará a entrega, sem depender de fornecedor.', vars:{pedidoId:'PED-0044',itens:'2'}},
    ]},
  { nome:'Cotações', cor:'#33568f', resumo:'Processo competitivo de compra: a Loja cota itens com vários fornecedores, recebe propostas e escolhe a melhor.',
    eventos:[
      {id:'cotacao_convite', titulo:'Convite para cotação', gatilho:'A Loja abre uma cotação com 2+ fornecedores', dest:'Fornecedores convidados', contexto:'Formaliza o convite e comunica o prazo — é a base do processo competitivo de compra.', vars:{cotacao:'COT-008',fornecedorNome:'Distribuidora Serra Verde',itens:'2',prazo:'15/07/2026'}},
      {id:'cotacao_lembrete', titulo:'Lembrete de proposta', gatilho:'A Loja envia um lembrete ao fornecedor', dest:'Fornecedor', contexto:'Aumenta a taxa de resposta antes do prazo, melhorando a concorrência e os preços.', vars:{cotacao:'COT-008',fornecedorNome:'Imperial Bebidas Ltda',prazo:'15/07/2026'}},
      {id:'cotacao_proposta_loja', titulo:'Nova proposta recebida', gatilho:'Um fornecedor registra a proposta', dest:'Loja', contexto:'Avisa o comprador para comparar as propostas assim que chegam.', vars:{cotacao:'COT-008',fornecedorNome:'Atacadão Fluminense',total:'R$ 2.240,00'}},
      {id:'cotacao_vencedor', titulo:'Proposta vencedora', gatilho:'A Loja escolhe a proposta vencedora', dest:'Fornecedor vencedor', contexto:'Comunica a adjudicação; um pedido é gerado automaticamente para faturamento.', vars:{cotacao:'COT-007',fornecedorNome:'Atacadão Fluminense',valor:'R$ 2.212,00'}},
      {id:'cotacao_item_vencedor', titulo:'Item adjudicado', gatilho:'A Loja adjudica um item a um fornecedor', dest:'Fornecedor', contexto:'Suporta a cotação item a item, com possíveis vencedores diferentes por produto.', vars:{cotacao:'COT-007',fornecedorNome:'Atacadão Fluminense',produto:'Cilindro CO₂ 10kg (recarga)',valor:'R$ 1.600,00'}},
      {id:'cotacao_cancelada', titulo:'Cotação cancelada', gatilho:'A Loja cancela a cotação com motivo', dest:'Fornecedores convidados', contexto:'Encerra o processo de forma transparente; os itens voltam para a decisão de atendimento.', vars:{cotacao:'COT-008',fornecedorNome:'Distribuidora Serra Verde',motivo:'Pedido de origem cancelado pela revenda.'}},
    ]},
  { nome:'Faturamento', cor:'#1f6b5e', resumo:'O fornecedor fatura diretamente à revenda; o sistema registra a nota e a base do royalty.',
    eventos:[
      {id:'faturamento_revenda', titulo:'Pedido faturado', gatilho:'O fornecedor registra o faturamento (NF)', dest:'Revenda', contexto:'Confirma a emissão da nota fiscal e o valor à revenda, dando previsibilidade de entrega e cobrança.', vars:{pedidoId:'PED-0041',nf:'NF-1207',fornecedorNome:'Distribuidora Serra Verde',valor:'R$ 3.220,00'}},
      {id:'faturamento_loja', titulo:'Faturamento registrado', gatilho:'O fornecedor fatura', dest:'Loja', contexto:'Registra para a Loja o valor faturado e o royalty correspondente — base do controle financeiro e da cobrança.', vars:{nf:'NF-1207',pedidoId:'PED-0041',fornecedorNome:'Distribuidora Serra Verde',valor:'R$ 3.220,00',royalty:'R$ 96,60'}},
    ]},
  { nome:'Royalties e Cobrança', cor:'#8a5a12', resumo:'A Loja cobra o percentual contratual sobre o faturamento de cada fornecedor e registra os pagamentos.',
    eventos:[
      {id:'royalty_cobranca', titulo:'Cobrança de royalties', gatilho:'A Loja emite a cobrança da competência', dest:'Fornecedor', contexto:'Formaliza a cobrança do percentual contratual sobre o faturamento do período (competência).', vars:{competencia:'06/2026',fornecedorNome:'Imperial Bebidas Ltda',valor:'R$ 171,20'}},
      {id:'royalty_pagamento', titulo:'Pagamento registrado', gatilho:'A Loja registra o pagamento do royalty', dest:'Fornecedor', contexto:'Confirma a quitação com data e comprovante, fechando o ciclo financeiro da competência.', vars:{competencia:'06/2026',fornecedorNome:'Imperial Bebidas Ltda',valor:'R$ 171,20',data:'08/07/2026',comprovante:'PIX-88213'}},
    ]},
];

// ── Itens de exemplo por evento (para que os e-mails mostrem a lista de itens) ──
const _ped44=[{codigo:'PRD-001',descricao:'Chopp Pilsen Imperial 30L',qtd:2,unidade:'Barril',valor:'R$ 1.240,00'},{codigo:'PRD-008',descricao:'Copo Caldereta personalizado (cx 12)',qtd:3,unidade:'Caixa',valor:'R$ 288,00'}];
const _cot08=[{codigo:'PRD-002',descricao:'Chopp Pilsen Imperial 50L',qtd:2,unidade:'Barril',valor:'R$ 1.780,00'},{codigo:'PRD-001',descricao:'Chopp Pilsen Imperial 30L',qtd:1,unidade:'Barril',valor:'R$ 620,00'}];
const _cot07=[{codigo:'PRD-007',descricao:'Cilindro CO₂ 10kg (recarga)',qtd:8,unidade:'Unidade',valor:'R$ 1.600,00'},{codigo:'PRD-008',descricao:'Copo Caldereta personalizado (cx 12)',qtd:6,unidade:'Caixa',valor:'R$ 612,00'}];
const _fat41=[{codigo:'PRD-001',descricao:'Chopp Pilsen Imperial 30L',qtd:4,unidade:'Barril',valor:'R$ 2.480,00'},{codigo:'PRD-003',descricao:'Chopp IPA Imperial 30L',qtd:1,unidade:'Barril',valor:'R$ 740,00'}];
const _forn42=[{codigo:'PRD-004',descricao:'Cerveja Puro Malte 600ml (cx 12)',qtd:15,unidade:'Caixa',valor:'R$ 2.220,00'},{codigo:'PRD-006',descricao:'Growler Cerâmica 1L',qtd:5,unidade:'Unidade',valor:'R$ 445,00'}];
const _rej46=[{codigo:'PRD-003',descricao:'Chopp IPA Imperial 30L',qtd:6,unidade:'Barril',valor:'R$ 4.440,00'}];
const ITENS={ pedido_novo_loja:_ped44, pedido_recebido_revenda:_ped44, pedido_aprovado:_ped44, pedido_rejeitado:_rej46, pedido_fornecedor:_forn42, pedido_encaminhado_revenda:_forn42, pedido_estoque_revenda:_ped44, cotacao_convite:_cot08, cotacao_lembrete:_cot08, cotacao_proposta_loja:_cot08, cotacao_vencedor:_cot07, cotacao_cancelada:_cot08, faturamento_revenda:_fat41, faturamento_loja:_fat41 };
// A revenda nunca vê o preço de catálogo: nestes e-mails o valor é ocultado.
const OCULTAR = new Set(['pedido_recebido_revenda','pedido_aprovado','pedido_encaminhado_revenda','pedido_estoque_revenda','pedido_rejeitado']);
for (const wf of WF) for (const ev of wf.eventos) { if (ITENS[ev.id]) ev.vars.itensLista = ITENS[ev.id]; if (OCULTAR.has(ev.id)) ev.vars.ocultarValor = true; }

// ── Renderiza cada template de e-mail para imagem (base64) ──
const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium' });
const shot = await browser.newPage({ viewport:{width:640,height:900}, deviceScaleFactor:2 });
for (const wf of WF) for (const ev of wf.eventos) {
  const { subject, html } = renderTemplate(ev.id, ev.vars);
  ev.subject = subject;
  await shot.setContent(html, { waitUntil:'networkidle' });
  const card = shot.locator('body > div').first();
  const buf = await card.screenshot({ type:'png' });
  ev.img = 'data:image/png;base64,' + buf.toString('base64');
}
await shot.close();
writeFileSync('/tmp/claude-0/-home-user-P018LJCDI/c5c10de0-ae73-5d88-b866-fe641e3f1fc6/scratchpad/deck-data.json', JSON.stringify(WF));
console.log('templates renderizados:', WF.reduce((a,w)=>a+w.eventos.length,0));
await browser.close();
