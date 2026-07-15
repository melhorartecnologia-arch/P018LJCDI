// Gera o Diagrama de Entidades e Relacionamentos (DER) + Dicionário de Dados:
//   - PNG único com o diagrama completo (alta resolução)
//   - PDF (paisagem, identidade Cidade Imperial)
//   - DOCX (Word, com o diagrama embutido)
// Rode a partir de docs/gerador:  node 7-build-der-dicionario.mjs
import pw from '/opt/node22/lib/node_modules/playwright/index.js'
import { writeFileSync, readFileSync } from 'node:fs'
import {
  Document, Packer, Paragraph, TextRun, HeadingLevel, ImageRun, PageOrientation,
  Table, TableRow, TableCell, WidthType, BorderStyle, ShadingType,
} from 'docx'
const { chromium } = pw

const OUT_PNG = '/home/user/P018LJCDI/docs/Plataforma-Cidade-Imperial-DER.png'
const OUT_PDF = '/home/user/P018LJCDI/docs/Plataforma-Cidade-Imperial-DER-Dicionario-Dados.pdf'
const OUT_DOCX = '/home/user/P018LJCDI/docs/Plataforma-Cidade-Imperial-DER-Dicionario-Dados.docx'
const GOLD = 'B38335', DARK = '272525', GREY = '6B6459'

// ─────────────────────────────────────────────────────────────────────────────
// ENTIDADES DO DIAGRAMA — posição, cor de cabeçalho e linhas exibidas
// flag: PK, FK, UK, J (campo dentro do JSONB `data`), '' (coluna tipada)
// ─────────────────────────────────────────────────────────────────────────────
const W = 500
const ROW_H = 22, HEAD_H = 44, PAD = 10
const C = { c1: 50, c2: 640, c3: 1230, c4: 1820 }
const ENT = [
  { id: 'usuarios', t: 'usuarios', sub: 'contas de acesso e permissões', x: C.c1, y: 70, cor: '#b83280', rows: [
    ['id', 'INTEGER', 'PK'], ['nome', 'TEXT', ''], ['email (login)', 'TEXT', 'UK'], ['papel', 'admin|loja|fornecedor|revenda', ''],
    ['ativo', 'BOOLEAN', ''], ['senhaHash', 'TEXT', 'J'], ['fornecedorId → fornecedores', 'INTEGER', 'J'],
    ['revendaId → revendas', 'INTEGER', 'J'], ['permissoes {chave: bool}', 'OBJETO', 'J'], ['ultimoAcesso · criadoEm', 'TEXTO', 'J']] },
  { id: 'fornecedores', t: 'fornecedores', sub: 'parceiros que fornecem e faturam', x: C.c2, y: 70, cor: '#8f682a', rows: [
    ['id', 'INTEGER', 'PK'], ['nome', 'TEXT', ''], ['cnpj', 'TEXT', ''], ['cidade', 'TEXT', ''],
    ['contato (e-mail)', 'TEXT', ''], ['ativo', 'BOOLEAN', '']] },
  { id: 'contratos', t: 'contratos', sub: 'contrato e % de royalty do fornecedor', x: C.c3, y: 70, cor: '#8f682a', rows: [
    ['id', 'INTEGER', 'PK'], ['fornecedor_id → fornecedores', 'INTEGER', 'FK'], ['numero (CT-AAAA-NNN)', 'TEXT', ''],
    ['royalty (%)', 'NUMERIC', ''], ['inicio · fim', 'TEXT dd/mm/aaaa', ''], ['vigente', 'BOOLEAN', ''],
    ['historico [{data,de,para,usuario}]', 'LISTA', 'J']] },
  { id: 'produtos', t: 'produtos', sub: 'catálogo homologado pela Loja', x: C.c4, y: 70, cor: '#8f682a', rows: [
    ['id', 'INTEGER', 'PK'], ['codigo (PRD-NNN)', 'TEXT', 'UK'], ['descricao', 'TEXT', ''], ['unidade', 'TEXT', ''],
    ['preco (referência; oculto à revenda)', 'NUMERIC', ''], ['fornecedor_id → fornecedores', 'INTEGER', 'FK'],
    ['ativo', 'BOOLEAN', ''], ['precoHist [{data,de,para,usuario}]', 'LISTA', 'J']] },
  { id: 'revendas', t: 'revendas', sub: 'clientes que compram para revender', x: C.c1, y: 430, cor: '#1f6b5e', rows: [
    ['id', 'INTEGER', 'PK'], ['nome', 'TEXT', ''], ['cnpj', 'TEXT', ''], ['cidade', 'TEXT', ''],
    ['email', 'TEXT', ''], ['ativo', 'BOOLEAN', ''], ['visibilidade [fornecedorId…]', 'LISTA', 'J'],
    ['prodBloq [produtoId…]', 'LISTA', 'J'], ['ultimoAcesso · ultimoConvite', 'TEXTO', 'J']] },
  { id: 'pedidos', t: 'pedidos', sub: 'pedido da revenda; itens com caminho e quantidade próprios', x: C.c2, y: 430, cor: '#B38335', rows: [
    ['id (PED-NNNN)', 'TEXT', 'PK'], ['revenda_id → revendas', 'INTEGER', 'FK'],
    ['status', 'pendente…faturado', ''], ['total (R$)', 'NUMERIC', ''], ['data_criacao', 'TEXT dd/mm/aaaa', ''],
    ['itens [{produtoId, qtd, preco, st,', 'LISTA', 'J'], ['   fornecedorId, cotacaoId, estoqueTs}]', '', 'J'],
    ['trilha [{quando, usuario, acao}]', 'LISTA', 'J'], ['justificativa (rejeição)', 'TEXTO', 'J']] },
  { id: 'cotacoes', t: 'cotacoes', sub: 'concorrência entre fornecedores convidados', x: C.c3, y: 430, cor: '#33568f', rows: [
    ['id (COT-NN)', 'TEXT', 'PK'], ['pedido_id → pedidos', 'TEXT', 'FK'], ['prazo', 'TEXT dd/mm/aaaa', ''],
    ['status', 'aguardando|encerrada|cancelada', ''], ['vencedor_id → fornecedores', 'INTEGER', 'FK'],
    ['itens [{produtoId, qtd, preco}]', 'LISTA', 'J'], ['convidados [fornecedorId…]', 'LISTA', 'J'],
    ['propostas [{fornecedorId, preco,', 'LISTA', 'J'], ['   itens{pid:unit}, prazoEntrega,…}]', '', 'J'],
    ['vencItens {produtoId: fornecedorId}', 'OBJETO', 'J'], ['justificativa · motivoCancel', 'TEXTO', 'J'],
    ['historico [{quando,usuario,acao}]', 'LISTA', 'J']] },
  { id: 'inventarios', t: 'inventarios', sub: 'contagens de estoque da Loja por data', x: C.c4, y: 430, cor: '#2f6b39', rows: [
    ['id', 'INTEGER', 'PK'], ['data_lanc', 'TEXT dd/mm/aaaa', ''], ['usuario', 'TEXT', ''],
    ['ts (época, p/ ordenar consumos)', 'NÚMERO', 'J'], ['obs', 'TEXTO', 'J'],
    ['itens {produtoId: quantidade}', 'OBJETO', 'J']] },
  { id: 'anexos', t: 'anexos', sub: 'documentos fiscais (PDF/XML) do faturamento', x: C.c1, y: 900, cor: '#4a5568', rows: [
    ['id (axNNNN…)', 'TEXT', 'PK'], ['nome (arquivo)', 'TEXT', ''], ['tipo (MIME)', 'TEXT', ''],
    ['tamanho (bytes)', 'INTEGER', ''], ['criado_em (ISO)', 'TEXT', ''], ['dados (conteúdo em base64)', 'TEXT', '']] },
  { id: 'faturamentos', t: 'faturamentos', sub: 'notas do fornecedor à revenda + royalty', x: C.c2, y: 900, cor: '#2b6cb0', rows: [
    ['id (NF-NNNN)', 'TEXT', 'PK'], ['pedido_id → pedidos', 'TEXT', 'FK'], ['fornecedor_id → fornecedores', 'INTEGER', 'FK'],
    ['revenda_id → revendas', 'INTEGER', 'FK'], ['cotacao_id → cotacoes (opcional)', 'TEXT', 'FK'],
    ['valor (R$)', 'NUMERIC', ''], ['competencia (MM/AAAA)', 'TEXT', ''], ['royalty_pct · royalty_valor', 'NUMERIC', ''],
    ['anexoId → anexos · anexoNome', 'TEXTO', 'J'], ['analise {aceito, confianca, motivo,', 'OBJETO', 'J'],
    ['   engine, quando}', '', 'J'], ['data (emissão dd/mm/aaaa)', 'TEXTO', 'J']] },
  { id: 'pagamentos', t: 'pagamentos', sub: 'fechamento mensal de royalty por fornecedor', x: C.c3, y: 900, cor: '#a05b1f', rows: [
    ['chave (MM/AAAA-fornecedorId)', 'TEXT', 'PK'], ['status', 'a pagar|em atraso|pago', ''], ['valor pago (R$)', 'NUMERIC', ''],
    ['cobranca · cobrancaData', 'BOOL·TEXTO', 'J'], ['numero (COB-AAAAMM-NN)', 'TEXTO', 'J'],
    ['vencimento (dd/mm/aaaa)', 'TEXTO', 'J'], ['lembreteData', 'TEXTO', 'J'],
    ['data (pagamento) · comprovante', 'TEXTO', 'J'], ['pagoComAtraso', 'BOOL', 'J']] },
  { id: 'auditoria', t: 'auditoria', sub: 'trilha imutável das operações', x: C.c4, y: 900, cor: '#5d3f96', rows: [
    ['ord (posição)', 'INTEGER', 'PK'], ['quando', 'TEXT dd/mm/aaaa hh:mm', ''], ['usuario', 'TEXT', ''],
    ['acao · detalhe', 'TEXT', ''], ['ts (época)', 'NÚMERO', 'J'], ['email · papel', 'TEXTO', 'J'],
    ['modulo (10 módulos)', 'TEXTO', 'J'], ['sev', 'info|alerta|critico', 'J']] },
  { id: 'app_seq', t: 'app_seq  (singleton)', sub: 'próximos números sequenciais', x: C.c1, y: 1330, cor: '#6b6459', rows: [
    ['id = 1', 'INTEGER', 'PK'], ['ped · cot · forn · prod · rev · ctr · nf', 'INTEGER', '']] },
  { id: 'config_email', t: 'config_email  (singleton)', sub: 'SMTP gerenciado pelo administrador', x: C.c2, y: 1330, cor: '#6b6459', rows: [
    ['id = 1', 'INTEGER', 'PK'], ['host · porta · seguranca', 'TEXTO', 'J'], ['usuario · senha', 'TEXTO', 'J'],
    ['remetenteNome · remetenteEmail', 'TEXTO', 'J'], ['responderPara · emailLoja · ativo', 'TEXTO·BOOL', 'J']] },
  { id: 'config_plataforma', t: 'config_plataforma  (singleton)', sub: 'flags administrativas', x: C.c3, y: 1330, cor: '#6b6459', rows: [
    ['id = 1', 'INTEGER', 'PK'], ['analiseFiscalIA (liga/desliga análise)', 'BOOL', 'J']] },
]

const hOf = (e) => HEAD_H + e.rows.length * ROW_H + PAD
const byId = Object.fromEntries(ENT.map((e) => [e.id, e]))

// Conectores: [de, para, ladoDe, ladoPara, cardinalidade, rótulo]
// lados: t (topo), b (base), l (esq.), r (dir.) + fração da borda (0..1)
const REL = [
  ['fornecedores', 'contratos', 'r,0.3', 'l,0.3', '1 ─ N', 'possui'],
  ['fornecedores', 'produtos', 'r,0.12', 't,0.5', '1 ─ N', 'fornece'],
  ['fornecedores', 'usuarios', 'l,0.4', 'r,0.55', '1 ─ N', 'vínculo de acesso'],
  ['revendas', 'usuarios', 't,0.5', 'b,0.35', '1 ─ N', 'vínculo de acesso'],
  ['revendas', 'pedidos', 'r,0.3', 'l,0.3', '1 ─ N', 'realiza'],
  ['produtos', 'pedidos', 'b,0.25', 't,0.72', '1 ─ N', 'itens (JSONB)'],
  ['produtos', 'inventarios', 'b,0.6', 't,0.6', '1 ─ N', 'itens (JSONB)'],
  ['pedidos', 'cotacoes', 'r,0.35', 'l,0.35', '1 ─ N', 'origina'],
  ['fornecedores', 'cotacoes', 'b,0.85', 't,0.4', 'N ─ M', 'convidados / propostas / vencedor'],
  ['pedidos', 'faturamentos', 'b,0.5', 't,0.5', '1 ─ N', 'fatura'],
  ['fornecedores', 'faturamentos', 'l,0.85', 'l,0.25', '1 ─ N', 'emite', 600, 862],
  ['revendas', 'faturamentos', 'b,0.6', 't,0.15', '1 ─ N', 'recebe'],
  ['cotacoes', 'faturamentos', 'b,0.2', 'r,0.2', '0..1 ─ N', 'referência'],
  ['anexos', 'faturamentos', 'r,0.5', 'l,0.6', '1 ─ 0..1', 'documento fiscal'],
  ['faturamentos', 'pagamentos', 'b,0.85', 'b,0.5', 'N ─ 1', 'consolida por competência', 1185, 1285],
]

function anchor(e, spec) {
  const [side, fS] = spec.split(','); const f = parseFloat(fS); const h = hOf(e)
  if (side === 't') return { x: e.x + W * f, y: e.y, dir: 'v-' }
  if (side === 'b') return { x: e.x + W * f, y: e.y + h, dir: 'v+' }
  if (side === 'l') return { x: e.x, y: e.y + h * f, dir: 'h-' }
  return { x: e.x + W, y: e.y + h * f, dir: 'h+' }
}
function path(a, b) {
  const k = 70
  const c1x = a.dir[0] === 'h' ? a.x + (a.dir === 'h+' ? k : -k) : a.x
  const c1y = a.dir[0] === 'v' ? a.y + (a.dir === 'v+' ? k : -k) : a.y
  const c2x = b.dir[0] === 'h' ? b.x + (b.dir === 'h+' ? k : -k) : b.x
  const c2y = b.dir[0] === 'v' ? b.y + (b.dir === 'v+' ? k : -k) : b.y
  return `M ${a.x} ${a.y} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${b.x} ${b.y}`
}

const CANVAS_W = 2370, CANVAS_H = 1560
const esc = (s) => String(s == null ? '' : s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]))
const FLAG = { PK: ['PK', '#B38335'], FK: ['FK', '#33568f'], UK: ['UK', '#1f6b5e'], J: ['data ✦', '#8a8378'] }

function entHtml(e) {
  return `<div style="position:absolute;left:${e.x}px;top:${e.y}px;width:${W}px;background:#fffdf9;border:1.5px solid #d8cfbd;border-radius:12px;box-shadow:0 4px 14px rgba(39,37,37,.10);overflow:hidden">
    <div style="background:linear-gradient(135deg,${e.cor},${e.cor}dd);padding:7px 14px 6px">
      <div style="font-family:Consolas,monospace;font-size:19px;font-weight:700;color:#fff">${esc(e.t)}</div>
      <div style="font-size:11.5px;color:#ffffffcc;margin-top:1px">${esc(e.sub)}</div>
    </div>
    <div style="padding:5px 0 ${PAD}px">
    ${e.rows.map(([n, t, f]) => {
      const fl = FLAG[f]
      return `<div style="display:flex;align-items:center;gap:8px;height:${ROW_H}px;padding:0 12px;font-size:12.5px">
        <span style="width:44px;flex:none;text-align:center;font-size:9.5px;font-weight:700;color:${fl ? fl[1] : 'transparent'};border:1px solid ${fl ? fl[1] + '55' : 'transparent'};border-radius:5px;padding:0.5px 0;background:${fl ? fl[1] + '10' : 'transparent'}">${fl ? fl[0] : ''}</span>
        <span style="flex:1;color:#272525;font-family:Consolas,monospace;font-size:12.5px;white-space:nowrap;overflow:hidden">${esc(n)}</span>
        <span style="flex:none;color:#a89f90;font-size:10.5px;white-space:nowrap">${esc(t)}</span>
      </div>`
    }).join('')}
    </div></div>`
}

const svgRels = REL.map(([de, para, sDe, sPara, card, rot, lx, ly]) => {
  const a = anchor(byId[de], sDe), b = anchor(byId[para], sPara)
  const mx = lx ?? (a.x + b.x) / 2, my = ly ?? (a.y + b.y) / 2
  return `<path d="${path(a, b)}" fill="none" stroke="#b3833588" stroke-width="2.2"/>
    <circle cx="${a.x}" cy="${a.y}" r="4.5" fill="#B38335"/>
    <circle cx="${b.x}" cy="${b.y}" r="4.5" fill="#fff" stroke="#B38335" stroke-width="2.2"/>
    <g><rect x="${mx - 92}" y="${my - 13}" width="184" height="26" rx="13" fill="#ffffff" stroke="#e6d9bd" opacity="0.96"/>
    <text x="${mx}" y="${my - 1}" text-anchor="middle" font-size="11" font-weight="700" fill="#8a5a12" font-family="Segoe UI">${esc(card)}</text>
    <text x="${mx}" y="${my + 10}" text-anchor="middle" font-size="9.5" fill="#8a8378" font-family="Segoe UI">${esc(rot)}</text></g>`
}).join('\n')

const legend = `<div style="position:absolute;left:${C.c4}px;top:1330px;width:${W}px;background:#272525;border-radius:12px;padding:12px 16px">
  <div style="font-size:13px;font-weight:800;color:#e3bf7e;letter-spacing:.08em;margin-bottom:7px">LEGENDA</div>
  <div style="font-size:11.5px;color:#e8e2d6;line-height:1.75">
    <b style="color:#e3bf7e">PK</b> chave primária · <b style="color:#9db6e0">FK</b> referência (chave estrangeira lógica) · <b style="color:#8fd0c1">UK</b> valor único<br>
    <b style="color:#c9c1b4">data ✦</b> campo guardado dentro da coluna <span style="font-family:Consolas,monospace">data JSONB</span> da tabela<br>
    ●──○ lado "1" (ponto cheio) para o lado "N" (ponto vazio) · N ─ M via listas no JSONB<br>
    Toda tabela de negócio tem <span style="font-family:Consolas,monospace">ord</span> (ordem) e <span style="font-family:Consolas,monospace">data JSONB</span> com a entidade completa.
  </div></div>`

const diagramaHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
  *{margin:0;padding:0;box-sizing:border-box} body{font-family:'Segoe UI',Arial,sans-serif;-webkit-print-color-adjust:exact}
</style></head><body>
<div id="canvas" style="position:relative;width:${CANVAS_W}px;height:${CANVAS_H}px;background:linear-gradient(180deg,#faf7f0,#f4efe4)">
  <div style="position:absolute;left:50px;top:8px;display:flex;align-items:center;gap:12px">
    <div style="width:38px;height:38px;border-radius:10px;background:linear-gradient(135deg,#cfa055,#B38335 55%,#8a6428);display:flex;align-items:center;justify-content:center;font-family:Georgia,serif;font-weight:700;font-size:16px;color:#fff">CI</div>
    <div style="font-size:20px;font-weight:800;color:#272525">Plataforma Cidade Imperial — Diagrama de Entidades e Relacionamentos (DER)</div>
    <div style="font-size:12px;color:#8a8378">PostgreSQL · 15 tabelas · colunas tipadas + entidade completa em <span style="font-family:Consolas,monospace">data JSONB</span> · julho/2026</div>
  </div>
  <svg width="${CANVAS_W}" height="${CANVAS_H}" style="position:absolute;left:0;top:0">${svgRels}</svg>
  ${ENT.map(entHtml).join('\n')}
  ${legend}
</div></body></html>`

// ── 1. PNG (screenshot do canvas em 2x) ─────────────────────────────────────
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' })
const page = await browser.newPage({ viewport: { width: CANVAS_W, height: CANVAS_H }, deviceScaleFactor: 2 })
await page.setContent(diagramaHtml, { waitUntil: 'networkidle' })
await page.locator('#canvas').screenshot({ path: OUT_PNG })
console.log('PNG ok:', OUT_PNG)

// ─────────────────────────────────────────────────────────────────────────────
// DICIONÁRIO DE DADOS — conteúdo completo por tabela
// col: [coluna, tipo, obrigatório, descrição]; json: campos do JSONB `data`
// ─────────────────────────────────────────────────────────────────────────────
const DIC = [
  { t: 'app_seq', desc: 'Sequências numéricas da aplicação (linha única, id = 1). Guarda o próximo número a usar em cada identificador de negócio.', pk: 'id', rel: '—',
    col: [
      ['id', 'INTEGER', 'Sim', 'Sempre 1 (CHECK id = 1) — tabela de linha única.'],
      ['ped', 'INTEGER', 'Sim', 'Próximo número de pedido (PED-NNNN).'],
      ['cot', 'INTEGER', 'Sim', 'Próximo número de cotação (COT-NN).'],
      ['forn', 'INTEGER', 'Sim', 'Próximo id de fornecedor.'],
      ['prod', 'INTEGER', 'Sim', 'Próximo id de produto.'],
      ['rev', 'INTEGER', 'Sim', 'Próximo id de revenda.'],
      ['ctr', 'INTEGER', 'Sim', 'Próximo id de contrato.'],
      ['nf', 'INTEGER', 'Sim', 'Próximo número de nota de faturamento (NF-NNNN).']], json: [] },
  { t: 'fornecedores', desc: 'Parceiros homologados que fornecem produtos, participam de cotações, faturam diretamente às revendas e pagam royalty à Loja.', pk: 'id', rel: '1:N com contratos, produtos, faturamentos; N:M com cotacoes (convidados/propostas); 1:N com pagamentos (fechamentos); vínculo opcional de usuarios.',
    col: [
      ['id', 'INTEGER', 'Sim', 'Identificador do fornecedor.'],
      ['ord', 'INTEGER', 'Sim', 'Posição na lista (preserva a ordem da aplicação).'],
      ['nome', 'TEXT', 'Sim', 'Razão social / nome fantasia.'],
      ['cnpj', 'TEXT', 'Sim', 'CNPJ formatado (validado pela análise fiscal do faturamento).'],
      ['cidade', 'TEXT', 'Não', 'Cidade/UF.'],
      ['contato', 'TEXT', 'Não', 'E-mail comercial — destino das notificações do fornecedor.'],
      ['ativo', 'BOOLEAN', 'Sim', 'Inativo não aparece em novas cotações/envios diretos.'],
      ['data', 'JSONB', 'Sim', 'Entidade completa (espelho lossless dos campos acima).']], json: [] },
  { t: 'contratos', desc: 'Contratos da Loja com cada fornecedor; o percentual de royalty vigente é a base do cálculo em cada faturamento.', pk: 'id', rel: 'N:1 com fornecedores.',
    col: [
      ['id', 'INTEGER', 'Sim', 'Identificador do contrato.'],
      ['ord', 'INTEGER', 'Sim', 'Posição na lista.'],
      ['fornecedor_id', 'INTEGER', 'Sim', 'Fornecedor contratado (FK lógica → fornecedores.id).'],
      ['numero', 'TEXT', 'Sim', 'Número do contrato (CT-AAAA-NNN).'],
      ['royalty', 'NUMERIC', 'Sim', 'Percentual de royalty vigente (ex.: 3 = 3%).'],
      ['inicio / fim', 'TEXT', 'Sim', 'Vigência (dd/mm/aaaa).'],
      ['vigente', 'BOOLEAN', 'Sim', 'Somente o contrato vigente define o % dos novos faturamentos.'],
      ['data', 'JSONB', 'Sim', 'Entidade completa + campos abaixo.']],
    json: [['historico', 'LISTA de {data, de, para, usuario}', 'Trilha de alterações do percentual de royalty (RF04).']] },
  { t: 'produtos', desc: 'Catálogo de produtos homologados pela Loja. O preço é de referência interna — NUNCA exibido à revenda; ela só vê valores negociados/faturados.', pk: 'id', rel: 'N:1 com fornecedores; referenciado por pedidos.itens, cotacoes.itens e inventarios.itens (JSONB).',
    col: [
      ['id', 'INTEGER', 'Sim', 'Identificador do produto.'],
      ['ord', 'INTEGER', 'Sim', 'Posição na lista.'],
      ['codigo', 'TEXT', 'Sim', 'Código único (PRD-NNN) — usado também na planilha de inventário.'],
      ['descricao', 'TEXT', 'Sim', 'Descrição comercial.'],
      ['unidade', 'TEXT', 'Sim', 'Unidade de venda (Barril, Caixa, Unidade, Pacote…).'],
      ['preco', 'NUMERIC', 'Sim', 'Preço de referência (R$) — oculto ao perfil Revenda em toda a aplicação.'],
      ['fornecedor_id', 'INTEGER', 'Sim', 'Fornecedor padrão (FK lógica → fornecedores.id).'],
      ['ativo', 'BOOLEAN', 'Sim', 'Inativo sai do catálogo das revendas.'],
      ['data', 'JSONB', 'Sim', 'Entidade completa + campos abaixo.']],
    json: [['precoHist', 'LISTA de {data, de, para, usuario}', 'Histórico de alterações de preço.'],
      ['fotos', 'LISTA de URLs (opcional)', 'Imagens exibidas no catálogo/lightbox.']] },
  { t: 'revendas', desc: 'Clientes que compram para revender. A visibilidade define quais fornecedores (e portanto produtos) cada revenda enxerga no catálogo.', pk: 'id', rel: '1:N com pedidos e faturamentos; vínculo opcional de usuarios.',
    col: [
      ['id', 'INTEGER', 'Sim', 'Identificador da revenda.'],
      ['ord', 'INTEGER', 'Sim', 'Posição na lista.'],
      ['nome', 'TEXT', 'Sim', 'Nome da revenda.'],
      ['cnpj', 'TEXT', 'Sim', 'CNPJ (conferido como destinatário na análise fiscal).'],
      ['cidade', 'TEXT', 'Não', 'Cidade/UF.'],
      ['ativo', 'BOOLEAN', 'Sim', 'Inativa não acessa o catálogo.'],
      ['email', 'TEXT', 'Não', 'Destino das notificações da revenda.'],
      ['data', 'JSONB', 'Sim', 'Entidade completa + campos abaixo.']],
    json: [['visibilidade', 'LISTA de fornecedorId', 'Fornecedores cujos produtos a revenda pode ver/comprar.'],
      ['prodBloq', 'LISTA de produtoId', 'Produtos bloqueados individualmente para a revenda.'],
      ['ultimoAcesso / ultimoConvite', 'TEXTO', 'Último acesso do usuário vinculado e último convite reenviado.']] },
  { t: 'pedidos', desc: 'Pedido da revenda. Cada ITEM carrega seu próprio caminho de atendimento e pode ser fracionado por quantidade (linhas separadas) entre estoque, envio direto e cotação.', pk: 'id (TEXT, PED-NNNN)', rel: 'N:1 com revendas; 1:N com cotacoes e faturamentos; itens referenciam produtos e fornecedores.',
    col: [
      ['id', 'TEXT', 'Sim', 'Número do pedido (PED-NNNN).'],
      ['ord', 'INTEGER', 'Sim', 'Posição na lista.'],
      ['revenda_id', 'INTEGER', 'Sim', 'Revenda solicitante (FK lógica → revendas.id).'],
      ['fornecedor_id', 'INTEGER', 'Não', 'Fornecedor de destino consolidado (informativo).'],
      ['cotacao_id', 'TEXT', 'Não', 'Cotação relacionada (quando houver).'],
      ['total', 'NUMERIC', 'Sim', 'Total do pedido a preço de referência (R$).'],
      ['status', 'TEXT', 'Sim', 'pendente · aprovado · em cotação · encaminhado · atendido · faturado · rejeitado (derivado dos itens).'],
      ['data_criacao', 'TEXT', 'Sim', 'Data de criação (dd/mm/aaaa).'],
      ['data', 'JSONB', 'Sim', 'Entidade completa + campos abaixo.']],
    json: [['itens[]', 'LISTA', 'Um registro por item/fração: produtoId (→ produtos), qtd, preco (referência), st (pendente | aprovado | rejeitado | estoque | direto | cotacao | faturado), fornecedorId (destino, quando direto/faturado), cotacaoId (quando em cotação), estoqueTs (época do atendimento por estoque — base do saldo de inventário), justificativa (rejeição do item).'],
      ['trilha[]', 'LISTA de {quando, usuario, acao}', 'Linha do tempo do pedido (aprovações, encaminhamentos, faturamento com anexo/análise…).'],
      ['justificativa', 'TEXTO', 'Justificativa da rejeição do pedido inteiro.']] },
  { t: 'cotacoes', desc: 'Concorrência entre fornecedores convidados para itens de um pedido. Propostas são sigilosas entre concorrentes; a decisão pode ser do processo inteiro ou item a item.', pk: 'id (TEXT, COT-NN)', rel: 'N:1 com pedidos; N:M com fornecedores (convidados/propostas); vencedor_id → fornecedores; referenciada por faturamentos.',
    col: [
      ['id', 'TEXT', 'Sim', 'Número da cotação (COT-NN).'],
      ['ord', 'INTEGER', 'Sim', 'Posição na lista.'],
      ['pedido_id', 'TEXT', 'Sim', 'Pedido de origem (FK lógica → pedidos.id).'],
      ['prazo', 'TEXT', 'Sim', 'Data-limite para propostas (dd/mm/aaaa).'],
      ['status', 'TEXT', 'Sim', 'aguardando propostas · encerrada · cancelada.'],
      ['vencedor_id', 'INTEGER', 'Não', 'Fornecedor vencedor do processo inteiro (nulo quando decidido por item).'],
      ['data', 'JSONB', 'Sim', 'Entidade completa + campos abaixo.']],
    json: [['itens[]', 'LISTA de {produtoId, qtd, preco}', 'Itens/quantidades cotados (preço = referência).'],
      ['convidados', 'LISTA de fornecedorId', 'Fornecedores convidados a propor.'],
      ['propostas[]', 'LISTA', 'Uma por fornecedor: fornecedorId, preco (total), itens {produtoId: preço unitário}, prazoEntrega, validade, condicoes, quando.'],
      ['vencItens', 'OBJETO {produtoId: fornecedorId}', 'Adjudicação item a item (vencedores diferentes por item).'],
      ['justificativa', 'TEXTO', 'Obrigatória quando a escolha não é o menor preço.'],
      ['motivoCancel', 'TEXTO', 'Motivo do cancelamento.'],
      ['historico[]', 'LISTA de {quando, usuario, acao}', 'Linha do tempo (abertura, propostas, lembretes, decisão).']] },
  { t: 'faturamentos', desc: 'Notas emitidas pelo fornecedor diretamente à revenda. Exigem anexo do documento fiscal (PDF/XML) e guardam o veredito da análise automática; o royalty é calculado pelo % do contrato vigente.', pk: 'id (TEXT, NF-NNNN)', rel: 'N:1 com pedidos, fornecedores, revendas; 0..1 com cotacoes e anexos; consolidado em pagamentos por competência+fornecedor.',
    col: [
      ['id', 'TEXT', 'Sim', 'Número da nota (NF-NNNN).'],
      ['ord', 'INTEGER', 'Sim', 'Posição na lista.'],
      ['pedido_id', 'TEXT', 'Sim', 'Pedido faturado (FK lógica → pedidos.id).'],
      ['fornecedor_id', 'INTEGER', 'Sim', 'Fornecedor emitente (FK lógica → fornecedores.id).'],
      ['revenda_id', 'INTEGER', 'Sim', 'Revenda destinatária (FK lógica → revendas.id).'],
      ['valor', 'NUMERIC', 'Sim', 'Valor efetivamente faturado (R$).'],
      ['competencia', 'TEXT', 'Sim', 'Competência do fechamento (MM/AAAA).'],
      ['royalty_pct', 'NUMERIC', 'Sim', 'Percentual aplicado (do contrato vigente na emissão).'],
      ['royalty_valor', 'NUMERIC', 'Sim', 'Royalty devido = valor × royalty_pct.'],
      ['data', 'JSONB', 'Sim', 'Entidade completa + campos abaixo.']],
    json: [['cotacaoId', 'TEXTO', 'Cotação de origem, quando o item veio de concorrência.'],
      ['data', 'TEXTO dd/mm/aaaa', 'Data de emissão da nota.'],
      ['anexoId / anexoNome', 'TEXTO (→ anexos.id)', 'Documento fiscal anexado (obrigatório no registro).'],
      ['analise', 'OBJETO {aceito, confianca, motivo, engine, quando}', 'Veredito da análise do documento (engine: claude | local); nulo quando o flag estava desligado.']] },
  { t: 'pagamentos', desc: 'Fechamento mensal de royalty por fornecedor (RF37–RF41): cobrança com vencimento, controle de atraso, lembrete e baixa de pagamento.', pk: 'chave (TEXT, "MM/AAAA-fornecedorId")', rel: 'Consolida faturamentos da competência; N:1 lógico com fornecedores.',
    col: [
      ['chave', 'TEXT', 'Sim', 'Competência + fornecedor (ex.: "06/2026-1").'],
      ['status', 'TEXT', 'Sim', 'a pagar · em atraso (derivado do vencimento) · pago.'],
      ['valor', 'NUMERIC', 'Não', 'Valor efetivamente pago (R$).'],
      ['data', 'JSONB', 'Sim', 'Entidade completa + campos abaixo.']],
    json: [['cobranca / cobrancaData', 'BOOL · TEXTO', 'Cobrança emitida e a data de emissão.'],
      ['numero', 'TEXTO', 'Número do documento de cobrança (COB-AAAAMM-NN).'],
      ['vencimento', 'TEXTO dd/mm/aaaa', 'Vencimento definido na emissão — após essa data sem pagamento, o status vira "em atraso" automaticamente.'],
      ['lembreteData', 'TEXTO', 'Data do último lembrete de atraso enviado.'],
      ['data / comprovante', 'TEXTO', 'Data do pagamento e identificação do comprovante (PIX/TED…).'],
      ['pagoComAtraso', 'BOOL', 'true quando a data do pagamento superou o vencimento.']] },
  { t: 'inventarios', desc: 'Contagens de estoque da Loja em datas específicas (manual ou por planilha XLSX). O saldo exibido nos pedidos = última contagem − atendimentos por estoque posteriores a ela.', pk: 'id', rel: 'Itens referenciam produtos (JSONB).',
    col: [
      ['id', 'INTEGER', 'Sim', 'Identificador do inventário.'],
      ['ord', 'INTEGER', 'Sim', 'Posição na lista.'],
      ['data_lanc', 'TEXT', 'Sim', 'Data da contagem (dd/mm/aaaa).'],
      ['usuario', 'TEXT', 'Sim', 'Quem lançou.'],
      ['data', 'JSONB', 'Sim', 'Entidade completa + campos abaixo.']],
    json: [['ts', 'NÚMERO (época ms)', 'Marca temporal usada para descontar apenas consumos posteriores à contagem.'],
      ['obs', 'TEXTO', 'Observação do lançamento.'],
      ['itens', 'OBJETO {produtoId: quantidade}', 'Quantidades contadas por produto.']] },
  { t: 'usuarios', desc: 'Contas de acesso com papel (perfil) e permissões de granularidade fina por usuário. Fornecedor/Revenda ficam travados no vínculo.', pk: 'id', rel: 'Vínculo opcional com fornecedores (fornecedorId) ou revendas (revendaId).',
    col: [
      ['id', 'INTEGER', 'Sim', 'Identificador do usuário.'],
      ['ord', 'INTEGER', 'Sim', 'Posição na lista.'],
      ['nome', 'TEXT', 'Sim', 'Nome exibido (aparece na auditoria e nas trilhas).'],
      ['email', 'TEXT', 'Sim', 'Login — único (case-insensitive).'],
      ['papel', 'TEXT', 'Sim', 'admin · loja · fornecedor · revenda.'],
      ['ativo', 'BOOLEAN', 'Sim', 'Inativo não consegue entrar (deve existir ≥ 1 admin ativo).'],
      ['data', 'JSONB', 'Sim', 'Entidade completa + campos abaixo.']],
    json: [['senhaHash', 'TEXTO', 'Hash da senha (não reversível).'],
      ['fornecedorId / revendaId', 'INTEGER', 'Vínculo obrigatório para papéis fornecedor/revenda.'],
      ['permissoes', 'OBJETO {chave: bool}', 'Sobreposições individuais ao padrão do perfil (25 chaves em 7 grupos: pedidos.*, cotacoes.*, faturamento.*, royalties.*, cadastros.*, inventario.*, relatorios.*, auditoria.*, config.*).'],
      ['ultimoAcesso / criadoEm', 'TEXTO', 'Controle de acesso e criação.']] },
  { t: 'anexos', desc: 'Arquivos binários dos documentos fiscais (PDF/XML) anexados no faturamento. Gravados uma única vez (imutáveis) e servidos por id — fora do estado sincronizado da aplicação.', pk: 'id (TEXT, "ax…")', rel: 'Referenciado por faturamentos.data.anexoId (1 → 0..1).',
    col: [
      ['id', 'TEXT', 'Sim', 'Identificador gerado no upload (ax + base36).'],
      ['nome', 'TEXT', 'Sim', 'Nome original do arquivo (ex.: nfe-1234.xml).'],
      ['tipo', 'TEXT', 'Sim', 'MIME (application/pdf ou text/xml).'],
      ['tamanho', 'INTEGER', 'Sim', 'Tamanho em bytes (limite: 5 MB).'],
      ['criado_em', 'TEXT', 'Sim', 'Data/hora do upload (ISO 8601).'],
      ['dados', 'TEXT', 'Sim', 'Conteúdo do arquivo em base64.']], json: [] },
  { t: 'auditoria', desc: 'Trilha das operações críticas e eventos de segurança (logins, falhas, logouts, acessos negados). Mantém os últimos 400 eventos, classificados por módulo e severidade.', pk: 'ord', rel: 'usuario/email referenciam usuarios (informativo).',
    col: [
      ['ord', 'INTEGER', 'Sim', 'Posição (0 = mais recente).'],
      ['quando', 'TEXT', 'Sim', 'Data/hora formatada (dd/mm/aaaa hh:mm).'],
      ['usuario', 'TEXT', 'Sim', 'Quem executou (ou e-mail tentado, em falha de login).'],
      ['acao', 'TEXT', 'Sim', 'Operação (ex.: "Registro de faturamento", "Falha de login").'],
      ['detalhe', 'TEXT', 'Não', 'Complemento (números de documentos, valores, motivos…).'],
      ['data', 'JSONB', 'Sim', 'Entidade completa + campos abaixo.']],
    json: [['ts', 'NÚMERO (época ms)', 'Base dos filtros por período.'],
      ['email / papel', 'TEXTO', 'Identificação de quem executou.'],
      ['modulo', 'TEXTO', 'Segurança · Pedidos · Cotações · Faturamento · Royalties · Cadastros · Estoque · Usuários · Configurações · Relatórios.'],
      ['sev', 'TEXTO', 'info · alerta · critico.']] },
  { t: 'config_email', desc: 'Configuração SMTP da plataforma (linha única, id = 1), gerenciada pelo administrador na tela Configurações Técnicas.', pk: 'id', rel: '—',
    col: [['id', 'INTEGER', 'Sim', 'Sempre 1 (singleton).'], ['data', 'JSONB', 'Sim', 'Campos abaixo.']],
    json: [['host / porta / seguranca', 'TEXTO', 'Servidor SMTP; segurança: starttls · ssl · none.'],
      ['usuario / senha', 'TEXTO', 'Autenticação no servidor de e-mail.'],
      ['remetenteNome / remetenteEmail', 'TEXTO', 'Remetente exibido nos e-mails automáticos.'],
      ['responderPara / emailLoja', 'TEXTO', 'Reply-to e e-mail interno da Loja (avisos).'],
      ['ativo', 'BOOL', 'Liga/desliga o envio de todos os e-mails automáticos.']] },
  { t: 'config_plataforma', desc: 'Flags administrativas gerais (linha única, id = 1).', pk: 'id', rel: '—',
    col: [['id', 'INTEGER', 'Sim', 'Sempre 1 (singleton).'], ['data', 'JSONB', 'Sim', 'Campos abaixo.']],
    json: [['analiseFiscalIA', 'BOOL', 'Habilita/desabilita a análise automática do documento fiscal no faturamento (o anexo permanece obrigatório).']] },
]

// ── 2. PDF (paisagem) ────────────────────────────────────────────────────────
const pngB64 = readFileSync(OUT_PNG).toString('base64')
function dicHtml(d) {
  return `<section class="tab">
    <div class="tab-head"><span class="tab-nome">${esc(d.t)}</span><span class="tab-pk">PK: ${esc(d.pk)}</span></div>
    <p class="tab-desc">${esc(d.desc)}</p>
    <p class="tab-rel"><b>Relacionamentos:</b> ${esc(d.rel)}</p>
    <table class="tbl"><tr><th style="width:22%">Coluna</th><th style="width:16%">Tipo</th><th style="width:9%">Obrig.</th><th>Descrição</th></tr>
      ${d.col.map((c) => `<tr><td class="mono">${esc(c[0])}</td><td>${esc(c[1])}</td><td>${esc(c[2])}</td><td>${esc(c[3])}</td></tr>`).join('')}
    </table>
    ${d.json.length ? `<div class="jtitle">Campos dentro de <span class="mono">data</span> (JSONB)</div>
    <table class="tbl jd"><tr><th style="width:22%">Campo</th><th style="width:24%">Tipo</th><th>Descrição</th></tr>
      ${d.json.map((c) => `<tr><td class="mono">${esc(c[0])}</td><td>${esc(c[1])}</td><td>${esc(c[2])}</td></tr>`).join('')}
    </table>` : ''}
  </section>`
}

const htmlPdf = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><style>
  @page { size: A4 landscape; margin: 0; }
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:'Segoe UI',Arial,sans-serif; color:#272525; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
  .capa { height:209.5mm; position:relative; background:radial-gradient(1000px 500px at 70% -10%, #3a2f1c, #272525 55%, #1c1a18); page-break-after:always; }
  .pagina-diagrama { height:209.5mm; padding:8mm 10mm; page-break-after:always; background:#faf7f0; }
  .miolo { padding:12mm 14mm; }
  .mono { font-family:Consolas,'Courier New',monospace; font-size:10.5px; }
  .tab { break-inside:avoid; border:1px solid #eae3d6; border-radius:10px; padding:10px 13px; margin-bottom:11px; background:#fffdf9; }
  .tab-head { display:flex; align-items:center; justify-content:space-between; gap:10px; }
  .tab-nome { font-family:Consolas,monospace; font-size:16px; font-weight:800; color:#8a5a12; }
  .tab-pk { font-size:10px; font-weight:700; color:#B38335; background:#faf3e4; border:1px solid #ecdcbc; border-radius:12px; padding:2px 10px; }
  .tab-desc { font-size:11px; color:#4a453d; line-height:1.5; margin:5px 0 2px; }
  .tab-rel { font-size:10.5px; color:#6b6459; line-height:1.45; margin:3px 0 6px; }
  .tbl { width:100%; border-collapse:collapse; font-size:10px; }
  .tbl th { text-align:left; background:#272525; color:#e3bf7e; padding:4.5px 8px; font-size:9px; letter-spacing:.05em; text-transform:uppercase; }
  .tbl td { padding:4.5px 8px; border-bottom:1px solid #eee7d8; color:#4a453d; vertical-align:top; line-height:1.4; }
  .tbl tr:nth-child(even) td { background:#faf7f0; }
  .jd th { background:#5d5646; }
  .jtitle { font-size:10.5px; font-weight:700; color:#5d5646; margin:8px 0 4px; }
  .sec-title { font-size:13px; font-weight:800; letter-spacing:.12em; color:#B38335; margin:4px 0 10px; }
  p.intro { font-size:11.5px; color:#4a453d; line-height:1.55; margin:6px 0; }
</style></head><body>

<div class="capa">
  <div style="position:absolute;left:16mm;top:16mm;display:flex;align-items:center;gap:14px">
    <div style="width:50px;height:50px;border-radius:13px;background:linear-gradient(135deg,#cfa055,#B38335 55%,#8a6428);display:flex;align-items:center;justify-content:center;font-family:Georgia,serif;font-weight:700;font-size:21px;color:#fff">CI</div>
    <div><div style="font-family:Georgia,serif;font-weight:700;font-size:15px;letter-spacing:.14em;color:#fff">CIDADE IMPERIAL</div>
    <div style="font-size:10.5px;letter-spacing:.16em;color:#e3bf7e;margin-top:3px">PLATAFORMA DA LOJA</div></div>
  </div>
  <div style="position:absolute;left:16mm;right:16mm;top:62mm">
    <div style="font-size:13px;font-weight:700;letter-spacing:.18em;color:#e3bf7e;margin-bottom:12px">ARQUITETURA DE DADOS · POSTGRESQL</div>
    <div style="font-size:40px;font-weight:800;color:#fff;line-height:1.1;letter-spacing:-.5px">Diagrama de Entidades e Relacionamentos<br>+ Dicionário de Dados completo</div>
    <div style="font-size:14.5px;color:#c9c1b4;margin-top:16px;line-height:1.6;max-width:210mm">15 tabelas do banco da Plataforma Cidade Imperial. Cada tabela de negócio combina <b style="color:#e8e2d6">colunas tipadas</b> (para consultas SQL e relatórios) com a <b style="color:#e8e2d6">entidade completa em JSONB</b> (coluna <span style="font-family:Consolas,monospace">data</span>) — o dicionário documenta as duas camadas, campo a campo.</div>
  </div>
  <div style="position:absolute;left:16mm;bottom:14mm;font-size:10px;color:#8a8378">Julho de 2026 · Diagrama também disponível como imagem única: docs/Plataforma-Cidade-Imperial-DER.png</div>
</div>

<div class="pagina-diagrama">
  <img src="data:image/png;base64,${pngB64}" style="width:100%;height:auto;border-radius:8px;border:1px solid #e5ddcd">
</div>

<div class="miolo">
  <div class="sec-title">DICIONÁRIO DE DADOS — 15 TABELAS</div>
  <p class="intro">Convenções: <b>PK</b> chave primária · <b>FK lógica</b> referência mantida pela aplicação (sem constraint física, para preservar o espelhamento transacional do estado) · coluna <span class="mono">ord</span> preserva a ordem das listas da aplicação · coluna <span class="mono">data</span> (JSONB) guarda a entidade completa e é a fonte de leitura da aplicação; as demais colunas são projeções tipadas para SQL. Datas de negócio em dd/mm/aaaa; competências em MM/AAAA; valores em reais (R$).</p>
  ${DIC.map(dicHtml).join('')}
  <div style="display:flex;justify-content:space-between;font-size:9px;color:#a89f90;border-top:1px solid #eae3d6;padding-top:6px;margin-top:4px">
    <span>Plataforma Cidade Imperial — DER e Dicionário de Dados (PostgreSQL) · 15 tabelas</span><span>julho/2026</span>
  </div>
</div>
</body></html>`

const page2 = await browser.newPage()
await page2.setContent(htmlPdf, { waitUntil: 'networkidle' })
await page2.pdf({ path: OUT_PDF, format: 'A4', landscape: true, printBackground: true, margin: { top: 0, bottom: 0, left: 0, right: 0 } })
await browser.close()
console.log('PDF ok:', OUT_PDF)

// ── 3. DOCX ──────────────────────────────────────────────────────────────────
const P = (txt, o = {}) => new Paragraph({ children: [new TextRun({ text: txt, size: o.size || 21, bold: !!o.bold, color: o.color || '3A362E', font: 'Calibri', italics: !!o.it })], spacing: { after: o.after ?? 90, before: o.before ?? 0 } })
const cellB = { top: { style: BorderStyle.SINGLE, size: 4, color: 'E5DDCD' }, bottom: { style: BorderStyle.SINGLE, size: 4, color: 'E5DDCD' }, left: { style: BorderStyle.SINGLE, size: 4, color: 'E5DDCD' }, right: { style: BorderStyle.SINGLE, size: 4, color: 'E5DDCD' } }
const cell = (children, o = {}) => new TableCell({ children, borders: cellB, shading: o.fill ? { type: ShadingType.SOLID, color: o.fill, fill: o.fill } : undefined, width: o.w ? { size: o.w, type: WidthType.PERCENTAGE } : undefined, margins: { top: 50, bottom: 50, left: 90, right: 90 } })
const headCell = (t, w, fill = DARK) => cell([P(t, { bold: true, color: 'E3BF7E', size: 18 })], { fill, w })

const secCapa = []
secCapa.push(P('CIDADE IMPERIAL · PLATAFORMA DA LOJA', { bold: true, color: GOLD, size: 22, before: 200 }))
secCapa.push(new Paragraph({ children: [new TextRun({ text: 'Diagrama de Entidades e Relacionamentos + Dicionário de Dados', bold: true, size: 48, color: DARK, font: 'Calibri' })], spacing: { after: 160 } }))
secCapa.push(P('Banco PostgreSQL · 15 tabelas · colunas tipadas + entidade completa em JSONB (coluna data)', { size: 24, color: GREY, after: 60 }))
secCapa.push(P('Julho de 2026', { size: 22, color: GREY, after: 200 }))
secCapa.push(new Paragraph({ text: 'Convenções', heading: HeadingLevel.HEADING_1 }))
secCapa.push(P('PK = chave primária. FK lógica = referência mantida pela aplicação (sem constraint física, para preservar o espelhamento transacional do estado). A coluna "ord" preserva a ordem das listas da aplicação. A coluna "data" (JSONB) guarda a entidade completa e é a fonte de leitura da aplicação; as demais colunas são projeções tipadas para consultas SQL e relatórios. Datas de negócio em dd/mm/aaaa; competências em MM/AAAA; valores em reais (R$).'))

const png = readFileSync(OUT_PNG)
const secDiagrama = [
  new Paragraph({ text: 'Diagrama de Entidades e Relacionamentos (DER)', heading: HeadingLevel.HEADING_1 }),
  new Paragraph({ children: [new ImageRun({ type: 'png', data: png, transformation: { width: 970, height: Math.round(970 * CANVAS_H / CANVAS_W) } })], spacing: { after: 120 } }),
  P('O mesmo diagrama está disponível em alta resolução como imagem única: docs/Plataforma-Cidade-Imperial-DER.png.', { size: 18, color: GREY, it: true }),
]

const secDic = [new Paragraph({ text: 'Dicionário de Dados — 15 tabelas', heading: HeadingLevel.HEADING_1 })]
for (const d of DIC) {
  secDic.push(new Paragraph({ text: d.t, heading: HeadingLevel.HEADING_2 }))
  secDic.push(P(d.desc, { after: 60 }))
  secDic.push(new Paragraph({ children: [new TextRun({ text: 'Chave primária: ', bold: true, size: 19, color: '3A362E', font: 'Calibri' }), new TextRun({ text: d.pk, size: 19, color: '3A362E', font: 'Consolas' }), new TextRun({ text: '    ·    Relacionamentos: ', bold: true, size: 19, color: '3A362E', font: 'Calibri' }), new TextRun({ text: d.rel, size: 19, color: GREY, font: 'Calibri' })], spacing: { after: 100 } }))
  secDic.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [
    new TableRow({ children: [headCell('Coluna', 22), headCell('Tipo', 18), headCell('Obrig.', 9), headCell('Descrição', 51)] }),
    ...d.col.map((c) => new TableRow({ children: [cell([P(c[0], { size: 18 })]), cell([P(c[1], { size: 18 })]), cell([P(c[2], { size: 18 })]), cell([P(c[3], { size: 18 })])] })),
  ] }))
  if (d.json.length) {
    secDic.push(P('Campos dentro de data (JSONB):', { bold: true, size: 19, before: 120, after: 60 }))
    secDic.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [
      new TableRow({ children: [headCell('Campo', 22, '5D5646'), headCell('Tipo', 26, '5D5646'), headCell('Descrição', 52, '5D5646')] }),
      ...d.json.map((c) => new TableRow({ children: [cell([P(c[0], { size: 18 })]), cell([P(c[1], { size: 18 })]), cell([P(c[2], { size: 18 })])] })),
    ] }))
  }
  secDic.push(P(' ', { after: 60 }))
}

const doc = new Document({
  styles: { paragraphStyles: [
    { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 30, bold: true, color: DARK, font: 'Calibri' }, paragraph: { spacing: { before: 300, after: 130 } } },
    { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 25, bold: true, color: GOLD, font: 'Consolas' }, paragraph: { spacing: { before: 260, after: 90 } } },
  ] },
  sections: [
    { properties: { page: { margin: { top: 1000, bottom: 1000, left: 1100, right: 1100 } } }, children: secCapa },
    { properties: { page: { size: { orientation: PageOrientation.LANDSCAPE }, margin: { top: 700, bottom: 700, left: 800, right: 800 } } }, children: secDiagrama },
    { properties: { page: { margin: { top: 1000, bottom: 1000, left: 1100, right: 1100 } } }, children: secDic },
  ],
})
writeFileSync(OUT_DOCX, await Packer.toBuffer(doc))
console.log('DOCX ok:', OUT_DOCX)
