# Plataforma Cidade Imperial

Portal B2B da **Cervejaria Cidade Imperial** — a "Plataforma da Loja" que conecta
a Loja (dona da plataforma), seus **Fornecedores** e as **Revendas**, cobrindo o
fluxo completo de catálogo, pedidos, cotações, faturamento e royalties.

Aplicação **full-stack** em um único repositório: **PostgreSQL** + **API Node.js**
+ **web**, com persistência real e início por **um único comando**.

## Início rápido (um comando)

Pré-requisito: Docker.

```bash
docker compose up --build
```

Isso sobe o banco PostgreSQL, aplica o schema, carrega os dados iniciais, inicia
a API Node.js e serve a interface. Depois abra:

```
http://localhost:3000
```

O login aceita qualquer e-mail/senha (demonstração). Para parar: `docker compose down`.
Para zerar o banco (apagar o volume de dados): `docker compose down -v`.

## O que a plataforma faz

Aplicação de página única com **login por perfil** e três perfis de acesso:

| Perfil | Visão principal |
| --- | --- |
| **Loja Cidade Imperial** | Painel geral, aprovação de pedidos (total ou por item), cotações com fornecedores, cadastro de fornecedores/contratos, produtos homologados, revendas, faturamento, royalties, relatórios e auditoria. |
| **Fornecedor** | Pedidos recebidos, cotações convidadas, meus faturamentos e royalties devidos. |
| **Revenda** | Catálogo de produtos homologados (com carrinho), envio de pedidos para aprovação e acompanhamento dos meus pedidos. |

Todas as alterações (aprovar/rejeitar pedidos, abrir cotações, registrar
propostas, faturar, pagar royalties, cadastrar fornecedores/produtos/revendas,
trilha de auditoria, etc.) são **gravadas no PostgreSQL** e sobrevivem a
reinícios.

## Arquitetura

Monorepo com três partes:

```
docker-compose.yml        # sobe db + app com um comando
Dockerfile                # build multi-stage: compila a web e empacota a API
web/                      # interface (Claude Design + dc-runtime sobre React 18)
server/                   # API Node.js/Express + acesso ao PostgreSQL
design/                   # exportação original do Claude Design (fonte de verdade da UI)
```

### Banco de dados (`server/db/`)
- `schema.sql` — tabelas relacionais para as 10 coleções do domínio
  (fornecedores, contratos, produtos, revendas, pedidos, cotações,
  faturamentos, pagamentos, auditoria e sequências). Cada tabela tem colunas
  tipadas (para consultas/relatórios em SQL) **e** uma coluna `data` JSONB que
  guarda a entidade completa sem perdas; `ord` preserva a ordem dos itens.
- `seed.json` — dados iniciais de demonstração, carregados automaticamente
  quando o banco está vazio.

### API (`server/src/`)
- `GET  /api/health` — verificação de saúde.
- `GET  /api/state` — estado completo da aplicação (usado para hidratar a web).
- `PUT  /api/state` — grava o estado completo, de forma transacional.
- `GET  /api/:recurso` — leitura por recurso: `fornecedores`, `contratos`,
  `produtos`, `revendas`, `pedidos`, `cotacoes`, `faturamentos`, `pagamentos`,
  `auditoria`.
- Serve os arquivos estáticos da web (build de `web/`).
- Na inicialização, aguarda o banco, aplica o schema e carrega o seed se necessário.

### Web (`web/`)
- A interface do Claude Design, renderizada em tempo de execução pelo
  `dc-runtime` (`public/support.js`) sobre **React 18.3.1** (UMD, sem CDN em
  runtime). Ao carregar, hidrata o estado a partir de `GET /api/state`; após cada
  alteração, persiste em `PUT /api/state` (com debounce). Sem a API, degrada
  graciosamente para dados locais de demonstração.

## Desenvolvimento sem Docker

Requer Node.js 18+ e um PostgreSQL acessível.

```bash
# 1. Banco: crie um banco e exporte a conexão
export DATABASE_URL="postgres://usuario:senha@localhost:5432/cidadeimperial"

# 2. Web (compila para web/dist, servido pela API)
npm run build:web

# 3. Servidor (aplica schema + seed e inicia em http://localhost:3000)
npm --prefix server install
npm run start:server
```

Variáveis de ambiente aceitas pela API: `DATABASE_URL` (ou `PGHOST`, `PGPORT`,
`PGUSER`, `PGPASSWORD`, `PGDATABASE`), `PORT` (padrão 3000) e `WEB_DIST`
(diretório do build da web).

## Estrutura do projeto

```
docker-compose.yml
Dockerfile
package.json                     # scripts orquestradores (start = docker compose up)
server/
  package.json
  db/{schema.sql, seed.json}
  src/{index.js, db.js, repo.js, migrate.js}
web/
  index.html                     # app (dc) + React + hidratação/persistência via API
  vite.config.js
  public/{support.js, vendor/react*, img/}
  scripts/sync-vendor.mjs
design/
  Plataforma Cidade Imperial.dc.html   # exportação original do Claude Design
```

## Notas

- As fontes (Cinzel e Instrument Sans) vêm do Google Fonts; sem rede, a
  interface recorre às fontes do sistema.
- Toda a lógica de negócio permanece em um único lugar (a camada de
  apresentação/`dc-script`), e o PostgreSQL é o sistema de persistência — o que
  mantém a fidelidade total à tela desenhada e evita duplicação de regras.
