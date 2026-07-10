// Templates de e-mail — um por caso de uso dos fluxos de pedidos, cotações,
// faturamento e royalties. Cada template recebe `vars` (strings já prontas,
// vindas da aplicação) e devolve { subject, html }.

const esc = (s) =>
  String(s == null ? '' : s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]))

function layout(titulo, corpo, badge) {
  return (
    '<!doctype html><html><body style="margin:0;background:#f7f4ee;padding:24px;font-family:Arial,Helvetica,sans-serif;color:#272525">' +
    '<div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #eae3d6;border-radius:14px;overflow:hidden">' +
    '<div style="background:linear-gradient(135deg,#cfa055,#B38335 60%,#8a6428);padding:20px 24px;color:#fff">' +
    '<div style="font-family:Georgia,serif;font-weight:700;font-size:18px;letter-spacing:.08em">CIDADE IMPERIAL</div>' +
    '<div style="font-size:11px;opacity:.9;letter-spacing:.06em;margin-top:2px">PLATAFORMA DA LOJA</div></div>' +
    '<div style="padding:24px">' +
    (badge
      ? '<div style="display:inline-block;font-size:11px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:#8a5a12;background:#faf3e4;border:1px solid #e6cf9e;border-radius:6px;padding:4px 10px;margin-bottom:12px">' +
        esc(badge) +
        '</div>'
      : '') +
    '<h1 style="font-size:19px;margin:0 0 12px;line-height:1.3">' + titulo + '</h1>' +
    corpo +
    '</div>' +
    '<div style="padding:14px 24px;border-top:1px solid #f1ece2;background:#faf7f0;font-size:11px;color:#a89f90">Mensagem automática da Plataforma Cidade Imperial · Cervejaria Cidade Imperial. Por favor, não responda este e-mail.</div>' +
    '</div></body></html>'
  )
}

const p = (t) => '<p style="font-size:14px;line-height:1.55;margin:0 0 12px">' + t + '</p>'
const linhas = (pairs) =>
  '<table style="width:100%;border-collapse:collapse;margin:4px 0 14px">' +
  pairs
    .filter(Boolean)
    .map(
      ([k, v]) =>
        '<tr><td style="padding:6px 0;font-size:13px;color:#8a8378;width:44%;vertical-align:top">' +
        esc(k) +
        '</td><td style="padding:6px 0;font-size:13px;font-weight:600;color:#272525">' +
        (v == null || v === '' ? '—' : esc(v)) +
        '</td></tr>'
    )
    .join('') +
  '</table>'

// v() → valor escapado e em negrito para uso no meio de frases
const b = (v) => '<b>' + esc(v) + '</b>'

// Tabela dos itens envolvidos no processo (pedido/cotação/faturamento).
// itens: [{ codigo, descricao, qtd, unidade, valor }]
// mostrarValor=false oculta a coluna de valor (ex.: e-mails à revenda antes de a
// Loja negociar/faturar — a revenda nunca vê o preço de catálogo).
const tabelaItens = (itens, titulo = 'Itens', mostrarValor = true) => {
  if (!Array.isArray(itens) || !itens.length) return ''
  const th = 'text-align:left;padding:6px 8px;font-size:11px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:#a89f90;border-bottom:1px solid #eae3d6'
  return (
    '<div style="font-size:12px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:#a89f90;margin:2px 0 8px">' + esc(titulo) + '</div>' +
    '<table style="width:100%;border-collapse:collapse;margin:0 0 14px">' +
    '<thead><tr>' +
    '<th style="' + th + '">Produto</th>' +
    '<th style="' + th + ';text-align:right;white-space:nowrap">Qtd</th>' +
    (mostrarValor ? '<th style="' + th + ';text-align:right">Valor</th>' : '') +
    '</tr></thead><tbody>' +
    itens
      .map(
        (it) =>
          '<tr>' +
          '<td style="padding:7px 8px;font-size:12.5px;color:#272525;border-bottom:1px solid #f1ece2">' +
          (it.codigo ? '<b>' + esc(it.codigo) + '</b> · ' : '') + esc(it.descricao) +
          '</td>' +
          '<td style="padding:7px 8px;font-size:12.5px;text-align:right;white-space:nowrap;border-bottom:1px solid #f1ece2">' +
          esc(it.qtd) + (it.unidade ? ' ' + esc(it.unidade) : '') +
          '</td>' +
          (mostrarValor
            ? '<td style="padding:7px 8px;font-size:12.5px;font-weight:600;text-align:right;white-space:nowrap;border-bottom:1px solid #f1ece2">' +
              (it.valor ? esc(it.valor) : '—') + '</td>'
            : '') +
          '</tr>'
      )
      .join('') +
    '</tbody></table>' +
    (mostrarValor ? '' : '<div style="font-size:12px;color:#8a8378;margin:-6px 0 12px">Os valores serão informados após a negociação/aprovação da Loja.</div>')
  )
}
const itensDe = (v, titulo) => tabelaItens(v.itensLista, titulo, !v.ocultarValor)

export const TEMPLATES = {
  // ── Pedidos ───────────────────────────────────────────────────────────
  pedido_novo_loja: (v) => ({
    subject: `Novo pedido ${v.pedidoId} aguardando aprovação`,
    html: layout('Novo pedido aguardando aprovação',
      p(`Um novo pedido foi criado por ${b(v.revendaNome)} e aguarda análise e aprovação da Loja.`) +
      linhas([['Pedido', v.pedidoId], ['Revenda', v.revendaNome], ['Total', v.total], ['Data', v.data]]) + itensDe(v), 'Pedido'),
  }),
  pedido_recebido_revenda: (v) => ({
    subject: `Recebemos seu pedido ${v.pedidoId}`,
    html: layout('Recebemos o seu pedido',
      p('Olá! Recebemos o seu pedido e ele já está em análise pela Loja Cidade Imperial. Avisaremos assim que for aprovado.') +
      linhas([['Pedido', v.pedidoId], ['Data', v.data]]) + itensDe(v), 'Pedido'),
  }),
  pedido_aprovado: (v) => ({
    subject: `Seu pedido ${v.pedidoId} foi aprovado`,
    html: layout('Pedido aprovado',
      p(`Boa notícia${v.revendaNome ? ', ' + esc(v.revendaNome) : ''}! Seu pedido foi <b style="color:#2f6b39">aprovado</b> pela Loja e seguirá para atendimento.`) +
      linhas([['Pedido', v.pedidoId]]) + itensDe(v, 'Itens aprovados'), 'Pedido'),
  }),
  item_aprovado: (v) => ({
    subject: `Item aprovado no pedido ${v.pedidoId}`,
    html: layout('Item aprovado',
      p(`Um item do seu pedido ${b(v.pedidoId)} foi aprovado pela Loja: ${b(v.produto)}.`), 'Pedido'),
  }),
  pedido_rejeitado: (v) => ({
    subject: `Seu pedido ${v.pedidoId} foi rejeitado`,
    html: layout('Pedido rejeitado',
      p(`Olá${v.revendaNome ? ', ' + esc(v.revendaNome) : ''}. Infelizmente seu pedido foi <b style="color:#a33a2b">rejeitado</b> pela Loja.`) +
      linhas([['Pedido', v.pedidoId], ['Motivo', v.justificativa]]) + itensDe(v, 'Itens rejeitados'), 'Pedido'),
  }),
  item_rejeitado: (v) => ({
    subject: `Item rejeitado no pedido ${v.pedidoId}`,
    html: layout('Item rejeitado',
      p(`Um item do seu pedido ${b(v.pedidoId)} foi rejeitado: ${b(v.produto)}.`) +
      linhas([['Motivo', v.justificativa]]), 'Pedido'),
  }),
  pedido_fornecedor: (v) => ({
    subject: `Novo pedido ${v.pedidoId} para faturamento`,
    html: layout('Novo pedido para faturamento',
      p(`Olá${v.fornecedorNome ? ', ' + esc(v.fornecedorNome) : ''}. A Loja Cidade Imperial encaminhou um pedido para faturamento direto à revenda.`) +
      linhas([['Pedido', v.pedidoId], ['Revenda', v.revendaNome]]) + itensDe(v, 'Itens a faturar'), 'Novo pedido'),
  }),
  pedido_encaminhado_revenda: (v) => ({
    subject: `Seu pedido ${v.pedidoId} foi encaminhado ao fornecedor`,
    html: layout('Pedido encaminhado ao fornecedor',
      p(`Seu pedido ${b(v.pedidoId)} foi aprovado e encaminhado para o fornecedor ${b(v.fornecedorNome)}, responsável pelo faturamento e pela entrega.`) + itensDe(v, 'Itens encaminhados'), 'Pedido'),
  }),
  pedido_estoque_revenda: (v) => ({
    subject: `Seu pedido ${v.pedidoId} será atendido pela Loja`,
    html: layout('Pedido atendido pelo estoque da Loja',
      p(`Seu pedido ${b(v.pedidoId)} será atendido diretamente pelo estoque da Loja Cidade Imperial.`) +
      itensDe(v, 'Itens atendidos'), 'Pedido'),
  }),

  // ── Cotações ──────────────────────────────────────────────────────────
  cotacao_convite: (v) => ({
    subject: `Convite para cotação ${v.cotacao}`,
    html: layout('Convite para cotação',
      p(`Olá${v.fornecedorNome ? ', ' + esc(v.fornecedorNome) : ''}. Você foi convidado a enviar uma proposta para a cotação ${b(v.cotacao)}.`) +
      linhas([['Cotação', v.cotacao], ['Prazo para propostas', v.prazo]]) + itensDe(v, 'Itens a cotar') +
      p('Acesse a plataforma para registrar a sua proposta (por item) antes do prazo.'), 'Cotação'),
  }),
  cotacao_lembrete: (v) => ({
    subject: `Lembrete: cotação ${v.cotacao} aguarda sua proposta`,
    html: layout('Lembrete de cotação',
      p(`Olá${v.fornecedorNome ? ', ' + esc(v.fornecedorNome) : ''}. A cotação ${b(v.cotacao)} ainda aguarda a sua proposta.`) +
      linhas([['Cotação', v.cotacao], ['Prazo para propostas', v.prazo]]) + itensDe(v, 'Itens a cotar'), 'Cotação'),
  }),
  cotacao_proposta_loja: (v) => ({
    subject: `Nova proposta na cotação ${v.cotacao}`,
    html: layout('Nova proposta recebida',
      p(`O fornecedor ${b(v.fornecedorNome)} registrou uma proposta na cotação ${b(v.cotacao)}.`) +
      linhas([['Cotação', v.cotacao], ['Fornecedor', v.fornecedorNome], ['Valor da proposta', v.total]]) + itensDe(v, 'Itens cotados (preço por item)'), 'Cotação'),
  }),
  cotacao_vencedor: (v) => ({
    subject: `Sua proposta venceu a cotação ${v.cotacao}`,
    html: layout('Proposta vencedora',
      p(`Parabéns${v.fornecedorNome ? ', ' + esc(v.fornecedorNome) : ''}! Sua proposta foi selecionada como vencedora da cotação ${b(v.cotacao)}. Um pedido será gerado para faturamento.`) +
      linhas([['Cotação', v.cotacao], ['Valor', v.valor]]) + itensDe(v, 'Itens adjudicados'), 'Cotação'),
  }),
  cotacao_item_vencedor: (v) => ({
    subject: `Item adjudicado a você — cotação ${v.cotacao}`,
    html: layout('Item adjudicado à sua proposta',
      p(`Olá${v.fornecedorNome ? ', ' + esc(v.fornecedorNome) : ''}. Um item da cotação ${b(v.cotacao)} foi adjudicado à sua proposta: ${b(v.produto)}.`) +
      linhas([['Cotação', v.cotacao], ['Valor', v.valor]]), 'Cotação'),
  }),
  cotacao_cancelada: (v) => ({
    subject: `Cotação ${v.cotacao} cancelada`,
    html: layout('Cotação cancelada',
      p(`Olá${v.fornecedorNome ? ', ' + esc(v.fornecedorNome) : ''}. A cotação ${b(v.cotacao)} foi cancelada pela Loja.`) +
      linhas([['Cotação', v.cotacao], ['Motivo', v.motivo]]) + itensDe(v, 'Itens da cotação'), 'Cotação'),
  }),

  // ── Faturamento ───────────────────────────────────────────────────────
  faturamento_revenda: (v) => ({
    subject: `Pedido ${v.pedidoId} faturado — ${v.nf}`,
    html: layout('Pedido faturado',
      p(`Olá! Seu pedido ${b(v.pedidoId)} foi faturado por ${b(v.fornecedorNome)}.`) +
      linhas([['Pedido', v.pedidoId], ['Nota fiscal', v.nf], ['Fornecedor', v.fornecedorNome], ['Valor', v.valor]]) + itensDe(v, 'Itens faturados'), 'Faturamento'),
  }),
  faturamento_loja: (v) => ({
    subject: `Faturamento registrado — ${v.nf}`,
    html: layout('Faturamento registrado',
      p(`Um faturamento foi registrado por ${b(v.fornecedorNome)}.`) +
      linhas([['Nota fiscal', v.nf], ['Pedido', v.pedidoId], ['Fornecedor', v.fornecedorNome], ['Valor', v.valor], ['Royalty', v.royalty]]) + itensDe(v, 'Itens faturados'), 'Faturamento'),
  }),

  // ── Royalties / Cobrança ──────────────────────────────────────────────
  royalty_cobranca: (v) => ({
    subject: `Cobrança de royalties — competência ${v.competencia}`,
    html: layout('Cobrança de royalties',
      p(`Olá${v.fornecedorNome ? ', ' + esc(v.fornecedorNome) : ''}. Segue a cobrança de royalties referente à competência ${b(v.competencia)}, conforme o contrato vigente.`) +
      linhas([['Competência', v.competencia], ['Valor devido', v.valor]]) +
      p('Por favor, providencie o pagamento e registre o comprovante junto à Loja.'), 'Royalties'),
  }),
  royalty_pagamento: (v) => ({
    subject: `Pagamento de royalties ${v.competencia} registrado`,
    html: layout('Pagamento de royalties registrado',
      p(`Olá${v.fornecedorNome ? ', ' + esc(v.fornecedorNome) : ''}. Registramos o pagamento de royalties da competência ${b(v.competencia)}.`) +
      linhas([['Competência', v.competencia], ['Valor', v.valor], ['Data do pagamento', v.data], ['Comprovante', v.comprovante]]), 'Royalties'),
  }),
}

export function renderTemplate(evento, vars = {}) {
  const t = TEMPLATES[evento]
  if (!t) throw new Error('Template de e-mail desconhecido: ' + evento)
  return t(vars)
}
