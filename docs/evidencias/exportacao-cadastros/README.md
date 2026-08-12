# Evidências — Exportação dos cadastros para Excel

Capturas do fluxo real em execução, numa base limpa: os botões nas telas e as
planilhas **efetivamente baixadas** pela aplicação, renderizadas com cara de
planilha (os valores são os do arquivo `.xlsx`, não uma ilustração).

| # | Arquivo | O que comprova |
|---|---|---|
| 00 | `00-resumo.png` | Folha com a tabela de cobertura por cadastro, as decisões de regra e todas as etapas (mesma matéria do PDF em `docs/`) |
| 01 | `01-botoes-fornecedores.png` | Os dois botões na tela de Fornecedores: exportar fornecedores e exportar contratos |
| 02 | `02-planilha-fornecedores.png` | Planilha de fornecedores, com contrato vigente, royalty, produtos vinculados e faturado |
| 03 | `03-planilha-contratos.png` | Planilha de contratos: percentual, vigência, dia acordado, gatilho e parcelamento |
| 04 | `04-botoes-produtos.png` | Par importar/exportar na tela de produtos |
| 05 | `05-planilha-produtos.png` | Planilha de produtos, com fornecedores do De/Para, saldo e vendas |
| 06 | `06-planilha-categorias.png` | Planilha de categorias, com participação no catálogo |
| 07 | `07-botao-depara.png` | Exportação na tela do De/Para |
| 08 | `08-planilha-depara.png` | Matriz produto × fornecedor, uma coluna por fornecedor ativo |
| 09 | `09-planilha-revendas.png` | Planilha de revendas, com visibilidade e valor em pedidos |
| 10 | `10-planilha-estoque.png` | Saldo de estoque: contagem, consumido e saldo |
| 11 | `11-botao-consolidado.png` | O botão "Exportar todos os cadastros" em Relatórios |
| 12 | `12-pasta-consolidada.png` | A pasta pelo perfil **Loja** — aba Resumo e as abas; **sem** a aba Usuários |
| 13 | `13-botoes-usuarios.png` | Importar e exportar no cadastro de usuários |
| 14 | `14-planilha-usuarios.png` | Planilha de usuários — **nenhuma coluna de senha ou hash** |
| 15 | `15-pasta-consolidada-admin.png` | A mesma pasta pelo **Administrador** — agora com a aba Usuários |
| 16 | `16-auditoria.png` | Cada exportação registrada na trilha, com a contagem de registros |

As imagens 12 e 15 juntas mostram a regra de permissão: **a mesma ação, dois
perfis, pastas diferentes**.

O PDF consolidado fica em
`docs/Plataforma-Cidade-Imperial-Evidencias-Exportacao-Cadastros.pdf`.

## Regenerar

```bash
# 1. suba a aplicação numa base limpa
rm -rf server/.pgdata-test
PGLITE_DIR=server/.pgdata-test PORT=3344 node server/src/index.js &

# 2. capture as telas e as planilhas
node docs/gerador/16a-captura-evidencia-exportacao.mjs

# 3. monte a folha-resumo (PNG + PDF)
node docs/gerador/16-build-evidencia-exportacao.mjs
```
