// Folha-resumo das evidências da conversa por pedido (PNG + PDF).
import { chromium } from 'playwright'
import { readFileSync, readdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const DIR = resolve(here, '../evidencias/chat-pedidos')
const GOLD = '#B38335'
const DARK = '#272525'
const ROXO = '#5d3f96'
const shot = (f) => `data:image/png;base64,${readFileSync(resolve(DIR, f)).toString('base64')}`
const D = JSON.parse(readFileSync(resolve(DIR, 'dados.json'), 'utf8'))

const TELAS = [
  ['00-dois-lados.png', 'Quem pode abrir a conversa, e quando', 'Um canal por pedido, disponível em qualquer etapa. Revenda e Loja iniciam do mesmo jeito; o que muda é só de que lado se está.'],
  ['01-lista-revenda.png', 'Revenda · Meus pedidos com a coluna Conversa', 'O balão 💬 aparece em TODOS os pedidos, mesmo sem nenhuma mensagem ainda — não é preciso esperar nada para falar com a Loja.'],
  ['02-conversa-vazia.png', 'A conversa recém-aberta', 'O estado vazio explica para que serve o canal: dúvidas, ocorrências e observações ficam registradas no próprio pedido.'],
  ['03-revenda-escrevendo.png', 'A revenda escreve', 'O campo indica para quem a mensagem vai ("para a Loja Cidade Imperial") e o rodapé avisa o que acontece ao enviar.'],
  ['04-mensagem-enviada.png', 'A mensagem entra no histórico', 'Balão do próprio lado, com autoria, data e hora. O cabeçalho passa a contar as mensagens da conversa.'],
  ['05-lista-revenda-com-conversa.png', 'A lista reflete a conversa', `${D.pedido} passa a mostrar 1 mensagem na coluna Conversa.`],
  ['06-email-aviso.png', 'O aviso que chega para a Loja', `Assunto "${D.assunto}", com o texto da mensagem, o número do pedido, quem escreveu e quando — e o pedido de responder pela plataforma.`],
  ['07-menu-loja-nao-lidas.png', 'Loja · o menu avisa antes de abrir a tela', 'Contador roxo 💬 ao lado de "Pedidos" com o total de mensagens não lidas de todos os pedidos, separado do contador dourado de pendências.'],
  ['08-lista-loja-nova.png', 'Loja · Pedidos com a coluna Conversa', 'A mesma coluna do lado da Loja, entre Total e Status.'],
  ['09-linha-com-nova.png', 'O destaque de mensagem nova', 'O balão fica roxo com "1 nova". Só conta mensagem do outro lado posterior à última visita.'],
  ['10-loja-lendo.png', 'A Loja lê a mensagem da revenda', 'Balão do outro lado, à esquerda, com a revenda identificada. Abrir a conversa zera as não lidas apenas do lado que abriu.'],
  ['11-conversa-completa.png', 'A resposta na mesma conversa', 'Histórico dos dois lados no mesmo lugar — sem e-mail solto nem aplicativo de mensagens à parte.'],
  ['12-detalhe-pedido.png', 'O atalho no detalhe do pedido', 'Logo abaixo do cabeçalho, com o total de mensagens. A conversa abre em qualquer etapa do workflow — aqui, com o pedido ainda pendente de recebimento.'],
  ['13-trilha-do-pedido.png', 'A trilha registra a abertura', '"Conversa aberta no pedido pela revenda", com data, hora e usuário, junto das demais transições do pedido.'],
  ['14-auditoria.png', 'A auditoria registra cada mensagem', 'Uma entrada por mensagem, com o sentido do envio (Loja → revenda / Revenda → Loja) e o início do texto.'],
  ['15-revenda-resposta-nova.png', 'A revenda vê a resposta como não lida', 'O ciclo fecha nos dois sentidos: quem não escreveu por último é quem vê o destaque.'],
]

const NUMEROS = [
  ['2', 'lados iniciam a conversa', 'revenda e Loja, indistintamente'],
  ['1', 'canal por pedido', 'aberto em qualquer etapa'],
  ['33', 'asserções no teste', '0 falhas'],
  ['109', 'asserções de regressão', 'importação, exportação, saldo e datas'],
]

const ONDE = [
  ['Revenda · Meus pedidos', 'coluna Conversa, em todas as linhas', 'balão roxo com as não lidas'],
  ['Loja · Pedidos', 'coluna Conversa, entre Total e Status', 'balão roxo com as não lidas'],
  ['Loja · Detalhe do pedido', 'botão abaixo do cabeçalho', 'total de mensagens no rótulo'],
  ['Menu lateral (os dois lados)', '"Pedidos" e "Meus pedidos"', 'contador 💬 do total não lido'],
]

const REGISTRO = [
  ['Dentro do pedido', 'a conversa é gravada no próprio pedido, no banco — sobrevive a novo login e a recarregar a página'],
  ['E-mail para o outro lado', `evento pedido_mensagem: assunto "${D.assunto}", com o texto, o pedido, o autor e o horário`],
  ['Trilha do pedido', 'a abertura da conversa entra na linha do tempo, com data, hora e usuário'],
  ['Auditoria', 'uma entrada por mensagem, com o sentido do envio e o início do texto'],
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
    <div style="font-size:33px;font-weight:700;line-height:1.15;margin-bottom:12px">Conversa por pedido entre a revenda e a Loja</div>
    <div style="font-size:14.5px;line-height:1.6;color:#c9c1b4;max-width:1080px">Todo pedido passa a ter um canal de comunicação próprio — dúvidas, ocorrências e observações —, aberto a qualquer momento do ciclo e por qualquer um dos dois lados. As capturas abaixo percorrem o fluxo real nos dois sentidos, em base limpa: a revenda inicia, a Loja recebe o aviso e responde, a revenda vê a resposta.</div>
  </div>

  <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:0;background:#fff;border-bottom:1px solid #eae3d6">
    ${NUMEROS.map(([v, l, s]) => `<div style="padding:20px 26px;border-right:1px solid #f1ece2">
      <div style="font-size:29px;font-weight:700;color:${GOLD}">${v}</div>
      <div style="font-size:12.5px;font-weight:600;margin-top:3px">${l}</div>
      <div style="font-size:11px;color:#a89f90;margin-top:2px">${s}</div></div>`).join('')}
  </div>

  <div style="padding:30px 48px 6px">
    <div style="font-size:12px;font-weight:700;letter-spacing:.13em;color:#a89f90;margin-bottom:16px">ONDE A CONVERSA APARECE</div>
    <div style="background:#fff;border:1px solid #eae3d6;border-radius:12px;overflow:hidden">
      <table style="width:100%;border-collapse:collapse;font-size:13px">
        <tr style="background:#faf7f0">
          <th style="text-align:left;padding:10px 18px;font-size:10.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#a89f90;width:30%">Tela</th>
          <th style="text-align:left;padding:10px 14px;font-size:10.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#a89f90">Ponto de entrada</th>
          <th style="text-align:left;padding:10px 18px;font-size:10.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:${ROXO}">Sinal de mensagem nova</th>
        </tr>
        ${ONDE.map(([k, a, b]) => `<tr>
          <td style="padding:11px 18px;font-weight:700;border-top:1px solid #f5f1e8">${k}</td>
          <td style="padding:11px 14px;color:#6b6459;border-top:1px solid #f5f1e8">${a}</td>
          <td style="padding:11px 18px;color:${ROXO};font-weight:600;border-top:1px solid #f5f1e8;background:#faf8fd">${b}</td></tr>`).join('')}
      </table>
    </div>
  </div>

  <div style="padding:26px 48px 6px">
    <div style="font-size:12px;font-weight:700;letter-spacing:.13em;color:#a89f90;margin-bottom:16px">O QUE FICA REGISTRADO A CADA MENSAGEM</div>
    <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:14px">
      ${REGISTRO.map(([k, v]) => `<div style="background:#fff;border:1px solid #eae3d6;border-radius:12px;padding:15px 19px">
        <div style="font-size:13.5px;font-weight:700;margin-bottom:4px">${k}</div>
        <div style="font-size:12.5px;color:#8a8378;line-height:1.55">${v}</div></div>`).join('')}
    </div>
    <div style="font-size:12px;color:#a89f90;margin-top:12px;line-height:1.6">Regras aplicadas: mensagem em branco é recusada, o limite é de 1000 caracteres, e abrir a conversa marca como lidas apenas as mensagens do outro lado — a contagem é por lado, nunca compartilhada.</div>
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
    <span>Conversa por pedido</span>
  </div>
</div>`

const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true })
const pg = await br.newPage({ viewport: { width: 1400, height: 1200 }, deviceScaleFactor: 1.5 })
await pg.setContent(html)
await pg.waitForTimeout(900)
const png = resolve(DIR, '00-resumo.png')
await pg.locator('div').first().screenshot({ path: png })
const pdf = resolve(here, '../Plataforma-Cidade-Imperial-Evidencias-Chat-Pedidos.pdf')
await pg.emulateMedia({ media: 'print' })
await pg.addStyleTag({ content: '@page{margin:0;size:1400px 1000px} img{break-inside:avoid} div{break-inside:avoid}' })
await pg.pdf({ path: pdf, width: '1400px', height: '1000px', printBackground: true })
await br.close()
console.log('PNG ok: ', png)
console.log('PDF ok: ', pdf)
console.log('capturas:', readdirSync(DIR).filter((f) => f.endsWith('.png')).length)
