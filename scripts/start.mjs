#!/usr/bin/env node
// Início por um único comando, sem Docker.
//   npm start
// Instala dependências (só na primeira vez), compila a web e inicia a API.
// Banco: PGlite (PostgreSQL embutido) por padrão, ou o seu PostgreSQL se
// DATABASE_URL / PG* estiverem definidas.
import { spawnSync, spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const web = resolve(root, 'web')
const server = resolve(root, 'server')

// Executa um comando de shell. `shell: true` é essencial no Windows, onde o Node
// não executa `npm.cmd`/`.bat` diretamente sem shell.
function run(command, cwd, label) {
  const r = spawnSync(command, { cwd, stdio: 'inherit', shell: true })
  if (r.error) console.error(r.error.message)
  if (r.status !== 0) {
    console.error(`\n✖ Falhou ao ${label}.`)
    console.error(`  Comando: ${command}`)
    console.error(`  Pasta:   ${cwd}`)
    console.error('  Rode o comando acima manualmente nessa pasta para ver o erro completo.')
    process.exit(r.status || 1)
  }
}

// Instala se a pasta node_modules não existe OU se um pacote essencial falta
// (instalação anterior incompleta).
function needsInstall(dir, probe) {
  return !existsSync(resolve(dir, 'node_modules')) || !existsSync(resolve(dir, 'node_modules', probe))
}

if (needsInstall(web, 'vite')) {
  console.log('▶ Instalando dependências da web…')
  run('npm install', web, 'instalar as dependências da web')
}
if (needsInstall(server, 'express')) {
  console.log('▶ Instalando dependências do servidor…')
  run('npm install', server, 'instalar as dependências do servidor')
}

// Compila a web (rápido; garante que dist reflete o código atual)
console.log('▶ Compilando a interface…')
run('npm run build', web, 'compilar a interface')

// API (serve a web e o banco); repassa sinais para encerrar limpo.
console.log('▶ Iniciando a plataforma…\n')
const child = spawn(process.execPath, ['src/index.js'], { cwd: server, stdio: 'inherit' })
const stop = () => child.kill('SIGINT')
process.on('SIGINT', stop)
process.on('SIGTERM', stop)
child.on('exit', (code) => process.exit(code ?? 0))
