// Folha-resumo das evidências da exportação de cadastros (PNG contínuo + PDF).
import { chromium } from 'playwright'
import { readFileSync, readdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const DIR = resolve(here, '../evidencias/exportacao-cadastros')
const GOLD = '#B38335'
const DARK = '#272525'
const shot = (f) => `data:image/png;base64,${readFileSync(resolve(DIR, f)).toString('base64')}`

const TELAS = [
  ['01-botoes-fornecedores.png', 'Fornecedores — dois botões de exportação', 'O bloco de importação ganhou "⬇ Exportar XLSX"; acima, um bloco próprio exporta os contratos de royalty.'],
  ['02-planilha-fornecedores.png', 'Planilha de fornecedores', 'Além do cadastro, o contrato vigente, o royalty, os produtos vinculados e o faturado — como número, prontos para somar.'],
  ['03-planilha-contratos.png', 'Planilha de contratos de royalty', 'Percentual, vigência, dia acordado, gatilho de pagamento e parcelamento de cada contrato.'],
  ['04-botoes-produtos.png', 'Produtos homologados', 'O mesmo par importar/exportar na tela do catálogo.'],
  ['05-planilha-produtos.png', 'Planilha de produtos', 'Categoria, preço, fornecedores do De/Para, saldo em estoque e o quanto cada item já vendeu.'],
  ['06-planilha-categorias.png', 'Planilha de categorias', 'Situação, quantos produtos usam cada grupo e a participação no catálogo.'],
  ['07-botao-depara.png', 'De/Para Produto × Fornecedor', 'A matriz da tela também sai em planilha.'],
  ['08-planilha-depara.png', 'Planilha do De/Para', 'Uma coluna por fornecedor ativo — a mesma leitura da tela, agora filtrável no Excel.'],
  ['09-planilha-revendas.png', 'Planilha de revendas', 'Cadastro, visibilidade de fornecedores, produtos bloqueados, pedidos e valor em pedidos.'],
  ['10-planilha-estoque.png', 'Planilha do saldo de estoque', 'Contagem do último inventário, consumido desde então e saldo disponível por produto.'],
  ['11-botao-consolidado.png', 'Relatórios — exportação consolidada', 'Um botão baixa a base inteira em uma pasta de trabalho só.'],
  ['12-pasta-consolidada.png', 'A pasta consolidada, pelo perfil Loja', 'A aba Resumo abre a pasta com a contagem de cada cadastro. Sem a aba Usuários: a Loja não tem permissão de gestão de usuários.'],
  ['13-botoes-usuarios.png', 'Usuários e permissões', 'Importar e exportar também no cadastro de usuários, restrito a quem gerencia usuários.'],
  ['14-planilha-usuarios.png', 'Planilha de usuários — sem senha', 'Perfil, vínculo, permissões personalizadas, último acesso e envios de acesso. Nenhuma coluna de senha ou hash é exportada.'],
  ['15-pasta-consolidada-admin.png', 'A mesma pasta, pelo Administrador', 'Com permissão de gestão de usuários, a aba Usuários entra — a exportação respeita as permissões de quem a executa.'],
  ['16-auditoria.png', 'Trilha de auditoria', 'Cada exportação fica registrada, por cadastro e na consolidada, com a contagem de registros.'],
]

const NUMEROS = [
  ['8', 'cadastros exportáveis', 'todos os que existem na plataforma'],
  ['1', 'pasta consolidada', 'uma aba por cadastro + resumo'],
  ['2', 'importações novas', 'categorias e usuários'],
  ['70', 'asserções nos testes', '0 falhas (62 + 8 de regressão)'],
]

const REGRAS = [
  ['Exporta mais do que se importa', 'A planilha de importação tem os campos editáveis; a exportação acrescenta o que a plataforma calcula — contrato vigente e faturado por fornecedor, vendas e saldo por produto, valor em pedidos por revenda.'],
  ['Planilha de verdade, não relatório em texto', 'Valores saem como número, com filtro automático e cabeçalho congelado. Dá para somar, ordenar e dinamizar sem tratar nada antes.'],
  ['Respeita permissão', 'Cada botão exige a permissão do seu cadastro, e a pasta consolidada monta só as abas que o usuário pode ver — a Loja não leva a aba Usuários.'],
  ['Não exporta segredo', 'A planilha de usuários traz perfil, vínculo e histórico de acesso, mas nenhuma coluna de senha ou hash.'],
  ['Rastreável', 'Toda exportação entra na trilha de auditoria, com o cadastro e a contagem de registros.'],
  ['Contratos ficam fora da importação, de propósito', 'O percentual de royalty gera cobrança e fechamento, com vigência e histórico. Continua lançado contrato a contrato — mas é exportável como todos os outros.'],
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
    <div style="font-size:33px;font-weight:700;line-height:1.15;margin-bottom:12px">Exportação dos cadastros para Excel</div>
    <div style="font-size:14.5px;line-height:1.6;color:#c9c1b4;max-width:1080px">Os oito cadastros da plataforma passam a exportar em .xlsx — fornecedores, contratos, produtos, categorias, De/Para, revendas, usuários e saldo de estoque — mais uma pasta consolidada com tudo. Capturas do fluxo real: os botões nas telas e as planilhas efetivamente baixadas.</div>
  </div>

  <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:0;background:#fff;border-bottom:1px solid #eae3d6">
    ${NUMEROS.map(([v, l, s]) => `<div style="padding:20px 26px;border-right:1px solid #f1ece2">
      <div style="font-size:29px;font-weight:700;color:${GOLD}">${v}</div>
      <div style="font-size:12.5px;font-weight:600;margin-top:3px">${l}</div>
      <div style="font-size:11px;color:#a89f90;margin-top:2px">${s}</div></div>`).join('')}
  </div>

  <div style="padding:30px 48px 4px">
    <div style="font-size:12px;font-weight:700;letter-spacing:.13em;color:#a89f90;margin-bottom:16px">COBERTURA POR CADASTRO</div>
    <div style="background:#fff;border:1px solid #eae3d6;border-radius:12px;overflow:hidden">
      <table style="width:100%;border-collapse:collapse;font-size:13px">
        <tr style="background:#faf7f0">
          <th style="text-align:left;padding:10px 18px;font-size:10.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#a89f90">Cadastro</th>
          <th style="text-align:center;padding:10px;font-size:10.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#a89f90">Importação</th>
          <th style="text-align:center;padding:10px;font-size:10.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#a89f90">Exportação</th>
          <th style="text-align:left;padding:10px 18px;font-size:10.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#a89f90">Observação</th>
        </tr>
        ${[['Fornecedores', 1, 1, 'já existia · exportação nova'],
           ['Contratos de royalty', 0, 1, 'fora da carga de propósito — lançado contrato a contrato, com histórico'],
           ['Produtos homologados', 1, 1, 'já existia · exportação nova'],
           ['Categorias de produtos', 2, 1, 'importação e exportação novas'],
           ['De/Para Produto × Fornecedor', 3, 1, 'a carga entra pela coluna "Fornecedores" da planilha de produtos'],
           ['Revendas', 1, 1, 'já existia · exportação nova'],
           ['Usuários e permissões', 2, 1, 'importação e exportação novas · sem senha na exportação'],
           ['Inventário de estoque', 1, 1, 'rotina de carga própria · exportação nova']]
          .map(([n, imp, exp, obs]) => {
            const selo = (v) => v === 1 ? '<span style="color:#2f6b39;font-weight:700">✓</span>'
              : v === 2 ? '<span style="font-size:10.5px;font-weight:700;color:#2f6b39;background:#e9f3ea;border-radius:5px;padding:2px 7px">✓ novo</span>'
              : v === 3 ? '<span style="color:#a89f90">via produtos</span>'
              : '<span style="color:#a89f90">—</span>'
            return `<tr>
              <td style="padding:11px 18px;font-weight:600;border-top:1px solid #f5f1e8">${n}</td>
              <td style="padding:11px;text-align:center;border-top:1px solid #f5f1e8">${selo(imp)}</td>
              <td style="padding:11px;text-align:center;border-top:1px solid #f5f1e8"><span style="font-size:10.5px;font-weight:700;color:#33568f;background:#e9eef8;border-radius:5px;padding:2px 7px">✓ novo</span></td>
              <td style="padding:11px 18px;color:#6b6459;font-size:12.5px;border-top:1px solid #f5f1e8">${obs}</td></tr>`
          }).join('')}
      </table>
    </div>
  </div>

  <div style="padding:26px 48px 10px">
    <div style="font-size:12px;font-weight:700;letter-spacing:.13em;color:#a89f90;margin-bottom:16px">DECISÕES DE REGRA</div>
    ${REGRAS.map(([t, d]) => `<div style="display:flex;gap:14px;margin-bottom:13px">
      <div style="width:5px;background:${GOLD};border-radius:3px;flex:none"></div>
      <div><div style="font-size:14px;font-weight:700;margin-bottom:2px">${t}</div>
      <div style="font-size:13px;line-height:1.6;color:#6b6459">${d}</div></div></div>`).join('')}
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
    <span>Exportação dos cadastros para Excel</span>
  </div>
</div>`

const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true })
const pg = await br.newPage({ viewport: { width: 1400, height: 1200 }, deviceScaleFactor: 1.5 })
await pg.setContent(html)
await pg.waitForTimeout(900)
const png = resolve(DIR, '00-resumo.png')
await pg.locator('div').first().screenshot({ path: png })
const pdf = resolve(here, '../Plataforma-Cidade-Imperial-Evidencias-Exportacao-Cadastros.pdf')
await pg.emulateMedia({ media: 'print' })
await pg.addStyleTag({ content: '@page{margin:0;size:1400px 1000px} img{break-inside:avoid} div{break-inside:avoid}' })
await pg.pdf({ path: pdf, width: '1400px', height: '1000px', printBackground: true })
await br.close()
console.log('PNG ok: ', png)
console.log('PDF ok: ', pdf)
console.log('capturas:', readdirSync(DIR).filter((f) => f.endsWith('.png')).length)
