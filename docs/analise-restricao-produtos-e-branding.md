# Análises — itens 08 e 10

Documento de resposta às duas demandas classificadas como análise na rodada de
05/10/2026. O comportamento descrito foi levantado diretamente no código da
plataforma, não de memória.

---

# 08 · Restrição de visualização de produtos por revenda

## Resposta curta

A funcionalidade **existe e funciona**, mas é mais estreita do que a necessidade
descrita. Ela restringe **por revenda individual**, em **dois mecanismos
independentes**, e é aplicada **apenas no cliente** — o que basta para
segmentação comercial, mas não para sigilo.

## O que existe hoje

A plataforma tem **dois** controles, que se somam:

### 1. Visibilidade por fornecedor (`revenda.visibilidade`)

Lista de fornecedores que aquela revenda enxerga. O catálogo da revenda só traz
produtos que tenham **ao menos um fornecedor ativo** dentro dessa lista.

- É o controle "de atacado": liga ou desliga uma carteira inteira de produtos.
- Uma revenda nova entra enxergando **todos os fornecedores ativos**
  (`_visPadrao()`) — ou seja, o padrão é aberto, e restringir é ação manual.

### 2. Bloqueio de produto específico (`revenda.prodBloq`)

Lista de IDs de produtos bloqueados para aquela revenda, aplicada **depois** do
filtro de fornecedor. É o controle "de varejo": tira um produto pontual de uma
revenda que, de resto, vê o fornecedor dele.

### Como as duas regras se combinam

O catálogo da revenda é montado com esta condição única:

```
produto ativo
  E tem algum fornecedor ativo que está na visibilidade da revenda
  E o produto não está na lista de bloqueados da revenda
```

## Respostas ponto a ponto

| Pergunta | Resposta |
|---|---|
| Restringir um produto para uma revenda específica? | **Sim** — `prodBloq`, produto a produto. |
| Restringir para um **grupo** de revendas? | **Não.** Não existe conceito de grupo na restrição. O grupo econômico existe para *consulta* (um usuário pode ver os pedidos de várias revendas), mas a restrição é sempre por revenda individual. Para 10 revendas é preciso repetir a configuração 10 vezes. |
| Como é feita a configuração hoje? | **Por revenda.** Em *Cadastros › Revendas › (abrir a revenda)*: uma faixa de fornecedores com liga/desliga e uma lista de produtos com botão **Bloquear / Liberar** por item. Não há configuração por produto (olhando "quem vê este produto"), por perfil, por categoria nem por região. |
| O produto restrito some do catálogo? | **Sim**, some por completo da tela de catálogo da revenda. |
| A restrição alcança a busca? | **Sim.** A busca opera sobre a lista já filtrada — produto bloqueado não aparece nem buscando pelo código exato. |
| A restrição alcança a criação de pedidos? | **Sim, na prática**, porque o pedido é montado a partir do catálogo: o que não aparece não pode ser adicionado. |
| Existe interface administrativa? | **Sim**, no detalhe da revenda, com ação "Liberar tudo". A exportação de revendas traz a coluna *Produtos bloqueados* (contagem). |

## Gaps identificados

Em ordem de impacto para os cenários de catálogo segmentado:

### 1. Não há restrição por grupo, categoria ou região *(gap principal)*

Hoje a manutenção é O(revendas × produtos). Um catálogo "premium" liberado para
30 revendas exige 30 configurações, e cada produto novo exige revisitar todas.
Os cenários citados na demanda — **por cliente, região ou operação** — não são
suportados pelo modelo atual.

### 2. A manutenção em massa não existe

A importação de revendas por planilha **não** carrega `prodBloq` nem
`visibilidade`. A exportação traz só a **contagem** de produtos bloqueados, não
quais são. Não há como fazer carga nem auditoria em massa das restrições.

### 3. A visão é "por revenda", nunca "por produto"

Não existe tela que responda *"quem enxerga o produto X?"*. Para descobrir, é
preciso abrir revenda por revenda.

### 4. O padrão é aberto, não fechado

Revenda nova vê tudo. Para um produto exclusivo, o esquecimento de configurar
**expõe** o produto, em vez de escondê-lo. Para catálogo segmentado o padrão
seguro seria o inverso.

### 5. A restrição é apenas de interface — **não é sigilo**

Este é o ponto que merece decisão explícita. A aplicação carrega **todo o estado
da plataforma no navegador** e o servidor não valida regra de negócio
(`PUT /api/state` grava o que receber). Portanto:

- o produto bloqueado **não aparece** na tela, mas **está** nos dados que o
  navegador daquela revenda recebeu;
- quem souber abrir as ferramentas do navegador consegue vê-lo;
- um pedido forjado fora da interface não seria barrado pelo servidor.

Para **segmentação comercial** (não poluir o catálogo, evitar pedido indevido)
o modelo atual entrega. Para **confidencialidade** (preço ou produto que uma
revenda não pode nem saber que existe), não entrega — e nenhum ajuste de tela
resolve: exige filtrar no servidor, entregando a cada revenda só o seu recorte.

## Recomendação

Em ordem de custo/benefício:

1. **Regras por grupo** — criar "grupos de catálogo" (um conjunto de produtos) e
   associar revendas a grupos. Resolve os cenários de cliente/região/operação e
   reduz a manutenção a O(grupos).
2. **Visão por produto** — tela "quem vê este produto", com edição em massa.
3. **Restrições na importação/exportação** — permitir carga e conferência por
   planilha.
4. **Produto com padrão fechado** — marcar o produto como "exclusivo", que só
   aparece para quem foi explicitamente liberado.
5. **Filtro no servidor** — se houver requisito de sigilo, mover a regra para o
   `/api/state`, entregando a cada revenda apenas o catálogo dela.

Os itens 1 a 4 são evolutivos sobre o modelo atual. O item 5 é mudança de
arquitetura e só se justifica se a exigência for de sigilo, não de organização.

---

# 10 · Identidade visual e branding da plataforma

## Situação atual, levantada no código

A marca **Cidade Imperial** está presente em quatro camadas:

| Camada | Onde | Ocorrências |
|---|---|---|
| **Logo** | selo "CI" em gradiente dourado — login, cabeçalho, documento do pedido, e-mails | 4 pontos |
| **Nome na interface** | "CIDADE IMPERIAL / PLATAFORMA DA LOJA", "Loja Cidade Imperial" como nome do perfil e do emitente | 29 ocorrências |
| **E-mails** | cabeçalho dourado, "Plataforma Cidade Imperial", rodapé "Cervejaria Cidade Imperial" | 9 ocorrências em 29 modelos |
| **Domínio** | remetente e endereços são configuráveis em *Configurações Técnicas › Configuração de e-mail*; o padrão usado em demonstração é `@cidadeimperial.com.br` | configurável |

Importante distinguir dois usos do nome, que hoje estão misturados:

- **Cidade Imperial como plataforma** — "Plataforma Cidade Imperial", o selo, o
  cabeçalho dos e-mails. É o que mudaria para Bravva.
- **Cidade Imperial como operadora do negócio** — "Loja Cidade Imperial" é o
  **papel** no fluxo: quem homologa produtos, decide o atendimento e recebe o
  royalty. Trocar isso por "Bravva" mudaria o sentido das mensagens: quem compra
  do fornecedor continua sendo a cervejaria, não a Bravva.

## Avaliação técnica

A troca é **viável e de baixo risco técnico**. O esforço se concentra em:

1. **Logo** — o selo é CSS puro (gradiente + iniciais), não é arquivo de imagem.
   Trocar por um logo real exige o arquivo em SVG ou PNG e um ajuste de layout
   em 4 pontos.
2. **Nome do produto** — centralizar numa constante e substituir as 3 ocorrências
   de "Plataforma Cidade Imperial"; **manter** "Loja Cidade Imperial" onde
   designa o papel operacional.
3. **E-mails** — cabeçalho, paleta e rodapé estão num único `layout()` em
   `server/src/email-templates.js`. A troca alcança os 29 modelos de uma vez.
4. **Domínio dos e-mails transacionais** — já é configurável pela tela, **sem
   código**. Exige, do lado de infraestrutura, SPF/DKIM/DMARC do domínio Bravva,
   senão a entregabilidade cai.
5. **Paleta** — o dourado/grafite atual é da Cidade Imperial. Se a Bravva tiver
   paleta própria, o ajuste é maior: as cores estão em estilos inline ao longo
   da interface.

## O que preciso para executar

A implementação está pronta para começar assim que vierem:

- [ ] **Logo** em SVG (preferencial) ou PNG com fundo transparente, nas versões clara e escura
- [ ] **Nome exato** a exibir — "Bravva", "Plataforma Bravva", outro?
- [ ] **Paleta** — manter a atual ou adotar as cores da Bravva (com os códigos)
- [ ] **Domínio** dos e-mails transacionais, já com SPF/DKIM configurados
- [ ] **Decisão sobre o papel** — "Loja Cidade Imperial" continua como está no
      fluxo, ou vira um nome genérico ("a Loja") para a plataforma servir a
      outras cervejarias?

A última pergunta é a mais relevante para o produto: se a Bravva vai **licenciar
a solução para outras operações**, o nome da operadora deveria ser um **dado de
configuração**, não texto fixo. Isso é um pouco mais de trabalho agora e evita
refazer tudo no segundo cliente.

## Recomendação

Separar em duas entregas:

1. **Marca da plataforma → Bravva** (logo, nome do produto, cabeçalho e rodapé
   dos e-mails, domínio). Baixo risco, alto efeito percebido.
2. **Nome da operadora → configurável** (a "Loja" passa a ter nome parametrizado).
   Prepara o licenciamento para outros clientes.

A entrega 1 pode começar assim que chegarem o logo e a definição do nome. A
entrega 2 é decisão de produto, não de branding.
