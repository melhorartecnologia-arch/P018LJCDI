// Autenticação — fica no servidor, de propósito.
//
// Antes, a verificação da senha acontecia no navegador: o estado inteiro da
// plataforma (inclusive o hash da senha de todo mundo) era entregue ao cliente,
// e bastava comparar. Qualquer pessoa com acesso à aplicação levava a lista
// completa de hashes embora.
//
// Agora o hash nunca sai daqui. O cliente manda e-mail e senha, o servidor
// responde apenas "entra" ou "não entra".
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'

const SCRYPT = { N: 16384, r: 8, p: 1, keylen: 32 }

// Hash antigo, gerado no navegador (cyrb53). Só existe para reconhecer as senhas
// gravadas antes desta mudança — toda senha conferida por aqui é regravada em
// scrypt no mesmo acesso, e o formato antigo desaparece sozinho da base.
export function hashLegado(str) {
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i)
    h1 = Math.imul(h1 ^ ch, 2654435761)
    h2 = Math.imul(h2 ^ ch, 1597334677)
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507); h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507); h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909)
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16)
}

export const ehLegado = (armazenado) => !String(armazenado || '').startsWith('scrypt$')

// scrypt com sal por usuário: senhas iguais geram hashes diferentes, e o custo
// de cada tentativa torna a força bruta cara mesmo com a base em mãos.
export function hashSenha(senha) {
  const sal = randomBytes(16).toString('hex')
  const dk = scryptSync(String(senha), sal, SCRYPT.keylen, SCRYPT)
  return ['scrypt', SCRYPT.N, SCRYPT.r, SCRYPT.p, sal, dk.toString('hex')].join('$')
}

export function conferirSenha(senha, armazenado) {
  const s = String(armazenado || '')
  if (!s) return false
  if (ehLegado(s)) {
    // comparação do formato antigo: tamanho fixo, sem segredo a vazar por tempo
    const a = Buffer.from(hashLegado(String(senha))), b = Buffer.from(s)
    return a.length === b.length && timingSafeEqual(a, b)
  }
  const [, N, r, p, sal, hex] = s.split('$')
  let dk
  try { dk = scryptSync(String(senha), sal, SCRYPT.keylen, { N: +N, r: +r, p: +p }) } catch { return false }
  const alvo = Buffer.from(hex, 'hex')
  return dk.length === alvo.length && timingSafeEqual(dk, alvo)
}

// ── Política de senha ────────────────────────────────────────────────────────
// Mínimo que vale a pena cobrar sem empurrar o usuário para o post-it: tamanho,
// variedade e proibição do óbvio (o próprio e-mail, sequências, "senha123").
export const SENHA_MIN = 10
const OBVIAS = ['senha', 'password', 'cidadeimperial', 'cidade imperial', 'imperial',
  'qwerty', 'asdf', '123456', '12345678', 'abcdef', 'admin', 'teste', 'mudar123']

export function erroSenha(senha, email) {
  const s = String(senha || '')
  if (s.trim().length !== s.length) return 'A senha não pode começar nem terminar com espaço.'
  if (s.length < SENHA_MIN) return `A senha deve ter ao menos ${SENHA_MIN} caracteres.`
  if (s.length > 200) return 'A senha é longa demais.'
  if (!/[A-Za-zÀ-ÿ]/.test(s)) return 'A senha deve conter ao menos uma letra.'
  if (!/[0-9]/.test(s)) return 'A senha deve conter ao menos um número.'
  if (!/[^A-Za-z0-9]/.test(s) && !/[A-Z]/.test(s))
    return 'A senha deve conter ao menos uma letra maiúscula ou um caractere especial.'
  const baixa = s.toLowerCase()
  if (OBVIAS.some((o) => baixa.includes(o))) return 'A senha contém um termo comum demais — escolha outra.'
  const local = String(email || '').split('@')[0].toLowerCase()
  if (local.length >= 4 && baixa.includes(local)) return 'A senha não pode conter o seu e-mail.'
  if (/^(.)\1+$/.test(s)) return 'A senha não pode ser um único caractere repetido.'
  return null
}

// Senha inicial gerada pela plataforma: sempre dentro da política acima.
export function gerarSenha() {
  const mai = 'ABCDEFGHJKLMNPQRSTUVWXYZ', min = 'abcdefghijkmnopqrstuvwxyz', dig = '23456789', esp = '!@#$%&*?'
  const pick = (s) => s[randomBytes(1)[0] % s.length]
  const corpo = [pick(mai), pick(esp), ...Array.from({ length: 6 }, () => pick(min)),
    ...Array.from({ length: 4 }, () => pick(dig))]
  // embaralha sem deixar o primeiro caractere previsível
  for (let i = corpo.length - 1; i > 0; i--) {
    const j = randomBytes(1)[0] % (i + 1); [corpo[i], corpo[j]] = [corpo[j], corpo[i]]
  }
  return corpo.join('')
}

// ── Bloqueio por tentativas ──────────────────────────────────────────────────
// Erros seguidos travam a conta por um tempo que cresce — suficiente para matar
// a força bruta sem transformar um erro de digitação em chamado de suporte.
export const MAX_TENTATIVAS = 5
const ESPERA_MIN = [1, 5, 15, 30, 60] // minutos, por bloqueio consecutivo

export function minutosDeEspera(bloqueios) {
  return ESPERA_MIN[Math.min(bloqueios, ESPERA_MIN.length - 1)]
}

export function travaAtiva(bloq) {
  if (!bloq || !bloq.ate) return 0
  const resta = new Date(bloq.ate).getTime() - Date.now()
  return resta > 0 ? Math.ceil(resta / 60000) : 0
}

// ── Sessões ──────────────────────────────────────────────────────────────────
// Token opaco, em memória, com validade. Protege as operações de senha; some
// quando o servidor reinicia, e aí basta entrar de novo.
const SESSOES = new Map()
export const SESSAO_HORAS = 12

export function criarSessao(usuario) {
  const token = randomBytes(32).toString('hex')
  SESSOES.set(token, { usuarioId: usuario.id, papel: usuario.papel, email: usuario.email,
    expiraEm: Date.now() + SESSAO_HORAS * 3600 * 1000 })
  return token
}

export function lerSessao(token) {
  const s = SESSOES.get(String(token || ''))
  if (!s) return null
  if (s.expiraEm < Date.now()) { SESSOES.delete(token); return null }
  return s
}

export function encerrarSessao(token) { SESSOES.delete(String(token || '')) }

export function encerrarSessoesDe(usuarioId) {
  for (const [t, s] of SESSOES) if (s.usuarioId === usuarioId) SESSOES.delete(t)
}

// ── Freio por origem ─────────────────────────────────────────────────────────
// O bloqueio por conta não cobre quem varre e-mails diferentes. Este conta as
// tentativas por origem, em janela deslizante, sem guardar nada em disco.
const JANELA_MS = 10 * 60 * 1000
const MAX_POR_ORIGEM = 30
const ORIGENS = new Map()

export function freioOrigem(ip) {
  const agora = Date.now()
  const lista = (ORIGENS.get(ip) || []).filter((t) => agora - t < JANELA_MS)
  lista.push(agora)
  ORIGENS.set(ip, lista)
  if (ORIGENS.size > 5000) for (const [k, v] of ORIGENS) if (!v.some((t) => agora - t < JANELA_MS)) ORIGENS.delete(k)
  return lista.length > MAX_POR_ORIGEM
}

export function limparFreio(ip) { ORIGENS.delete(ip) }
