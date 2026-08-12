// Folha-resumo das evidências do documento do pedido em PDF — PNG + PDF.
import { chromium } from 'playwright'
import { readFileSync, readdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const DIR = resolve(here, '../evidencias/pdf-pedido')
const GOLD = '#B38335'
const DARK = '#272525'
const VERDE = '#2f6b39'
const ROXO = '#5b4a86'
const shot = (f) => `data:image/png;base64,${readFileSync(resolve(DIR, f)).toString('base64')}`
const D = JSON.parse(readFileSync(resolve(DIR, 'dados.json'), 'utf8'))
const fmt = (v) => 'R$ ' + Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const TELAS = [
  ['00-regra.png', 'O recurso em um quadro', 'O mesmo documento nas duas visões, montado na hora, com uma regra de visibilidade que protege o que ainda não foi negociado com a revenda.'],
  ['01-lista-da-loja.png', 'A lista de pedidos da Loja', 'Cada linha ganhou o botão do documento, logo abaixo do número do pedido — sem precisar abrir o pedido para emitir.'],
  ['02-botao-na-linha.png', 'O botão na linha, de perto', `O pedido ${D.pedido} com o botão 📄 PDF sob o número, ao lado da conversa, da etapa e do selo de recebimento.`],
  ['08-botao-no-detalhe.png', 'O botão no detalhe do pedido', 'Dentro do pedido, "📄 Documento do pedido (PDF)" fica ao lado da conversa — mesmo documento, segundo caminho.'],
  ['03-cabecalho-do-documento.png', 'O cabeçalho do documento', `Identidade da Cidade Imperial, número do pedido, situação, etapa do workflow (${D.pedido} está em 10/10), data de criação e o momento exato da emissão.`],
  ['04-partes-e-destino.png', 'Partes e destino', 'Emitente, revenda compradora com razão social, CNPJ, cidade, telefone e e-mail, e o fornecedor de destino do atendimento.'],
  ['05-situacao-prazos-e-datas.png', 'Situação, prazos e datas', 'Criação, situação, etapa, prazo da cotação, prazo de entrega, validade da proposta, faturamento e a confirmação de recebimento com quem confirmou e a observação registrada.'],
  ['06-condicoes-comerciais.png', 'Condições comerciais negociadas', 'Origem das condições, fornecedor, forma de pagamento, prazo de entrega, modalidade e valor do frete e validade — vindos da proposta vencedora da cotação.'],
  ['07-itens-com-foto-e-ficha.png', 'Itens com foto, ficha e valores', `Foto, código, descrição, categoria, unidade, quantidade, preço de referência, preço negociado, subtotal, situação e destino. Ao pé, os totais: referência, negociado, economia e o valor faturado (${fmt(2212)}).`],
  ['09-cotacao-com-o-comparativo.png', 'A cotação vinculada, na visão da Loja', `${D.cotacao} com convidados, propostas recebidas, vencedora, economia apurada — e o comparativo das propostas com preço, frete, total, prazo e condições de cada fornecedor.`],
  ['10-faturamento-e-notas.png', 'Faturamento e documentos fiscais', `${D.nf} com data, competência, fornecedor, valor, royalty apurado e os anexos da nota. A coluna de royalty só aparece para a Loja.`],
  ['11-conversa-do-pedido.png', 'A conversa do pedido', `As ${D.mensagens} mensagens trocadas entre a Loja e a revenda entram no documento com data, hora e autor — o combinado fica anexado ao pedido.`],
  ['12-trilha-completa.png', 'A trilha completa', 'Todos os eventos do pedido, do cadastro à confirmação de recebimento, com data, hora, usuário e ação.'],
  ['13-pedido-pendente-enxuto.png', 'Um pedido ainda pendente', `O documento acompanha a fase: ${D.pendente} sai com ${D.blocosPendente} blocos em vez de ${D.blocos} — sem cotação, sem faturamento, sem conversa. Repare na ficha fiscal do item (NCM, EAN, pesos e dimensões) e no aviso de que ainda não há condições comerciais.`],
  ['15-lista-da-revenda.png', 'A lista da revenda', 'Em "Meus pedidos" o botão é o mesmo e fica no mesmo lugar — a revenda emite o documento do próprio pedido.'],
  ['16-documento-da-revenda.png', 'O documento emitido pela revenda', 'Mesmo cabeçalho, mesmo pedido, mesma numeração de etapa — o rodapé identifica quem emitiu e quando.'],
  ['17-cotacao-sem-o-comparativo.png', 'A mesma cotação, vista pela revenda', 'Ela vê o andamento — convidados, número de propostas, vencedora e economia — mas o comparativo de preços entre fornecedores não é impresso.'],
  ['18-valor-a-definir-para-a-revenda.png', 'Item ainda não negociado', `Em ${D.pedidoSemNegociacao}, sem negociação fechada, os valores saem como "a definir" e o total como "A definir": o documento não antecipa preço não acordado.`],
  ['14-auditoria.png', 'A auditoria', 'Cada emissão fica registrada com o pedido, o usuário, o perfil e o horário.'],
]

const NUMEROS = [
  ['3', 'caminhos até o documento', 'lista da Loja, detalhe do pedido e lista da revenda'],
  [`${D.blocos}`, 'blocos no documento completo', `${D.blocosPendente} num pedido ainda pendente`],
  [`${D.pdfLojaKB} KB`, 'do PDF gerado', `com as ${D.fotos} fotos dos itens embutidas`],
  ['33', 'asserções no teste', '0 falhas'],
]

const CONTEUDO = [
  ['Cabeçalho', 'identidade da Cidade Imperial, número do pedido, situação, etapa do workflow, data de criação e data/hora da emissão'],
  ['Partes e destino', 'emitente, revenda compradora (razão social, CNPJ, cidade/UF, telefone e e-mail) e fornecedor de destino'],
  ['Situação, prazos e datas', 'etapa atual, prazo da cotação, prazo de entrega, validade da proposta, faturamento e confirmação de recebimento'],
  ['Condições comerciais', 'pagamento, prazo, frete e validade da proposta vencedora — ou, sem cotação, o contrato vigente do fornecedor de destino'],
  ['Itens', 'foto, código, descrição, categoria, unidade, ficha fiscal (NCM, EAN, pesos e dimensões), quantidade, preço de referência, preço negociado, subtotal, situação e destino'],
  ['Totais', 'referência, negociado, economia apurada e o valor faturado — o rótulo muda conforme a fase do pedido'],
  ['Cotação vinculada', 'convidados, propostas, rodadas, vencedora, justificativa, observação enviada aos fornecedores e economia'],
  ['Faturamento', 'notas fiscais, competência, valor, royalty (só para a Loja) e os anexos de cada documento'],
  ['Anexos, conversa e trilha', 'arquivos do atendimento, todas as mensagens com autor e horário, e a trilha completa do pedido'],
]

const VISIBILIDADE = [
  ['Comparativo de propostas', 'sim — preço, frete, total, prazo e condições de cada fornecedor', 'não é impresso'],
  ['Andamento da cotação', 'sim', 'sim — convidados, nº de propostas, vencedora e economia'],
  ['Royalty por nota fiscal', 'sim', 'não é impresso'],
  ['Item ainda não negociado', 'preço de referência do catálogo', '"a definir" no lugar do valor'],
  ['Pedidos de outras revendas', 'todos', 'apenas os próprios pedidos'],
]

const html = `
<div style="width:1400px;background:#f7f4ee;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:${DARK}">
  <div style="background:${DARK};padding:34px 48px 30px;color:#fff">
    <div style="display:flex;align-items:center;gap:14px;margin-bottom:26px">
      <div style="width:44px;height:44px;border-radius:11px;background:linear-gradient(135deg,#cfa055,${GOLD} 60%,#8a6428);display:flex;align-items:center;justify-content:center;font-family:Georgia,serif;font-weight:700;font-size:19px;color:#fff">CI</div>
      <div>
        <div style="font-family:Georgia,serif;font-weight:700;font-size:17px;letter-spacing:.12em">CIDADE IMPERIAL</div>
        <div style="font-size:10.5px;letter-spacing:.16em;color:#b9b0a2;margin-top:2px">PLATAFORMA DA LOJA</div>
      </div>
      <div style="margin-left:auto;font-size:11px;font-weight:700;letter-spacing:.1em;color:#8fd39c;border:1px solid #3f5a45;background:#26332a;border-radius:7px;padding:6px 13px">CONCLUÍDO ✓</div>
    </div>
    <div style="font-size:11px;font-weight:700;letter-spacing:.16em;color:${GOLD};margin-bottom:9px">EVIDÊNCIAS DA IMPLEMENTAÇÃO</div>
    <div style="font-size:33px;font-weight:700;line-height:1.15;margin-bottom:12px">Documento completo do pedido em PDF</div>
    <div style="font-size:14.5px;line-height:1.6;color:#c9c1b4;max-width:1080px">A lista de pedidos passou a emitir, em um clique, a ficha completa do pedido — fotos e descrição dos itens, quantidades, valores de referência e negociados, condições comerciais, prazo e forma de pagamento, data de entrega, faturamento, conversa e trilha. O botão está na lista da Loja, no detalhe do pedido e na lista da revenda. O documento abre em nova aba já formatado em A4 e o navegador salva ou envia com Ctrl+P (⌘+P no Mac) → "Salvar como PDF".</div>
  </div>

  <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:0;background:#fff;border-bottom:1px solid #eae3d6">
    ${NUMEROS.map(([v, l, s]) => `<div style="padding:20px 26px;border-right:1px solid #f1ece2">
      <div style="font-size:29px;font-weight:700;color:${GOLD}">${v}</div>
      <div style="font-size:12.5px;font-weight:600;margin-top:3px">${l}</div>
      <div style="font-size:11px;color:#a89f90;margin-top:2px">${s}</div></div>`).join('')}
  </div>

  <div style="padding:30px 48px 6px">
    <div style="font-size:12px;font-weight:700;letter-spacing:.13em;color:#a89f90;margin-bottom:16px">O QUE O DOCUMENTO TRAZ</div>
    <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:12px">
      ${CONTEUDO.map(([k, v]) => `<div style="background:#fff;border:1px solid #eae3d6;border-radius:12px;padding:14px 18px">
        <div style="font-size:13.5px;font-weight:700;margin-bottom:3px">${k}</div>
        <div style="font-size:12.5px;color:#8a8378;line-height:1.55">${v}</div></div>`).join('')}
    </div>
    <div style="font-size:12px;color:#a89f90;margin-top:12px;line-height:1.6">Blocos sem informação não são impressos: um pedido pendente sai com ${D.blocosPendente} blocos e o pedido faturado com ${D.blocos}. Nada fica guardado como arquivo — a cada clique o documento é montado com os dados do momento, e a emissão entra na auditoria.</div>
  </div>

  <div style="padding:26px 48px 6px">
    <div style="font-size:12px;font-weight:700;letter-spacing:.13em;color:#a89f90;margin-bottom:16px">O QUE CADA LADO ENXERGA</div>
    <div style="background:#fff;border:1px solid #eae3d6;border-radius:12px;overflow:hidden">
      <table style="width:100%;border-collapse:collapse;font-size:13px">
        <tr style="background:#faf7f0">
          <th style="text-align:left;padding:10px 18px;font-size:10.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#a89f90;width:26%"></th>
          <th style="text-align:left;padding:10px 14px;font-size:10.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:${GOLD}">No PDF emitido pela Loja</th>
          <th style="text-align:left;padding:10px 18px;font-size:10.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:${ROXO}">No PDF emitido pela revenda</th>
        </tr>
        ${VISIBILIDADE.map(([k, a, b]) => `<tr>
          <td style="padding:11px 18px;font-weight:700;border-top:1px solid #f5f1e8">${k}</td>
          <td style="padding:11px 14px;color:#8a8378;border-top:1px solid #f5f1e8">${a}</td>
          <td style="padding:11px 18px;color:${ROXO};font-weight:600;border-top:1px solid #f5f1e8;background:#faf9fd">${b}</td></tr>`).join('')}
      </table>
    </div>
    <div style="font-size:12px;color:#a89f90;margin-top:11px;line-height:1.6">Ponto de decisão que vale registrar: a revenda <b>vê</b> o andamento da cotação — quais fornecedores foram convidados, quantas propostas chegaram, quem venceu e a economia apurada. O que ela não vê é o comparativo de preços entre eles. Se a Loja preferir que nem esse andamento saia no documento da revenda, é um ajuste de uma linha.</div>
  </div>

  <div style="padding:22px 48px 40px">
    <div style="font-size:12px;font-weight:700;letter-spacing:.13em;color:#a89f90;margin:16px 0 16px">O FLUXO, PASSO A PASSO</div>
    ${TELAS.map(([f, t, d], i) => `<div style="background:#fff;border:1px solid #eae3d6;border-radius:13px;overflow:hidden;margin-bottom:20px">
      <div style="display:flex;align-items:flex-start;gap:13px;padding:15px 20px;border-bottom:1px solid #f1ece2">
        <div style="width:27px;height:27px;border-radius:8px;background:#faf3e4;border:1px solid #e6cf9e;color:#8f682a;font-size:12.5px;font-weight:700;display:flex;align-items:center;justify-content:center;flex:none">${String(i + 1).padStart(2, '0')}</div>
        <div><div style="font-size:14.5px;font-weight:700">${t}</div>
        <div style="font-size:12.5px;color:#8a8378;line-height:1.5;margin-top:2px">${d}</div></div>
      </div>
      <img src="${shot(f)}" style="width:100%;display:block">
    </div>`).join('')}
  </div>

  <div style="background:${DARK};color:#9c948a;font-size:11.5px;padding:17px 48px;display:flex;justify-content:space-between">
    <span>Plataforma Cidade Imperial · Cervejaria Cidade Imperial · evidências de implementação</span>
    <span>Documento do pedido em PDF</span>
  </div>
</div>`

const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true })
const pg = await br.newPage({ viewport: { width: 1400, height: 1200 }, deviceScaleFactor: 1.5 })
await pg.setContent(html)
await pg.waitForTimeout(900)
const png = resolve(DIR, '00-resumo.png')
await pg.locator('div').first().screenshot({ path: png })
const pdf = resolve(here, '../Plataforma-Cidade-Imperial-Evidencias-PDF-do-Pedido.pdf')
await pg.emulateMedia({ media: 'print' })
await pg.addStyleTag({ content: '@page{margin:0;size:1400px 1000px} img{break-inside:avoid} div{break-inside:avoid}' })
await pg.pdf({ path: pdf, width: '1400px', height: '1000px', printBackground: true })
await br.close()
console.log('PNG ok: ', png)
console.log('PDF ok: ', pdf)
console.log('capturas:', readdirSync(DIR).filter((f) => f.endsWith('.png')).length)
