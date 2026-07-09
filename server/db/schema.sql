-- Plataforma Cidade Imperial — PostgreSQL schema
--
-- Each domain collection is a real table with typed scalar columns (for SQL
-- reporting/queries) plus a lossless `data` JSONB column that holds the full
-- entity exactly as the application uses it. `ord` preserves array order so the
-- app state round-trips byte-for-byte. This keeps a single source of business
-- logic (the client) while giving a genuine relational store.

CREATE TABLE IF NOT EXISTS app_seq (
  id    INTEGER PRIMARY KEY DEFAULT 1,
  ped   INTEGER NOT NULL,
  cot   INTEGER NOT NULL,
  forn  INTEGER NOT NULL,
  prod  INTEGER NOT NULL,
  rev   INTEGER NOT NULL,
  ctr   INTEGER NOT NULL,
  nf    INTEGER NOT NULL,
  CONSTRAINT app_seq_singleton CHECK (id = 1)
);

CREATE TABLE IF NOT EXISTS fornecedores (
  id       INTEGER PRIMARY KEY,
  ord      INTEGER NOT NULL,
  nome     TEXT,
  cnpj     TEXT,
  cidade   TEXT,
  contato  TEXT,
  ativo    BOOLEAN,
  data     JSONB NOT NULL
);

CREATE TABLE IF NOT EXISTS contratos (
  id            INTEGER PRIMARY KEY,
  ord           INTEGER NOT NULL,
  fornecedor_id INTEGER,
  numero        TEXT,
  royalty       NUMERIC,
  inicio        TEXT,
  fim           TEXT,
  vigente       BOOLEAN,
  data          JSONB NOT NULL
);

CREATE TABLE IF NOT EXISTS produtos (
  id            INTEGER PRIMARY KEY,
  ord           INTEGER NOT NULL,
  codigo        TEXT,
  descricao     TEXT,
  unidade       TEXT,
  preco         NUMERIC,
  fornecedor_id INTEGER,
  ativo         BOOLEAN,
  data          JSONB NOT NULL
);

CREATE TABLE IF NOT EXISTS revendas (
  id       INTEGER PRIMARY KEY,
  ord      INTEGER NOT NULL,
  nome     TEXT,
  cnpj     TEXT,
  cidade   TEXT,
  ativo    BOOLEAN,
  email    TEXT,
  data     JSONB NOT NULL
);

CREATE TABLE IF NOT EXISTS pedidos (
  id            TEXT PRIMARY KEY,
  ord           INTEGER NOT NULL,
  revenda_id    INTEGER,
  fornecedor_id INTEGER,
  cotacao_id    TEXT,
  total         NUMERIC,
  status        TEXT,
  data_criacao  TEXT,
  data          JSONB NOT NULL
);

CREATE TABLE IF NOT EXISTS cotacoes (
  id           TEXT PRIMARY KEY,
  ord          INTEGER NOT NULL,
  pedido_id    TEXT,
  prazo        TEXT,
  status       TEXT,
  vencedor_id  INTEGER,
  data         JSONB NOT NULL
);

CREATE TABLE IF NOT EXISTS faturamentos (
  id            TEXT PRIMARY KEY,
  ord           INTEGER NOT NULL,
  pedido_id     TEXT,
  fornecedor_id INTEGER,
  revenda_id    INTEGER,
  valor         NUMERIC,
  competencia   TEXT,
  royalty_pct   NUMERIC,
  royalty_valor NUMERIC,
  data          JSONB NOT NULL
);

CREATE TABLE IF NOT EXISTS pagamentos (
  chave   TEXT PRIMARY KEY,
  status  TEXT,
  valor   NUMERIC,
  data    JSONB NOT NULL
);

CREATE TABLE IF NOT EXISTS auditoria (
  ord      INTEGER PRIMARY KEY,
  quando   TEXT,
  usuario  TEXT,
  acao     TEXT,
  detalhe  TEXT,
  data     JSONB NOT NULL
);
