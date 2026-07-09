import { readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { pool } from './db.js'
import { isEmpty, saveState } from './repo.js'

const here = dirname(fileURLToPath(import.meta.url))
const dbDir = resolve(here, '../db')

// Waits for Postgres to accept connections (compose starts db and app together).
async function waitForDb(retries = 30, delayMs = 1000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await pool.query('SELECT 1')
      return
    } catch (err) {
      if (attempt === retries) throw err
      process.stdout.write(`[migrate] waiting for database (${attempt}/${retries})…\n`)
      await new Promise((r) => setTimeout(r, delayMs))
    }
  }
}

export async function migrate() {
  await waitForDb()

  const schema = await readFile(resolve(dbDir, 'schema.sql'), 'utf8')
  await pool.query(schema)
  console.log('[migrate] schema applied')

  if (await isEmpty()) {
    const seed = JSON.parse(await readFile(resolve(dbDir, 'seed.json'), 'utf8'))
    await saveState(seed)
    console.log('[migrate] seed data loaded')
  } else {
    console.log('[migrate] existing data found — skipping seed')
  }
}

// Allow running standalone: `node src/migrate.js`
if (import.meta.url === `file://${process.argv[1]}`) {
  migrate()
    .then(() => pool.end())
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[migrate] failed:', err)
      process.exit(1)
    })
}
