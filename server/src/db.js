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
