// Folha-resumo das evidências da cotação com quantidade maior que a do pedido
// da revenda — PNG + PDF.
import { chromium } from 'playwright'
import { readFileSync, readdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const DIR = resolve(here, '../evidencias/qtd-cotacao')
const GOLD = '#B38335'
const DARK = '#272525'
const VERDE = '#2f6b39'
const shot = (f) => `data:image/png;base64,${readFileSync(resolve(DIR, f)).toString('base64')}`
const D = JSON.parse(readFileSync(resolve(DIR, 'dados.json'), 'utf8'))
const fmt = (v) => 'R$ ' + Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const TELAS = [
  ['00-regra.png', 'A regra em um quadro', 'Na cotação a quantidade não tem teto; no envio direto e no estoque continua limitada ao pedido. O que não muda em nenhum caso é o pedido da revenda.'],
  ['01-janela-quantidade-do-pedido.png', 'A janela abre com a quantidade do pedido', `O campo já vem preenchido com o que a revenda pediu (${D.itemQtdPedido} e ${D.item2QtdPedido}); o título avisa que a quantidade pode ser menor ou maior que a pedida.`],
  ['02-item-na-quantidade-pedida.png', 'O item na quantidade pedida', 'Sem excedente, o item fica neutro e a frase de apoio fala do saldo que permanece aprovado para outro caminho.'],
  ['03-item-acima-do-pedido.png', 'O mesmo item cotado acima do pedido', `Cotando ${D.itemQtdCotada} de um item pedido em ${D.itemQtdPedido}: o campo fica âmbar e o aviso declara o excedente e que o pedido da revenda não muda.`],
  ['04-janela-com-lote-maior.png', 'A janela com o lote maior nos dois itens', `${D.itemQtdCotada} e ${D.item2QtdCotada} contra ${D.itemQtdPedido} e ${D.item2QtdPedido} pedidos — cada item com o seu aviso.`],
  ['05-total-com-excedente.png', 'O total estimado conta o volume cotado', `Soma a quantidade cotada, não a pedida, e consolida o excedente: ${D.excedente} unidades a mais, com a explicação da regra.`],
  ['06-envio-direto-continua-limitado.png', 'No envio direto o teto continua valendo', `A mesma quantidade (${D.itemQtdCotada}) é recusada em vermelho: "máximo ${D.itemQtdPedido} — é o que a revenda pediu". Não se entrega o que não foi pedido.`],
  ['07-detalhe-cotacao.png', 'A cotação aberta, do lado da Loja', `${D.cotacao} registrada com o volume maior e o aviso do excedente logo abaixo da demanda.`],
  ['08-demanda-cotada.png', 'A demanda com as duas quantidades', 'Cada item mostra a quantidade cotada e, entre parênteses, a que a revenda pediu — a diferença fica explícita.'],
  ['09-pedido-inalterado.png', 'O pedido da revenda, depois da cotação', `${D.pedido} continua com as quantidades originais e o mesmo valor total.`],
  ['10-itens-do-pedido.png', 'Os itens do pedido, de perto', `${D.itemQtdPedido} e ${D.item2QtdPedido} unidades — exatamente como a revenda pediu. O valor do pedido não mudou: ${fmt(D.totalPedidoDepois)}.`],
  ['11-trilha.png', 'A trilha do pedido', 'Registra que a cotação saiu acima do pedido para negociar volume e que o pedido da revenda não muda.'],
  ['12-cartao-fornecedor.png', 'O que o fornecedor recebe', 'O cartão da cotação convidada traz a quantidade que ele deve precificar — o volume cotado.'],
  ['13-proposta-fornecedor.png', 'A janela da proposta do fornecedor', 'O item aparece com a quantidade cotada e a marca "volume de negociação", para o fornecedor saber que está precificando um lote.'],
  ['14-auditoria.png', 'A auditoria', 'A abertura da cotação registra quantos itens saíram acima do pedido.'],
]

const NUMEROS = [
  ['∞', 'sem teto na cotação', `limite técnico de 99.999 por item`],
  [`+${D.excedente}`, 'unidades cotadas a mais', `neste exemplo, sobre ${D.itemQtdPedido + D.item2QtdPedido} pedidas`],
  ['0', 'mudança no pedido', `${fmt(D.totalPedidoAntes)} antes e depois`],
  ['26', 'asserções no teste', '0 falhas'],
]

const ANTES_DEPOIS = [
  ['Cotar acima do pedido', 'recusado — o campo travava no máximo pedido', 'permitido, com o excedente declarado em âmbar'],
  ['Total estimado', 'só podia refletir até a quantidade pedida', 'soma o volume cotado e consolida quantas unidades estão a mais'],
  ['Item da cotação', 'guardava só a quantidade cotada', 'guarda a cotada e a pedida, quando diferem'],
  ['Envio direto e estoque', 'limitados ao pedido', 'continuam limitados ao pedido — regra inalterada'],
  ['Pedido da revenda', '—', 'não muda: mesma quantidade, mesmo valor, mesmo faturamento'],
]

const REGISTRO = [
  ['Na cotação', 'a quantidade cotada e, quando maior, também a quantidade do pedido — o detalhe mostra "×12 (pedido: 2)"'],
  ['Para o fornecedor', 'o item vem com a quantidade a precificar e a marca "volume de negociação" na janela da proposta'],
  ['Na trilha do pedido', 'quantos itens saíram acima do pedido, com a ressalva de que o pedido da revenda não muda'],
  ['Na auditoria', 'a abertura da cotação registra o número de itens acima do pedido'],
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
    <div style="font-size:33px;font-weight:700;line-height:1.15;margin-bottom:12px">Cotação com quantidade maior que a do pedido</div>
    <div style="font-size:14.5px;line-height:1.6;color:#c9c1b4;max-width:1080px">Ao abrir uma cotação, a Loja pode cotar um lote maior do que a revenda pediu, para negociar preço de volume. O excedente é volume de negociação: o fornecedor precifica a quantidade maior e o pedido da revenda continua com a quantidade original — é por ela que a revenda é faturada. No envio direto e no atendimento pelo estoque o limite continua sendo a quantidade pedida.</div>
  </div>

  <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:0;background:#fff;border-bottom:1px solid #eae3d6">
    ${NUMEROS.map(([v, l, s]) => `<div style="padding:20px 26px;border-right:1px solid #f1ece2">
      <div style="font-size:29px;font-weight:700;color:${GOLD}">${v}</div>
      <div style="font-size:12.5px;font-weight:600;margin-top:3px">${l}</div>
      <div style="font-size:11px;color:#a89f90;margin-top:2px">${s}</div></div>`).join('')}
  </div>

  <div style="padding:30px 48px 6px">
    <div style="font-size:12px;font-weight:700;letter-spacing:.13em;color:#a89f90;margin-bottom:16px">O QUE MUDOU</div>
    <div style="background:#fff;border:1px solid #eae3d6;border-radius:12px;overflow:hidden">
      <table style="width:100%;border-collapse:collapse;font-size:13px">
        <tr style="background:#faf7f0">
          <th style="text-align:left;padding:10px 18px;font-size:10.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#a89f90;width:24%"></th>
          <th style="text-align:left;padding:10px 14px;font-size:10.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#a89f90">Antes</th>
          <th style="text-align:left;padding:10px 18px;font-size:10.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:${VERDE}">Agora</th>
        </tr>
        ${ANTES_DEPOIS.map(([k, a, b]) => `<tr>
          <td style="padding:11px 18px;font-weight:700;border-top:1px solid #f5f1e8">${k}</td>
          <td style="padding:11px 14px;color:#a89f90;border-top:1px solid #f5f1e8">${a}</td>
          <td style="padding:11px 18px;color:${VERDE};font-weight:600;border-top:1px solid #f5f1e8;background:#f9fcf9">${b}</td></tr>`).join('')}
      </table>
    </div>
    <div style="font-size:12px;color:#a89f90;margin-top:11px;line-height:1.6">Decisão de projeto assumida: o excedente é <b>volume de negociação</b>, não compra adicional. A plataforma não gera pedido de compra da Loja para o excedente — ele serve para o fornecedor precificar o lote. Se no futuro a Loja quiser comprar de fato o excedente para o próprio estoque, isso é um recurso à parte.</div>
  </div>

  <div style="padding:26px 48px 6px">
    <div style="font-size:12px;font-weight:700;letter-spacing:.13em;color:#a89f90;margin-bottom:16px">ONDE A DIFERENÇA FICA VISÍVEL</div>
    <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:14px">
      ${REGISTRO.map(([k, v]) => `<div style="background:#fff;border:1px solid #eae3d6;border-radius:12px;padding:15px 19px">
        <div style="font-size:13.5px;font-weight:700;margin-bottom:4px">${k}</div>
        <div style="font-size:12.5px;color:#8a8378;line-height:1.55">${v}</div></div>`).join('')}
    </div>
    <div style="font-size:12px;color:#a89f90;margin-top:12px;line-height:1.6">Regras que continuam valendo: quantidade zero, vazia ou não numérica é recusada; cotar <i>menos</i> que o pedido continua deixando o saldo aprovado para outro caminho; e o limite técnico por item é de 99.999 unidades.</div>
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
    <span>Cotação acima da quantidade do pedido</span>
  </div>
</div>`

const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true })
const pg = await br.newPage({ viewport: { width: 1400, height: 1200 }, deviceScaleFactor: 1.5 })
await pg.setContent(html)
await pg.waitForTimeout(900)
const png = resolve(DIR, '00-resumo.png')
await pg.locator('div').first().screenshot({ path: png })
const pdf = resolve(here, '../Plataforma-Cidade-Imperial-Evidencias-Quantidade-Cotacao.pdf')
await pg.emulateMedia({ media: 'print' })
await pg.addStyleTag({ content: '@page{margin:0;size:1400px 1000px} img{break-inside:avoid} div{break-inside:avoid}' })
await pg.pdf({ path: pdf, width: '1400px', height: '1000px', printBackground: true })
await br.close()
console.log('PNG ok: ', png)
console.log('PDF ok: ', pdf)
console.log('capturas:', readdirSync(DIR).filter((f) => f.endsWith('.png')).length)
