# Deploy em VPS Ubuntu — sem Docker, com PM2 e PostgreSQL no mesmo servidor

Guia completo para colocar a **Plataforma Cidade Imperial** rodando de forma
integral em produção numa VPS Ubuntu (22.04 ou 24.04), **sem Docker**, com o
processo gerenciado pelo **PM2** (reinício automático e boot junto com o
servidor) e o **PostgreSQL instalado na própria VPS**.

Visão geral do que será montado:

```
Internet ──▶ Nginx (80/443, HTTPS) ──▶ API Node.js (PM2, porta 3000, só local)
                                        └──▶ PostgreSQL 16 (localhost:5432)
```

O Nginx é recomendado (HTTPS, compressão, domínio), mas há uma variante sem ele
no passo 9. Em todos os comandos, troque `SENHA_FORTE` por uma senha sua.

---

## 1. Preparar o sistema

Conecte na VPS via SSH e atualize os pacotes:

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y git curl ufw
```

## 2. Instalar o Node.js 22 LTS

Use o repositório oficial NodeSource (o Node do apt padrão costuma ser antigo;
a aplicação exige Node 18+, recomendado 22 LTS):

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
node -v   # deve mostrar v22.x
```

## 3. Instalar o PostgreSQL no mesmo servidor

```bash
sudo apt install -y postgresql postgresql-contrib
sudo systemctl enable --now postgresql
sudo systemctl status postgresql --no-pager   # deve mostrar "active (running)"
```

Crie o usuário e o banco da aplicação:

```bash
sudo -u postgres psql <<'SQL'
CREATE USER cidadeimperial WITH PASSWORD 'SENHA_FORTE';
CREATE DATABASE cidadeimperial OWNER cidadeimperial;
SQL
```

Teste a conexão (deve abrir o prompt `cidadeimperial=>`; saia com `\q`):

```bash
psql "postgres://cidadeimperial:SENHA_FORTE@localhost:5432/cidadeimperial"
```

> O PostgreSQL do Ubuntu já vem escutando apenas em `localhost` — exatamente o
> que queremos com o banco no mesmo servidor. Não é preciso mexer no
> `pg_hba.conf`.

## 4. Baixar o projeto

```bash
sudo mkdir -p /var/www && sudo chown $USER:$USER /var/www
cd /var/www
git clone https://github.com/melhorartecnologia-arch/p018ljcdi.git cidadeimperial
cd cidadeimperial
git checkout claude/plataforma-cidade-imperial-dmxbmw
```

## 5. Configurar as variáveis de ambiente (`.env`)

Toda a configuração vem de variáveis de ambiente (veja `.env.example`):

```bash
cp .env.example .env
nano .env
```

Deixe o `.env` assim (o resto pode ficar comentado/padrão):

```ini
# HTTP — atrás do Nginx, escute só localmente
PORT=3000
HOST=127.0.0.1

# Banco PostgreSQL local (mesmo servidor)
DATABASE_URL=postgres://cidadeimperial:SENHA_FORTE@localhost:5432/cidadeimperial

# O banco já foi criado no passo 3
DB_AUTO_CREATE=false
# Carga inicial de demonstração na primeira subida (usuários de acesso etc.)
DB_SEED=true

# (Opcional) análise do documento fiscal por IA Claude no faturamento
# ANTHROPIC_API_KEY=sk-ant-...
```

> Se **não** for usar Nginx (acesso direto pela porta), use `HOST=0.0.0.0`.

## 6. Instalar dependências e compilar a interface

```bash
cd /var/www/cidadeimperial
npm --prefix server install --omit=dev
npm --prefix web install
npm --prefix web run build
```

Teste rápido antes do PM2 (deve logar `ouvindo em ... (banco: pg)`):

```bash
npm run start:server
# em outro terminal: curl http://127.0.0.1:3000/api/health
#   → {"ok":true,"driver":"pg"}
# volte e pare com Ctrl+C
```

`"driver":"pg"` confirma que está no PostgreSQL do servidor (e não no embutido).

## 7. Rodar com PM2 (reinício automático + boot)

```bash
sudo npm install -g pm2
cd /var/www/cidadeimperial
pm2 start ecosystem.config.cjs     # sobe o app "cidade-imperial"
pm2 status                          # status deve ser "online"
pm2 logs cidade-imperial --lines 20 # veja o log de subida
```

Faça o PM2 iniciar junto com o servidor (sobrevive a reboot):

```bash
pm2 save                # grava a lista de apps atual
pm2 startup systemd     # ele imprime um comando "sudo env PATH=..." — copie e execute
```

Comandos do dia a dia:

```bash
pm2 status                       # situação do processo
pm2 logs cidade-imperial         # logs ao vivo (também em logs/out.log e logs/err.log)
pm2 restart cidade-imperial      # reiniciar
pm2 stop cidade-imperial         # parar
```

> O `ecosystem.config.cjs` roda **1 instância em modo fork** de propósito: a
> persistência substitui o estado por transação e múltiplas instâncias em
> cluster poderiam concorrer entre si. Não altere para `cluster`.

## 8. Firewall (UFW)

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status
```

(Na variante sem Nginx, troque as duas regras de 80/443 por `sudo ufw allow 3000/tcp`.)

## 9. Nginx na frente (recomendado) + HTTPS

```bash
sudo apt install -y nginx
sudo nano /etc/nginx/sites-available/cidadeimperial
```

Conteúdo (troque `plataforma.seudominio.com.br` pelo seu domínio — ou pelo IP
da VPS se ainda não tiver domínio):

```nginx
server {
    listen 80;
    server_name plataforma.seudominio.com.br;

    # Uploads de documento fiscal (PDF/XML em base64) — folga acima dos 8mb da API
    client_max_body_size 20m;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 120s;   # análise fiscal por IA pode levar alguns segundos
    }
}
```

Ative e recarregue:

```bash
sudo ln -s /etc/nginx/sites-available/cidadeimperial /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

HTTPS gratuito com Let's Encrypt (precisa do domínio apontando para a VPS):

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d plataforma.seudominio.com.br
```

O certbot ajusta o Nginx para 443 e renova o certificado automaticamente.

> **Importante:** o `client_max_body_size 20m` é obrigatório — o padrão do
> Nginx (1 MB) bloquearia o anexo do documento fiscal no faturamento.

## 10. Conferir tudo

1. Abra `https://plataforma.seudominio.com.br` (ou `http://IP` / `http://IP:3000`).
2. Entre com um acesso de demonstração (ex.: `admin@cidadeimperial.com.br` / `admin123`).
3. `curl -s localhost:3000/api/health` na VPS → `{"ok":true,"driver":"pg"}`.
4. Reinicie a VPS (`sudo reboot`) e confirme que a aplicação volta sozinha
   (`pm2 status` após reconectar).
5. Em **Configurações Técnicas › Configuração de e-mail**, configure o SMTP e
   use "Verificar conexão" + "Enviar teste".
6. **Troque as senhas dos usuários de demonstração** em
   **Configurações Técnicas › Usuários e permissões** (ou inative os que não usar).

## 11. Atualizar a aplicação (novo deploy)

```bash
cd /var/www/cidadeimperial
git pull
npm --prefix server install --omit=dev
npm --prefix web install
npm --prefix web run build
pm2 restart cidade-imperial
```

O schema é aplicado de forma idempotente na subida (`CREATE TABLE IF NOT
EXISTS`); os dados existentes são preservados (o seed só entra em banco vazio).

## 12. Backup do banco

Backup manual:

```bash
pg_dump "postgres://cidadeimperial:SENHA_FORTE@localhost:5432/cidadeimperial" \
  | gzip > /var/backups/cidadeimperial-$(date +%F).sql.gz
```

Backup diário às 2h via cron (`crontab -e`):

```cron
0 2 * * * pg_dump "postgres://cidadeimperial:SENHA_FORTE@localhost:5432/cidadeimperial" | gzip > /var/backups/cidadeimperial-$(date +\%F).sql.gz
```

Restauração:

```bash
gunzip -c /var/backups/cidadeimperial-2026-07-15.sql.gz \
  | psql "postgres://cidadeimperial:SENHA_FORTE@localhost:5432/cidadeimperial"
```

## 13. Problemas comuns

| Sintoma | Causa provável / solução |
| --- | --- |
| `pm2 status` mostra `errored`/reinícios | `pm2 logs cidade-imperial` mostra o erro real (geralmente `.env` com `DATABASE_URL` errada ou senha do banco incorreta). |
| `/api/health` responde `{"ok":false,...}` | PostgreSQL fora do ar: `sudo systemctl status postgresql`. |
| `driver` aparece como `pglite` em vez de `pg` | `DATABASE_URL` não está no `.env` (ou tem erro de digitação) — a aplicação caiu no banco embutido. |
| Erro 413 ao anexar documento fiscal | Falta `client_max_body_size 20m;` no bloco do Nginx. |
| Página abre mas sem dados / erro 502 | App parado: `pm2 restart cidade-imperial` e verifique `pm2 logs`. |
| Aplicação não volta após reboot | `pm2 save` não foi executado, ou o comando impresso por `pm2 startup` não foi rodado. |
| E-mails não são enviados | Envio desativado ou SMTP incorreto em Configurações Técnicas; alguns provedores de VPS bloqueiam a porta 25 — use 587 (STARTTLS) ou 465 (SSL). |
| Análise fiscal usa "analisador local" | `ANTHROPIC_API_KEY` não definida no `.env` — defina e `pm2 restart cidade-imperial`. |
