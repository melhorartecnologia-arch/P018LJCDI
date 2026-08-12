# Evidências — Documento completo do pedido em PDF

Capturas do fluxo real em execução, numa base limpa: a Loja conversa no pedido
`PED-0040` (faturado, com a cotação `COT-007` e a nota `NF-1204`), a revenda
responde e confirma o recebimento do material, e então o documento é emitido
pelos dois lados — com recorte de cada bloco impresso.

| # | Arquivo | O que comprova |
|---|---|---|
| 00 | `00-regra.png` | **O recurso em um quadro** — o mesmo documento nas duas visões e a regra de visibilidade |
| 00 | `00-resumo.png` | Folha com os números, o conteúdo do documento e a tabela de visibilidade (mesma matéria do PDF em `docs/`) |
| 01 | `01-lista-da-loja.png` | A lista de pedidos da Loja com o botão em cada linha |
| 02 | `02-botao-na-linha.png` | **O botão `📄 PDF`** sob o número do pedido, de perto |
| 03 | `03-cabecalho-do-documento.png` | Cabeçalho: identidade, pedido, situação, etapa 10/10 e hora da emissão |
| 04 | `04-partes-e-destino.png` | Emitente, revenda compradora (razão social, CNPJ, cidade, contato) e destino |
| 05 | `05-situacao-prazos-e-datas.png` | Prazos, faturamento e a confirmação de recebimento com autor e observação |
| 06 | `06-condicoes-comerciais.png` | Pagamento, prazo, frete e validade — da proposta vencedora |
| 07 | `07-itens-com-foto-e-ficha.png` | **Itens com foto, valores e totais**, incluindo a economia apurada |
| 08 | `08-botao-no-detalhe.png` | O segundo caminho: o botão dentro do detalhe do pedido |
| 09 | `09-cotacao-com-o-comparativo.png` | **A cotação na visão da Loja**, com o comparativo de propostas |
| 10 | `10-faturamento-e-notas.png` | `NF-1204` com competência, valor, royalty e anexos |
| 11 | `11-conversa-do-pedido.png` | As mensagens trocadas, com data, hora e autor |
| 12 | `12-trilha-completa.png` | Todos os eventos do pedido |
| 13 | `13-pedido-pendente-enxuto.png` | **O documento inteiro de um pedido pendente** — 5 blocos em vez de 8, com a ficha fiscal do item |
| 14 | `14-auditoria.png` | Cada emissão registrada com pedido, usuário e horário |
| 15 | `15-lista-da-revenda.png` | O mesmo botão em "Meus pedidos" |
| 16 | `16-documento-da-revenda.png` | O documento emitido pela revenda |
| 17 | `17-cotacao-sem-o-comparativo.png` | **A mesma cotação, sem o comparativo de preços** |
| 18 | `18-valor-a-definir-para-a-revenda.png` | Item não negociado sai como "a definir" |

As imagens **09 e 17** são o par que define a regra de visibilidade: a mesma
cotação, com e sem o comparativo de propostas entre fornecedores. As imagens
**07 e 18** provam a outra metade: valor negociado sai impresso, valor não
acordado sai como "a definir".

Os arquivos `documento-loja.pdf` e `documento-revenda.pdf` são os PDFs de fato
gerados durante a captura, pelos dois perfis, a partir do mesmo pedido.

O arquivo `dados.json` guarda o pedido, a cotação, a nota, o número de blocos
de cada versão, o tamanho dos PDFs e o resultado da checagem de visibilidade —
para que as legendas do resumo fiquem sempre coerentes com as imagens.

O PDF consolidado fica em
`docs/Plataforma-Cidade-Imperial-Evidencias-PDF-do-Pedido.pdf`.

## Regenerar

```bash
# 1. suba a aplicação numa base limpa
rm -rf server/.pgdata-test
PGLITE_DIR=server/.pgdata-test PORT=3344 node server/src/index.js &

# 2. percorra o fluxo e capture
node docs/gerador/23a-captura-evidencia-pdf-pedido.mjs

# 3. monte a folha-resumo (PNG + PDF)
node docs/gerador/23-build-evidencia-pdf-pedido.mjs
```
