import { readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { exec, waitReady, driver } from './db.js'
import { isEmpty, saveState } from './repo.js'
import { config } from './config.js'

const here = dirname(fileURLToPath(import.meta.url))
const dbDir = resolve(here, '../db')

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
        console.log('[migrate] usuários iniciais semeados em banco existente')
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
