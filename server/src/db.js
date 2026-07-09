import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

// Two ways to run — both without Docker:
//
//  • Default: PGlite, a real PostgreSQL engine compiled to WASM that runs
//    in-process and persists to server/.pgdata. Zero setup, one command.
//  • If DATABASE_URL is set: connect to your own PostgreSQL server with the
//    standard `pg` driver.
//
// Both expose the same tiny interface (query / exec / withTx / waitReady) so the
// rest of the server does not care which one is active.

const here = dirname(fileURLToPath(import.meta.url))
const usePg = !!process.env.DATABASE_URL

let impl
export let driver

if (usePg) {
  driver = 'postgres'
  const { default: pg } = await import('pg')
  await ensureDatabaseExists(pg, process.env.DATABASE_URL)
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
  impl = {
    query: (sql, params) => pool.query(sql, params),
    exec: (sql) => pool.query(sql),
    withTx: async (fn) => {
      const client = await pool.connect()
      try {
        await client.query('BEGIN')
        const result = await fn({ query: (sql, params) => client.query(sql, params) })
        await client.query('COMMIT')
        return result
      } catch (err) {
        await client.query('ROLLBACK')
        throw err
      } finally {
        client.release()
      }
    },
    waitReady: async () => {
      for (let i = 1; i <= 30; i++) {
        try {
          await pool.query('SELECT 1')
          return
        } catch (err) {
          if (i === 30) throw err
          await new Promise((r) => setTimeout(r, 1000))
        }
      }
    },
  }
} else {
  driver = 'pglite'
  const { PGlite } = await import('@electric-sql/pglite')
  const dataDir = process.env.PGLITE_DIR || resolve(here, '../.pgdata')
  const db = new PGlite(dataDir)
  await db.waitReady
  const call = (runner, sql, params) => (params === undefined ? runner(sql) : runner(sql, params))
  impl = {
    query: (sql, params) => call((s, p) => db.query(s, p), sql, params),
    exec: (sql) => db.exec(sql),
    withTx: (fn) => db.transaction((tx) => fn({ query: (sql, params) => call((s, p) => tx.query(s, p), sql, params) })),
    waitReady: async () => db.query('SELECT 1'),
  }
}

export const query = (sql, params) => impl.query(sql, params)
export const exec = (sql) => impl.exec(sql)
export const withTx = (fn) => impl.withTx(fn)
export const waitReady = () => impl.waitReady()

// When pointing at a PostgreSQL you already have installed, the target database
// may not exist yet. Create it automatically (connecting to the maintenance
// `postgres` database with the same credentials) so `DATABASE_URL` works on the
// first run without a manual `createdb`.
async function ensureDatabaseExists(pg, url) {
  let target
  try {
    target = new URL(url)
  } catch {
    return // key=value DSN — leave it to the driver
  }
  const dbName = decodeURIComponent(target.pathname.replace(/^\//, ''))
  if (!dbName || dbName === 'postgres') return

  // Does it already exist? A plain connect tells us.
  const probe = new pg.Client({ connectionString: url })
  try {
    await probe.connect()
    await probe.end()
    return
  } catch (err) {
    try {
      await probe.end()
    } catch {}
    if (err.code !== '3D000') return // not "database does not exist" — let the pool surface it
  }

  // Create it via the maintenance database.
  const admin = new URL(url)
  admin.pathname = '/postgres'
  const client = new pg.Client({ connectionString: admin.toString() })
  try {
    await client.connect()
    await client.query(`CREATE DATABASE "${dbName.replace(/"/g, '""')}"`)
    console.log(`[db] banco "${dbName}" criado automaticamente`)
  } catch (err) {
    if (err.code === '42P04') return // already exists (race) — fine
    console.warn(`[db] não foi possível criar o banco "${dbName}" automaticamente: ${err.message}`)
    console.warn(`[db] crie manualmente, por exemplo:  createdb ${dbName}`)
  } finally {
    try {
      await client.end()
    } catch {}
  }
}
