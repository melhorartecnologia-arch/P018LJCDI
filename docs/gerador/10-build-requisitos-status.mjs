// Gera o PDF REV02 — Requisitos Funcionais Melhorias da Fase 1 com STATUS DE EXECUÇÃO
// (base: documento REV01 de 15/07/2026 + implementações de 16–17/07/2026).
// Rode a partir de docs/gerador:  node 10-build-requisitos-status.mjs
import pw from '/opt/node22/lib/node_modules/playwright/index.js'
const { chromium } = pw

const OUT = '/home/user/P018LJCDI/docs/Plataforma-Cidade-Imperial-Requisitos-Melhorias-Fase1-REV02-Status.pdf'

// Status de execução por requisito (17/07/2026, branch claude/plataforma-cidade-imperial-dmxbmw)
const EXEC = {
  RF48: { commit: '50f311b',
    entrega: 'Rótulo "Recebimento de Pedidos" aplicado no detalhe do pedido, nas ações por item, nos e-mails, na trilha do pedido, na auditoria e nos guias "Como usar". Suíte E2E de aceite verde.',
    evid: 'docs/evidencias/RF48-Evidencia / RF48-Descricao',
    obs: 'As capturas estáticas do Manual do Usuário geradas antes da mudança ainda exibem o rótulo antigo — recaptura disponível sob demanda.' },
  RF52: { commit: '617bd64',
    entrega: 'Busca por código/descrição em tempo real (já existente, agora verificada por E2E) + novo filtro de categoria combinável com fornecedor, status e busca; contador de resultados sempre visível ("N de M produto(s)"), botão "✕ Limpar busca e filtros" e estado vazio claro.',
    evid: 'docs/evidencias/BuscadorFiltrosProdutos-Descricao' },
  RF55: { commit: 'd390af0',
    entrega: 'Fornecedor vê somente os produtos vinculados em todas as telas — inclusive nas cotações mistas, cujo card e janela de proposta passam a exibir só os itens vinculados (com aviso e total recalculado). Tentativas de acesso direto a produto de terceiro (ficha, imagem) são bloqueadas com toast e evento "Acesso bloqueado a produto de terceiro" na auditoria.',
    evid: 'docs/evidencias/RestricaoVisibilidadeFornecedor-Descricao' },
  RF59: { commit: '7fcf01e',
    entrega: 'Proposta com modalidade do frete (CIF/FOB/Outros), valor, transportadora, condições de pagamento e de entrega; composição "produtos + frete = total" recalculada ao vivo; mapa comparativo com colunas Produtos | Frete | Total c/ frete lado a lado; MENOR PREÇO e justificativa (RF28) pelo total com frete; condições rastreadas por rodada no histórico, auditoria e e-mails.',
    evid: 'docs/evidencias/FreteCondicoesProposta-Descricao' },
  RF65: { commit: 'e576648',
    entrega: 'Campo "Dia acordado de pagamento" (1 a 30, sem referência de mês) no novo contrato e no ajuste, com validação e de/para no histórico; o vencimento sugerido das cobranças passa a cair no dia acordado no mês seguinte à competência (padrão dia 10; meses curtos usam o último dia), sempre editável e com a origem indicada na janela.',
    evid: 'docs/evidencias/DiaAcordadoPagamento-Descricao' },
  RF67: { commit: 'b8600f4',
    entrega: 'Usuário de revenda vinculável a N revendas (seleção múltipla no cadastro); seletor de contexto dourado sempre visível com troca sem novo login (auditada); ações registradas na revenda ativa; visão consolidada do grupo com KPIs agregados e revenda identificada por linha (consolidado é somente consulta). Usuária demo: Milena Duarte.',
    evid: 'docs/evidencias/MultiRevendaGrupo-Descricao' },
  RF68: { commit: '32f35a4',
    entrega: 'Etapa de APROVAÇÃO COMERCIAL: após a vencedora, itens ficam "Aguardando aceite da revenda" (fornecedor não recebe); tela de aceite por item com valores negociados, frete (RF59), prazo e condições; recusa com motivo obrigatório devolve à negociação reabrindo a cotação em nova rodada (RF58) com recálculo; trilha, auditoria e e-mails registram a decisão; workflow reflete a etapa.',
    evid: 'docs/evidencias/AceiteRevendaNegociacao-Descricao' },
  RF53: { commit: '5d88e65',
    entrega: 'Área "Meus produtos" no perfil Fornecedor, restrita aos produtos vinculados (RF55), com pesos bruto/líquido, dimensões, cubagem calculada automaticamente, NCM com máscara e 8 dígitos validados, GTIN/EAN (8/12/13/14 dígitos), unidade de medida, upload de imagens e observações fiscais/logísticas. A Loja edita os mesmos campos em nome do fornecedor no detalhe do produto; toda alteração registrada com quem/quando/de-para e auditada.',
    evid: 'docs/evidencias/ComplementacaoCadastral-Descricao' },
  RF57: { commit: '19391bd',
    entrega: 'Quantidade editável por item na janela "Abrir cotação" (sem alterar o pedido de origem — o saldo permanece aprovado), barra "Total estimado da cotação" recalculada em tempo real com subtotal por item e aviso de quantidade inválida; a quantidade cotada fica registrada na cotação ("Demanda cotada ×N") e visível aos fornecedores convidados.',
    evid: 'docs/evidencias/EdicaoQuantidadesCotacao-Descricao' },
  RF50: { commit: 'e56835d',
    entrega: 'Preço estimado pré-preenchido com o último valor do histórico (última alteração de preço ou último preço praticado), permanecendo editável e alimentando o histórico.',
    evid: 'docs/evidencias/PrecoEstimado-*' },
  RF51: { commit: '3b86191',
    entrega: 'Vínculo N:M com buscador e seleção múltipla no cadastro do produto; cotações convidam os fornecedores vinculados aos itens; envio direto restrito aos vinculados; catálogo, pedidos e detalhe do produto tratando o vínculo múltiplo.',
    evid: 'docs/evidencias/MultiplosFornecedores-*' },
  RF58: { commit: 'ed91b62',
    entrega: 'Ação "Nova rodada" com seleção de itens e fornecedores, contrapropostas por item, evolução entre rodadas no comparativo, decisão em qualquer rodada (por item ou processo) e trilha completa de auditoria + e-mail de convite à rodada.',
    evid: 'docs/evidencias/RodadasCotacao-Descricao' },
  RF60: { commit: '0eb54c5',
    entrega: 'Upload múltiplo na janela da proposta e no card do pedido em atendimento; anexos com nome, data e autor, centralizados e com download para a Loja (e revenda quando aplicável); limites de 5 arquivos × 5 MB com mensagens claras de erro.',
    evid: 'docs/evidencias/AnexosPropostaAtendimento-Descricao' },
  RF61: { commit: 'ac7c04c',
    entrega: 'Alternância cards ⇄ lista detalhada em "Pedidos recebidos", com colunas produto, quantidade, valor, situação do item, pedido e revenda (com dados de entrega/contato), respeitando a restrição de visibilidade do fornecedor.',
    evid: 'docs/evidencias/ListaDetalhadaFornecedor-Descricao' },
  RF62: { commit: 'cf67e24',
    entrega: 'Telefone com máscara + nome de contato nos cadastros de fornecedor e revenda, exibidos nos detalhes e nas visões operacionais — inclusive na visão do fornecedor sobre a revenda destino (RF61).',
    evid: 'docs/evidencias/TelefoneContatos-Descricao' },
  RF70: { commit: '11622a0',
    entrega: 'Registro de faturamento aceita múltiplos anexos identificados por tipo (NF, boleto, outro); a revenda destinatária vê e baixa todos os documentos na linha do pedido; Loja e fornecedor mantêm a visão completa com o selo da análise fiscal.',
    evid: 'docs/evidencias/DocsFaturamentoRevenda-*' },
  RF71: { commit: '6023951',
    entrega: 'Upload do comprovante (PDF/imagem, 5 MB) no fluxo acordado: o fornecedor envia o arquivo e somente a confirmação da Loja muda o status para pago; download do comprovante nas visões Loja e Fornecedor.',
    evid: 'docs/evidencias/ComprovanteRoyalty-Descricao' },
  RF72: { commit: '1482c1d',
    entrega: 'Aba "Vendas por produto" em Relatórios com visão em tabela e visão gráfica com drill-down por produto, filtros por período, produto, revenda, fornecedor e categoria, e exportação Excel do recorte.',
    evid: 'docs/evidencias/RelatorioVendaProdutos-*' },
  RF69: { commit: '560f91a',
    entrega: 'Revenda e Loja podem recusar o documento fiscal com motivo obrigatório; a nota fica "Documento recusado — pendente de regularização" com o valor fora dos royalties até regularizar; o fornecedor vê a pendência com o motivo e reenvia por janela própria (novo documento passa pela análise fiscal, que barra arquivo incompatível); histórico completo de recusas/reenvios na linha da nota, auditoria e e-mails (nf_recusada / nf_regularizada).',
    evid: 'docs/evidencias/RecusaDocumentoFiscal-Descricao' },
  RF54: { commit: '02adf4f',
    entrega: 'Upload de múltiplas imagens (PNG/JPG, 5 MB) com pré-visualização imediata e tag NOVA na janela do produto; clique define a imagem PRINCIPAL — usada no catálogo das revendas, listas e detalhe; remoção nunca perde a imagem: painel "Histórico de imagens" preserva as substituídas com miniatura, autor e data; bloqueio impede produto sem imagem; produto novo pode nascer com imagens reais; tudo auditado e persistido.',
    evid: 'docs/evidencias/GestaoImagensProduto-Descricao' },
  RF56: { commit: '2d1d16b',
    entrega: 'Tela própria "De/Para Produto × Fornecedor" (menu Cadastros da Loja): matriz produto × fornecedores ativos com vínculo alternado por clique; alimenta na hora a visibilidade do fornecedor (RF55) e os convidáveis de cotação/envio direto (mesmo cadastro do RF51); cada criação/remoção auditada nominalmente; bloqueio do último vínculo; alerta âmbar para fornecedor sem contrato vigente; KPIs (vínculos ativos, produtos com fornecedor único), busca e atalho no detalhe do produto.',
    evid: 'docs/evidencias/DeParaProdutoFornecedor-Descricao' },
  RF49: { commit: 'a7d154e',
    entrega: 'Linha completa de 9 etapas no detalhe do pedido (recebimento/aprovação → cotação/decisão → seleção do vencedor → aceite comercial da revenda → encaminhamento → confirmação pelo fornecedor → produção/atendimento → faturamento → conclusão), com a etapa atual destacada, etapas não aplicáveis puladas e chip "Etapa N/9". Toda transição registrada automaticamente na trilha e na auditoria com data, usuário e de/para. Nova ação do fornecedor "Confirmar recebimento". Loja e Revenda com o mesmo rótulo de etapa nas listas e novo filtro "Todas as etapas" nas duas visões (+ status "aguardando aceite" no filtro da Loja).',
    evid: 'docs/evidencias/WorkflowStatusPedido-Descricao' },
  RF63: { commit: '2d3f6b9',
    entrega: 'Campo "gatilho de pagamento" no contrato (emissão da NF — padrão, entrada do pedido, recebimento do boleto pelo fornecedor ou outro gatilho com descrição obrigatória). O vencimento sugerido da cobrança passa a ser o dia acordado do fornecedor (RF65) no mês seguinte à data do gatilho mais recente do fechamento, com a base explicada na janela e campo editável; gatilho boleto usa a data do boleto anexado (base provisória na NF até anexar). Alterações com de/para no histórico do contrato e na auditoria.',
    evid: 'docs/evidencias/GatilhosPagamentoRoyalty-Descricao' },
  RF64: { commit: '24c3fd2',
    entrega: 'Contratos com royalty parcelado (1 a 12 parcelas mensais): a cobrança divide o valor apurado em parcelas exatas em centavos, com vencimentos individuais (1ª no vencimento do gatilho, demais no mesmo dia dos meses seguintes) e prévia recalculada ao vivo. Cada parcela tem status próprio (a pagar/em atraso/paga), registro de pagamento e lembrete de atraso individuais; o fechamento só fica pago com todas quitadas. Painel "Controle por parcela" consolida previsto × recebido × pendente × em atraso.',
    evid: 'docs/evidencias/RoyaltiesParcelados-Descricao' },
  RF66: { commit: '62eb444',
    entrega: 'Painel "Economia da cotação — escolha × negociação" nas cotações decididas: economia da ESCOLHA (referência dos itens − menor proposta da 1ª rodada, com frete) separada da economia ADICIONAL de negociação (rodadas RF58 e adjudicação por item), com fluxo referência → menor 1ª rodada → fechamento e % sobre a referência. Consolidado por período (mês da decisão) na tela de Cotações, com tabela por cotação.',
    evid: 'docs/evidencias/EconomiaCotacao-Descricao' },
  RF73: { commit: '9e48afe',
    entrega: 'Painéis de indicadores na aba "Venda por produtos": evolução das vendas (volume em unidades e valor por mês do pedido), produtos mais vendidos (top por quantidade, com preço médio por produto) e revendas que mais compraram (por valor, com unidades e pedidos) — todos calculados sobre o mesmo recorte e respondendo aos filtros de período, produto, revenda, fornecedor e categoria.',
    evid: 'docs/evidencias/IndicadoresVendas-Descricao' },
}
const PEND_OBS = {
  RF74: 'O pré-requisito RF58 (rodadas de cotação) já foi executado — o treinamento/material pode ser agendado.',
  RF75: 'Todos os blocos funcionais (A–G) estão executados; pendente apenas a atualização consolidada do Manual do Usuário e dos tutoriais com as novas rotinas.',
}
const EXEC_DATA = '17/07/2026'

// [id, titulo, origem, prioridade, descricao, criterios[], dependencia?]
const BLOCOS = [
{ b: 'Bloco A — Terminologia e fluxo do pedido', reqs: [
  ['RF48', 'Renomear o botão de aprovação para "Recebimento de Pedidos"', 'Ata 5.1 · tarefa "Ajuste de Taxonomia de Botão"', 'Alta (esforço baixo)',
   'Alterar a taxonomia do botão hoje rotulado "Aprovar" na tela de pedidos da Loja para "Recebimento de Pedidos", refletindo que a ação representa o recebimento/confirmação do pedido da revenda, e não a aprovação comercial final. A alteração deve ser aplicada em todos os pontos onde o rótulo aparece: botão do detalhe do pedido, ações por item, textos dos e-mails, trilha do pedido, auditoria e guias "Como usar".',
   ['O botão e as ações por item exibem a nova nomenclatura em todas as telas.',
    'E-mails, trilha do pedido, eventos de auditoria e tutoriais refletem o novo termo.',
    'Nenhuma referência ao rótulo antigo permanece visível ao usuário.'],
   'Observação: a transcrição registra "Confirmação de Recebimento" e a ata REV01 registra "Recebimento de Pedidos" — o rótulo final deve ser confirmado pela Loja na aprovação deste documento.'],
  ['RF49', 'Workflow de status detalhado do pedido (substituir/complementar "Encaminhado")', 'Ata 5.11', 'Alta',
   'Evoluir o modelo de status do pedido para evidenciar o estágio real de cada item e do pedido como um todo. O status "Encaminhado" deve ser substituído ou complementado por uma linha de etapas que demonstre: aprovação (recebimento) → cotação → seleção do vencedor → aceite comercial da revenda (RF69) → encaminhamento ao fornecedor → recebimento/confirmação pelo fornecedor → produção ou atendimento → faturamento → conclusão. Cada transição registra data, usuário e status anterior/novo, visível para Loja e Revenda.',
   ['O detalhe do pedido exibe a linha do tempo de etapas com a etapa atual destacada.',
    'Cada transição fica registrada com data, usuário e status (trilha do pedido + auditoria).',
    'Loja e Revenda visualizam o mesmo estágio, com nomenclatura clara por etapa.',
    'Listas e filtros de pedidos passam a refletir os novos status.']],
] },
{ b: 'Bloco B — Produtos homologados', reqs: [
  ['RF50', 'Preço estimado automático a partir do histórico', 'Ata 5.2 · Gestão de preços', 'Média',
   'O campo "Preço Estimado" do produto homologado deve ser preenchido automaticamente com o último preço registrado no histórico do produto (última alteração de preço ou último preço praticado), permanecendo editável pela Loja.',
   ['Ao abrir o cadastro/edição, o preço estimado vem preenchido com o último valor do histórico.',
    'A alteração manual continua possível e alimenta o histórico de preços.']],
  ['RF51', 'Produto associado a múltiplos fornecedores', 'Ata 5.2 · tarefa "Buscador e Seleção Múltipla de Fornecedores em Produtos"', 'Alta',
   'Permitir que um mesmo produto homologado seja associado a MÚLTIPLOS fornecedores (relação N:M), com buscador e seleção múltipla de fornecedores no cadastro do produto. O produto passa a poder participar de cotações com fornecedores diferentes, e o envio direto passa a exigir a escolha do fornecedor entre os vinculados.',
   ['O cadastro de produto permite selecionar vários fornecedores, com busca por nome.',
    'Cotações listam como convidáveis os fornecedores vinculados aos produtos cotados.',
    'As telas que hoje assumem um único fornecedor por produto (catálogo, pedidos, relatórios) passam a tratar o vínculo múltiplo.']],
  ['RF52', 'Buscador e filtros na tela de produtos', 'Ata 5.2 · Pesquisa e usabilidade', 'Média',
   'Adicionar buscador por código e descrição e filtros (ex.: fornecedor, situação ativo/inativo, categoria quando houver) na tela de produtos homologados, para localização rápida em catálogos grandes.',
   ['Busca por código e por trecho da descrição filtra a lista em tempo real.',
    'Filtros combináveis com a busca; contador de resultados visível.']],
  ['RF53', 'Complementação cadastral do produto pelo fornecedor (dados fiscais e logísticos)', 'Ata 5.2 · Complementação cadastral', 'Alta',
   'Permitir que o fornecedor complemente o cadastro dos produtos que fornece com: peso bruto e líquido, altura, largura, comprimento, cubagem, NCM, GTIN/EAN, unidade de medida, imagens e demais informações fiscais e logísticas. A Loja também pode complementar ou ajustar esses cadastros em nome do fornecedor quando necessário (Ata 5.2 · Administração pela Loja).',
   ['O fornecedor acessa uma área de complementação apenas dos SEUS produtos (ver RF55).',
    'Todos os campos listados ficam disponíveis, com validação de formato (NCM, EAN).',
    'Usuários da Loja conseguem editar os mesmos campos em nome do fornecedor.',
    'Alterações ficam registradas (quem alterou, quando, de/para).']],
  ['RF54', 'Gestão de imagens do produto', 'Ata 5.2 · Gestão de imagens', 'Média',
   'Permitir upload de múltiplas imagens por produto, escolha da IMAGEM PRINCIPAL exibida no catálogo das revendas e manutenção do histórico das imagens (a definição de qual imagem é a principal é responsabilidade operacional da Loja).',
   ['Upload de múltiplas imagens com pré-visualização.',
    'Marcação de uma imagem como principal; o catálogo da revenda usa a principal.',
    'Histórico preservado (imagens substituídas não são perdidas).']],
  ['RF55', 'Restrição de visibilidade de produtos por fornecedor', 'Ata 5.2 · Controle de visibilidade · tarefa "Restrição de Visualização"', 'Alta',
   'O fornecedor deve visualizar e manipular SOMENTE os produtos vinculados ao seu cadastro — sem exposição de produtos de concorrentes nem de relações comerciais de terceiros, em nenhuma tela (complementação cadastral, cotações, pedidos, faturamentos).',
   ['Em todas as telas do perfil Fornecedor, apenas os produtos vinculados aparecem.',
    'Tentativas de acesso direto a produtos de terceiros são bloqueadas e auditadas.']],
  ['RF56', 'Cadastro De/Para Produto × Fornecedor', 'Ata 5.2 · De/Para Produto x Fornecedor', 'Alta',
   'Disponibilizar um cadastro "De/Para" entre produtos e fornecedores que controle: visibilidade (RF55), elegibilidade em cotações (quais fornecedores podem ser convidados por produto) e a manutenção dos vínculos. A gestão operacional do De/Para é responsabilidade da Loja.',
   ['Tela própria (ou seção no produto) para gerir os vínculos produto×fornecedor.',
    'O De/Para alimenta a visibilidade do fornecedor e a lista de convidáveis das cotações.',
    'Alterações de vínculo são auditadas.']],
] },
{ b: 'Bloco C — Cotações (abertura, rodadas, frete e anexos)', reqs: [
  ['RF57', 'Edição de quantidades na abertura da cotação com recálculo automático', 'Ata 5.3', 'Alta (esforço baixo)',
   'Na tela "Abrir Cotação", permitir editar a quantidade de cada produto incluído (sem alterar o pedido de origem) e recalcular automaticamente o valor total estimado a cada alteração.',
   ['Campo de quantidade editável por item na janela de abertura da cotação.',
    'Total estimado recalculado em tempo real.',
    'A quantidade cotada fica registrada na cotação e visível aos convidados.']],
  ['RF58', 'Múltiplas rodadas de cotação e renegociação por item', 'Ata 5.4 · transcrição "rodadas adicionais de negociação"', 'Alta',
   'Adicionar o conceito de RODADAS à cotação: após receber propostas, a Loja pode abrir uma nova rodada — para toda a cotação ou para itens/produtos específicos — solicitando contrapropostas aos fornecedores selecionados. Devem ser preservados: histórico de convites, propostas e contrapropostas por rodada, condições negociadas em cada rodada e o resultado final, com trilha completa de auditoria.',
   ['Ação "Nova rodada" disponível em cotações com propostas recebidas, com seleção de itens e fornecedores participantes.',
    'Fornecedores convidados à rodada são notificados e podem revisar seus preços/condições.',
    'O comparativo exibe a evolução entre rodadas; o histórico registra tudo (quem, quando, valores de/para).',
    'A decisão final pode ocorrer em qualquer rodada, por item ou pelo processo inteiro.']],
  ['RF59', 'Frete e condições comerciais na proposta do fornecedor', 'Ata 5.5 · tarefa "Informação de Frete na Cotação"', 'Alta',
   'A resposta do fornecedor à cotação deve incluir informações de frete e condições: modalidade do frete (CIF/FOB/outros), valor do frete, transportadora, prazo, condições de entrega e condições de pagamento. A proposta deve exibir a composição separada — valor dos produtos, valor do frete e valor total — e o comparativo de propostas e a seleção do vencedor devem considerar o frete e as demais condições (critérios de comparação a validar pela Loja).',
   ['Formulário de proposta com os campos de frete e condições listados.',
    'Composição da proposta exibida separadamente (produtos + frete = total).',
    'Tela comparativa das propostas mostra frete e total com frete, lado a lado.',
    'Rastreabilidade completa das condições negociadas (por rodada, quando RF58 ativo).']],
  ['RF60', 'Anexos na resposta da cotação e no atendimento do pedido', 'Ata 5.7 · tarefa "Anexos na Proposta de Cotação"', 'Alta',
   'Permitir que o fornecedor anexe arquivos em outras etapas além do faturamento: na RESPOSTA À COTAÇÃO (propostas comerciais, planilhas de frete, tabelas de preço, catálogos, documentos complementares) e durante o ATENDIMENTO do pedido. Os documentos ficam centralizados na plataforma, visíveis à Loja (e à revenda quando aplicável).',
   ['Upload de um ou mais anexos na janela de proposta e no card do pedido em atendimento.',
    'Anexos listados com nome, data e autor; download disponível para a Loja.',
    'Limites de tamanho/formato definidos e mensagens claras de erro.']],
] },
{ b: 'Bloco D — Visão do fornecedor', reqs: [
  ['RF61', 'Pedidos recebidos em visualização detalhada de lista', 'Ata 5.6', 'Média',
   'Adicionar ao perfil Fornecedor uma visualização detalhada em formato de lista dos pedidos recebidos — no conceito já utilizado na análise de cotação — exibindo produtos, quantidades, valores, situação de cada item, dados do pedido e dados da revenda de destino. O objetivo é apoiar conferência, produção, separação, logística e faturamento.',
   ['Alternância entre a visão atual (cards) e a visão de lista detalhada.',
    'Colunas: produto, quantidade, valor, situação do item, pedido, revenda (com dados de entrega/contato).',
    'A lista respeita a restrição de visibilidade (apenas itens do fornecedor).']],
] },
{ b: 'Bloco E — Fornecedores, contratos e regras de royalty', reqs: [
  ['RF62', 'Telefone e dados de contato adicionais nos cadastros', 'Ata 5.8 · tarefas "Telefone no Cadastro de Fornecedor/Revenda"', 'Média (esforço baixo)',
   'Incluir campo de TELEFONE (e dados adicionais de contato) no cadastro de FORNECEDOR — além do e-mail já existente — e campo de TELEFONE no cadastro de REVENDA.',
   ['Campos de telefone com máscara nos dois cadastros, exibidos nos detalhes.',
    'Dados presentes nas visualizações usadas pela operação (ex.: visão do fornecedor sobre a revenda destino — RF61).']],
  ['RF63', 'Gatilhos de pagamento do royalty por contrato', 'Ata 5.8 · tarefa "Regras de Contrato de Royalty"', 'Alta',
   'Complementar o cadastro de contrato de royalty com a parametrização do GATILHO que dispara a obrigação de pagamento: entrada (data) do pedido, emissão da nota fiscal, recebimento do boleto pelo fornecedor, ou outros gatilhos previstos contratualmente. A apuração e o vencimento dos fechamentos passam a considerar o gatilho configurado em cada contrato. As definições contratuais por fornecedor são responsabilidade da Loja.',
   ['Campo "gatilho de pagamento" no contrato, com as opções listadas.',
    'O fechamento/cobrança calcula as datas conforme o gatilho do contrato vigente.',
    'Alterações de gatilho ficam no histórico do contrato e na auditoria.']],
  ['RF64', 'Royalties parcelados com controle por parcela', 'Ata 5.8 · Royalties parcelados', 'Alta',
   'Permitir contratos com royalties PARCELADOS: o valor apurado pode ser dividido em parcelas com datas próprias, com controle individual de cada parcela e acompanhamento consolidado de valores previstos, recebidos, pendentes e em atraso.',
   ['Configuração de parcelamento no contrato (nº de parcelas/regra).',
    'Fechamento gera as parcelas com vencimentos individuais; cada parcela tem status próprio (a pagar, em atraso, paga).',
    'Cobranças, lembretes e registro de pagamento funcionam por parcela.',
    'Painel consolida previsto × recebido × pendente × em atraso.']],
  ['RF65', 'Dia acordado de pagamento por fornecedor', 'Ata 5.8 · Data de pagamento', 'Média',
   'Permitir definir, por fornecedor/contrato, o DIA ACORDADO de pagamento dos royalties (ex.: todo dia 15), independentemente do gatilho — o vencimento sugerido das cobranças passa a usar esse dia.',
   ['Campo "dia acordado de pagamento" no contrato.',
    'A emissão de cobrança sugere o vencimento com base no dia acordado (editável).']],
  ['RF66', 'Previsão de recebíveis — Previsto × Realizado', 'Ata 5.8 · Previsão de recebíveis', 'Média',
   'Disponibilizar visão gerencial de recebíveis de royalties com comparativo PREVISTO × REALIZADO por período e fornecedor, considerando gatilhos, parcelas e datas acordadas (RF63–RF65), para apoiar o planejamento financeiro da Loja.',
   ['Painel/aba com previsto × realizado por competência e por fornecedor.',
    'Considera parcelas futuras (previsto) e pagamentos registrados (realizado).',
    'Exportação do recorte em Excel.']],
] },
{ b: 'Bloco F — Acesso multi-revendas', reqs: [
  ['RF67', 'Usuário/perfil com acesso a múltiplas revendas (grupo econômico)', 'Ata 5.9 · tarefa "Usuário de Revenda com Acesso a Múltiplas Revendas" (necessidade da Milena)', 'Alta',
   'Criar perfil administrativo de revenda com acesso a MÚLTIPLAS revendas do mesmo grupo econômico. O usuário deve conseguir operar em nome de cada revenda vinculada — pedidos, consultas, cotações, aprovações comerciais (RF69), documentos e acompanhamento de status — com TROCA RÁPIDA DE CONTEXTO e identificação clara da revenda ativa, além de visão consolidada do grupo com indicadores agregados.',
   ['Vínculo do usuário a N revendas no cadastro de usuários.',
    'Seletor de contexto sempre visível indicando a revenda em uso; troca sem novo login.',
    'Pedidos e ações são registrados na revenda do contexto ativo.',
    'Visão consolidada: listas e indicadores agregados do grupo + consulta individual.']],
] },
{ b: 'Bloco G — Aprovação comercial pela revenda', reqs: [
  ['RF68', 'Aceite ou recusa da negociação pela revenda (por item), com retorno ao fluxo', 'Ata 5.10 · tarefa "Aprovação de Pedido pela Revenda"', 'Alta',
   'Incluir no fluxo, após a seleção da proposta vencedora, a etapa de APROVAÇÃO COMERCIAL PELA REVENDA: a revenda visualiza os valores e condições negociadas (incluindo frete — RF59) ANTES do encaminhamento definitivo ao fornecedor e pode ACEITAR ou RECUSAR, preferencialmente POR ITEM do pedido. Em caso de recusa, retirada de itens ou alteração de quantidade, o fluxo retorna à negociação/cotação com recálculo de valores e frete. A decisão é registrada com usuário, data, itens afetados e motivo. (Este é o momento em que a revenda passa a conhecer os valores, mantendo o sigilo de preços do catálogo.)',
   ['Nova etapa/tela de aceite para a revenda com itens, quantidades, valores negociados e frete.',
    'Aceite/recusa por item, com motivo obrigatório na recusa.',
    'Recusa ou alteração devolve os itens ao fluxo de negociação (nova rodada — RF58) com recálculo.',
    'Somente após o aceite os itens são encaminhados ao fornecedor; o workflow (RF49) reflete a etapa.',
    'Decisões registradas na trilha do pedido, na auditoria e comunicadas por e-mail.']],
] },
{ b: 'Bloco H — Documentação fiscal e comprovantes', reqs: [
  ['RF69', 'Recusa de documento fiscal com workflow de devolução', 'Ata 5.12 · tarefa "Funcionalidade de Recusa de Nota Fiscal"', 'Alta',
   'Permitir que a Loja (e a Revenda, conforme critérios a validar) RECUSE um documento fiscal anexado ao faturamento, registrando motivo, data e usuário responsável. A recusa dispara o workflow de devolução: o fornecedor é notificado, a nota fica marcada como "recusada" no sistema e o faturamento retorna ao estado pendente de regularização (novo anexo/registro). Todo o histórico de análises, aprovações e recusas é mantido.',
   ['Ação "Recusar documento" nas visões da nota (Loja/Revenda), com motivo obrigatório.',
    'Nota marcada com situação "Recusada" + motivo visíveis a todos os envolvidos.',
    'Fornecedor notificado por e-mail e com pendência clara na visão dele para reenviar o documento.',
    'Histórico completo (análise automática + decisões humanas) preservado e auditado.']],
  ['RF70', 'Visibilidade dos documentos do faturamento para a Revenda (incl. boletos)', 'Ata 5.12 · Visibilidade · transcrição "notas fiscais e boletos"', 'Média',
   'Garantir que os documentos anexados ao faturamento (nota fiscal e demais anexos, como BOLETOS) sejam visualizáveis também pela REVENDA destinatária, além da Loja e do fornecedor. Permitir mais de um anexo por faturamento (ex.: NF + boleto).',
   ['A tela de pedidos/faturamentos da revenda exibe os anexos da nota para download.',
    'O registro de faturamento aceita múltiplos anexos identificados por tipo (NF, boleto, outro).']],
  ['RF71', 'Upload de comprovante de pagamento de royalty', 'Tarefa "Upload de Comprovante de Pagamento de Royalty"', 'Média (esforço baixo)',
   'Na tela de registro de pagamento de royalty, permitir o UPLOAD do arquivo do comprovante (PDF/imagem) — hoje o campo é apenas textual. O arquivo fica vinculado ao fechamento/parcela e disponível para download pela Loja e pelo fornecedor.',
   ['Campo de upload no modal "Registrar pagamento" (formatos e limite definidos).',
    'Link de download do comprovante na linha do fechamento (visões Loja e Fornecedor).']],
] },
{ b: 'Bloco I — Relatórios e indicadores', reqs: [
  ['RF72', 'Relatório de vendas por produto', 'Ata 5.13 · Relatório de vendas', 'Média',
   'Disponibilizar relatório por PRODUTO contendo: código, quantidade, valor total, preço unitário, preço médio, revenda, fornecedor e data do pedido/venda — com filtros por período, produto, revenda, fornecedor e categoria, e exportação.',
   ['Nova aba/da seção de relatórios com a tabela por produto e os filtros listados.',
    'Exportação Excel do recorte filtrado.']],
  ['RF73', 'Indicadores de vendas', 'Ata 5.13 · Indicadores de vendas', 'Média',
   'Apresentar no painel gerencial: produtos mais vendidos, volume por período, evolução das vendas, preço médio, revendas que mais compraram e quantidade por produto.',
   ['KPIs/gráficos novos respondendo aos filtros existentes do painel.']],
  ['RF74', 'Economia da cotação — menor preço × negociação', 'Ata 5.13 · Economia da cotação', 'Média',
   'Diferenciar, nos indicadores de cotações, a ECONOMIA DA ESCOLHA (diferença para o menor preço da 1ª rodada / referência) da ECONOMIA ADICIONAL obtida nas rodadas de negociação (RF58), evidenciando o ganho gerado pelo processo de compra.',
   ['Indicador com as duas parcelas de economia por cotação e consolidado por período.',
    'Depende do RF58 (rodadas) para a parcela de negociação.']],
  ['RF75', 'Análises de desempenho ampliadas', 'Ata 5.13 · Desempenho', 'Baixa',
   'Consolidar/ampliar as análises por fornecedor, revenda, pedidos, faturamento e royalties com os novos dados dos requisitos anteriores (frete, rodadas, parcelas, aceite da revenda).',
   ['Painéis atualizados incorporando os novos campos após a implementação dos blocos C, E e G.']],
] },
]

const PEND_LOJA = [
  ['Ata 5.2', 'Manter o De/Para Produto × Fornecedor e validar quais produtos ficam disponíveis para cada fornecedor.'],
  ['Ata 5.2', 'Definir a imagem principal do catálogo quando houver múltiplas imagens.'],
  ['Ata 5.5', 'Validar os critérios de comparação e seleção das propostas (frete, prazo, condições de pagamento).'],
  ['Ata 5.8', 'Formalizar, por fornecedor/contrato, os gatilhos de pagamento, a regra de parcelamento e a data acordada de pagamento.'],
  ['Ata 5.10', 'Validar a regra de aceite/recusa por item pela revenda e o comportamento do retorno à cotação.'],
  ['Ata 5.12', 'Validar os critérios para análise e recusa dos documentos fiscais.'],
  ['Ata 5.13', 'Priorizar os indicadores e relatórios necessários à operação.'],
]

const DEPS = [
  'E-mail dedicado (conta SMTP e credenciais) na infraestrutura da Cervejaria — necessário para os workflows de notificação (recusa de NF, rodadas de cotação, aceite da revenda).',
  'Chave de API de IA (ANTHROPIC_API_KEY) configurada no servidor — necessária para a análise fiscal com IA em produção (sem ela, opera o analisador local).',
  'Atualização do Plano de Testes da Fase 1 após a implementação, antes da nova rodada de validação (Ata, seções 6 e 8).',
]

const esc = (s) => String(s == null ? '' : s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]))
const prioCor = (p) => p.startsWith('Alta') ? '#a33a2b' : p.startsWith('Média') ? '#8a5a12' : '#2f6b39'

function reqHtml([id, titulo, origem, prio, desc, criterios, nota]) {
  const ex = EXEC[id]
  const badge = ex
    ? `<span class="st st-ok">✓ EXECUTADO</span>`
    : `<span class="st st-pend">⏳ PENDENTE</span>`
  const rodape = ex
    ? `<div class="exec-box"><b>✓ Executado em 16–17/07/2026 · commit ${esc(ex.commit)}</b><br>${esc(ex.entrega)}<br><span class="exec-evid">Evidências: ${esc(ex.evid)} · verificação: suíte E2E de aceite + regressões em banco novo.</span>${ex.obs ? `<br><span class="exec-obs">Observação: ${esc(ex.obs)}</span>` : ''}</div>`
    : `<div class="pend-box"><b>⏳ Ainda não executado</b> — aguardando aprovação/priorização.${PEND_OBS[id] ? ' ' + esc(PEND_OBS[id]) : ''}</div>
    <table class="aprova"><tr>
      <td style="width:52%"><b>Decisão:</b> ☐ Aprovado &nbsp; ☐ Aprovado com ajustes &nbsp; ☐ Reprovado</td>
      <td><b>Observações:</b></td></tr></table>`
  return `<section class="req${ex ? ' req-ok' : ''}">
    <div class="req-head">
      <span class="req-id">${esc(id)}</span>
      <h3>${esc(titulo)}</h3>
      ${badge}
      <span class="req-prio" style="color:${prioCor(prio)};border-color:${prioCor(prio)}55;background:${prioCor(prio)}0d">${esc(prio)}</span>
    </div>
    <div class="req-origem">Origem: ${esc(origem)}</div>
    <p class="req-desc">${esc(desc)}</p>
    <div class="req-crit"><b>Critérios de aceite:</b><ul>${criterios.map((c) => `<li>${esc(c)}</li>`).join('')}</ul></div>
    ${nota ? `<div class="nota">${esc(nota)}</div>` : ''}
    ${rodape}
  </section>`
}

const total = BLOCOS.reduce((a, b) => a + b.reqs.length, 0)
const nExec = Object.keys(EXEC).length
const pct = Math.round((nExec / total) * 100)
const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><style>
  @page { size: A4; margin: 0; }
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:'Segoe UI',Arial,sans-serif; color:#272525; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
  .capa { height:296.5mm; position:relative; background:radial-gradient(900px 500px at 70% -10%, #3a2f1c, #272525 55%, #1c1a18); page-break-after:always; }
  .miolo { padding:14mm 15mm; }
  h2.bloco { font-size:15px; font-weight:800; color:#fff; background:linear-gradient(135deg,#3a3227,#272525); border-radius:10px; padding:10px 14px; margin:14px 0 8px; break-after:avoid; }
  h3 { font-size:13px; font-weight:800; color:#272525; flex:1; line-height:1.35; }
  .req { break-inside:avoid; border:1px solid #eae3d6; border-radius:10px; padding:10px 13px; margin-bottom:10px; background:#fffdf9; }
  .req-head { display:flex; align-items:center; gap:10px; }
  .req-id { font-family:Consolas,monospace; font-size:11.5px; font-weight:700; color:#fff; background:linear-gradient(135deg,#cfa055,#B38335 60%,#8a6428); border-radius:7px; padding:3px 10px; flex:none; }
  .req-prio { font-size:9.5px; font-weight:700; border:1px solid; border-radius:12px; padding:2px 9px; flex:none; white-space:nowrap; }
  .req-origem { font-size:10px; color:#a89f90; margin:4px 0 5px; }
  .req-desc { font-size:11.5px; color:#4a453d; line-height:1.55; margin:2px 0 6px; }
  .req-crit { font-size:11px; color:#2f4b33; background:#eef5ef; border-left:3px solid #2f6b39; border-radius:0 7px 7px 0; padding:7px 11px; }
  .req-crit ul { margin:3px 0 1px 16px; } .req-crit li { margin:2.5px 0; line-height:1.45; }
  .nota { font-size:10.5px; color:#6b6459; background:#f7f4ee; border-left:3px solid #B38335; border-radius:0 7px 7px 0; padding:6px 10px; margin-top:6px; }
  .aprova { width:100%; border-collapse:collapse; margin-top:7px; font-size:10px; color:#6b6459; }
  .aprova td { border:1px solid #e5ddcd; padding:5px 8px; height:18px; }
  .tbl { width:100%; border-collapse:collapse; margin:8px 0; font-size:10px; }
  .tbl th { text-align:left; background:#272525; color:#e3bf7e; padding:5.5px 8px; font-size:9px; letter-spacing:.05em; text-transform:uppercase; }
  .tbl td { padding:5px 8px; border-bottom:1px solid #eee7d8; color:#4a453d; vertical-align:top; line-height:1.4; }
  .tbl tr:nth-child(even) td { background:#faf7f0; }
  .sec-title { font-size:12.5px; font-weight:800; letter-spacing:.12em; color:#B38335; margin:8px 0 8px; }
  p.intro { font-size:11.5px; color:#4a453d; line-height:1.6; margin:5px 0; }
  .mono { font-family:Consolas,monospace; }
  .bloco-note { font-size:10.5px; color:#6b6459; margin:0 2px 8px; }
  .st { font-size:9.5px; font-weight:800; border-radius:12px; padding:2.5px 10px; flex:none; white-space:nowrap; letter-spacing:.03em; }
  .st-ok { color:#fff; background:linear-gradient(135deg,#3d8a4b,#2f6b39); }
  .st-pend { color:#8a5a12; background:#fdf3e0; border:1px solid #e5c78a; }
  .req-ok { border-color:#bfd9c4; background:#fbfdfb; }
  .exec-box { font-size:10.8px; color:#2f4b33; background:#e7f2e9; border-left:3px solid #2f6b39; border-radius:0 7px 7px 0; padding:7px 11px; margin-top:7px; line-height:1.5; }
  .exec-evid { font-size:9.8px; color:#5a7a60; }
  .exec-obs { font-size:9.8px; color:#8a5a12; }
  .pend-box { font-size:10.8px; color:#8a5a12; background:#fdf6e8; border-left:3px solid #d9a94e; border-radius:0 7px 7px 0; padding:7px 11px; margin-top:7px; line-height:1.5; }
  .painel { display:flex; gap:8px; margin:8px 0 4px; }
  .painel .kpi { flex:1; border:1px solid #eae3d6; border-radius:10px; padding:9px 12px; text-align:center; background:#fffdf9; }
  .painel .kpi .n { font-size:24px; font-weight:800; }
  .painel .kpi .l { font-size:9.5px; color:#6b6459; margin-top:2px; }
  .barra { height:12px; border-radius:7px; background:#f0ead9; overflow:hidden; margin:6px 0 2px; }
  .barra > div { height:100%; background:linear-gradient(90deg,#3d8a4b,#2f6b39); border-radius:7px; }
  .tbl td.st-td-ok { color:#2f6b39; font-weight:800; white-space:nowrap; }
  .tbl td.st-td-pend { color:#8a5a12; font-weight:700; white-space:nowrap; }
</style></head><body>

<div class="capa">
  <div style="position:absolute;left:16mm;top:18mm;display:flex;align-items:center;gap:14px">
    <div style="width:50px;height:50px;border-radius:13px;background:linear-gradient(135deg,#cfa055,#B38335 55%,#8a6428);display:flex;align-items:center;justify-content:center;font-family:Georgia,serif;font-weight:700;font-size:21px;color:#fff">CI</div>
    <div><div style="font-family:Georgia,serif;font-weight:700;font-size:15px;letter-spacing:.14em;color:#fff">CIDADE IMPERIAL</div>
    <div style="font-size:10.5px;letter-spacing:.16em;color:#e3bf7e;margin-top:3px">PLATAFORMA DA LOJA · GESTÃO DE ROYALTIES</div></div>
  </div>
  <div style="position:absolute;left:16mm;right:16mm;top:70mm">
    <div style="font-size:13px;font-weight:700;letter-spacing:.18em;color:#e3bf7e;margin-bottom:12px">ATUALIZAÇÃO DE STATUS · REV02</div>
    <div style="font-size:38px;font-weight:800;color:#fff;line-height:1.12;letter-spacing:-.5px">Requisitos Funcionais<br>Melhorias da Validação da Fase 1<br><span style="color:#e3bf7e">Status de Execução</span></div>
    <div style="font-size:14px;color:#c9c1b4;margin-top:16px;line-height:1.6;max-width:158mm">Atualização do documento de <b style="color:#e8e2d6">15/07/2026 (REV01)</b> com a marcação do que já foi executado até <b style="color:#e8e2d6">${EXEC_DATA}</b>: dos ${total} requisitos (RF48–RF75), <b style="color:#8fd19a">${nExec} estão executados, testados e publicados</b> no branch de desenvolvimento e <b style="color:#e3bf7e">${total - nExec} permanecem pendentes</b> de aprovação/priorização. Cada requisito traz o status, e os executados incluem commit, resumo da entrega e evidências.</div>
  </div>
  <div style="position:absolute;left:16mm;bottom:42mm;right:16mm;display:flex;gap:8px;flex-wrap:wrap">
    ${BLOCOS.map((b) => { const e = b.reqs.filter((r) => EXEC[r[0]]).length; return `<div style="background:#ffffff10;border:1px solid #ffffff22;border-radius:8px;padding:6px 11px;font-size:9.5px;color:#e8e2d6">${esc(b.b.replace(/Bloco [A-Z] — /, ''))} · <b style="color:${e ? '#8fd19a' : '#e3bf7e'}">${e}/${b.reqs.length}</b></div>` }).join('')}
  </div>
  <div style="position:absolute;left:16mm;bottom:18mm;font-size:10px;color:#8a8378">Projeto P2606001 · ${EXEC_DATA} · REV02 — Base: documento REV01 (15/07/2026) + implementações no branch claude/plataforma-cidade-imperial-dmxbmw</div>
</div>

<div class="miolo">
  <div class="sec-title">1 · CONTEXTO DESTA ATUALIZAÇÃO</div>
  <p class="intro">O documento REV01 (15/07/2026) consolidou as melhorias da validação da Fase 1 em <b>${total} requisitos funcionais (RF48–RF75)</b>. Esta REV02 atualiza aquele documento com o <b>status de execução em ${EXEC_DATA}</b>: os requisitos aprovados e solicitados na sequência da reunião já foram implementados, testados e publicados no branch de desenvolvimento <span class="mono">claude/plataforma-cidade-imperial-dmxbmw</span>.</p>
  <p class="intro"><b>Como ler:</b> requisitos com o selo <b style="color:#2f6b39">✓ EXECUTADO</b> foram implementados com suíte E2E de aceite, regressões em banco novo e evidências em PNG (pasta <span class="mono">docs/evidencias/</span>); o quadro verde de cada um resume a entrega e cita o commit. Requisitos com o selo <b style="color:#8a5a12">⏳ PENDENTE</b> ainda não foram executados e mantêm o campo de decisão original para aprovação/priorização.</p>

  <div class="sec-title">2 · PAINEL DE EXECUÇÃO</div>
  <div class="painel">
    <div class="kpi"><div class="n" style="color:#2f6b39">${nExec}</div><div class="l">requisitos executados</div></div>
    <div class="kpi"><div class="n" style="color:#8a5a12">${total - nExec}</div><div class="l">requisitos pendentes</div></div>
    <div class="kpi"><div class="n" style="color:#B38335">${pct}%</div><div class="l">do total (RF48–RF75)</div></div>
    <div class="kpi"><div class="n" style="color:#272525">${nExec * 2}</div><div class="l">entregas (implementação + evidência) publicadas</div></div>
  </div>
  <div class="barra"><div style="width:${pct}%"></div></div>
  <div style="font-size:9.5px;color:#6b6459;margin-bottom:6px">${nExec} de ${total} requisitos executados até ${EXEC_DATA} — cada um com commit próprio, teste E2E de aceite e evidências.</div>

  <div class="sec-title">3 · REQUISITOS FUNCIONAIS COM STATUS</div>
  ${BLOCOS.map((b) => { const e = b.reqs.filter((r) => EXEC[r[0]]).length; return `<h2 class="bloco">${esc(b.b)} <span style="float:right;font-size:11px;color:${e ? '#8fd19a' : '#e3bf7e'}">${e}/${b.reqs.length} executados</span></h2>${b.reqs.map(reqHtml).join('')}` }).join('')}

  <div class="sec-title">4 · MATRIZ-RESUMO COM STATUS</div>
  <table class="tbl"><tr><th style="width:9%">RF</th><th>Título</th><th style="width:11%">Prioridade</th><th style="width:14%">Status</th><th style="width:26%">Entrega / observação</th></tr>
    ${BLOCOS.flatMap((b) => b.reqs).map((r) => { const ex = EXEC[r[0]]; return `<tr><td class="mono">${esc(r[0])}</td><td>${esc(r[1])}</td><td style="color:${prioCor(r[3])};font-weight:700">${esc(r[3].split(' ')[0])}</td><td class="${ex ? 'st-td-ok' : 'st-td-pend'}">${ex ? '✓ Executado' : '⏳ Pendente'}</td><td>${ex ? `${EXEC_DATA} · commit <span class="mono">${esc(ex.commit)}</span>` : (PEND_OBS[r[0]] ? esc(PEND_OBS[r[0]]) : 'Aguardando aprovação/priorização.')}</td></tr>` }).join('')}
  </table>

  <div class="sec-title">5 · DEFINIÇÕES OPERACIONAIS PENDENTES (RESPONSABILIDADE DA LOJA)</div>
  <p class="intro">Itens registrados em ata sob responsabilidade da Loja Cidade Imperial — insumos necessários para o desenvolvimento dos requisitos pendentes relacionados:</p>
  <table class="tbl"><tr><th style="width:14%">Origem</th><th>Definição esperada</th></tr>
    ${PEND_LOJA.map((p) => `<tr><td>${esc(p[0])}</td><td>${esc(p[1])}</td></tr>`).join('')}
  </table>

  <div class="sec-title">6 · DEPENDÊNCIAS E PONTOS DE ATENÇÃO</div>
  <table class="tbl"><tr><th>Dependência / ponto de atenção (Ata, seção 7)</th></tr>
    ${DEPS.map((d) => `<tr><td>${esc(d)}</td></tr>`).join('')}
    <tr><td>As suítes E2E de aceite dos ${nExec} requisitos executados já foram criadas e passam em banco novo — insumo direto para a atualização do Plano de Testes da Fase 1.</td></tr>
  </table>

  <div class="sec-title">7 · APROVAÇÃO DOS ITENS PENDENTES</div>
  <table class="tbl"><tr><th style="width:34%">Papel</th><th style="width:36%">Nome</th><th>Assinatura / Data</th></tr>
    <tr><td>Gestão do projeto (Cervejaria)</td><td>Fabio Marquez Cruvinel Muniz</td><td style="height:26px"></td></tr>
    <tr><td>Validação funcional (Loja)</td><td>Tarcio Joaquim Beltran</td><td style="height:26px"></td></tr>
    <tr><td>Equipe de Desenvolvimento</td><td>Bruno Borges Ruiz</td><td style="height:26px"></td></tr>
  </table>
  <p class="intro" style="font-size:10.5px;color:#6b6459">Após a aprovação dos ${total - nExec} itens pendentes: consolidação do backlog priorizado, avaliação técnica de esforço e prazo por item, implementação, atualização do Plano de Testes e nova rodada de validação (Ata, seção 8). Os ${nExec} itens executados seguem disponíveis para validação no ambiente de homologação.</p>
  <div style="display:flex;justify-content:space-between;font-size:9px;color:#a89f90;border-top:1px solid #eae3d6;padding-top:6px;margin-top:8px">
    <span>Plataforma Cidade Imperial — Requisitos Funcionais das Melhorias da Fase 1 (RF48–RF75) · Status de Execução</span><span>${EXEC_DATA} · REV02</span>
  </div>
</div>
</body></html>`

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' })
const page = await browser.newPage()
await page.setContent(html, { waitUntil: 'networkidle' })
await page.pdf({ path: OUT, format: 'A4', printBackground: true, margin: { top: 0, bottom: 0, left: 0, right: 0 } })
await browser.close()
console.log('PDF ok:', OUT, '· requisitos:', total)
