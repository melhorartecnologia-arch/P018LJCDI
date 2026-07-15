// Captura as telas para o Manual do Usuário (página inteira, com menu).
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const DIR = '/home/user/P018LJCDI/docs/gerador/manual-shots'
mkdirSync(DIR, { recursive: true })
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' })
const page = await browser.newPage({ viewport: { width: 1440, height: 860 }, deviceScaleFactor: 1.5 })
const shot = async (nome) => { await page.waitForTimeout(450); await page.screenshot({ path: `${DIR}/${nome}.jpg`, type: 'jpeg', quality: 80 }); console.log('  •', nome) }
const login = async (email, senha) => {
  await page.fill('input[placeholder="voce@empresa.com.br"]', email)
  await page.fill('input[type="password"]', senha)
  await page.click('text=Entrar na plataforma'); await page.waitForTimeout(800)
}
const sair = async () => { await page.click('text=Sair'); await page.waitForTimeout(500) }
const nav = async (txt) => { await page.click(`text=${txt}`); await page.waitForTimeout(600) }

await page.goto('http://localhost:3344'); await page.waitForTimeout(1500)
await shot('login')

// LOJA
await login('ana@cidadeimperial.com.br', 'loja123')
await shot('loja-painel')
await nav('Pedidos'); await shot('loja-pedidos')
await page.click('text=PED-0045'); await page.waitForTimeout(600); await shot('loja-pedido-detalhe')
await nav('Cotações'); await shot('loja-cotacoes')
await nav('Faturamento'); await shot('loja-faturamento')
await nav('Inventário de estoque'); await shot('loja-inventario')
await nav('Fornecedores & Contratos'); await shot('loja-fornecedores')
await nav('Produtos homologados'); await shot('loja-produtos')
await nav('Revendas'); await shot('loja-revendas')
await nav('Royalties & Fechamento'); await shot('loja-royalties')
await nav('Relatórios'); await shot('loja-relatorios')
await nav('Segurança & Auditoria'); await shot('loja-auditoria')
// guia "Como usar" maximizado (na tela de royalties)
await nav('Royalties & Fechamento')
await page.click('div[title="Como usar esta tela — tutorial em vídeo e passo a passo"]')
await page.waitForSelector('text=Passo a passo', { timeout: 8000 })
await page.click('div[title^="Maximizar janela"]'); await page.waitForTimeout(400)
await page.click('text=Reproduzir guia'); await page.waitForTimeout(2600)
await shot('guia-como-usar')
await page.keyboard.press('Escape'); await page.waitForTimeout(300)
await sair()

// FORNECEDOR
await login('comercial@serraverde.com.br', 'forn123')
await shot('forn-pedidos-recebidos')
await nav('Cotações convidadas'); await shot('forn-cotacoes')
await nav('Meus faturamentos'); await shot('forn-faturamentos')
await nav('Royalties devidos'); await shot('forn-royalties')
await sair()

// REVENDA
await login('compras@bardoimperador.com.br', 'rev123')
await shot('rev-catalogo')
await nav('Meus pedidos'); await shot('rev-pedidos')
await sair()

// ADMINISTRADOR
await login('admin@cidadeimperial.com.br', 'admin123')
await nav('Usuários e permissões'); await shot('adm-usuarios')
await nav('Configuração de e-mail'); await shot('adm-email')
await nav('Análise fiscal (IA)'); await shot('adm-analise')
await browser.close()
console.log('capturas concluídas')
