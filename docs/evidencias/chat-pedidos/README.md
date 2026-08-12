# Evidências — Conversa por pedido (revenda × Loja Cidade Imperial)

Capturas do fluxo real em execução, numa base limpa, percorrendo **os dois
sentidos**: a revenda abre a conversa, a Loja recebe o aviso e responde, a
revenda vê a resposta como não lida.

| # | Arquivo | O que comprova |
|---|---|---|
| 00 | `00-dois-lados.png` | **Quem pode iniciar, e quando** — o canal é um por pedido, disponível em qualquer etapa, e qualquer um dos dois lados começa |
| 00 | `00-resumo.png` | Folha com os pontos de entrada, o que fica registrado e todas as etapas (mesma matéria do PDF em `docs/`) |
| 01 | `01-lista-revenda.png` | Revenda · "Meus pedidos" com a coluna Conversa em **todas** as linhas, mesmo sem mensagem alguma |
| 02 | `02-conversa-vazia.png` | A janela recém-aberta, com o estado vazio explicando o uso do canal |
| 03 | `03-revenda-escrevendo.png` | O campo indica o destinatário e o rodapé avisa o que acontece ao enviar |
| 04 | `04-mensagem-enviada.png` | A mensagem no histórico, com autoria, data e hora; o cabeçalho passa a contar as mensagens |
| 05 | `05-lista-revenda-com-conversa.png` | A lista da revenda reflete a conversa aberta |
| 06 | `06-email-aviso.png` | **O e-mail que chega para a Loja** (evento `pedido_mensagem`), com o texto, o pedido, o autor e o horário — o HTML fica em `06-email-aviso.html` |
| 07 | `07-menu-loja-nao-lidas.png` | O menu da Loja avisa antes da tela: contador roxo 💬 ao lado de "Pedidos", separado do contador dourado de pendências |
| 08 | `08-lista-loja-nova.png` | Loja · "Pedidos" com a mesma coluna Conversa, entre Total e Status |
| 09 | `09-linha-com-nova.png` | **O destaque de mensagem nova** — balão roxo com "1 nova" na linha do pedido |
| 10 | `10-loja-lendo.png` | A Loja lê a mensagem da revenda; abrir zera as não lidas apenas do lado que abriu |
| 11 | `11-conversa-completa.png` | A resposta na mesma conversa — histórico dos dois lados no mesmo lugar |
| 12 | `12-detalhe-pedido.png` | O atalho no detalhe do pedido, com o pedido ainda **pendente de recebimento**: a conversa não depende de etapa |
| 13 | `13-trilha-do-pedido.png` | "Conversa aberta no pedido pela revenda" na trilha, com data, hora e usuário |
| 14 | `14-auditoria.png` | Uma entrada de auditoria por mensagem, com o sentido do envio |
| 15 | `15-revenda-resposta-nova.png` | O ciclo fecha: quem não escreveu por último é quem vê o destaque |

As imagens **09 e 15** são o mesmo sinal visto dos dois lados — comparadas,
mostram que a contagem de não lidas é **por lado**, nunca compartilhada.

O arquivo `dados.json` guarda o pedido usado na captura, os textos das duas
mensagens e o assunto do e-mail, para que as legendas do resumo fiquem sempre
coerentes com as imagens.

O PDF consolidado fica em
`docs/Plataforma-Cidade-Imperial-Evidencias-Chat-Pedidos.pdf`.

## Regenerar

```bash
# 1. suba a aplicação numa base limpa
rm -rf server/.pgdata-test
PGLITE_DIR=server/.pgdata-test PORT=3344 node server/src/index.js &

# 2. percorra o fluxo nos dois sentidos e capture
node docs/gerador/18a-captura-evidencia-chat.mjs

# 3. monte a folha-resumo (PNG + PDF)
node docs/gerador/18-build-evidencia-chat.mjs
```
