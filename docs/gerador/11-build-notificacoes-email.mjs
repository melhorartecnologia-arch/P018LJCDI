// Gera o documento PDF "Fluxos de Notificações por E-mail" — todos os 26
// e-mails automáticos da plataforma, com assunto real (renderizado do template),
// remetente → destinatário, gatilho, descrição e variáveis do template.
// Roda a partir de docs/gerador:  node 11-build-notificacoes-email.mjs
import pw from '/opt/node22/lib/node_modules/playwright/index.js'
import { renderTemplate } from '../../server/src/email-templates.js'

const OUT = '/home/user/P018LJCDI/docs/Plataforma-Cidade-Imperial-Fluxos-Notificacoes-Email.pdf'
const GOLD = '#B38335', DARK = '#272525', MUT = '#8a8378'
const esc = (s) => String(s == null ? '' : s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]))

// Valores de exemplo para renderizar assuntos reais dos templates.
const EX = { pedidoId: 'PED-0044', cotacao: 'COT-008', revendaNome: 'Bar do Imperador', fornecedorNome: 'Distribuidora Serra Verde', competencia: '07/2026', nf: 'NF-1210', valor: 'R$ 1.528,00', data: '16/07/2026', documento: 'COB-202607-01' }
const subjectOf = (ev) => renderTemplate(ev, EX).subject

// Fluxos (cor + resumo) e os eventos de cada um, na ordem do ciclo de negócio.
const FLUXOS = [
  { nome: 'Pedidos', cor: '#33568f', resumo: 'Do envio do pedido pela revenda até o encaminhamento ao fornecedor ou o atendimento com estoque da Loja.',
    eventos: [
      { ev: 'pedido_novo_loja', de: 'Sistema (revenda envia pedido)', para: 'Loja', gatilho: 'A revenda cria e envia um pedido pelo catálogo.', desc: 'Avisa a Loja que há um novo pedido aguardando recebimento/análise, com o valor total e o alerta de saldo em estoque.' },
      { ev: 'pedido_recebido_revenda', de: 'Sistema (revenda envia pedido)', para: 'Revenda', gatilho: 'A revenda envia o pedido (confirmação automática).', desc: 'Confirma à revenda que o pedido foi recebido pela plataforma e está em análise da Loja.' },
      { ev: 'pedido_aprovado', de: 'Loja', para: 'Revenda', gatilho: 'A Loja confirma o recebimento do pedido inteiro (botão "Recebimento de Pedidos").', desc: 'Informa à revenda que todos os itens do pedido foram recebidos e confirmados pela Loja.' },
      { ev: 'item_aprovado', de: 'Loja', para: 'Revenda', gatilho: 'A Loja confirma o recebimento de um item específico.', desc: 'Notifica a revenda do recebimento de um item quando a decisão é feita item a item.' },
      { ev: 'item_rejeitado', de: 'Loja', para: 'Revenda', gatilho: 'A Loja rejeita um item com justificativa.', desc: 'Comunica à revenda a rejeição de um item do pedido, com o motivo informado.' },
      { ev: 'pedido_rejeitado', de: 'Loja', para: 'Revenda', gatilho: 'A Loja rejeita o pedido inteiro com justificativa.', desc: 'Comunica à revenda que o pedido foi rejeitado, com a justificativa.' },
      { ev: 'pedido_fornecedor', de: 'Loja', para: 'Fornecedor', gatilho: 'A Loja faz envio direto (ou fecha cotação) e encaminha itens ao fornecedor.', desc: 'Aciona o fornecedor com um novo pedido para faturamento direto à revenda.' },
      { ev: 'pedido_encaminhado_revenda', de: 'Loja', para: 'Revenda', gatilho: 'A Loja encaminha o pedido ao fornecedor (envio direto).', desc: 'Informa à revenda que o pedido foi encaminhado ao fornecedor responsável pelo faturamento.' },
      { ev: 'pedido_estoque_revenda', de: 'Loja', para: 'Revenda', gatilho: 'A Loja decide atender com o estoque da própria Loja.', desc: 'Avisa a revenda de que o pedido será atendido diretamente pela Loja Cidade Imperial.' },
    ] },
  { nome: 'Cotações', cor: '#8f682a', resumo: 'Convite a fornecedores, propostas, rodadas de renegociação (RF58) e seleção da vencedora, por processo ou item.',
    eventos: [
      { ev: 'cotacao_convite', de: 'Loja', para: 'Fornecedor', gatilho: 'A Loja abre uma cotação e convida 2+ fornecedores.', desc: 'Convida o fornecedor a enviar proposta para os itens cotados, com a data-limite.' },
      { ev: 'cotacao_lembrete', de: 'Loja', para: 'Fornecedor', gatilho: 'A Loja envia lembrete a um fornecedor que ainda não respondeu.', desc: 'Reforça o convite pendente da cotação, com o prazo para envio da proposta.' },
      { ev: 'cotacao_proposta_loja', de: 'Fornecedor', para: 'Loja', gatilho: 'O fornecedor registra ou edita a proposta.', desc: 'Avisa a Loja de que uma nova proposta (com total, frete e condições) entrou na cotação.' },
      { ev: 'cotacao_rodada', de: 'Loja', para: 'Fornecedor', gatilho: 'A Loja abre uma nova rodada de negociação (RF58).', desc: 'Convida o fornecedor a revisar preços/condições dos itens em renegociação, com o novo prazo.' },
      { ev: 'cotacao_vencedor', de: 'Loja', para: 'Fornecedor', gatilho: 'A Loja escolhe a proposta vencedora (processo inteiro).', desc: 'Comunica ao fornecedor que sua proposta venceu a cotação, com o valor final.' },
      { ev: 'cotacao_item_vencedor', de: 'Loja', para: 'Fornecedor', gatilho: 'A Loja adjudica um item a um fornecedor (decisão por item).', desc: 'Informa ao fornecedor a adjudicação de um item específico da cotação, com o valor.' },
      { ev: 'cotacao_cancelada', de: 'Loja', para: 'Fornecedor', gatilho: 'A Loja cancela a cotação com motivo.', desc: 'Comunica aos convidados que a cotação foi encerrada sem escolha, com a justificativa.' },
    ] },
  { nome: 'Aceite comercial da revenda', cor: '#9c3563', resumo: 'Etapa de aprovação comercial (RF68): a revenda aceita ou recusa a negociação por item antes do encaminhamento.',
    eventos: [
      { ev: 'pedido_aceite_revenda', de: 'Loja', para: 'Revenda', gatilho: 'A Loja fecha a negociação — os itens passam a "aguardando aceite da revenda".', desc: 'Chama a revenda para a aprovação comercial: mostra valores negociados, frete e condições dos itens.' },
      { ev: 'aceite_revenda_loja', de: 'Revenda', para: 'Loja', gatilho: 'A revenda decide (aceita e/ou recusa itens).', desc: 'Notifica a Loja da decisão comercial da revenda — itens aceitos, recusados e o motivo da recusa.' },
    ] },
  { nome: 'Faturamento e documento fiscal', cor: '#1f6b5e', resumo: 'Emissão da nota fiscal pelo fornecedor e o workflow de recusa/regularização do documento (RF69).',
    eventos: [
      { ev: 'faturamento_loja', de: 'Fornecedor', para: 'Loja', gatilho: 'O fornecedor registra o faturamento com o documento fiscal.', desc: 'Informa a Loja do faturamento registrado, com valor e o royalty apurado.' },
      { ev: 'faturamento_revenda', de: 'Fornecedor', para: 'Revenda', gatilho: 'O fornecedor fatura o pedido.', desc: 'Comunica à revenda que o pedido foi faturado, com a nota fiscal e os documentos disponíveis.' },
      { ev: 'nf_recusada', de: 'Loja ou Revenda', para: 'Fornecedor', gatilho: 'A Loja ou a revenda recusa o documento fiscal (RF69).', desc: 'Aciona o fornecedor para regularizar: informa quem recusou, o arquivo e o motivo obrigatório.' },
      { ev: 'nf_regularizada', de: 'Fornecedor', para: 'Loja + Revenda', gatilho: 'O fornecedor reenvia o documento corrigido (regularização).', desc: 'Avisa Loja e revenda de que o documento fiscal foi reenviado e passou pela análise fiscal.' },
    ] },
  { nome: 'Royalties', cor: '#6d4aa3', resumo: 'Cobrança, lembrete de atraso, registro de pagamento (inclusive por parcela, RF64) e comprovante do fornecedor.',
    eventos: [
      { ev: 'royalty_cobranca', de: 'Loja', para: 'Fornecedor', gatilho: 'A Loja emite a cobrança de royalties do fechamento.', desc: 'Envia a cobrança ao fornecedor com competência, valor e vencimento (pelo gatilho/parcelamento do contrato — RF63/RF64).' },
      { ev: 'royalty_atraso', de: 'Loja', para: 'Fornecedor', gatilho: 'A Loja envia lembrete de royalty em atraso (por fechamento ou por parcela).', desc: 'Alerta o fornecedor sobre a cobrança vencida, com os dias de atraso e o valor.' },
      { ev: 'royalty_pagamento', de: 'Loja', para: 'Fornecedor', gatilho: 'A Loja registra o pagamento do royalty (por fechamento ou por parcela).', desc: 'Confirma ao fornecedor o pagamento registrado, com valor, data e referência.' },
      { ev: 'royalty_comprovante', de: 'Fornecedor', para: 'Loja', gatilho: 'O fornecedor envia o comprovante de pagamento.', desc: 'Avisa a Loja de que o fornecedor anexou o comprovante, aguardando a confirmação.' },
    ] },
]

// Variáveis (campos) de cada template — extraídas do código-fonte.
const VARS = {
  pedido_novo_loja: 'pedidoId, revendaNome, total, data, estoqueInfo',
  pedido_recebido_revenda: 'pedidoId, data',
  pedido_aprovado: 'pedidoId, revendaNome',
  item_aprovado: 'pedidoId, produto',
  item_rejeitado: 'pedidoId, produto, justificativa',
  pedido_rejeitado: 'pedidoId, revendaNome, justificativa',
  pedido_fornecedor: 'pedidoId, fornecedorNome, revendaNome',
  pedido_encaminhado_revenda: 'pedidoId, fornecedorNome',
  pedido_estoque_revenda: 'pedidoId',
  cotacao_convite: 'cotacao, fornecedorNome, prazo',
  cotacao_lembrete: 'cotacao, fornecedorNome, prazo',
  cotacao_proposta_loja: 'cotacao, fornecedorNome, total',
  cotacao_rodada: 'cotacao, rodada, fornecedorNome, itensLista, prazo',
  cotacao_vencedor: 'cotacao, fornecedorNome, valor',
  cotacao_item_vencedor: 'cotacao, fornecedorNome, produto, valor',
  cotacao_cancelada: 'cotacao, fornecedorNome, motivo',
  pedido_aceite_revenda: 'pedidoId, revendaNome, fornecedorNome, itensLista, frete',
  aceite_revenda_loja: 'pedidoId, revendaNome, usuario, aceitos, recusados, motivo',
  faturamento_loja: 'nf, fornecedorNome, pedidoId, valor, royalty',
  faturamento_revenda: 'pedidoId, nf, fornecedorNome, valor',
  nf_recusada: 'nf, fornecedorNome, pedidoId, quem, arquivo, motivo',
  nf_regularizada: 'nf, fornecedorNome, pedidoId, arquivo',
  royalty_cobranca: 'competencia, fornecedorNome, documento, valor, vencimento',
  royalty_atraso: 'competencia, fornecedorNome, vencimento, diasAtraso, documento, valor',
  royalty_pagamento: 'competencia, fornecedorNome, valor, data, comprovante',
  royalty_comprovante: 'competencia, fornecedorNome, arquivo',
}

const totalEv = FLUXOS.reduce((a, f) => a + f.eventos.length, 0)
const destColor = (p) => (p.includes('Loja') && p.includes('Revenda')) ? '#6d4aa3' : p.startsWith('Loja') ? '#33568f' : p.startsWith('Fornecedor') ? '#1f6b5e' : p.startsWith('Revenda') ? '#9c3563' : '#8a8378'

let evN = 0
const cardEvento = (cor, ev) => {
  evN++
  return `
  <div class="card">
    <div class="chd">
      <div class="cnum" style="background:${cor}">${evN}</div>
      <div style="flex:1">
        <div class="ctit">${esc(subjectOf(ev.ev))}</div>
        <div class="cchave">chave técnica: <code>${esc(ev.ev)}</code></div>
      </div>
      <div class="cdir"><span class="pill" style="background:#eef1f6;color:#33568f">${esc(ev.de)}</span><span class="seta">→</span><span class="pill" style="background:${destColor(ev.para)}18;color:${destColor(ev.para)};border-color:${destColor(ev.para)}44">${esc(ev.para)}</span></div>
    </div>
    <div class="crow"><span class="clbl">Gatilho</span><span class="cval">${esc(ev.gatilho)}</span></div>
    <div class="crow"><span class="clbl">O que comunica</span><span class="cval">${esc(ev.desc)}</span></div>
    <div class="crow"><span class="clbl">Variáveis</span><span class="cvar">${esc(VARS[ev.ev] || '—')}</span></div>
  </div>`
}

const capa = `
<section class="capa">
  <div class="capa-top"><div class="logo">CI</div><div><div class="ci">CIDADE IMPERIAL</div><div class="ci-sub">PLATAFORMA DA LOJA</div></div></div>
  <div class="capa-mid">
    <div class="eyebrow">NOTIFICAÇÕES POR E-MAIL · SMTP</div>
    <h1>Fluxos de Notificações<br>por E-mail</h1>
    <p>Documentação completa dos <b>${totalEv} e-mails automáticos</b> da plataforma — Pedidos, Cotações, Aceite comercial, Faturamento e Royalties. Cada evento de negócio dispara um modelo próprio ao responsável certo.</p>
  </div>
  <div class="capa-foot"><span>${totalEv} modelos de e-mail · ${FLUXOS.length} fluxos de negócio</span><span>Cervejaria Cidade Imperial · Projeto P2606001</span></div>
</section>`

const comoFunciona = `
<section class="pg">
  <div class="sechd"><span class="secn">1</span><div><div class="sectt">Como funciona</div><div class="secsub">Comunicação automática, rastreável e controlada pela Loja</div></div></div>
  <p class="lead">A plataforma conecta Loja, Fornecedores e Revendas. Cada ação relevante gera, em segundo plano, um e-mail transacional — sem trabalho manual e sempre pelo remetente oficial configurado. O envio é opcional: só ocorre quando a Loja ativa o SMTP.</p>
  <div class="flow">
    <div class="fbox"><div class="fbt" style="color:#33568f">Ação no sistema</div><div class="fbs">Enviar pedido, aprovar, cotar, faturar, cobrar…</div></div>
    <div class="fa">→</div>
    <div class="fbox"><div class="fbt" style="color:#8f682a">Notificação</div><div class="fbs">POST /api/email/notify (evento + destinatários)</div></div>
    <div class="fa">→</div>
    <div class="fbox"><div class="fbt" style="color:#1f6b5e">SMTP configurado</div><div class="fbs">Servidor, remetente, ativo/inativo</div></div>
    <div class="fa">→</div>
    <div class="fbox"><div class="fbt" style="color:#B38335">E-mail ao destinatário</div><div class="fbs">Loja · Fornecedor · Revenda</div></div>
  </div>
  <div class="grid2">
    <div class="note"><div class="nt">Regras de envio (verificadas no código)</div>
      <ul>
        <li><b>Só envia com o SMTP ativo:</b> se o envio estiver desativado, a ação segue normal e a notificação é ignorada — ideal para homologação.</li>
        <li><b>Mensagem individual por destinatário:</b> cada pessoa recebe seu próprio e-mail, sem expor os demais.</li>
        <li><b>Remetente oficial e "responder para":</b> definidos na configuração; rodapé automático "não responda este e-mail".</li>
        <li><b>Modelo por caso de uso:</b> ${totalEv} templates com assunto e HTML próprios (identidade Cidade Imperial).</li>
      </ul>
    </div>
    <div class="note"><div class="nt">Por que importa (negócio)</div>
      <ul>
        <li>Reduz atrasos e retrabalho e dá transparência às revendas.</li>
        <li>Aciona fornecedores na hora certa (cotações, rodadas, faturamento, royalties).</li>
        <li>Cria trilha de comunicação em todo o ciclo de compra e financeiro.</li>
        <li>Cada disparo também fica registrado na trilha/auditoria da ação que o originou.</li>
      </ul>
    </div>
  </div>
  <div class="sechd" style="margin-top:26px"><span class="secn">2</span><div><div class="sectt">Configuração do SMTP</div><div class="secsub">Loja › Configurações Técnicas › Configuração de e-mail</div></div></div>
  <div class="steps">
    <div class="step"><div class="sn">1</div><div class="st">Configurar</div><div class="ss">Servidor SMTP (host/porta), segurança (SSL 465 · STARTTLS 587 · nenhuma), usuário/senha, remetente e "responder para".</div></div>
    <div class="step"><div class="sn">2</div><div class="st">Ativar e testar</div><div class="ss">Ligue o envio, use "Verificar conexão" e "Enviar e-mail de teste" para validar.</div></div>
    <div class="step"><div class="sn">3</div><div class="st">Operar</div><div class="ss">A partir daí, cada ação de pedidos, cotações, faturamento e royalties dispara o e-mail certo.</div></div>
  </div>
  <div class="warn">⚠ Dependência de infraestrutura: é preciso uma conta SMTP dedicada da Cervejaria. Muitas VPS bloqueiam a porta 25 — use 587 (STARTTLS) ou 465 (SSL). Enquanto o envio permanece desativado, nenhum e-mail é disparado.</div>
</section>`

const indice = `
<section class="pg">
  <div class="sechd"><span class="secn">3</span><div><div class="sectt">Índice das ${totalEv} notificações</div><div class="secsub">Agrupadas pelos ${FLUXOS.length} fluxos de negócio</div></div></div>
  ${FLUXOS.map((f) => `
    <div class="idxfluxo">
      <div class="idxhd" style="border-color:${f.cor}"><span class="idxdot" style="background:${f.cor}"></span>${esc(f.nome)}<span class="idxn" style="color:${f.cor};background:${f.cor}14">${f.eventos.length} e-mails</span></div>
      <table class="idxtb"><thead><tr><th>Assunto</th><th>De → Para</th></tr></thead><tbody>
        ${f.eventos.map((ev) => `<tr><td>${esc(subjectOf(ev.ev))}<div class="idxk"><code>${esc(ev.ev)}</code></div></td><td class="idxdir">${esc(ev.de.replace(/ \(.*\)/, ''))} <span style="color:${MUT}">→</span> <b>${esc(ev.para)}</b></td></tr>`).join('')}
      </tbody></table>
    </div>`).join('')}
</section>`

const detalhe = FLUXOS.map((f) => `
<section class="pg">
  <div class="fluxohd" style="background:linear-gradient(120deg,${f.cor},${f.cor}cc)">
    <div class="fluxoeye">FLUXO · ${f.eventos.length} E-MAILS</div>
    <div class="fluxott">${esc(f.nome)}</div>
    <div class="fluxosub">${esc(f.resumo)}</div>
  </div>
  ${f.eventos.map((ev) => cardEvento(f.cor, ev)).join('')}
</section>`).join('')

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
@page { size: A4; margin: 14mm 14mm 16mm; }
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif; color:${DARK}; -webkit-print-color-adjust:exact; print-color-adjust:exact; font-size:12px; }
code { font-family:'SFMono-Regular',Consolas,monospace; font-size:10.5px; background:#f2ede3; padding:1px 5px; border-radius:4px; color:#6b5a2a; }
.pg { page-break-before:always; }
section.capa { page-break-after:always; }

/* Capa */
.capa { position:relative; height:267mm; background:radial-gradient(600px 340px at 78% -6%,#3a2f1c,#272525 58%,#1c1a18); border-radius:4px; overflow:hidden; color:#fff; }
.capa-top { position:absolute; left:26px; top:26px; display:flex; align-items:center; gap:13px; }
.logo { width:52px; height:52px; border-radius:13px; background:linear-gradient(135deg,#cfa055,#B38335 55%,#8a6428); display:flex; align-items:center; justify-content:center; font-family:Georgia,serif; font-weight:700; font-size:21px; color:#fff; }
.ci { font-family:Georgia,serif; font-weight:700; font-size:16px; letter-spacing:.14em; }
.ci-sub { font-size:10px; letter-spacing:.16em; color:#e3bf7e; margin-top:3px; }
.capa-mid { position:absolute; left:30px; right:30px; top:120mm; }
.eyebrow { font-size:12px; font-weight:700; letter-spacing:.18em; color:#e3bf7e; margin-bottom:14px; }
.capa h1 { font-size:44px; font-weight:800; line-height:1.08; letter-spacing:-.5px; }
.capa p { font-size:14.5px; color:#c9c1b4; margin-top:20px; max-width:150mm; line-height:1.55; }
.capa-foot { position:absolute; left:30px; right:30px; bottom:26px; display:flex; justify-content:space-between; font-size:11px; color:#8a8378; border-top:1px solid #ffffff20; padding-top:12px; }

/* Seções */
.sechd { display:flex; align-items:center; gap:13px; margin-bottom:14px; }
.secn { width:34px; height:34px; border-radius:9px; background:${DARK}; color:#fff; display:flex; align-items:center; justify-content:center; font-weight:800; font-size:16px; flex:none; }
.sectt { font-size:22px; font-weight:800; }
.secsub { font-size:12.5px; color:${MUT}; margin-top:2px; }
.lead { font-size:13px; color:#5a5349; line-height:1.6; margin-bottom:18px; }

/* Fluxo "como funciona" */
.flow { display:flex; align-items:stretch; gap:8px; margin-bottom:20px; }
.fbox { flex:1; background:#fff; border:1px solid #eae3d6; border-radius:11px; padding:13px 12px; text-align:center; }
.fbt { font-size:12px; font-weight:700; }
.fbs { font-size:10.5px; color:${MUT}; margin-top:5px; line-height:1.35; }
.fa { align-self:center; color:#c9a24a; font-size:20px; font-weight:700; }
.grid2 { display:grid; grid-template-columns:1fr 1fr; gap:16px; }
.note { background:#faf7f0; border:1px solid #eae3d6; border-radius:12px; padding:15px 17px; }
.nt { font-size:13.5px; font-weight:700; margin-bottom:8px; }
.note ul { padding-left:16px; }
.note li { font-size:11.5px; color:#5a5349; line-height:1.5; margin-bottom:5px; }

/* Passos SMTP */
.steps { display:flex; gap:12px; margin-bottom:14px; }
.step { flex:1; background:#fff; border:1px solid #eae3d6; border-radius:12px; padding:14px 15px; }
.sn { width:28px; height:28px; border-radius:50%; background:${GOLD}; color:#fff; font-weight:800; display:flex; align-items:center; justify-content:center; font-size:14px; }
.st { font-size:14px; font-weight:700; margin:9px 0 5px; }
.ss { font-size:11.5px; color:#5a5349; line-height:1.5; }
.warn { background:#fdf3e0; border:1px solid #ecd9ae; border-radius:10px; padding:12px 15px; font-size:11.5px; color:#6d4a10; line-height:1.55; }

/* Índice */
.idxfluxo { margin-bottom:14px; page-break-inside:avoid; }
.idxhd { display:flex; align-items:center; gap:9px; font-size:15px; font-weight:800; border-left:4px solid; padding-left:10px; margin-bottom:7px; }
.idxdot { width:9px; height:9px; border-radius:50%; }
.idxn { font-size:11px; font-weight:700; border-radius:20px; padding:2px 10px; margin-left:auto; }
.idxtb { width:100%; border-collapse:collapse; background:#fff; border:1px solid #eae3d6; border-radius:10px; overflow:hidden; }
.idxtb th { text-align:left; padding:7px 12px; font-size:10px; letter-spacing:.05em; text-transform:uppercase; color:${MUT}; background:#faf7f0; border-bottom:1px solid #eae3d6; }
.idxtb td { padding:8px 12px; font-size:12px; border-top:1px solid #f1ece2; vertical-align:top; }
.idxk { margin-top:2px; }
.idxdir { white-space:nowrap; color:#5a5349; }

/* Capítulo de fluxo */
.fluxohd { color:#fff; border-radius:13px; padding:20px 22px; margin-bottom:16px; }
.fluxoeye { font-size:11px; font-weight:700; letter-spacing:.14em; color:#ffffffcc; }
.fluxott { font-size:28px; font-weight:800; margin:6px 0 8px; }
.fluxosub { font-size:12.5px; color:#ffffffe0; line-height:1.5; max-width:165mm; }

/* Card de evento */
.card { background:#fff; border:1px solid #eae3d6; border-radius:12px; padding:14px 16px; margin-bottom:12px; page-break-inside:avoid; }
.chd { display:flex; align-items:flex-start; gap:11px; margin-bottom:10px; }
.cnum { width:26px; height:26px; border-radius:7px; color:#fff; font-weight:800; font-size:13px; display:flex; align-items:center; justify-content:center; flex:none; }
.ctit { font-size:15px; font-weight:800; line-height:1.25; }
.cchave { font-size:10.5px; color:${MUT}; margin-top:3px; }
.cdir { display:flex; align-items:center; gap:6px; flex:none; }
.pill { font-size:10.5px; font-weight:700; border-radius:7px; padding:3px 9px; border:1px solid transparent; white-space:nowrap; }
.seta { color:${MUT}; font-weight:700; }
.crow { display:flex; gap:12px; padding:6px 0; border-top:1px solid #f5f1e8; }
.clbl { flex:0 0 96px; font-size:10.5px; font-weight:700; letter-spacing:.03em; text-transform:uppercase; color:#a89f90; padding-top:1px; }
.cval { font-size:12px; color:#3f3a31; line-height:1.5; }
.cvar { font-size:11px; }
</style></head><body>
${capa}
${comoFunciona}
${indice}
${detalhe}
</body></html>`

const browser = await pw.chromium.launch({ executablePath: '/opt/pw-browsers/chromium' })
const page = await browser.newPage()
await page.setContent(html, { waitUntil: 'networkidle' })
await page.pdf({ path: OUT, format: 'A4', printBackground: true, preferCSSPageSize: true })
await browser.close()
console.log('OK →', OUT, '·', totalEv, 'e-mails ·', FLUXOS.length, 'fluxos')
