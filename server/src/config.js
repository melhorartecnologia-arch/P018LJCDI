// Configuração central da aplicação — TUDO vem de variáveis de ambiente.
// Os valores podem ser definidos no ambiente do sistema ou em um arquivo `.env`
// na raiz do projeto (veja `.env.example`). Variáveis já presentes no ambiente
// têm prioridade sobre o `.env`.
import { config as loadEnv } from 'dotenv'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const serverRoot = resolve(here, '..')
const projectRoot = resolve(serverRoot, '..')

// Carrega .env da raiz do projeto e, se existir, um .env dentro de server/.
// dotenv não sobrescreve variáveis já definidas no ambiente.
loadEnv({ path: resolve(projectRoot, '.env'), quiet: true })
loadEnv({ path: resolve(serverRoot, '.env'), quiet: true })

// Resolve um caminho de config: absoluto é usado como está; relativo é
// interpretado a partir da raiz do projeto (independe do diretório atual).
const resolvePath = (v) => (v ? resolve(projectRoot, v) : v)

const bool = (v, def) => (v == null || v === '' ? def : /^(1|true|yes|on|sim)$/i.test(String(v)))
const str = (v, def) => (v == null || v === '' ? def : String(v))
const int = (v, def) => (v == null || v === '' || isNaN(Number(v)) ? def : Number(v))

// ---- Banco de dados ----
const DB_DRIVER = str(process.env.DB_DRIVER, 'auto').toLowerCase() // auto | pglite | postgres

// Conexão PostgreSQL: DATABASE_URL tem prioridade; senão, monta a partir das
// variáveis padrão PG* se alguma delas estiver definida.
const discreteKeys = ['PGHOST', 'PGPORT', 'PGUSER', 'PGPASSWORD', 'PGDATABASE']
const hasDiscrete = discreteKeys.some((k) => process.env[k])
let databaseUrl = str(process.env.DATABASE_URL, null)
if (!databaseUrl && hasDiscrete) {
  const host = str(process.env.PGHOST, 'localhost')
  const port = str(process.env.PGPORT, '5432')
  const user = str(process.env.PGUSER, 'postgres')
  const pass = str(process.env.PGPASSWORD, '')
  const name = str(process.env.PGDATABASE, 'cidadeimperial')
  const auth = pass ? `${encodeURIComponent(user)}:${encodeURIComponent(pass)}` : encodeURIComponent(user)
  databaseUrl = `postgres://${auth}@${host}:${port}/${encodeURIComponent(name)}`
}

let usePg
if (DB_DRIVER === 'pglite') usePg = false
else if (DB_DRIVER === 'postgres') {
  usePg = true
  if (!databaseUrl) databaseUrl = 'postgres://postgres@localhost:5432/cidadeimperial'
} else usePg = !!databaseUrl // auto

export const config = {
  // Servidor HTTP
  port: int(process.env.PORT, 3000),
  host: str(process.env.HOST, '0.0.0.0'),
  jsonBodyLimit: str(process.env.JSON_BODY_LIMIT, '8mb'),
  publicUrl: str(process.env.PUBLIC_URL, null), // usado só para logs amigáveis

  // HTTPS nativo (sem proxy): defina o par de arquivos do certificado.
  // Com ambos definidos, a aplicação serve TLS em HTTPS_PORT e redireciona o
  // HTTP da PORT para o HTTPS (desligável com HTTPS_REDIRECT_HTTP=false).
  httpsCert: resolvePath(str(process.env.HTTPS_CERT, null)),
  httpsKey: resolvePath(str(process.env.HTTPS_KEY, null)),
  httpsPort: int(process.env.HTTPS_PORT, 443),
  httpsRedirect: bool(process.env.HTTPS_REDIRECT_HTTP, true),

  // Web (build servido pela API); null = detecção automática
  webDist: resolvePath(str(process.env.WEB_DIST, null)),

  // Banco
  usePg,
  databaseUrl,
  pgSsl: bool(process.env.PGSSL, false),
  pgliteDir: resolvePath(str(process.env.PGLITE_DIR, resolve(serverRoot, '.pgdata'))),
  dbAutoCreate: bool(process.env.DB_AUTO_CREATE, true),
  dbSeed: bool(process.env.DB_SEED, true),

  paths: { serverRoot, projectRoot },
}
