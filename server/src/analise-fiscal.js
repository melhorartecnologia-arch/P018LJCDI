// Análise do documento fiscal anexado ao registro de faturamento.
//
// O fornecedor é obrigado a anexar o PDF ou o XML do documento fiscal emitido
// para a revenda. Este módulo verifica se o documento de fato se refere ao
// pedido que está sendo faturado e devolve um veredito imediato:
//   { aceito: boolean, confianca: 'alta'|'media'|'baixa', motivo: string, engine: 'claude'|'local' }
//
// Dois motores:
//  - 'claude': quando há credencial da API Anthropic (ANTHROPIC_API_KEY), o
//    documento (PDF como bloco `document` base64; XML como texto) é analisado
//    pelo modelo claude-opus-4-8 junto com o contexto do pedido.
//  - 'local': sem credencial, um analisador local extrai os dados do XML da
//    NF-e (emitente, destinatário, itens, valor total) ou o texto do PDF e
//    confere contra o pedido. Sem dependências externas.

import { inflateSync } from 'node:zlib'

export const claudeDisponivel = () => !!process.env.ANTHROPIC_API_KEY

export function engineAtual() {
  return claudeDisponivel() ? 'claude' : 'local'
}

// ── Utilitários de normalização ──────────────────────────────────────────────
const semAcento = (s) =>
  String(s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()

const soDigitos = (s) => String(s || '').replace(/\D/g, '')

// Palavras significativas de um nome (ignora conectivos curtos)
const tokens = (s) =>
  semAcento(s)
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 3 && !['ltda', 'eireli', 'epp', 'mei', 'sa', 'dos', 'das', 'the'].includes(t))

function nomeBate(nomeEsperado, texto) {
  const ts = tokens(nomeEsperado)
  if (!ts.length) return false
  const alvo = semAcento(texto)
  const achados = ts.filter((t) => alvo.includes(t))
  return achados.length >= Math.ceil(ts.length / 2)
}

// Um valor monetário pode aparecer como 3.720,00 / 3720.00 / 3720,00 / 3720
function valorAparece(valor, texto) {
  const v = Math.round(Number(valor) * 100) / 100
  const inteiro = Math.trunc(v)
  const cents = Math.round((v - inteiro) * 100)
  const c2 = String(cents).padStart(2, '0')
  const milharBr = inteiro.toLocaleString('pt-BR') // 3.720
  const formas = [
    `${milharBr},${c2}`,
    `${inteiro},${c2}`,
    `${inteiro}.${c2}`,
    cents === 0 ? `${milharBr}` : null,
  ].filter(Boolean)
  return formas.some((f) => texto.includes(f))
}

// ── Extração do XML de NF-e ──────────────────────────────────────────────────
function blocoXml(xml, tag) {
  const m = xml.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, 'i'))
  return m ? m[1] : null
}
function campoXml(xml, tag) {
  const b = blocoXml(xml || '', tag)
  return b == null ? null : b.replace(/<[^>]+>/g, ' ').trim()
}

export function extrairNfe(xml) {
  const emit = blocoXml(xml, 'emit') || ''
  const dest = blocoXml(xml, 'dest') || ''
  const itens = []
  const reDet = /<det(?:\s[^>]*)?>([\s\S]*?)<\/det>/gi
  let m
  while ((m = reDet.exec(xml))) {
    itens.push({
      descricao: campoXml(m[1], 'xProd') || '',
      qtd: Number(campoXml(m[1], 'qCom') || 0),
      valor: Number(campoXml(m[1], 'vProd') || 0),
    })
  }
  return {
    ehNfe: /<(?:NFe|nfeProc|infNFe)[\s>]/i.test(xml),
    emitNome: campoXml(emit, 'xNome') || '',
    emitCnpj: soDigitos(campoXml(emit, 'CNPJ') || ''),
    destNome: campoXml(dest, 'xNome') || '',
    destCnpj: soDigitos(campoXml(dest, 'CNPJ') || ''),
    itens,
    total: Number(campoXml(xml, 'vNF') || 0) || null,
    numero: campoXml(xml, 'nNF') || null,
  }
}

// ── Extração de texto de PDF (streams FlateDecode + operadores Tj/TJ) ────────
export function extrairTextoPdf(buf) {
  const src = buf.toString('latin1')
  const pedacos = []
  const reStream = /stream\r?\n([\s\S]*?)endstream/g
  let m
  while ((m = reStream.exec(src))) {
    let conteudo = m[1]
    try {
      conteudo = inflateSync(Buffer.from(m[1], 'latin1')).toString('latin1')
    } catch {
      /* stream não comprimido ou outro filtro: usa como está */
    }
    // Strings entre parênteses seguidas dos operadores de texto Tj/TJ/'
    const reTxt = /\(((?:[^()\\]|\\.)*)\)\s*(?:Tj|TJ|')/g
    let t
    while ((t = reTxt.exec(conteudo))) {
      pedacos.push(
        t[1]
          .replace(/\\([nrtbf()\\])/g, (_, c) => ({ n: '\n', r: '\r', t: '\t', b: '', f: '' }[c] ?? c))
          .replace(/\\(\d{1,3})/g, (_, o) => String.fromCharCode(parseInt(o, 8)))
      )
    }
    // Arrays de texto: [(abc) -12 (def)] TJ
    const reArr = /\[((?:[^\[\]\\]|\\.)*)\]\s*TJ/g
    while ((t = reArr.exec(conteudo))) {
      const inner = t[1]
      const reS = /\(((?:[^()\\]|\\.)*)\)/g
      let s
      while ((s = reS.exec(inner))) pedacos.push(s[1].replace(/\\([()\\])/g, '$1'))
    }
  }
  return pedacos.join(' ').replace(/\s+/g, ' ').trim()
}

// ── Motor local ──────────────────────────────────────────────────────────────
// `pedido`: { pedidoId, valor, fornecedorNome, fornecedorCnpj, revendaNome,
//             revendaCnpj, itens: [{ descricao, qtd }] }
function analisarLocalXml(xmlTexto, pedido) {
  const nfe = extrairNfe(xmlTexto)
  if (!nfe.ehNfe && !nfe.destNome && !nfe.emitNome && !nfe.itens.length) {
    return {
      aceito: false,
      confianca: 'alta',
      motivo: 'O arquivo XML não parece ser um documento fiscal (NF-e): não foram encontrados emitente, destinatário nem itens.',
    }
  }

  const problemas = []
  const pontos = []

  // Destinatário deve ser a revenda
  const cnpjRev = soDigitos(pedido.revendaCnpj)
  const destOk =
    (cnpjRev && nfe.destCnpj && nfe.destCnpj === cnpjRev) ||
    nomeBate(pedido.revendaNome, nfe.destNome)
  if (destOk) pontos.push('destinatário confere com a revenda')
  else
    problemas.push(
      `o destinatário do documento ("${nfe.destNome || 'não identificado'}"${nfe.destCnpj ? ', CNPJ ' + nfe.destCnpj : ''}) não confere com a revenda do pedido ("${pedido.revendaNome}")`
    )

  // Emitente deve ser o fornecedor
  const cnpjForn = soDigitos(pedido.fornecedorCnpj)
  const emitOk =
    (cnpjForn && nfe.emitCnpj && nfe.emitCnpj === cnpjForn) ||
    nomeBate(pedido.fornecedorNome, nfe.emitNome)
  if (emitOk) pontos.push('emitente confere com o fornecedor')
  else
    problemas.push(
      `o emitente do documento ("${nfe.emitNome || 'não identificado'}") não confere com o fornecedor ("${pedido.fornecedorNome}")`
    )

  // Valor total próximo do informado (tolerância de 5%)
  const valor = Number(pedido.valor) || 0
  let valorOk = null
  if (nfe.total != null && valor > 0) {
    valorOk = Math.abs(nfe.total - valor) <= valor * 0.05
    if (valorOk) pontos.push(`valor total do documento (R$ ${nfe.total.toFixed(2)}) compatível com o informado`)
    else
      problemas.push(
        `o valor total do documento (R$ ${nfe.total.toFixed(2)}) diverge do valor informado no faturamento (R$ ${valor.toFixed(2)})`
      )
  }

  // Itens do pedido presentes no documento
  const itensPed = Array.isArray(pedido.itens) ? pedido.itens : []
  let itensOk = null
  if (itensPed.length && nfe.itens.length) {
    const descDoc = nfe.itens.map((i) => i.descricao).join(' | ')
    const achados = itensPed.filter((i) => nomeBate(i.descricao, descDoc))
    itensOk = achados.length >= Math.ceil(itensPed.length / 2)
    if (itensOk) pontos.push(`${achados.length} de ${itensPed.length} item(ns) do pedido identificados no documento`)
    else
      problemas.push(
        `os itens do documento não correspondem aos itens do pedido (apenas ${achados.length} de ${itensPed.length} identificados)`
      )
  }

  const aceito = destOk && emitOk && valorOk !== false && itensOk !== false
  const confianca = aceito
    ? (valorOk && itensOk ? 'alta' : 'media')
    : (problemas.length >= 2 ? 'alta' : 'media')
  const motivo = aceito
    ? `Documento compatível com o pedido ${pedido.pedidoId}: ${pontos.join('; ')}.`
    : `Documento recusado como evidência do pedido ${pedido.pedidoId}: ${problemas.join('; ')}.`
  return { aceito, confianca, motivo }
}

function analisarLocalPdf(buf, pedido) {
  const texto = extrairTextoPdf(buf)
  if (texto.length < 40) {
    return {
      aceito: false,
      confianca: 'media',
      motivo:
        'Não foi possível ler o conteúdo do PDF (provavelmente digitalizado/imagem). Anexe o XML da NF-e, ou habilite a análise por IA configurando a variável ANTHROPIC_API_KEY no servidor.',
    }
  }
  const problemas = []
  const pontos = []

  const cnpjRev = soDigitos(pedido.revendaCnpj)
  const digitosDoc = soDigitos(texto)
  const destOk = (cnpjRev && digitosDoc.includes(cnpjRev)) || nomeBate(pedido.revendaNome, texto)
  if (destOk) pontos.push('a revenda destinatária é citada no documento')
  else problemas.push(`a revenda do pedido ("${pedido.revendaNome}") não foi encontrada no documento`)

  const cnpjForn = soDigitos(pedido.fornecedorCnpj)
  const emitOk = (cnpjForn && digitosDoc.includes(cnpjForn)) || nomeBate(pedido.fornecedorNome, texto)
  if (emitOk) pontos.push('o fornecedor emitente é citado no documento')
  else problemas.push(`o fornecedor ("${pedido.fornecedorNome}") não foi encontrado no documento`)

  const valor = Number(pedido.valor) || 0
  const valorOk = valor > 0 ? valorAparece(valor, texto) : null
  if (valorOk) pontos.push('o valor informado aparece no documento')
  else if (valorOk === false) problemas.push(`o valor informado (R$ ${valor.toFixed(2)}) não aparece no documento`)

  const itensPed = Array.isArray(pedido.itens) ? pedido.itens : []
  let itensOk = null
  if (itensPed.length) {
    const achados = itensPed.filter((i) => nomeBate(i.descricao, texto))
    itensOk = achados.length >= Math.ceil(itensPed.length / 2)
    if (itensOk) pontos.push(`${achados.length} de ${itensPed.length} item(ns) do pedido identificados no documento`)
    else problemas.push(`os itens do pedido não foram identificados no texto do documento`)
  }

  // No PDF a extração é menos estruturada: exige destinatário + (valor ou itens)
  const aceito = destOk && emitOk && (valorOk === true || itensOk === true)
  const confianca = aceito ? (valorOk && itensOk ? 'alta' : 'media') : 'media'
  const motivo = aceito
    ? `Documento compatível com o pedido ${pedido.pedidoId}: ${pontos.join('; ')}.`
    : `Documento recusado como evidência do pedido ${pedido.pedidoId}: ${problemas.join('; ')}. Se o documento estiver correto, anexe o XML da NF-e.`
  return { aceito, confianca, motivo }
}

// ── Motor Claude (API Anthropic) ─────────────────────────────────────────────
async function analisarComClaude({ nome, tipo, dadosB64, pedido }) {
  const { default: Anthropic } = await import('@anthropic-ai/sdk')
  const client = new Anthropic()

  const contexto = `Você é o verificador fiscal da Plataforma Cidade Imperial. O fornecedor anexou o documento fiscal acima como evidência do faturamento abaixo. Verifique se o documento realmente se refere a este pedido.

Contexto do faturamento sendo registrado:
- Pedido: ${pedido.pedidoId}
- Valor informado do faturamento: R$ ${Number(pedido.valor || 0).toFixed(2)}
- Fornecedor (deve ser o emitente): ${pedido.fornecedorNome}${pedido.fornecedorCnpj ? ' — CNPJ ' + pedido.fornecedorCnpj : ''}
- Revenda (deve ser a destinatária): ${pedido.revendaNome}${pedido.revendaCnpj ? ' — CNPJ ' + pedido.revendaCnpj : ''}
- Itens do pedido: ${(pedido.itens || []).map((i) => `${i.descricao} ×${i.qtd}`).join('; ') || '(não informados)'}

Critérios: o destinatário deve ser a revenda; o emitente deve ser o fornecedor; o valor total deve ser compatível (tolerância ~5%); os itens devem corresponder aos do pedido. Pequenas diferenças de grafia são aceitáveis.

Responda SOMENTE com um JSON válido neste formato, com o motivo em português (uma ou duas frases citando os dados verificados):
{"aceito": true|false, "confianca": "alta"|"media"|"baixa", "motivo": "..."}`

  const ehPdf = /pdf/i.test(tipo || '') || /\.pdf$/i.test(nome || '')
  const content = []
  if (ehPdf) {
    content.push({ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: dadosB64 } })
  } else {
    const xml = Buffer.from(dadosB64, 'base64').toString('utf8')
    content.push({ type: 'text', text: 'Conteúdo do XML do documento fiscal anexado:\n\n' + xml.slice(0, 150000) })
  }
  content.push({ type: 'text', text: contexto })

  const msg = await client.messages.create({
    model: 'claude-opus-4-8',
    max_tokens: 2000,
    thinking: { type: 'adaptive' },
    messages: [{ role: 'user', content }],
  })
  const texto = msg.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n')
  const j = JSON.parse((texto.match(/\{[\s\S]*\}/) || ['{}'])[0])
  if (typeof j.aceito !== 'boolean') throw new Error('Resposta da IA sem veredito')
  return {
    aceito: j.aceito,
    confianca: ['alta', 'media', 'baixa'].includes(j.confianca) ? j.confianca : 'media',
    motivo: String(j.motivo || (j.aceito ? 'Documento compatível com o pedido.' : 'Documento incompatível com o pedido.')),
  }
}

// ── Entrada única ────────────────────────────────────────────────────────────
export async function analisarDocumento({ nome, tipo, dadosB64, pedido }) {
  const ehPdf = /pdf/i.test(tipo || '') || /\.pdf$/i.test(nome || '')

  if (claudeDisponivel()) {
    try {
      const r = await analisarComClaude({ nome, tipo, dadosB64, pedido })
      return { ...r, engine: 'claude' }
    } catch (err) {
      console.warn('[analise-fiscal] falha na API Anthropic, usando analisador local:', err.message || err)
    }
  }

  const r = ehPdf
    ? analisarLocalPdf(Buffer.from(dadosB64, 'base64'), pedido)
    : analisarLocalXml(Buffer.from(dadosB64, 'base64').toString('utf8'), pedido)
  return { ...r, engine: 'local' }
}
