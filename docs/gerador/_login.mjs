// Login das capturas de evidência.
//
// A tela de login de produção não tem mais atalhos de demonstração: entra-se
// com e-mail e senha, e a senha inicial exige troca no primeiro acesso. Este
// módulo concentra esse caminho para que os scripts de captura continuem
// chamando `entrar('Loja (Ana Ribeiro)')` como antes.
//
// A senha inicial da base é a definida em SEED_SENHA_INICIAL ao subir o
// servidor; na primeira entrada de cada usuário a captura já troca por SENHA.
export const CONTAS = {
  'Administrador Técnico': 'admin@cidadeimperial.com.br',
  'Loja (Ana Ribeiro)': 'ana@cidadeimperial.com.br',
  'Loja · analista sem permissão de receber': 'carlos@cidadeimperial.com.br',
  'Fornecedor (Serra Verde)': 'comercial@serraverde.com.br',
  'Revenda (Bar do Imperador)': 'compras@bardoimperador.com.br',
}

export const SENHA_INICIAL = process.env.SEED_SENHA_INICIAL || 'Pl4taforma#Teste'
export const SENHA = process.env.EVID_SENHA || 'Evid#Pl4ta2026'

export function criarLogin(pg, B) {
  const naLogin = async () => (await pg.getByText('Entrar na plataforma', { exact: true }).count()) > 0
  const submeter = async (email, senha) => {
    await pg.getByPlaceholder('voce@empresa.com.br').first().fill(email)
    await pg.locator('input[type=password]').first().fill(senha)
    await pg.getByText('Entrar na plataforma', { exact: true }).click()
    await pg.waitForTimeout(2400)
  }
  const trocarSeExigido = async () => {
    if (!(await pg.getByText('Salvar e entrar', { exact: true }).count())) return
    const ps = pg.locator('input[type=password]')
    await ps.nth(0).fill(SENHA); await ps.nth(1).fill(SENHA)
    await pg.getByText('Salvar e entrar', { exact: true }).click()
    await pg.waitForTimeout(3000)
  }
  const entrar = async (rotulo) => {
    const email = CONTAS[rotulo] || rotulo
    await pg.goto(B, { waitUntil: 'networkidle' }); await pg.waitForTimeout(1500)
    await submeter(email, SENHA)
    // primeira entrada nesta base: a senha ainda é a inicial e a troca é obrigatória
    if (await naLogin()) await submeter(email, SENHA_INICIAL)
    await trocarSeExigido()
  }
  return { entrar, submeter, trocarSeExigido, naLogin }
}
