import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import XLSX from 'xlsx';
const B = 'http://localhost:3344';
const SC = process.env.SC;
const OUT = process.env.OUT;
const DL = SC + '/ev-dl';
fs.rmSync(DL, { recursive: true, force: true }); fs.mkdirSync(DL, { recursive: true });
fs.mkdirSync(OUT, { recursive: true });
const log = [];

const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
const ctx = await br.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1.5, acceptDownloads: true });
const pg = await ctx.newPage();

const shot = async (nome, opts) => { const p = path.join(OUT, nome + '.png'); await pg.screenshot({ path: p, ...(opts || {}) }); log.push(nome); };
const ir = async (tela) => { await pg.getByText(tela, { exact: true }).first().click(); await pg.waitForTimeout(1300); };
const baixar = async (rotulo) => {
  const [dl] = await Promise.all([pg.waitForEvent('download'), pg.getByText(rotulo, { exact: true }).click()]);
  const p = path.join(DL, dl.suggestedFilename()); await dl.saveAs(p); await pg.waitForTimeout(400); return p;
};
const subir = async (tipo, arq) => { await pg.locator('#imp-file-' + tipo).setInputFiles(arq); await pg.waitForTimeout(1600); };
const gravar = async () => { await pg.getByText(/^Gravar \d+ registro\(s\)$/).click(); await pg.waitForTimeout(2400); };
const escrever = (nome, aoa, aba) => {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa), aba);
  const p = path.join(DL, nome); XLSX.writeFile(wb, p); return p;
};

// Renderiza uma aba da planilha como imagem, no visual de uma planilha.
const planilhaPng = async (arquivo, aba, nome, titulo, sub) => {
  const rows = XLSX.utils.sheet_to_json(XLSX.readFile(arquivo).Sheets[aba], { header: 1, defval: '' });
  const nCols = Math.max(...rows.map((r) => r.length));
  const letra = (i) => String.fromCharCode(65 + i);
  const html = `<div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;background:#f7f4ee;padding:26px">
    <div style="font-size:19px;font-weight:700;color:#272525">${titulo}</div>
    <div style="font-size:13px;color:#8a8378;margin:3px 0 14px">${sub}</div>
    <div style="background:#fff;border:1px solid #d9d3c6;border-radius:8px;overflow:hidden;display:inline-block;min-width:100%;box-sizing:border-box">
      <table style="border-collapse:collapse;font-size:12.5px;color:#272525;width:100%">
        <tr><td style="background:#eceade;border:1px solid #d9d3c6;width:34px"></td>
        ${Array.from({ length: nCols }, (_, i) => `<td style="background:#eceade;border:1px solid #d9d3c6;padding:4px 9px;text-align:center;font-size:11px;font-weight:700;color:#7a7364">${letra(i)}</td>`).join('')}</tr>
        ${rows.map((r, ri) => `<tr>
          <td style="background:#eceade;border:1px solid #d9d3c6;padding:4px 6px;text-align:center;font-size:11px;font-weight:700;color:#7a7364">${ri + 1}</td>
          ${Array.from({ length: nCols }, (_, ci) => {
            const v = r[ci] == null ? '' : String(r[ci]);
            const cab = ri === 0;
            return `<td style="border:1px solid #e6e1d6;padding:6px 9px;white-space:nowrap;${cab ? 'background:#faf3e4;font-weight:700;color:#8f682a;' : ''}">${v.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</td>`;
          }).join('')}</tr>`).join('')}
      </table>
    </div></div>`;
  const p2 = await ctx.newPage();
  await p2.setViewportSize({ width: 1440, height: 800 });
  await p2.setContent(html);
  await p2.waitForTimeout(250);
  const el = await p2.locator('div').first();
  await el.screenshot({ path: path.join(OUT, nome + '.png') });
  log.push(nome);
  await p2.close();
};

try {
  await pg.goto(B, { waitUntil: 'networkidle' }); await pg.waitForTimeout(1500);
  await pg.getByText('Loja (Ana Ribeiro)', { exact: true }).click(); await pg.waitForTimeout(300);
  await pg.getByText('Entrar na plataforma', { exact: true }).click(); await pg.waitForTimeout(2200);

  // 01 · bloco na tela de Fornecedores
  await ir('Fornecedores & Contratos');
  await shot('01-bloco-fornecedores');

  // 02 · modelo em branco (aba de dados) e 03 · aba de instruções
  const mForn = await baixar('⬇ Baixar modelo');
  const head = XLSX.utils.sheet_to_json(XLSX.readFile(mForn).Sheets['Fornecedores'], { header: 1, defval: '' })[0];
  await planilhaPng(mForn, 'Fornecedores', '02-modelo-fornecedores',
    'Modelo baixado — modelo-fornecedores.xlsx · aba "Fornecedores"',
    'Colunas na ordem certa e duas linhas de exemplo, prontas para serem sobrescritas');
  await planilhaPng(mForn, 'Instruções', '03-modelo-instrucoes',
    'Modelo baixado — aba "Instruções"',
    'Cada modelo explica o preenchimento, as regras de cada cadastro e quais colunas são obrigatórias');

  // 04 · planilha preenchida pelo usuário
  const st0 = await (await fetch(B + '/api/state')).json();
  const arqF = escrever('carga-fornecedores.xlsx', [
    head,
    ['Distribuidora Nova Serra', '11.222.333/0001-44', 'Petrópolis/RJ', 'comercial@novaserra.com.br', '(24) 99999-0000', 'Carlos Andrade', 'Sim'],
    ['Bebidas do Vale Ltda', '55666777000188', 'Teresópolis/RJ', 'vendas@vale.com.br', '(21) 98888-1111', 'Marina Alves', 'Sim'],
    [st0.fornecedores[0].nome, st0.fornecedores[0].cnpj, 'Petrópolis/RJ', 'novo@serraverde.com.br', '(24) 3333-4444', 'Contato Atualizado', 'Sim'],
    ['', '99.888.777/0001-66', 'Volta Redonda/RJ', '', '', '', 'Sim'],
    ['Fornecedor sem CNPJ', '', 'Barra Mansa/RJ', '', '', '', 'Sim'],
    ['CNPJ incompleto', '123', 'Resende/RJ', '', '', '', 'Sim'],
  ], 'Fornecedores');
  await planilhaPng(arqF, 'Fornecedores', '04-planilha-preenchida',
    'Planilha preenchida pelo usuário',
    'Duas inclusões, uma atualização (CNPJ já cadastrado) e três linhas com problema, de propósito');

  // 05 · prévia com contadores e erros
  await subir('fornecedor', arqF);
  await shot('05-previa-fornecedores');
  await gravar();

  // 06 · resultado na lista
  await pg.waitForTimeout(800);
  await shot('06-resultado-fornecedores');

  // 07/08 · revendas
  await ir('Revendas');
  const mRev = await baixar('⬇ Baixar modelo');
  const headR = XLSX.utils.sheet_to_json(XLSX.readFile(mRev).Sheets['Revendas'], { header: 1, defval: '' })[0];
  const stR = await (await fetch(B + '/api/state')).json();
  const arqR = escrever('carga-revendas.xlsx', [
    headR,
    ['Bar do Mirante', '33.444.555/0001-66', 'Petrópolis/RJ', 'compras@barmirante.com.br', '(24) 99999-0000', 'Sim'],
    ['Choperia Vale Verde', '66.777.888/0001-99', 'Nova Friburgo/RJ', '', '(22) 98888-1111', 'Sim'],
    ['Adega Serrana', '77.888.999/0001-11', 'Teresópolis/RJ', 'compras@adegaserrana.com.br', '(21) 97777-2222', 'Sim'],
    [stR.revendas[1].nome, stR.revendas[1].cnpj, 'Petrópolis/RJ', '', '(24) 3333-2222', 'Sim'],
  ], 'Revendas');
  await subir('revenda', arqR);
  await shot('07-previa-revendas');
  await gravar(); await pg.waitForTimeout(800);
  await shot('08-resultado-revendas');

  // 09/10/11 · produtos
  await ir('Produtos homologados');
  await shot('09-bloco-produtos');
  const mProd = await baixar('⬇ Baixar modelo');
  const headP = XLSX.utils.sheet_to_json(XLSX.readFile(mProd).Sheets['Produtos'], { header: 1, defval: '' })[0];
  const stP = await (await fetch(B + '/api/state')).json();
  const f1 = stP.fornecedores[0].nome, f2 = stP.fornecedores[1].nome;
  const arqP = escrever('carga-produtos.xlsx', [
    headP,
    ['', 'Chopp Weiss Imperial 30L', 'Barril', 'Chope', '780,00', f1 + '; ' + f2, 'Sim'],
    ['', 'Chopp Session IPA 50L', 'Barril', 'Chope', '910,00', f1, 'Sim'],
    ['', 'Copo Térmico Imperial 500ml', 'Unidade', 'Acessórios', '39,90', f2, 'Sim'],
    [stP.produtos[0].codigo, stP.produtos[0].descricao, 'Barril', 'Chope', '660,00', f1, 'Sim'],
    ['', 'Produto sem fornecedor válido', 'Unidade', 'Chope', '10,00', 'Fornecedor Inexistente', 'Sim'],
  ], 'Produtos');
  await planilhaPng(arqP, 'Produtos', '10-planilha-produtos',
    'Planilha de produtos — o De/Para vem na própria carga',
    'A coluna "Fornecedores" aceita nomes ou CNPJs separados por ponto e vírgula; código em branco é gerado pela plataforma');
  await subir('produto', arqP);
  await shot('11-previa-produtos');
  await gravar(); await pg.waitForTimeout(900);
  await shot('12-resultado-produtos');

  // 13 · planilha fora do padrão
  const arqX = escrever('planilha-fora-do-padrao.xlsx', [['Coluna A', 'Coluna B'], ['x', 'y']], 'Produtos');
  await subir('produto', arqX);
  await shot('13-arquivo-invalido');
  await pg.getByText('Cancelar', { exact: true }).click(); await pg.waitForTimeout(700);

  // 14 · auditoria
  await ir('Segurança & Auditoria');
  await pg.waitForTimeout(900);
  await shot('14-auditoria');
} catch (e) { log.push('ERRO: ' + e.message); }

console.log(log.join('\n'));
await br.close();
