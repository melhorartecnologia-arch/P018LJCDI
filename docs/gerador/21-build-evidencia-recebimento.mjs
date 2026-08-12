// Folha-resumo das evidências da confirmação de recebimento do material
// (10ª etapa do pedido) — PNG + PDF.
import { chromium } from 'playwright'
import { readFileSync, readdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const DIR = resolve(here, '../evidencias/recebimento-material')
const GOLD = '#B38335'
const DARK = '#272525'
const VERDE = '#2f6b39'
const shot = (f) => `data:image/png;base64,${readFileSync(resolve(DIR, f)).toString('base64')}`
const D = JSON.parse(readFileSync(resolve(DIR, 'dados.json'), 'utf8'))

const TELAS = [
  ['00-etapas.png', 'A regra em um quadro', 'O workflow passa de 9 para 10 etapas: entre o faturamento e a conclusão entra a confirmação de que o material chegou — feita pela revenda ou pela Loja.'],
  ['01-lista-loja-etapa9.png', 'Loja · o pedido faturado para na etapa 9', `${D.pedidoRevenda} aparece como "Etapa 9/10 · Entrega — aguardando confirmação". O pedido não conclui sozinho depois de faturado.`],
  ['02-linha-aguardando.png', 'A linha do pedido, de perto', 'Status "Faturado", a etapa 9 e o botão verde "✓ Confirmar recebimento…" disponível também para a Loja.'],
  ['03-detalhe-aguardando.png', 'Detalhe do pedido antes da confirmação', 'O painel âmbar explica que o pedido está entregue e aguarda a confirmação, e traz o botão de confirmar.'],
  ['04-regua-etapa9.png', 'A régua de etapas — final', 'As duas etapas novas: "Entrega — aguardando confirmação" (atual) e "Conclusão", ainda pendente.'],
  ['05-painel-aguardando.png', 'O painel de aguardando, isolado', 'O texto diz quem pode confirmar: a Loja ali mesmo, ou a revenda pela tela "Meus pedidos".'],
  ['06-lista-revenda-botao.png', 'Revenda · "Meus pedidos" com o botão', 'Do lado da revenda o botão aparece na mesma coluna de status, nos pedidos entregues.'],
  ['07-janela-revenda.png', 'A janela de confirmação', 'Traz o número do pedido, a etapa, a lista dos itens entregues para conferência e quem entregou.'],
  ['08-janela-preenchida.png', 'Com a observação preenchida', `Campo opcional para avarias, divergências e quem recebeu: "${D.obs}"`],
  ['09-revenda-confirmado.png', 'Confirmado — o pedido vai para a etapa 10', 'A lista da revenda passa a mostrar "Etapa 10/10 · Conclusão" e o aviso de confirmação.'],
  ['10-linha-com-selo.png', 'O selo na linha do pedido', 'No lugar do botão entra "✓ Recebido em …"; o histórico completo fica na dica do selo.'],
  ['11-email-aviso.png', 'O aviso que chega para o outro lado', `Assunto "${D.assunto}", com quem confirmou, quando, a observação em destaque e os itens do pedido.`],
  ['12-janela-loja.png', 'Loja · confirmando em nome da revenda', 'Quando a Loja confirma, a janela avisa explicitamente que é em nome da revenda e que o registro sai com o nome de quem confirmou.'],
  ['13-detalhe-concluido.png', 'Detalhe do pedido depois da confirmação', 'O painel vira verde — "✓ Material recebido" — e o cabeçalho passa a "Etapa 10/10 · Conclusão".'],
  ['14-regua-etapa10.png', 'A régua com o ciclo encerrado', 'A etapa 10 vira a atual e traz quando e por quem o material foi recebido.'],
  ['15-painel-recebido.png', 'O painel de recebido, isolado', 'Data, hora, autor e a observação registrada — tudo em um lugar só.'],
  ['16-trilha.png', 'A trilha do pedido', 'A confirmação e a transição de etapa entram na trilha com data, hora e usuário.'],
  ['17-auditoria.png', 'A auditoria', 'Um evento por confirmação, distinguindo se foi a revenda ou a Loja quem confirmou.'],
  ['18-permissao.png', 'A permissão nova', '"Confirmar recebimento do material (entrega)" no editor de permissões, padrão ativa para administrador, Loja e revenda.'],
]

const NUMEROS = [
  ['10', 'etapas no workflow', 'eram 9 — a confirmação entra antes da conclusão'],
  ['2', 'lados podem confirmar', 'a revenda e a Loja Cidade Imperial'],
  ['33', 'asserções no teste', '0 falhas'],
  ['210', 'asserções de regressão', 'todas as suítes anteriores verdes'],
]

const ANTES_DEPOIS = [
  ['Depois do faturamento', 'o pedido concluía sozinho (etapa 9 de 9)', 'para na etapa 9 até alguém confirmar que o material chegou'],
  ['Etapa 9', '"Conclusão"', '"Entrega — aguardando confirmação"'],
  ['Etapa 10', 'não existia', '"Conclusão" — alcançada apenas com a confirmação'],
  ['Prova de entrega', 'não havia registro de que o material chegou', 'data, hora, autor e observação guardados no pedido'],
  ['Quem confirma', '—', 'a revenda em "Meus pedidos"; a Loja na lista ou no detalhe do pedido'],
]

const REGISTRO = [
  ['No próprio pedido', 'data, hora, quem confirmou, de que lado (revenda ou Loja) e a observação registrada'],
  ['Trilha do pedido', 'a confirmação e a transição da etapa 9 para a 10, com data, hora e usuário'],
  ['Auditoria', 'um evento por confirmação, distinguindo se partiu da revenda ou da Loja'],
  ['E-mail para o outro lado', `evento pedido_recebido: "${D.assunto}", com a observação em destaque e os itens do pedido`],
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
    <div style="font-size:33px;font-weight:700;line-height:1.15;margin-bottom:12px">Confirmação de recebimento do material</div>
    <div style="font-size:14.5px;line-height:1.6;color:#c9c1b4;max-width:1080px">Depois de faturado — ou atendido pelo estoque da Loja — o pedido deixa de concluir sozinho: fica na etapa 9 até alguém confirmar que o material chegou. Confirma a revenda, que recebeu; ou a Loja Cidade Imperial, quando faz a conferência em nome dela. As capturas abaixo percorrem o fluxo real pelos dois lados, em base limpa.</div>
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
  </div>

  <div style="padding:26px 48px 6px">
    <div style="font-size:12px;font-weight:700;letter-spacing:.13em;color:#a89f90;margin-bottom:16px">O QUE FICA REGISTRADO A CADA CONFIRMAÇÃO</div>
    <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:14px">
      ${REGISTRO.map(([k, v]) => `<div style="background:#fff;border:1px solid #eae3d6;border-radius:12px;padding:15px 19px">
        <div style="font-size:13.5px;font-weight:700;margin-bottom:4px">${k}</div>
        <div style="font-size:12.5px;color:#8a8378;line-height:1.55">${v}</div></div>`).join('')}
    </div>
    <div style="font-size:12px;color:#a89f90;margin-top:12px;line-height:1.6">Regras aplicadas: o botão só aparece quando todos os itens ativos do pedido já estão faturados ou atendidos pelo estoque, e some assim que a confirmação é feita; a observação é opcional e limitada a 400 caracteres; a ação é controlada pela permissão "Confirmar recebimento do material (entrega)".</div>
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
    <span>Confirmação de recebimento do material</span>
  </div>
</div>`

const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true })
const pg = await br.newPage({ viewport: { width: 1400, height: 1200 }, deviceScaleFactor: 1.5 })
await pg.setContent(html)
await pg.waitForTimeout(900)
const png = resolve(DIR, '00-resumo.png')
await pg.locator('div').first().screenshot({ path: png })
const pdf = resolve(here, '../Plataforma-Cidade-Imperial-Evidencias-Recebimento-Material.pdf')
await pg.emulateMedia({ media: 'print' })
await pg.addStyleTag({ content: '@page{margin:0;size:1400px 1000px} img{break-inside:avoid} div{break-inside:avoid}' })
await pg.pdf({ path: pdf, width: '1400px', height: '1000px', printBackground: true })
await br.close()
console.log('PNG ok: ', png)
console.log('PDF ok: ', pdf)
console.log('capturas:', readdirSync(DIR).filter((f) => f.endsWith('.png')).length)
