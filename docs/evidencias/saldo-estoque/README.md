# Evidências — O saldo de estoque é a última posição carregada

Capturas do fluxo real em execução, numa base limpa, acompanhando **o mesmo
produto nos três momentos** que definem a regra.

| # | Arquivo | O que comprova |
|---|---|---|
| 00 | `00-linha-do-tempo.png` | **A regra em um quadro**: PRD-001 com saldo 10 → 10 → 120. Sair 2 unidades não mexe; carregar arquivo novo, sim |
| 00 | `00-resumo.png` | Folha com a tabela antes/depois e todas as etapas (mesma matéria do PDF em `docs/`) |
| 01 | `01-tela-inventario.png` | O subtítulo declara o modelo: o último inventário lançado é a posição |
| 02 | `02-posicao-inicial.png` | Momento 1 — saldo igual à contagem do inventário de referência |
| 03 | `03-atender-com-estoque.png` | Momento 2 — pedido atendido com estoque próprio da Loja |
| 04 | `04-posicao-apos-atendimento.png` | **A posição não mudou** — a saída aparece em "Atendido desde o lançamento", em cinza, sem abater |
| 05 | `05-planilha-nova-posicao.png` | Momento 3 — a planilha da nova posição, preenchida sobre o modelo baixado |
| 06 | `06-janela-lancamento.png` | A carga abre a janela de lançamento para revisão antes de gravar |
| 07 | `07-posicao-apos-carga.png` | A nova posição valendo — o contador de saídas zera na nova referência |
| 08 | `08-planilha-exportada.png` | A exportação reflete a mesma posição, com as saídas rotuladas como informativas |
| 09 | `09-historico-lancamentos.png` | Histórico com a sequência de posições lançadas |
| 10 | `10-auditoria.png` | O lançamento na trilha, com a origem "via planilha" |

As imagens **02, 04 e 07** são o mesmo recorte da tabela nos três momentos —
comparadas lado a lado, mostram a regra sem precisar de explicação.

O arquivo `dados.json` guarda os valores usados na captura (produto, contagem,
quantidade que saiu e a nova posição), para que as legendas do resumo fiquem
sempre coerentes com as imagens.

O PDF consolidado fica em
`docs/Plataforma-Cidade-Imperial-Evidencias-Saldo-Estoque.pdf`.

## Regenerar

```bash
# 1. suba a aplicação numa base limpa
rm -rf server/.pgdata-test
PGLITE_DIR=server/.pgdata-test PORT=3344 node server/src/index.js &

# 2. percorra os três momentos e capture
node docs/gerador/17a-captura-evidencia-saldo.mjs

# 3. monte a folha-resumo (PNG + PDF)
node docs/gerador/17-build-evidencia-saldo.mjs
```
