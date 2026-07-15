# HTTPS com Let's Encrypt — lojacidadeimperialhml.cervejariacidadeimperial.com

Passo a passo para colocar o ambiente de homologação servindo em
**https://lojacidadeimperialhml.cervejariacidadeimperial.com** com certificado
gratuito Let's Encrypt (renovação automática), usando Nginx na frente da
aplicação. Pré-requisito: a aplicação já rodando na VPS com PM2, conforme
[`deploy-vps-ubuntu.md`](deploy-vps-ubuntu.md).

## 0. DNS — o domínio precisa apontar para a VPS

No gerenciador de DNS do domínio `cervejariacidadeimperial.com`, crie um
registro **A**:

| Tipo | Nome | Valor |
| --- | --- | --- |
| A | `lojacidadeimperialhml` | IP público da VPS |

Confira a propagação (deve devolver o IP da VPS) antes de continuar:

```bash
dig +short lojacidadeimperialhml.cervejariacidadeimperial.com
```

> O Let's Encrypt valida o domínio acessando a VPS pela internet na porta 80 —
> sem o DNS apontado (e sem a porta 80 aberta), a emissão falha.

## 1. Aplicação escutando só localmente

No `.env` da aplicação (`/var/www/cidadeimperial/.env`), o Nginx é quem expõe
a porta pública — deixe:

```ini
PORT=3000
HOST=127.0.0.1
PUBLIC_URL=https://lojacidadeimperialhml.cervejariacidadeimperial.com
```

(Se alterou algo: `pm2 restart cidade-imperial`.)

## 2. Firewall

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable && sudo ufw status
```

## 3. Nginx apontando para a aplicação

```bash
sudo apt install -y nginx
sudo tee /etc/nginx/sites-available/cidadeimperial-hml >/dev/null <<'NGINX'
server {
    listen 80;
    server_name lojacidadeimperialhml.cervejariacidadeimperial.com;

    # Anexo do documento fiscal (PDF/XML em base64) — folga acima dos 8mb da API
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
NGINX
sudo ln -sf /etc/nginx/sites-available/cidadeimperial-hml /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

Teste em HTTP antes do certificado — deve responder o JSON de saúde:

```bash
curl -s http://lojacidadeimperialhml.cervejariacidadeimperial.com/api/health
#   → {"ok":true,"driver":"pg"}
```

## 4. Emitir o certificado Let's Encrypt

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d lojacidadeimperialhml.cervejariacidadeimperial.com \
  --redirect --agree-tos -m seu-email@cervejariacidadeimperial.com.br
```

O que acontece: o certbot valida o domínio pela porta 80, emite o certificado,
**reescreve o bloco do Nginx para escutar em 443 com TLS** e adiciona o
redirecionamento automático de todo acesso `http://` para `https://`
(`--redirect`). O e-mail é usado só para avisos de expiração.

## 5. Conferir

```bash
# HTTPS respondendo
curl -s https://lojacidadeimperialhml.cervejariacidadeimperial.com/api/health

# HTTP redirecionando (deve mostrar 301 e Location: https://...)
curl -sI http://lojacidadeimperialhml.cervejariacidadeimperial.com/ | head -3

# Dados do certificado (emissor Let's Encrypt e validade de 90 dias)
echo | openssl s_client -connect lojacidadeimperialhml.cervejariacidadeimperial.com:443 \
  -servername lojacidadeimperialhml.cervejariacidadeimperial.com 2>/dev/null \
  | openssl x509 -noout -issuer -dates
```

No navegador: abra
`https://lojacidadeimperialhml.cervejariacidadeimperial.com`, confirme o
cadeado e faça login normalmente.

## 6. Renovação automática

O pacote do certbot já instala um timer do systemd que renova sozinho (o
certificado vale 90 dias; a renovação ocorre com ~30 dias de antecedência e
recarrega o Nginx). Confirme:

```bash
systemctl list-timers | grep certbot   # timer ativo
sudo certbot renew --dry-run           # simulação — deve terminar sem erros
```

## Problemas comuns

| Sintoma | Causa / solução |
| --- | --- |
| `certbot` falha com "Challenge failed" / "unauthorized" | DNS ainda não propagou (`dig +short` deve devolver o IP da VPS) ou porta 80 bloqueada (UFW/firewall do provedor da VPS). |
| `curl` do passo 3 responde 502 | Aplicação parada ou em outra porta: `pm2 status`, `pm2 logs cidade-imperial`; confira `PORT=3000`/`HOST=127.0.0.1` no `.env`. |
| Erro 413 ao anexar documento fiscal | O `client_max_body_size 20m` saiu do bloco do server ao editar — confira em `/etc/nginx/sites-available/cidadeimperial-hml` (o certbot preserva a linha). |
| Navegador ainda abre em HTTP | Use o link com `https://`; o redirecionamento 301 do certbot cuida dos acessos antigos em `http://`. |
| Certificado expirou | O timer do certbot não está ativo — rode `sudo certbot renew` e verifique `systemctl status certbot.timer`. |
