// Gera a APRESENTAÇÃO PDF (16:9) com DIAGRAMAS dos fluxos de notificação por
// e-mail — mecanismo geral + um diagrama de sequência (swimlane) por fluxo.
// Assuntos vêm dos templates reais (renderTemplate).
// Roda a partir de docs/gerador:  node 12-build-notificacoes-deck.mjs
import pw from '/opt/node22/lib/node_modules/playwright/index.js'
import { renderTemplate } from '../../server/src/email-templates.js'

const OUT = '/home/user/P018LJCDI/docs/Plataforma-Cidade-Imperial-Fluxos-Notificacoes-Email-Apresentacao.pdf'
const DARK = '#272525'
const esc = (s) => String(s == null ? '' : s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]))
const EX = { pedidoId: 'PED-0044', cotacao: 'COT-008', revendaNome: 'Bar do Imperador', fornecedorNome: 'Distribuidora Serra Verde', competencia: '07/2026', nf: 'NF-1210', valor: 'R$ 1.528,00', data: '16/07/2026', documento: 'COB-202607-01' }
const subj = (ev) => renderTemplate(ev, EX).subject

// Atores (lanes): 0=Revenda, 1=Loja (hub), 2=Fornecedor
const ATORES = [
  { nome: 'REVENDA', icon: '🏪', cor: '#9c3563' },
  { nome: 'LOJA', icon: '🏛️', cor: '#33568f' },
  { nome: 'FORNECEDOR', icon: '🚚', cor: '#1f6b5e' },
]
const LANEX = [17, 50, 83] // centros das lanes em %

// Fluxos, com as mensagens (de-lane → para-lane), rótulo curto e a chave.
const FLUXOS = [
  { nome: 'Pedidos', cor: '#33568f', resumo: 'Do envio do pedido pela revenda até o encaminhamento ao fornecedor ou o atendimento com estoque da Loja.',
    msgs: [
      { de: 0, para: 1, curto: 'Novo pedido', ev: 'pedido_novo_loja' },
      { de: 0, para: 0, curto: 'Pedido recebido (confirmação)', ev: 'pedido_recebido_revenda' },
      { de: 1, para: 0, curto: 'Pedido recebido e confirmado', ev: 'pedido_aprovado' },
      { de: 1, para: 0, curto: 'Item recebido', ev: 'item_aprovado' },
      { de: 1, para: 0, curto: 'Item rejeitado', ev: 'item_rejeitado' },
      { de: 1, para: 0, curto: 'Pedido rejeitado', ev: 'pedido_rejeitado' },
      { de: 1, para: 2, curto: 'Pedido para faturamento', ev: 'pedido_fornecedor' },
      { de: 1, para: 0, curto: 'Encaminhado ao fornecedor', ev: 'pedido_encaminhado_revenda' },
      { de: 1, para: 0, curto: 'Atendido pela Loja (estoque)', ev: 'pedido_estoque_revenda' },
    ] },
  { nome: 'Cotações', cor: '#8f682a', resumo: 'Convite a fornecedores, propostas, rodadas de renegociação (RF58) e seleção da vencedora — por processo ou por item.',
    msgs: [
      { de: 1, para: 2, curto: 'Convite para cotar', ev: 'cotacao_convite' },
      { de: 1, para: 2, curto: 'Lembrete de proposta', ev: 'cotacao_lembrete' },
      { de: 2, para: 1, curto: 'Proposta recebida', ev: 'cotacao_proposta_loja' },
      { de: 1, para: 2, curto: 'Nova rodada de negociação (RF58)', ev: 'cotacao_rodada' },
      { de: 1, para: 2, curto: 'Proposta vencedora', ev: 'cotacao_vencedor' },
      { de: 1, para: 2, curto: 'Item adjudicado', ev: 'cotacao_item_vencedor' },
      { de: 1, para: 2, curto: 'Cotação cancelada', ev: 'cotacao_cancelada' },
    ] },
  { nome: 'Aceite comercial da revenda (RF68)', cor: '#9c3563', resumo: 'Antes do encaminhamento, a revenda aprova ou recusa a negociação por item; a recusa reabre a cotação em nova rodada.',
    msgs: [
      { de: 1, para: 0, curto: 'Negociação concluída — aguardando aceite', ev: 'pedido_aceite_revenda' },
      { de: 0, para: 1, curto: 'Decisão comercial da revenda', ev: 'aceite_revenda_loja' },
    ] },
  { nome: 'Faturamento e documento fiscal (RF69)', cor: '#1f6b5e', resumo: 'Emissão da nota fiscal pelo fornecedor e o workflow de recusa/regularização do documento.',
    msgs: [
      { de: 2, para: 1, curto: 'Faturamento registrado', ev: 'faturamento_loja' },
      { de: 2, para: 0, curto: 'Pedido faturado (documentos)', ev: 'faturamento_revenda' },
      { de: 1, para: 2, curto: 'Documento recusado (Loja ou Revenda)', ev: 'nf_recusada' },
      { de: 2, para: 0, curto: 'Documento regularizado → Loja + Revenda', ev: 'nf_regularizada' },
    ] },
  { nome: 'Royalties', cor: '#6d4aa3', resumo: 'Cobrança, lembrete de atraso, pagamento (inclusive por parcela, RF64) e comprovante do fornecedor.',
    msgs: [
      { de: 1, para: 2, curto: 'Cobrança emitida', ev: 'royalty_cobranca' },
      { de: 1, para: 2, curto: 'Lembrete de atraso', ev: 'royalty_atraso' },
      { de: 1, para: 2, curto: 'Pagamento registrado', ev: 'royalty_pagamento' },
      { de: 2, para: 1, curto: 'Comprovante enviado', ev: 'royalty_comprovante' },
    ] },
]
const totalEv = FLUXOS.reduce((a, f) => a + f.msgs.length, 0)

const slides = []
const S = (inner, bg = '#ffffff') => `<div class="slide" style="background:${bg}">${inner}</div>`
const logo = (sz = 54, fs = 22) => `<div style="width:${sz}px;height:${sz}px;border-radius:${sz * 0.24}px;background:linear-gradient(135deg,#cfa055,#B38335 55%,#8a6428);display:flex;align-items:center;justify-content:center;font-family:Georgia,serif;font-weight:700;font-size:${fs}px;color:#fff">CI</div>`

// ── Diagrama de uma mensagem (linha do swimlane) ──────────────────────────
function msgRow(m, seq, cor) {
  const x1 = LANEX[m.de], x2 = LANEX[m.para]
  const self = m.de === m.para
  if (self) {
    return `<div class="mrow">
      <div class="selfbox" style="left:${x1}%;border-color:${cor}">
        <span class="mseq" style="background:${cor}">${seq}</span>${esc(m.curto)}
        <span class="mk">${esc(m.ev)}</span><span class="selfico" style="color:${cor}">↺ auto</span>
      </div></div>`
  }
  const left = Math.min(x1, x2), right = Math.max(x1, x2), width = right - left
  const toRight = x2 > x1
  const mid = (x1 + x2) / 2
  const head = toRight
    ? `<div class="mhead" style="left:${right}%;border-left:11px solid ${cor};border-top:7px solid transparent;border-bottom:7px solid transparent;transform:translate(-100%,-50%)"></div>`
    : `<div class="mhead" style="left:${left}%;border-right:11px solid ${cor};border-top:7px solid transparent;border-bottom:7px solid transparent;transform:translate(0,-50%)"></div>`
  return `<div class="mrow">
    <div class="mline" style="left:${left}%;width:${width}%;background:${cor}"></div>
    ${head}
    <div class="mpill" style="left:${mid}%;border-color:${cor}">
      <span class="mseq" style="background:${cor}">${seq}</span>${esc(m.curto)}
      <span class="mk">${esc(m.ev)}</span>
    </div></div>`
}

function diagramaFluxo(f) {
  const lifelines = LANEX.map((x, i) => `<div class="lifeline" style="left:${x}%;background:${ATORES[i].cor}"></div>`).join('')
  const heads = ATORES.map((a, i) => `<div class="actor" style="left:${LANEX[i]}%;border-color:${a.cor}"><span class="acticon">${a.icon}</span><span class="actnome" style="color:${a.cor}">${a.nome}</span></div>`).join('')
  let seq = 0
  const rows = f.msgs.map((m) => msgRow(m, ++seq, f.cor)).join('')
  return `
    <div class="diag">
      <div class="actors">${heads}</div>
      <div class="lanes">${lifelines}${rows}</div>
    </div>`
}

// 1. Capa
slides.push(S(`
  <div style="position:absolute;inset:0;background:radial-gradient(1200px 600px at 72% -10%,#3a2f1c,#272525 55%,#1c1a18)"></div>
  <div style="position:absolute;left:70px;top:60px;display:flex;align-items:center;gap:16px">${logo(58, 24)}
    <div><div style="font-family:Georgia,serif;font-weight:700;font-size:18px;letter-spacing:.14em;color:#fff">CIDADE IMPERIAL</div>
    <div style="font-size:12px;letter-spacing:.16em;color:#e3bf7e;margin-top:3px">PLATAFORMA DA LOJA</div></div></div>
  <div style="position:absolute;left:70px;bottom:118px;right:70px">
    <div style="font-size:16px;font-weight:700;letter-spacing:.18em;color:#e3bf7e;margin-bottom:14px">NOTIFICAÇÕES POR E-MAIL · DIAGRAMAS DE FLUXO</div>
    <div style="font-size:56px;font-weight:800;color:#fff;line-height:1.05;letter-spacing:-.5px">Fluxos de comunicação<br>automática — em diagrama</div>
    <div style="font-size:20px;color:#c9c1b4;margin-top:22px;max-width:880px;line-height:1.5">${totalEv} e-mails automáticos entre Loja, Fornecedores e Revendas, organizados em ${FLUXOS.length} fluxos de negócio — cada seta é um e-mail disparado por uma ação.</div>
  </div>
  <div style="position:absolute;right:70px;bottom:52px;font-size:13px;color:#8a8378">${totalEv} e-mails · ${FLUXOS.length} fluxos · sequência por ator</div>
`))

// 2. Mecanismo geral + atores
slides.push(S(`
  <div style="padding:52px 70px 0">
    <div style="font-size:14px;font-weight:700;letter-spacing:.14em;color:#B38335">COMO FUNCIONA</div>
    <div style="font-size:34px;font-weight:800;color:#272525;margin:6px 0 4px">Cada ação dispara um e-mail ao responsável certo</div>
    <div style="font-size:16px;color:#6b6459;max-width:1000px;line-height:1.5">A plataforma tem a Loja como hub: ela recebe pedidos das revendas e aciona os fornecedores. Toda ação relevante gera, em segundo plano, um e-mail transacional — só quando o SMTP está ativo.</div>
    <div style="display:flex;align-items:center;gap:10px;margin:30px 0 8px">
      ${[['Ação no sistema', 'Aprovar, cotar, faturar, cobrar…', '#8f682a'], ['Notificação', 'POST /api/email/notify', '#33568f'], ['SMTP ativo?', 'Servidor + remetente + ligado', '#1f6b5e'], ['E-mail enviado', 'Loja · Fornecedor · Revenda', '#B38335']]
        .map(([t, s, c], i) => `${i ? '<div style="color:#c9a24a;font-size:26px;font-weight:700">→</div>' : ''}
        <div style="flex:1;background:#faf7f0;border:1px solid #eae3d6;border-top:4px solid ${c};border-radius:14px;padding:16px 18px">
          <div style="font-size:16px;font-weight:700;color:${c}">${t}</div><div style="font-size:12.5px;color:#8a8378;margin-top:5px;line-height:1.4">${s}</div></div>`).join('')}
    </div>
    <div style="display:flex;gap:34px;margin-top:26px;align-items:center">
      <div style="flex:0 0 560px;display:flex;align-items:center;justify-content:space-between;background:#fff;border:1px solid #eae3d6;border-radius:16px;padding:26px 30px">
        ${ATORES.map((a, i) => `${i ? '<div style="flex:1;height:2px;background:repeating-linear-gradient(90deg,#d9cfbb,#d9cfbb 6px,transparent 6px,transparent 12px);position:relative"><span style="position:absolute;left:50%;top:-11px;transform:translateX(-50%);color:#b0a795;font-size:18px">⇄</span></div>' : ''}
          <div style="text-align:center"><div style="width:66px;height:66px;border-radius:50%;background:${a.cor}12;border:2px solid ${a.cor};display:flex;align-items:center;justify-content:center;font-size:30px;margin:0 auto 8px">${a.icon}</div>
          <div style="font-size:13px;font-weight:800;color:${a.cor};letter-spacing:.04em">${a.nome}</div></div>`).join('')}
      </div>
      <div style="flex:1">
        <div style="font-size:15px;font-weight:700;color:#272525;margin-bottom:8px">Como ler os diagramas a seguir</div>
        <div style="font-size:13.5px;color:#5a5349;line-height:1.7">
          • Cada fluxo é um <b>diagrama de sequência</b> com três raias: <b>Revenda</b>, <b>Loja</b> (centro/hub) e <b>Fornecedor</b>.<br>
          • Cada <b>seta numerada</b> é um e-mail; a ponta indica <b>quem recebe</b>.<br>
          • O rótulo traz o e-mail e a <b>chave técnica</b> do template.<br>
          • <b>↺ auto</b> = confirmação automática ao próprio autor da ação.
        </div>
      </div>
    </div>
  </div>
`, '#f7f4ee'))

// 3..N. Um diagrama por fluxo
let fN = 0
for (const f of FLUXOS) {
  fN++
  slides.push(S(`
    <div style="height:100%;display:flex;flex-direction:column">
      <div style="padding:30px 60px 14px">
        <div style="display:flex;align-items:center;gap:12px">
          <span style="font-size:13px;font-weight:800;color:#fff;background:${f.cor};border-radius:8px;padding:5px 12px">FLUXO ${fN}/${FLUXOS.length}</span>
          <span style="font-size:13px;color:#a89f90;font-weight:600">${f.msgs.length} e-mails</span>
        </div>
        <div style="font-size:30px;font-weight:800;color:#272525;margin:10px 0 3px">${esc(f.nome)}</div>
        <div style="font-size:14px;color:#6b6459;line-height:1.4;max-width:1050px">${esc(f.resumo)}</div>
      </div>
      <div style="flex:1;padding:4px 60px 26px;min-height:0">
        ${diagramaFluxo(f)}
      </div>
    </div>
  `))
}

// Último. Como ativar
slides.push(S(`
  <div style="position:absolute;inset:0;background:radial-gradient(1000px 500px at 20% 120%,#3a2f1c,#272525 60%,#1c1a18)"></div>
  <div style="position:absolute;left:70px;top:64px;display:flex;align-items:center;gap:14px">${logo(46, 19)}<div style="font-family:Georgia,serif;font-weight:700;font-size:15px;letter-spacing:.12em;color:#fff">CIDADE IMPERIAL</div></div>
  <div style="position:absolute;left:70px;top:200px;right:70px">
    <div style="font-size:15px;font-weight:700;letter-spacing:.16em;color:#e3bf7e">COMO ATIVAR OS E-MAILS</div>
    <div style="font-size:40px;font-weight:800;color:#fff;margin:12px 0 26px">Três passos, na própria plataforma</div>
    <div style="display:flex;gap:16px">
      ${[['1', 'Configurar', 'Configurações Técnicas › Configuração de e-mail: servidor SMTP, segurança (587 STARTTLS ou 465 SSL), remetente e "responder para".'],
         ['2', 'Ativar e testar', 'Ligue o envio, use "Verificar conexão" e "Enviar e-mail de teste".'],
         ['3', 'Operar', 'Cada ação de pedidos, cotações, faturamento e royalties passa a disparar o e-mail certo automaticamente.']]
        .map(([n, t, s]) => `<div style="flex:1;background:#ffffff0d;border:1px solid #ffffff22;border-radius:14px;padding:22px 20px">
          <div style="width:34px;height:34px;border-radius:50%;background:#B38335;color:#fff;font-weight:800;display:flex;align-items:center;justify-content:center;font-size:16px">${n}</div>
          <div style="font-size:18px;font-weight:700;color:#fff;margin:12px 0 6px">${t}</div>
          <div style="font-size:13.5px;color:#c9c1b4;line-height:1.55">${s}</div></div>`).join('')}
    </div>
    <div style="font-size:13px;color:#8a8378;margin-top:32px">Dependência: conta SMTP dedicada da Cervejaria. Enquanto o envio permanece desativado, nenhum e-mail é disparado — ideal para homologação.</div>
  </div>
`))

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
@page{size:1280px 720px;margin:0}
*{margin:0;padding:0;box-sizing:border-box}
html,body{background:#fff;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.slide{width:1280px;height:720px;position:relative;overflow:hidden;page-break-after:always}
.slide:last-child{page-break-after:auto}
code{font-family:'SFMono-Regular',Consolas,monospace}

/* Swimlane */
.diag{height:100%;display:flex;flex-direction:column}
.actors{position:relative;height:66px;flex:none}
.actor{position:absolute;top:0;transform:translateX(-50%);display:flex;flex-direction:column;align-items:center;background:#fff;border:2px solid;border-radius:12px;padding:7px 20px;min-width:150px}
.acticon{font-size:20px;line-height:1}
.actnome{font-size:12.5px;font-weight:800;letter-spacing:.05em;margin-top:2px}
.lanes{position:relative;flex:1;margin-top:6px}
.lifeline{position:absolute;top:0;bottom:0;width:2px;transform:translateX(-50%);opacity:.35}
.mrow{position:relative;height:calc((100% - 4px)/9.4);min-height:40px}
.mline{position:absolute;top:50%;height:3px;transform:translateY(-50%);border-radius:2px}
.mhead{position:absolute;top:50%;width:0;height:0}
.mpill{position:absolute;top:50%;transform:translate(-50%,-50%);background:#fff;border:1.5px solid;border-radius:22px;padding:6px 14px 6px 8px;font-size:13px;font-weight:700;color:#272525;white-space:nowrap;display:flex;align-items:center;gap:8px;box-shadow:0 3px 10px rgba(39,37,37,.10)}
.mseq{width:20px;height:20px;border-radius:50%;color:#fff;font-size:12px;font-weight:800;display:flex;align-items:center;justify-content:center;flex:none}
.mk{font-family:'SFMono-Regular',Consolas,monospace;font-size:10.5px;font-weight:600;color:#8a7a52;background:#f4efe3;border-radius:5px;padding:1px 6px}
.selfbox{position:absolute;top:50%;transform:translate(-50%,-50%);background:#fff;border:1.5px dashed;border-radius:22px;padding:6px 14px 6px 8px;font-size:13px;font-weight:700;color:#272525;white-space:nowrap;display:flex;align-items:center;gap:8px}
.selfico{font-size:11px;font-weight:800}
</style></head><body>${slides.join('')}</body></html>`

const browser = await pw.chromium.launch({ executablePath: '/opt/pw-browsers/chromium' })
const page = await browser.newPage()
await page.setContent(html, { waitUntil: 'networkidle' })
await page.pdf({ path: OUT, width: '1280px', height: '720px', printBackground: true, preferCSSPageSize: true })
await browser.close()
console.log('slides:', slides.length, '·', totalEv, 'e-mails →', OUT)
