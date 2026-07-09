# Plataforma Cidade Imperial

Portal B2B da **Cervejaria Cidade Imperial** — a "Plataforma da Loja" que conecta
a Loja (dona da plataforma), seus **Fornecedores** e as **Revendas**, cobrindo o
fluxo completo de catálogo, pedidos, cotações, faturamento e royalties.

Aplicação **full-stack** em um único repositório: **PostgreSQL** + **API Node.js**
+ **web**, com persistência real e início por **um único comando — sem Docker**.

## Início rápido (um comando, sem Docker)

Pré-requisito: apenas **Node.js 18+**.

```bash
npm start
```

Isso instala as dependências (só na primeira vez), compila a interface, inicia a
API Node.js e sobe um **PostgreSQL embutido** (PGlite) que grava os dados em
`server/.pgdata`. Nenhum banco externo, nenhum container. Depois abra:

```
http://localhost:3000
```

O login aceita qualquer e-mail/senha (demonstração). Para parar: `Ctrl+C`.
Para zerar os dados: apague a pasta `server/.pgdata`.

## Passo a passo no Windows

1. **Instale o Node.js** (versão LTS): https://nodejs.org → baixe o instalador
   "LTS" para Windows e conclua a instalação (deixe as opções padrão).
2. **Baixe o projeto** (uma das opções):
   - Com Git: abra o **PowerShell** e rode
     ```powershell
     git clone https://github.com/melhorartecnologia-arch/p018ljcdi.git
     cd p018ljcdi
     git checkout claude/plataforma-cidade-imperial-dmxbmw
     ```
   - Sem Git: no GitHub, troque para o branch
     `claude/plataforma-cidade-imperial-dmxbmw`, clique em **Code → Download ZIP**,
     extraia e abra a pasta.
3. **Abra o PowerShell na pasta do projeto** (na pasta, clique com o botão
   direito → "Abrir no Terminal", ou rode `cd caminho\da\pasta`).
4. **Inicie tudo com um comando:**
   ```powershell
   npm start
   ```
   Na primeira vez ele baixa as dependências e compila a interface (pode levar
   alguns minutos); nas próximas é rápido. Não precisa instalar banco de dados —
   já vem um PostgreSQL embutido.
5. **Abra no navegador:** http://localhost:3000 — entre com qualquer e-mail e senha.
6. **Para parar:** volte ao PowerShell e pressione `Ctrl+C`.

Usar o PostgreSQL que você já tem no Windows (opcional) — no PowerShell:

```powershell
$env:DATABASE_URL = "postgres://postgres:SUA_SENHA@localhost:5432/cidadeimperial"
npm start
```

(Para voltar ao banco embutido, feche e abra um novo PowerShell, ou rode
`Remove-Item Env:DATABASE_URL`.)

### Usar o seu próprio PostgreSQL (opcional)

Se você já tem um servidor PostgreSQL instalado (no mesmo servidor ou na nuvem),
defina `DATABASE_URL` — a aplicação usa o driver `pg` e não sobe o banco embutido:

```bash
DATABASE_URL="postgres://usuario:senha@localhost:5432/cidadeimperial" npm start
```

Se o banco indicado ainda não existir, a aplicação **cria automaticamente** na
primeira execução (desde que o usuário informado tenha permissão para criar
bancos); em seguida aplica o schema e carrega os dados iniciais. Caso não tenha
permissão, crie o banco antes: `createdb cidadeimperial`. O schema e o seed são
aplicados sempre de forma idempotente (o seed só entra se o banco estiver vazio).

### Docker (opcional)

Também há suporte a Docker para quem quiser, mas **não é necessário**:
`npm run docker` (equivale a `docker compose up --build`).

## Configuração (variáveis de ambiente)

Toda a configuração vem de **variáveis de ambiente**. Você pode defini-las no
ambiente do sistema ou em um arquivo **`.env`** na raiz do projeto. Comece a
partir do modelo:

```bash
cp .env.example .env      # (no Windows/PowerShell: Copy-Item .env.example .env)
```

Variáveis definidas diretamente no ambiente têm prioridade sobre o `.env`. Todas
têm um padrão sensato — sem nenhuma configuração, a aplicação roda com o banco
embutido na porta 3000.

| Variável | Padrão | Descrição |
| --- | --- | --- |
| `PORT` | `3000` | Porta HTTP. |
| `HOST` | `0.0.0.0` | Interface de rede (`127.0.0.1` = só local). |
| `JSON_BODY_LIMIT` | `8mb` | Tamanho máximo do corpo JSON. |
| `PUBLIC_URL` | — | URL pública, apenas para mensagens de log. |
| `WEB_DIST` | auto | Pasta do build da web servido pela API. |
| `DB_DRIVER` | `auto` | `auto` \| `pglite` \| `postgres`. |
| `PGLITE_DIR` | `server/.pgdata` | Pasta de dados do PostgreSQL embutido. |
| `DATABASE_URL` | — | Conexão com um PostgreSQL externo (tem prioridade). |
| `PGHOST` `PGPORT` `PGUSER` `PGPASSWORD` `PGDATABASE` | — | Alternativa ao `DATABASE_URL` (montam a conexão). |
| `PGSSL` | `false` | Ativa TLS/SSL (bancos gerenciados). |
| `DB_AUTO_CREATE` | `true` | Cria o banco automaticamente se não existir. |
| `DB_SEED` | `true` | Carrega os dados iniciais quando o banco está vazio. |

O arquivo `.env` **não é versionado** (contém segredos); o `.env.example` fica no
repositório como referência.

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

**Ajuda em cada rotina:** no topo da tela há o botão **"Como usar"** (com ícone
de vídeo), presente em todas as rotinas. Ele abre um guia no estilo *tutorial em
vídeo* — com um passo a passo que avança sozinho ao clicar em "Reproduzir" — e a
lista de passos em texto e dicas, tudo específico da tela em que você está.

## Arquitetura

Monorepo com três partes:

```
docker-compose.yml        # sobe db + app com um comando
Dockerfile                # build multi-stage: compila a web e empacota a API
web/                      # interface (Claude Design + dc-runtime sobre React 18)
server/                   # API Node.js/Express + acesso ao PostgreSQL
design/                   # exportação original do Claude Design (fonte de verdade da UI)
```

### Banco de dados
- Por padrão, **PGlite** — o motor do PostgreSQL compilado para WASM, rodando
  no próprio processo Node e gravando em `server/.pgdata`. É PostgreSQL de
  verdade (JSONB, transações, etc.), sem servidor separado, sem container.
- Com `DATABASE_URL` definida, conecta a um **servidor PostgreSQL** externo via
  driver `pg`.
- `server/db/schema.sql` — tabelas relacionais para as 10 coleções do domínio
  (fornecedores, contratos, produtos, revendas, pedidos, cotações,
  faturamentos, pagamentos, auditoria e sequências). Cada tabela tem colunas
  tipadas (para consultas/relatórios em SQL) **e** uma coluna `data` JSONB que
  guarda a entidade completa sem perdas; `ord` preserva a ordem dos itens.
- `server/db/seed.json` — dados iniciais de demonstração, carregados
  automaticamente quando o banco está vazio.

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

## Desenvolvimento

O comando único (`npm start`) já cobre o fluxo completo. Para rodar as partes
separadamente:

```bash
npm run build:web       # instala e compila a web em web/dist
npm run start:server    # inicia a API em http://localhost:3000 (PGlite por padrão)
```

Todas as opções são configuráveis por variáveis de ambiente / `.env` — veja a
seção **Configuração (variáveis de ambiente)** acima.

## Estrutura do projeto

```
package.json                     # scripts orquestradores (start = sobe tudo, sem Docker)
scripts/start.mjs                # launcher de um comando (instala, compila, inicia)
docker-compose.yml               # opcional
Dockerfile                       # opcional
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
