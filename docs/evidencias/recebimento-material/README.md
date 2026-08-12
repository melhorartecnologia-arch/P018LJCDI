# Evidências — Confirmação de recebimento do material

Capturas do fluxo real em execução, numa base limpa, percorrendo **os dois
lados**: a revenda confirma o recebimento de um pedido e a Loja Cidade Imperial
confirma outro em nome da revenda.

| # | Arquivo | O que comprova |
|---|---|---|
| 00 | `00-etapas.png` | **A regra em um quadro** — o workflow passa de 9 para 10 etapas; entre o faturamento e a conclusão entra a confirmação |
| 00 | `00-resumo.png` | Folha com a tabela antes/depois, o que fica registrado e todas as etapas (mesma matéria do PDF em `docs/`) |
| 01 | `01-lista-loja-etapa9.png` | Loja · o pedido faturado para na **etapa 9/10 — Entrega aguardando confirmação** |
| 02 | `02-linha-aguardando.png` | A linha do pedido de perto, com o botão verde disponível para a Loja |
| 03 | `03-detalhe-aguardando.png` | Detalhe do pedido com o painel âmbar de aguardando confirmação |
| 04 | `04-regua-etapa9.png` | O final da régua de etapas: a 9 é a atual, a 10 ainda pendente |
| 05 | `05-painel-aguardando.png` | O painel isolado — diz quem pode confirmar e por onde |
| 06 | `06-lista-revenda-botao.png` | Revenda · "Meus pedidos" com o botão de confirmar |
| 07 | `07-janela-revenda.png` | A janela de confirmação: pedido, etapa, itens entregues e quem entregou |
| 08 | `08-janela-preenchida.png` | Com a observação preenchida (avarias, divergências, quem recebeu) |
| 09 | `09-revenda-confirmado.png` | Confirmado — o pedido passa para a **etapa 10/10 · Conclusão** |
| 10 | `10-linha-com-selo.png` | O selo "✓ Recebido em…" no lugar do botão |
| 11 | `11-email-aviso.png` | **O e-mail que avisa o outro lado** (evento `pedido_recebido`), com a observação em destaque — o HTML fica em `11-email-aviso.html` |
| 12 | `12-janela-loja.png` | **Loja confirmando em nome da revenda** — a janela avisa explicitamente |
| 13 | `13-detalhe-concluido.png` | Detalhe com o painel verde "✓ Material recebido" e o cabeçalho na etapa 10/10 |
| 14 | `14-regua-etapa10.png` | A régua com o ciclo encerrado, mostrando quando e por quem |
| 15 | `15-painel-recebido.png` | O painel de recebido isolado: data, hora, autor e observação |
| 16 | `16-trilha.png` | A trilha do pedido com a confirmação e a transição de etapa |
| 17 | `17-auditoria.png` | A auditoria, distinguindo se confirmou a revenda ou a Loja |
| 18 | `18-permissao.png` | A permissão "Confirmar recebimento do material (entrega)" no editor |

As imagens **04 e 14** são o mesmo trecho da régua antes e depois da
confirmação — comparadas, mostram a etapa 10 sendo alcançada.

O arquivo `dados.json` guarda os pedidos usados na captura, quem confirmou, o
horário e o assunto do e-mail, para que as legendas do resumo fiquem sempre
coerentes com as imagens.

O PDF consolidado fica em
`docs/Plataforma-Cidade-Imperial-Evidencias-Recebimento-Material.pdf`.

## Regenerar

```bash
# 1. suba a aplicação numa base limpa (com um SMTP de teste na porta 2526)
rm -rf server/.pgdata-test
PGLITE_DIR=server/.pgdata-test PORT=3344 node server/src/index.js &

# 2. percorra o fluxo pelos dois lados e capture
node docs/gerador/21a-captura-evidencia-recebimento.mjs

# 3. monte a folha-resumo (PNG + PDF)
node docs/gerador/21-build-evidencia-recebimento.mjs
```
