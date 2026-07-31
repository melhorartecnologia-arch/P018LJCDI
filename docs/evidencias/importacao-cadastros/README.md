# Evidências — Importação de cadastros por planilha

Capturas do fluxo real em execução (Loja · Ana Ribeiro), na ordem em que o usuário
o percorre. Geradas por `docs/gerador/14-build-evidencia-importacao.mjs` a partir de
uma base limpa; o teste automatizado equivalente está descrito ao final.

| # | Arquivo | O que comprova |
|---|---|---|
| 00 | `00-resumo.png` | Folha de contato com todas as etapas (mesma matéria do PDF `docs/Plataforma-Cidade-Imperial-Evidencias-Importacao-Cadastros.pdf`) |
| 01 | `01-bloco-fornecedores.png` | O bloco "Importar por planilha" na tela de Fornecedores & Contratos, com os três botões do ciclo |
| 02 | `02-modelo-fornecedores.png` | Modelo `.xlsx` gerado: colunas na ordem certa e duas linhas de exemplo |
| 03 | `03-modelo-instrucoes.png` | Aba "Instruções" do modelo, com as regras do cadastro e o que é obrigatório |
| 04 | `04-planilha-preenchida.png` | Planilha preenchida: 2 inclusões, 1 atualização (CNPJ já cadastrado) e 3 linhas com problema |
| 05 | `05-previa-fornecedores.png` | Prévia antes de gravar — contadores e linha a linha, com o motivo de cada recusa |
| 06 | `06-resultado-fornecedores.png` | Resultado: novos fornecedores na lista e o existente atualizado, sem duplicidade |
| 07 | `07-previa-revendas.png` | Mesma rotina em Revendas, com a chave pelo CNPJ |
| 08 | `08-resultado-revendas.png` | Revendas incluídas, já enxergando os fornecedores ativos |
| 09 | `09-bloco-produtos.png` | O bloco na tela de Produtos homologados |
| 10 | `10-planilha-produtos.png` | Planilha de produtos: a coluna "Fornecedores" alimenta o De/Para; código em branco é gerado |
| 11 | `11-previa-produtos.png` | Prévia de produtos: categoria, preço e fornecedores resolvidos antes de gravar |
| 12 | `12-resultado-produtos.png` | Produtos no catálogo, com código gerado e vínculos aplicados |
| 13 | `13-arquivo-invalido.png` | Planilha fora do padrão recusada com mensagem clara e sem botão de gravar |
| 14 | `14-auditoria.png` | Trilha de auditoria com cada importação e cada download de modelo, e as contagens da carga |

## Regenerar

```bash
# 1. suba a aplicação numa base limpa
rm -rf server/.pgdata-test
PGLITE_DIR=server/.pgdata-test PORT=3344 node server/src/index.js &

# 2. capture as telas e monte o resumo (PNG + PDF)
node docs/gerador/14-build-evidencia-importacao.mjs
```

O script de captura das telas fica em `docs/gerador/` junto do gerador do resumo;
o roteiro de teste automatizado que valida o mesmo fluxo cobre 48 asserções
(estrutura dos modelos, contagens da prévia, gravação apenas das linhas válidas,
atualização pela chave sem duplicar, persistência e registros de auditoria).
