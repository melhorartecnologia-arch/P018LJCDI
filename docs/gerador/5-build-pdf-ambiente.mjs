// Gera o PDF "Configuração do Ambiente" (A4, identidade Cidade Imperial):
// VPS Ubuntu + PM2 + PostgreSQL no mesmo servidor + HTTPS Let's Encrypt (HML).
// Rode a partir de docs/gerador (npm install já traz o playwright):
//   node 5-build-pdf-ambiente.mjs
import { chromium } from 'playwright'

const OUT = '/home/user/P018LJCDI/docs/Plataforma-Cidade-Imperial-Configuracao-Ambiente.pdf'
const DOM = 'lojacidadeimperialhml.cervejariacidadeimperial.com'

const esc = (s) => String(s == null ? '' : s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]))
const code = (txt, titulo) => `
  <div class="code-wrap">${titulo ? `<div class="code-title">${esc(titulo)}</div>` : ''}<pre class="code">${esc(txt.trim())}</pre></div>`
const nota = (txt) => `<div class="nota">${txt}</div>`
const passo = (n, titulo, corpo) => `
  <section class="passo">
    <div class="passo-head"><div class="passo-num">${n}</div><h2>${esc(titulo)}</h2></div>
    ${corpo}
  </section>`

const secoes = []

secoes.push(passo(1, 'Preparar o sistema', `
  <p>Conecte na VPS via SSH e atualize os pacotes básicos:</p>
  ${code(`sudo apt update && sudo apt upgrade -y
sudo apt install -y git curl ufw`)}`))

secoes.push(passo(2, 'Instalar o Node.js 22 LTS', `
  <p>Use o repositório oficial NodeSource — o Node do apt padrão costuma ser antigo (a aplicação exige Node 18+, recomendado 22 LTS):</p>
  ${code(`curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
node -v   # deve mostrar v22.x`)}`))

secoes.push(passo(3, 'Instalar o PostgreSQL no mesmo servidor', `
  ${code(`sudo apt install -y postgresql postgresql-contrib
sudo systemctl enable --now postgresql`)}
  <p>Crie o usuário e o banco da aplicação (troque <b>SENHA_FORTE</b> por uma senha sua):</p>
  ${code(`sudo -u postgres psql <<'SQL'
CREATE USER cidadeimperial WITH PASSWORD 'SENHA_FORTE';
CREATE DATABASE cidadeimperial OWNER cidadeimperial;
SQL`)}
  <p>Teste a conexão (abre o prompt <span class="mono">cidadeimperial=&gt;</span>; saia com <span class="mono">\\q</span>):</p>
  ${code(`psql "postgres://cidadeimperial:SENHA_FORTE@localhost:5432/cidadeimperial"`)}
  ${nota('O PostgreSQL do Ubuntu já vem escutando apenas em <b>localhost</b> — exatamente o que queremos com o banco no mesmo servidor. Não é preciso mexer no pg_hba.conf.')}`))

secoes.push(passo(4, 'Baixar o projeto', `
  ${code(`sudo mkdir -p /var/www && sudo chown $USER:$USER /var/www
cd /var/www
git clone https://github.com/melhorartecnologia-arch/p018ljcdi.git cidadeimperial
cd cidadeimperial
git checkout claude/plataforma-cidade-imperial-dmxbmw`)}`))

secoes.push(passo(5, 'Configurar as variáveis de ambiente (.env)', `
  <p>Toda a configuração vem de variáveis de ambiente. Copie o modelo e edite:</p>
  ${code(`cp .env.example .env
nano .env`)}
  <p>Deixe o <span class="mono">.env</span> assim (o resto pode ficar comentado/padrão):</p>
  ${code(`# HTTP — atrás do Nginx, escute só localmente
PORT=3000
HOST=127.0.0.1
PUBLIC_URL=https://${DOM}

# Banco PostgreSQL local (mesmo servidor)
DATABASE_URL=postgres://cidadeimperial:SENHA_FORTE@localhost:5432/cidadeimperial

# O banco já foi criado no passo 3
DB_AUTO_CREATE=false
# Carga inicial de demonstração na primeira subida
DB_SEED=true

# (Opcional) análise do documento fiscal por IA Claude no faturamento
# ANTHROPIC_API_KEY=sk-ant-...`, '.env')}`))

secoes.push(passo(6, 'Instalar dependências e compilar a interface', `
  ${code(`cd /var/www/cidadeimperial
npm --prefix server install --omit=dev
npm --prefix web install
npm --prefix web run build`)}
  <p>Teste rápido antes do PM2:</p>
  ${code(`npm run start:server
# em outro terminal:
curl http://127.0.0.1:3000/api/health
#   → {"ok":true,"driver":"pg"}
# volte e pare com Ctrl+C`)}
  ${nota('<b>"driver":"pg"</b> confirma que a aplicação está usando o PostgreSQL do servidor (e não o banco embutido de desenvolvimento).')}`))

secoes.push(passo(7, 'Rodar com PM2 (reinício automático + boot)', `
  ${code(`sudo npm install -g pm2
cd /var/www/cidadeimperial
pm2 start ecosystem.config.cjs      # sobe o app "cidade-imperial"
pm2 status                          # deve mostrar "online"
pm2 logs cidade-imperial --lines 20`)}
  <p>Faça o PM2 iniciar junto com o servidor (sobrevive a reboot):</p>
  ${code(`pm2 save            # grava a lista de apps atual
pm2 startup systemd  # copie e execute o comando "sudo env PATH=..." que ele imprimir`)}
  <p>Comandos do dia a dia: <span class="mono">pm2 status</span> · <span class="mono">pm2 logs cidade-imperial</span> · <span class="mono">pm2 restart cidade-imperial</span> · <span class="mono">pm2 stop cidade-imperial</span></p>
  ${nota('O <b>ecosystem.config.cjs</b> (raiz do repositório) roda 1 instância em modo fork <b>de propósito</b>: a persistência do estado é transacional e não deve rodar em cluster. Não altere para cluster.')}`))

secoes.push(passo(8, 'Firewall (UFW)', `
  ${code(`sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable && sudo ufw status`)}`))

secoes.push(passo(9, 'DNS — apontar o domínio para a VPS', `
  <p>No gerenciador de DNS do domínio <b>cervejariacidadeimperial.com</b>, crie um registro <b>A</b>:</p>
  <table class="tbl"><tr><th>Tipo</th><th>Nome</th><th>Valor</th></tr>
  <tr><td>A</td><td class="mono">lojacidadeimperialhml</td><td>IP público da VPS</td></tr></table>
  <p>Confira a propagação antes de continuar (deve devolver o IP da VPS):</p>
  ${code(`dig +short ${DOM}`)}
  ${nota('O Let’s Encrypt valida o domínio acessando a VPS pela internet na porta 80 — sem o DNS apontado (e sem a porta 80 aberta), a emissão do certificado falha.')}`))

secoes.push(passo(10, 'Nginx na frente da aplicação', `
  ${code(`sudo apt install -y nginx
sudo tee /etc/nginx/sites-available/cidadeimperial-hml >/dev/null <<'NGINX'
server {
    listen 80;
    server_name ${DOM};

    # Anexo do documento fiscal (PDF/XML em base64)
    client_max_body_size 20m;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 120s;
    }
}
NGINX
sudo ln -sf /etc/nginx/sites-available/cidadeimperial-hml /etc/nginx/sites-enabled/

# O domínio é longo (50 caracteres) e estoura a tabela de nomes
# padrão do Nginx — aumente o bucket size:
echo 'server_names_hash_bucket_size 128;' | sudo tee /etc/nginx/conf.d/server-names-hash.conf

sudo nginx -t && sudo systemctl reload nginx`)}
  <p>Teste em HTTP antes do certificado — deve responder o JSON de saúde:</p>
  ${code(`curl -s http://${DOM}/api/health
#   → {"ok":true,"driver":"pg"}`)}
  ${nota('O <b>client_max_body_size 20m</b> é obrigatório: o padrão do Nginx (1 MB) bloquearia o anexo do documento fiscal no registro de faturamento (erro 413).')}`))

secoes.push(passo(11, 'HTTPS com Let’s Encrypt (renovação automática)', `
  ${code(`sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d ${DOM} \\
  --redirect --agree-tos -m seu-email@cervejariacidadeimperial.com.br`)}
  <p>O certbot valida o domínio pela porta 80, emite o certificado, reescreve o Nginx para escutar em 443 com TLS e adiciona o redirecionamento automático de todo acesso <span class="mono">http://</span> para <span class="mono">https://</span>. Confira:</p>
  ${code(`curl -s  https://${DOM}/api/health          # {"ok":true,...}
curl -sI http://${DOM}/ | head -3            # 301 → https://
sudo certbot renew --dry-run                 # renovação automática ok`)}
  ${nota('O certificado vale 90 dias e o timer do systemd instalado pelo certbot renova sozinho com ~30 dias de antecedência, recarregando o Nginx.')}`))

secoes.push(passo(12, 'Conferência final', `
  <ul class="check">
    <li>Abrir <b>https://${DOM}</b>, conferir o cadeado e entrar com um acesso de demonstração (ex.: <span class="mono">admin@cidadeimperial.com.br / admin123</span>).</li>
    <li>Reiniciar a VPS (<span class="mono">sudo reboot</span>) e confirmar que a aplicação volta sozinha (<span class="mono">pm2 status</span>).</li>
    <li>Configurar o SMTP em <b>Configurações Técnicas › Configuração de e-mail</b> ("Verificar conexão" + "Enviar teste"). Use porta 587 (STARTTLS) ou 465 (SSL) — muitas VPS bloqueiam a porta 25.</li>
    <li><b>Trocar as senhas dos usuários de demonstração</b> em Configurações Técnicas › Usuários e permissões (ou inativar os que não usar).</li>
    <li>(Opcional) Definir <span class="mono">ANTHROPIC_API_KEY</span> no .env para a análise do documento fiscal usar a IA Claude, e reiniciar: <span class="mono">pm2 restart cidade-imperial</span>.</li>
  </ul>`))

secoes.push(`
  <section class="passo">
    <div class="passo-head"><div class="passo-num alt">↻</div><h2>Atualizar a aplicação (novo deploy)</h2></div>
    ${code(`cd /var/www/cidadeimperial && git pull
npm --prefix server install --omit=dev
npm --prefix web install && npm --prefix web run build
pm2 restart cidade-imperial`)}
    <p>O schema do banco é aplicado de forma idempotente na subida; os dados existentes são preservados (a carga inicial só entra em banco vazio).</p>
  </section>
  <section class="passo">
    <div class="passo-head"><div class="passo-num alt">⛁</div><h2>Backup diário do banco</h2></div>
    ${code(`# manual
pg_dump "postgres://cidadeimperial:SENHA_FORTE@localhost:5432/cidadeimperial" \\
  | gzip > /var/backups/cidadeimperial-$(date +%F).sql.gz

# diário às 2h (crontab -e)
0 2 * * * pg_dump "postgres://cidadeimperial:SENHA_FORTE@localhost:5432/cidadeimperial" | gzip > /var/backups/cidadeimperial-$(date +\\%F).sql.gz`)}
  </section>`)

const problemas = [
  ['nginx -t: "could not build server_names_hash"', 'Domínio longo — rode o comando do server_names_hash_bucket_size do passo 10.'],
  ['certbot: "Challenge failed" / "unauthorized"', 'DNS não propagou (dig +short deve devolver o IP) ou porta 80 bloqueada (UFW / firewall do provedor).'],
  ['pm2 status mostra "errored"', 'pm2 logs cidade-imperial mostra o erro real — geralmente DATABASE_URL/senha do banco incorreta no .env.'],
  ['/api/health responde {"ok":false}', 'PostgreSQL fora do ar: sudo systemctl status postgresql.'],
  ['"driver":"pglite" em vez de "pg"', 'DATABASE_URL ausente ou com erro de digitação no .env — a aplicação caiu no banco embutido.'],
  ['Erro 413 ao anexar documento fiscal', 'Falta client_max_body_size 20m no bloco do Nginx.'],
  ['Erro 502 no navegador', 'Aplicação parada: pm2 restart cidade-imperial e verifique pm2 logs.'],
  ['Não volta após reboot', 'Faltou pm2 save, ou o comando impresso por pm2 startup não foi executado.'],
  ['E-mails não são enviados', 'SMTP desativado/incorreto em Configurações Técnicas; use porta 587 ou 465 (a 25 costuma ser bloqueada).'],
  ['Certificado expirou', 'Timer do certbot inativo — sudo certbot renew e systemctl status certbot.timer.'],
]

const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><style>
  @page { size: A4; margin: 0; }
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:'Segoe UI',Arial,Helvetica,sans-serif; color:#272525; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
  .capa { height:296.5mm; position:relative; background:radial-gradient(900px 500px at 70% -10%, #3a2f1c, #272525 55%, #1c1a18); page-break-after:always; }
  .miolo { padding:16mm 16mm 14mm; }
  h2 { font-size:17px; font-weight:800; color:#272525; }
  p { font-size:12px; line-height:1.55; color:#4a453d; margin:7px 0; }
  .passo { break-inside:avoid; margin-bottom:15px; border:1px solid #eae3d6; border-radius:10px; padding:12px 14px 10px; background:#fffdf9; }
  .passo-head { display:flex; align-items:center; gap:10px; margin-bottom:4px; }
  .passo-num { width:30px; height:30px; border-radius:9px; background:linear-gradient(135deg,#cfa055,#B38335 55%,#8a6428); color:#fff; font-weight:800; font-size:15px; display:flex; align-items:center; justify-content:center; flex:none; }
  .passo-num.alt { background:#272525; }
  .code-wrap { margin:8px 0; break-inside:avoid; }
  .code-title { font-size:10px; font-weight:700; letter-spacing:.08em; color:#8a5a12; background:#faf3e4; border:1px solid #ecdcbc; border-bottom:none; border-radius:8px 8px 0 0; padding:4px 10px; display:inline-block; }
  .code { background:#272525; color:#e8e2d6; font-family:Consolas,'Courier New',monospace; font-size:10.5px; line-height:1.5; padding:10px 12px; border-radius:8px; white-space:pre-wrap; word-break:break-word; }
  .mono { font-family:Consolas,'Courier New',monospace; font-size:11px; background:#f4f1ea; border:1px solid #eae3d6; border-radius:4px; padding:0 4px; }
  .nota { font-size:11px; line-height:1.5; color:#6b6459; background:#f7f4ee; border-left:3px solid #B38335; border-radius:0 8px 8px 0; padding:8px 12px; margin:8px 0 2px; }
  .tbl { width:100%; border-collapse:collapse; margin:8px 0; font-size:11px; }
  .tbl th { text-align:left; background:#272525; color:#e3bf7e; padding:6px 9px; font-size:10px; letter-spacing:.06em; text-transform:uppercase; }
  .tbl td { padding:6px 9px; border-bottom:1px solid #eee7d8; color:#4a453d; vertical-align:top; line-height:1.45; }
  .tbl tr:nth-child(even) td { background:#faf7f0; }
  .check { margin:6px 0 4px 4px; }
  .check li { font-size:12px; line-height:1.55; color:#4a453d; margin:6px 0 6px 16px; }
  .rodape { display:flex; justify-content:space-between; font-size:9.5px; color:#a89f90; border-top:1px solid #eae3d6; padding-top:6px; margin-top:6px; }
  .sec-title { font-size:13px; font-weight:800; letter-spacing:.12em; color:#B38335; margin:4px 0 10px; }
</style></head><body>

<div class="capa">
  <div style="position:absolute;left:18mm;top:20mm;display:flex;align-items:center;gap:14px">
    <div style="width:52px;height:52px;border-radius:13px;background:linear-gradient(135deg,#cfa055,#B38335 55%,#8a6428);display:flex;align-items:center;justify-content:center;font-family:Georgia,serif;font-weight:700;font-size:22px;color:#fff">CI</div>
    <div><div style="font-family:Georgia,serif;font-weight:700;font-size:16px;letter-spacing:.14em;color:#fff">CIDADE IMPERIAL</div>
    <div style="font-size:11px;letter-spacing:.16em;color:#e3bf7e;margin-top:3px">PLATAFORMA DA LOJA</div></div>
  </div>
  <div style="position:absolute;left:18mm;right:18mm;top:95mm">
    <div style="font-size:13px;font-weight:700;letter-spacing:.18em;color:#e3bf7e;margin-bottom:12px">GUIA DE INFRAESTRUTURA · PRODUÇÃO / HOMOLOGAÇÃO</div>
    <div style="font-size:42px;font-weight:800;color:#fff;line-height:1.08;letter-spacing:-.5px">Configuração do ambiente<br>VPS Ubuntu — passo a passo</div>
    <div style="font-size:15px;color:#c9c1b4;margin-top:16px;line-height:1.6;max-width:150mm">Sem Docker · processo gerenciado pelo <b style="color:#e8e2d6">PM2</b> · <b style="color:#e8e2d6">PostgreSQL</b> no mesmo servidor · <b style="color:#e8e2d6">HTTPS</b> com certificado Let's Encrypt e renovação automática.</div>
    <div style="margin-top:22px;display:inline-block;background:#ffffff14;border:1px solid #e3bf7e55;border-radius:10px;padding:10px 16px;font-family:Consolas,monospace;font-size:13px;color:#e3bf7e">https://${DOM}</div>
  </div>
  <div style="position:absolute;left:18mm;bottom:55mm;right:18mm;display:flex;gap:10px">
    ${['Internet', 'Nginx · 80/443 (TLS)', 'API Node.js · PM2 · :3000', 'PostgreSQL · localhost:5432'].map((t, i, a) => `
      <div style="flex:1;background:#ffffff10;border:1px solid #ffffff22;border-radius:10px;padding:10px 8px;text-align:center;font-size:11px;color:#e8e2d6">${t}</div>${i < a.length - 1 ? '<div style="align-self:center;color:#c9a24a;font-size:16px">→</div>' : ''}`).join('')}
  </div>
  <div style="position:absolute;left:18mm;bottom:20mm;font-size:10px;color:#8a8378">Julho de 2026 · Também disponível no repositório: docs/deploy-vps-ubuntu.md e docs/https-lets-encrypt-hml.md</div>
</div>

<div class="miolo">
  <div class="sec-title">PASSO A PASSO — DO SERVIDOR ZERADO AO HTTPS NO AR</div>
  ${secoes.join('\n')}
  <section class="passo">
    <div class="passo-head"><div class="passo-num alt">?</div><h2>Problemas comuns</h2></div>
    <table class="tbl"><tr><th style="width:38%">Sintoma</th><th>Causa / solução</th></tr>
      ${problemas.map(([s, c]) => `<tr><td>${esc(s)}</td><td>${esc(c)}</td></tr>`).join('')}
    </table>
  </section>
  <div class="rodape"><span>Plataforma Cidade Imperial — Configuração do Ambiente (VPS Ubuntu · PM2 · PostgreSQL · HTTPS)</span><span>julho/2026</span></div>
</div>
</body></html>`

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' })
const page = await browser.newPage()
await page.setContent(html, { waitUntil: 'networkidle' })
await page.pdf({ path: OUT, format: 'A4', printBackground: true, margin: { top: 0, bottom: 0, left: 0, right: 0 } })
await browser.close()
console.log('PDF gerado em', OUT)
