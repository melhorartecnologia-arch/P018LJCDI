# Evidências — Rastreio da entrega

Capturas do fluxo real em execução, numa base limpa: a Loja recebe o pedido
`PED-0044` e encaminha à `Distribuidora Serra Verde`, a plataforma cobra o
rastreio, o faturamento é **recusado** sem ele, o fornecedor informa a
transportadora no padrão dela, e a Loja e a revenda passam a acompanhar a
entrega. Ao final o rastreio é corrigido, para mostrar o histórico.

| # | Arquivo | O que comprova |
|---|---|---|
| 00 | `00-regra.png` | **A regra em um quadro** — CIF obrigatório, FOB opcional, correção sempre possível |
| 00 | `00-transportadoras.png` | **O catálogo completo**: documento pedido, formato aceito e endereço de consulta de cada transportadora |
| 00 | `00-resumo.png` | Folha com os números, a tabela da regra e onde o rastreio aparece (mesma matéria do PDF em `docs/`) |
| 01 | `01-linha-rastreio-pendente.png` | A etiqueta âmbar "🚚 Rastreio pendente" na lista da Loja |
| 02 | `02-detalhe-cobra-rastreio.png` | O painel que cobra o rastreio e explica a responsabilidade do frete |
| 03 | `03-card-do-fornecedor.png` | O aviso e o botão "🚚 Informar rastreio…" no card do fornecedor |
| 05 | `05-faturamento-recusado.png` | **A trava**: com valor e nota anexada, o faturamento ainda é recusado sem o código |
| 06 | `06-janela-de-rastreio.png` | A janela completa, com a explicação de por que é obrigatório |
| 07 | `07-codigo-fora-do-padrao.png` | **A validação**: "123" nos Correios é recusado com o formato esperado |
| 08 | `08-link-montado-pelo-padrao.png` | O link montado a partir do código e o botão de testá-lo |
| 09 | `09-troca-de-transportadora.png` | **Trocar a transportadora troca o padrão**: rótulo, formato do código e link |
| 10 | `10-janela-preenchida.png` | A janela pronta, com previsão de entrega e observação |
| 11 | `11-card-com-rastreio.png` | O card do fornecedor depois de salvar |
| 12 | `12-linha-com-rastreio.png` | A etiqueta verde clicável na lista da Loja, sem a pendência |
| 13 | `13-detalhe-em-transito.png` | O painel de entrega em trânsito com o botão de acompanhar |
| 14 | `14-bloco-no-documento.png` | O bloco "Rastreio da entrega" no documento do pedido em PDF |
| 15 | `15-linha-da-revenda.png` | A mesma etiqueta em "Meus pedidos" |
| 16 | `16-email-do-rastreio.png` | O e-mail enviado à revenda e à Loja (o HTML fica ao lado, em `.html`) |
| 17 | `17-atualizar-rastreio.png` | A janela de correção, mostrando o rastreio vigente |
| 18 | `18-historico-de-rastreios.png` | **O anterior guardado** em "Rastreios anteriores" |
| 19 | `19-trilha-do-pedido.png` | A trilha com o registro e a atualização |
| 20 | `20-auditoria.png` | A auditoria com pedido, transportadora, código e link |

As imagens **05 e 11** são o par que define a regra: o faturamento recusado
sem rastreio e o card resolvido depois de informá-lo. As imagens **07 e 09**
mostram o que "padrão da transportadora" significa na prática — validação do
formato e troca completa de rótulo, formato e link ao mudar de transportadora.

O arquivo `nota-de-apoio.pdf` é o anexo mínimo usado para chegar até a
validação do faturamento; `dados.json` guarda o pedido, os códigos usados, os
links montados, o catálogo lido do próprio código da aplicação e o rastreio
final gravado no pedido.

O PDF consolidado fica em
`docs/Plataforma-Cidade-Imperial-Evidencias-Rastreio-da-Entrega.pdf`.

## Regenerar

```bash
# 1. suba a aplicação numa base limpa, com o SMTP de teste na porta 2526
rm -rf server/.pgdata-test
PGLITE_DIR=server/.pgdata-test PORT=3344 node server/src/index.js &

# 2. percorra o fluxo e capture
node docs/gerador/24a-captura-evidencia-rastreio.mjs

# 3. monte a folha-resumo (PNG + PDF)
node docs/gerador/24-build-evidencia-rastreio.mjs
```
