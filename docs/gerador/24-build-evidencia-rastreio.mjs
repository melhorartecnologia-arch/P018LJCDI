// Folha-resumo das evidências do rastreio da entrega — PNG + PDF.
import { chromium } from 'playwright'
import { readFileSync, readdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const DIR = resolve(here, '../evidencias/rastreio')
const GOLD = '#B38335'
const DARK = '#272525'
const VERDE = '#2f6b39'
const VERM = '#a33a2b'
const shot = (f) => `data:image/png;base64,${readFileSync(resolve(DIR, f)).toString('base64')}`
// Capturas em retrato (janelas, e-mail) ficariam gigantes esticadas na folha:
// são centralizadas com largura menor, lendo as dimensões do próprio PNG.
const dim = (f) => { const b = readFileSync(resolve(DIR, f)); return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) } }
const estiloImg = (f) => { const d = dim(f)
  return d.h > d.w ? 'width:100%;max-width:' + Math.round(620 * Math.min(1, d.w / 900)) + 'px;margin:14px auto;display:block'
                   : 'width:100%;display:block' }
const D = JSON.parse(readFileSync(resolve(DIR, 'dados.json'), 'utf8'))

const TELAS = [
  ['00-regra.png', 'A regra em um quadro', 'Quem paga o frete informa como acompanhar a entrega — e é a negociação que define quem paga.'],
  ['00-transportadoras.png', 'O padrão de cada transportadora', `As ${D.transportadoras} opções do catálogo, com o nome do documento, o formato aceito e o endereço de consulta que a plataforma usa para montar o link.`],
  ['01-linha-rastreio-pendente.png', 'A Loja cobra o rastreio na lista', `Assim que ${D.pedido} é encaminhado a ${D.fornecedor}, a linha ganha a etiqueta âmbar "🚚 Rastreio pendente" — o fornecedor ainda não disse como acompanhar.`],
  ['02-detalhe-cobra-rastreio.png', 'E cobra também no detalhe do pedido', 'O painel explica que o frete é responsabilidade do fornecedor, o que falta e de onde veio essa conclusão.'],
  ['03-card-do-fornecedor.png', 'O que o fornecedor vê', 'O card do pedido traz o aviso em âmbar e o botão "🚚 Informar rastreio…", disponível antes mesmo do faturamento.'],
  ['05-faturamento-recusado.png', 'O faturamento não passa sem o rastreio', 'Com valor preenchido e nota anexada, a plataforma ainda recusa: "Informe o código de rastreamento de Correios — é com ele que a revenda acompanha a entrega."'],
  ['06-janela-de-rastreio.png', 'A janela de rastreio', 'Transportadora, documento no padrão dela, link, previsão de entrega e observação. O topo diz por que o rastreio é obrigatório neste pedido.'],
  ['07-codigo-fora-do-padrao.png', 'O código é validado contra o padrão', 'Digitando "123" nos Correios, a janela recusa e mostra o formato esperado — duas letras, nove dígitos e BR.'],
  ['08-link-montado-pelo-padrao.png', 'O link é montado a partir do código', `Com ${D.codigo}, a plataforma monta ${D.urlPadraoCorreios} — e o botão "🔗 Testar o link agora" abre a consulta antes de salvar.`],
  ['09-troca-de-transportadora.png', 'Trocar a transportadora troca o padrão', `Escolhendo Jadlog, o campo passa a pedir o Nº do CT-e, o código é reformatado para ${D.codigoNaJadlog} (só números) e o link vira ${D.urlJadlog}.`],
  ['10-janela-preenchida.png', 'A janela pronta para salvar', `${D.codigo} nos Correios, previsão de ${D.previsao} e a observação com volumes e janela de entrega.`],
  ['11-card-com-rastreio.png', 'O card do fornecedor depois de salvar', 'O aviso âmbar dá lugar ao rastreio informado, e o botão passa a ser "🚚 Atualizar rastreio…".'],
  ['12-linha-com-rastreio.png', 'A lista da Loja passa a acompanhar', 'A etiqueta verde traz transportadora e código, clicável para o site da transportadora em outra aba. A pendência sumiu.'],
  ['13-detalhe-em-transito.png', 'O painel de entrega em trânsito', 'Transportadora, código, previsão, observação, quem informou e quando — com o botão de acompanhar e a responsabilidade do frete ao pé.'],
  ['15-linha-da-revenda.png', 'A revenda vê o mesmo', 'Em "Meus pedidos", a mesma etiqueta verde com o mesmo link — sem precisar pedir o código a ninguém.'],
  ['16-email-do-rastreio.png', 'O e-mail que chega aos dois lados', `Assunto "${D.assuntoEmail}", com transportadora, código, previsão, o botão de acompanhar, o link por extenso e a observação da entrega.`],
  ['14-bloco-no-documento.png', 'O bloco no documento do pedido em PDF', 'O documento imprime transportadora, código, link completo, previsão, observação, responsabilidade do frete e quem informou.'],
  ['17-atualizar-rastreio.png', 'Corrigir é sempre possível', 'A janela mostra o rastreio vigente antes da troca — código errado ou transportadora trocada não viram problema.'],
  ['18-historico-de-rastreios.png', 'O anterior fica no histórico', `Depois da correção para ${D.codigoCorrigido}, o painel passa a listar "Rastreios anteriores" com o código antigo, o autor e o horário.`],
  ['19-trilha-do-pedido.png', 'A trilha do pedido', 'Informar e atualizar o rastreio entram na trilha, com data, hora e usuário.'],
  ['20-auditoria.png', 'A auditoria', 'Cada registro e cada correção ficam na auditoria, com pedido, transportadora, código, link e revenda.'],
]

const NUMEROS = [
  [`${D.transportadoras}`, 'transportadoras no catálogo', 'cada uma com o seu padrão de documento'],
  ['0', 'faturamentos sem rastreio', 'em pedido com frete do fornecedor'],
  ['2', 'lados avisados por e-mail', 'a revenda e a Loja, a cada registro'],
  ['51', 'asserções no teste', '0 falhas'],
]

const ONDE = [
  ['Card do fornecedor', 'botão "Informar rastreio…" assim que o pedido é encaminhado — antes mesmo do faturamento'],
  ['Janela de faturamento', 'bloco obrigatório quando o frete é do fornecedor: sem transportadora, código e link o faturamento não conclui'],
  ['Lista de pedidos da Loja', 'etiqueta verde clicável com transportadora e código, ou etiqueta âmbar de pendência'],
  ['Detalhe do pedido', 'painel com previsão, observação, autor, responsabilidade do frete, botão de acompanhar e histórico'],
  ['Lista da revenda', 'a mesma etiqueta verde, com o mesmo link, em "Meus pedidos"'],
  ['Documento do pedido em PDF', 'bloco "Rastreio da entrega" com o link impresso por extenso'],
  ['E-mail', 'aviso para a revenda e para a Loja a cada informação ou correção'],
  ['Trilha e auditoria', 'todo registro e toda troca, com autor e horário'],
]

const REGRA = [
  ['Frete CIF (fornecedor)', 'rastreio obrigatório — faturamento travado sem ele', 'proposta vencedora da cotação'],
  ['Pedido sem cotação', 'rastreio obrigatório — o frete é do fornecedor por padrão', 'padrão da plataforma'],
  ['Frete FOB (revenda)', 'rastreio opcional — quem contrata o transporte é a revenda', 'proposta vencedora da cotação'],
  ['Atendimento pelo estoque da Loja', 'rastreio opcional — a entrega é da própria Loja', 'situação dos itens do pedido'],
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
    <div style="font-size:33px;font-weight:700;line-height:1.15;margin-bottom:12px">Rastreio da entrega, no padrão da transportadora</div>
    <div style="font-size:14.5px;line-height:1.6;color:#c9c1b4;max-width:1080px">Todo pedido em que o frete é responsabilidade do fornecedor passa a exigir dele a informação de rastreio: transportadora, código no padrão dela e o link de consulta. Sem isso a plataforma não conclui o faturamento. Informado, a revenda e a Loja acompanham a entrega pela lista de pedidos, pelo detalhe, pelo documento em PDF e por e-mail.</div>
  </div>

  <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:0;background:#fff;border-bottom:1px solid #eae3d6">
    ${NUMEROS.map(([v, l, s]) => `<div style="padding:20px 26px;border-right:1px solid #f1ece2">
      <div style="font-size:29px;font-weight:700;color:${GOLD}">${v}</div>
      <div style="font-size:12.5px;font-weight:600;margin-top:3px">${l}</div>
      <div style="font-size:11px;color:#a89f90;margin-top:2px">${s}</div></div>`).join('')}
  </div>

  <div style="padding:30px 48px 6px">
    <div style="font-size:12px;font-weight:700;letter-spacing:.13em;color:#a89f90;margin-bottom:16px">QUANDO O RASTREIO É OBRIGATÓRIO</div>
    <div style="background:#fff;border:1px solid #eae3d6;border-radius:12px;overflow:hidden">
      <table style="width:100%;border-collapse:collapse;font-size:13px">
        <tr style="background:#faf7f0">
          <th style="text-align:left;padding:10px 18px;font-size:10.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#a89f90;width:26%">Situação do pedido</th>
          <th style="text-align:left;padding:10px 14px;font-size:10.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#a89f90">O que a plataforma exige</th>
          <th style="text-align:left;padding:10px 18px;font-size:10.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#a89f90;width:26%">De onde vem a informação</th>
        </tr>
        ${REGRA.map(([k, a, b], i) => `<tr>
          <td style="padding:11px 18px;font-weight:700;border-top:1px solid #f5f1e8">${k}</td>
          <td style="padding:11px 14px;border-top:1px solid #f5f1e8;font-weight:600;color:${i < 2 ? GOLD : '#8a8378'};background:${i < 2 ? '#fdfaf3' : '#fff'}">${a}</td>
          <td style="padding:11px 18px;color:#8a8378;border-top:1px solid #f5f1e8">${b}</td></tr>`).join('')}
      </table>
    </div>
    <div style="font-size:12px;color:#a89f90;margin-top:11px;line-height:1.6">Decisão de projeto assumida: <b>sem cotação, o frete é do fornecedor</b>. É o caso mais comum no envio direto, e deixa a exigência ligada por padrão — quem quiser o contrário registra a condição FOB na cotação. O painel do pedido sempre mostra qual foi a base usada, para a regra nunca parecer arbitrária.</div>
  </div>

  <div style="padding:26px 48px 6px">
    <div style="font-size:12px;font-weight:700;letter-spacing:.13em;color:#a89f90;margin-bottom:16px">ONDE O RASTREIO APARECE</div>
    <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:12px">
      ${ONDE.map(([k, v]) => `<div style="background:#fff;border:1px solid #eae3d6;border-radius:12px;padding:14px 18px">
        <div style="font-size:13.5px;font-weight:700;margin-bottom:3px">${k}</div>
        <div style="font-size:12.5px;color:#8a8378;line-height:1.55">${v}</div></div>`).join('')}
    </div>
    <div style="font-size:12px;color:#a89f90;margin-top:12px;line-height:1.6">Sobre os endereços de consulta: eles seguem o padrão conhecido de cada transportadora, mas <b>site de rastreio muda de endereço com o tempo</b> — por isso o link montado é sempre editável, e a janela oferece testá-lo antes de salvar. Vale conferir os principais na homologação e colar o endereço oficial onde divergir; a correção fica gravada no pedido.</div>
  </div>

  <div style="padding:22px 48px 40px">
    <div style="font-size:12px;font-weight:700;letter-spacing:.13em;color:#a89f90;margin:16px 0 16px">O FLUXO, PASSO A PASSO</div>
    ${TELAS.map(([f, t, d], i) => `<div style="background:#fff;border:1px solid #eae3d6;border-radius:13px;overflow:hidden;margin-bottom:20px">
      <div style="display:flex;align-items:flex-start;gap:13px;padding:15px 20px;border-bottom:1px solid #f1ece2">
        <div style="width:27px;height:27px;border-radius:8px;background:#faf3e4;border:1px solid #e6cf9e;color:#8f682a;font-size:12.5px;font-weight:700;display:flex;align-items:center;justify-content:center;flex:none">${String(i + 1).padStart(2, '0')}</div>
        <div><div style="font-size:14.5px;font-weight:700">${t}</div>
        <div style="font-size:12.5px;color:#8a8378;line-height:1.5;margin-top:2px">${d}</div></div>
      </div>
      <img src="${shot(f)}" style="${estiloImg(f)}">
    </div>`).join('')}
  </div>

  <div style="background:${DARK};color:#9c948a;font-size:11.5px;padding:17px 48px;display:flex;justify-content:space-between">
    <span>Plataforma Cidade Imperial · Cervejaria Cidade Imperial · evidências de implementação</span>
    <span>Rastreio da entrega</span>
  </div>
</div>`

const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true })
const pg = await br.newPage({ viewport: { width: 1400, height: 1200 }, deviceScaleFactor: 1.5 })
await pg.setContent(html)
await pg.waitForTimeout(900)
const png = resolve(DIR, '00-resumo.png')
await pg.locator('div').first().screenshot({ path: png })
const pdf = resolve(here, '../Plataforma-Cidade-Imperial-Evidencias-Rastreio-da-Entrega.pdf')
await pg.emulateMedia({ media: 'print' })
await pg.addStyleTag({ content: '@page{margin:0;size:1400px 1000px} img{break-inside:avoid} div{break-inside:avoid}' })
await pg.pdf({ path: pdf, width: '1400px', height: '1000px', printBackground: true })
await br.close()
console.log('PNG ok: ', png)
console.log('PDF ok: ', pdf)
console.log('capturas:', readdirSync(DIR).filter((f) => f.endsWith('.png')).length)
