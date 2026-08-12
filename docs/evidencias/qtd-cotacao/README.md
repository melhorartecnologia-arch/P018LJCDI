# Evidências — Cotação com quantidade maior que a do pedido

Capturas do fluxo real em execução, numa base limpa: a Loja recebe o pedido
`PED-0044`, cota um lote maior (12 de um item pedido em 2 e 40 de um pedido em
3) e a evidência mostra que **o pedido da revenda não muda**.

| # | Arquivo | O que comprova |
|---|---|---|
| 00 | `00-regra.png` | **A regra em um quadro** — sem teto na cotação, com teto no envio direto e no estoque |
| 00 | `00-resumo.png` | Folha com a tabela antes/depois, onde a diferença fica visível e todas as etapas (mesma matéria do PDF em `docs/`) |
| 01 | `01-janela-quantidade-do-pedido.png` | A janela abre com a quantidade do pedido e avisa que ela pode ser menor **ou maior** |
| 02 | `02-item-na-quantidade-pedida.png` | O item sem excedente — frase de apoio fala do saldo que permanece aprovado |
| 03 | `03-item-acima-do-pedido.png` | **O mesmo item cotado acima**: campo âmbar e o excedente declarado |
| 04 | `04-janela-com-lote-maior.png` | A janela com os dois itens acima do pedido |
| 05 | `05-total-com-excedente.png` | O total estimado conta o volume cotado e consolida 47 unidades a mais |
| 06 | `06-envio-direto-continua-limitado.png` | **A prova do contraste**: a mesma quantidade é recusada no envio direto |
| 07 | `07-detalhe-cotacao.png` | A cotação `COT-009` aberta com o volume maior |
| 08 | `08-demanda-cotada.png` | A demanda mostra `×12 (pedido: 2)` — as duas quantidades lado a lado |
| 09 | `09-pedido-inalterado.png` | O pedido da revenda depois da cotação |
| 10 | `10-itens-do-pedido.png` | **Os itens com as quantidades originais** e o mesmo valor total (R$ 1.528,00) |
| 11 | `11-trilha.png` | A trilha registra que a cotação saiu acima do pedido e que o pedido não muda |
| 12 | `12-cartao-fornecedor.png` | O fornecedor recebe a quantidade que deve precificar |
| 13 | `13-proposta-fornecedor.png` | A janela da proposta marca o item como "volume de negociação" |
| 14 | `14-auditoria.png` | A abertura da cotação registra quantos itens saíram acima do pedido |

As imagens **03 e 06** são o par que define a regra: a mesma quantidade acima do
pedido é aceita (em âmbar) na cotação e recusada (em vermelho) no envio direto.
As imagens **05 e 10** provam a consequência: o total da cotação cresce, o do
pedido não.

O arquivo `dados.json` guarda o pedido e a cotação usados, as quantidades
pedidas e cotadas, o excedente e o total do pedido antes e depois — para que as
legendas do resumo fiquem sempre coerentes com as imagens.

O PDF consolidado fica em
`docs/Plataforma-Cidade-Imperial-Evidencias-Quantidade-Cotacao.pdf`.

## Regenerar

```bash
# 1. suba a aplicação numa base limpa
rm -rf server/.pgdata-test
PGLITE_DIR=server/.pgdata-test PORT=3344 node server/src/index.js &

# 2. percorra o fluxo e capture
node docs/gerador/22a-captura-evidencia-qtd-cotacao.mjs

# 3. monte a folha-resumo (PNG + PDF)
node docs/gerador/22-build-evidencia-qtd-cotacao.mjs
```
