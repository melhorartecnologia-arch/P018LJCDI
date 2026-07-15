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

Entre com um dos acessos de demonstração listados na tela de login (ex.:
`admin@cidadeimperial.com.br` / `admin123`). Para parar: `Ctrl+C`.
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
5. **Abra no navegador:** http://localhost:3000 — entre com um dos acessos de
   demonstração listados na própria tela de login (ex.: `admin@cidadeimperial.com.br` / `admin123`).
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

## Produção em VPS Ubuntu (sem Docker, com PM2)

Guia completo em **[`docs/deploy-vps-ubuntu.md`](docs/deploy-vps-ubuntu.md)** —
passo a passo para rodar de forma integral numa VPS Ubuntu com o processo
gerenciado pelo **PM2** (reinício automático + boot) e o **PostgreSQL no mesmo
servidor**, além de Nginx com HTTPS, firewall, atualização e backup. Resumo:

```bash
# Node 22 LTS + PostgreSQL local + usuário/banco criados (ver guia), então:
cd /var/www/cidadeimperial
cp .env.example .env    # defina DATABASE_URL=postgres://...@localhost:5432/cidadeimperial
npm --prefix server install --omit=dev
npm --prefix web install && npm --prefix web run build
sudo npm install -g pm2
pm2 start ecosystem.config.cjs && pm2 save && pm2 startup systemd
```

O arquivo **`ecosystem.config.cjs`** (raiz do repositório) já traz a
configuração do PM2 — 1 instância em modo fork (obrigatório: a persistência do
estado é transacional e não deve rodar em cluster), reinício automático e logs
em `logs/`.

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
| `ANTHROPIC_API_KEY` | — | Chave da API Anthropic: liga a análise do documento fiscal por IA Claude (sem ela, usa o analisador local). |

O arquivo `.env` **não é versionado** (contém segredos); o `.env.example` fica no
repositório como referência.

## O que a plataforma faz

Aplicação de página única com **login real por usuário** (e-mail e senha) e
quatro perfis de acesso — **Administrador Técnico**, **Loja**, **Fornecedor** e
**Revenda** — com **permissionamento de granularidade fina**: cada perfil tem um
conjunto padrão de permissões e o administrador pode conceder ou negar qualquer
permissão individualmente por usuário (ex.: um analista da Loja que vê pedidos
mas não aprova). Usuários de Fornecedor/Revenda ficam travados no seu vínculo.

Acessos de demonstração (semeados no banco): `admin@cidadeimperial.com.br` /
`admin123` (Administrador Técnico), `ana@cidadeimperial.com.br` / `loja123`,
`carlos@cidadeimperial.com.br` / `loja123` (analista com permissões
personalizadas), `comercial@serraverde.com.br` / `forn123` e
`compras@bardoimperador.com.br` / `rev123`. A tela de login lista esses acessos.

A gestão fica em **Configurações Técnicas › Usuários e permissões**
(Administrador Técnico): criar/editar usuários, definir perfil e vínculo,
redefinir senha, inativar/reativar e abrir o **editor de permissões** por
usuário (interruptor permitir/negar por chave, com indicação de
"padrão do perfil" × "personalizada" e restauração ao padrão). Todas as
alterações vão para a trilha de auditoria. As senhas são guardadas como hash
(não reversível); para produção real recomenda-se autenticação no servidor
com bcrypt/argon2.

Perfis de acesso:

| Perfil | Visão principal |
| --- | --- |
| **Loja Cidade Imperial** | Painel geral, aprovação de pedidos (total ou por item), cotações com fornecedores, cadastro de fornecedores/contratos, produtos homologados, revendas, faturamento, royalties, relatórios e painéis gerenciais (filtros por competência/revenda/fornecedor/status, KPIs, gráficos, rankings, funil, desempenho por parceiro e exportação CSV) e auditoria. |
| **Fornecedor** | Pedidos recebidos, cotações convidadas, meus faturamentos e royalties devidos. |
| **Revenda** | Catálogo de produtos homologados (com carrinho), envio de pedidos para aprovação e acompanhamento dos meus pedidos. |

**Atendimento por item e por quantidade:** cada item de um pedido pode seguir um
dos três caminhos — estoque da Loja, envio direto a um fornecedor ou cotação — e
também pode ser **fracionado por quantidade**: nas janelas de atendimento, o campo
"Quantidade neste caminho" permite alocar parte das unidades de um item a um
caminho; o saldo permanece aprovado para seguir outro (ex.: de 10 unidades,
4 pelo estoque, 3 direto e 3 em cotação, no mesmo pedido).

**Inventário de estoque com alertas nos pedidos:** em **Operação › Inventário de
estoque**, a Loja lança contagens por produto em datas de lançamento. O saldo
(contagem do último inventário − atendimentos "com estoque" desde então) gera
**alertas automáticos**: na lista de pedidos pendentes (◈ "Estoque cobre os
itens" / "parcialmente" / "Sem saldo"), no painel "Disponibilidade em estoque"
do detalhe do pedido (solicitado × saldo por item), nas janelas de atendimento
(saldo por item) e no e-mail de novo pedido à Loja — dando ao aprovador a
informação para decidir como atender as quantidades.

O inventário também pode ser feito por **carga de planilha padrão em Excel
(.xlsx nativo)**: baixe
o modelo — **todos os produtos** (quantidades em branco, com a data escolhida no
download; padrão: hoje), **produtos do último inventário** (pré-preenchidos) ou
**somente cabeçalho** — preencha no Excel e carregue; a janela de lançamento abre
preenchida para revisão antes de confirmar. O upload aceita .xlsx (recomendado)
e CSV; a geração/leitura usa a biblioteca SheetJS vendorizada localmente (sem CDN).

Todas as alterações (aprovar/rejeitar pedidos, abrir cotações, registrar
propostas, faturar, pagar royalties, cadastrar fornecedores/produtos/revendas,
trilha de auditoria, etc.) são **gravadas no PostgreSQL** e sobrevivem a
reinícios.

**Ajuda em cada rotina:** no topo da tela há o botão **"Como usar"** (com ícone
de vídeo), presente em todas as rotinas. Ele abre um *tutorial em vídeo* que
**mostra as imagens reais daquela tela** e as percorre automaticamente ao clicar
em "Reproduzir" (como uma gravação de tela): a cada passo, a "câmera" enquadra e
**destaca o elemento correspondente** (botão, campo ou filtro) com um realce que
pulsa e escurece o restante, junto com a legenda do passo. Abaixo ficam o passo a
passo em texto e as dicas — tudo específico da rotina em que você está. As
imagens ficam em `web/public/ajuda/` (uma por rotina) e as posições dos destaques
são medidas automaticamente na captura das telas.

**Configurações Técnicas › Configuração de e-mail (SMTP):** no perfil da Loja
(administrador) há a seção **Configurações Técnicas** com a tela **Configuração
de e-mail**, onde se gerenciam todos os parâmetros de envio por SMTP (servidor,
porta, segurança, usuário/senha, remetente, "responder para" e o e-mail interno
da Loja). Os dados ficam gravados no banco; a tela permite **Salvar**,
**Verificar conexão** e **Enviar e-mail de teste** — o envio é feito de verdade
pelo servidor Node.js via `nodemailer`.

Com o envio **ativado**, a plataforma dispara **e-mails automáticos com modelo
próprio para cada caso de uso** em todos os fluxos — para revendas, fornecedores
e para o e-mail interno da Loja:

- **Pedidos:** criado (aviso à Loja + confirmação à revenda), aprovado, item
  aprovado, rejeitado, item rejeitado, encaminhado a fornecedor, atendido pelo
  estoque.
- **Cotações:** convite ao fornecedor, lembrete, nova proposta (à Loja),
  proposta vencedora, item adjudicado, cotação cancelada.
- **Faturamento:** aviso à revenda e à Loja (com nota fiscal e royalty).
- **Royalties:** cobrança emitida e pagamento registrado (ao fornecedor).

Endpoints: `POST /api/email/verify`, `POST /api/email/test` e
`POST /api/email/notify` (usado pelos fluxos; só envia se a config estiver
ativa). Os modelos ficam em `server/src/email-templates.js`.

### Documento fiscal obrigatório e análise por IA no faturamento

Ao **registrar um faturamento**, o fornecedor é **obrigado a anexar o documento
fiscal** emitido para a revenda — o **PDF** ou o **XML da NF-e** (até 5 MB). O
anexo fica gravado no banco (tabela `anexos`) e pode ser baixado pelo link
"📎 documento fiscal" nas telas de Faturamento da Loja e do fornecedor.

Antes de aceitar o registro, a plataforma pode **analisar o documento** para
verificar se ele de fato se refere ao pedido faturado — emitente (fornecedor),
destinatário (revenda), itens e valor total — **aceitando ou recusando o anexo
como evidência na hora** (o motivo aparece na própria janela). O resultado
(aceito/recusado, motivo, motor e data) fica no faturamento e na auditoria.

- **Motor IA Claude:** com `ANTHROPIC_API_KEY` configurada no servidor, a
  análise é feita pelo modelo `claude-opus-4-8` da Anthropic (PDF analisado
  nativamente; XML como texto).
- **Analisador local:** sem a chave, o servidor extrai os dados do XML da NF-e
  (ou o texto do PDF) e confere contra o pedido, sem depender de serviços
  externos.

O recurso é controlado por um **flag do administrador** em **Configurações
Técnicas › Análise fiscal (IA)** — desabilitado, o anexo continua obrigatório,
mas é aceito sem verificação. Endpoints: `POST /api/anexos`,
`GET /api/anexos/:id`, `POST /api/faturamento/analisar` e
`GET /api/analise-fiscal/status`. A lógica fica em
`server/src/analise-fiscal.js`.

### Royalties & Fechamento mensal (RF36–RF41)

O royalty de cada faturamento é calculado automaticamente (valor faturado ×
percentual do contrato vigente — RF36) e consolidado por fornecedor e
competência no fechamento mensal (RF37), com totais do período, extrato nota a
nota e barra de recebimento (RF38). A tela tem KPIs (a receber, recebido, em
atraso e próximo vencimento), filtros por competência/fornecedor/status e
**exportação XLSX** do recorte filtrado (permissão `royalties.exportar`).

A **cobrança** (RF39) gera um documento numerado (COB-AAAAMM-NN) com
**vencimento definido pela Loja** na emissão (sugerido o dia 10 do mês
seguinte) e notifica o fornecedor por e-mail com valor, documento e prazo. O
**status** (RF41) é derivado automaticamente: `a pagar` → `em atraso` (cobrança
vencida sem pagamento, com contagem de dias de atraso) → `pago`. Fechamentos em
atraso ganham o botão **"Lembrete de atraso"**, que envia o e-mail de cobrança
vencida (template próprio) e registra o envio. O **pagamento** (RF40) guarda
data, valor e comprovante, marca `pago com atraso` quando feito após o
vencimento, e tudo fica na trilha de auditoria. O fornecedor acompanha
competência, faturado, royalty devido, vencimento (com dias de atraso) e status
na tela "Royalties devidos".

### Trilha de auditoria (Segurança & Auditoria)

Cada operação crítica gera um evento com **quem** (usuário, e-mail e papel),
**o quê** (operação e detalhe), **quando** (data/hora) e a classificação
automática em **módulo** (Segurança, Pedidos, Cotações, Faturamento, Royalties,
Cadastros, Estoque, Usuários, Configurações, Relatórios) e **severidade**
(info, alerta, crítico). Além das ações de negócio, a trilha registra eventos
de segurança: **logins**, **falhas de login** (com o e-mail tentado e o
motivo), **logouts** e **tentativas de acesso negadas por permissão** (com a
chave de permissão envolvida). São mantidos os últimos 400 eventos; entradas
de versões anteriores são classificadas automaticamente na exibição.

A tela **Gestão › Segurança & Auditoria** (papel Loja) traz KPIs (eventos
registrados, eventos hoje, alertas e críticos, usuários no log), busca textual
e filtros combináveis por usuário, módulo, severidade e período (hoje/7/30
dias), paginação ("Carregar mais eventos") e **exportação XLSX** do recorte
filtrado — controlada pela permissão `auditoria.exportar` e, ela própria,
registrada na trilha.

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
