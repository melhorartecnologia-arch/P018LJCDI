# Plataforma Cidade Imperial

Portal B2B da **Cervejaria Cidade Imperial** — a "Plataforma da Loja" que conecta
a Loja (dona da plataforma), seus **Fornecedores** e as **Revendas**, cobrindo o
fluxo completo de catálogo, pedidos, cotações, faturamento e royalties.

Esta é a implementação da tela **Plataforma Cidade Imperial**, exportada do
Claude Design e empacotada aqui como uma aplicação web autônoma e publicável.

## O que a plataforma faz

Aplicação de página única com **login por perfil** e três perfis de acesso, cada
um com sua própria navegação e permissões:

| Perfil | Visão principal |
| --- | --- |
| **Loja Cidade Imperial** | Painel geral, aprovação de pedidos (total ou por item), cotações com fornecedores, cadastro de fornecedores/contratos, produtos homologados, revendas, faturamento, royalties, relatórios e auditoria. |
| **Fornecedor** | Pedidos recebidos, cotações convidadas, meus faturamentos e royalties devidos. |
| **Revenda** | Catálogo de produtos homologados (com carrinho), envio de pedidos para aprovação e acompanhamento dos meus pedidos. |

Destaques do fluxo: aprovação de pedido por item, atendimento combinável
(estoque da Loja, envio direto ou cotação no mesmo pedido), cotações com
propostas por fornecedor e escolha de vencedor, cálculo automático de royalty
por contrato, trilha de auditoria e visibilidade de produto por revenda.

> Demonstração: o login aceita qualquer e-mail/senha e todos os dados são
> fictícios, mantidos em memória (recarregar a página restaura o estado inicial).

## Como funciona (arquitetura)

O aplicativo é um documento **Claude Design** interpretado em tempo de execução
pelo `dc-runtime`:

- **`index.html`** — contém a marcação `<x-dc>` (as telas) e o bloco
  `<script data-dc-script>` com a classe `Component extends DCLogic` (todo o
  estado, dados e regras de negócio).
- **`public/support.js`** — o `dc-runtime`, que compila as telas + a lógica e
  renderiza a interface sobre o React.
- **`public/vendor/react*.js`** — React e ReactDOM 18.3.1 (UMD), carregados como
  globais antes do `support.js`, sem CDN em tempo de execução.
- **`public/img/`** — imagens dos produtos.
- **`design/Plataforma Cidade Imperial.dc.html`** — a exportação original e
  intacta do Claude Design (fonte de verdade para reeditar no Design). O
  `index.html` é essa mesma exportação com os `<script>` do React adicionados ao
  `<head>`.

## Rodando localmente

Pré-requisitos: Node.js 18+.

```bash
npm install        # instala dependências e copia o React UMD para public/vendor
npm run dev        # servidor de desenvolvimento em http://localhost:5173
```

## Build de produção

```bash
npm run build      # gera o site estático em dist/
npm run preview    # serve o build de dist/ para conferência
```

`dist/` é um site totalmente estático (HTML + JS + imagens) e pode ser publicado
em qualquer hospedagem estática (GitHub Pages, Netlify, Vercel, S3, Nginx, etc.).
O `base` relativo (`vite.config.js`) permite hospedar na raiz do domínio ou em um
sub-caminho.

## Estrutura do projeto

```
index.html                 # app (marcação <x-dc> + lógica dc-script) + React no <head>
vite.config.js             # dev server e build estático
scripts/sync-vendor.mjs    # copia o React UMD de node_modules para public/vendor (postinstall)
public/
  support.js               # dc-runtime
  vendor/react*.js         # React + ReactDOM 18.3.1 (UMD)
  img/                     # imagens de produtos
design/
  Plataforma Cidade Imperial.dc.html   # exportação original do Claude Design
```

## Notas

- As fontes (Cinzel e Instrument Sans) são carregadas do Google Fonts; sem
  acesso à rede, a interface recorre graciosamente às fontes do sistema.
- Para reeditar no Claude Design, use o arquivo em `design/` e regenere o
  `index.html` reinserindo os `<script>` do React/`support.js` no `<head>`.
