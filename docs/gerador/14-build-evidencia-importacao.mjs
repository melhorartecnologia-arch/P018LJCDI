// Folha-resumo das evidências da importação de cadastros por planilha.
// Gera docs/evidencias/importacao-cadastros/00-resumo.png no padrão visual
// das demais descrições de entrega da plataforma.
import { chromium } from 'playwright'
import { readFileSync, readdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const DIR = resolve(here, '../evidencias/importacao-cadastros')
const GOLD = '#B38335'
const DARK = '#272525'

const b64 = (f) => readFileSync(resolve(DIR, f)).toString('base64')
const shot = (f) => `data:image/png;base64,${b64(f)}`

const TELAS = [
  ['01-bloco-fornecedores.png', 'Bloco de importação — Fornecedores', 'Os três botões do ciclo: baixar o modelo, baixar o modelo já preenchido com os cadastros atuais e carregar a planilha.'],
  ['02-modelo-fornecedores.png', 'Modelo .xlsx gerado', 'Colunas na ordem certa e duas linhas de exemplo, prontas para serem sobrescritas.'],
  ['03-modelo-instrucoes.png', 'Aba "Instruções" do modelo', 'Cada modelo explica o preenchimento, as regras do cadastro e quais colunas são obrigatórias.'],
  ['04-planilha-preenchida.png', 'Planilha preenchida pelo usuário', 'Duas inclusões, uma atualização (CNPJ já cadastrado) e três linhas com problema, de propósito.'],
  ['05-previa-fornecedores.png', 'Prévia antes de gravar', 'Contadores e a lista linha a linha: o que entra, o que atualiza e o motivo de cada recusa.'],
  ['06-resultado-fornecedores.png', 'Resultado — Fornecedores', 'Os dois novos fornecedores na lista e o existente atualizado, sem duplicidade.'],
  ['07-previa-revendas.png', 'Prévia — Revendas', 'Mesma rotina no cadastro de revendas, com a chave pelo CNPJ.'],
  ['08-resultado-revendas.png', 'Resultado — Revendas', 'Revendas incluídas já enxergando os fornecedores ativos.'],
  ['09-bloco-produtos.png', 'Bloco de importação — Produtos', 'O mesmo bloco na tela de produtos homologados.'],
  ['10-planilha-produtos.png', 'Planilha de produtos', 'A coluna "Fornecedores" alimenta o De/Para; código em branco é gerado pela plataforma.'],
  ['11-previa-produtos.png', 'Prévia — Produtos', 'Categoria, preço e fornecedores resolvidos e conferidos antes de gravar.'],
  ['12-resultado-produtos.png', 'Resultado — Produtos', 'Produtos importados no catálogo, com código gerado e vínculos aplicados.'],
  ['13-arquivo-invalido.png', 'Planilha fora do padrão', 'Arquivo sem as colunas esperadas é recusado com mensagem clara e sem botão de gravar.'],
  ['14-auditoria.png', 'Trilha de auditoria', 'Cada importação e cada download de modelo ficam registrados, com as contagens da carga.'],
]

const NUMEROS = [
  ['3', 'cadastros com importação', 'fornecedores, produtos e revendas'],
  ['2', 'modelos por cadastro', 'em branco com exemplos · com os dados atuais'],
  ['500', 'linhas por carga', 'aceita .xlsx e CSV'],
  ['48', 'asserções no teste E2E', '0 falhas'],
]

const REGRAS = [
  ['Nada grava sem confirmação', 'A carga sempre passa por uma prévia com contadores e detalhamento linha a linha. O botão só aparece quando há registro válido.'],
  ['Erro não trava a carga', 'Linhas com problema são apontadas com o motivo e ignoradas; as demais são gravadas normalmente. Corrija e recarregue só o que faltou.'],
  ['Inclui ou atualiza pela chave natural', 'CNPJ para fornecedores e revendas, código para produtos. Recarregar uma planilha revisada atualiza em vez de duplicar.'],
  ['Tolerante na forma, rígido no conteúdo', 'Aceita CNPJ com ou sem máscara, preço com vírgula ou ponto e Sim/Não em várias grafias — mas recusa obrigatório em branco, CNPJ inválido, chave repetida e fornecedor inexistente.'],
  ['Rastreável', 'A importação e o download do modelo entram na trilha de auditoria, com incluídos, atualizados e ignorados.'],
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
    <div style="font-size:33px;font-weight:700;line-height:1.15;margin-bottom:12px">Importação de cadastros por planilha</div>
    <div style="font-size:14.5px;line-height:1.6;color:#c9c1b4;max-width:1080px">Fornecedores, produtos homologados e revendas passam a aceitar carga em massa: baixar o modelo em Excel, preencher, carregar e conferir a prévia antes de gravar. Capturas do fluxo real em execução, na ordem em que o usuário o percorre.</div>
  </div>

  <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:0;background:#fff;border-bottom:1px solid #eae3d6">
    ${NUMEROS.map(([v, l, s]) => `<div style="padding:20px 26px;border-right:1px solid #f1ece2">
      <div style="font-size:29px;font-weight:700;color:${GOLD}">${v}</div>
      <div style="font-size:12.5px;font-weight:600;margin-top:3px">${l}</div>
      <div style="font-size:11px;color:#a89f90;margin-top:2px">${s}</div></div>`).join('')}
  </div>

  <div style="padding:30px 48px 10px">
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
    <span>Importação de cadastros por planilha</span>
  </div>
</div>`

const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true })
const pg = await br.newPage({ viewport: { width: 1400, height: 1200 }, deviceScaleFactor: 1.5 })
await pg.setContent(html)
await pg.waitForTimeout(700)

// PNG único (folha de contato) e PDF paginado — o PDF é o formato prático
// para circular; o PNG serve como visão contínua do fluxo.
const png = resolve(DIR, '00-resumo.png')
await pg.locator('div').first().screenshot({ path: png })

const pdf = resolve(here, '../Plataforma-Cidade-Imperial-Evidencias-Importacao-Cadastros.pdf')
await pg.emulateMedia({ media: 'print' })
await pg.addStyleTag({ content: '@page{margin:0;size:1400px 1000px} img{break-inside:avoid} div{break-inside:avoid}' })
await pg.pdf({ path: pdf, width: '1400px', height: '1000px', printBackground: true, pageRanges: '' })
await br.close()
console.log('PNG ok: ', png)
console.log('PDF ok: ', pdf)
console.log('capturas na pasta:', readdirSync(DIR).filter((f) => f.endsWith('.png')).length)
