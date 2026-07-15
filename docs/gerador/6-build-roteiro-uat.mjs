// Gera o Roteiro de Testes de Aceitação (UAT) do usuário final em PDF e Word.
// Rode a partir de docs/gerador:  node 6-build-roteiro-uat.mjs
import pw from '/opt/node22/lib/node_modules/playwright/index.js'
import { writeFileSync } from 'node:fs'
import {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  Table, TableRow, TableCell, WidthType, AlignmentType, BorderStyle, ShadingType,
} from 'docx'
const { chromium } = pw

const OUT_PDF = '/home/user/P018LJCDI/docs/Plataforma-Cidade-Imperial-Roteiro-Testes-Aceitacao.pdf'
const OUT_DOCX = '/home/user/P018LJCDI/docs/Plataforma-Cidade-Imperial-Roteiro-Testes-Aceitacao.docx'
const URL_HML = 'https://lojacidadeimperialhml.cervejariacidadeimperial.com'
const GOLD = 'B38335', DARK = '272525', GREY = '6B6459', CREAM = 'F7F4EE'

// ─────────────────────────────────────────────────────────────────────────────
// ACESSOS DE DEMONSTRAÇÃO
// ─────────────────────────────────────────────────────────────────────────────
const ACESSOS = [
  ['Administrador Técnico', 'admin@cidadeimperial.com.br', 'admin123', 'Acesso total; enxerga a visão da Loja e as Configurações Técnicas.'],
  ['Loja (gestora)', 'ana@cidadeimperial.com.br', 'loja123', 'Ana Ribeiro — aprova pedidos, decide cotações, royalties, relatórios.'],
  ['Loja (analista restrito)', 'carlos@cidadeimperial.com.br', 'loja123', 'Carlos Mota — permissões personalizadas (não aprova/rejeita/atende pedidos, não registra pagamento).'],
  ['Fornecedor', 'comercial@serraverde.com.br', 'forn123', 'Distribuidora Serra Verde — pedidos recebidos, cotações, faturamentos, royalties devidos.'],
  ['Revenda', 'compras@bardoimperador.com.br', 'rev123', 'Bar do Imperador — catálogo, carrinho e acompanhamento de pedidos.'],
]

// ─────────────────────────────────────────────────────────────────────────────
// CASOS DE TESTE — [id, título, perfil, pré-condições, [passos], resultado esperado]
// ─────────────────────────────────────────────────────────────────────────────
const MODULOS = [
{ mod: 'Módulo 1 — Acesso e autenticação', intro: 'Valida o controle de acesso da plataforma: login por e-mail e senha, mensagens de erro, encerramento de sessão e a visão correta de cada perfil.', casos: [
  ['CT-001', 'Login com credenciais válidas (Loja)', 'Loja',
   'Aplicação acessível no navegador (URL do ambiente).',
   ['Abra a URL do ambiente no navegador.',
    'Na tela de login, digite o e-mail "ana@cidadeimperial.com.br" e a senha "loja123".',
    'Clique no botão dourado "Entrar na plataforma".'],
   'O sistema autentica e abre o "Painel geral" da Loja, com os quatro cartões de indicadores no topo e o menu lateral com os grupos Operação, Cadastros, Financeiro e Gestão. O nome "Ana Ribeiro (Loja)" aparece no topo direito.'],
  ['CT-002', 'Login com senha incorreta', 'Qualquer',
   'Nenhuma.',
   ['Na tela de login, digite o e-mail "ana@cidadeimperial.com.br" e uma senha errada (ex.: "abc123").',
    'Clique em "Entrar na plataforma".'],
   'O acesso é negado com a mensagem "Senha incorreta." e o usuário permanece na tela de login. (A tentativa fica registrada na trilha de auditoria como "Falha de login", com severidade crítica — verificado no CT-111.)'],
  ['CT-003', 'Login com usuário inexistente', 'Qualquer',
   'Nenhuma.',
   ['Na tela de login, digite um e-mail não cadastrado (ex.: "ninguem@teste.com.br") e qualquer senha.',
    'Clique em "Entrar na plataforma".'],
   'Mensagem "Usuário não encontrado. Verifique o e-mail ou fale com o administrador." e o acesso não é liberado.'],
  ['CT-004', 'Preenchimento rápido pelos acessos de demonstração', 'Qualquer',
   'Nenhuma.',
   ['Na tela de login, localize a lista de acessos de demonstração exibida abaixo do botão de entrar.',
    'Clique sobre um dos acessos listados (ex.: o do Fornecedor).',
    'Confira que os campos de e-mail e senha foram preenchidos automaticamente e clique em "Entrar na plataforma".'],
   'Os campos são preenchidos com o acesso clicado e o login acontece normalmente no perfil correspondente.'],
  ['CT-005', 'Logout (sair da plataforma)', 'Qualquer',
   'Usuário logado (qualquer perfil).',
   ['No topo direito da tela, clique no botão "Sair".'],
   'A sessão é encerrada e a tela de login reaparece. (O evento "Logout realizado" fica na trilha de auditoria.)'],
  ['CT-006', 'Visão restrita por perfil', 'Fornecedor e Revenda',
   'Nenhuma.',
   ['Entre como Fornecedor ("comercial@serraverde.com.br" / "forn123") e observe o menu lateral.',
    'Saia e entre como Revenda ("compras@bardoimperador.com.br" / "rev123") e observe o menu lateral.'],
   'O Fornecedor vê apenas: Pedidos recebidos, Cotações convidadas, Meus faturamentos e Royalties devidos. A Revenda vê apenas: Catálogo de produtos e Meus pedidos. Nenhum dos dois vê telas da Loja (cadastros, relatórios, auditoria, configurações).'],
]},
{ mod: 'Módulo 2 — Usuários e permissões (Administrador)', intro: 'Valida a criação e manutenção de contas por perfil (Administrador, Loja, Fornecedor, Revenda) e o permissionamento de granularidade fina por usuário.', casos: [
  ['CT-010', 'Criar um novo usuário do perfil Loja', 'Administrador',
   'Logado como admin@cidadeimperial.com.br.',
   ['No menu lateral, grupo "Configurações Técnicas", clique em "Usuários e permissões".',
    'Clique no botão dourado "+ Novo usuário".',
    'Preencha: nome "Usuário Teste UAT", e-mail "teste.uat@cidadeimperial.com.br", perfil "Loja Cidade Imperial" e senha "teste123".',
    'Salve o cadastro.',
    'Clique em "Sair" e entre com "teste.uat@cidadeimperial.com.br" / "teste123".'],
   'O usuário é criado e aparece na lista com o selo "⚙ padrão do perfil". O login com a nova conta funciona e abre a visão da Loja.'],
  ['CT-011', 'Editar usuário e redefinir senha', 'Administrador',
   'CT-010 executado.',
   ['Em "Usuários e permissões", localize "Usuário Teste UAT" e clique em "Editar".',
    'Altere o nome para "Usuário Teste UAT 2" e informe uma nova senha "teste456" (deixar em branco manteria a atual).',
    'Salve e saia. Tente entrar com a senha antiga "teste123" e depois com a nova "teste456".'],
   'A senha antiga é recusada ("Senha incorreta.") e a nova funciona. O nome atualizado aparece na lista e no topo da tela após o login.'],
  ['CT-012', 'Negar uma permissão específica (granularidade fina)', 'Administrador',
   'CT-010 executado.',
   ['Em "Usuários e permissões", clique no selo "⚙" na linha do "Usuário Teste UAT 2" para abrir o editor de permissões.',
    'Localize o grupo "Gestão" e desligue o interruptor de "Exportar relatórios (CSV)".',
    'Observe que a linha passa a indicar "personalizada" e clique em "Concluir".',
    'Saia, entre com o usuário de teste, abra "Relatórios" e procure os botões de exportação.'],
   'No editor, a permissão fica marcada como personalizada e o selo da lista muda para "1 personalizada(s)". Logado com o usuário de teste, os botões de exportar relatório não aparecem; as demais telas continuam acessíveis.'],
  ['CT-013', 'Restaurar o padrão do perfil', 'Administrador',
   'CT-012 executado.',
   ['Abra novamente o editor de permissões do usuário de teste.',
    'Clique em "↺ Restaurar padrão do perfil" e depois em "Concluir".'],
   'Todas as permissões voltam a "padrão do perfil" e o selo da lista volta a "⚙ padrão do perfil".'],
  ['CT-014', 'Inativar usuário e bloquear o acesso', 'Administrador',
   'CT-010 executado.',
   ['Em "Usuários e permissões", clique em "Inativar" na linha do usuário de teste.',
    'Saia e tente entrar com "teste.uat@cidadeimperial.com.br" / "teste456".',
    'Volte como administrador e clique em "Reativar" no mesmo usuário.'],
   'Com o usuário inativo, o login é recusado com "Usuário inativo. Fale com o administrador da plataforma.". Após reativar, o login volta a funcionar.'],
  ['CT-015', 'Proteção do último administrador', 'Administrador',
   'Existir apenas um usuário com perfil Administrador Técnico ativo.',
   ['Em "Usuários e permissões", tente inativar o próprio usuário "Administrador Técnico" (ou editar trocando o perfil dele para outro).'],
   'O sistema impede a operação com aviso de que deve existir ao menos um Administrador Técnico ativo.'],
  ['CT-016', 'Usuário analista com permissões restritas (semeado)', 'Loja (analista)',
   'Nenhuma.',
   ['Entre com "carlos@cidadeimperial.com.br" / "loja123".',
    'Abra a tela "Pedidos" e clique em um pedido com a etiqueta "Pendente" (ex.: PED-0045).',
    'Procure os botões "Aprovar pedido" e "Rejeitar…".'],
   'Carlos consegue ver os pedidos e o detalhe, mas os botões de aprovar/rejeitar/atender não aparecem (permissões negadas individualmente para ele).'],
]},
{ mod: 'Módulo 3 — Catálogo e criação de pedido (Revenda)', intro: 'Valida a jornada de compra da revenda: catálogo homologado com visibilidade controlada, sigilo de preços, carrinho e envio do pedido para aprovação.', casos: [
  ['CT-020', 'Catálogo sem exposição de preços', 'Revenda',
   'Logado como compras@bardoimperador.com.br.',
   ['Abra "Catálogo de produtos".',
    'Percorra os cartões de produtos exibidos, observando código, descrição, unidade e fotos.',
    'Procure por qualquer valor monetário (R$) nos cartões, na busca e nas fotos ampliadas.'],
   'Nenhum preço de produto é exibido em lugar algum do catálogo — a revenda só conhece valores após a negociação da Loja (cotação) ou no faturamento. As fotos abrem ampliadas ao clicar.'],
  ['CT-021', 'Busca no catálogo', 'Revenda',
   'Nenhuma.',
   ['No campo "Buscar produto…", digite "chopp".',
    'Limpe a busca e digite um termo inexistente (ex.: "xyz").'],
   'A lista filtra em tempo real mostrando apenas os produtos com "chopp" no nome/código; com termo inexistente, nenhum cartão é exibido.'],
  ['CT-022', 'Montar carrinho e enviar pedido', 'Revenda',
   'Nenhuma.',
   ['No catálogo, use os botões de quantidade (+) para adicionar 2 unidades de um produto e 3 de outro.',
    'Confira o resumo do carrinho (quantidade de itens).',
    'Conclua o envio do pedido pelo botão de finalizar/enviar pedido.',
    'Abra "Meus pedidos".'],
   'O pedido é criado com número sequencial (PED-00XX), aparece em "Meus pedidos" com a etiqueta "Pendente" e os itens/quantidades corretos. (A Loja é notificada por e-mail se o SMTP estiver ativo.)'],
  ['CT-023', 'Acompanhamento do pedido pela revenda', 'Revenda',
   'CT-022 executado.',
   ['Em "Meus pedidos", localize o pedido recém-criado e observe a etiqueta de status.',
    'Repita a consulta após a Loja aprovar/atender o pedido (Módulos 4 e 5).'],
   'O status evolui conforme o fluxo (Pendente → Aprovado → Encaminhado/Atendido → Faturado), sem exibir preços de catálogo — valores só aparecem para a revenda quando houver faturamento.'],
]},
{ mod: 'Módulo 4 — Aprovação de pedidos (Loja)', intro: 'Valida a análise da Loja: aprovação e rejeição do pedido inteiro ou item a item, com justificativa e trilha.', casos: [
  ['CT-030', 'Alerta de pendências no Painel geral', 'Loja',
   'Existir pedido pendente (ex.: o do CT-022 ou o PED-0044/PED-0045 semeados).',
   ['Entre como "ana@cidadeimperial.com.br" e observe o Painel geral.',
    'Clique no botão "Analisar pedidos" da faixa amarela de pendências.'],
   'A faixa amarela informa quantos pedidos aguardam análise e o botão leva direto à tela "Pedidos".'],
  ['CT-031', 'Aprovar o pedido inteiro', 'Loja',
   'Pedido pendente disponível.',
   ['Na tela "Pedidos", clique na linha do pedido pendente para abrir o detalhe.',
    'No quadro "Análise da Loja", clique em "Aprovar pedido".'],
   'Todos os itens passam a "Aprovado", a trilha do pedido registra a aprovação com data/hora e usuário, e surge o quadro "Decisão de atendimento — por item".'],
  ['CT-032', 'Aprovar e rejeitar item a item', 'Loja',
   'Outro pedido pendente com 2+ itens (crie um pela revenda, se necessário).',
   ['Abra o detalhe do pedido pendente.',
    'Na tabela de itens, aprove apenas o primeiro item pela ação da própria linha.',
    'Rejeite o segundo item pela ação da linha, informando a justificativa "Produto indisponível no momento" quando solicitada.'],
   'O primeiro item fica "Aprovado" e o segundo "Rejeitado" com a justificativa gravada. O status geral do pedido reflete a situação mista e tudo fica na trilha do pedido.'],
  ['CT-033', 'Rejeitar o pedido inteiro com justificativa', 'Loja',
   'Um pedido pendente disponível.',
   ['Abra o detalhe do pedido e clique em "Rejeitar…".',
    'Informe a justificativa "Teste UAT — limite de crédito" e confirme.'],
   'O pedido inteiro fica "Rejeitado", a justificativa aparece no detalhe e a revenda vê o novo status em "Meus pedidos".'],
]},
{ mod: 'Módulo 5 — Atendimento do pedido (estoque, envio direto, cotação e divisão de quantidades)', intro: 'Valida os três caminhos de atendimento e a divisão de quantidades de um mesmo item entre caminhos diferentes, com o alerta de saldo do inventário apoiando a decisão.', casos: [
  ['CT-040', 'Alerta de saldo de inventário na decisão', 'Loja',
   'Pedido com itens aprovados; inventário lançado (há um semeado de 01/07/2026).',
   ['No detalhe do pedido aprovado, clique em "Atender com estoque da Loja…".',
    'Observe, ao lado de cada item selecionável, a indicação "◈ saldo em estoque: N".'],
   'Cada item mostra o saldo calculado a partir do último inventário (verde quando cobre a quantidade pedida, laranja/vermelho quando parcial ou zerado), dando a informação para o aprovador decidir o caminho.'],
  ['CT-041', 'Atender itens com estoque da Loja', 'Loja',
   'Pedido com itens aprovados.',
   ['Na janela "Atender com estoque da Loja…", mantenha selecionado apenas um dos itens.',
    'Confirme o atendimento.'],
   'O item selecionado passa ao status "Estoque da Loja"; os demais permanecem "Aprovado". A trilha registra o atendimento e o saldo de inventário passa a descontar essa saída.'],
  ['CT-042', 'Envio direto a um fornecedor', 'Loja',
   'Pedido com itens aprovados.',
   ['No detalhe do pedido, clique em "Envio direto a um fornecedor…".',
    'Selecione o(s) item(ns), escolha o fornecedor de destino (ex.: Distribuidora Serra Verde) e clique em "Encaminhar itens selecionados".'],
   'Os itens selecionados passam a "No fornecedor" e o pedido aparece para aquele fornecedor em "Pedidos recebidos". (Fornecedor e revenda são notificados por e-mail se o SMTP estiver ativo.)'],
  ['CT-043', 'Dividir a quantidade de um item entre caminhos', 'Loja',
   'Pedido com um item aprovado de quantidade 2 ou mais.',
   ['Abra "Atender com estoque da Loja…" e selecione o item.',
    'No campo "Quantidade neste caminho", reduza para atender apenas parte (ex.: 1 de 2) e confirme.',
    'Reabra o detalhe: o item aparece dividido em duas linhas.',
    'Encaminhe o saldo restante por "Envio direto a um fornecedor…".'],
   'O item é fracionado: uma linha "Estoque da Loja" com a quantidade atendida e outra linha "Aprovado" com o saldo, que pode seguir outro caminho (envio direto ou cotação). Os totais permanecem consistentes.'],
  ['CT-044', 'Abrir cotação para itens do pedido', 'Loja',
   'Pedido com itens aprovados.',
   ['No detalhe do pedido, clique em "Abrir cotação (2+ fornecedores)…".',
    'Selecione o(s) item(ns), marque ao menos dois fornecedores convidados, informe o prazo e confirme.'],
   'A cotação é criada (COT-XX) com status "Aguardando propostas", os itens do pedido passam a "Em cotação" e os fornecedores convidados são notificados (com SMTP ativo).'],
]},
{ mod: 'Módulo 6 — Inventário de estoque (com planilha XLSX)', intro: 'Valida o lançamento de inventário em datas específicas, os três modelos de planilha-template em Excel nativo e a carga por planilha.', casos: [
  ['CT-050', 'Baixar os três modelos de template XLSX', 'Loja',
   'Logado como Loja, na tela "Inventário de estoque".',
   ['Informe/confirme a data do inventário (padrão: hoje) no campo de data do template.',
    'Baixe o modelo "todos os produtos" (produtos preenchidos com quantidades em branco e a data escolhida).',
    'Baixe o modelo "itens do último inventário" (somente os produtos que tinham quantidade no último inventário).',
    'Baixe o modelo "somente cabeçalho" (planilha vazia com os títulos das colunas).',
    'Abra os três arquivos no Excel/LibreOffice.'],
   'Os três arquivos baixam em formato .xlsx nativo e abrem sem aviso de corrompimento: modelo 1 lista todos os produtos ativos com quantidade em branco e a data escolhida; modelo 2 traz apenas os itens com quantidade no último inventário; modelo 3 traz somente o cabeçalho. Acentos e datas aparecem corretos.'],
  ['CT-051', 'Carregar planilha de inventário preenchida', 'Loja',
   'Modelo baixado no CT-050.',
   ['No modelo "todos os produtos", preencha quantidades para alguns produtos (ex.: 12, 8, 20) e salve o arquivo.',
    'Na tela de Inventário, use a carga de planilha e selecione o arquivo salvo.',
    'Confira o resumo de conferência apresentado e confirme a gravação.'],
   'A planilha é lida, o sistema mostra o que será gravado (produtos reconhecidos e quantidades) e o inventário entra na lista com a data e o usuário. Os saldos exibidos nos pedidos passam a considerar esse inventário.'],
  ['CT-052', 'Lançamento manual de inventário', 'Loja',
   'Nenhuma.',
   ['Na tela de Inventário, abra o lançamento manual, informe a data e as quantidades de alguns produtos e salve com uma observação (ex.: "Contagem UAT").'],
   'O inventário manual é gravado com data, usuário e observação, aparecendo no histórico da tela.'],
  ['CT-053', 'Saldo refletido nos alertas dos pedidos', 'Loja',
   'CT-051 ou CT-052 executado.',
   ['Abra um pedido com itens aprovados e a janela "Atender com estoque da Loja…".',
    'Compare o "◈ saldo em estoque" exibido com a quantidade lançada no inventário mais recente, descontando atendimentos por estoque feitos depois dele.'],
   'O saldo bate com a última contagem menos os consumos posteriores; a cor do alerta corresponde à cobertura da quantidade pedida.'],
]},
{ mod: 'Módulo 7 — Cotações (Loja decide; Fornecedor propõe)', intro: 'Valida o ciclo completo de cotação: convite, propostas sigilosas por item, lembretes, decisão para o processo inteiro ou adjudicação item a item e cancelamento.', casos: [
  ['CT-060', 'Fornecedor envia proposta com preço por item', 'Fornecedor',
   'Cotação aberta com o fornecedor convidado (CT-044 ou COT semeada).',
   ['Entre como Fornecedor e abra "Cotações convidadas".',
    'No cartão da cotação "Aguardando propostas", clique em "Enviar proposta…".',
    'Informe o "Preço unitário por item (R$)" de todos os itens, o "Prazo de entrega" (ex.: 5 dias úteis), a "Validade da proposta" e as "Condições comerciais".',
    'Clique em "Enviar proposta".'],
   'O "Total da proposta" é calculado automaticamente ao digitar os preços; após enviar, o cartão mostra o valor em "Minha proposta" e o botão muda para "Editar proposta…".'],
  ['CT-061', 'Sigilo entre concorrentes', 'Fornecedor',
   'Duas propostas de fornecedores diferentes na mesma cotação (use a COT semeada com propostas).',
   ['Logado como Fornecedor, abra a cotação e procure por valores de outros fornecedores.'],
   'O fornecedor vê somente a própria proposta — em nenhum lugar aparecem os valores dos concorrentes.'],
  ['CT-062', 'Lembrete aos convidados', 'Loja',
   'Cotação "Aguardando propostas" com convidado sem proposta.',
   ['Como Loja, abra o detalhe da cotação e acione o envio de lembrete ao(s) convidado(s) pendente(s).'],
   'O lembrete é registrado no histórico da cotação (e o e-mail é enviado, com SMTP ativo).'],
  ['CT-063', 'Escolher a proposta vencedora (processo inteiro)', 'Loja',
   'Cotação com 2+ propostas completas.',
   ['No detalhe da cotação, escolha uma proposta como vencedora para todos os itens.',
    'Se a escolhida NÃO for a de menor preço, preencha a justificativa solicitada pela janela de confirmação.'],
   'A cotação encerra com o vencedor definido; os itens do pedido de origem passam a "No fornecedor" (envio direto ao vencedor); a justificativa fica registrada quando aplicável; os participantes são notificados (com SMTP ativo).'],
  ['CT-064', 'Adjudicar item a item (vencedores diferentes)', 'Loja',
   'Nova cotação com 2+ itens e 2+ propostas (repita CT-044/CT-060 se necessário).',
   ['No detalhe da cotação, adjudique o primeiro item a um fornecedor e o segundo item a outro, usando a decisão por item.',
    'Justifique quando a escolha do item não for o menor preço.'],
   'Cada item registra seu próprio vencedor ("Você venceu X de Y item(ns)" na visão do fornecedor); os itens do pedido são encaminhados aos respectivos vencedores.'],
  ['CT-065', 'Cancelar cotação com motivo', 'Loja',
   'Uma cotação aberta que possa ser cancelada.',
   ['No detalhe da cotação, acione o cancelamento e informe o motivo "Teste UAT — cancelamento".'],
   'A cotação fica "Cancelada" com o motivo registrado; os itens vinculados retornam para "Aprovado" no pedido, podendo seguir outro caminho.'],
]},
{ mod: 'Módulo 8 — Faturamento com documento fiscal obrigatório e análise por IA', intro: 'Valida o registro de faturamento pelo fornecedor: anexo fiscal obrigatório (PDF/XML), análise automática que aceita ou recusa o documento como evidência, flag do administrador e royalty automático. Use os arquivos do Anexo A.', casos: [
  ['CT-070', 'Bloqueio sem anexo fiscal', 'Fornecedor',
   'Pedido encaminhado ao fornecedor (CT-042/CT-063).',
   ['Entre como Fornecedor, abra "Pedidos recebidos" e clique em "Registrar faturamento…" no pedido encaminhado.',
    'Confira o valor sugerido em "Valor efetivamente faturado (R$)".',
    'SEM anexar arquivo, clique em "Confirmar faturamento".'],
   'O registro é bloqueado com a mensagem de que o anexo do documento fiscal (PDF ou XML) é obrigatório.'],
  ['CT-071', 'Documento incompatível é recusado pela análise', 'Fornecedor',
   'Flag "Análise fiscal (IA)" HABILITADA (padrão); arquivo "nfe-incompativel.xml" do Anexo A salvo no computador.',
   ['Na mesma janela, anexe o arquivo "nfe-incompativel.xml" no campo "Documento fiscal emitido à revenda (PDF ou XML) — obrigatório".',
    'Clique em "Confirmar faturamento" e aguarde a análise ("Enviando e analisando o documento fiscal…").'],
   'O documento é RECUSADO como evidência: a janela exibe em vermelho "Documento recusado como evidência:" com o motivo detalhado (destinatário/valor divergentes) e o faturamento NÃO é registrado.'],
  ['CT-072', 'Documento compatível é aceito e o faturamento registrado', 'Fornecedor',
   'Arquivo "nfe-compativel.xml" do Anexo A ajustado ao pedido em teste (CNPJs, itens e valor).',
   ['Anexe o arquivo "nfe-compativel.xml" e clique em "Confirmar faturamento".',
    'Abra "Meus faturamentos".'],
   'A análise aceita o documento, a janela fecha e a nota aparece em "Meus faturamentos" com: valor, royalty calculado automaticamente pelo percentual do contrato, link "📎 documento fiscal" e o selo "✓ validado por análise local" (ou "por IA Claude", conforme o motor configurado no servidor).'],
  ['CT-073', 'Download do anexo nas duas visões', 'Fornecedor e Loja',
   'CT-072 executado.',
   ['Em "Meus faturamentos" (Fornecedor), clique no link "📎 documento fiscal" da nota.',
    'Entre como Loja, abra "Faturamento" e clique no mesmo link na linha da nota.'],
   'Nas duas telas o arquivo anexado baixa/abre íntegro, idêntico ao enviado. A Loja também vê o selo da análise, e o motivo completo aparece ao passar o mouse sobre o selo.'],
  ['CT-074', 'Flag do administrador desliga a análise (anexo continua obrigatório)', 'Administrador + Fornecedor',
   'Novo pedido encaminhado ao fornecedor para faturar.',
   ['Como Administrador, abra "Configurações Técnicas" → "Análise fiscal (IA)" e DESLIGUE o interruptor.',
    'Confira o texto de estado ("Análise do documento fiscal desativada") e o "Motor de análise" exibido.',
    'Como Fornecedor, registre um novo faturamento: primeiro tente sem anexo; depois anexe qualquer XML e confirme.'],
   'Sem anexo o registro continua bloqueado (o anexo é sempre obrigatório). Com o flag desligado, o documento é aceito sem verificação e a nota aparece SEM selo de análise. A alteração do flag fica na auditoria. (Religue o flag ao final.)'],
]},
{ mod: 'Módulo 9 — Royalties e fechamento mensal', intro: 'Valida o cálculo do royalty por faturamento, a consolidação por competência/fornecedor, a cobrança com vencimento, o controle de atraso com lembrete, o registro de pagamento e a exportação.', casos: [
  ['CT-080', 'Cálculo automático e composição do fechamento', 'Loja',
   'Faturamentos registrados (semeados e/ou do Módulo 8).',
   ['Abra "Royalties & Fechamento" e localize um fechamento.',
    'Clique no nome do fornecedor ("ver extrato ▾") para abrir a "Composição do fechamento".',
    'Confira, nota a nota, a conta exibida (valor × percentual = royalty) e compare a soma com o "Royalty devido" da linha.'],
   'Cada nota mostra valor faturado × % do contrato = royalty, e a soma das notas bate com o total consolidado do fornecedor na competência.'],
  ['CT-081', 'Emitir documento de cobrança com vencimento', 'Loja',
   'Fechamento com status "A pagar" e sem cobrança emitida.',
   ['Na linha do fechamento, clique em "Gerar cobrança…".',
    'Confira o documento (número COB-AAAAMM-NN, fornecedor, competência, notas e "Total devido").',
    'Ajuste o campo de "Vencimento" se desejar (vem sugerido o dia 10 do mês seguinte) e clique em "Emitir e notificar fornecedor".'],
   'A cobrança é emitida: a linha passa a mostrar o número do documento, a data de emissão e "Vence em [data]"; o fornecedor é notificado por e-mail (com SMTP ativo) com documento, valor e vencimento.'],
  ['CT-082', 'Status "Em atraso" automático após o vencimento', 'Loja',
   'Para testar de imediato: emita uma cobrança informando um vencimento no PASSADO (ex.: ontem).',
   ['Emita a cobrança com vencimento anterior à data de hoje (conforme pré-condição).',
    'Observe a linha do fechamento e os indicadores do topo.'],
   'O status muda automaticamente para "Em atraso", com o texto vermelho "Venceu em [data] · N dia(s) de atraso"; o KPI "Em atraso" contabiliza o fechamento; o fornecedor também vê o atraso em "Royalties devidos".'],
  ['CT-083', 'Lembrete de atraso ao fornecedor', 'Loja',
   'Fechamento "Em atraso" (CT-082 ou o semeado 06/2026 da Serra Verde).',
   ['Na linha em atraso, clique no botão vermelho "Lembrete de atraso".'],
   'A linha registra "Lembrete de atraso enviado em [hoje]"; o e-mail de cobrança vencida é enviado ao fornecedor (com SMTP ativo) e o evento entra na auditoria com severidade alerta.'],
  ['CT-084', 'Registrar pagamento (com e sem atraso)', 'Loja',
   'Fechamento em aberto com cobrança emitida.',
   ['Clique em "Registrar pagamento…" e confira o quadro com "Royalty devido" e "Vencimento".',
    'Confirme a data (hoje), o valor sugerido e informe o comprovante "PIX-UAT-001"; conclua em "Registrar pagamento".'],
   'O fechamento passa a "Pago" com "Pago em [data] · comprovante PIX-UAT-001". Se a data do pagamento for posterior ao vencimento, aparece também a marcação "pago com atraso". A barra de progresso da competência e os KPIs atualizam.'],
  ['CT-085', 'Filtros e exportação XLSX do fechamento', 'Loja',
   'Fechamentos em vários status.',
   ['Use os filtros de competência, fornecedor e status (ex.: status "Em atraso") e observe os blocos.',
    'Clique em "⬇ Exportar XLSX" e abra o arquivo baixado.'],
   'Os blocos respeitam os filtros (com mensagem própria quando nada é encontrado). O Excel baixa com o recorte filtrado e as colunas de competência, fornecedor, CNPJ, %, notas, totais, status, vencimento, cobrança, lembrete, pagamento e comprovante.'],
  ['CT-086', 'Visão do fornecedor (Royalties devidos)', 'Fornecedor',
   'Fechamentos do fornecedor em vários status.',
   ['Entre como Fornecedor e abra "Royalties devidos".',
    'Confira as colunas Competência, Faturado, Royalty devido, Vencimento e Status.'],
   'O fornecedor vê seus fechamentos com o número do documento de cobrança, vencimento (em vermelho com dias de atraso quando vencido) e status corretos — sem acesso às telas da Loja.'],
]},
{ mod: 'Módulo 10 — Relatórios e painéis (Loja)', intro: 'Valida o painel gerencial: KPIs, gráficos, rankings, funil e exportações respondendo aos filtros.', casos: [
  ['CT-090', 'KPIs e filtros combinados', 'Loja',
   'Base com pedidos/faturamentos (semeada).',
   ['Abra "Relatórios".',
    'Aplique filtros de competência, revenda, fornecedor e status, em combinações diferentes.',
    'Observe KPIs, gráficos, rankings e funil a cada mudança.'],
   'Todos os blocos recalculam imediatamente a cada filtro; os números são coerentes entre si (ex.: o funil bate com a lista filtrada de pedidos).'],
  ['CT-091', 'Exportações do painel', 'Loja',
   'Permissão "Exportar relatórios (CSV)" ativa.',
   ['Use os botões de exportação disponíveis nos blocos do painel (ex.: relatório de pedidos).',
    'Abra os arquivos baixados no Excel.'],
   'Os arquivos baixam e abrem corretamente, com acentuação certa e os mesmos dados filtrados exibidos na tela.'],
]},
{ mod: 'Módulo 11 — Configurações técnicas (Administrador)', intro: 'Valida a configuração de e-mail SMTP com envio real e a tela do flag de análise fiscal.', casos: [
  ['CT-100', 'Configurar SMTP, verificar conexão e enviar teste', 'Administrador',
   'Dados de um servidor SMTP válido (host, porta, usuário, senha).',
   ['Abra "Configurações Técnicas" → "Configuração de e-mail".',
    'Preencha servidor, porta, segurança, usuário, senha, nome/e-mail do remetente e o e-mail interno da Loja.',
    'Clique em "Salvar configurações" e depois em "Verificar conexão".',
    'Em "Enviar e-mail de teste", informe seu e-mail e clique em "Enviar teste".',
    'Ative o interruptor "Envio de e-mails".'],
   '"Verificar conexão" confirma o acesso ao servidor; o e-mail de teste chega na caixa informada com o modelo visual da plataforma; com o envio ativado, os fluxos passam a disparar e-mails automáticos.'],
  ['CT-101', 'E-mails automáticos nos fluxos de negócio', 'Todos',
   'CT-100 executado com envio ATIVADO; caixas de e-mail das partes acessíveis.',
   ['Execute um ciclo: revenda cria pedido → Loja aprova → envio direto → fornecedor fatura (com anexo válido) → Loja emite cobrança de royalty.',
    'Verifique as caixas de e-mail da Loja, do fornecedor e da revenda a cada etapa.'],
   'Cada evento gera o e-mail correto ao destinatário certo, com modelo próprio e a lista dos itens envolvidos; e-mails para a revenda não expõem preços de catálogo (apenas valores faturados/negociados).'],
  ['CT-102', 'Tela do flag de análise fiscal', 'Administrador',
   'Nenhuma.',
   ['Abra "Configurações Técnicas" → "Análise fiscal (IA)".',
    'Leia o estado do interruptor, o quadro explicativo e o "Motor de análise" informado.'],
   'A tela informa corretamente se a análise está ativada/desativada e qual motor está em uso ("IA Claude (API Anthropic)" quando a chave está configurada no servidor; caso contrário, o analisador local). O comportamento do flag foi validado no CT-074.'],
]},
{ mod: 'Módulo 12 — Segurança e auditoria (Loja/Administrador)', intro: 'Valida a trilha de auditoria: eventos de negócio e de segurança, classificação por módulo e severidade, filtros, busca e exportação.', casos: [
  ['CT-110', 'KPIs e trilha completa', 'Loja',
   'Ações dos módulos anteriores executadas.',
   ['Abra "Gestão" → "Segurança & Auditoria".',
    'Confira os cartões "Eventos registrados", "Eventos hoje", "Alertas e críticos" e "Usuários no log".',
    'Percorra a tabela observando data/hora, usuário (com papel), chip de módulo, severidade, operação e detalhe.'],
   'Os eventos das ações realizadas aparecem classificados por módulo (chips coloridos) e severidade (info/alerta/crítico), com quem fez cada ação. "Carregar mais eventos" pagina a lista.'],
  ['CT-111', 'Eventos de segurança na trilha', 'Loja',
   'CT-002 (senha errada) e CT-005 (logout) executados.',
   ['Na auditoria, busque por "Falha de login" e confira o e-mail tentado e o motivo no detalhe.',
    'Busque por "Logout realizado".'],
   'A falha de login aparece com severidade crítica, registrando o e-mail tentado e o motivo ("senha incorreta"); o logout aparece como evento de Segurança.'],
  ['CT-112', 'Filtros, busca e contador', 'Loja',
   'Trilha com eventos variados.',
   ['Filtre por severidade "Crítico" e depois por módulo "Royalties"; use também o período "Hoje".',
    'Use a busca textual (ex.: "cobrança") e observe o contador "Mostrando X de Y evento(s)".',
    'Clique em "✕ Limpar filtros".'],
   'Cada filtro/busca restringe a lista corretamente, o contador reflete o recorte e "Limpar filtros" restaura a trilha completa.'],
  ['CT-113', 'Exportar a trilha em XLSX', 'Loja',
   'Permissão "Exportar trilha de auditoria (XLSX)" ativa.',
   ['Aplique um filtro qualquer e clique em "⬇ Exportar XLSX"; abra o arquivo.'],
   'O Excel baixa com o recorte filtrado (colunas de data/hora, usuário, e-mail, papel, módulo, severidade, operação e detalhe) e a própria exportação aparece como novo evento na trilha.'],
]},
{ mod: 'Módulo 13 — Ajuda em vídeo por rotina', intro: 'Valida o tutorial em vídeo disponível em todas as telas: reprodução com imagem real da tela, destaque do elemento de cada passo e texto de apoio.', casos: [
  ['CT-120', 'Tutorial em vídeo em uma tela da Loja', 'Loja',
   'Nenhuma.',
   ['Em qualquer tela (ex.: "Royalties & Fechamento"), clique no botão escuro de ajuda no topo (ícone de vídeo).',
    'Clique em "Reproduzir guia" e assista alguns passos.',
    'Use as setas do teclado (→ e ←) para navegar entre passos e clique em um passo específico da lista.',
    'Leia as "Dicas" ao final e feche com "×" ou Esc.'],
   'O guia abre com a imagem real da tela; a cada passo a "câmera" enquadra e DESTACA (pulso + escurecimento ao redor) o elemento correspondente; o texto do passo e as dicas correspondem à tela; a navegação por teclado e clique funciona.'],
  ['CT-121', 'Cobertura da ajuda em todos os perfis', 'Todos',
   'Nenhuma.',
   ['Percorra as telas dos quatro perfis (Loja, Fornecedor, Revenda e as telas do Administrador) verificando a presença do botão de ajuda.',
    'Abra o tutorial em 2–3 telas de cada perfil.'],
   'Todas as rotinas têm o botão de ajuda com conteúdo específico da tela (não genérico), incluindo as telas novas (Inventário, Análise fiscal, Usuários, Auditoria).'],
]},
{ mod: 'Módulo 14 — Persistência e recuperação', intro: 'Valida que os dados sobrevivem a recargas de página e reinícios da aplicação (persistência real em PostgreSQL).', casos: [
  ['CT-125', 'Dados sobrevivem ao recarregar a página (F5)', 'Loja',
   'Ações dos módulos anteriores executadas.',
   ['Após criar/aprovar registros, pressione F5 no navegador e faça login novamente se necessário.',
    'Confira pedidos, faturamentos, royalties e auditoria.'],
   'Nada se perde: todos os registros e status continuam exatamente como antes da recarga.'],
  ['CT-126', 'Dados sobrevivem ao reinício da aplicação', 'Equipe técnica',
   'Acesso SSH à VPS.',
   ['Na VPS, execute "pm2 restart cidade-imperial".',
    'Aguarde ~10 segundos, recarregue o navegador e entre novamente.'],
   'A aplicação volta sozinha (PM2) e todos os dados permanecem (persistência no PostgreSQL) — pedidos, anexos fiscais, royalties, usuários e auditoria intactos.'],
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

const NOTAS_XML = 'IMPORTANTE: ajuste o arquivo "nfe-compativel.xml" ao pedido que você estiver faturando — o emitente deve ser o fornecedor logado, o destinatário deve ser a revenda do pedido, os itens (xProd/qCom/vProd) devem corresponder aos itens encaminhados e o vNF deve ser igual ao "Valor efetivamente faturado". Para o arquivo "nfe-incompativel.xml", copie o compatível e troque o CNPJ/nome do destinatário por outros (ex.: 99888777000166 / Mercadinho Sao Jorge) e o vNF por um valor bem diferente (ex.: 9999.00). CNPJs dos dados de demonstração: Serra Verde 12.345.678/0001-90 · Imperial Bebidas 98.765.432/0001-10 · Bar do Imperador 11.111.222/0001-33 · Empório Colonial 22.333.444/0001-55.'

const totalCasos = MODULOS.reduce((a, m) => a + m.casos.length, 0)

// ─────────────────────────────────────────────────────────────────────────────
// PDF
// ─────────────────────────────────────────────────────────────────────────────
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
  .linha ol { margin:3px 0 2px 18px; }
  .linha li { margin:2.5px 0; }
  .esperado { font-size:11px; color:#2f4b33; line-height:1.5; background:#eef5ef; border-left:3px solid #2f6b39; border-radius:0 7px 7px 0; padding:6px 10px; margin:6px 0; }
  .reg { width:100%; border-collapse:collapse; margin-top:6px; font-size:10px; color:#6b6459; }
  .reg td { border:1px solid #e5ddcd; padding:5px 8px; }
  .obs { display:block; height:22px; }
  .tbl { width:100%; border-collapse:collapse; margin:8px 0; font-size:10.5px; }
  .tbl th { text-align:left; background:#272525; color:#e3bf7e; padding:6px 8px; font-size:9.5px; text-transform:uppercase; letter-spacing:.05em; }
  .tbl td { padding:5px 8px; border-bottom:1px solid #eee7d8; color:#4a453d; }
  .tbl tr:nth-child(even) td { background:#faf7f0; }
  p { font-size:11.5px; color:#4a453d; line-height:1.55; margin:6px 0; }
  .bloco { border:1px solid #eae3d6; border-radius:10px; background:#fffdf9; padding:11px 13px; margin:10px 0; break-inside:avoid; }
  .bloco h3 { margin-bottom:4px; }
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
  <div style="position:absolute;left:16mm;right:16mm;top:82mm">
    <div style="font-size:13px;font-weight:700;letter-spacing:.18em;color:#e3bf7e;margin-bottom:12px">QUALIDADE · HOMOLOGAÇÃO PELO USUÁRIO FINAL</div>
    <div style="font-size:40px;font-weight:800;color:#fff;line-height:1.1;letter-spacing:-.5px">Roteiro de Testes<br>de Aceitação (UAT)</div>
    <div style="font-size:14.5px;color:#c9c1b4;margin-top:16px;line-height:1.6;max-width:155mm">${totalCasos} casos de teste em 14 módulos, cobrindo toda a jornada: acesso e permissões, catálogo e pedidos, aprovação e atendimento por item/quantidade, inventário, cotações, faturamento com documento fiscal e análise por IA, royalties com controle de atraso, relatórios, configurações, auditoria e ajuda em vídeo.</div>
    <div style="margin-top:20px;display:inline-block;background:#ffffff14;border:1px solid #e3bf7e55;border-radius:10px;padding:9px 15px;font-family:Consolas,monospace;font-size:12px;color:#e3bf7e">${URL_HML}</div>
  </div>
  <div style="position:absolute;left:16mm;bottom:40mm;right:16mm;display:flex;gap:8px;flex-wrap:wrap">
    ${MODULOS.map((m) => `<div style="background:#ffffff10;border:1px solid #ffffff22;border-radius:8px;padding:6px 10px;font-size:9.5px;color:#e8e2d6">${esc(m.mod.replace(/Módulo \d+ — /, ''))}</div>`).join('')}
  </div>
  <div style="position:absolute;left:16mm;bottom:18mm;font-size:10px;color:#8a8378">Julho de 2026 · Documento para preenchimento pelo usuário final durante a homologação</div>
</div>

<div class="miolo">
  <div class="sec-title">1 · INSTRUÇÕES AO TESTADOR</div>
  <div class="bloco">
    <p><b>Objetivo.</b> Este roteiro orienta a homologação da Plataforma Cidade Imperial pelo usuário final. Cada caso de teste (CT) traz o perfil que o executa, as pré-condições, os passos numerados e o resultado esperado. Execute os casos <b>na ordem</b>, pois vários deles preparam dados para os seguintes.</p>
    <p><b>Como registrar.</b> Ao final de cada caso, marque <b>Aprovado</b> (comportamento igual ao esperado), <b>Reprovado</b> (comportamento diferente — descreva nas observações o que ocorreu, com prints se possível) ou <b>Bloqueado</b> (não foi possível executar por dependência/ambiente). Preencha testador e data.</p>
    <p><b>Critério de aceite sugerido.</b> 100% dos casos executados; nenhum caso crítico reprovado (Módulos 1, 3, 4, 5, 8 e 9); reprovações não críticas listadas com plano de correção. O aceite final é formalizado na seção 5.</p>
    <p><b>Ambiente.</b> ${URL_HML} — ambiente de homologação com dados de demonstração. Evite testar em produção. Para repetir o roteiro do zero, a equipe técnica pode recriar o banco de homologação.</p>
  </div>

  <div class="sec-title">2 · ACESSOS DE DEMONSTRAÇÃO</div>
  <table class="tbl"><tr><th>Perfil</th><th>E-mail (login)</th><th>Senha</th><th>Observação</th></tr>
    ${ACESSOS.map((a) => `<tr><td><b>${esc(a[0])}</b></td><td class="mono">${esc(a[1])}</td><td class="mono">${esc(a[2])}</td><td>${esc(a[3])}</td></tr>`).join('')}
  </table>

  <div class="sec-title">3 · CASOS DE TESTE</div>
  ${MODULOS.map((m) => `<h2 class="mod">${esc(m.mod)}</h2><div class="mod-intro">${esc(m.intro)}</div>${m.casos.map(casoHtml).join('')}`).join('')}

  <div class="sec-title">4 · ANEXO A — ARQUIVOS DE TESTE DO DOCUMENTO FISCAL (MÓDULO 8)</div>
  <div class="bloco">
    <p>Crie no Bloco de Notas um arquivo <b>nfe-compativel.xml</b> com o conteúdo abaixo (salve com a extensão .xml):</p>
    <div class="code">${esc(XML_OK)}</div>
    <p style="margin-top:8px">${esc(NOTAS_XML)}</p>
  </div>

  <div class="sec-title">5 · RESUMO DA EXECUÇÃO E ACEITE</div>
  <table class="tbl"><tr><th style="width:14%">Caso</th><th>Título</th><th style="width:13%">Resultado</th><th style="width:26%">Observações</th></tr>
    ${MODULOS.flatMap((m) => m.casos).map((c) => `<tr><td class="mono">${esc(c[0])}</td><td>${esc(c[1])}</td><td></td><td></td></tr>`).join('')}
  </table>
  <div class="bloco" style="margin-top:12px">
    <p><b>Totais:</b> Executados: ______ / ${totalCasos} &nbsp;·&nbsp; Aprovados: ______ &nbsp;·&nbsp; Reprovados: ______ &nbsp;·&nbsp; Bloqueados: ______</p>
    <p style="margin-top:10px"><b>Parecer final:</b> ☐ Aprovado sem ressalvas &nbsp;&nbsp; ☐ Aprovado com ressalvas (listar) &nbsp;&nbsp; ☐ Reprovado</p>
    <p style="margin-top:16px">Responsável pela homologação: ______________________________________ &nbsp;&nbsp; Data: ____/____/______</p>
    <p style="margin-top:10px">Assinatura: ______________________________________</p>
  </div>
  <div style="display:flex;justify-content:space-between;font-size:9px;color:#a89f90;border-top:1px solid #eae3d6;padding-top:6px;margin-top:8px">
    <span>Plataforma Cidade Imperial — Roteiro de Testes de Aceitação (UAT) · ${totalCasos} casos</span><span>julho/2026</span>
  </div>
</div>
</body></html>`

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' })
const page = await browser.newPage()
await page.setContent(htmlPdf, { waitUntil: 'networkidle' })
await page.pdf({ path: OUT_PDF, format: 'A4', printBackground: true, margin: { top: 0, bottom: 0, left: 0, right: 0 } })
await browser.close()
console.log('PDF ok:', OUT_PDF)

// ─────────────────────────────────────────────────────────────────────────────
// DOCX
// ─────────────────────────────────────────────────────────────────────────────
const P = (txt, opts = {}) => new Paragraph({
  children: [new TextRun({ text: txt, size: opts.size || 21, bold: !!opts.bold, color: opts.color || '3A362E', font: 'Calibri' })],
  spacing: { after: opts.after ?? 90, before: opts.before ?? 0 }, alignment: opts.align,
})
const Prich = (runs, opts = {}) => new Paragraph({
  children: runs.map((r) => new TextRun({ font: 'Calibri', size: 21, color: '3A362E', ...r })),
  spacing: { after: opts.after ?? 90 }, bullet: opts.bullet, numbering: opts.numbering,
})
const noBorder = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }
const cellB = { top: { style: BorderStyle.SINGLE, size: 4, color: 'E5DDCD' }, bottom: { style: BorderStyle.SINGLE, size: 4, color: 'E5DDCD' }, left: { style: BorderStyle.SINGLE, size: 4, color: 'E5DDCD' }, right: { style: BorderStyle.SINGLE, size: 4, color: 'E5DDCD' } }
const cell = (children, opts = {}) => new TableCell({ children, borders: cellB, shading: opts.fill ? { type: ShadingType.SOLID, color: opts.fill, fill: opts.fill } : undefined, width: opts.w ? { size: opts.w, type: WidthType.PERCENTAGE } : undefined, columnSpan: opts.span, margins: { top: 60, bottom: 60, left: 100, right: 100 } })
const headCell = (t, w) => cell([P(t, { bold: true, color: 'E3BF7E', size: 19 })], { fill: DARK, w })

const filhos = []
// Capa
filhos.push(P('CIDADE IMPERIAL · PLATAFORMA DA LOJA', { bold: true, color: GOLD, size: 22, before: 200 }))
filhos.push(new Paragraph({ children: [new TextRun({ text: 'Roteiro de Testes de Aceitação (UAT)', bold: true, size: 56, color: DARK, font: 'Calibri' })], spacing: { after: 160 } }))
filhos.push(P(`Homologação pelo usuário final · ${totalCasos} casos de teste em 14 módulos`, { size: 26, color: GREY, after: 60 }))
filhos.push(P(`Ambiente: ${URL_HML}`, { size: 22, color: GREY, after: 60 }))
filhos.push(P('Julho de 2026', { size: 22, color: GREY, after: 300 }))

// 1. Instruções
filhos.push(new Paragraph({ text: '1. Instruções ao testador', heading: HeadingLevel.HEADING_1 }))
;[['Objetivo', 'Este roteiro orienta a homologação da Plataforma Cidade Imperial pelo usuário final. Cada caso de teste (CT) traz o perfil que o executa, as pré-condições, os passos numerados e o resultado esperado. Execute os casos na ordem, pois vários deles preparam dados para os seguintes.'],
  ['Como registrar', 'Ao final de cada caso, marque Aprovado (comportamento igual ao esperado), Reprovado (comportamento diferente — descreva nas observações o que ocorreu, com capturas de tela se possível) ou Bloqueado (não foi possível executar por dependência ou ambiente). Preencha testador e data.'],
  ['Critério de aceite sugerido', '100% dos casos executados; nenhum caso crítico reprovado (Módulos 1, 3, 4, 5, 8 e 9); reprovações não críticas listadas com plano de correção. O aceite final é formalizado na seção 5.'],
  ['Ambiente', `${URL_HML} — ambiente de homologação com dados de demonstração. Evite testar em produção. Para repetir o roteiro do zero, a equipe técnica pode recriar o banco de homologação.`],
].forEach(([t, d]) => filhos.push(Prich([{ text: t + '. ', bold: true }, { text: d }])))

// 2. Acessos
filhos.push(new Paragraph({ text: '2. Acessos de demonstração', heading: HeadingLevel.HEADING_1 }))
filhos.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [
  new TableRow({ children: [headCell('Perfil', 20), headCell('E-mail (login)', 30), headCell('Senha', 12), headCell('Observação', 38)] }),
  ...ACESSOS.map((a) => new TableRow({ children: [cell([P(a[0], { bold: true })]), cell([P(a[1])]), cell([P(a[2])]), cell([P(a[3], { size: 19 })])] })),
] }))

// 3. Casos por módulo
filhos.push(new Paragraph({ text: '3. Casos de teste', heading: HeadingLevel.HEADING_1 }))
for (const m of MODULOS) {
  filhos.push(new Paragraph({ text: m.mod, heading: HeadingLevel.HEADING_2 }))
  filhos.push(P(m.intro, { color: GREY, after: 140 }))
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
        cell([P('Resultado:  ☐ Aprovado    ☐ Reprovado    ☐ Bloqueado', { size: 19 })], { w: 40, fill: CREAM }),
        cell([P('Testador: ____________________', { size: 19 })], { w: 32, fill: CREAM }),
        cell([P('Data: ____/____/______', { size: 19 })], { w: 28, fill: CREAM })] }),
      new TableRow({ children: [cell([P('Observações / evidências:', { size: 19, bold: true }), P(' ', { after: 160 })], { span: 3 })] }),
    ] }))
    filhos.push(P(' ', { after: 40 }))
  }
}

// 4. Anexo A
filhos.push(new Paragraph({ text: '4. Anexo A — arquivos de teste do documento fiscal (Módulo 8)', heading: HeadingLevel.HEADING_1 }))
filhos.push(P('Crie no Bloco de Notas um arquivo nfe-compativel.xml com o conteúdo abaixo (salve com a extensão .xml):'))
XML_OK.split('\n').forEach((l) => filhos.push(new Paragraph({ children: [new TextRun({ text: l, font: 'Consolas', size: 17, color: '3A362E' })], shading: { type: ShadingType.SOLID, color: 'F4F1EA', fill: 'F4F1EA' }, spacing: { after: 0 } })))
filhos.push(P(NOTAS_XML, { size: 19, color: GREY, before: 140 }))

// 5. Resumo e aceite
filhos.push(new Paragraph({ text: '5. Resumo da execução e aceite', heading: HeadingLevel.HEADING_1 }))
filhos.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [
  new TableRow({ children: [headCell('Caso', 12), headCell('Título', 49), headCell('Resultado', 13), headCell('Observações', 26)] }),
  ...MODULOS.flatMap((m) => m.casos).map((c) => new TableRow({ children: [cell([P(c[0], { size: 18 })]), cell([P(c[1], { size: 18 })]), cell([P(' ')]), cell([P(' ')])] })),
] }))
filhos.push(P(`Totais — Executados: ______ / ${totalCasos}   ·   Aprovados: ______   ·   Reprovados: ______   ·   Bloqueados: ______`, { before: 220, bold: true }))
filhos.push(P('Parecer final:  ☐ Aprovado sem ressalvas     ☐ Aprovado com ressalvas (listar)     ☐ Reprovado', { before: 120 }))
filhos.push(P('Responsável pela homologação: ______________________________________________     Data: ____/____/______', { before: 220 }))
filhos.push(P('Assinatura: ______________________________________________', { before: 120 }))

const doc = new Document({
  styles: { paragraphStyles: [
    { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
      run: { size: 32, bold: true, color: DARK, font: 'Calibri' }, paragraph: { spacing: { before: 340, after: 140 } } },
    { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
      run: { size: 26, bold: true, color: GOLD, font: 'Calibri' }, paragraph: { spacing: { before: 280, after: 100 } } },
  ] },
  sections: [{ properties: { page: { margin: { top: 1000, bottom: 1000, left: 1100, right: 1100 } } }, children: filhos }],
})
writeFileSync(OUT_DOCX, await Packer.toBuffer(doc))
console.log('DOCX ok:', OUT_DOCX, '· casos:', totalCasos)
