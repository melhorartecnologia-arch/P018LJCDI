// Gera o PDF "Atualizar o ambiente de homologação" — passo a passo do deploy
// de uma nova versão na VPS Ubuntu (AWS Lightsail) com PM2 + PostgreSQL local
// + Nginx, no mesmo padrão do documento de Configuração do Ambiente.
// Rode a partir de docs/gerador:  node 20-build-atualizacao-hml.mjs
import { chromium } from 'playwright'

const OUT = '/home/user/P018LJCDI/docs/Plataforma-Cidade-Imperial-Atualizacao-Homologacao.pdf'
const DOM = 'lojacidadeimperialhml.cervejariacidadeimperial.com'
const DIR = '/var/www/cidadeimperial'
const APP = 'cidade-imperial'
const BRANCH = 'claude/plataforma-cidade-imperial-dmxbmw'

const esc = (s) => String(s == null ? '' : s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]))
const code = (txt, titulo) => `<div class="code-wrap">${titulo ? `<div class="code-title">${esc(titulo)}</div>` : ''}<pre class="code">${esc(txt.trim())}</pre></div>`
const nota = (txt) => `<div class="nota">${txt}</div>`
const alerta = (txt) => `<div class="alerta">${txt}</div>`
const passo = (n, titulo, corpo) => `<section class="passo"><div class="passo-head"><div class="passo-num">${n}</div><h2>${esc(titulo)}</h2></div>${corpo}</section>`

const S = []

S.push(passo(1, 'Antes de começar — o que esta atualização faz e não faz', `
  <p>A atualização troca o <b>código</b> da aplicação; ela <b>não apaga nem recria os dados</b>. O schema do banco é reaplicado de forma idempotente a cada subida (só cria o que ainda não existe), e a carga inicial de demonstração só entra em banco vazio.</p>
  <table class="tbl">
    <tr><th style="width:34%">O que é substituído</th><th>O que é preservado</th></tr>
    <tr><td>Código do servidor e da interface (<span class="mono">server/</span>, <span class="mono">web/</span>)</td><td>Todos os dados no PostgreSQL — pedidos, cotações, cadastros, auditoria</td></tr>
    <tr><td>A pasta publicada da interface (<span class="mono">web/dist</span>), recriada por cópia</td><td>O arquivo <span class="mono">.env</span> (não é versionado — o <span class="mono">git pull</span> não o toca)</td></tr>
    <tr><td>Documentos gerados em <span class="mono">docs/</span></td><td>Configuração de SMTP e análise fiscal (ficam no banco, não no código)</td></tr>
    <tr><td>—</td><td>Certificado HTTPS, Nginx, PM2 e firewall</td></tr>
  </table>
  ${nota('<b>Quem executa.</b> O Administrador Técnico, com o mesmo usuário do sistema que fez a instalação (o dono de <span class="mono">' + DIR + '</span>) — normalmente <span class="mono">ubuntu</span> no Lightsail. Não rode os comandos como <span class="mono">root</span>: o PM2 é registrado por usuário e o processo deixaria de ser encontrado.')}
  ${nota('<b>Janela e duração.</b> Sem build, a atualização inteira leva menos de um minuto e a aplicação fica indisponível por poucos segundos, apenas no reinício do passo 7. Ainda assim, em homologação prefira fazer fora do horário de treinamento ou de teste do canal.')}`))

S.push(passo(2, 'Conectar na VPS por SSH', `
  <p>Pelo terminal, com a chave <span class="mono">.pem</span> baixada do Lightsail (ajuste o caminho e o IP):</p>
  ${code(`chmod 400 ~/Downloads/LightsailDefaultKey.pem
ssh -i ~/Downloads/LightsailDefaultKey.pem ubuntu@SEU_IP_PUBLICO`)}
  ${nota('Também é possível usar o <b>“Connect using SSH”</b> do próprio console do Lightsail, que abre um terminal no navegador sem precisar da chave.')}`))

S.push(passo(3, 'Conferir o estado atual antes de mexer', `
  <p>Anote o que aparecer: é a referência para saber se a atualização deu certo e para onde voltar se não der.</p>
  ${code(`cd ${DIR}

pm2 status                      # o app "${APP}" deve estar "online"
curl -s http://127.0.0.1:3000/api/health ; echo
#   → {"ok":true,"driver":"pg"}

git rev-parse --short HEAD      # VERSÃO ATUAL — anote este código
git log -1 --pretty='%h %s'     # e a descrição do último commit
git status --short              # deve sair VAZIO
df -h ${DIR} | tail -1          # espaço livre em disco (precisa de ~1 GB)`)}
  ${alerta('Se <span class="mono">git status</span> mostrar arquivos modificados, <b>pare</b>: alguém editou algo direto no servidor. Descubra o que é (<span class="mono">git diff</span>) antes de continuar — <span class="mono">git checkout -- .</span> descarta a alteração e <span class="mono">git stash</span> a guarda.')}
  ${nota('Se o <span class="mono">/api/health</span> devolver <span class="mono">"driver":"pglite"</span>, a aplicação está no banco embutido e não no PostgreSQL do servidor — corrija a <span class="mono">DATABASE_URL</span> no <span class="mono">.env</span> antes de atualizar.')}`))

S.push(passo(4, 'Fazer o backup do banco (obrigatório)', `
  <p>Nunca atualize sem backup, mesmo que a mudança seja só de tela. Use a <span class="mono">DATABASE_URL</span> que está no <span class="mono">.env</span>:</p>
  ${code(`grep DATABASE_URL ${DIR}/.env      # confira a URL de conexão

sudo mkdir -p /var/backups/cidadeimperial
sudo chown $USER /var/backups/cidadeimperial

pg_dump "postgres://cidadeimperial:SENHA_FORTE@localhost:5432/cidadeimperial" \\
  | gzip > /var/backups/cidadeimperial/pre-deploy-$(date +%F-%H%M).sql.gz

ls -lh /var/backups/cidadeimperial | tail -3   # o arquivo NÃO pode estar vazio`)}
  ${nota('Guarde também uma cópia fora da VPS quando a atualização for grande. No Lightsail, um <b>snapshot da instância</b> pelo console (Instância › Snapshots › <i>Create snapshot</i>) salva o servidor inteiro e permite voltar a máquina toda — é o seguro mais completo, leva alguns minutos e não interrompe o serviço.')}`))

S.push(passo(5, 'Baixar a nova versão do repositório', `
  ${code(`cd ${DIR}
git fetch origin ${BRANCH}

# o que vai entrar nesta atualização:
git log --oneline HEAD..origin/${BRANCH}

git merge --ff-only origin/${BRANCH}
git rev-parse --short HEAD      # NOVA VERSÃO`)}
  ${nota('<span class="mono">--ff-only</span> é proposital: se o servidor tiver commits que não existem no repositório, o comando falha em vez de criar um merge silencioso. Se falhar, investigue antes de forçar.')}
  ${nota('Se a atualização vier de outro branch (por exemplo <span class="mono">main</span>, depois que a versão for promovida), troque o nome do branch nos três comandos e rode <span class="mono">git checkout main</span> antes do merge.')}`))

S.push(passo(6, 'Publicar a interface — por cópia, sem build', `
  <p>O <span class="mono">web/dist</span> <b>não é versionado</b>: o <span class="mono">git pull</span> traz o código novo, mas quem é servido ao navegador é o <span class="mono">dist</span>. Só que <b>não é preciso rodar o Vite no servidor</b>: neste projeto o build é uma cópia — o <span class="mono">dist</span> é o <span class="mono">web/index.html</span> mais tudo o que está em <span class="mono">web/public</span>, sem empacotamento nem renomeação de arquivo. Copiar produz um <span class="mono">dist</span> idêntico, byte a byte.</p>
  ${code(`cd ${DIR}
rm -rf web/dist && mkdir -p web/dist
cp -r web/public/. web/dist/
cp web/index.html web/dist/

# confira: os dois arquivos têm que ser iguais e a data, de agora
cmp web/index.html web/dist/index.html && echo "interface publicada"
ls -lh web/dist/index.html`)}
  ${nota('Leva menos de um segundo, não usa memória e dispensa <span class="mono">node_modules</span> na pasta <span class="mono">web</span> — resolve de vez o build travando na instância pequena do Lightsail.')}
  <p><b>Dependências do servidor.</b> Só reinstale quando elas mudarem de fato nesta versão:</p>
  ${code(`git diff --name-only VERSAO_ANTERIOR HEAD -- server/package.json server/package-lock.json
# se NÃO listar nada, pule o comando abaixo
npm --prefix server install --omit=dev`)}
  ${alerta('<b>Quando o build volta a ser necessário.</b> A cópia equivale ao build enquanto o <span class="mono">web/index.html</span> não usar <span class="mono">&lt;script type="module"&gt;</span> — é isso que faria o Vite empacotar e renomear arquivos. Verifique com <span class="mono">grep -c \'type="module"\' web/index.html</span>: o resultado precisa ser <b>0</b>. Se um dia der diferente de zero, aí sim rode <span class="mono">npm --prefix web install &amp;&amp; npm --prefix web run build</span> nessa atualização. O script da próxima seção faz essa verificação sozinho e interrompe se for o caso.')}`))

S.push(passo(7, 'Reiniciar a aplicação', `
  ${code(`pm2 restart ${APP} --update-env
pm2 save
pm2 status                      # "online" e o contador de restart subiu em 1`)}
  ${nota('<span class="mono">--update-env</span> faz o PM2 reler o <span class="mono">.env</span> — necessário quando alguma variável mudou. <span class="mono">pm2 save</span> mantém o app na lista que volta sozinha depois de um reboot.')}`))

S.push(passo(8, 'Verificar se a atualização funcionou', `
  <p><b>1. Pelo servidor:</b></p>
  ${code(`curl -s http://127.0.0.1:3000/api/health ; echo
#   → {"ok":true,"driver":"pg"}   ← "pg", não "pglite"

pm2 logs ${APP} --lines 30 --nostream    # sem erro nas últimas linhas`)}
  <p><b>2. Pelo navegador,</b> em <b>https://${DOM}</b> — force a recarga sem cache (<span class="mono">Ctrl+F5</span>, ou <span class="mono">Cmd+Shift+R</span> no Mac):</p>
  <ul class="check">
    <li>o cadeado do HTTPS continua válido;</li>
    <li>o login funciona nos três perfis (Loja, fornecedor e revenda);</li>
    <li>a tela que mudou nesta versão está com o comportamento novo;</li>
    <li>uma tela que <b>não</b> mudou continua igual (pedidos, catálogo);</li>
    <li>os dados de antes da atualização continuam lá — pedidos, cotações e cadastros.</li>
  </ul>
  ${alerta('Se a interface parecer a antiga, quase sempre é <b>cache do navegador</b> ou o build do passo 6 não rodou. Confira a data de <span class="mono">web/dist/index.html</span> e recarregue sem cache; em último caso, teste numa janela anônima.')}`))

S.push(passo(9, 'Registrar e comunicar', `
  <ul class="check">
    <li>Anote no controle de mudanças: data e hora, versão anterior e nova (os dois códigos de commit), quem executou e o resultado do teste.</li>
    <li>Avise quem estiver usando a homologação — equipe da Loja, revendas e fornecedores em treinamento — que há versão nova e o que mudou.</li>
    <li>Guarde o caminho do backup: ele é o ponto de retorno até a próxima atualização.</li>
  </ul>`))

const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><style>
  @page { size: A4; margin: 0; }
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:'Segoe UI',Arial,Helvetica,sans-serif; color:#272525; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
  .capa { height:296.5mm; position:relative; background:radial-gradient(900px 500px at 70% -10%, #3a2f1c, #272525 55%, #1c1a18); page-break-after:always; }
  .miolo { padding:13mm 14mm; }
  .passo { break-inside:avoid; margin-bottom:11px; border:1px solid #eae3d6; border-radius:11px; padding:11px 13px; background:#fffdf9; }
  .passo-head { display:flex; align-items:center; gap:10px; margin-bottom:6px; }
  .passo-num { width:26px; height:26px; border-radius:8px; background:linear-gradient(135deg,#cfa055,#B38335 60%,#8a6428); color:#fff; font-weight:800; font-size:12.5px; display:flex; align-items:center; justify-content:center; flex:none; }
  .passo-num.alt { background:linear-gradient(135deg,#6b6459,#3a3227); }
  h2 { font-size:14px; font-weight:800; color:#272525; }
  p { font-size:11px; color:#4a453d; line-height:1.55; margin:5px 0; }
  .code-wrap { margin:7px 0; border-radius:8px; overflow:hidden; border:1px solid #3a3630; }
  .code-title { background:#3a3630; color:#e3bf7e; font-size:9px; font-weight:700; letter-spacing:.06em; padding:4px 10px; text-transform:uppercase; }
  .code { background:#272525; color:#e8e2d6; font-family:Consolas,'Courier New',monospace; font-size:9.5px; line-height:1.55; padding:9px 11px; white-space:pre-wrap; word-break:break-word; }
  .mono { font-family:Consolas,'Courier New',monospace; font-size:.94em; background:#f4f1ea; border-radius:4px; padding:0 4px; }
  .nota { font-size:10px; color:#6d4a10; background:#fdf6e7; border-left:3px solid #e6cf9e; border-radius:0 7px 7px 0; padding:7px 10px; margin:6px 0; line-height:1.55; }
  .alerta { font-size:10px; color:#7a2a1c; background:#fbeae7; border-left:3px solid #d99c8f; border-radius:0 7px 7px 0; padding:7px 10px; margin:6px 0; line-height:1.55; }
  .tbl { width:100%; border-collapse:collapse; margin:6px 0; font-size:10px; }
  .tbl th { text-align:left; background:#272525; color:#e3bf7e; padding:5px 8px; font-size:8.5px; text-transform:uppercase; letter-spacing:.05em; }
  .tbl td { padding:5px 8px; border-bottom:1px solid #eee7d8; color:#4a453d; vertical-align:top; line-height:1.45; }
  .tbl tr:nth-child(even) td { background:#faf7f0; }
  ul.check { margin:5px 0 5px 16px; }
  ul.check li { font-size:10.5px; color:#4a453d; line-height:1.55; margin:3px 0; }
  .sec { font-size:12px; font-weight:800; letter-spacing:.13em; color:#B38335; margin:14px 0 7px; break-after:avoid; }
</style></head><body>

<div class="capa">
  <div style="position:absolute;left:16mm;top:18mm;display:flex;align-items:center;gap:14px">
    <div style="width:50px;height:50px;border-radius:13px;background:linear-gradient(135deg,#cfa055,#B38335 55%,#8a6428);display:flex;align-items:center;justify-content:center;font-family:Georgia,serif;font-weight:700;font-size:21px;color:#fff">CI</div>
    <div><div style="font-family:Georgia,serif;font-weight:700;font-size:15px;letter-spacing:.14em;color:#fff">CIDADE IMPERIAL</div>
    <div style="font-size:10.5px;letter-spacing:.16em;color:#e3bf7e;margin-top:3px">PLATAFORMA DA LOJA</div></div>
  </div>
  <div style="position:absolute;left:16mm;right:16mm;top:72mm">
    <div style="font-size:13px;font-weight:700;letter-spacing:.18em;color:#e3bf7e;margin-bottom:12px">OPERAÇÃO · DEPLOY DE NOVA VERSÃO</div>
    <div style="font-size:40px;font-weight:800;color:#fff;line-height:1.1;letter-spacing:-.5px">Atualizar o ambiente<br>de homologação</div>
    <div style="font-size:14.5px;color:#c9c1b4;margin-top:16px;line-height:1.6;max-width:152mm">Passo a passo para publicar uma nova versão da plataforma na VPS <b style="color:#e8e2d6">AWS Lightsail · Ubuntu</b>, na instalação com <b style="color:#e8e2d6">PM2</b>, <b style="color:#e8e2d6">PostgreSQL</b> no mesmo servidor e <b style="color:#e8e2d6">Nginx com HTTPS</b>. Inclui backup, verificação, retorno à versão anterior e o script que executa tudo com as travas de segurança.</div>
    <div style="margin-top:18px;display:inline-block;background:#ffffff14;border:1px solid #e3bf7e55;border-radius:10px;padding:9px 15px;font-family:Consolas,monospace;font-size:12px;color:#e3bf7e">https://${DOM}</div>
  </div>
  <div style="position:absolute;left:16mm;right:16mm;bottom:34mm;display:flex;gap:6px;flex-wrap:wrap">
    ${[`${DIR}`, `pm2: ${APP}`, 'PostgreSQL local', 'Nginx + Let’s Encrypt', 'Node.js 22 LTS'].map((x) => `<div style="background:#ffffff10;border:1px solid #ffffff22;border-radius:8px;padding:5px 9px;font-family:Consolas,monospace;font-size:9px;color:#e8e2d6">${esc(x)}</div>`).join('')}
  </div>
  <div style="position:absolute;left:16mm;bottom:18mm;right:16mm;font-size:10px;color:#8a8378;line-height:1.6">Complementa o documento “Configuração do Ambiente”, que descreve a instalação inicial. Este aqui trata apenas da atualização de um ambiente já no ar.</div>
</div>

<div class="miolo">
  <div class="sec">PASSO A PASSO MANUAL</div>
  ${S.join('')}

  <div class="sec">RESUMO — OS COMANDOS, EM SEQUÊNCIA</div>
  <div class="passo">
    <p>Para quem já conhece o procedimento. Cada linha corresponde a um passo detalhado acima.</p>
    ${code(`ssh -i ~/chave.pem ubuntu@SEU_IP_PUBLICO
cd ${DIR}

# 1 · estado atual (anote a versão)
pm2 status && curl -s http://127.0.0.1:3000/api/health ; echo
git rev-parse --short HEAD && git status --short

# 2 · backup (cole a URL que está no .env, entre aspas)
pg_dump "postgres://cidadeimperial:SENHA_FORTE@localhost:5432/cidadeimperial" \\
  | gzip > /var/backups/cidadeimperial/pre-deploy-$(date +%F-%H%M).sql.gz

# 3 · nova versão
git fetch origin ${BRANCH}
git log --oneline HEAD..origin/${BRANCH}
git merge --ff-only origin/${BRANCH}

# 4 · publicar a interface por cópia — SEM build
rm -rf web/dist && mkdir -p web/dist
cp -r web/public/. web/dist/ && cp web/index.html web/dist/
cmp web/index.html web/dist/index.html && echo "interface publicada"

# 4b · dependências do servidor: só se package.json/lock mudaram nesta versão
git diff --name-only VERSAO_ANTERIOR HEAD -- server/package.json server/package-lock.json
npm --prefix server install --omit=dev

# 5 · reiniciar e verificar
pm2 restart ${APP} --update-env && pm2 save
curl -s http://127.0.0.1:3000/api/health ; echo
pm2 logs ${APP} --lines 30 --nostream`)}
  </div>

  <div class="sec">ATUALIZAÇÃO PELO SCRIPT (RECOMENDADO)</div>
  <div class="passo">
    <p>O repositório traz <span class="mono">scripts/atualizar-hml.sh</span>, que executa a mesma sequência com as travas que o procedimento manual depende da atenção do operador: aborta se houver alteração local no servidor, aborta se o backup sair vazio, confere o espaço em disco, publica a interface por cópia (sem build), reinstala as dependências do servidor <b>apenas</b> se o <span class="mono">package.json</span> tiver mudado nesta versão, verifica que a cópia ainda equivale ao build, espera o <span class="mono">/api/health</span> responder saudável depois do reinício e, se não responder, imprime os comandos exatos para voltar à versão anterior.</p>
    ${code(`cd ${DIR}
git fetch origin ${BRANCH} && git merge --ff-only origin/${BRANCH}   # 1ª vez: para obter o script
bash scripts/atualizar-hml.sh`)}
    <p>Nas próximas vezes basta a última linha — o próprio script busca a nova versão. Ele aceita ajustes por variável de ambiente, todas com padrão:</p>
    <table class="tbl">
      <tr><th style="width:24%">Variável</th><th style="width:38%">Padrão</th><th>Para quê</th></tr>
      <tr><td class="mono">APP_DIR</td><td class="mono">${DIR}</td><td>Pasta do clone no servidor</td></tr>
      <tr><td class="mono">APP_NAME</td><td class="mono">${APP}</td><td>Nome do processo no PM2</td></tr>
      <tr><td class="mono">BRANCH</td><td class="mono">${BRANCH}</td><td>Branch de onde vem a versão</td></tr>
      <tr><td class="mono">HEALTH_URL</td><td class="mono">http://127.0.0.1:3000/api/health</td><td>Endereço da verificação de saúde</td></tr>
      <tr><td class="mono">BACKUP_DIR</td><td class="mono">/var/backups/cidadeimperial</td><td>Onde o backup é gravado</td></tr>
      <tr><td class="mono">MANTER_BACKUPS</td><td class="mono">14</td><td>Quantos backups manter (apaga os mais antigos)</td></tr>
    </table>
    ${nota('Exemplo, quando a versão for promovida para outro branch:<br><span class="mono">BRANCH=main bash scripts/atualizar-hml.sh</span>')}
    ${nota('O script <b>não</b> reverte sozinho: ele para na falha, preserva o backup e imprime os comandos de retorno. A decisão de voltar é sempre de quem está operando.')}
  </div>

  <div class="sec">VOLTAR À VERSÃO ANTERIOR (ROLLBACK)</div>
  <div class="passo">
    <p><b>Só o código</b> — resolve quase todos os casos, porque a atualização não altera dados:</p>
    ${code(`cd ${DIR}
git reset --hard COMMIT_ANOTADO_NO_PASSO_3
rm -rf web/dist && mkdir -p web/dist
cp -r web/public/. web/dist/ && cp web/index.html web/dist/
pm2 restart ${APP}
curl -s http://127.0.0.1:3000/api/health ; echo`)}
    <p><b>Código e dados</b> — só quando a nova versão tiver corrompido informação; restaurar o banco <b>descarta tudo o que foi feito depois do backup</b>:</p>
    ${code(`pm2 stop ${APP}
gunzip -c /var/backups/cidadeimperial/pre-deploy-AAAA-MM-DD-HHMM.sql.gz \\
  | psql "postgres://cidadeimperial:SENHA_FORTE@localhost:5432/cidadeimperial"
pm2 start ${APP}`)}
    ${alerta('Antes de restaurar, tenha certeza de que o problema é de dados e não de código. Em homologação, a saída mais segura costuma ser voltar só o código e reproduzir o defeito com calma.')}
    ${nota('Se a instância inteira ficar inconsistente, o <b>snapshot do Lightsail</b> permite criar uma nova instância a partir do estado salvo — lembrando de reapontar o IP estático para ela.')}
  </div>

  <div class="sec">CASOS QUE EXIGEM UM PASSO A MAIS</div>
  <div class="passo">
    <table class="tbl">
      <tr><th style="width:26%">Situação</th><th>O que fazer além do procedimento normal</th></tr>
      <tr><td><b>A versão nova pede uma variável nova no .env</b></td><td>Edite o <span class="mono">.env</span> (<span class="mono">nano ${DIR}/.env</span>) antes do reinício e use <span class="mono">pm2 restart ${APP} --update-env</span>. O <span class="mono">.env</span> não é versionado, então o <span class="mono">git pull</span> nunca o sobrescreve — compare com o <span class="mono">.env.example</span> para ver o que surgiu de novo.</td></tr>
      <tr><td><b>A versão nova cria tabela ou coluna</b></td><td>Nada a fazer: o schema é reaplicado na subida, criando apenas o que falta e preservando os dados. Confira depois pelo <span class="mono">/api/health</span> e pelos logs.</td></tr>
      <tr><td><b>Mudança no Nginx (limites, cabeçalhos, rota)</b></td><td><span class="mono">sudo nano /etc/nginx/sites-available/cidadeimperial-hml</span>, depois <span class="mono">sudo nginx -t &amp;&amp; sudo systemctl reload nginx</span>. O <span class="mono">reload</span> não derruba conexões.</td></tr>
      <tr><td><b>Atualização do Node.js</b></td><td>Instale a nova versão pelo NodeSource, rode <span class="mono">rm -rf server/node_modules</span>, reinstale com <span class="mono">npm --prefix server install --omit=dev</span> e reinicie o PM2. A interface não depende do Node para ser publicada.</td></tr>
      <tr><td><b>Pacotes do sistema operacional</b></td><td><span class="mono">sudo apt update &amp;&amp; sudo apt upgrade -y</span> em janela separada da atualização da aplicação. Se pedir reboot, confirme depois que o PM2 voltou sozinho (<span class="mono">pm2 status</span>).</td></tr>
      <tr><td><b>Certificado HTTPS perto de vencer</b></td><td>A renovação é automática. Para conferir: <span class="mono">sudo certbot certificates</span> e <span class="mono">systemctl status certbot.timer</span>. Forçar: <span class="mono">sudo certbot renew --dry-run</span>.</td></tr>
      <tr><td><b>Quer descartar os dados e recomeçar do zero</b></td><td>Situação de homologação, não de produção: pare o app, apague e recrie o banco (<span class="mono">DROP DATABASE</span> / <span class="mono">CREATE DATABASE</span>), garanta <span class="mono">DB_SEED=true</span> no <span class="mono">.env</span> e suba de novo — a carga de demonstração volta.</td></tr>
    </table>
  </div>

  <div class="sec">PROBLEMAS COMUNS</div>
  <div class="passo">
    <table class="tbl">
      <tr><th style="width:32%">Sintoma</th><th>Causa provável e solução</th></tr>
      <tr><td>Erro 502 no navegador depois de atualizar</td><td>A aplicação não subiu. <span class="mono">pm2 logs ${APP} --lines 50</span> mostra o erro real; corrija e <span class="mono">pm2 restart ${APP}</span>.</td></tr>
      <tr><td>A tela continua a antiga</td><td>A cópia do passo 6 não foi feita, ou é cache do navegador. Confira com <span class="mono">cmp web/index.html web/dist/index.html</span> (tem que ser igual) e a data de <span class="mono">web/dist/index.html</span>; depois recarregue com <span class="mono">Ctrl+F5</span>.</td></tr>
      <tr><td><span class="mono">git merge --ff-only</span> falha</td><td>O servidor tem commits próprios ou está em outro branch. <span class="mono">git log --oneline -5</span> e <span class="mono">git branch --show-current</span> mostram a situação; alinhe antes de forçar qualquer coisa.</td></tr>
      <tr><td><span class="mono">npm install</span> do servidor trava</td><td>Memória insuficiente na instância. Crie um arquivo de swap uma única vez:<br><span class="mono">sudo fallocate -l 2G /swapfile &amp;&amp; sudo chmod 600 /swapfile &amp;&amp; sudo mkswap /swapfile &amp;&amp; sudo swapon /swapfile</span><br>e torne permanente com <span class="mono">/swapfile none swap sw 0 0</span> no <span class="mono">/etc/fstab</span>. Sem build da interface, isso raramente é necessário.</td></tr>
      <tr><td><span class="mono">/api/health</span> devolve <span class="mono">"ok":false</span></td><td>PostgreSQL fora do ar: <span class="mono">sudo systemctl status postgresql</span> e, se preciso, <span class="mono">sudo systemctl restart postgresql</span>.</td></tr>
      <tr><td><span class="mono">"driver":"pglite"</span> depois de atualizar</td><td><span class="mono">DATABASE_URL</span> ausente ou com erro no <span class="mono">.env</span> — a aplicação caiu no banco embutido e <b>não</b> está lendo os dados reais. Corrija e reinicie com <span class="mono">--update-env</span>.</td></tr>
      <tr><td><span class="mono">pm2: command not found</span></td><td>Você está com outro usuário (ou como <span class="mono">root</span>). Volte para o usuário dono de <span class="mono">${DIR}</span>.</td></tr>
      <tr><td>Não volta depois de um reboot</td><td>Faltou <span class="mono">pm2 save</span>, ou o comando impresso por <span class="mono">pm2 startup systemd</span> nunca foi executado.</td></tr>
      <tr><td>Disco cheio</td><td><span class="mono">du -sh ${DIR}/logs /var/backups/cidadeimperial</span>. Rotacione os logs (<span class="mono">pm2 flush</span>) e apague backups antigos.</td></tr>
    </table>
  </div>

  <div class="sec">CHECKLIST DA ATUALIZAÇÃO</div>
  <div class="passo">
    <table class="tbl">
      <tr><th style="width:70%">Item</th><th style="width:15%">Feito</th><th style="width:15%">Observação</th></tr>
      ${['Estado atual conferido e versão anterior anotada',
         'git status limpo, sem alteração local no servidor',
         'Backup do banco gerado e com tamanho maior que zero',
         'Commits que entram na versão revisados (git log HEAD..origin)',
         'Interface publicada por cópia — cmp web/index.html web/dist/index.html sem diferença',
         'Dependências do servidor reinstaladas apenas se o package.json mudou',
         'PM2 reiniciado e pm2 save executado',
         '/api/health devolvendo {"ok":true,"driver":"pg"}',
         'Logs sem erro nas últimas linhas',
         'Login testado nos três perfis pelo navegador',
         'Tela que mudou conferida e tela que não mudou conferida',
         'Dados anteriores continuam presentes',
         'Atualização registrada no controle de mudanças',
         'Usuários da homologação avisados'].map((i) => `<tr><td>${esc(i)}</td><td style="text-align:center">☐</td><td></td></tr>`).join('')}
    </table>
    <p style="margin-top:8px">Executado por: _______________________________  ·  Versão anterior: ____________  ·  Versão nova: ____________  ·  Data: ____/____/______  ·  Hora: ______</p>
  </div>
</div>
</body></html>`

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true })
const page = await browser.newPage()
await page.setContent(html, { waitUntil: 'networkidle' })
await page.pdf({ path: OUT, format: 'A4', printBackground: true, margin: { top: 0, bottom: 0, left: 0, right: 0 } })
await browser.close()
console.log('PDF ok:', OUT)
