import { query, withTx } from './db.js'

// The 10 persistent collections that make up the application state.
// For each array collection we describe how to derive the typed scalar columns
// from the full entity object; the entity itself is always stored losslessly in
// the `data` JSONB column and is what we read back.

const ARRAY_TABLES = [
  {
    name: 'fornecedores',
    columns: ['id', 'ord', 'nome', 'cnpj', 'cidade', 'contato', 'ativo', 'data'],
    row: (o, i) => [o.id, i, o.nome, o.cnpj, o.cidade, o.contato, o.ativo, o],
  },
  {
    name: 'contratos',
    columns: ['id', 'ord', 'fornecedor_id', 'numero', 'royalty', 'inicio', 'fim', 'vigente', 'data'],
    row: (o, i) => [o.id, i, o.fornecedorId, o.numero, o.royalty, o.inicio, o.fim, o.vigente, o],
  },
  {
    name: 'produtos',
    columns: ['id', 'ord', 'codigo', 'descricao', 'unidade', 'preco', 'fornecedor_id', 'ativo', 'data'],
    row: (o, i) => [o.id, i, o.codigo, o.descricao, o.unidade, o.preco, o.fornecedorId, o.ativo, o],
  },
  {
    name: 'revendas',
    columns: ['id', 'ord', 'nome', 'cnpj', 'cidade', 'ativo', 'email', 'data'],
    row: (o, i) => [o.id, i, o.nome, o.cnpj, o.cidade, o.ativo, o.email, o],
  },
  {
    name: 'pedidos',
    columns: ['id', 'ord', 'revenda_id', 'fornecedor_id', 'cotacao_id', 'total', 'status', 'data_criacao', 'data'],
    row: (o, i) => [o.id, i, o.revendaId, o.fornecedorId, o.cotacaoId, o.total, o.status, o.data, o],
  },
  {
    name: 'cotacoes',
    columns: ['id', 'ord', 'pedido_id', 'prazo', 'status', 'vencedor_id', 'data'],
    row: (o, i) => [o.id, i, o.pedidoId, o.prazo, o.status, o.vencedorId, o],
  },
  {
    name: 'faturamentos',
    columns: ['id', 'ord', 'pedido_id', 'fornecedor_id', 'revenda_id', 'valor', 'competencia', 'royalty_pct', 'royalty_valor', 'data'],
    row: (o, i) => [o.id, i, o.pedidoId, o.fornecedorId, o.revendaId, o.valor, o.competencia, o.royaltyPct, o.royaltyValor, o],
  },
  {
    name: 'inventarios',
    columns: ['id', 'ord', 'data_lanc', 'usuario', 'data'],
    row: (o, i) => [o.id, i, o.data, o.usuario, o],
  },
  {
    name: 'usuarios',
    columns: ['id', 'ord', 'nome', 'email', 'papel', 'ativo', 'data'],
    row: (o, i) => [o.id, i, o.nome, o.email, o.papel, o.ativo, o],
  },
  {
    name: 'categorias',
    columns: ['id', 'ord', 'nome', 'ativo', 'data'],
    row: (o, i) => [o.id, i, o.nome, o.ativo, o],
  },
]

const ARRAY_KEYS = ARRAY_TABLES.map((t) => t.name)

function insertSql(table, columns) {
  const cols = columns.join(', ')
  const params = columns.map((_, i) => `$${i + 1}`).join(', ')
  return `INSERT INTO ${table} (${cols}) VALUES (${params})`
}

// ---- Read the whole application state back into the shape the client uses ----
export async function loadState() {
  const state = {}

  const seq = await query('SELECT ped, cot, forn, prod, rev, ctr, nf FROM app_seq WHERE id = 1')
  state.seq = seq.rows[0] || { ped: 1, cot: 1, forn: 1, prod: 1, rev: 1, ctr: 1, nf: 1 }

  for (const key of ARRAY_KEYS) {
    const res = await query(`SELECT data FROM ${key} ORDER BY ord`)
    state[key] = res.rows.map((r) => r.data)
  }

  const pg = await query('SELECT chave, data FROM pagamentos')
  state.pagamentos = {}
  for (const r of pg.rows) state.pagamentos[r.chave] = r.data

  const aud = await query('SELECT data FROM auditoria ORDER BY ord')
  state.auditoria = aud.rows.map((r) => r.data)

  // Configuração de e-mail (SMTP) — só inclui se já existir uma linha, para não
  // sobrescrever os padrões do cliente na primeira carga.
  const ce = await query('SELECT data FROM config_email WHERE id = 1')
  if (ce.rows[0]) state.configEmail = ce.rows[0].data

  // Configurações gerais da plataforma (flags administrativas) — idem.
  const cp = await query('SELECT data FROM config_plataforma WHERE id = 1')
  if (cp.rows[0]) state.configPlataforma = cp.rows[0].data

  return state
}

// ---- Replace the whole application state transactionally ----
export async function saveState(state) {
  await withTx(async (client) => {
    if (state.seq) {
      const s = state.seq
      await client.query(
        `INSERT INTO app_seq (id, ped, cot, forn, prod, rev, ctr, nf)
         VALUES (1, $1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (id) DO UPDATE SET
           ped = EXCLUDED.ped, cot = EXCLUDED.cot, forn = EXCLUDED.forn,
           prod = EXCLUDED.prod, rev = EXCLUDED.rev, ctr = EXCLUDED.ctr, nf = EXCLUDED.nf`,
        [s.ped, s.cot, s.forn, s.prod, s.rev, s.ctr, s.nf]
      )
    }

    for (const t of ARRAY_TABLES) {
      const list = state[t.name]
      if (!Array.isArray(list)) continue
      await client.query(`DELETE FROM ${t.name}`)
      const sql = insertSql(t.name, t.columns)
      for (let i = 0; i < list.length; i++) {
        await client.query(sql, t.row(list[i], i))
      }
    }

    if (state.pagamentos && typeof state.pagamentos === 'object') {
      await client.query('DELETE FROM pagamentos')
      const sql = insertSql('pagamentos', ['chave', 'status', 'valor', 'data'])
      for (const [chave, v] of Object.entries(state.pagamentos)) {
        await client.query(sql, [chave, v && v.status, v && v.valor != null ? v.valor : null, v])
      }
    }

    if (Array.isArray(state.auditoria)) {
      await client.query('DELETE FROM auditoria')
      const sql = insertSql('auditoria', ['ord', 'quando', 'usuario', 'acao', 'detalhe', 'data'])
      for (let i = 0; i < state.auditoria.length; i++) {
        const a = state.auditoria[i]
        await client.query(sql, [i, a.quando, a.usuario, a.acao, a.detalhe, a])
      }
    }

    if (state.configEmail && typeof state.configEmail === 'object') {
      await client.query(
        `INSERT INTO config_email (id, data) VALUES (1, $1)
         ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data`,
        [state.configEmail]
      )
    }

    if (state.configPlataforma && typeof state.configPlataforma === 'object') {
      await client.query(
        `INSERT INTO config_plataforma (id, data) VALUES (1, $1)
         ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data`,
        [state.configPlataforma]
      )
    }
  })
}

// Configuração de e-mail atual (usada pelo envio via SMTP quando o cliente não
// manda a config no corpo da requisição).
export async function loadConfigEmail() {
  const res = await query('SELECT data FROM config_email WHERE id = 1')
  return res.rows[0] ? res.rows[0].data : null
}

export async function loadConfigPlataforma() {
  const res = await query('SELECT data FROM config_plataforma WHERE id = 1')
  return res.rows[0] ? res.rows[0].data : null
}

// ---- Anexos (documentos fiscais do faturamento) ----
// Gravados uma única vez (imutáveis) e lidos por id; `dados` é base64.
export async function saveAnexo({ id, nome, tipo, tamanho, criadoEm, dados }) {
  await query(
    `INSERT INTO anexos (id, nome, tipo, tamanho, criado_em, dados)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (id) DO NOTHING`,
    [id, nome, tipo, tamanho, criadoEm, dados]
  )
}

export async function loadAnexo(id) {
  const res = await query('SELECT id, nome, tipo, tamanho, criado_em, dados FROM anexos WHERE id = $1', [id])
  return res.rows[0] || null
}

export async function isEmpty() {
  const res = await query('SELECT COUNT(*)::int AS n FROM fornecedores')
  return res.rows[0].n === 0
}

// Single collection reads for the REST resource endpoints.
export async function loadCollection(key) {
  if (key === 'auditoria') {
    const res = await query('SELECT data FROM auditoria ORDER BY ord')
    return res.rows.map((r) => r.data)
  }
  if (key === 'pagamentos') {
    const res = await query('SELECT chave, data FROM pagamentos')
    const out = {}
    for (const r of res.rows) out[r.chave] = r.data
    return out
  }
  if (!ARRAY_KEYS.includes(key)) return null
  const res = await query(`SELECT data FROM ${key} ORDER BY ord`)
  return res.rows.map((r) => r.data)
}

export const COLLECTION_KEYS = [...ARRAY_KEYS, 'pagamentos', 'auditoria']
