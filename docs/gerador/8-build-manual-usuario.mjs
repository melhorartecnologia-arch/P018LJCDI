// Gera o Manual do Usuário completo (PDF + Word) com capturas reais das telas.
// Rode a partir de docs/gerador:  node 8-build-manual-usuario.mjs
// (as imagens vêm de docs/gerador/manual-shots — recapture com shots-manual quando a UI mudar)
import pw from '/opt/node22/lib/node_modules/playwright/index.js'
import { writeFileSync, readFileSync } from 'node:fs'
import {
  Document, Packer, Paragraph, TextRun, HeadingLevel, ImageRun,
  Table, TableRow, TableCell, WidthType, BorderStyle, ShadingType,
} from 'docx'
const { chromium } = pw

const OUT_PDF = '/home/user/P018LJCDI/docs/Plataforma-Cidade-Imperial-Manual-do-Usuario.pdf'
const OUT_DOCX = '/home/user/P018LJCDI/docs/Plataforma-Cidade-Imperial-Manual-do-Usuario.docx'
const IMGDIR = '/home/user/P018LJCDI/docs/gerador/manual-shots'
const URL_HML = 'https://lojacidadeimperialhml.cervejariacidadeimperial.com'
const GOLD = 'B38335', DARK = '272525', GREY = '6B6459'

const ACESSOS = [
  ['Administrador Técnico', 'admin@cidadeimperial.com.br', 'admin123'],
  ['Loja (gestora)', 'ana@cidadeimperial.com.br', 'loja123'],
  ['Loja (analista restrito)', 'carlos@cidadeimperial.com.br', 'loja123'],
  ['Fornecedor (Serra Verde)', 'comercial@serraverde.com.br', 'forn123'],
  ['Revenda (Bar do Imperador)', 'compras@bardoimperador.com.br', 'rev123'],
]

const STATUS = [
  ['Pedido', 'Pendente', 'Aguardando a análise da Loja.'],
  ['Pedido', 'Aprovado', 'Itens aprovados, aguardando a decisão de atendimento.'],
  ['Pedido', 'Em cotação', 'Um ou mais itens estão em concorrência entre fornecedores.'],
  ['Pedido', 'Encaminhado', 'Itens enviados diretamente a um fornecedor, aguardando faturamento.'],
  ['Pedido', 'Atendido (estoque)', 'Itens atendidos com o estoque próprio da Loja.'],
  ['Pedido', 'Faturado', 'Fornecedor emitiu a nota diretamente à revenda.'],
  ['Pedido', 'Rejeitado', 'Recusado pela Loja (com justificativa registrada).'],
  ['Item do pedido', 'Estoque da Loja / No fornecedor / Em cotação', 'Cada item — e até parte da quantidade de um item — segue seu próprio caminho.'],
  ['Cotação', 'Aguardando propostas', 'Fornecedores convidados podem enviar/editar propostas até o prazo.'],
  ['Cotação', 'Encerrada', 'Vencedor definido (do processo inteiro ou item a item).'],
  ['Cotação', 'Cancelada', 'Cancelada pela Loja, com motivo; itens voltam a "Aprovado".'],
  ['Royalty', 'A pagar', 'Fechamento apurado, ainda sem pagamento.'],
  ['Royalty', 'Em atraso', 'Cobrança emitida passou do vencimento sem pagamento (automático).'],
  ['Royalty', 'Pago', 'Pagamento registrado (com data, valor e comprovante).'],
  ['Auditoria', 'info / alerta / crítico', 'Severidade do evento: rotina · atenção (rejeições, atrasos, recusas) · segurança e configurações.'],
]

const FAQ = [
  ['Esqueci minha senha. O que faço?', 'Peça ao Administrador Técnico para redefinir: em Configurações Técnicas › Usuários e permissões › Editar, ele informa uma nova senha para a sua conta.'],
  ['A revenda consegue ver os preços do catálogo?', 'Não — por regra de negócio, a revenda nunca vê o preço de referência dos produtos. Ela só conhece valores quando a Loja negocia (cotação) ou quando recebe o faturamento do fornecedor.'],
  ['Posso atender metade de um item pelo estoque e o resto por cotação?', 'Sim. Nas janelas de atendimento, o campo "Quantidade neste caminho" fraciona o item: a parte atendida segue o caminho escolhido e o saldo permanece "Aprovado" para outro caminho.'],
  ['Por que o faturamento exige anexo?', 'O PDF ou XML do documento fiscal emitido à revenda é a evidência do faturamento. Com a análise automática habilitada, a plataforma confere se o documento corresponde ao pedido (emitente, destinatário, itens e valor) e recusa anexos incompatíveis na hora.'],
  ['O que muda quando a análise fiscal está desligada?', 'O anexo continua obrigatório, mas é aceito sem verificação (a nota fica sem o selo de validação). O flag é controlado pelo administrador em Configurações Técnicas › Análise fiscal (IA).'],
  ['Como o status "Em atraso" dos royalties aparece?', 'Automaticamente: ao emitir a cobrança a Loja define um vencimento; passado o vencimento sem pagamento registrado, o fechamento vira "Em atraso" com a contagem de dias, e o botão "Lembrete de atraso" fica disponível.'],
  ['Os e-mails automáticos não estão chegando.', 'Verifique em Configurações Técnicas › Configuração de e-mail se o envio está ATIVADO e teste com "Verificar conexão" e "Enviar teste". Use porta 587 (STARTTLS) ou 465 (SSL) — provedores de nuvem costumam bloquear a porta 25.'],
  ['Um botão que eu usava sumiu.', 'Provavelmente sua permissão para aquela ação foi negada pelo administrador (permissões de granularidade fina por usuário). Fale com o Administrador Técnico.'],
  ['O guia "Como usar" abre pequeno demais.', 'Clique no botão ⤢ no topo do guia para maximizar: o vídeo cresce à esquerda e o passo a passo fica ao lado, com rolagem própria. O botão ⤡ restaura o tamanho original.'],
  ['O que acontece se eu recarregar a página (F5)?', 'Nada se perde — todos os dados ficam gravados no banco PostgreSQL do servidor. Basta entrar novamente.'],
]

// ─────────────────────────────────────────────────────────────────────────────
// CONTEÚDO — partes → seções {t, img, intro, topicos:[{t, passos[], nota}]}
// ─────────────────────────────────────────────────────────────────────────────
const PARTES = [
{ parte: 'Parte 1 — Primeiros passos', secoes: [
  { t: '1.1 O que é a Plataforma Cidade Imperial', intro: 'A plataforma é o portal B2B da Cervejaria Cidade Imperial: conecta a Loja (dona da plataforma), os Fornecedores homologados e as Revendas em um único fluxo — do catálogo ao royalty. A revenda pede; a Loja aprova e decide como atender cada item (estoque próprio, envio direto a um fornecedor ou cotação entre fornecedores); o fornecedor fatura diretamente à revenda anexando o documento fiscal (verificado por análise automática); e a Loja apura e cobra mensalmente o royalty de cada fornecedor. Todas as ações relevantes disparam e-mails automáticos e ficam registradas na trilha de auditoria.', topicos: [
    { t: 'Os quatro perfis de acesso', passos: [
      'Revenda — navega no catálogo homologado (sem ver preços), monta o carrinho e acompanha seus pedidos.',
      'Fornecedor — recebe pedidos encaminhados, responde cotações, registra faturamentos (com documento fiscal) e acompanha os royalties devidos.',
      'Loja Cidade Imperial — aprova pedidos, decide o atendimento item a item, conduz cotações, acompanha faturamentos, gerencia cadastros, inventário, royalties, relatórios e auditoria.',
      'Administrador Técnico — tudo da Loja + Configurações Técnicas: usuários e permissões, e-mail (SMTP) e o flag da análise fiscal por IA.'] },
  ] },
  { t: '1.2 Acessando a plataforma', img: 'login', intro: `Abra ${URL_HML} em um navegador atualizado (Chrome, Edge ou Firefox). A conexão é protegida por HTTPS (cadeado na barra de endereço).`, topicos: [
    { t: 'Como entrar', passos: [
      'Digite seu e-mail de acesso e a senha.',
      'Clique em "Entrar na plataforma".',
      'Em ambiente de demonstração/homologação, você pode clicar em um dos acessos listados abaixo do botão para preencher os campos automaticamente.'],
      nota: 'Mensagens de erro possíveis: "Senha incorreta." (senha errada — tentativas ficam registradas na auditoria), "Usuário não encontrado..." (e-mail não cadastrado) e "Usuário inativo..." (conta bloqueada pelo administrador).' },
    { t: 'Como sair', passos: ['Clique em "Sair" no canto superior direito. A sessão é encerrada e o logout fica registrado na auditoria.'] },
  ] },
  { t: '1.3 Conhecendo a interface', intro: 'A tela é dividida em três áreas: o menu lateral esquerdo (com os grupos de rotinas do seu perfil), a barra do topo (pendências, botão "Como usar", seu nome e o botão Sair) e a área de trabalho. As etiquetas coloridas (chips) indicam status em todas as listas — a tabela de referência da Parte 6 explica cada uma.', topicos: [
    { t: 'Dicas gerais de navegação', passos: [
      'Linhas de tabelas e cartões clicáveis abrem o detalhe do registro (ex.: clique num pedido para ver itens, trilha e ações).',
      'Fotos de produtos ampliam ao clicar (feche com × ou Esc; navegue com as setas).',
      'Campos de busca e filtros (selects) recalculam as listas na hora.',
      'Datas usam o formato dd/mm/aaaa; valores em reais (R$); competências em MM/AAAA.'] },
  ] },
  { t: '1.4 O guia "Como usar" (tutorial em vídeo de cada tela)', img: 'guia-como-usar', intro: 'Toda tela tem um botão escuro "Como usar" no topo, com um tutorial em formato de vídeo: a imagem real da tela é percorrida passo a passo, destacando com um pulso dourado o elemento exato de cada instrução, com o texto do passo, a lista completa do passo a passo e dicas.', topicos: [
    { t: 'Como usar o guia', passos: [
      'Clique no botão "Como usar" no topo da tela.',
      'Clique em "Reproduzir guia" para assistir — cada passo dura alguns segundos e o elemento correspondente é destacado na imagem.',
      'Navegue manualmente clicando em um passo da lista ou com as setas ← → do teclado.',
      'Clique em ⤢ (canto superior direito do guia) para MAXIMIZAR: o vídeo cresce à esquerda e o passo a passo passa a rolar ao lado — ideal para acompanhar lendo. ⤡ restaura o tamanho normal.',
      'Feche com × ou Esc.'] },
  ] },
] },
{ parte: 'Parte 2 — Guia da Revenda', secoes: [
  { t: '2.1 Catálogo de produtos e criação de pedidos', img: 'rev-catalogo', intro: 'O catálogo mostra somente os produtos homologados que a Loja liberou para a sua revenda (visibilidade por fornecedor e bloqueios por produto). Por regra comercial, os preços de referência NUNCA são exibidos — você conhecerá os valores quando a Loja negociar (cotação) ou quando receber o faturamento.', topicos: [
    { t: 'Como montar e enviar um pedido', passos: [
      'Use "Buscar produto…" para filtrar por nome ou código.',
      'Clique nas fotos para ampliá-las (setas navegam entre as fotos do produto).',
      'Ajuste a quantidade desejada de cada produto com os botões + e −.',
      'Confira o resumo do carrinho e conclua com o botão de enviar o pedido.',
      'O pedido recebe um número (PED-NNNN) e vai para a análise da Loja; você recebe um e-mail de confirmação (quando o envio de e-mails está ativo).'] },
  ] },
  { t: '2.2 Meus pedidos — acompanhamento', img: 'rev-pedidos', intro: 'A tela lista todos os seus pedidos com o status atualizado em tempo real, do envio à conclusão.', topicos: [
    { t: 'O que acompanhar', passos: [
      'Status: Pendente → Aprovado → (Em cotação / Encaminhado / Atendido) → Faturado; ou Rejeitado, com a justificativa da Loja.',
      'Itens rejeitados individualmente aparecem identificados com o motivo.',
      'Você é notificada por e-mail a cada mudança relevante (aprovação, rejeição, encaminhamento, atendimento pelo estoque e faturamento).'],
      nota: 'Os valores só aparecem para a revenda nos faturamentos — nunca o preço de catálogo.' },
  ] },
] },
{ parte: 'Parte 3 — Guia da Loja Cidade Imperial', secoes: [
  { t: '3.1 Painel geral', img: 'loja-painel', intro: 'A tela inicial da Loja reúne os indicadores da competência atual (pedidos pendentes, cotações em andamento, faturado no mês e royalties a receber), a faixa amarela de pendências com atalho "Analisar pedidos", os pedidos recentes e o faturamento por fornecedor.', topicos: [] },
  { t: '3.2 Pedidos — análise e aprovação', img: 'loja-pedidos', intro: 'A lista traz todos os pedidos das revendas com busca e filtros. Clique em um pedido para abrir o detalhe: itens com foto, quantidades, valores de referência, trilha completa e as ações de análise.', topicos: [
    { t: 'Aprovar ou rejeitar o pedido inteiro', passos: [
      'Abra o pedido pendente e localize o quadro "Análise da Loja".',
      'Clique em "Aprovar pedido" para aprovar todos os itens de uma vez; ou',
      'Clique em "Rejeitar…" e informe a justificativa (obrigatória) para recusar o pedido inteiro.'] },
    { t: 'Decidir item a item', passos: [
      'Na tabela de itens, use as ações da própria linha para aprovar ou rejeitar CADA item individualmente (rejeição pede justificativa).',
      'O status geral do pedido é derivado dos itens — um pedido pode ter itens aprovados e rejeitados ao mesmo tempo.'],
      nota: 'Tudo fica registrado na trilha do pedido (quem fez, o quê e quando) e a revenda é notificada por e-mail a cada decisão.' },
  ] },
  { t: '3.3 Atendimento — estoque, envio direto e cotação (com divisão de quantidades)', img: 'loja-pedido-detalhe', intro: 'Depois de aprovado, cada item precisa de um caminho de atendimento. O quadro "Decisão de atendimento — por item" oferece três: atender com o estoque da Loja, enviar direto a um fornecedor ou abrir cotação. Um mesmo pedido pode combinar os três — e um mesmo ITEM pode ter a quantidade dividida entre caminhos.', topicos: [
    { t: 'Atender com estoque da Loja', passos: [
      'Clique em "Atender com estoque da Loja…", selecione os itens e confirme.',
      'Ao lado de cada item aparece "◈ saldo em estoque: N" — o saldo do último inventário, em verde quando cobre a quantidade pedida, laranja/vermelho quando parcial ou zerado. Use essa informação para decidir.'] },
    { t: 'Enviar direto a um fornecedor', passos: [
      'Clique em "Envio direto a um fornecedor…", selecione os itens, escolha o fornecedor de destino e clique em "Encaminhar itens selecionados".',
      'O pedido aparece para o fornecedor em "Pedidos recebidos" e ele fatura diretamente à revenda.'] },
    { t: 'Dividir a quantidade de um item', passos: [
      'Em qualquer janela de atendimento, ajuste o campo "Quantidade neste caminho" (ex.: 4 de 10).',
      'A parte alocada segue o caminho escolhido; o SALDO permanece "Aprovado" e pode ser enviado por outro caminho (ex.: 4 pelo estoque, 3 direto, 3 em cotação).'] },
    { t: 'Abrir cotação', passos: [
      'Clique em "Abrir cotação (2+ fornecedores)…", selecione itens e quantidades, marque os fornecedores convidados (mínimo 2), defina o prazo e confirme.',
      'Os convidados são notificados por e-mail e a cotação aparece em "Cotações".'] },
  ] },
  { t: '3.4 Cotações — conduzir a concorrência', img: 'loja-cotacoes', intro: 'A tela acompanha as cotações abertas e encerradas. No detalhe você vê os convidados, as propostas recebidas (valor por item, prazo, validade e condições) e decide o resultado.', topicos: [
    { t: 'Durante a concorrência', passos: [
      'Acompanhe quem já propôs; envie LEMBRETE aos convidados que ainda não responderam (registrado no histórico).',
      'As propostas são sigilosas entre concorrentes — cada fornecedor vê apenas a própria.'] },
    { t: 'Decidir o vencedor', passos: [
      'Para o processo inteiro: escolha a proposta vencedora de todos os itens. Se NÃO for a de menor preço, a justificativa é obrigatória.',
      'Item a item (adjudicação): defina um vencedor diferente para cada item, também com justificativa quando não for o menor preço.',
      'Ao decidir, os itens do pedido são encaminhados automaticamente ao(s) vencedor(es) para faturamento.'] },
    { t: 'Cancelar uma cotação', passos: [
      'Use a ação de cancelar informando o motivo — os itens voltam a "Aprovado" no pedido e podem seguir outro caminho.'] },
  ] },
  { t: '3.5 Faturamento — acompanhamento da Loja', img: 'loja-faturamento', intro: 'A tela consolida todas as notas emitidas pelos fornecedores às revendas: número, pedido, origem (envio direto ou cotação), valor e o royalty calculado. O quadro superior lista os pedidos encaminhados que ainda aguardam faturamento do fornecedor.', topicos: [
    { t: 'Documento fiscal e análise', passos: [
      'Cada nota tem o link "📎 documento fiscal" para baixar o PDF/XML anexado pelo fornecedor.',
      'O selo "✓ validado por IA Claude/análise local" indica que o documento foi conferido contra o pedido — passe o mouse para ler o motivo completo da validação.'] },
  ] },
  { t: '3.6 Inventário de estoque', img: 'loja-inventario', intro: 'Registre contagens do estoque da Loja em datas específicas. O saldo mostrado nos pedidos é calculado automaticamente: última contagem MENOS os atendimentos por estoque feitos depois dela.', topicos: [
    { t: 'Lançar por planilha (recomendado)', passos: [
      'Escolha a data do inventário e baixe um dos três modelos em Excel (.xlsx): TODOS os produtos com quantidades em branco; somente os itens do ÚLTIMO inventário; ou apenas o CABEÇALHO.',
      'Preencha as quantidades no Excel e salve.',
      'Use a carga de planilha, selecione o arquivo, confira o resumo apresentado e confirme a gravação.'] },
    { t: 'Lançar manualmente', passos: [
      'Abra o lançamento manual, informe a data, as quantidades por produto e uma observação, e salve.'] },
  ] },
  { t: '3.7 Cadastros — fornecedores, contratos, produtos e revendas', img: 'loja-fornecedores', intro: 'O grupo Cadastros mantém a base da operação. Fornecedores & Contratos: dados do parceiro e o contrato com o percentual de royalty (alterações de % ficam no histórico; o contrato vigente define o cálculo dos novos faturamentos). Produtos homologados: catálogo com código, descrição, unidade, preço de referência (oculto às revendas), fotos e histórico de preços. Revendas: dados, e-mail de notificação e o controle fino de VISIBILIDADE — quais fornecedores (e produtos) cada revenda enxerga, com bloqueios por produto.', topicos: [
    { t: 'Boas práticas', passos: [
      'Inative (em vez de excluir) fornecedores/produtos fora de linha — o histórico é preservado.',
      'Revise a visibilidade ao homologar novos fornecedores: revendas só compram o que enxergam.',
      'Mantenha o e-mail das revendas e o contato dos fornecedores atualizados — são os destinos das notificações.'] },
  ] },
  { t: '3.8 Royalties & Fechamento mensal', img: 'loja-royalties', intro: 'Consolida, por competência e fornecedor, o royalty devido (valor faturado × % do contrato). Os quatro indicadores mostram a receber, recebido, EM ATRASO e o próximo vencimento. Filtros por competência, fornecedor e status refinam os blocos e a exportação.', topicos: [
    { t: 'Conferir e cobrar', passos: [
      'Clique no fornecedor ("ver extrato ▾") para ver a composição nota a nota (valor × % = royalty).',
      'Clique em "Gerar cobrança…": o documento numerado (COB-AAAAMM-NN) lista as notas; ajuste o VENCIMENTO (sugerido: dia 10 do mês seguinte) e clique em "Emitir e notificar fornecedor".'] },
    { t: 'Controlar atrasos', passos: [
      'Após o vencimento sem pagamento, o status vira "Em atraso" automaticamente, com "Venceu em … · N dia(s) de atraso" em vermelho.',
      'Use o botão vermelho "Lembrete de atraso" para reenviar a cobrança vencida por e-mail — o envio fica registrado na linha e na auditoria.'] },
    { t: 'Registrar o pagamento', passos: [
      'Clique em "Registrar pagamento…" — o quadro mostra o royalty devido e o vencimento.',
      'Confirme data e valor (já preenchidos), informe o comprovante (PIX/TED) e conclua. Pagamentos após o vencimento ficam marcados como "pago com atraso".'] },
    { t: 'Exportar', passos: [
      'Use "⬇ Exportar XLSX" para baixar o fechamento filtrado em Excel, com vencimento, cobrança, lembrete, pagamento e comprovante por fornecedor.'] },
  ] },
  { t: '3.9 Relatórios e painéis', img: 'loja-relatorios', intro: 'Painel gerencial com KPIs, gráficos, rankings, funil de pedidos e tabelas de desempenho por revenda e fornecedor. Tudo recalcula na hora conforme os filtros de competência, revenda, fornecedor e status; os botões de exportação geram arquivos com o mesmo recorte exibido.', topicos: [] },
  { t: '3.10 Segurança & Auditoria', img: 'loja-auditoria', intro: 'Trilha das operações críticas e eventos de segurança: cada evento registra quem fez (usuário, e-mail e papel), o quê, quando, o MÓDULO (chip colorido) e a SEVERIDADE (info, alerta, crítico). Logins, falhas de login (com o e-mail tentado), logouts e tentativas de acesso negadas também entram na trilha.', topicos: [
    { t: 'Investigar', passos: [
      'Combine a busca textual com os filtros de usuário, módulo, severidade e período (hoje/7/30 dias) — o contador "Mostrando X de Y" reflete o recorte.',
      'Filtre por severidade "Crítico" + período "Hoje" para uma varredura rápida de segurança.',
      '"⬇ Exportar XLSX" baixa o recorte filtrado (a exportação também é auditada); "Carregar mais eventos" pagina a lista.'] },
  ] },
] },
{ parte: 'Parte 4 — Guia do Fornecedor', secoes: [
  { t: '4.1 Pedidos recebidos e registro de faturamento', img: 'forn-pedidos-recebidos', intro: 'Aqui chegam os pedidos direcionados a você por envio direto da Loja ou por cotação vencida. Cada cartão mostra os itens (somente os seus), o valor e a revenda de destino — o faturamento é emitido por você DIRETAMENTE à revenda.', topicos: [
    { t: 'Registrar o faturamento (com documento fiscal obrigatório)', passos: [
      'No cartão do pedido, clique em "Registrar faturamento…".',
      'Confira o "Valor efetivamente faturado (R$)" — vem preenchido com a soma dos seus itens pendentes; ajuste se necessário.',
      'ANEXE o documento fiscal emitido à revenda no campo "Documento fiscal emitido à revenda (PDF ou XML) — obrigatório" (até 5 MB). Sem anexo o registro é bloqueado.',
      'Clique em "Confirmar faturamento". Com a análise automática habilitada, a plataforma confere o documento contra o pedido (emitente, destinatário, itens e valor) em segundos.',
      'Se o documento NÃO corresponder ao pedido, ele é recusado na hora e o motivo aparece em vermelho — corrija o arquivo e tente novamente (prefira o XML da NF-e, lido com mais precisão).',
      'Aceito, a nota é registrada com o royalty calculado automaticamente pelo percentual do seu contrato, e revenda e Loja são notificadas.'] },
  ] },
  { t: '4.2 Cotações convidadas', img: 'forn-cotacoes', intro: 'Somente as cotações para as quais você foi convidado aparecem aqui. Suas propostas são sigilosas — você não vê os valores dos concorrentes e eles não veem os seus.', topicos: [
    { t: 'Enviar ou editar proposta', passos: [
      'No cartão "Aguardando propostas", clique em "Enviar proposta…" (ou "Editar proposta…").',
      'Informe o preço unitário de CADA item — o total é calculado automaticamente.',
      'Preencha prazo de entrega, validade da proposta e condições comerciais, e envie.',
      'Respeite o prazo do cartão; após encerrada, o resultado aparece no próprio cartão (ex.: "Você venceu X de Y item(ns)").'] },
  ] },
  { t: '4.3 Meus faturamentos', img: 'forn-faturamentos', intro: 'Consulta de todas as notas que você registrou: valor, royalty devido por nota, o link "📎 documento fiscal" do anexo e o selo da análise. O percentual do seu contrato aparece no subtítulo.', topicos: [] },
  { t: '4.4 Royalties devidos', img: 'forn-royalties', intro: 'Fechamento mensal do que você deve à Loja: competência, faturado, royalty devido, VENCIMENTO da cobrança (em vermelho com os dias de atraso quando vencida) e status. O número do documento de cobrança (COB-…) e o registro do pagamento aparecem sob a competência.', topicos: [
    { t: 'Fique atento', passos: [
      'Após o vencimento sem pagamento o status vira "Em atraso" automaticamente e a Loja pode enviar lembretes por e-mail.',
      'O pagamento é registrado pela Loja — envie o comprovante a ela após pagar.'] },
  ] },
] },
{ parte: 'Parte 5 — Guia do Administrador Técnico', secoes: [
  { t: '5.1 Usuários e permissões', img: 'adm-usuarios', intro: 'Crie e gerencie as contas dos quatro perfis. Cada perfil tem um conjunto padrão de permissões e você pode CONCEDER OU NEGAR QUALQUER PERMISSÃO individualmente por usuário (granularidade fina) — ex.: um analista da Loja que vê pedidos mas não aprova.', topicos: [
    { t: 'Criar e manter contas', passos: [
      'Clique em "+ Novo usuário": nome, e-mail (login), perfil, senha inicial — e o VÍNCULO obrigatório quando o perfil é Fornecedor ou Revenda.',
      '"Editar" altera dados e redefine a senha (em branco mantém a atual); "Inativar" bloqueia o acesso sem apagar o histórico.',
      'O sistema exige ao menos um Administrador Técnico ativo — o último admin não pode ser inativado nem rebaixado.'] },
    { t: 'Ajustar permissões individuais', passos: [
      'Clique no selo "⚙" do usuário para abrir o editor: cada chave do sistema (25 permissões em 7 grupos) tem um interruptor permitir/negar.',
      'A linha indica a origem — "padrão do perfil" ou "personalizada"; "↺ Restaurar padrão do perfil" desfaz os ajustes.',
      'Botões e telas somem automaticamente para quem não tem a permissão; tentativas de ação sem permissão são registradas na auditoria.'] },
  ] },
  { t: '5.2 Configuração de e-mail (SMTP) e notificações automáticas', img: 'adm-email', intro: 'Configure o servidor de envio: host, porta, segurança (STARTTLS/SSL), usuário, senha, remetente e o e-mail interno da Loja. Com o interruptor "Envio de e-mails" ATIVADO, a plataforma dispara automaticamente 20 modelos de e-mail nos fluxos de pedidos, cotações, faturamento e royalties — sempre com a lista dos itens envolvidos e sem expor preços de catálogo às revendas.', topicos: [
    { t: 'Validar a configuração', passos: [
      'Preencha os campos e clique em "Salvar configurações".',
      '"Verificar conexão" testa o acesso ao servidor SMTP.',
      'Em "Enviar e-mail de teste", informe um destinatário e confirme o recebimento.',
      'Use porta 587 (STARTTLS) ou 465 (SSL) — a porta 25 costuma ser bloqueada pelos provedores.'] },
  ] },
  { t: '5.3 Análise fiscal (IA) — flag do administrador', img: 'adm-analise', intro: 'Controla a verificação automática do documento fiscal anexado pelos fornecedores no faturamento. HABILITADA (padrão), a plataforma confere emitente, destinatário, itens e valor contra o pedido e aceita ou recusa o anexo como evidência na hora. DESABILITADA, o anexo continua obrigatório, mas é aceito sem verificação. A tela também informa o motor em uso: IA Claude (quando a chave ANTHROPIC_API_KEY está configurada no servidor) ou o analisador local.', topicos: [
    { t: 'Alterar o flag', passos: [
      'Use o interruptor — a mudança vale imediatamente para os próximos faturamentos e fica registrada na auditoria.'] },
  ] },
] },
]

// ─────────────────────────────────────────────────────────────────────────────
// PDF
// ─────────────────────────────────────────────────────────────────────────────
const esc = (s) => String(s == null ? '' : s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]))
const img64 = (n) => readFileSync(`${IMGDIR}/${n}.jpg`).toString('base64')

function secHtml(s) {
  return `<section class="sec">
    <h2>${esc(s.t)}</h2>
    <p class="intro">${esc(s.intro)}</p>
    ${s.img ? `<img class="shot" src="data:image/jpeg;base64,${img64(s.img)}">` : ''}
    ${(s.topicos || []).map((tp) => `
      <div class="topico">
        <h3>${esc(tp.t)}</h3>
        <ol>${tp.passos.map((p) => `<li>${esc(p)}</li>`).join('')}</ol>
        ${tp.nota ? `<div class="nota">${esc(tp.nota)}</div>` : ''}
      </div>`).join('')}
  </section>`
}

const totalSec = PARTES.reduce((a, p) => a + p.secoes.length, 0)
const htmlPdf = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><style>
  @page { size: A4; margin: 0; }
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:'Segoe UI',Arial,sans-serif; color:#272525; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
  .capa { height:296.5mm; position:relative; background:radial-gradient(900px 500px at 70% -10%, #3a2f1c, #272525 55%, #1c1a18); page-break-after:always; }
  .miolo { padding:14mm 16mm; }
  h1.parte { font-size:19px; font-weight:800; color:#fff; background:linear-gradient(135deg,#8a6428,#B38335); border-radius:11px; padding:12px 16px; margin:18px 0 6px; break-after:avoid; }
  h2 { font-size:15.5px; font-weight:800; color:#272525; margin:16px 0 4px; break-after:avoid; }
  h3 { font-size:12.5px; font-weight:800; color:#8a5a12; margin:10px 0 4px; }
  .sec { break-inside:auto; }
  p.intro { font-size:11.5px; color:#4a453d; line-height:1.6; margin:4px 0 8px; }
  .shot { width:100%; border:1px solid #e0d8c8; border-radius:9px; margin:4px 0 8px; break-inside:avoid; }
  .topico { break-inside:avoid; margin-bottom:8px; }
  ol { margin:2px 0 4px 20px; }
  li { font-size:11.5px; color:#4a453d; line-height:1.55; margin:3.5px 0; }
  .nota { font-size:11px; color:#6b6459; line-height:1.5; background:#f7f4ee; border-left:3px solid #B38335; border-radius:0 7px 7px 0; padding:7px 11px; margin:5px 0; }
  .tbl { width:100%; border-collapse:collapse; margin:8px 0; font-size:10.5px; }
  .tbl th { text-align:left; background:#272525; color:#e3bf7e; padding:6px 9px; font-size:9.5px; letter-spacing:.05em; text-transform:uppercase; }
  .tbl td { padding:5.5px 9px; border-bottom:1px solid #eee7d8; color:#4a453d; vertical-align:top; line-height:1.45; }
  .tbl tr:nth-child(even) td { background:#faf7f0; }
  .mono { font-family:Consolas,monospace; font-size:10px; }
  .sec-title { font-size:13px; font-weight:800; letter-spacing:.12em; color:#B38335; margin:8px 0 8px; }
  .faq { break-inside:avoid; border:1px solid #eae3d6; border-radius:9px; padding:9px 12px; margin-bottom:8px; background:#fffdf9; }
  .faq b { font-size:11.5px; color:#272525; }
  .faq p { font-size:11px; color:#4a453d; line-height:1.55; margin-top:3px; }
</style></head><body>

<div class="capa">
  <div style="position:absolute;left:18mm;top:20mm;display:flex;align-items:center;gap:14px">
    <div style="width:52px;height:52px;border-radius:13px;background:linear-gradient(135deg,#cfa055,#B38335 55%,#8a6428);display:flex;align-items:center;justify-content:center;font-family:Georgia,serif;font-weight:700;font-size:22px;color:#fff">CI</div>
    <div><div style="font-family:Georgia,serif;font-weight:700;font-size:16px;letter-spacing:.14em;color:#fff">CIDADE IMPERIAL</div>
    <div style="font-size:11px;letter-spacing:.16em;color:#e3bf7e;margin-top:3px">PLATAFORMA DA LOJA</div></div>
  </div>
  <div style="position:absolute;left:18mm;right:18mm;top:92mm">
    <div style="font-size:13px;font-weight:700;letter-spacing:.18em;color:#e3bf7e;margin-bottom:12px">DOCUMENTAÇÃO · USUÁRIO FINAL</div>
    <div style="font-size:46px;font-weight:800;color:#fff;line-height:1.08;letter-spacing:-.5px">Manual do Usuário</div>
    <div style="font-size:15px;color:#c9c1b4;margin-top:16px;line-height:1.6;max-width:150mm">Guia completo da plataforma para os quatro perfis — Revenda, Loja Cidade Imperial, Fornecedor e Administrador Técnico — com capturas reais de todas as telas, passo a passo de cada rotina, tabela de status, perguntas frequentes e acessos de demonstração.</div>
    <div style="margin-top:22px;display:inline-block;background:#ffffff14;border:1px solid #e3bf7e55;border-radius:10px;padding:10px 16px;font-family:Consolas,monospace;font-size:13px;color:#e3bf7e">${URL_HML}</div>
  </div>
  <div style="position:absolute;left:18mm;bottom:42mm;right:18mm;display:flex;gap:8px;flex-wrap:wrap">
    ${PARTES.map((p) => `<div style="background:#ffffff10;border:1px solid #ffffff22;border-radius:8px;padding:7px 12px;font-size:10px;color:#e8e2d6">${esc(p.parte)}</div>`).join('')}
    <div style="background:#ffffff10;border:1px solid #ffffff22;border-radius:8px;padding:7px 12px;font-size:10px;color:#e8e2d6">Parte 6 — Referência rápida</div>
  </div>
  <div style="position:absolute;left:18mm;bottom:20mm;font-size:10px;color:#8a8378">Julho de 2026 · ${totalSec + 3} seções · capturas reais do ambiente</div>
</div>

<div class="miolo">
  ${PARTES.map((p) => `<h1 class="parte">${esc(p.parte)}</h1>${p.secoes.map(secHtml).join('')}`).join('')}

  <h1 class="parte">Parte 6 — Referência rápida</h1>
  <h2>6.1 Status e etiquetas do sistema</h2>
  <table class="tbl"><tr><th style="width:16%">Contexto</th><th style="width:26%">Etiqueta</th><th>Significado</th></tr>
    ${STATUS.map((r) => `<tr><td>${esc(r[0])}</td><td><b>${esc(r[1])}</b></td><td>${esc(r[2])}</td></tr>`).join('')}
  </table>
  <h2>6.2 Perguntas frequentes</h2>
  ${FAQ.map((f) => `<div class="faq"><b>${esc(f[0])}</b><p>${esc(f[1])}</p></div>`).join('')}
  <h2>6.3 Acessos de demonstração (homologação)</h2>
  <table class="tbl"><tr><th>Perfil</th><th>E-mail (login)</th><th>Senha</th></tr>
    ${ACESSOS.map((a) => `<tr><td><b>${esc(a[0])}</b></td><td class="mono">${esc(a[1])}</td><td class="mono">${esc(a[2])}</td></tr>`).join('')}
  </table>
  <div class="nota">Em produção, troque as senhas de demonstração no primeiro acesso (Configurações Técnicas › Usuários e permissões) e inative as contas que não forem usadas.</div>
  <div style="display:flex;justify-content:space-between;font-size:9px;color:#a89f90;border-top:1px solid #eae3d6;padding-top:6px;margin-top:10px">
    <span>Plataforma Cidade Imperial — Manual do Usuário</span><span>julho/2026</span>
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
const P = (txt, o = {}) => new Paragraph({ children: [new TextRun({ text: txt, size: o.size || 21, bold: !!o.bold, color: o.color || '3A362E', font: 'Calibri', italics: !!o.it })], spacing: { after: o.after ?? 90, before: o.before ?? 0 } })
const cellB = { top: { style: BorderStyle.SINGLE, size: 4, color: 'E5DDCD' }, bottom: { style: BorderStyle.SINGLE, size: 4, color: 'E5DDCD' }, left: { style: BorderStyle.SINGLE, size: 4, color: 'E5DDCD' }, right: { style: BorderStyle.SINGLE, size: 4, color: 'E5DDCD' } }
const cell = (children, o = {}) => new TableCell({ children, borders: cellB, shading: o.fill ? { type: ShadingType.SOLID, color: o.fill, fill: o.fill } : undefined, width: o.w ? { size: o.w, type: WidthType.PERCENTAGE } : undefined, margins: { top: 50, bottom: 50, left: 90, right: 90 } })
const headCell = (t, w) => cell([P(t, { bold: true, color: 'E3BF7E', size: 18 })], { fill: DARK, w })
const shotRun = (n) => new Paragraph({ children: [new ImageRun({ type: 'jpg', data: readFileSync(`${IMGDIR}/${n}.jpg`), transformation: { width: 620, height: 370 } })], spacing: { after: 120 } })

const filhos = []
filhos.push(P('CIDADE IMPERIAL · PLATAFORMA DA LOJA', { bold: true, color: GOLD, size: 22, before: 200 }))
filhos.push(new Paragraph({ children: [new TextRun({ text: 'Manual do Usuário', bold: true, size: 56, color: DARK, font: 'Calibri' })], spacing: { after: 160 } }))
filhos.push(P('Guia completo da plataforma para os quatro perfis — Revenda, Loja, Fornecedor e Administrador Técnico — com capturas reais das telas.', { size: 24, color: GREY, after: 60 }))
filhos.push(P(`Ambiente: ${URL_HML} · Julho de 2026`, { size: 22, color: GREY, after: 260 }))

for (const parte of PARTES) {
  filhos.push(new Paragraph({ text: parte.parte, heading: HeadingLevel.HEADING_1 }))
  for (const s of parte.secoes) {
    filhos.push(new Paragraph({ text: s.t, heading: HeadingLevel.HEADING_2 }))
    filhos.push(P(s.intro))
    if (s.img) filhos.push(shotRun(s.img))
    for (const tp of s.topicos || []) {
      filhos.push(P(tp.t, { bold: true, color: '8A5A12', size: 22, before: 120, after: 50 }))
      tp.passos.forEach((px, i) => filhos.push(new Paragraph({ children: [new TextRun({ text: `${i + 1}. `, bold: true, size: 21, color: '3A362E', font: 'Calibri' }), new TextRun({ text: px, size: 21, color: '3A362E', font: 'Calibri' })], spacing: { after: 40 } })))
      if (tp.nota) filhos.push(P('Nota: ' + tp.nota, { size: 19, color: GREY, it: true, before: 40 }))
    }
  }
}

filhos.push(new Paragraph({ text: 'Parte 6 — Referência rápida', heading: HeadingLevel.HEADING_1 }))
filhos.push(new Paragraph({ text: '6.1 Status e etiquetas do sistema', heading: HeadingLevel.HEADING_2 }))
filhos.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [
  new TableRow({ children: [headCell('Contexto', 16), headCell('Etiqueta', 28), headCell('Significado', 56)] }),
  ...STATUS.map((r) => new TableRow({ children: [cell([P(r[0], { size: 18 })]), cell([P(r[1], { size: 18, bold: true })]), cell([P(r[2], { size: 18 })])] })),
] }))
filhos.push(new Paragraph({ text: '6.2 Perguntas frequentes', heading: HeadingLevel.HEADING_2 }))
for (const f of FAQ) { filhos.push(P(f[0], { bold: true, before: 120, after: 40 })); filhos.push(P(f[1], { size: 20, color: '4A453D' })) }
filhos.push(new Paragraph({ text: '6.3 Acessos de demonstração (homologação)', heading: HeadingLevel.HEADING_2 }))
filhos.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [
  new TableRow({ children: [headCell('Perfil', 34), headCell('E-mail (login)', 42), headCell('Senha', 24)] }),
  ...ACESSOS.map((a) => new TableRow({ children: [cell([P(a[0], { size: 18, bold: true })]), cell([P(a[1], { size: 18 })]), cell([P(a[2], { size: 18 })])] })),
] }))
filhos.push(P('Em produção, troque as senhas de demonstração no primeiro acesso e inative as contas que não forem usadas.', { size: 19, color: GREY, it: true, before: 120 }))

const doc = new Document({
  styles: { paragraphStyles: [
    { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 32, bold: true, color: GOLD, font: 'Calibri' }, paragraph: { spacing: { before: 360, after: 140 } } },
    { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 26, bold: true, color: DARK, font: 'Calibri' }, paragraph: { spacing: { before: 280, after: 100 } } },
  ] },
  sections: [{ properties: { page: { margin: { top: 1000, bottom: 1000, left: 1100, right: 1100 } } }, children: filhos }],
})
writeFileSync(OUT_DOCX, await Packer.toBuffer(doc))
console.log('DOCX ok:', OUT_DOCX)
