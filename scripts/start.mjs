#!/usr/bin/env node
// Início por um único comando, sem Docker.
//   npm start
// Instala dependências (só na primeira vez), compila a web e inicia a API.
// Banco: PGlite (PostgreSQL embutido) por padrão, ou o seu PostgreSQL se
// DATABASE_URL estiver definida.
import { spawnSync, spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const web = resolve(root, 'web')
const server = resolve(root, 'server')
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm'

function run(cmd, args, cwd) {
  const r = spawnSync(cmd, args, { cwd, stdio: 'inherit' })
  if (r.status !== 0) {
    console.error(`\nFalhou: ${cmd} ${args.join(' ')} (em ${cwd})`)
    process.exit(r.status || 1)
  }
}

// 1. Dependências (apenas se ainda não instaladas)
if (!existsSync(resolve(web, 'node_modules'))) {
  console.log('▶ Instalando dependências da web…')
  run(npm, ['install'], web)
}
if (!existsSync(resolve(server, 'node_modules'))) {
  console.log('▶ Instalando dependências do servidor…')
  run(npm, ['install'], server)
}

// 2. Build da web (rápido; garante que dist reflete o código atual)
console.log('▶ Compilando a interface…')
run(npm, ['run', 'build'], web)

// 3. API (serve a web e o banco); repassa sinais para encerrar limpo
console.log('▶ Iniciando a plataforma…\n')
const child = spawn('node', ['src/index.js'], { cwd: server, stdio: 'inherit' })
const stop = () => child.kill('SIGINT')
process.on('SIGINT', stop)
process.on('SIGTERM', stop)
child.on('exit', (code) => process.exit(code ?? 0))
