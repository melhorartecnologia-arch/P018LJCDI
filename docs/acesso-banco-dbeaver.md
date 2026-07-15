# Acessar o banco da aplicação pelo DBeaver (via túnel SSH)

O PostgreSQL da VPS escuta apenas em `localhost` — de propósito, por segurança.
Para acessar da sua máquina, use o **túnel SSH embutido do DBeaver**: a conexão
"viaja" pelo SSH até a VPS e de lá entra no banco local. **Não abra a porta
5432 no firewall** — não é necessário e expõe o banco à internet.

## Pré-requisitos

- IP público da VPS (ou o domínio, ex.: `lojacidadeimperialhml.cervejariacidadeimperial.com`);
- o acesso SSH que você já usa (usuário `ubuntu` + chave `.pem`, no caso de AWS;
  ou usuário/senha, conforme o provedor);
- as credenciais do banco definidas no deploy: usuário `cidadeimperial`,
  a senha escolhida (`SENHA_FORTE`) e o banco `cidadeimperial`
  (as mesmas da `DATABASE_URL` no `.env` da aplicação).

## Passo a passo no DBeaver

1. **Database → New Database Connection → PostgreSQL → Next**.
2. Aba **Main** (os dados são "vistos de dentro da VPS", pois o túnel te leva até lá):
   | Campo | Valor |
   | --- | --- |
   | Host | `localhost` |
   | Port | `5432` |
   | Database | `cidadeimperial` |
   | Username | `cidadeimperial` (ou o usuário somente-leitura abaixo) |
   | Password | a senha do banco (marque "Save password") |
3. Aba **SSH** — marque **"Use SSH Tunnel"**:
   | Campo | Valor |
   | --- | --- |
   | Host/IP | IP público da VPS (ou o domínio) |
   | Port | `22` |
   | User Name | `ubuntu` |
   | Authentication | **Public Key** → aponte o arquivo `.pem` (Passphrase se a chave tiver senha). Se acessa por senha, use "Password". |
   Clique em **"Test tunnel configuration"** → deve responder "Connected".
4. Clique em **"Test Connection…"** — aceite baixar o driver PostgreSQL na
   primeira vez. Deve aparecer "Connected" com a versão do servidor.
5. **Finish.** Navegue em `cidadeimperial → Schemas → public → Tables`.

## O que há no banco

Tabelas principais: `pedidos`, `cotacoes`, `faturamentos`, `pagamentos`,
`fornecedores`, `contratos`, `produtos`, `revendas`, `usuarios`, `inventarios`,
`anexos` (documentos fiscais em base64), `auditoria`, `config_email`,
`config_plataforma` e `app_seq`. Cada tabela de negócio tem **colunas tipadas**
para consulta SQL e uma coluna **`data` (JSONB)** com a entidade completa:

```sql
-- exemplos
SELECT id, pedido_id, valor, data->>'anexoNome' AS anexo FROM faturamentos;
SELECT chave, status, valor, data->>'vencimento' AS vencimento FROM pagamentos;
SELECT quando, usuario, acao, detalhe FROM auditoria ORDER BY ord LIMIT 50;
```

## ⚠️ Recomendações

**Use para consulta, não para editar.** A aplicação sincroniza o estado por
transação (apaga e regrava as coleções a cada gravação) — uma linha alterada
manualmente no DBeaver **será sobrescrita** na próxima ação feita na
plataforma. Alterações de dados devem ser feitas pela aplicação; o DBeaver é
para relatórios, conferências e investigação.

**Crie um usuário somente-leitura** para o dia a dia (uma vez, na VPS, com
`sudo -u postgres psql -d cidadeimperial`):

```sql
CREATE USER cidadeimperial_leitura WITH PASSWORD 'OUTRA_SENHA';
GRANT CONNECT ON DATABASE cidadeimperial TO cidadeimperial_leitura;
GRANT USAGE ON SCHEMA public TO cidadeimperial_leitura;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO cidadeimperial_leitura;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO cidadeimperial_leitura;
```

Use `cidadeimperial_leitura` na aba Main do DBeaver.

## Problemas comuns

| Sintoma | Causa / solução |
| --- | --- |
| "Test tunnel" falha com Connection refused/timeout | IP, porta 22 ou chave errados — use exatamente o mesmo acesso do seu SSH; confira o firewall do provedor. |
| "password authentication failed for user" | Senha do banco incorreta — confira a `DATABASE_URL` no `.env` da aplicação na VPS. |
| Túnel conecta, banco não ("Connection refused" no 5432) | Na aba Main o Host deve ser `localhost` (não o IP da VPS); confirme o PostgreSQL ativo: `sudo systemctl status postgresql`. |
| "database cidadeimperial does not exist" | Nome do banco digitado errado, ou o deploy usou outro nome — confira na `DATABASE_URL`. |
| DBeaver pede driver | Aceite o download automático do driver PostgreSQL na primeira conexão. |
