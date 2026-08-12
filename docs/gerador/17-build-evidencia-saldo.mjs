// Folha-resumo das evidências do saldo de estoque como posição (PNG + PDF).
import { chromium } from 'playwright'
import { readFileSync, readdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const DIR = resolve(here, '../evidencias/saldo-estoque')
const GOLD = '#B38335'
const DARK = '#272525'
const shot = (f) => `data:image/png;base64,${readFileSync(resolve(DIR, f)).toString('base64')}`
const D = JSON.parse(readFileSync(resolve(DIR, 'dados.json'), 'utf8'))

const TELAS = [
  ['00-linha-do-tempo.png', 'A regra em um quadro', `O mesmo produto (${D.produto}) nos três momentos: ${D.contAntes} → ${D.contAntes} → ${D.NOVO}. Sair ${D.saiu} unidades não mexe no saldo; carregar um arquivo novo, sim.`],
  ['01-tela-inventario.png', 'A tela de Inventário de estoque', 'O subtítulo declara o modelo: o último inventário lançado é a posição de estoque da Loja.'],
  ['02-posicao-inicial.png', 'Momento 1 — a posição vigente', `Saldo igual à contagem do inventário de referência. ${D.produto} com ${D.contAntes}.`],
  ['03-atender-com-estoque.png', 'Momento 2 — atender um pedido com estoque da Loja', `Duas linhas do pedido saem do estoque próprio. O painel lateral confirma o saldo disponível antes da decisão.`],
  ['04-posicao-apos-atendimento.png', 'A posição NÃO mudou', `${D.produto} continua com saldo ${D.contAntes}. A saída de ${D.saiu} aparece em "Atendido desde o lançamento", em cinza, sem abater.`],
  ['05-planilha-nova-posicao.png', 'Momento 3 — a planilha da nova posição', `Preenchida sobre o modelo baixado da própria tela; ${D.produto} vai a ${D.NOVO}.`],
  ['06-janela-lancamento.png', 'A carga abre para revisão', 'A planilha preenche a janela de lançamento e informa quantos produtos foram lidos — nada é gravado sem confirmar.'],
  ['07-posicao-apos-carga.png', 'A nova posição valendo', `${D.produto} passa a ${D.NOVO} e o contador de saídas zera: a referência agora é o inventário recém-lançado.`],
  ['08-planilha-exportada.png', 'A exportação reflete a mesma posição', 'Coluna "Saldo em estoque" com a quantidade do último inventário; as saídas vêm rotuladas como informativas.'],
  ['09-historico-lancamentos.png', 'Histórico de lançamentos', 'Cada carga fica registrada com data, autor e quantidade de produtos — dá para ver a sequência de posições.'],
  ['10-auditoria.png', 'Trilha de auditoria', 'O lançamento entra na trilha marcado com a origem "via planilha".'],
]

const NUMEROS = [
  ['=', 'saldo é a última carga', 'sem dedução de saídas'],
  ['3', 'momentos verificados', 'posição · atendimento · nova carga'],
  ['21', 'asserções no teste', '0 falhas'],
  ['70', 'asserções de regressão', 'exportação e importações'],
]

const ANTES_DEPOIS = [
  ['Saldo', 'contagem − atendimentos desde o lançamento', 'a quantidade do último inventário lançado'],
  ['Atender pedido com estoque da Loja', 'abatia o saldo', 'não abate — a saída fica só como informação'],
  ['Como o saldo sobe', 'não subia: só caía até a recontagem', 'com um novo lançamento, na tela ou por planilha'],
  ['Coluna da tabela', '"Consumido" (sugeria dedução)', '"Atendido desde o lançamento", em cinza e informativa'],
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
    <div style="font-size:33px;font-weight:700;line-height:1.15;margin-bottom:12px">O saldo de estoque é a última posição carregada</div>
    <div style="font-size:14.5px;line-height:1.6;color:#c9c1b4;max-width:1080px">O inventário deixa de ser contagem inicial de um estoque perpétuo e passa a ser a posição: o último arquivo lançado É o saldo. Atender um pedido com estoque da Loja não abate mais nada — para atualizar a posição, carrega-se um arquivo novo. Capturas do fluxo real, acompanhando o mesmo produto nos três momentos.</div>
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
          <th style="text-align:left;padding:10px 18px;font-size:10.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#a89f90;width:26%"></th>
          <th style="text-align:left;padding:10px 14px;font-size:10.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#a89f90">Antes</th>
          <th style="text-align:left;padding:10px 18px;font-size:10.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#2f6b39">Agora</th>
        </tr>
        ${ANTES_DEPOIS.map(([k, a, b]) => `<tr>
          <td style="padding:11px 18px;font-weight:700;border-top:1px solid #f5f1e8">${k}</td>
          <td style="padding:11px 14px;color:#a89f90;border-top:1px solid #f5f1e8;text-decoration:line-through">${a}</td>
          <td style="padding:11px 18px;color:#2f6b39;font-weight:600;border-top:1px solid #f5f1e8;background:#f9fcf9">${b}</td></tr>`).join('')}
      </table>
    </div>
    <div style="font-size:12px;color:#a89f90;margin-top:11px;line-height:1.6">Consequência assumida: como não há entrada de mercadoria, a posição é tão atual quanto o último arquivo. A coluna informativa de saídas serve justamente para perceber quando vale carregar de novo.</div>
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
    <span>Saldo de estoque como posição</span>
  </div>
</div>`

const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true })
const pg = await br.newPage({ viewport: { width: 1400, height: 1200 }, deviceScaleFactor: 1.5 })
await pg.setContent(html)
await pg.waitForTimeout(900)
const png = resolve(DIR, '00-resumo.png')
await pg.locator('div').first().screenshot({ path: png })
const pdf = resolve(here, '../Plataforma-Cidade-Imperial-Evidencias-Saldo-Estoque.pdf')
await pg.emulateMedia({ media: 'print' })
await pg.addStyleTag({ content: '@page{margin:0;size:1400px 1000px} img{break-inside:avoid} div{break-inside:avoid}' })
await pg.pdf({ path: pdf, width: '1400px', height: '1000px', printBackground: true })
await br.close()
console.log('PNG ok: ', png)
console.log('PDF ok: ', pdf)
console.log('capturas:', readdirSync(DIR).filter((f) => f.endsWith('.png')).length)
