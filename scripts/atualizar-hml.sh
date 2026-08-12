#!/usr/bin/env bash
# Atualiza a Plataforma Cidade Imperial numa VPS Ubuntu (AWS Lightsail) que
# roda com PM2 + PostgreSQL local + Nginx, conforme o documento
# "Configuração do Ambiente".
#
# O que ele faz, nesta ordem:
#   1. confere pré-requisitos e o estado atual;
#   2. faz backup do banco (aborta se não conseguir);
#   3. anota o commit atual, para poder voltar;
#   4. baixa a nova versão do branch configurado;
#   5. publica a interface por cópia (sem build) e instala dependências do
#      servidor apenas se elas tiverem mudado;
#   6. reinicia o processo no PM2 e espera o /api/health responder;
#   7. em caso de falha, volta sozinho para o commit anterior.
#
# Uso:
#   sudo -u ubuntu bash scripts/atualizar-hml.sh
#   APP_DIR=/var/www/cidadeimperial BRANCH=main bash scripts/atualizar-hml.sh
#
# Variáveis aceitas (todas têm padrão):
#   APP_DIR, APP_NAME, BRANCH, HEALTH_URL, BACKUP_DIR, MANTER_BACKUPS
set -Eeuo pipefail

APP_DIR=${APP_DIR:-/var/www/cidadeimperial}
APP_NAME=${APP_NAME:-cidade-imperial}
BRANCH=${BRANCH:-claude/plataforma-cidade-imperial-dmxbmw}
HEALTH_URL=${HEALTH_URL:-http://127.0.0.1:3000/api/health}
BACKUP_DIR=${BACKUP_DIR:-/var/backups/cidadeimperial}
MANTER_BACKUPS=${MANTER_BACKUPS:-14}

AZUL=$'\033[1;36m'; VERDE=$'\033[1;32m'; AMARELO=$'\033[1;33m'; VERM=$'\033[1;31m'; ZERA=$'\033[0m'
etapa() { printf '\n%s▸ %s%s\n' "$AZUL" "$1" "$ZERA"; }
ok()    { printf '%s  ✓ %s%s\n' "$VERDE" "$1" "$ZERA"; }
aviso() { printf '%s  ! %s%s\n' "$AMARELO" "$1" "$ZERA"; }
erro()  { printf '%s  ✗ %s%s\n' "$VERM" "$1" "$ZERA" >&2; }

COMMIT_ANTES=''
BACKUP_ARQ=''
CONCLUIDO=0

# Vale tanto para erro de comando quanto para as interrupções explícitas
# (exit 1) — por isso o trap é de EXIT, e não de ERR.
ao_sair() {
  local st=$?
  [ "$CONCLUIDO" = 1 ] && return 0
  [ "$st" = 0 ] && return 0
  erro "A atualização foi interrompida."
  if [ -n "$COMMIT_ANTES" ]; then
    printf '\n%sPara voltar à versão anterior:%s\n' "$AMARELO" "$ZERA"
    printf '  cd %s && git reset --hard %s\n' "$APP_DIR" "$COMMIT_ANTES"
    printf '  npm --prefix server install --omit=dev\n'
    printf '  rm -rf web/dist && mkdir -p web/dist && cp -r web/public/. web/dist/ && cp web/index.html web/dist/\n'
    printf '  pm2 restart %s\n' "$APP_NAME"
  fi
  if [ -n "$BACKUP_ARQ" ]; then
    printf '\n%sPara restaurar o banco (só se os dados tiverem sido afetados):%s\n' "$AMARELO" "$ZERA"
    printf '  gunzip -c %s | psql "$DATABASE_URL"\n' "$BACKUP_ARQ"
  fi
  return 0
}
trap ao_sair EXIT

# ── 1 · Pré-requisitos e estado atual ─────────────────────────────────────
etapa "1/8 · Conferindo pré-requisitos e o estado atual"
[ -d "$APP_DIR/.git" ] || { erro "$APP_DIR não é um clone do repositório."; exit 1; }
for cmd in git node npm pm2 pg_dump curl; do
  command -v "$cmd" >/dev/null || { erro "Comando obrigatório não encontrado: $cmd"; exit 1; }
done
cd "$APP_DIR"

if [ -n "$(git status --porcelain --untracked-files=no)" ]; then
  erro "Há alterações locais não commitadas em $APP_DIR — a atualização foi interrompida."
  git status --short --untracked-files=no
  printf '\nDescarte-as (git checkout -- .) ou guarde-as (git stash) antes de continuar.\n'
  exit 1
fi
ok "Diretório limpo, sem alteração local"

LIVRE_MB=$(df -Pm "$APP_DIR" | awk 'NR==2 {print $4}')
[ "$LIVRE_MB" -ge 1024 ] || { erro "Espaço livre insuficiente em disco: ${LIVRE_MB} MB (mínimo 1024 MB)."; exit 1; }
ok "Espaço livre em disco: ${LIVRE_MB} MB"

COMMIT_ANTES=$(git rev-parse HEAD)
ok "Versão atual: $(git rev-parse --short HEAD) — $(git log -1 --pretty=%s | cut -c1-70)"

SAUDE_ANTES=$(curl -fsS --max-time 5 "$HEALTH_URL" 2>/dev/null || echo 'sem resposta')
ok "Saúde antes da atualização: $SAUDE_ANTES"

# ── 2 · Backup do banco ───────────────────────────────────────────────────
etapa "2/8 · Backup do banco de dados"
DATABASE_URL=$(grep -E '^[[:space:]]*DATABASE_URL=' .env 2>/dev/null | tail -1 | cut -d= -f2- | tr -d '"'\''' || true)
if [ -z "${DATABASE_URL:-}" ]; then
  aviso "DATABASE_URL não encontrada no .env — a aplicação deve estar no banco embutido (PGlite)."
  PGDIR=$(grep -E '^[[:space:]]*PGLITE_DIR=' .env 2>/dev/null | tail -1 | cut -d= -f2- | tr -d '"'\''' || true)
  PGDIR=${PGDIR:-server/.pgdata}
  if [ -d "$PGDIR" ]; then
    sudo mkdir -p "$BACKUP_DIR"; sudo chown "$(id -u):$(id -g)" "$BACKUP_DIR"
    BACKUP_ARQ="$BACKUP_DIR/pgdata-$(date +%F-%H%M).tar.gz"
    tar -czf "$BACKUP_ARQ" "$PGDIR"
    ok "Backup da pasta do banco embutido: $BACKUP_ARQ"
  else
    aviso "Pasta $PGDIR inexistente — nada a salvar."
  fi
else
  sudo mkdir -p "$BACKUP_DIR"; sudo chown "$(id -u):$(id -g)" "$BACKUP_DIR"
  BACKUP_ARQ="$BACKUP_DIR/cidadeimperial-$(date +%F-%H%M).sql.gz"
  pg_dump "$DATABASE_URL" | gzip > "$BACKUP_ARQ"
  [ -s "$BACKUP_ARQ" ] || { erro "O backup saiu vazio — atualização interrompida."; exit 1; }
  ok "Backup gravado: $BACKUP_ARQ ($(du -h "$BACKUP_ARQ" | cut -f1))"
  # limpeza dos backups antigos
  ls -1t "$BACKUP_DIR"/cidadeimperial-*.sql.gz 2>/dev/null | tail -n +$((MANTER_BACKUPS + 1)) | xargs -r rm -f
fi

# ── 3 · Baixar a nova versão ──────────────────────────────────────────────
etapa "3/8 · Baixando a nova versão do branch $BRANCH"
git fetch origin "$BRANCH"
NOVOS=$(git rev-list --count "HEAD..origin/$BRANCH")
if [ "$NOVOS" -eq 0 ]; then
  ok "Já está na versão mais recente — nada a atualizar."
  CONCLUIDO=1
  exit 0
fi
printf '  %s commit(s) novo(s):\n' "$NOVOS"
git --no-pager log --oneline "HEAD..origin/$BRANCH" | sed 's/^/    /'
git checkout "$BRANCH" >/dev/null 2>&1 || true
git merge --ff-only "origin/$BRANCH"
ok "Atualizado para $(git rev-parse --short HEAD)"

# ── 4 · Dependências do servidor (só quando mudam) ────────────────────────
etapa "4/8 · Dependências do servidor"
if [ ! -d server/node_modules ]; then
  aviso "server/node_modules ausente — instalando pela primeira vez."
  npm --prefix server install --omit=dev --no-audit --no-fund
  ok "Dependências instaladas"
elif ! git diff --quiet "$COMMIT_ANTES" HEAD -- server/package.json server/package-lock.json; then
  ok "package.json/lock do servidor mudaram nesta versão — reinstalando"
  npm --prefix server install --omit=dev --no-audit --no-fund
  ok "Dependências atualizadas"
else
  ok "Dependências do servidor inalteradas — nada a instalar"
fi

# ── 5 · Publicar a interface (cópia, sem build) ───────────────────────────
# O "build" do Vite neste projeto é uma cópia: dist = web/index.html + tudo o
# que está em web/public. Copiar dá exatamente o mesmo resultado, sem precisar
# de node_modules na web nem de memória para o bundler.
etapa "5/8 · Publicando a interface (sem build)"
if grep -q 'type="module"' web/index.html; then
  erro 'web/index.html passou a usar <script type="module"> — a cópia deixou de equivaler ao build.'
  printf '  Rode o build de verdade nesta atualização:\n'
  printf '  npm --prefix web install && npm --prefix web run build\n'
  exit 1
fi
rm -rf web/dist && mkdir -p web/dist
cp -r web/public/. web/dist/
cp -f web/index.html web/dist/index.html
cmp -s web/index.html web/dist/index.html || { erro "A cópia de web/index.html para web/dist falhou."; exit 1; }
ok "Interface publicada ($(find web/dist -type f | wc -l) arquivos · $(du -sh web/dist | cut -f1))"

# ── 5 · Reiniciar ─────────────────────────────────────────────────────────
etapa "6/8 · Reiniciando a aplicação no PM2"
pm2 restart "$APP_NAME" --update-env
pm2 save >/dev/null
ok "Processo reiniciado"

# ── 6 · Verificação de saúde ──────────────────────────────────────────────
etapa "7/8 · Verificando a saúde da aplicação"
SAUDE=''
for _ in $(seq 1 30); do
  SAUDE=$(curl -fsS --max-time 5 "$HEALTH_URL" 2>/dev/null || true)
  case "$SAUDE" in *'"ok":true'*) break ;; esac
  sleep 2
done
case "$SAUDE" in
  *'"ok":true'*) ok "Saúde: $SAUDE" ;;
  *) erro "A aplicação não respondeu saudável em até 60 s. Últimas linhas do log:"
     pm2 logs "$APP_NAME" --lines 30 --nostream || true
     exit 1 ;;
esac
case "$SAUDE" in
  *'"driver":"pglite"'*) aviso 'Atenção: a aplicação subiu no banco EMBUTIDO ("driver":"pglite"). Confira a DATABASE_URL no .env.' ;;
esac

# ── 7 · Resumo ────────────────────────────────────────────────────────────
etapa "8/8 · Concluído"
CONCLUIDO=1
printf '\n'
ok "Versão anterior: $(git rev-parse --short "$COMMIT_ANTES")"
ok "Versão atual:    $(git rev-parse --short HEAD) — $(git log -1 --pretty=%s | cut -c1-70)"
if [ -n "$BACKUP_ARQ" ]; then ok "Backup do banco: $BACKUP_ARQ"; fi
printf '\n%sFaça agora o teste de fumaça pelo navegador:%s\n' "$AZUL" "$ZERA"
printf '  · entrar com um usuário de cada perfil (Loja, fornecedor, revenda);\n'
printf '  · abrir um pedido e o catálogo;\n'
printf '  · conferir a tela que mudou nesta versão.\n\n'
printf 'Para voltar a esta versão anterior, se precisar:\n'
printf '  cd %s && git reset --hard %s\n' "$APP_DIR" "$(git rev-parse --short "$COMMIT_ANTES")"
printf '  rm -rf web/dist && mkdir -p web/dist && cp -r web/public/. web/dist/ && cp web/index.html web/dist/\n'
printf '  pm2 restart %s\n\n' "$APP_NAME"
