// Gera a versão ATUALIZADA (REV02) do Roteiro de Testes de Aceitação (UAT) em
// PDF e Word — cobre a base original + as 28 melhorias da Fase 1 (RF48–RF75),
// com todos os recursos de cada funcionalidade.
// Rode a partir de docs/gerador:  node 13-build-roteiro-uat-v2.mjs
import pw from '/opt/node22/lib/node_modules/playwright/index.js'
import { writeFileSync } from 'node:fs'
import {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  Table, TableRow, TableCell, WidthType, BorderStyle, ShadingType,
} from 'docx'
const { chromium } = pw

const OUT_PDF = '/home/user/P018LJCDI/docs/Plataforma-Cidade-Imperial-Roteiro-Testes-Aceitacao-REV02.pdf'
const OUT_DOCX = '/home/user/P018LJCDI/docs/Plataforma-Cidade-Imperial-Roteiro-Testes-Aceitacao-REV02.docx'
const URL_HML = 'https://lojacidadeimperialhml.cervejariacidadeimperial.com'
const GOLD = 'B38335', DARK = '272525', GREY = '6B6459', CREAM = 'F7F4EE'

const ACESSOS = [
  ['Administrador Técnico', 'admin@cidadeimperial.com.br', 'admin123', 'Acesso total; enxerga a visão da Loja e as Configurações Técnicas.'],
  ['Loja (gestora)', 'ana@cidadeimperial.com.br', 'loja123', 'Ana Ribeiro — aprova pedidos, decide cotações, royalties, relatórios.'],
  ['Loja (analista restrito)', 'carlos@cidadeimperial.com.br', 'loja123', 'Carlos Mota — permissões personalizadas (não aprova/rejeita/atende pedidos, não registra pagamento).'],
  ['Fornecedor', 'comercial@serraverde.com.br', 'forn123', 'Distribuidora Serra Verde — pedidos recebidos, cotações, faturamentos, royalties devidos.'],
  ['Revenda', 'compras@bardoimperador.com.br', 'rev123', 'Bar do Imperador — catálogo, carrinho e acompanhamento de pedidos.'],
  ['Revenda — grupo econômico', 'milena@grupoimperial.com.br', 'rev123', 'Milena Duarte — acesso a múltiplas revendas (Bar do Imperador e Choperia Alto da Serra) com troca de contexto e visão consolidada (RF67).'],
]

// Cada módulo: { titulo, intro, casos: [[id, título, perfil, pré, [passos], esperado], …] }
const MODULOS = [
{ titulo: 'Acesso e autenticação', intro: 'Valida o controle de acesso: login por e-mail e senha, mensagens de erro, encerramento de sessão e a visão correta de cada perfil.', casos: [
  ['CT-001', 'Login com credenciais válidas (Loja)', 'Loja', 'Aplicação acessível no navegador (URL do ambiente).',
   ['Abra a URL do ambiente no navegador.', 'Digite o e-mail "ana@cidadeimperial.com.br" e a senha "loja123".', 'Clique em "Entrar na plataforma".'],
   'O sistema autentica e abre o "Painel geral" da Loja, com os quatro cartões de indicadores e o menu lateral (Operação, Cadastros, Financeiro, Gestão). "Ana Ribeiro (Loja)" aparece no topo direito.'],
  ['CT-002', 'Login com senha incorreta', 'Qualquer', 'Nenhuma.',
   ['Digite "ana@cidadeimperial.com.br" e uma senha errada (ex.: "abc123").', 'Clique em "Entrar na plataforma".'],
   'Acesso negado com "Senha incorreta." e o usuário permanece na tela de login. A tentativa fica na auditoria como "Falha de login" (crítico — ver CT-112).'],
  ['CT-003', 'Login com usuário inexistente', 'Qualquer', 'Nenhuma.',
   ['Digite um e-mail não cadastrado (ex.: "ninguem@teste.com.br") e qualquer senha.', 'Clique em "Entrar na plataforma".'],
   'Mensagem "Usuário não encontrado. Verifique o e-mail ou fale com o administrador." e o acesso não é liberado.'],
  ['CT-004', 'Preenchimento rápido pelos acessos de demonstração', 'Qualquer', 'Nenhuma.',
   ['Localize a lista de acessos de demonstração abaixo do botão de entrar.', 'Clique num acesso (ex.: Fornecedor).', 'Confira o preenchimento automático e clique em "Entrar na plataforma".'],
   'Os campos são preenchidos com o acesso clicado e o login acontece no perfil correspondente.'],
  ['CT-005', 'Logout (sair da plataforma)', 'Qualquer', 'Usuário logado.',
   ['No topo direito, clique em "Sair".'],
   'A sessão é encerrada e a tela de login reaparece. O evento "Logout realizado" fica na auditoria.'],
  ['CT-006', 'Visão restrita por perfil', 'Fornecedor e Revenda', 'Nenhuma.',
   ['Entre como Fornecedor ("comercial@serraverde.com.br"/"forn123") e observe o menu.', 'Saia e entre como Revenda ("compras@bardoimperador.com.br"/"rev123") e observe o menu.'],
   'O Fornecedor vê apenas Pedidos recebidos, Cotações convidadas, Meus produtos, Meus faturamentos e Royalties devidos. A Revenda vê apenas Catálogo e Meus pedidos. Nenhum vê telas da Loja.'],
]},
{ titulo: 'Acesso multi-revendas / grupo econômico (RF67)', intro: 'Valida o perfil de revenda com acesso a múltiplas revendas do mesmo grupo econômico: seletor de contexto sempre visível, troca sem novo login e visão consolidada.', casos: [
  ['CT-007', 'Login multi-revenda e seletor de contexto', 'Revenda (grupo)', 'Usuária Milena semeada, vinculada a 2 revendas.',
   ['Entre com "milena@grupoimperial.com.br"/"rev123".', 'Observe o seletor de contexto dourado no topo e a revenda ativa.'],
   'O login abre com o seletor de contexto sempre visível indicando a revenda ativa; a lista traz as revendas do grupo (Bar do Imperador e Choperia Alto da Serra).'],
  ['CT-008', 'Troca de contexto sem novo login', 'Revenda (grupo)', 'CT-007 executado.',
   ['No seletor, troque para outra revenda do grupo.', 'Crie um pedido pelo catálogo e abra "Meus pedidos".'],
   'O contexto troca sem novo login; o pedido é registrado na revenda ativa (identificada na linha). A troca de contexto fica na auditoria.'],
  ['CT-009', 'Visão consolidada do grupo', 'Revenda (grupo)', 'CT-007 executado.',
   ['No seletor, escolha a visão consolidada do grupo.', 'Observe os KPIs agregados e a lista de pedidos com a revenda identificada por linha.'],
   'A visão consolidada mostra os pedidos de todas as revendas do grupo com indicadores agregados e a revenda em cada linha; é somente consulta (para criar pedido é preciso selecionar uma revenda).'],
]},
{ titulo: 'Usuários e permissões (Administrador)', intro: 'Valida a criação e manutenção de contas por perfil e o permissionamento de granularidade fina; inclui o vínculo de um usuário a múltiplas revendas (RF67).', casos: [
  ['CT-010', 'Criar um novo usuário do perfil Loja', 'Administrador', 'Logado como admin@cidadeimperial.com.br.',
   ['Configurações Técnicas → "Usuários e permissões" → "+ Novo usuário".', 'Preencha nome "Usuário Teste UAT", e-mail "teste.uat@cidadeimperial.com.br", perfil "Loja Cidade Imperial", senha "teste123".', 'Salve, saia e entre com a nova conta.'],
   'O usuário é criado com o selo "⚙ padrão do perfil"; o login funciona e abre a visão da Loja.'],
  ['CT-011', 'Editar usuário e redefinir senha', 'Administrador', 'CT-010 executado.',
   ['Edite "Usuário Teste UAT": mude o nome para "…UAT 2" e a senha para "teste456".', 'Salve, saia e teste a senha antiga e a nova.'],
   'A senha antiga é recusada e a nova funciona; o nome atualizado aparece na lista e no topo após o login.'],
  ['CT-012', 'Negar uma permissão específica (granularidade fina)', 'Administrador', 'CT-010 executado.',
   ['Abra o editor de permissões (selo ⚙) do usuário de teste.', 'No grupo "Gestão", desligue "Exportar relatórios (CSV)" e clique em "Concluir".', 'Entre com o usuário e abra "Relatórios".'],
   'A permissão fica "personalizada" e o selo vira "1 personalizada(s)"; logado com o usuário, os botões de exportar não aparecem; as demais telas continuam acessíveis.'],
  ['CT-013', 'Restaurar o padrão do perfil', 'Administrador', 'CT-012 executado.',
   ['No editor de permissões, clique em "↺ Restaurar padrão do perfil" e "Concluir".'],
   'Todas as permissões voltam ao padrão do perfil e o selo volta a "⚙ padrão do perfil".'],
  ['CT-014', 'Inativar usuário e bloquear o acesso', 'Administrador', 'CT-010 executado.',
   ['Clique em "Inativar" no usuário de teste; tente entrar com ele.', 'Volte como admin e "Reativar".'],
   'Inativo, o login é recusado com "Usuário inativo…"; após reativar, o login volta a funcionar.'],
  ['CT-015', 'Proteção do último administrador', 'Administrador', 'Existir apenas um Administrador ativo.',
   ['Tente inativar o próprio "Administrador Técnico" ou trocar o perfil dele.'],
   'O sistema impede a operação com aviso de que deve existir ao menos um Administrador Técnico ativo.'],
  ['CT-016', 'Analista com permissões restritas (semeado)', 'Loja (analista)', 'Nenhuma.',
   ['Entre com "carlos@cidadeimperial.com.br"/"loja123".', 'Abra um pedido "Pendente" (ex.: PED-0045) e procure "Recebimento de Pedidos" e "Rejeitar…".'],
   'Carlos vê os pedidos e o detalhe, mas os botões de receber/rejeitar/atender não aparecem (permissões negadas individualmente).'],
  ['CT-017', 'Vincular um usuário a múltiplas revendas (RF67)', 'Administrador', 'Nenhuma.',
   ['Ao criar/editar um usuário do perfil Revenda, no campo de revendas marque 2+ revendas do grupo.', 'Salve e confira as revendas vinculadas (chips) na lista.'],
   'O usuário fica vinculado a N revendas; ao logar, ele recebe o seletor de contexto (validado em CT-007).'],
]},
{ titulo: 'Catálogo e criação de pedido (Revenda)', intro: 'Valida a jornada de compra da revenda: catálogo homologado com visibilidade controlada, sigilo de preços, imagem principal, carrinho e envio do pedido.', casos: [
  ['CT-020', 'Catálogo sem exposição de preços', 'Revenda', 'Logado como compras@bardoimperador.com.br.',
   ['Abra "Catálogo de produtos".', 'Percorra os cards (código, descrição, unidade, fotos).', 'Procure qualquer valor monetário (R$).'],
   'Nenhum preço aparece no catálogo — a revenda só conhece valores após a negociação (cotação/aceite) ou no faturamento. As fotos abrem ampliadas ao clicar; o card usa a imagem PRINCIPAL do produto (RF54).'],
  ['CT-021', 'Busca no catálogo', 'Revenda', 'Nenhuma.',
   ['No campo de busca, digite "chopp"; depois um termo inexistente (ex.: "xyz").'],
   'A lista filtra em tempo real por "chopp"; com termo inexistente, nenhum card é exibido.'],
  ['CT-022', 'Montar carrinho e enviar pedido', 'Revenda', 'Nenhuma.',
   ['Adicione 2 unidades de um produto e 3 de outro pelos botões de quantidade.', 'Confira o resumo do carrinho e envie o pedido.', 'Abra "Meus pedidos".'],
   'O pedido é criado (PED-00XX), aparece em "Meus pedidos" com "Pendente" e itens/quantidades corretos. A Loja é notificada por e-mail (com SMTP ativo).'],
  ['CT-023', 'Acompanhamento do pedido pela revenda', 'Revenda', 'CT-022 executado.',
   ['Em "Meus pedidos", observe o status e a etapa do pedido (RF49).', 'Repita após a Loja receber/atender.'],
   'O status/etapa evolui conforme o fluxo, sem exibir preços de catálogo; valores só aparecem à revenda no aceite comercial (RF68) ou no faturamento.'],
]},
{ titulo: 'Produtos homologados: preço, fornecedores, busca, ficha, imagens e De/Para (RF50–RF56, RF62)', intro: 'Valida a manutenção do catálogo pela Loja com as melhorias: preço automático do histórico, múltiplos fornecedores, buscador/filtros, complementação cadastral fiscal/logística, gestão de imagens, restrição de visibilidade, matriz De/Para e dados de contato.', casos: [
  ['CT-030', 'Preço estimado pré-preenchido do histórico (RF50)', 'Loja', 'Produto com histórico de preço (ex.: PRD-002).',
   ['Produtos homologados → abra o PRD-002 → "Editar produto".', 'Observe o campo "Preço estimado".'],
   'O preço vem pré-preenchido com o último valor do histórico (com aviso da origem), permanece editável e a alteração manual alimenta o histórico de preços.'],
  ['CT-031', 'Produto com múltiplos fornecedores (RF51)', 'Loja', 'Nenhuma.',
   ['Em "Editar produto", no campo "Fornecedores / contratos", busque por nome e marque 2+ fornecedores; salve.', 'Abra o detalhe do produto.'],
   'O produto fica vinculado a vários fornecedores (relação N:M); catálogo, pedidos e relatórios tratam o vínculo múltiplo; as cotações passam a convidar os fornecedores vinculados.'],
  ['CT-032', 'Buscador e filtros na tela de produtos (RF52)', 'Loja', 'Nenhuma.',
   ['Digite "chopp" na busca por código/descrição.', 'Combine com os filtros de fornecedor, status e categoria; observe o contador dourado.', 'Clique em "✕ Limpar busca e filtros".'],
   'A lista filtra em tempo real; os filtros são combináveis; o contador mostra "N de M produto(s)"; o botão de limpar restaura a lista completa e o estado vazio é claro.'],
  ['CT-033', 'Complementação cadastral — ficha fiscal/logística (RF53)', 'Fornecedor', 'Fornecedor logado (Serra Verde).',
   ['Abra "Meus produtos" → um produto vinculado → complementar a ficha.', 'Informe peso bruto/líquido, altura/largura/comprimento, NCM (8 dígitos), GTIN/EAN, unidade de medida e observações; salve.'],
   'NCM e EAN são validados; a cubagem é calculada automaticamente (A×L×C); a alteração fica registrada com quem/quando/de-para e auditada. A Loja pode editar os mesmos campos em nome do fornecedor no detalhe do produto.'],
  ['CT-034', 'Restrição de visibilidade por fornecedor (RF55)', 'Fornecedor', 'Nenhuma.',
   ['Como fornecedor, confira que "Meus produtos" e as cotações mostram apenas produtos vinculados.', 'Tente ampliar/abrir a ficha de um produto de terceiro.'],
   'Só aparecem os produtos vinculados ao fornecedor; a tentativa de acesso a produto de terceiro é bloqueada com aviso (toast) e registrada na auditoria ("Acesso bloqueado a produto de terceiro").'],
  ['CT-035', 'Gestão de imagens do produto (RF54)', 'Loja', 'Nenhuma.',
   ['Em "Editar produto", envie 2 imagens (PNG/JPG) e veja a pré-visualização.', 'Marque uma como PRINCIPAL e remova uma imagem anterior; salve e abra o detalhe.'],
   'Upload múltiplo com pré-visualização; a PRINCIPAL vira a capa (catálogo/detalhe); a imagem removida vai para o painel "Histórico de imagens" (não se perde); a contagem "Fotos cadastradas" atualiza; tudo auditado.'],
  ['CT-036', 'De/Para Produto × Fornecedor (RF56)', 'Loja', 'Nenhuma.',
   ['Produtos → "⇄ De/Para Produto × Fornecedor".', 'Na matriz, clique numa célula para criar/remover um vínculo.', 'Tente remover o último vínculo de um produto.'],
   'A matriz mostra produtos × fornecedores ativos; o clique cria/remove o vínculo na hora (auditado, nominal); não é possível remover o último fornecedor; o vínculo alimenta a visibilidade (RF55) e os convidáveis das cotações.'],
  ['CT-037', 'Telefone e dados de contato nos cadastros (RF62)', 'Loja', 'Nenhuma.',
   ['Em Fornecedores e em Revendas, confira/edite telefone (com máscara) e nome do contato.', 'Veja os dados nos detalhes e na visão do fornecedor sobre a revenda de destino.'],
   'Telefone com máscara e nome de contato aparecem nos cadastros e nas visões operacionais, inclusive para o fornecedor sobre a revenda destino.'],
]},
{ titulo: 'Aprovação de pedidos (Loja) — "Recebimento de Pedidos" (RF48)', intro: 'Valida a análise da Loja: recebimento e rejeição do pedido inteiro ou item a item, com justificativa e trilha, e a nomenclatura "Recebimento de Pedidos".', casos: [
  ['CT-040', 'Nomenclatura "Recebimento de Pedidos" (RF48)', 'Loja', 'Pedido pendente disponível.',
   ['Abra o detalhe de um pedido "Pendente".', 'Confira o rótulo da ação de recebimento no detalhe, nas ações por item, nos e-mails, na trilha, na auditoria e no guia "Como usar".'],
   'A ação aparece como "Recebimento de Pedidos" em todos os pontos; nenhuma referência ao rótulo antigo "Aprovar" permanece visível.'],
  ['CT-041', 'Receber o pedido inteiro', 'Loja', 'Pedido pendente disponível.',
   ['Na tela "Pedidos", abra o pedido pendente.', 'Clique em "Recebimento de Pedidos".'],
   'Todos os itens passam a "Aprovado", a trilha registra o recebimento com data/hora e usuário, e surge o quadro "Decisão de atendimento — por item".'],
  ['CT-042', 'Receber e rejeitar item a item', 'Loja', 'Pedido pendente com 2+ itens.',
   ['Abra o pedido; receba apenas o primeiro item pela ação da linha.', 'Rejeite o segundo item com a justificativa "Produto indisponível no momento".'],
   'O primeiro item fica "Aprovado" e o segundo "Rejeitado" com a justificativa; o status geral reflete a situação mista e tudo fica na trilha.'],
  ['CT-043', 'Rejeitar o pedido inteiro com justificativa', 'Loja', 'Um pedido pendente disponível.',
   ['Abra o detalhe e clique em "Rejeitar…"; informe "Teste UAT — limite de crédito" e confirme.'],
   'O pedido fica "Rejeitado", a justificativa aparece no detalhe e a revenda vê o novo status em "Meus pedidos".'],
]},
{ titulo: 'Atendimento do pedido (estoque, envio direto, cotação e divisão de quantidades)', intro: 'Valida os três caminhos de atendimento e a divisão de quantidades de um mesmo item entre caminhos, com o alerta de saldo de inventário apoiando a decisão.', casos: [
  ['CT-044', 'Alerta de saldo de inventário na decisão', 'Loja', 'Pedido com itens aprovados; inventário lançado.',
   ['No detalhe do pedido aprovado, clique em "Atender com estoque da Loja…".', 'Observe "◈ saldo em estoque: N" ao lado de cada item.'],
   'Cada item mostra o saldo do último inventário (verde/laranja/vermelho conforme a cobertura), apoiando a decisão do caminho.'],
  ['CT-045', 'Atender itens com estoque da Loja', 'Loja', 'Pedido com itens aprovados.',
   ['Na janela de estoque, mantenha um item selecionado e confirme.'],
   'O item passa a "Estoque da Loja"; os demais permanecem "Aprovado"; a trilha registra o atendimento e o saldo passa a descontar a saída.'],
  ['CT-046', 'Envio direto a um fornecedor', 'Loja', 'Pedido com itens aprovados.',
   ['Clique em "Envio direto a um fornecedor…", selecione item(ns), escolha o fornecedor e "Encaminhar itens selecionados".'],
   'Os itens passam a "No fornecedor" e o pedido aparece para o fornecedor em "Pedidos recebidos". Fornecedor e revenda são notificados (com SMTP ativo).'],
  ['CT-047', 'Dividir a quantidade de um item entre caminhos', 'Loja', 'Item aprovado com quantidade 2+.',
   ['Em "Atender com estoque…", reduza "Quantidade neste caminho" (ex.: 1 de 2) e confirme.', 'Reabra o detalhe e encaminhe o saldo por "Envio direto…".'],
   'O item é fracionado: uma linha "Estoque da Loja" (atendida) e outra "Aprovado" (saldo), que segue outro caminho; os totais permanecem consistentes.'],
  ['CT-048', 'Abrir cotação para itens do pedido', 'Loja', 'Pedido com itens aprovados.',
   ['Clique em "Abrir cotação (2+ fornecedores)…", selecione item(ns), marque 2+ fornecedores, informe o prazo e confirme.'],
   'A cotação é criada (COT-XX, "Aguardando propostas"), os itens passam a "Em cotação" e os convidados são notificados (com SMTP ativo).'],
]},
{ titulo: 'Workflow de status detalhado do pedido (RF49)', intro: 'Valida a linha do tempo de 9 etapas do pedido, a etapa nas listas com filtro, a confirmação do fornecedor e o registro automático das transições.', casos: [
  ['CT-050', 'Linha do tempo de 9 etapas no detalhe', 'Loja', 'Um pedido em andamento.',
   ['Abra o detalhe do pedido e observe a linha do tempo e o chip "Etapa N/9".'],
   'O detalhe mostra as 9 etapas nomeadas (Recebimento/aprovação → Cotação → Seleção do vencedor → Aceite comercial da revenda → Encaminhamento → Confirmação pelo fornecedor → Produção/atendimento → Faturamento → Conclusão), com a etapa atual destacada e as não aplicáveis marcadas como "puladas".'],
  ['CT-051', 'Etapa nas listas e filtro por etapa (Loja e Revenda)', 'Loja e Revenda', 'Pedidos em etapas diferentes.',
   ['Na lista "Pedidos" (Loja) e em "Meus pedidos" (Revenda), confira o rótulo "Etapa N/9" por pedido.', 'Use o seletor "Todas as etapas" para filtrar.'],
   'As duas visões mostram o mesmo estágio para cada pedido; o filtro por etapa restringe corretamente a lista.'],
  ['CT-052', 'Transições registram data, usuário e de/para', 'Loja', 'Nenhuma.',
   ['Execute uma ação que muda a etapa (ex.: recebimento, envio direto).', 'Abra a trilha do pedido e a auditoria.'],
   'Cada transição é registrada automaticamente com data, usuário e status anterior→novo ("Etapa do pedido: X → Y (etapa N de 9)"), na trilha e na auditoria.'],
  ['CT-053', 'Confirmação de recebimento pelo fornecedor', 'Fornecedor', 'Pedido encaminhado ao fornecedor.',
   ['Como fornecedor, em "Pedidos recebidos", clique em "Confirmar recebimento".'],
   'A etapa avança para "Produção/atendimento"; a confirmação fica na trilha, na auditoria e é vista por Loja e revenda.'],
]},
{ titulo: 'Inventário de estoque (com planilha XLSX)', intro: 'Valida o lançamento de inventário em datas específicas, os três modelos de template em Excel nativo e a carga por planilha.', casos: [
  ['CT-054', 'Baixar os três modelos de template XLSX', 'Loja', 'Na tela "Inventário de estoque".',
   ['Confirme a data do inventário.', 'Baixe os modelos "todos os produtos", "itens do último inventário" e "somente cabeçalho".', 'Abra os três no Excel/LibreOffice.'],
   'Os três arquivos baixam em .xlsx nativo e abrem sem corrompimento, com acentos/datas corretos e o conteúdo esperado em cada modelo.'],
  ['CT-055', 'Carregar planilha de inventário preenchida', 'Loja', 'Modelo baixado no CT-054.',
   ['Preencha quantidades (ex.: 12, 8, 20) e salve.', 'Na tela, faça a carga da planilha e confirme após o resumo.'],
   'A planilha é lida, o sistema mostra o que será gravado e o inventário entra na lista com data e usuário; os saldos nos pedidos passam a considerá-lo.'],
  ['CT-056', 'Lançamento manual de inventário', 'Loja', 'Nenhuma.',
   ['Abra o lançamento manual, informe data, quantidades e a observação "Contagem UAT"; salve.'],
   'O inventário manual é gravado com data, usuário e observação, aparecendo no histórico.'],
  ['CT-057', 'Saldo refletido nos alertas dos pedidos', 'Loja', 'CT-055 ou CT-056 executado.',
   ['Abra um pedido com itens aprovados e a janela de estoque; compare o "◈ saldo" com a última contagem menos consumos.'],
   'O saldo bate com a última contagem menos os consumos posteriores; a cor do alerta corresponde à cobertura.'],
]},
{ titulo: 'Cotações — ciclo completo (Loja decide; Fornecedor propõe)', intro: 'Valida convite, propostas sigilosas por item, lembretes, decisão para o processo inteiro ou adjudicação item a item e cancelamento.', casos: [
  ['CT-058', 'Fornecedor envia proposta com preço por item', 'Fornecedor', 'Cotação aberta com o fornecedor convidado.',
   ['Abra "Cotações convidadas" → "Enviar proposta…".', 'Informe o preço unitário de todos os itens, prazo, validade e condições; envie.'],
   'O total é calculado ao digitar; após enviar, o cartão mostra o valor em "Minha proposta" e o botão vira "Editar proposta…".'],
  ['CT-059', 'Sigilo entre concorrentes', 'Fornecedor', 'Duas propostas na mesma cotação.',
   ['Logado como fornecedor, abra a cotação e procure valores de outros fornecedores.'],
   'O fornecedor vê somente a própria proposta — os valores dos concorrentes nunca aparecem.'],
  ['CT-060', 'Lembrete aos convidados', 'Loja', 'Cotação com convidado sem proposta.',
   ['No detalhe da cotação, acione o lembrete ao(s) convidado(s) pendente(s).'],
   'O lembrete é registrado no histórico da cotação e o e-mail é enviado (com SMTP ativo).'],
  ['CT-061', 'Escolher a proposta vencedora (processo inteiro)', 'Loja', 'Cotação com 2+ propostas.',
   ['Escolha uma proposta como vencedora; se não for a de menor preço, justifique.'],
   'A cotação encerra com o vencedor; os itens entram em aceite da revenda (RF68) antes do encaminhamento; a justificativa fica registrada quando aplicável.'],
  ['CT-062', 'Adjudicar item a item (vencedores diferentes)', 'Loja', 'Cotação com 2+ itens e 2+ propostas.',
   ['Adjudique cada item a um fornecedor diferente; justifique quando não for o menor preço.'],
   'Cada item registra seu próprio vencedor; os itens seguem para o aceite da revenda com os respectivos vencedores.'],
  ['CT-063', 'Cancelar cotação com motivo', 'Loja', 'Cotação aberta.',
   ['Acione o cancelamento e informe "Teste UAT — cancelamento".'],
   'A cotação fica "Cancelada" com o motivo; os itens retornam para "Aprovado", podendo seguir outro caminho.'],
]},
{ titulo: 'Cotações avançadas: quantidades, frete, anexos, rodadas e economia (RF57, RF58, RF59, RF60, RF74)', intro: 'Valida as melhorias das cotações: edição de quantidades na abertura, frete e condições na proposta, anexos, rodadas de renegociação por item e o indicador de economia (escolha × negociação).', casos: [
  ['CT-064', 'Edição de quantidades na abertura da cotação (RF57)', 'Loja', 'Pedido com itens aprovados.',
   ['Em "Abrir cotação", edite a quantidade de um item.', 'Observe o "Total estimado da cotação" recalcular em tempo real; abra a cotação.'],
   'A quantidade é editável por item sem alterar o pedido de origem; o total estimado recalcula em tempo real; a quantidade cotada fica registrada e visível aos convidados ("Demanda cotada").'],
  ['CT-065', 'Frete e condições comerciais na proposta (RF59)', 'Fornecedor', 'Cotação convidada.',
   ['Ao enviar a proposta, informe modalidade do frete (CIF/FOB/outros), valor, transportadora, prazo, condições de entrega e de pagamento.'],
   'A proposta exibe a composição "produtos + frete = total"; o mapa comparativo mostra colunas Produtos | Frete | Total c/ frete; o menor preço e a justificativa consideram o total com frete.'],
  ['CT-066', 'Anexos na proposta e no atendimento (RF60)', 'Fornecedor', 'Cotação convidada / pedido em atendimento.',
   ['Anexe arquivos na janela da proposta e no card do pedido em atendimento (PDF/Excel/Word/imagem, até 5 × 5 MB).'],
   'Os anexos ficam listados com nome, data e autor, disponíveis para a Loja (e revenda quando aplicável); limites e mensagens de erro claros.'],
  ['CT-067', 'Rodadas de negociação / renegociação por item (RF58)', 'Loja + Fornecedor', 'Cotação com propostas recebidas.',
   ['Como Loja, abra "Nova rodada", escolha itens e fornecedores e o novo prazo.', 'Como fornecedor, envie a contraproposta.', 'Como Loja, veja a evolução no comparativo e decida na rodada.'],
   'A rodada notifica os convidados; contrapropostas por item; o comparativo mostra a evolução entre rodadas (antes → agora); a decisão pode ocorrer em qualquer rodada; convites, propostas e condições ficam preservados por rodada na trilha/auditoria.'],
  ['CT-068', 'Economia da cotação: escolha × negociação (RF74)', 'Loja', 'Cotação decidida (idealmente com rodadas).',
   ['No detalhe da cotação decidida, abra o painel "Economia da cotação — escolha × negociação".', 'Na tela de Cotações, confira o consolidado por período (mês da decisão).'],
   'Mostra a economia da ESCOLHA (referência − menor proposta da 1ª rodada, com frete) separada da economia de NEGOCIAÇÃO (rodadas e adjudicação por item), com o fluxo referência → menor 1ª rodada → fechamento e o % sobre a referência; o consolidado soma as duas parcelas por período.'],
]},
{ titulo: 'Aceite comercial da revenda (RF68)', intro: 'Valida a etapa de aprovação comercial: após a vencedora, a revenda aceita ou recusa a negociação por item antes do encaminhamento; a recusa devolve ao fluxo.', casos: [
  ['CT-069', 'Itens ficam aguardando aceite após a vencedora', 'Loja', 'Cotação decidida (CT-061/CT-062).',
   ['Após selecionar a vencedora/adjudicar, confira o status dos itens e a etapa do pedido.'],
   'Os itens ficam "Aguardando aceite da revenda"; o fornecedor ainda NÃO recebe; o workflow (RF49) reflete a etapa "Aceite comercial da revenda".'],
  ['CT-070', 'Aceite e recusa por item pela revenda', 'Revenda', 'CT-069 executado.',
   ['Como revenda, abra "Aprovação comercial…"; veja valores negociados, frete, prazo e condições por item.', 'Aceite alguns itens e recuse outro com motivo obrigatório; confirme.'],
   'Os aceitos seguem ao fornecedor (envio direto); os recusados voltam à negociação reabrindo a cotação em nova rodada (RF58) com recálculo; a decisão fica na trilha, na auditoria e nos e-mails.'],
  ['CT-071', 'Sigilo de preços e retorno ao fluxo', 'Revenda e Loja', 'CT-070 executado.',
   ['Confirme que a revenda passou a ver os valores negociados apenas nesta etapa e que o item recusado retornou ao fluxo de cotação.'],
   'Este é o momento em que a revenda conhece os valores; a recusa mantém o sigilo dos preços de catálogo e devolve o item ao fluxo de negociação.'],
]},
{ titulo: 'Faturamento com documento fiscal obrigatório e análise por IA', intro: 'Valida o registro de faturamento pelo fornecedor: anexo fiscal obrigatório (PDF/XML), análise automática que aceita ou recusa o documento, flag do administrador e royalty automático. Use os arquivos do Anexo A.', casos: [
  ['CT-072', 'Bloqueio sem anexo fiscal', 'Fornecedor', 'Pedido encaminhado ao fornecedor (após o aceite da revenda).',
   ['Abra "Pedidos recebidos" → "Registrar faturamento…".', 'Confira o valor sugerido; SEM anexar, clique em "Confirmar faturamento".'],
   'O registro é bloqueado: o anexo do documento fiscal (PDF ou XML) é obrigatório.'],
  ['CT-073', 'Documento incompatível é recusado pela análise', 'Fornecedor', 'Análise fiscal (IA) HABILITADA; "nfe-incompativel.xml" do Anexo A.',
   ['Anexe "nfe-incompativel.xml" e clique em "Confirmar faturamento"; aguarde a análise.'],
   'O documento é RECUSADO como evidência (destinatário/valor divergentes), com o motivo detalhado, e o faturamento NÃO é registrado.'],
  ['CT-074', 'Documento compatível é aceito e o faturamento registrado', 'Fornecedor', '"nfe-compativel.xml" ajustado ao pedido.',
   ['Anexe "nfe-compativel.xml" e confirme.', 'Abra "Meus faturamentos".'],
   'A análise aceita o documento e a nota aparece com valor, royalty calculado pelo % do contrato, link "📎 documento fiscal" e o selo "✓ validado por análise local" (ou "por IA Claude").'],
  ['CT-075', 'Download do anexo nas duas visões', 'Fornecedor e Loja', 'CT-074 executado.',
   ['Baixe o anexo em "Meus faturamentos" (Fornecedor) e em "Faturamento" (Loja).'],
   'Nas duas telas o arquivo baixa íntegro; a Loja vê o selo da análise e o motivo ao passar o mouse.'],
  ['CT-076', 'Flag do administrador desliga a análise (anexo continua obrigatório)', 'Administrador + Fornecedor', 'Novo pedido encaminhado ao fornecedor.',
   ['Como admin, em "Análise fiscal (IA)", DESLIGUE o interruptor.', 'Como fornecedor, tente faturar sem anexo e depois com qualquer XML.'],
   'Sem anexo continua bloqueado; com o flag desligado o documento é aceito sem verificação e a nota aparece SEM selo; a alteração do flag fica na auditoria. (Religue ao final.)'],
]},
{ titulo: 'Recusa/devolução de documento fiscal + documentos à revenda (RF69, RF70)', intro: 'Valida a visibilidade dos documentos do faturamento para a revenda (inclusive boletos) e o workflow de recusa e regularização do documento fiscal.', casos: [
  ['CT-077', 'Documentos do faturamento visíveis à revenda (RF70)', 'Fornecedor + Revenda', 'Pedido encaminhado ao fornecedor.',
   ['Como fornecedor, registre o faturamento com a NF e anexe também um documento do tipo "Boleto" (use qualquer PDF pequeno).', 'Como revenda, abra "Meus pedidos" e baixe os documentos na linha do pedido.'],
   'A revenda vê e baixa todos os documentos (NF, boleto, outros); Loja e fornecedor mantêm a visão completa com o selo da análise.'],
  ['CT-078', 'Recusa de documento fiscal pela revenda (RF69)', 'Revenda', 'CT-077 executado.',
   ['Na NF recebida, clique em "⛔ Recusar"; informe o motivo obrigatório e confirme.'],
   'A nota fica "Documento recusado — pendente de regularização" e o valor sai dos royalties até regularizar; a Loja vê a situação, o motivo e o autor (revenda).'],
  ['CT-079', 'Reenvio e regularização pelo fornecedor (RF69)', 'Fornecedor', 'CT-078 executado.',
   ['O fornecedor vê a pendência com o motivo e usa "Reenviar documento…".', 'Anexe um XML incompatível (recusado na análise) e depois um compatível.'],
   'O reenvio passa pela análise fiscal (barra o incompatível); com o documento correto, a pendência é resolvida e o novo documento é validado; o histórico de recusas/reenvios fica na linha da nota, na auditoria e nos e-mails.'],
  ['CT-080', 'Recusa também pela Loja (RF69)', 'Loja', 'Documento fiscal disponível.',
   ['Em "Faturamento", recuse um documento com "⛔ Recusar documento…" informando o motivo.'],
   'A Loja também recusa com motivo obrigatório; o registro é nominal e o histórico completo é preservado.'],
]},
{ titulo: 'Royalties e fechamento mensal', intro: 'Valida o cálculo do royalty por faturamento, a consolidação por competência/fornecedor, a cobrança com vencimento, o controle de atraso com lembrete, o registro de pagamento e a exportação.', casos: [
  ['CT-081', 'Cálculo automático e composição do fechamento', 'Loja', 'Faturamentos registrados.',
   ['Abra "Royalties" e um fechamento; clique no fornecedor ("ver extrato ▾").', 'Confira, nota a nota, valor × % = royalty e compare com o "Royalty devido".'],
   'Cada nota mostra valor × % = royalty e a soma bate com o total consolidado do fornecedor na competência.'],
  ['CT-082', 'Emitir documento de cobrança com vencimento', 'Loja', 'Fechamento "A pagar" sem cobrança.',
   ['Clique em "Gerar cobrança…"; confira o documento; ajuste o "Vencimento" se desejar e "Emitir e notificar fornecedor".'],
   'A cobrança é emitida: a linha mostra o número, a data e "Vence em [data]"; o fornecedor é notificado (com SMTP ativo).'],
  ['CT-083', 'Status "Em atraso" automático após o vencimento', 'Loja', 'Emita uma cobrança com vencimento no passado.',
   ['Emita a cobrança com vencimento anterior a hoje.', 'Observe a linha e os KPIs.'],
   'O status muda para "Em atraso" com "Venceu em [data] · N dia(s) de atraso"; o KPI "Em atraso" contabiliza; o fornecedor vê o atraso em "Royalties devidos".'],
  ['CT-084', 'Lembrete de atraso ao fornecedor', 'Loja', 'Fechamento "Em atraso".',
   ['Clique em "Lembrete de atraso" na linha vencida.'],
   'A linha registra "Lembrete de atraso enviado em [hoje]"; o e-mail é enviado (com SMTP ativo) e o evento entra na auditoria (alerta).'],
  ['CT-085', 'Registrar pagamento (com e sem atraso)', 'Loja', 'Fechamento em aberto com cobrança.',
   ['Clique em "Registrar pagamento…"; confirme data/valor e informe o comprovante "PIX-UAT-001".'],
   'O fechamento passa a "Pago" com data e comprovante; se após o vencimento, marca "pago com atraso"; a barra e os KPIs atualizam.'],
  ['CT-086', 'Filtros e exportação XLSX do fechamento', 'Loja', 'Fechamentos em vários status.',
   ['Use os filtros de competência, fornecedor e status.', 'Clique em "⬇ Exportar XLSX" e abra o arquivo.'],
   'Os blocos respeitam os filtros; o Excel baixa o recorte com as colunas de competência, fornecedor, CNPJ, %, notas, totais, status, vencimento, cobrança, lembrete, pagamento e comprovante.'],
  ['CT-087', 'Visão do fornecedor (Royalties devidos)', 'Fornecedor', 'Fechamentos do fornecedor em vários status.',
   ['Entre como fornecedor e abra "Royalties devidos"; confira as colunas.'],
   'O fornecedor vê seus fechamentos com número de cobrança, vencimento (vermelho quando vencido) e status — sem acesso às telas da Loja.'],
]},
{ titulo: 'Regras de royalty: dia acordado, gatilhos, parcelas, recebíveis e comprovante (RF63–RF66, RF71)', intro: 'Valida as melhorias do royalty: dia acordado de pagamento, gatilho de pagamento por contrato, royalty parcelado com controle por parcela, a previsão de recebíveis (previsto × realizado) e o comprovante enviado pelo fornecedor.', casos: [
  ['CT-088', 'Dia acordado de pagamento (RF65)', 'Loja', 'Contrato de royalty vigente.',
   ['Em "Ajustar contrato de royalty", defina o "dia acordado de pagamento" (1 a 30).', 'Emita a cobrança e confira o vencimento sugerido.'],
   'O vencimento sugerido cai no dia acordado no mês seguinte (editável); a alteração fica no histórico do contrato e na auditoria.'],
  ['CT-089', 'Gatilho de pagamento do royalty (RF63)', 'Loja', 'Contrato de royalty vigente.',
   ['No contrato, escolha o gatilho: emissão da NF / entrada do pedido / recebimento do boleto / outro (com descrição).', 'Emita a cobrança e confira a base do vencimento na janela.'],
   'O vencimento passa a ser o dia acordado no mês seguinte à data do gatilho; a janela explica a base usada; alterações no histórico e na auditoria (de/para).'],
  ['CT-090', 'Royalty parcelado com controle por parcela (RF64)', 'Loja', 'Contrato de royalty vigente.',
   ['No contrato, defina N parcelas mensais.', 'Emita a cobrança (gera as parcelas com vencimentos individuais).', 'Registre pagamento e envie lembrete POR PARCELA; confira o painel "Controle por parcela".'],
   'Cada parcela tem status próprio (a pagar / em atraso / paga); cobrança, lembrete e pagamento por parcela; o painel consolida previsto × recebido × pendente × em atraso; o fechamento só fica pago com todas quitadas.'],
  ['CT-091', 'Previsão de recebíveis — Previsto × Realizado (RF66)', 'Loja', 'Fechamentos e contratos configurados.',
   ['Na tela de Royalties, confira o painel "Previsto × Realizado" por competência/fornecedor, respeitando os filtros.', 'Clique em "⬇ Exportar recebíveis".'],
   'Mostra previsto, realizado, em aberto, % e a data do próximo recebimento (parcela futura / cobrança emitida / previsão pelo gatilho do contrato); a exportação em Excel fica na auditoria.'],
  ['CT-092', 'Comprovante de pagamento de royalty (RF71)', 'Fornecedor + Loja', 'Cobrança emitida.',
   ['Como fornecedor, envie o comprovante (PDF/imagem, até 5 MB).', 'Como Loja, confirme o pagamento e baixe o comprovante nas duas visões.'],
   'Só a confirmação da Loja muda o status para pago; o comprovante fica disponível para download nas visões Loja e Fornecedor.'],
]},
{ titulo: 'Relatórios e painéis (Loja)', intro: 'Valida o painel gerencial: KPIs, gráficos, rankings, funil e exportações respondendo aos filtros.', casos: [
  ['CT-093', 'KPIs e filtros combinados', 'Loja', 'Base com pedidos/faturamentos.',
   ['Abra "Relatórios"; aplique filtros de competência, revenda, fornecedor e status em combinações.', 'Observe KPIs, gráficos, rankings e funil.'],
   'Todos os blocos recalculam a cada filtro e os números são coerentes entre si.'],
  ['CT-094', 'Exportações do painel', 'Loja', 'Permissão de exportar ativa.',
   ['Use os botões de exportação dos blocos e abra os arquivos no Excel.'],
   'Os arquivos baixam e abrem corretamente, com acentuação certa e os dados filtrados exibidos.'],
]},
{ titulo: 'Relatórios de vendas e desempenho (RF72, RF73, RF75)', intro: 'Valida o relatório de venda por produto, os indicadores de vendas e o painel de desempenho ampliado com os novos dados (frete, rodadas, parcelas, aceite).', casos: [
  ['CT-095', 'Relatório de vendas por produto (RF72)', 'Loja', 'Base com pedidos.',
   ['Em Relatórios → aba "Venda por produtos", aplique os filtros (período, produto, revenda, fornecedor, categoria).', 'Alterne Tabela ⇄ Gráfico e use o drill-down por produto; exporte em XLSX.'],
   'Tabela e visão gráfica com drill-down por produto; filtros combináveis; exportação do recorte em Excel.'],
  ['CT-096', 'Indicadores de vendas (RF73)', 'Loja', 'Na aba "Venda por produtos".',
   ['Confira os painéis "Evolução das vendas", "Produtos mais vendidos" e "Revendas que mais compraram".', 'Aplique filtros e observe o recálculo; teste um recorte vazio.'],
   'Os três painéis (volume/valor por mês; top produtos por quantidade com preço médio; top revendas por valor) respondem a todos os filtros; o estado vazio é coerente. Os KPIs de quantidade e preço médio geral permanecem.'],
  ['CT-097', 'Desempenho ampliado (RF75)', 'Loja', 'Base com cotações, rodadas e royalties.',
   ['Na Visão geral, confira o painel "Desempenho ampliado — frete, rodadas, parcelas e aceite" e a tabela por fornecedor.'],
   'Consolida a economia do processo (RF74), o % de cotações com rodadas (RF58), os itens aguardando aceite (RF68) e os royalties em atraso por parcela (RF64); a tabela por fornecedor traz propostas, contrapropostas, vitórias, frete médio ofertado (RF59), aceite e royalty previsto/realizado (RF66).'],
]},
{ titulo: 'Configurações técnicas (Administrador)', intro: 'Valida a configuração de e-mail SMTP com envio real e a tela do flag de análise fiscal.', casos: [
  ['CT-098', 'Configurar SMTP, verificar conexão e enviar teste', 'Administrador', 'Servidor SMTP válido.',
   ['Em "Configuração de e-mail", preencha servidor, porta, segurança, usuário, senha, remetente e o e-mail interno da Loja.', 'Salve, clique em "Verificar conexão", envie um teste e ative "Envio de e-mails".'],
   '"Verificar conexão" confirma o acesso; o teste chega com o modelo visual da plataforma; com o envio ativo, os fluxos passam a disparar e-mails.'],
  ['CT-099', 'E-mails automáticos nos fluxos de negócio', 'Todos', 'CT-098 com envio ATIVADO.',
   ['Execute um ciclo: revenda cria pedido → Loja recebe → cotação/rodada → aceite da revenda → envio direto → fornecedor fatura → Loja emite cobrança de royalty.', 'Verifique as caixas de e-mail a cada etapa.'],
   'Cada evento gera o e-mail correto ao destinatário certo, com modelo próprio; e-mails à revenda não expõem preços de catálogo. (O mapa completo dos 26 e-mails está no documento "Fluxos de Notificações por E-mail".)'],
  ['CT-100', 'Tela do flag de análise fiscal', 'Administrador', 'Nenhuma.',
   ['Abra "Análise fiscal (IA)"; leia o estado do interruptor e o "Motor de análise".'],
   'A tela informa se a análise está ativa e qual motor está em uso ("IA Claude" com a chave configurada; senão, o analisador local). O comportamento do flag foi validado no CT-076.'],
]},
{ titulo: 'Segurança e auditoria (Loja/Administrador)', intro: 'Valida a trilha de auditoria: eventos de negócio e de segurança, classificação por módulo e severidade, filtros, busca e exportação.', casos: [
  ['CT-101', 'KPIs e trilha completa', 'Loja', 'Ações dos módulos anteriores executadas.',
   ['Abra "Segurança & Auditoria"; confira os cartões e percorra a tabela (data/hora, usuário, módulo, severidade, operação, detalhe).'],
   'Os eventos aparecem classificados por módulo e severidade, com quem fez cada ação; "Carregar mais eventos" pagina a lista. Inclui as transições de etapa (RF49), vínculos De/Para (RF56), recusas de documento (RF69) e alterações de contrato (RF63–65).'],
  ['CT-102', 'Eventos de segurança na trilha', 'Loja', 'CT-002 e CT-005 executados.',
   ['Busque por "Falha de login" e "Logout realizado".'],
   'A falha de login aparece com severidade crítica (e-mail tentado e motivo); o logout aparece como evento de Segurança.'],
  ['CT-103', 'Filtros, busca e contador', 'Loja', 'Trilha com eventos variados.',
   ['Filtre por severidade "Crítico", módulo "Royalties" e período "Hoje"; busque "cobrança" e observe o contador; clique em "✕ Limpar filtros".'],
   'Cada filtro/busca restringe a lista; o contador reflete o recorte; "Limpar filtros" restaura a trilha.'],
  ['CT-104', 'Exportar a trilha em XLSX', 'Loja', 'Permissão ativa.',
   ['Aplique um filtro e clique em "⬇ Exportar XLSX"; abra o arquivo.'],
   'O Excel baixa o recorte filtrado e a própria exportação aparece como novo evento na trilha.'],
]},
{ titulo: 'Ajuda em vídeo por rotina', intro: 'Valida o tutorial em vídeo em todas as telas: reprodução com imagem real, destaque do elemento de cada passo e texto de apoio.', casos: [
  ['CT-105', 'Tutorial em vídeo em uma tela da Loja', 'Loja', 'Nenhuma.',
   ['Em qualquer tela, clique no botão de ajuda (ícone de vídeo).', 'Reproduza o guia; navegue por → e ← e por clique num passo; leia as "Dicas".'],
   'O guia abre com a imagem real da tela; a cada passo a "câmera" destaca o elemento; o texto e as dicas correspondem à tela; a navegação funciona.'],
  ['CT-106', 'Cobertura da ajuda em todos os perfis e telas novas', 'Todos', 'Nenhuma.',
   ['Percorra telas dos quatro perfis, incluindo as novas (De/Para, Meus produtos/ficha, Workflow de etapas, Aceite comercial, Previsão de recebíveis, Venda por produtos).', 'Abra o tutorial em 2–3 telas de cada perfil.'],
   'Todas as rotinas têm o botão de ajuda com conteúdo específico (não genérico), incluindo as telas das melhorias.'],
]},
{ titulo: 'Persistência e recuperação', intro: 'Valida que os dados sobrevivem a recargas de página e reinícios da aplicação (persistência real em PostgreSQL).', casos: [
  ['CT-107', 'Dados sobrevivem ao recarregar a página (F5)', 'Loja', 'Ações anteriores executadas.',
   ['Após criar/alterar registros, pressione F5 e faça login se necessário.', 'Confira pedidos, produtos, cotações, faturamentos, royalties e auditoria.'],
   'Nada se perde: registros, status, etapas, imagens, parcelas e vínculos continuam como antes da recarga.'],
  ['CT-108', 'Dados sobrevivem ao reinício da aplicação', 'Equipe técnica', 'Acesso SSH à VPS.',
   ['Na VPS, execute "pm2 restart cidade-imperial"; aguarde ~10s, recarregue e entre novamente.'],
   'A aplicação volta sozinha (PM2) e todos os dados permanecem (PostgreSQL) — pedidos, anexos fiscais, royalties/parcelas, produtos/imagens, usuários e auditoria intactos.'],
]},
]

const XML_OK = `<?xml version="1.0"?>
<nfeProc><NFe><infNFe>
  <ide><nNF>7001</nNF></ide>
  <emit><CNPJ>12345678000190</CNPJ>
    <xNome>Distribuidora Serra Verde</xNome></emit>
  <dest><CNPJ>11111222000133</CNPJ>
    <xNome>Bar do Imperador</xNome></dest>
  <det nItem="1"><prod>
    <xProd>CHOPP PILSEN IMPERIAL 30L</xProd>
    <qCom>2</qCom><vProd>1240.00</vProd></prod></det>
  <total><ICMSTot><vNF>1240.00</vNF></ICMSTot></total>
</infNFe></NFe></nfeProc>`

const NOTAS_XML = 'IMPORTANTE: ajuste o "nfe-compativel.xml" ao pedido que estiver faturando — emitente = fornecedor logado, destinatário = revenda do pedido, itens (xProd/qCom/vProd) = itens encaminhados e vNF = "Valor efetivamente faturado". Para o "nfe-incompativel.xml", copie o compatível e troque o CNPJ/nome do destinatário (ex.: 99888777000166 / Mercadinho Sao Jorge) e o vNF (ex.: 9999.00). Os mesmos arquivos servem ao workflow de recusa/regularização (RF69). Para o boleto do RF70, use qualquer PDF pequeno. CNPJs de demonstração: Serra Verde 12.345.678/0001-90 · Imperial Bebidas 98.765.432/0001-10 · Bar do Imperador 11.111.222/0001-33 · Empório Colonial 22.333.444/0001-55.'

// Numeração automática dos módulos
const MODS = MODULOS.map((m, i) => ({ ...m, mod: `Módulo ${i + 1} — ${m.titulo}` }))
const totalCasos = MODS.reduce((a, m) => a + m.casos.length, 0)
const totalMods = MODS.length

// ── PDF ──────────────────────────────────────────────────────────────────────
const esc = (s) => String(s == null ? '' : s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]))

function casoHtml([id, titulo, perfil, pre, passos, esperado]) {
  return `<section class="caso">
    <div class="caso-head"><span class="caso-id">${esc(id)}</span><h3>${esc(titulo)}</h3><span class="caso-perfil">${esc(perfil)}</span></div>
    <div class="linha"><b>Pré-condições:</b> ${esc(pre)}</div>
    <div class="linha"><b>Passos:</b><ol>${passos.map((p) => `<li>${esc(p)}</li>`).join('')}</ol></div>
    <div class="esperado"><b>Resultado esperado:</b> ${esc(esperado)}</div>
    <table class="reg"><tr>
      <td style="width:34%"><b>Resultado:</b> ☐ Aprovado&nbsp;&nbsp;☐ Reprovado&nbsp;&nbsp;☐ Bloqueado</td>
      <td style="width:33%"><b>Testador:</b> ______________________</td>
      <td style="width:33%"><b>Data:</b> ____/____/______</td></tr>
      <tr><td colspan="3"><b>Observações / evidências:</b><br><span class="obs">&nbsp;</span></td></tr>
    </table>
  </section>`
}

const htmlPdf = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><style>
  @page { size: A4; margin: 0; }
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:'Segoe UI',Arial,sans-serif; color:#272525; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
  .capa { height:296.5mm; position:relative; background:radial-gradient(900px 500px at 70% -10%, #3a2f1c, #272525 55%, #1c1a18); page-break-after:always; }
  .miolo { padding:14mm 15mm; }
  h2.mod { font-size:16px; font-weight:800; color:#fff; background:linear-gradient(135deg,#3a3227,#272525); border-radius:10px; padding:10px 14px; margin:14px 0 4px; break-after:avoid; }
  .mod-intro { font-size:11px; color:#6b6459; line-height:1.5; margin:6px 2px 10px; }
  h3 { font-size:13px; font-weight:800; color:#272525; flex:1; }
  .caso { break-inside:avoid; border:1px solid #eae3d6; border-radius:10px; padding:10px 12px; margin-bottom:10px; background:#fffdf9; }
  .caso-head { display:flex; align-items:center; gap:9px; margin-bottom:6px; }
  .caso-id { font-family:Consolas,monospace; font-size:11px; font-weight:700; color:#fff; background:linear-gradient(135deg,#cfa055,#B38335 60%,#8a6428); border-radius:7px; padding:3px 9px; flex:none; }
  .caso-perfil { font-size:9.5px; font-weight:700; letter-spacing:.05em; color:#5d3f96; background:#f2effa; border:1px solid #ddd8ee; border-radius:12px; padding:2px 9px; flex:none; }
  .linha { font-size:11px; color:#4a453d; line-height:1.5; margin:4px 0; }
  .linha ol { margin:3px 0 2px 18px; } .linha li { margin:2.5px 0; }
  .esperado { font-size:11px; color:#2f4b33; line-height:1.5; background:#eef5ef; border-left:3px solid #2f6b39; border-radius:0 7px 7px 0; padding:6px 10px; margin:6px 0; }
  .reg { width:100%; border-collapse:collapse; margin-top:6px; font-size:10px; color:#6b6459; }
  .reg td { border:1px solid #e5ddcd; padding:5px 8px; } .obs { display:block; height:22px; }
  .tbl { width:100%; border-collapse:collapse; margin:8px 0; font-size:10.5px; }
  .tbl th { text-align:left; background:#272525; color:#e3bf7e; padding:6px 8px; font-size:9.5px; text-transform:uppercase; letter-spacing:.05em; }
  .tbl td { padding:5px 8px; border-bottom:1px solid #eee7d8; color:#4a453d; }
  .tbl tr:nth-child(even) td { background:#faf7f0; }
  p { font-size:11.5px; color:#4a453d; line-height:1.55; margin:6px 0; }
  .bloco { border:1px solid #eae3d6; border-radius:10px; background:#fffdf9; padding:11px 13px; margin:10px 0; break-inside:avoid; }
  .code { background:#272525; color:#e8e2d6; font-family:Consolas,monospace; font-size:10px; line-height:1.5; padding:9px 11px; border-radius:8px; white-space:pre-wrap; }
  .sec-title { font-size:12.5px; font-weight:800; letter-spacing:.12em; color:#B38335; margin:6px 0 8px; }
  .mono { font-family:Consolas,monospace; }
</style></head><body>

<div class="capa">
  <div style="position:absolute;left:16mm;top:18mm;display:flex;align-items:center;gap:14px">
    <div style="width:50px;height:50px;border-radius:13px;background:linear-gradient(135deg,#cfa055,#B38335 55%,#8a6428);display:flex;align-items:center;justify-content:center;font-family:Georgia,serif;font-weight:700;font-size:21px;color:#fff">CI</div>
    <div><div style="font-family:Georgia,serif;font-weight:700;font-size:15px;letter-spacing:.14em;color:#fff">CIDADE IMPERIAL</div>
    <div style="font-size:10.5px;letter-spacing:.16em;color:#e3bf7e;margin-top:3px">PLATAFORMA DA LOJA</div></div>
  </div>
  <div style="position:absolute;left:16mm;right:16mm;top:74mm">
    <div style="font-size:13px;font-weight:700;letter-spacing:.18em;color:#e3bf7e;margin-bottom:12px">QUALIDADE · HOMOLOGAÇÃO PELO USUÁRIO FINAL · REV02</div>
    <div style="font-size:39px;font-weight:800;color:#fff;line-height:1.1;letter-spacing:-.5px">Roteiro de Testes<br>de Aceitação (UAT)</div>
    <div style="font-size:14px;color:#c9c1b4;margin-top:16px;line-height:1.6;max-width:158mm">Versão atualizada: ${totalCasos} casos de teste em ${totalMods} módulos, cobrindo toda a jornada e as 28 melhorias da Fase 1 (RF48–RF75) — grupo econômico, produtos (preço, fornecedores, ficha fiscal, imagens, De/Para), workflow de 9 etapas do pedido, cotações com quantidades/frete/rodadas/economia, aceite comercial da revenda, recusa e regularização de documento fiscal, royalties com gatilhos/parcelas/recebíveis e relatórios de vendas e desempenho.</div>
    <div style="margin-top:18px;display:inline-block;background:#ffffff14;border:1px solid #e3bf7e55;border-radius:10px;padding:9px 15px;font-family:Consolas,monospace;font-size:12px;color:#e3bf7e">${URL_HML}</div>
  </div>
  <div style="position:absolute;left:16mm;bottom:34mm;right:16mm;display:flex;gap:6px;flex-wrap:wrap">
    ${MODS.map((m) => `<div style="background:#ffffff10;border:1px solid #ffffff22;border-radius:8px;padding:5px 9px;font-size:9px;color:#e8e2d6">${esc(m.titulo.replace(/ \(RF.*\)/, ''))}</div>`).join('')}
  </div>
  <div style="position:absolute;left:16mm;bottom:18mm;font-size:10px;color:#8a8378">17 de julho de 2026 · REV02 — atualiza o roteiro original com as melhorias da Fase 1 · para preenchimento pelo usuário final</div>
</div>

<div class="miolo">
  <div class="sec-title">1 · INSTRUÇÕES AO TESTADOR</div>
  <div class="bloco">
    <p><b>Objetivo.</b> Este roteiro orienta a homologação da Plataforma Cidade Imperial pelo usuário final, já com as melhorias da Fase 1. Cada caso (CT) traz o perfil executor, as pré-condições, os passos numerados e o resultado esperado. Execute os casos <b>na ordem</b>, pois vários preparam dados para os seguintes.</p>
    <p><b>Como registrar.</b> Ao final de cada caso, marque <b>Aprovado</b>, <b>Reprovado</b> (descreva o ocorrido, com prints) ou <b>Bloqueado</b>. Preencha testador e data.</p>
    <p><b>Critério de aceite sugerido.</b> 100% dos casos executados; nenhum caso crítico reprovado (Acesso, Pedidos/Recebimento, Atendimento, Aceite comercial, Faturamento e Royalties); reprovações não críticas listadas com plano de correção. O aceite final é formalizado na seção 5.</p>
    <p><b>Ambiente.</b> ${URL_HML} — homologação com dados de demonstração. Evite testar em produção. Os e-mails automáticos só são enviados com o SMTP configurado e ativo (Configurações Técnicas).</p>
  </div>

  <div class="sec-title">2 · ACESSOS DE DEMONSTRAÇÃO</div>
  <table class="tbl"><tr><th>Perfil</th><th>E-mail (login)</th><th>Senha</th><th>Observação</th></tr>
    ${ACESSOS.map((a) => `<tr><td><b>${esc(a[0])}</b></td><td class="mono">${esc(a[1])}</td><td class="mono">${esc(a[2])}</td><td>${esc(a[3])}</td></tr>`).join('')}
  </table>

  <div class="sec-title">3 · CASOS DE TESTE</div>
  ${MODS.map((m) => `<h2 class="mod">${esc(m.mod)}</h2><div class="mod-intro">${esc(m.intro)}</div>${m.casos.map(casoHtml).join('')}`).join('')}

  <div class="sec-title">4 · ANEXO A — ARQUIVOS DE TESTE DO DOCUMENTO FISCAL (FATURAMENTO E RF69)</div>
  <div class="bloco">
    <p>Crie no Bloco de Notas um arquivo <b>nfe-compativel.xml</b> com o conteúdo abaixo (salve com a extensão .xml):</p>
    <div class="code">${esc(XML_OK)}</div>
    <p style="margin-top:8px">${esc(NOTAS_XML)}</p>
  </div>

  <div class="sec-title">5 · RESUMO DA EXECUÇÃO E ACEITE</div>
  <table class="tbl"><tr><th style="width:12%">Caso</th><th>Título</th><th style="width:14%">Resultado</th><th style="width:24%">Observações</th></tr>
    ${MODS.flatMap((m) => m.casos).map((c) => `<tr><td class="mono">${esc(c[0])}</td><td>${esc(c[1])}</td><td></td><td></td></tr>`).join('')}
  </table>
  <div class="bloco" style="margin-top:12px">
    <p><b>Totais:</b> Executados: ______ / ${totalCasos} &nbsp;·&nbsp; Aprovados: ______ &nbsp;·&nbsp; Reprovados: ______ &nbsp;·&nbsp; Bloqueados: ______</p>
    <p style="margin-top:10px"><b>Parecer final:</b> ☐ Aprovado sem ressalvas &nbsp;&nbsp; ☐ Aprovado com ressalvas (listar) &nbsp;&nbsp; ☐ Reprovado</p>
    <p style="margin-top:16px">Responsável pela homologação: ______________________________________ &nbsp;&nbsp; Data: ____/____/______</p>
    <p style="margin-top:10px">Assinatura: ______________________________________</p>
  </div>
  <div style="display:flex;justify-content:space-between;font-size:9px;color:#a89f90;border-top:1px solid #eae3d6;padding-top:6px;margin-top:8px">
    <span>Plataforma Cidade Imperial — Roteiro de Testes de Aceitação (UAT) · REV02 · ${totalCasos} casos</span><span>julho/2026</span>
  </div>
</div>
</body></html>`

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' })
const page = await browser.newPage()
await page.setContent(htmlPdf, { waitUntil: 'networkidle' })
await page.pdf({ path: OUT_PDF, format: 'A4', printBackground: true, margin: { top: 0, bottom: 0, left: 0, right: 0 } })
await browser.close()
console.log('PDF ok:', OUT_PDF)

// ── DOCX ─────────────────────────────────────────────────────────────────────
const Pr = (txt, opts = {}) => new Paragraph({ children: [new TextRun({ text: txt, size: opts.size || 21, bold: !!opts.bold, color: opts.color || '3A362E', font: 'Calibri' })], spacing: { after: opts.after ?? 90, before: opts.before ?? 0 }, alignment: opts.align })
const Prich = (runs, opts = {}) => new Paragraph({ children: runs.map((r) => new TextRun({ font: 'Calibri', size: 21, color: '3A362E', ...r })), spacing: { after: opts.after ?? 90 } })
const cellB = { top: { style: BorderStyle.SINGLE, size: 4, color: 'E5DDCD' }, bottom: { style: BorderStyle.SINGLE, size: 4, color: 'E5DDCD' }, left: { style: BorderStyle.SINGLE, size: 4, color: 'E5DDCD' }, right: { style: BorderStyle.SINGLE, size: 4, color: 'E5DDCD' } }
const cell = (children, opts = {}) => new TableCell({ children, borders: cellB, shading: opts.fill ? { type: ShadingType.SOLID, color: opts.fill, fill: opts.fill } : undefined, width: opts.w ? { size: opts.w, type: WidthType.PERCENTAGE } : undefined, columnSpan: opts.span, margins: { top: 60, bottom: 60, left: 100, right: 100 } })
const headCell = (t, w) => cell([Pr(t, { bold: true, color: 'E3BF7E', size: 19 })], { fill: DARK, w })

const filhos = []
filhos.push(Pr('CIDADE IMPERIAL · PLATAFORMA DA LOJA', { bold: true, color: GOLD, size: 22, before: 200 }))
filhos.push(new Paragraph({ children: [new TextRun({ text: 'Roteiro de Testes de Aceitação (UAT) — REV02', bold: true, size: 52, color: DARK, font: 'Calibri' })], spacing: { after: 160 } }))
filhos.push(Pr(`Versão atualizada · ${totalCasos} casos em ${totalMods} módulos · cobre a base + as 28 melhorias da Fase 1 (RF48–RF75)`, { size: 24, color: GREY, after: 60 }))
filhos.push(Pr(`Ambiente: ${URL_HML}`, { size: 22, color: GREY, after: 60 }))
filhos.push(Pr('17 de julho de 2026', { size: 22, color: GREY, after: 300 }))

filhos.push(new Paragraph({ text: '1. Instruções ao testador', heading: HeadingLevel.HEADING_1 }))
;[['Objetivo', 'Este roteiro orienta a homologação da Plataforma Cidade Imperial pelo usuário final, já com as melhorias da Fase 1. Cada caso (CT) traz o perfil executor, as pré-condições, os passos numerados e o resultado esperado. Execute os casos na ordem, pois vários preparam dados para os seguintes.'],
  ['Como registrar', 'Ao final de cada caso, marque Aprovado, Reprovado (descreva o ocorrido, com capturas de tela) ou Bloqueado. Preencha testador e data.'],
  ['Critério de aceite sugerido', '100% dos casos executados; nenhum caso crítico reprovado (Acesso, Pedidos/Recebimento, Atendimento, Aceite comercial, Faturamento e Royalties); reprovações não críticas listadas com plano de correção.'],
  ['Ambiente', `${URL_HML} — homologação com dados de demonstração. Os e-mails automáticos só são enviados com o SMTP configurado e ativo.`],
].forEach(([t, d]) => filhos.push(Prich([{ text: t + '. ', bold: true }, { text: d }])))

filhos.push(new Paragraph({ text: '2. Acessos de demonstração', heading: HeadingLevel.HEADING_1 }))
filhos.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [
  new TableRow({ children: [headCell('Perfil', 20), headCell('E-mail (login)', 28), headCell('Senha', 10), headCell('Observação', 42)] }),
  ...ACESSOS.map((a) => new TableRow({ children: [cell([Pr(a[0], { bold: true })]), cell([Pr(a[1])]), cell([Pr(a[2])]), cell([Pr(a[3], { size: 19 })])] })),
] }))

filhos.push(new Paragraph({ text: '3. Casos de teste', heading: HeadingLevel.HEADING_1 }))
for (const m of MODS) {
  filhos.push(new Paragraph({ text: m.mod, heading: HeadingLevel.HEADING_2 }))
  filhos.push(Pr(m.intro, { color: GREY, after: 140 }))
  for (const [id, titulo, perfil, pre, passos, esperado] of m.casos) {
    filhos.push(new Paragraph({ children: [
      new TextRun({ text: `${id} — ${titulo}`, bold: true, size: 24, color: '8A5A12', font: 'Calibri' }),
      new TextRun({ text: `   (executor: ${perfil})`, size: 20, color: GREY, font: 'Calibri', italics: true }),
    ], spacing: { before: 180, after: 70 }, keepNext: true }))
    filhos.push(Prich([{ text: 'Pré-condições: ', bold: true }, { text: pre }]))
    filhos.push(Prich([{ text: 'Passos:', bold: true }], { after: 40 }))
    passos.forEach((p, i) => filhos.push(Prich([{ text: `${i + 1}. `, bold: true }, { text: p }], { after: 30 })))
    filhos.push(Prich([{ text: 'Resultado esperado: ', bold: true, color: '2F6B39' }, { text: esperado, color: '2F4B33' }], { after: 80 }))
    filhos.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [
      new TableRow({ children: [
        cell([Pr('Resultado:  ☐ Aprovado    ☐ Reprovado    ☐ Bloqueado', { size: 19 })], { w: 40, fill: CREAM }),
        cell([Pr('Testador: ____________________', { size: 19 })], { w: 32, fill: CREAM }),
        cell([Pr('Data: ____/____/______', { size: 19 })], { w: 28, fill: CREAM })] }),
      new TableRow({ children: [cell([Pr('Observações / evidências:', { size: 19, bold: true }), Pr(' ', { after: 160 })], { span: 3 })] }),
    ] }))
    filhos.push(Pr(' ', { after: 40 }))
  }
}

filhos.push(new Paragraph({ text: '4. Anexo A — arquivos de teste do documento fiscal (Faturamento e RF69)', heading: HeadingLevel.HEADING_1 }))
filhos.push(Pr('Crie no Bloco de Notas um arquivo nfe-compativel.xml com o conteúdo abaixo (salve com a extensão .xml):'))
XML_OK.split('\n').forEach((l) => filhos.push(new Paragraph({ children: [new TextRun({ text: l, font: 'Consolas', size: 17, color: '3A362E' })], shading: { type: ShadingType.SOLID, color: 'F4F1EA', fill: 'F4F1EA' }, spacing: { after: 0 } })))
filhos.push(Pr(NOTAS_XML, { size: 19, color: GREY, before: 140 }))

filhos.push(new Paragraph({ text: '5. Resumo da execução e aceite', heading: HeadingLevel.HEADING_1 }))
filhos.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [
  new TableRow({ children: [headCell('Caso', 12), headCell('Título', 49), headCell('Resultado', 13), headCell('Observações', 26)] }),
  ...MODS.flatMap((m) => m.casos).map((c) => new TableRow({ children: [cell([Pr(c[0], { size: 18 })]), cell([Pr(c[1], { size: 18 })]), cell([Pr(' ')]), cell([Pr(' ')])] })),
] }))
filhos.push(Pr(`Totais — Executados: ______ / ${totalCasos}   ·   Aprovados: ______   ·   Reprovados: ______   ·   Bloqueados: ______`, { before: 220, bold: true }))
filhos.push(Pr('Parecer final:  ☐ Aprovado sem ressalvas     ☐ Aprovado com ressalvas (listar)     ☐ Reprovado', { before: 120 }))
filhos.push(Pr('Responsável pela homologação: ______________________________________________     Data: ____/____/______', { before: 220 }))
filhos.push(Pr('Assinatura: ______________________________________________', { before: 120 }))

const doc = new Document({
  styles: { paragraphStyles: [
    { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 32, bold: true, color: DARK, font: 'Calibri' }, paragraph: { spacing: { before: 340, after: 140 } } },
    { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 26, bold: true, color: GOLD, font: 'Calibri' }, paragraph: { spacing: { before: 280, after: 100 } } },
  ] },
  sections: [{ properties: { page: { margin: { top: 1000, bottom: 1000, left: 1100, right: 1100 } } }, children: filhos }],
})
writeFileSync(OUT_DOCX, await Packer.toBuffer(doc))
console.log('DOCX ok:', OUT_DOCX, '· casos:', totalCasos, '· módulos:', totalMods)
