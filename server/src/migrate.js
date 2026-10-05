import { readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { exec, waitReady, driver } from './db.js'
import { isEmpty, saveState, atualizarUsuario } from './repo.js'
import { config } from './config.js'
import { hashSenha, gerarSenha } from './auth.js'

const here = dirname(fileURLToPath(import.meta.url))
const dbDir = resolve(here, '../db')

// A carga inicial não traz senha nenhuma no arquivo — nada de senha conhecida
// versionada no repositório. A senha de primeiro acesso vem de
// SEED_SENHA_INICIAL ou é sorteada agora e impressa uma única vez no log; em
// qualquer caso a troca é obrigatória no primeiro acesso.
async function semearCredenciais(usuarios) {
  if (!Array.isArray(usuarios) || !usuarios.length) return
  const doAmbiente = !!config.senhaInicial
  const senha = config.senhaInicial || gerarSenha()
  for (const u of usuarios) {
    await atualizarUsuario(u.id, { senhaHash: hashSenha(senha), trocarSenha: true, bloqLogin: null })
  }
  if (doAmbiente) {
    console.log(`[migrate] senha inicial dos ${usuarios.length} usuário(s) definida por SEED_SENHA_INICIAL · troca obrigatória no primeiro acesso`)
  } else {
    console.log('[migrate] ──────────────────────────────────────────────')
    console.log(`[migrate] SENHA INICIAL (${usuarios.length} usuário(s)): ${senha}`)
    console.log('[migrate] anote agora — não será exibida de novo. A troca é')
    console.log('[migrate] obrigatória no primeiro acesso de cada usuário.')
    console.log('[migrate] ──────────────────────────────────────────────')
  }
}

export async function migrate() {
  await waitReady()
  console.log(`[migrate] banco: ${driver}`)

  const schema = await readFile(resolve(dbDir, 'schema.sql'), 'utf8')
  await exec(schema)
  console.log('[migrate] schema aplicado')

  if (!config.dbSeed) {
    console.log('[migrate] seed desativado (DB_SEED=false)')
  } else if (await isEmpty()) {
    const seed = JSON.parse(await readFile(resolve(dbDir, 'seed.json'), 'utf8'))
    await saveState(seed)
    await semearCredenciais(seed.usuarios)
    console.log('[migrate] dados iniciais carregados')
  } else {
    console.log('[migrate] dados existentes encontrados — seed ignorado')
    // Banco criado antes do módulo de usuários: semeia só os usuários iniciais
    // para que o login continue possível.
    const { query } = await import('./db.js')
    const nu = await query('SELECT COUNT(*)::int AS n FROM usuarios')
    if (nu.rows[0].n === 0) {
      const seed = JSON.parse(await readFile(resolve(dbDir, 'seed.json'), 'utf8'))
      if (Array.isArray(seed.usuarios) && seed.usuarios.length) {
        await saveState({ usuarios: seed.usuarios })
        await semearCredenciais(seed.usuarios)
        console.log('[migrate] usuários iniciais semeados em banco existente')
      }
    }
    // Idem para as categorias do catálogo, criadas depois dos primeiros bancos.
    const nc = await query('SELECT COUNT(*)::int AS n FROM categorias')
    if (nc.rows[0].n === 0) {
      const seed = JSON.parse(await readFile(resolve(dbDir, 'seed.json'), 'utf8'))
      if (Array.isArray(seed.categorias) && seed.categorias.length) {
        await saveState({ categorias: seed.categorias })
        console.log('[migrate] categorias iniciais semeadas em banco existente')
      }
    }
  }
}

// Allow running standalone: `node src/migrate.js`
if (import.meta.url === `file://${process.argv[1]}`) {
  migrate()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[migrate] falhou:', err)
      process.exit(1)
    })
}
