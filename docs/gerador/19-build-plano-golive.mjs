// Gera o Plano de Go Live da Plataforma Cidade Imperial em PDF.
// Dimensionado para 15 dias úteis (D1–D15), com atividades detalhadas por dia,
// por recurso e por funcionalidade; manutenções cadastrais da Loja; plano de
// comunicação com revendas e fornecedores; e plano de treinamento.
// Rode a partir de docs/gerador:  node 19-build-plano-golive.mjs
import pw from '/opt/node22/lib/node_modules/playwright/index.js'
const { chromium } = pw

const OUT_PDF = '/home/user/P018LJCDI/docs/Plataforma-Cidade-Imperial-Plano-Go-Live.pdf'
const esc = (s) => String(s == null ? '' : s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]))

// ── Recursos (papéis) ───────────────────────────────────────────────────────
const EQUIPE = [
  ['PAT', 'Patrocinador (Diretoria)', 'Cervejaria Cidade Imperial',
   'Autoriza o Go Live, decide no Go/No-Go, remove impedimentos e assina os comunicados institucionais às revendas e fornecedores.', '4 h no período'],
  ['GGL', 'Gestor do Go Live', 'Loja Cidade Imperial',
   'Coordena o plano, controla o cronograma diário, consolida pendências, conduz as reuniões de status e o Go/No-Go. Ponto único de contato do projeto.', 'Dedicação integral'],
  ['ADM', 'Administrador Técnico', 'TI / parceiro de tecnologia',
   'Ambiente, URL, backup, SMTP, análise fiscal (IA), usuários, perfis e permissões. Executa as configurações técnicas e monitora a plataforma.', '4 h/dia'],
  ['CAD', 'Analista de Cadastros', 'Loja Cidade Imperial',
   'Extração, higienização e carga dos cadastros (fornecedores, categorias, produtos, De/Para, revendas, inventário). Confere por exportação.', 'Dedicação integral'],
  ['COM', 'Analista Comercial / Compras', 'Loja Cidade Imperial',
   'Preços de referência, vínculo produto × fornecedor, condições comerciais, condução do piloto de pedidos e cotações.', '6 h/dia'],
  ['FIN', 'Financeiro / Controladoria', 'Loja Cidade Imperial',
   'Contratos de royalty (percentual, vigência, dia acordado, gatilhos, parcelas), conferência do fechamento e das cobranças.', '4 h/dia'],
  ['FIS', 'Fiscal', 'Loja Cidade Imperial',
   'Ficha fiscal dos produtos (NCM, EAN, pesos), critérios de aceite e recusa de documento fiscal, validação da análise fiscal.', '3 h/dia'],
  ['TRE', 'Multiplicador / Instrutor', 'Loja Cidade Imperial',
   'Prepara e conduz as turmas de treinamento, produz o material de apoio e o roteiro de exercícios, aplica a avaliação.', '6 h/dia a partir de D6'],
  ['REL', 'Relacionamento com o canal', 'Loja Cidade Imperial',
   'Comunicação com revendas e fornecedores: convites, cobrança de adesão, confirmação de primeiro acesso, coleta de dúvidas.', 'Dedicação integral'],
  ['SUP', 'Suporte N1 (hypercare)', 'Loja Cidade Imperial + parceiro',
   'Atendimento no período assistido: dúvidas, redefinição de acesso, acompanhamento dos primeiros pedidos reais.', 'Integral em D14–D15'],
  ['DEV', 'Equipe de desenvolvimento', 'Parceiro de tecnologia',
   'Correções de defeito encontradas no ensaio e no piloto, publicação de versão, apoio técnico ao ADM.', 'Sob demanda'],
  ['FOR', 'Responsável comercial do fornecedor', 'Cada fornecedor',
   'Confirma dados cadastrais, aceita o convite de acesso, participa do treinamento, responde à cotação-ensaio.', '3 h no período'],
  ['REV', 'Responsável de compras da revenda', 'Cada revenda',
   'Confirma dados cadastrais, aceita o convite de acesso, participa do treinamento, emite o pedido-ensaio.', '3 h no período'],
]

// ── Ondas ───────────────────────────────────────────────────────────────────
const CAPA_ONDAS = [
  'Ambiente, configurações técnicas, equipe habilitada e dados legados higienizados nos modelos de carga.',
  'Base cadastral inteira carregada e conferida, e as três audiências treinadas com exercício avaliado.',
  'Ensaio ponta a ponta, piloto assistido, Go/No-Go, virada e dois dias de operação assistida.',
]
const ONDAS = [
  ['Onda 1 · Fundação', 'D1 – D4',
   'Ambiente, configurações técnicas, equipe habilitada e dados legados extraídos e higienizados. Ao fim da onda, a plataforma está configurada e as planilhas de carga estão prontas nos modelos oficiais.',
   '#8f682a', '#faf3e4'],
  ['Onda 2 · Carga cadastral e capacitação', 'D5 – D10',
   'Toda a base cadastral carregada e conferida (fornecedores, contratos, categorias, produtos, De/Para, revendas, usuários, inventário) e as três audiências treinadas: Loja, fornecedores e revendas.',
   '#5d3f96', '#f3eefa'],
  ['Onda 3 · Ensaio, piloto e virada', 'D11 – D15',
   'Ensaio ponta a ponta com dados reais, piloto assistido com um subconjunto do canal, decisão de Go/No-Go, virada para produção e primeiro dia de operação assistida.',
   '#2f6b39', '#eef5ef'],
]

// ── Cronograma dia a dia ────────────────────────────────────────────────────
// [id, atividade, responsável(is), horas, saída/critério de conclusão]
const CRONO = [
  { dia: 'D1', onda: 0, foco: 'Abertura, ambiente e congelamento de escopo', itens: [
    ['A1.1', 'Reunião de abertura do Go Live: objetivos, papéis, calendário dos 15 dias, canais de comunicação do projeto e regra de escalonamento.', 'GGL, PAT, ADM, CAD, COM, FIN, FIS, TRE, REL', 2, 'Ata publicada com papéis nomeados e agenda diária de 15 min fixada.'],
    ['A1.2', 'Congelamento de escopo: nenhuma nova funcionalidade entra até D15; defeitos entram por fila priorizada.', 'GGL, PAT, DEV', 1, 'Termo de congelamento assinado; fila de defeitos aberta.'],
    ['A1.3', 'Checagem do ambiente de produção: URL definitiva, certificado, desempenho, rotina de backup e restauração testada.', 'ADM, DEV', 3, 'Backup restaurado com sucesso em ambiente de teste; URL respondendo.'],
    ['A1.4', 'Definição do ambiente de homologação espelhado para o ensaio e o treinamento, separado da produção.', 'ADM', 2, 'Homologação no ar, com dados de demonstração e sem envio de e-mail para o canal.'],
    ['A1.5', 'Levantamento das fontes dos dados legados: de onde saem fornecedores, produtos, revendas, preços e posição de estoque.', 'CAD, COM', 3, 'Inventário de fontes com responsável e formato de cada arquivo.'],
    ['A1.6', 'Definição da lista oficial de revendas e fornecedores que entram no Go Live, com contato titular e suplente de cada um.', 'REL, COM, PAT', 3, 'Lista fechada e aprovada pelo patrocinador — base de toda a comunicação.'],
  ] },
  { dia: 'D2', onda: 0, foco: 'Configurações técnicas e capacitação da equipe de carga', itens: [
    ['A2.1', 'Configuração de e-mail (SMTP): servidor, porta, segurança, usuário, remetente e e-mail da Loja; "Verificar conexão" e envio de teste.', 'ADM', 3, 'Teste recebido na caixa da Loja; envio de e-mails ativado.'],
    ['A2.2', 'Configuração da análise fiscal (IA): critérios de conferência do documento fiscal alinhados com o Fiscal.', 'ADM, FIS', 2, 'Critérios revisados e salvos; teste com um XML de exemplo.'],
    ['A2.3', 'Criação dos usuários da Loja e ajuste fino de permissões por perfil (quem recebe pedido, quem decide cotação, quem registra pagamento).', 'ADM, GGL', 3, 'Matriz de permissões aprovada; cada usuário testa o próprio login.'],
    ['A2.4', 'Definição da política de primeiro acesso: senha inicial gerada pela plataforma, envio automático das credenciais e registro do envio no log do usuário.', 'ADM, GGL', 1, 'Política escrita; um envio de teste validado ponta a ponta.'],
    ['A2.5', 'Capacitação da equipe de carga (3 h): telas de cadastro, download dos modelos, prévia da importação, correção de erros e exportação para conferência.', 'TRE, CAD, COM, FIN, FIS', 3, 'Equipe apta a operar as importações sem apoio.'],
    ['A2.6', 'Extração dos dados legados nos formatos de origem (ERP/planilhas).', 'CAD', 3, 'Arquivos brutos entregues no repositório do projeto.'],
  ] },
  { dia: 'D3', onda: 0, foco: 'Higienização dos dados e montagem das planilhas', itens: [
    ['A3.1', 'Higienização de fornecedores: CNPJ válido e único, razão social, cidade/UF, e-mail de contato (obrigatório para receber cotação) e telefone.', 'CAD', 4, 'Zero CNPJ duplicado ou inválido; todo fornecedor com e-mail.'],
    ['A3.2', 'Higienização de revendas: CNPJ, cidade/UF, telefone e e-mail de acesso (login) — um e-mail por revenda, ativo e monitorado.', 'CAD, REL', 4, 'Toda revenda com e-mail de acesso confirmado com o próprio canal.'],
    ['A3.3', 'Definição da árvore de categorias de produtos (grupos do catálogo) e enquadramento de cada produto.', 'COM, CAD', 3, 'Lista de categorias aprovada; todo produto com categoria definida.'],
    ['A3.4', 'Higienização de produtos: descrição padronizada, unidade, preço estimado de referência e fornecedores vinculados (De/Para).', 'COM, CAD', 4, 'Todo produto com pelo menos um fornecedor e preço de referência.'],
    ['A3.5', 'Montagem das planilhas nos modelos baixados da própria plataforma (categorias, fornecedores, produtos, revendas, usuários).', 'CAD', 3, 'Planilhas salvas sobre os modelos oficiais, sem colunas renomeadas.'],
  ] },
  { dia: 'D4', onda: 0, foco: 'Primeiras cargas: categorias e fornecedores', itens: [
    ['A4.1', 'Carga das categorias de produtos por planilha; conferência da lista e das inativas.', 'CAD', 2, 'Categorias criadas e visíveis no cadastro de produtos.'],
    ['A4.2', 'Carga dos fornecedores por planilha, com leitura integral da prévia antes de gravar (novo × atualiza × erro).', 'CAD', 3, 'Fornecedores gravados; nenhuma linha em erro pendente.'],
    ['A4.3', 'Conferência da carga por exportação XLSX e confronto com a base de origem.', 'CAD, COM', 2, 'Divergências zeradas ou justificadas por escrito.'],
    ['A4.4', 'Complementação manual dos fornecedores: pessoa de contato e dados que não vêm por planilha.', 'CAD', 2, 'Todo fornecedor com contato nomeado.'],
    ['A4.5', 'Preparação do kit de comunicação: comunicado institucional, guia rápido de 1 página por perfil e roteiro do webinar.', 'REL, TRE', 4, 'Kit aprovado pelo patrocinador, pronto para disparo em D5.'],
    ['A4.6', 'Status diário e tratamento de impedimentos.', 'GGL', 1, 'Painel do plano atualizado.'],
  ] },

  { dia: 'D5', onda: 1, foco: 'Contratos de royalty e primeiro comunicado ao canal', itens: [
    ['A5.1', 'Cadastro dos contratos de royalty por fornecedor: percentual, início e fim de vigência, dia acordado de pagamento, gatilho de vencimento e número de parcelas.', 'FIN', 5, 'Todo fornecedor ativo com contrato vigente cadastrado.'],
    ['A5.2', 'Conferência dos contratos contra os instrumentos assinados; dupla checagem do percentual (é ele que calcula a cobrança).', 'FIN, GGL', 2, 'Conferência assinada por duas pessoas; divergências corrigidas.'],
    ['A5.3', 'Exportação dos contratos e arquivamento da evidência da carga.', 'FIN', 1, 'Planilha arquivada no repositório do projeto.'],
    ['A5.4', 'Disparo do comunicado institucional nº 1 a fornecedores e revendas: o que muda, por que, quando entra no ar e o que se espera de cada um.', 'REL, PAT', 2, 'Comunicado enviado a 100% da lista oficial; recebimentos confirmados.'],
    ['A5.5', 'Abertura do canal de dúvidas do projeto (e-mail e telefone) com prazo de resposta declarado.', 'REL', 1, 'Canal publicado no comunicado e no rodapé dos convites.'],
  ] },
  { dia: 'D6', onda: 1, foco: 'Carga de produtos, De/Para e ficha fiscal', itens: [
    ['A6.1', 'Carga dos produtos homologados por planilha, com os fornecedores vinculados na própria importação (De/Para).', 'CAD', 4, 'Produtos gravados; nenhuma linha em erro pendente.'],
    ['A6.2', 'Conferência do De/Para Produto × Fornecedor: todo produto com ao menos um fornecedor, e nenhum vínculo com fornecedor sem contrato vigente.', 'COM, CAD', 3, 'Tela De/Para sem alerta âmbar de contrato vencido.'],
    ['A6.3', 'Upload das imagens dos produtos e definição da imagem principal do catálogo.', 'CAD', 4, 'Todo produto ativo com pelo menos uma imagem própria.'],
    ['A6.4', 'Preenchimento da ficha fiscal dos produtos (NCM, EAN, pesos, dimensões) — o que for de responsabilidade da Loja.', 'FIS', 3, 'Ficha completa nos produtos de maior giro; pendências listadas para o fornecedor completar.'],
    ['A6.5', 'Preparação das turmas de treinamento: agenda, convites, ambiente de homologação com dados de exercício, lista de presença.', 'TRE', 3, 'Convites enviados para as turmas de D9 e D10.'],
  ] },
  { dia: 'D7', onda: 1, foco: 'Revendas, visibilidade de catálogo e usuários do canal', itens: [
    ['A7.1', 'Carga das revendas por planilha; conferência de CNPJ, cidade e e-mail de acesso.', 'CAD', 3, 'Revendas gravadas; e-mail de acesso conferido um a um.'],
    ['A7.2', 'Conferência da visibilidade: por padrão toda revenda enxerga o catálogo inteiro — validar as exceções que a Loja quiser restringir e registrar o motivo.', 'COM, CAD', 2, 'Lista de exceções aprovada; as demais revendas com catálogo completo.'],
    ['A7.3', 'Carga dos usuários de revendas e fornecedores por planilha, com o perfil e o vínculo corretos (inclusive multi-revenda de grupo econômico).', 'ADM, CAD', 3, 'Um usuário titular por revenda e por fornecedor, no perfil correto.'],
    ['A7.4', 'Envio das credenciais de primeiro acesso aos usuários do canal, com registro do envio no log de cada usuário.', 'ADM, REL', 2, 'Envio registrado para 100% dos usuários; falhas reenviadas.'],
    ['A7.5', 'Comunicado nº 2 ao canal: "seu acesso foi criado" — como entrar, o que fazer no primeiro login e convite para o treinamento.', 'REL', 2, 'Comunicado enviado; painel de adesão iniciado.'],
    ['A7.6', 'Status diário e tratamento de impedimentos.', 'GGL', 1, 'Painel do plano atualizado.'],
  ] },
  { dia: 'D8', onda: 1, foco: 'Inventário de estoque e conferência geral da base', itens: [
    ['A8.1', 'Levantamento da posição física de estoque da Loja na data de corte definida.', 'CAD, COM', 4, 'Contagem concluída e assinada pelo responsável do estoque.'],
    ['A8.2', 'Lançamento do inventário por planilha (modelo com todos os produtos) — a última carga passa a ser o saldo vigente.', 'CAD', 2, 'Inventário lançado; saldo por produto conferido na tela.'],
    ['A8.3', 'Conferência cruzada de toda a base por exportação: fornecedores, contratos, produtos, categorias, De/Para, revendas, usuários e saldo, num único arquivo.', 'CAD, GGL', 3, 'Planilha consolidada arquivada e revisada; divergências corrigidas.'],
    ['A8.4', 'Acompanhamento da adesão do canal: quem já fez o primeiro acesso e quem não. Reenvio de credenciais para os pendentes.', 'REL, ADM', 2, 'Painel de adesão com nome, status e data do primeiro acesso.'],
    ['A8.5', 'Fechamento do material de treinamento com os dados reais já carregados.', 'TRE', 3, 'Apostila e exercícios revisados com produtos e fornecedores reais.'],
  ] },
  { dia: 'D9', onda: 1, foco: 'Treinamento da equipe da Loja', itens: [
    ['A9.1', 'Turma 1 — Operação da Loja (4 h): recebimento de pedido, decisão de atendimento (estoque, envio direto, cotação), quantidades parciais, cotações com rodadas e observação aos fornecedores, adjudicação item a item e justificativa.', 'TRE, COM, GGL', 4, 'Lista de presença assinada; exercício prático concluído por cada participante.'],
    ['A9.2', 'Turma 2 — Financeiro e Fiscal (3 h): faturamento, documentos fiscais, recusa e regularização, fechamento de royalties, cobrança, parcelas, registro de pagamento e comprovante.', 'TRE, FIN, FIS', 3, 'Lista de presença assinada; exercício de fechamento concluído.'],
    ['A9.3', 'Turma 3 — Cadastros e administração (2 h): manutenção cadastral no dia a dia, importação e exportação, usuários e permissões, auditoria.', 'TRE, ADM, CAD', 2, 'Lista de presença assinada; cada participante executa uma importação de teste.'],
    ['A9.4', 'Avaliação de aprendizagem e coleta de dúvidas; consolidação do que virou FAQ.', 'TRE', 2, 'FAQ interno publicado; participantes com nota mínima definida.'],
  ] },
  { dia: 'D10', onda: 1, foco: 'Treinamento do canal — fornecedores e revendas', itens: [
    ['A10.1', 'Webinar de fornecedores (1 h 30): primeiro acesso, pedidos recebidos, cotações convidadas, proposta com preço por item, frete e condições, anexos, rodadas de negociação e observação da Loja, faturamento e royalties devidos.', 'TRE, COM, REL, FOR', 2, 'Gravação publicada; presença registrada; dúvidas respondidas.'],
    ['A10.2', 'Webinar de revendas (1 h): primeiro acesso, catálogo, montagem e envio do pedido, acompanhamento por etapa, aprovação comercial, documentos do faturamento e conversa por pedido.', 'TRE, COM, REL, REV', 2, 'Gravação publicada; presença registrada; dúvidas respondidas.'],
    ['A10.3', 'Sessões individuais de apoio para quem não pôde participar ou tem baixa familiaridade digital.', 'REL, TRE', 3, 'Todos os participantes ausentes contatados individualmente.'],
    ['A10.4', 'Publicação do guia rápido por perfil e da gravação dos webinars num link permanente.', 'REL', 2, 'Link enviado a 100% do canal.'],
    ['A10.5', 'Status diário e revisão da prontidão para a Onda 3.', 'GGL', 1, 'Checklist de entrada da Onda 3 avaliado.'],
  ] },

  { dia: 'D11', onda: 2, foco: 'Ensaio ponta a ponta em homologação', itens: [
    ['A11.1', 'Ensaio do fluxo completo com dados reais em homologação: pedido da revenda → recebimento → cotação com duas rodadas → adjudicação → aceite comercial → faturamento → fechamento de royalty → pagamento.', 'GGL, COM, FIN, FIS, ADM', 5, 'Ciclo concluído sem impedimento; trilha e auditoria conferidas.'],
    ['A11.2', 'Ensaio dos caminhos alternativos: rejeição de item com justificativa, atendimento pelo estoque, recusa de documento fiscal e regularização, cancelamento de cotação.', 'COM, FIS', 3, 'Cada caminho executado e registrado com evidência.'],
    ['A11.3', 'Conferência das notificações por e-mail em cada etapa: destinatário certo, assunto certo, conteúdo legível.', 'ADM, GGL', 2, 'Matriz de e-mails validada, um por evento.'],
    ['A11.4', 'Registro dos defeitos encontrados e priorização com a equipe de desenvolvimento.', 'GGL, DEV', 2, 'Fila priorizada com prazo por item.'],
  ] },
  { dia: 'D12', onda: 2, foco: 'Piloto assistido com um subconjunto do canal', itens: [
    ['A12.1', 'Piloto com 2 revendas e 2 fornecedores: pedido real de baixo valor percorrendo o fluxo, com a Loja acompanhando em tempo real.', 'COM, GGL, REV, FOR', 5, 'Pelo menos um pedido real concluído até o faturamento.'],
    ['A12.2', 'Uso dirigido da conversa por pedido durante o piloto, para validar o canal de comunicação com a revenda.', 'COM, SUP', 1, 'Conversa aberta e respondida nos dois sentidos.'],
    ['A12.3', 'Correção dos defeitos priorizados e publicação da versão de produção.', 'DEV, ADM', 4, 'Versão publicada e validada em homologação antes da virada.'],
    ['A12.4', 'Coleta estruturada da percepção dos participantes do piloto (o que confundiu, o que faltou).', 'REL, TRE', 2, 'Relato consolidado; ajustes de comunicação e material aplicados.'],
  ] },
  { dia: 'D13', onda: 2, foco: 'Ajustes finais, reforço de adesão e preparação da virada', itens: [
    ['A13.1', 'Reteste dos defeitos corrigidos e reexecução dos casos críticos do roteiro de aceitação.', 'GGL, COM, FIN', 4, 'Casos críticos aprovados; nenhum defeito bloqueante aberto.'],
    ['A13.2', 'Fechamento da adesão: contato individual com quem ainda não acessou; reenvio de credenciais e apoio direto.', 'REL, SUP', 4, 'Meta de primeiro acesso atingida ou exceções aprovadas pelo patrocinador.'],
    ['A13.3', 'Congelamento cadastral: nenhuma alteração de base entre D13 e a virada, exceto correção crítica aprovada.', 'GGL, CAD', 1, 'Comunicado interno de congelamento emitido.'],
    ['A13.4', 'Atualização final do inventário de estoque com a posição mais recente antes da virada.', 'CAD', 2, 'Inventário do dia lançado e conferido.'],
    ['A13.5', 'Backup completo e teste de restauração imediatamente antes da virada; plano de rollback revisado.', 'ADM, DEV', 3, 'Backup validado; rollback com passo a passo e responsável nomeado.'],
    ['A13.6', 'Comunicado nº 3 ao canal: data e hora da entrada em produção, o que fazer no primeiro dia, onde pedir ajuda.', 'REL', 2, 'Comunicado enviado a 100% da lista oficial.'],
  ] },
  { dia: 'D14', onda: 2, foco: 'Go/No-Go e virada para produção', itens: [
    ['A14.1', 'Reunião de Go/No-Go com o checklist de critérios de saída; decisão formal registrada em ata.', 'PAT, GGL, ADM, COM, FIN', 2, 'Decisão registrada e assinada pelo patrocinador.'],
    ['A14.2', 'Virada: publicação da versão em produção, ativação do envio de e-mails para o canal e verificação de fumaça (login por perfil, catálogo, pedido de teste).', 'ADM, DEV, GGL', 3, 'Verificação de fumaça aprovada nos três perfis.'],
    ['A14.3', 'Abertura oficial do sistema ao canal e disparo do comunicado de entrada em produção.', 'REL, PAT', 1, 'Canal notificado; plataforma disponível.'],
    ['A14.4', 'Operação assistida do primeiro dia: acompanhamento pedido a pedido, plantão de suporte e fila de dúvidas.', 'SUP, COM, GGL', 5, 'Todo pedido do dia acompanhado; dúvidas respondidas no mesmo dia.'],
    ['A14.5', 'Monitoramento técnico: fila de e-mails, erros, desempenho e auditoria.', 'ADM', 3, 'Sem erro crítico aberto ao fim do dia.'],
  ] },
  { dia: 'D15', onda: 2, foco: 'Estabilização, encerramento do plano e transição para a rotina', itens: [
    ['A15.1', 'Operação assistida do segundo dia, com atenção às revendas que ainda não emitiram pedido.', 'SUP, REL, COM', 5, 'Contato feito com toda revenda sem pedido; motivo registrado.'],
    ['A15.2', 'Conferência do primeiro ciclo financeiro: faturamentos lançados, royalties calculados e cobranças previstas.', 'FIN', 3, 'Fechamento conferido; divergências tratadas.'],
    ['A15.3', 'Revisão da auditoria dos dois primeiros dias: acessos, alterações cadastrais e eventos críticos.', 'ADM, GGL', 2, 'Relatório de auditoria revisado e arquivado.'],
    ['A15.4', 'Reunião de encerramento: resultados, pendências remanescentes com dono e prazo, lições aprendidas.', 'GGL, PAT, todos', 2, 'Ata de encerramento com a lista de pendências e seus donos.'],
    ['A15.5', 'Transição para a rotina: calendário de manutenção cadastral, responsáveis permanentes e nível de serviço do suporte.', 'GGL, ADM, CAD', 2, 'Rotina publicada e aceita pelos responsáveis.'],
  ] },
]

// ── Atividades por funcionalidade ───────────────────────────────────────────
// [funcionalidade, pré-requisito cadastral, configuração/execução, validação, treinamento, dono, dias]
const FUNC = [
  ['Acesso, usuários e permissões',
   'Lista de usuários da Loja, das revendas e dos fornecedores, com perfil e vínculo.',
   'Criar usuários (tela ou planilha), ajustar permissões por perfil, definir a política de primeiro acesso e enviar as credenciais.',
   'Cada perfil entra e enxerga apenas o que lhe cabe; envio de credenciais registrado no log do usuário.',
   'Turma 3 (Loja) · webinars do canal', 'ADM', 'D2, D7'],
  ['Grupo econômico (multi-revenda)',
   'Identificação dos usuários que respondem por mais de uma revenda.',
   'Vincular o usuário às revendas do grupo na carga de usuários.',
   'Troca de contexto sem novo login e visão consolidada do grupo.',
   'Webinar de revendas', 'ADM, REL', 'D7'],
  ['Fornecedores & Contratos',
   'Cadastro de fornecedores higienizado; instrumentos de royalty assinados.',
   'Importar fornecedores por planilha; cadastrar contrato por fornecedor (percentual, vigência, dia acordado, gatilho, parcelas) — contrato não vem por planilha.',
   'Exportação confrontada com a origem; dupla checagem do percentual.',
   'Turma 2 e Turma 3', 'CAD, FIN', 'D4, D5'],
  ['Categorias de produtos',
   'Árvore de categorias aprovada pelo Comercial.',
   'Importar ou cadastrar as categorias antes dos produtos.',
   'Toda categoria ativa aparece no cadastro de produto e no filtro do catálogo.',
   'Turma 3', 'COM, CAD', 'D3, D4'],
  ['Produtos homologados',
   'Descrição padronizada, unidade, preço de referência, categoria e fornecedores.',
   'Importar produtos por planilha (com os fornecedores na própria carga); subir imagens e definir a principal.',
   'Todo produto ativo com imagem, categoria, preço e ao menos um fornecedor.',
   'Turma 3', 'CAD, COM', 'D6'],
  ['De/Para Produto × Fornecedor',
   'Produtos e fornecedores carregados.',
   'Conferir e completar os vínculos — é o que define quem pode ser convidado à cotação e o que cada fornecedor enxerga.',
   'Nenhum produto sem fornecedor; nenhum vínculo em alerta de contrato vencido.',
   'Turma 3', 'COM', 'D6'],
  ['Ficha fiscal do produto',
   'Produtos carregados; NCM e EAN levantados.',
   'Preencher NCM, EAN, pesos e dimensões; o que faltar é solicitado ao fornecedor pela própria plataforma.',
   'Ficha completa nos produtos de maior giro; pendências com prazo.',
   'Turma 2 · webinar de fornecedores', 'FIS', 'D6'],
  ['Revendas e visibilidade do catálogo',
   'Cadastro de revendas higienizado, com e-mail de acesso confirmado.',
   'Importar revendas; confirmar que cada uma enxerga o catálogo inteiro e registrar as exceções desejadas.',
   'Contagem de "Produtos visíveis" igual ao catálogo ativo, salvo exceção aprovada.',
   'Turma 3', 'CAD, COM', 'D7'],
  ['Inventário de estoque',
   'Contagem física na data de corte.',
   'Baixar o modelo com todos os produtos, preencher a posição e lançar — a última carga é o saldo vigente.',
   'Saldo por produto igual à contagem; histórico de lançamento registrado.',
   'Turma 1 e Turma 3', 'CAD', 'D8, D13'],
  ['Pedidos e workflow de 9 etapas',
   'Catálogo, revendas e usuários prontos.',
   'Definir quem recebe e quem rejeita pedido; combinar o padrão de resposta e o prazo interno de análise.',
   'Pedido do ensaio percorre as 9 etapas com trilha completa.',
   'Turma 1 · webinar de revendas', 'COM', 'D11, D12'],
  ['Decisão de atendimento (estoque, envio direto, cotação)',
   'Inventário lançado e De/Para conferido.',
   'Combinar o critério de escolha do caminho e o uso de quantidade parcial por item.',
   'Os três caminhos exercitados no ensaio, inclusive divisão parcial do mesmo item.',
   'Turma 1', 'COM', 'D11'],
  ['Cotações, rodadas e observação ao fornecedor',
   'Fornecedores com e-mail válido e vinculados aos produtos.',
   'Definir o prazo padrão de resposta, o número mínimo de convidados e o padrão da observação enviada em cada rodada.',
   'Cotação com duas rodadas concluída; observação recebida pelo fornecedor por e-mail e na plataforma.',
   'Turma 1 · webinar de fornecedores', 'COM', 'D11'],
  ['Adjudicação e justificativa',
   'Propostas registradas.',
   'Definir a alçada de decisão e a exigência de justificativa quando não se escolhe o menor preço.',
   'Adjudicação por cotação e item a item, com justificativa registrada.',
   'Turma 1', 'COM, GGL', 'D11'],
  ['Aceite comercial da revenda',
   'Negociação concluída.',
   'Combinar o prazo que a revenda tem para aceitar ou recusar e o que acontece na recusa.',
   'Aceite e recusa exercitados; item recusado volta à negociação.',
   'Webinar de revendas', 'COM, REL', 'D11'],
  ['Faturamento e documentos fiscais',
   'Fornecedores treinados; critérios fiscais definidos.',
   'Definir prazo de anexo da nota e do boleto, e os motivos aceitos de recusa de documento.',
   'Nota e boleto anexados, recusa e regularização exercitadas.',
   'Turma 2 · webinar de fornecedores', 'FIS, FIN', 'D11'],
  ['Royalties, fechamento e cobrança',
   'Contratos cadastrados e faturamentos lançados.',
   'Definir a competência de fechamento, o gatilho de vencimento, o parcelamento e o fluxo de comprovante.',
   'Fechamento gerado, cobrança emitida, pagamento registrado com comprovante.',
   'Turma 2', 'FIN', 'D11, D15'],
  ['Conversa por pedido',
   'Pedidos em andamento.',
   'Definir quem responde, em qual prazo, e orientar o canal a usá-la no lugar de e-mail solto.',
   'Conversa aberta e respondida nos dois sentidos durante o piloto.',
   'Turma 1 · ambos os webinars', 'COM, SUP', 'D12'],
  ['Relatórios e exportações',
   'Base carregada.',
   'Definir quem exporta, com que periodicidade e para qual finalidade.',
   'Exportação consolidada gerada e conferida contra a origem.',
   'Turma 3', 'GGL, CAD', 'D8'],
  ['Notificações por e-mail',
   'SMTP configurado e ativo.',
   'Validar remetente, e-mail da Loja e o texto de cada evento antes de ativar para o canal.',
   'Matriz de e-mails validada evento a evento no ensaio.',
   'Turma 3', 'ADM', 'D2, D11'],
  ['Segurança e auditoria',
   'Usuários criados.',
   'Definir quem consulta a auditoria e a periodicidade da revisão.',
   'Auditoria dos dois primeiros dias revisada e arquivada.',
   'Turma 3', 'ADM, GGL', 'D15'],
]

// ── Manutenções cadastrais da Loja ─────────────────────────────────────────
// [cadastro, o que precisa ser feito, origem, como carregar, responsável, critério de aceite, quando]
const CADASTROS_TAB = [
  ['Categorias de produtos',
   'Criar a árvore de grupos do catálogo e inativar o que não for usar. Precede o cadastro de produtos.',
   'Definição do Comercial', 'Planilha (modelo de categorias) ou tela', 'COM, CAD',
   'Todo produto enquadrado numa categoria ativa; nenhum produto em "Outros" sem intenção.', 'D3–D4'],
  ['Fornecedores',
   'Razão social, CNPJ, cidade/UF, e-mail de contato (indispensável para receber cotação), telefone e pessoa de contato.',
   'ERP / cadastro comercial', 'Planilha (modelo de fornecedores) — o CNPJ identifica e evita duplicidade', 'CAD',
   'CNPJ único e válido; 100% com e-mail; contato nomeado.', 'D4'],
  ['Contratos de royalty',
   'Um contrato vigente por fornecedor: percentual, início e fim de vigência, dia acordado de pagamento, gatilho de vencimento e número de parcelas.',
   'Instrumentos assinados', 'Somente pela tela do fornecedor — não entra por planilha, por ser a base do cálculo da cobrança', 'FIN',
   'Percentual conferido por duas pessoas contra o contrato assinado; vigência cobrindo a data do Go Live.', 'D5'],
  ['Produtos homologados',
   'Descrição padronizada, unidade, categoria, preço estimado de referência e fornecedores vinculados.',
   'ERP / tabela de preços', 'Planilha (modelo de produtos), com os fornecedores na própria carga', 'CAD, COM',
   'Todo produto ativo com preço, categoria e ao menos um fornecedor.', 'D6'],
  ['Imagens dos produtos',
   'Ao menos uma imagem por produto ativo e a definição da imagem principal do catálogo.',
   'Banco de imagens da Loja', 'Upload pela tela do produto (não vem por planilha)', 'CAD',
   'Nenhum produto ativo com a imagem genérica no catálogo da revenda.', 'D6'],
  ['Ficha fiscal do produto',
   'NCM, EAN, pesos e dimensões — o que a Loja tiver; o restante é solicitado ao fornecedor.',
   'Fiscal / fornecedor', 'Tela do produto; o fornecedor complementa pela própria plataforma', 'FIS',
   'Ficha completa nos produtos de maior giro; pendências com prazo e responsável.', 'D6'],
  ['De/Para Produto × Fornecedor',
   'Conferir e completar os vínculos: define quem pode ser convidado à cotação, o envio direto e o que cada fornecedor enxerga.',
   'Comercial', 'Tela De/Para; a carga de produtos já cria os vínculos informados', 'COM',
   'Nenhum produto sem fornecedor; nenhum vínculo com contrato vencido.', 'D6'],
  ['Revendas',
   'Razão social, CNPJ, cidade/UF, telefone e e-mail de acesso (login) — um e-mail ativo e monitorado por revenda.',
   'Cadastro comercial', 'Planilha (modelo de revendas)', 'CAD, REL',
   'E-mail de acesso confirmado com a própria revenda antes do envio das credenciais.', 'D7'],
  ['Visibilidade e bloqueio por revenda',
   'Confirmar que cada revenda enxerga o catálogo inteiro (padrão) e registrar por escrito as exceções desejadas.',
   'Comercial', 'Tela de detalhe da revenda', 'COM',
   'Exceções aprovadas e documentadas; demais revendas com catálogo completo.', 'D7'],
  ['Usuários e permissões',
   'Um usuário titular por revenda e por fornecedor, e os usuários da Loja com o perfil e as permissões corretas.',
   'Lista oficial do canal', 'Planilha (modelo de usuários) ou tela; permissões ajustadas na tela', 'ADM',
   'Cada perfil enxerga apenas o que lhe cabe; ao menos um administrador ativo.', 'D2, D7'],
  ['Inventário de estoque',
   'Lançar a posição contada na data de corte; repetir imediatamente antes da virada.',
   'Contagem física', 'Planilha (modelo com todos os produtos) — a última carga passa a ser o saldo', 'CAD',
   'Saldo por produto igual à contagem assinada; lançamento registrado no histórico.', 'D8, D13'],
  ['Configuração de e-mail (SMTP)',
   'Servidor, porta, segurança, usuário, remetente, e-mail da Loja; verificar conexão e enviar teste.',
   'TI', 'Configurações Técnicas', 'ADM',
   'E-mail de teste recebido; envio ativado só depois da validação do conteúdo.', 'D2'],
  ['Configuração da análise fiscal',
   'Critérios de conferência automática do documento fiscal alinhados com o Fiscal.',
   'Fiscal', 'Configurações Técnicas', 'ADM, FIS',
   'Critérios validados com um documento real de exemplo.', 'D2'],
]

// ── Comunicação com o canal ────────────────────────────────────────────────
// [quando, público, canal, objetivo, conteúdo essencial, responsável]
const COMUNICACAO = [
  ['D1', 'Interno — equipe da Loja', 'Reunião presencial + ata',
   'Alinhar objetivo, papéis e calendário.',
   'O que é o Go Live, o que muda na rotina, quem faz o quê, agenda diária de 15 minutos, regra de escalonamento.', 'GGL'],
  ['D5', 'Revendas e fornecedores', 'E-mail institucional assinado pela Diretoria',
   'Anunciar a mudança e criar expectativa positiva.',
   'Por que a plataforma existe, o que melhora para o parceiro, a data prevista de entrada em produção, o compromisso esperado (confirmar dados, participar do treinamento, usar o sistema) e o canal de dúvidas.', 'PAT, REL'],
  ['D5–D7', 'Cada fornecedor, individualmente', 'Telefone + e-mail',
   'Confirmar dados cadastrais e o contato titular.',
   'Conferência de CNPJ, e-mail de contato (é por ele que chega a cotação), telefone e responsável comercial. Aviso de que a cotação passa a ser exclusivamente pela plataforma.', 'REL'],
  ['D5–D7', 'Cada revenda, individualmente', 'Telefone + e-mail',
   'Confirmar dados cadastrais e o e-mail de acesso.',
   'Conferência de CNPJ, cidade, telefone e principalmente o e-mail de login — que precisa ser monitorado por quem compra. Explicação de que o pedido passa a ser pelo catálogo.', 'REL'],
  ['D7', 'Todos os usuários do canal', 'E-mail automático da plataforma',
   'Entregar as credenciais de primeiro acesso.',
   'Nome, e-mail de login, senha inicial, perfil, vínculo e o endereço da plataforma. O envio fica registrado no log do usuário para rastreabilidade.', 'ADM'],
  ['D7', 'Revendas e fornecedores', 'E-mail + mensagem direta',
   'Convidar para o treinamento e orientar o primeiro acesso.',
   'Data e hora do webinar do seu perfil, link de participação, o que fazer no primeiro login e a informação de que a gravação ficará disponível.', 'REL'],
  ['D8 e D13', 'Quem ainda não acessou', 'Telefone (contato ativo)',
   'Garantir a adesão antes da virada.',
   'Apoio individual ao primeiro acesso, reenvio de credenciais e verificação de que o e-mail chegou (inclusive caixa de spam).', 'REL, SUP'],
  ['D10', 'Fornecedores', 'Webinar ao vivo (1 h 30) + gravação',
   'Capacitar no uso e alinhar expectativas comerciais.',
   'Pedidos recebidos, cotações convidadas, proposta por item com frete e condições, anexos, rodadas de negociação e a observação que a Loja envia em cada rodada, faturamento com nota e boleto, royalties devidos.', 'TRE, COM'],
  ['D10', 'Revendas', 'Webinar ao vivo (1 h) + gravação',
   'Capacitar no uso e reduzir o atrito do primeiro pedido.',
   'Catálogo e busca, montagem e envio do pedido, acompanhamento por etapa, aprovação comercial quando houver negociação, documentos do faturamento e a conversa por pedido para dúvidas e ocorrências.', 'TRE, COM'],
  ['D12', 'Participantes do piloto', 'Acompanhamento assistido (telefone aberto)',
   'Conduzir o primeiro pedido real lado a lado.',
   'Acompanhamento em tempo real do pedido, uso da conversa por pedido e coleta imediata do que confundiu.', 'COM, SUP'],
  ['D13', 'Revendas e fornecedores', 'E-mail institucional',
   'Anunciar a data e hora da virada.',
   'Quando o sistema entra no ar, o que fazer no primeiro dia, o que deixa de ser feito pelo caminho antigo, e onde pedir ajuda (canal, horário e tempo de resposta).', 'REL'],
  ['D14', 'Revendas e fornecedores', 'E-mail + mensagem direta',
   'Abrir oficialmente a operação.',
   'Sistema disponível, link de acesso, guia rápido, gravação do treinamento e plantão de suporte com nome e telefone.', 'REL, PAT'],
  ['D15', 'Revendas sem pedido e fornecedores sem acesso', 'Telefone (contato ativo)',
   'Não deixar ninguém para trás no primeiro ciclo.',
   'Identificar o motivo (dificuldade técnica, dúvida, resistência) e resolver na hora ou registrar com prazo.', 'REL, SUP'],
  ['D15', 'Interno + canal', 'E-mail de encerramento',
   'Encerrar o projeto e abrir a rotina.',
   'Resultado dos dois primeiros dias, pendências com dono e prazo, e como passa a funcionar o suporte na rotina.', 'GGL'],
]

// ── Treinamento ────────────────────────────────────────────────────────────
// [turma, público, quando, duração, formato, conteúdo, material, avaliação]
const TREINO = [
  ['Capacitação de carga', 'Equipe de cadastros da Loja (CAD, COM, FIN, FIS)', 'D2', '3 h', 'Presencial, mão na massa em homologação',
   'Telas de cadastro; download dos modelos de planilha; leitura da prévia da importação (novo, atualiza, erro); correção e recarga; exportação para conferência.',
   'Modelos de planilha da própria plataforma; base de exercício.',
   'Cada participante executa uma importação completa sem apoio.'],
  ['Turma 1 — Operação', 'Loja: compras, comercial e gestão', 'D9', '4 h', 'Presencial com exercícios em homologação',
   'Recebimento e rejeição de pedido; decisão de atendimento pelos três caminhos; quantidade parcial por item; abertura de cotação com observação aos fornecedores; rodadas de negociação; mapa comparativo; adjudicação por cotação e item a item com justificativa; conversa por pedido; inventário de estoque.',
   'Apostila com telas reais; roteiro de 12 exercícios; guia rápido de 1 página.',
   'Exercício prático avaliado: conduzir um pedido do recebimento à adjudicação.'],
  ['Turma 2 — Financeiro e Fiscal', 'Loja: financeiro, controladoria e fiscal', 'D9', '3 h', 'Presencial com exercícios em homologação',
   'Faturamento pelo fornecedor; conferência de nota e boleto; recusa de documento fiscal com motivo e regularização; fechamento de royalties por competência; emissão de cobrança, vencimento e parcelas; registro de pagamento e comprovante; relatório de recebíveis.',
   'Apostila fiscal e financeira; casos de recusa e de fechamento.',
   'Exercício avaliado: fechar uma competência e emitir a cobrança.'],
  ['Turma 3 — Cadastros e administração', 'Loja: cadastros, TI e administradores', 'D9', '2 h', 'Presencial com exercícios em homologação',
   'Manutenção cadastral na rotina; importação e exportação de todos os cadastros; usuários, perfis e permissões; envio e reenvio de credenciais; visibilidade de catálogo por revenda; segurança e auditoria; configurações técnicas.',
   'Checklist de manutenção cadastral; matriz de permissões.',
   'Exercício avaliado: criar um usuário, ajustar uma permissão e importar um cadastro.'],
  ['Webinar de fornecedores', 'Responsáveis comerciais dos fornecedores', 'D10', '1 h 30', 'Online, ao vivo, com gravação',
   'Primeiro acesso e troca de senha; pedidos recebidos; cotações convidadas; proposta com preço por item, frete, condições e anexos; rodadas de negociação e a observação enviada pela Loja; complementação da ficha fiscal; faturamento com nota e boleto; royalties devidos.',
   'Guia rápido do fornecedor (1 página); gravação publicada em link permanente.',
   'Cotação-ensaio respondida em homologação por cada fornecedor.'],
  ['Webinar de revendas', 'Responsáveis de compras das revendas', 'D10', '1 h', 'Online, ao vivo, com gravação',
   'Primeiro acesso e troca de senha; catálogo, busca e filtros; montagem e envio do pedido; acompanhamento pelas etapas; aprovação comercial quando houver negociação; documentos do faturamento; conversa por pedido para dúvidas e ocorrências; troca de contexto para grupos econômicos.',
   'Guia rápido da revenda (1 página); gravação publicada em link permanente.',
   'Pedido-ensaio emitido em homologação por cada revenda.'],
  ['Sessões individuais', 'Ausentes e parceiros com baixa familiaridade digital', 'D10–D13', '30 min cada', 'Online ou telefone, individual',
   'Repetição do conteúdo essencial do perfil, com o parceiro operando a tela junto do instrutor.',
   'Mesmo guia rápido; roteiro reduzido de 5 passos.',
   'Primeiro acesso concluído e uma operação executada pelo próprio parceiro.'],
]

// ── Critérios de Go/No-Go ──────────────────────────────────────────────────
const GONOGO = [
  ['Cadastro', 'Fornecedores, contratos vigentes, categorias, produtos, De/Para, revendas e usuários carregados e conferidos por exportação.', 'Bloqueante'],
  ['Cadastro', 'Todo produto ativo com preço, categoria, imagem e ao menos um fornecedor vinculado.', 'Bloqueante'],
  ['Cadastro', 'Inventário de estoque lançado com a posição do dia da virada.', 'Bloqueante'],
  ['Financeiro', 'Contrato de royalty vigente para 100% dos fornecedores ativos, com percentual conferido por duas pessoas.', 'Bloqueante'],
  ['Técnico', 'SMTP ativo, remetente validado e matriz de notificações conferida evento a evento.', 'Bloqueante'],
  ['Técnico', 'Backup íntegro com restauração testada e plano de rollback com responsável nomeado.', 'Bloqueante'],
  ['Qualidade', 'Casos críticos do roteiro de aceitação aprovados; nenhum defeito bloqueante em aberto.', 'Bloqueante'],
  ['Qualidade', 'Ensaio ponta a ponta concluído e piloto com ao menos um pedido real faturado.', 'Bloqueante'],
  ['Pessoas', 'Equipe da Loja treinada, com presença registrada e exercício avaliado.', 'Bloqueante'],
  ['Canal', 'Meta de primeiro acesso atingida pelo canal, ou exceções aprovadas pelo patrocinador com plano de apoio.', 'Bloqueante'],
  ['Canal', 'Comunicado da data de virada enviado a 100% da lista oficial.', 'Bloqueante'],
  ['Suporte', 'Plantão de hypercare escalado, com nome, telefone e horário publicados ao canal.', 'Bloqueante'],
  ['Canal', 'Gravações e guias rápidos publicados em link permanente.', 'Desejável'],
  ['Cadastro', 'Ficha fiscal completa em todos os produtos (e não apenas nos de maior giro).', 'Desejável'],
]

// ── Riscos ─────────────────────────────────────────────────────────────────
const RISCOS = [
  ['Dado cadastral sujo na origem (CNPJ, e-mail, unidade)', 'Alta', 'Alto',
   'Higienização dedicada em D3 antes de qualquer carga; prévia da importação lida linha a linha; conferência por exportação em D4, D6, D7 e D8.',
   'Corrigir a planilha e recarregar — a importação atualiza pelo CNPJ e não duplica.', 'CAD'],
  ['Revenda ou fornecedor não faz o primeiro acesso', 'Alta', 'Alto',
   'Confirmação individual do e-mail antes do envio; painel de adesão a partir de D7; contato ativo em D8 e D13.',
   'Sessão individual de 30 min e reenvio de credenciais; exceções aprovadas pelo patrocinador com plano de apoio.', 'REL'],
  ['E-mail da plataforma cair em spam ou ser bloqueado', 'Média', 'Alto',
   'Validação do remetente e do SMTP em D2; teste com um endereço de cada domínio relevante do canal.',
   'Orientar a liberação do remetente; comunicar por telefone enquanto não normaliza.', 'ADM'],
  ['Percentual de royalty cadastrado errado', 'Média', 'Muito alto',
   'Dupla checagem contra o contrato assinado em D5, com assinatura dos dois conferentes; exportação arquivada.',
   'Correção imediata e recálculo do fechamento antes da emissão da cobrança.', 'FIN'],
  ['Defeito bloqueante descoberto no ensaio ou no piloto', 'Média', 'Alto',
   'Ensaio completo em D11 e piloto em D12, com folga de D13 para correção e reteste.',
   'Fila priorizada com a equipe de desenvolvimento; se não houver correção, No-Go com nova data.', 'GGL, DEV'],
  ['Resistência à mudança no canal', 'Média', 'Médio',
   'Comunicado da Diretoria em D5 explicando o ganho para o parceiro; treinamento com gravação; piloto com parceiros de maior abertura.',
   'Acompanhamento assistido individual e escalonamento comercial.', 'PAT, REL'],
  ['Equipe da Loja sobrecarregada com a rotina normal', 'Alta', 'Médio',
   'Alocação declarada por recurso neste plano; carga cadastral concentrada na Onda 2 e agenda diária de 15 minutos.',
   'Repriorizar atividades desejáveis para depois do Go Live.', 'GGL'],
  ['Posição de estoque desatualizada na virada', 'Média', 'Médio',
   'Novo lançamento de inventário em D13, imediatamente antes da virada.',
   'Novo lançamento no primeiro dia; a última carga sempre prevalece como saldo.', 'CAD'],
]

// ── Hypercare ──────────────────────────────────────────────────────────────
const HYPERCARE = [
  ['Plantão de suporte', 'D14 e D15, das 8h às 18h', 'SUP, COM', 'Fila única de dúvidas com registro de quem pediu, o quê e como foi resolvido.'],
  ['Acompanhamento pedido a pedido', 'D14 e D15', 'COM, GGL', 'Todo pedido do dia acompanhado até a decisão de atendimento; nada dorme pendente.'],
  ['Monitoramento técnico', 'D14 e D15', 'ADM', 'Erros, desempenho, fila de e-mails e auditoria revisados ao fim de cada dia.'],
  ['Conferência financeira', 'D15', 'FIN', 'Faturamentos, royalties e cobranças do primeiro ciclo conferidos.'],
  ['Ponto de controle diário', 'D14 e D15, às 17h', 'GGL + todos', 'Quinze minutos: o que aconteceu, o que travou, o que muda amanhã.'],
]

// ── Cálculos ───────────────────────────────────────────────────────────────
const TOTAL_ATIV = CRONO.reduce((a, d) => a + d.itens.length, 0)
const TOTAL_H = CRONO.reduce((a, d) => a + d.itens.reduce((b, i) => b + i[3], 0), 0)
const horasPorDia = CRONO.map((d) => ({ dia: d.dia, h: d.itens.reduce((b, i) => b + i[3], 0), n: d.itens.length }))
const maxH = Math.max(...horasPorDia.map((d) => d.h))

// Atividades por recurso, derivadas do cronograma (fonte única)
const porRecurso = {}
CRONO.forEach((d) => d.itens.forEach((it) => {
  it[2].split(',').map((s) => s.trim()).filter((s) => /^[A-Z]{3}$/.test(s)).forEach((sig) => {
    ;(porRecurso[sig] = porRecurso[sig] || []).push({ dia: d.dia, id: it[0], atv: it[1], h: it[3] })
  })
}))
const SIGLAS = EQUIPE.map((e) => e[0]).filter((s) => porRecurso[s])

// ── HTML ───────────────────────────────────────────────────────────────────
const chip = (t, bg, fg) => `<span style="display:inline-block;font-size:8.5px;font-weight:700;letter-spacing:.04em;background:${bg};color:${fg};border-radius:10px;padding:2px 8px;white-space:nowrap">${esc(t)}</span>`

const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><style>
  @page { size: A4; margin: 0; }
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:'Segoe UI',Arial,sans-serif; color:#272525; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
  .capa { height:296.5mm; position:relative; background:radial-gradient(900px 520px at 72% -12%, #3a2f1c, #272525 55%, #1c1a18); page-break-after:always; }
  .miolo { padding:13mm 14mm; }
  .sec { font-size:12.5px; font-weight:800; letter-spacing:.13em; color:#B38335; margin:16px 0 8px; break-after:avoid; }
  .sec:first-child { margin-top:0; }
  h2 { font-size:15px; font-weight:800; color:#fff; background:linear-gradient(135deg,#3a3227,#272525); border-radius:9px; padding:9px 13px; margin:14px 0 8px; break-after:avoid; }
  p { font-size:11px; color:#4a453d; line-height:1.55; margin:5px 0; }
  .bloco { border:1px solid #eae3d6; border-radius:10px; background:#fffdf9; padding:10px 12px; margin:8px 0; break-inside:avoid; }
  table { width:100%; border-collapse:collapse; margin:6px 0 10px; font-size:9.5px; }
  th { text-align:left; background:#272525; color:#e3bf7e; padding:6px 7px; font-size:8.5px; text-transform:uppercase; letter-spacing:.05em; font-weight:700; }
  td { padding:5px 7px; border-bottom:1px solid #eee7d8; color:#4a453d; vertical-align:top; line-height:1.45; }
  tr:nth-child(even) td { background:#faf7f0; }
  tr { break-inside:avoid; }
  .id { font-family:Consolas,monospace; font-weight:700; color:#8f682a; white-space:nowrap; }
  .dia { break-inside:avoid; border:1px solid #eae3d6; border-radius:10px; margin-bottom:9px; overflow:hidden; }
  .dia-head { display:flex; align-items:center; gap:10px; padding:7px 12px; border-bottom:1px solid #f1ece2; }
  .dia-num { font-family:Consolas,monospace; font-size:13px; font-weight:800; color:#fff; border-radius:7px; padding:3px 10px; flex:none; }
  .dia-foco { font-size:11.5px; font-weight:700; color:#272525; flex:1; }
  .dia-h { font-size:9px; color:#a89f90; white-space:nowrap; }
  .dia table { margin:0; }
  .dia td { border-bottom:1px solid #f5f1e8; }
  .onda { break-inside:avoid; border-radius:10px; padding:10px 13px; margin-bottom:8px; }
  .kpi { display:flex; gap:8px; margin:8px 0 12px; }
  .kpi > div { flex:1; border:1px solid #eae3d6; border-radius:9px; padding:9px 11px; background:#fffdf9; }
  .kpi b { display:block; font-size:20px; color:#B38335; font-weight:800; }
  .kpi span { font-size:9px; color:#8a8378; line-height:1.4; display:block; margin-top:2px; }
  .barra { height:9px; background:#f1ece2; border-radius:5px; overflow:hidden; }
  .barra > div { height:100%; background:linear-gradient(90deg,#cfa055,#B38335); }
  .nota { font-size:9.5px; color:#8a8378; line-height:1.5; margin-top:4px; }
  .ok { color:#2f6b39; font-weight:700; }
  .bloq { color:#a33a2b; font-weight:700; }
</style></head><body>

<div class="capa">
  <div style="position:absolute;left:16mm;top:18mm;display:flex;align-items:center;gap:14px">
    <div style="width:50px;height:50px;border-radius:13px;background:linear-gradient(135deg,#cfa055,#B38335 55%,#8a6428);display:flex;align-items:center;justify-content:center;font-family:Georgia,serif;font-weight:700;font-size:21px;color:#fff">CI</div>
    <div><div style="font-family:Georgia,serif;font-weight:700;font-size:15px;letter-spacing:.14em;color:#fff">CIDADE IMPERIAL</div>
    <div style="font-size:10.5px;letter-spacing:.16em;color:#e3bf7e;margin-top:3px">PLATAFORMA DA LOJA</div></div>
  </div>
  <div style="position:absolute;left:16mm;right:16mm;top:70mm">
    <div style="font-size:13px;font-weight:700;letter-spacing:.18em;color:#e3bf7e;margin-bottom:12px">IMPLANTAÇÃO · ENTRADA EM PRODUÇÃO</div>
    <div style="font-size:42px;font-weight:800;color:#fff;line-height:1.08;letter-spacing:-.5px">Plano de Go Live</div>
    <div style="font-size:15px;color:#c9c1b4;margin-top:16px;line-height:1.6;max-width:158mm">Plano completo de entrada em produção da Plataforma Cidade Imperial, dimensionado para <b style="color:#fff">15 dias úteis</b>: ${TOTAL_ATIV} atividades distribuídas dia a dia, detalhadas por recurso e por funcionalidade, com as manutenções cadastrais a cargo da Loja, o plano de comunicação com revendas e fornecedores e o plano de treinamento das três audiências.</div>
  </div>
  <div style="position:absolute;left:16mm;right:16mm;top:150mm;display:flex;gap:10px">
    ${ONDAS.map((o, i) => `<div style="flex:1;background:#ffffff10;border:1px solid #ffffff22;border-radius:10px;padding:11px 13px">
      <div style="font-size:9.5px;font-weight:700;letter-spacing:.1em;color:#e3bf7e">${esc(o[1])}</div>
      <div style="font-size:12.5px;font-weight:700;color:#fff;margin:3px 0 5px">${esc(o[0].split('· ')[1])}</div>
      <div style="font-size:9px;color:#b9b0a2;line-height:1.5">${esc(CAPA_ONDAS[i])}</div></div>`).join('')}
  </div>
  <div style="position:absolute;left:16mm;right:16mm;bottom:36mm;display:flex;gap:6px;flex-wrap:wrap">
    ${['Ambiente e configurações técnicas', 'Manutenção cadastral completa', 'Contratos de royalty', 'Inventário de estoque', 'Comunicação com o canal', 'Treinamento em 7 turmas', 'Ensaio ponta a ponta', 'Piloto assistido', 'Go/No-Go', 'Operação assistida'].map((x) => `<div style="background:#ffffff10;border:1px solid #ffffff22;border-radius:8px;padding:5px 9px;font-size:9px;color:#e8e2d6">${esc(x)}</div>`).join('')}
  </div>
  <div style="position:absolute;left:16mm;bottom:18mm;right:16mm;font-size:10px;color:#8a8378;line-height:1.6">Documento de planejamento · Cervejaria Cidade Imperial · A duração é expressa em dias úteis (D1 a D15), sem data de início fixada — o calendário é ancorado na data que a Diretoria definir.</div>
</div>

<div class="miolo">

  <div class="sec">1 · OBJETIVO, ESCOPO E PREMISSAS</div>
  <div class="bloco">
    <p><b>Objetivo.</b> Colocar a Plataforma Cidade Imperial em produção com a base cadastral completa e conferida, o canal (revendas e fornecedores) treinado e acessando, e a operação da Loja capaz de conduzir o ciclo inteiro — do pedido ao fechamento de royalties — sem apoio externo permanente.</p>
    <p><b>Escopo.</b> Estão no plano: configuração técnica, carga e conferência de todos os cadastros, contratos de royalty, inventário de estoque, comunicação e engajamento do canal, treinamento das três audiências, ensaio ponta a ponta, piloto assistido, decisão de Go/No-Go, virada e dois dias de operação assistida.</p>
    <p><b>Fora do escopo.</b> Desenvolvimento de novas funcionalidades (escopo congelado em D1), integração automática com o ERP e migração de histórico de pedidos anteriores — o histórico permanece no sistema de origem para consulta.</p>
    <p><b>Premissa de calendário.</b> Os 15 dias são <b>dias úteis</b> (D1 a D15), equivalentes a três semanas de calendário. Não há data de início fixada: o plano é ancorado no dia em que a Diretoria autorizar o início. Recomenda-se que D14 (virada) não caia em véspera de feriado nem em sexta-feira, para que a operação assistida cubra dois dias úteis cheios.</p>
    <p><b>Premissas de recurso.</b> As alocações declaradas na seção 2 são compromisso de agenda: sem elas, as cargas da Onda 2 não cabem no período. O ambiente de homologação fica disponível durante todo o plano, separado da produção e sem enviar e-mail ao canal.</p>
  </div>

  <div class="kpi">
    <div><b>15</b><span>dias úteis, de D1 a D15</span></div>
    <div><b>${TOTAL_ATIV}</b><span>atividades no cronograma</span></div>
    <div><b>${TOTAL_H} h</b><span>de esforço somado no período</span></div>
    <div><b>${SIGLAS.length}</b><span>recursos com atividade nominal</span></div>
    <div><b>7</b><span>turmas de treinamento</span></div>
  </div>

  <div class="sec">2 · RECURSOS, PAPÉIS E ALOCAÇÃO</div>
  <table>
    <tr><th style="width:6%">Sigla</th><th style="width:17%">Papel</th><th style="width:14%">Origem</th><th>Responsabilidade no Go Live</th><th style="width:13%">Alocação</th></tr>
    ${EQUIPE.map((e) => `<tr><td class="id">${esc(e[0])}</td><td><b>${esc(e[1])}</b></td><td>${esc(e[2])}</td><td>${esc(e[3])}</td><td>${esc(e[4])}</td></tr>`).join('')}
  </table>
  <div class="nota">As siglas são usadas em todo o documento para identificar o responsável de cada atividade. Onde há mais de uma sigla, a primeira é a responsável pela entrega; as demais participam.</div>

  <div class="sec">3 · ESTRUTURA EM TRÊS ONDAS</div>
  ${ONDAS.map((o) => `<div class="onda" style="background:${o[4]};border:1px solid ${o[3]}33">
    <div style="display:flex;align-items:baseline;gap:10px;margin-bottom:3px">
      <span style="font-size:13px;font-weight:800;color:${o[3]}">${esc(o[0])}</span>
      <span style="font-family:Consolas,monospace;font-size:11px;font-weight:700;color:${o[3]}">${esc(o[1])}</span>
    </div>
    <div style="font-size:10.5px;color:#4a453d;line-height:1.55">${esc(o[2])}</div></div>`).join('')}

  <div style="page-break-before:always"></div>
  <div class="sec">4 · CRONOGRAMA DIA A DIA (D1 – D15)</div>
  <p>Cada dia traz o foco, as atividades com responsável, o esforço estimado e o critério objetivo de conclusão. O esforço é somado entre todos os envolvidos — atividades do mesmo dia correm em paralelo entre recursos diferentes.</p>
  ${CRONO.map((d) => {
    const o = ONDAS[d.onda]
    const h = d.itens.reduce((a, i) => a + i[3], 0)
    return `<div class="dia">
      <div class="dia-head" style="background:${o[4]}">
        <span class="dia-num" style="background:${o[3]}">${esc(d.dia)}</span>
        <span class="dia-foco">${esc(d.foco)}</span>
        <span class="dia-h">${d.itens.length} atividades · ${h} h · ${esc(o[0].split(' ·')[0])}</span>
      </div>
      <table>
        <tr><th style="width:5%">#</th><th style="width:41%">Atividade</th><th style="width:13%">Responsável</th><th style="width:5%">Esforço</th><th>Critério de conclusão</th></tr>
        ${d.itens.map((i) => `<tr><td class="id">${esc(i[0])}</td><td>${esc(i[1])}</td><td>${esc(i[2])}</td><td style="white-space:nowrap">${i[3]} h</td><td>${esc(i[4])}</td></tr>`).join('')}
      </table>
    </div>`
  }).join('')}

  <div class="bloco">
    <div style="font-size:11.5px;font-weight:800;margin-bottom:6px">Distribuição do esforço ao longo dos 15 dias</div>
    ${horasPorDia.map((d) => {
      const o = ONDAS[CRONO.find((c) => c.dia === d.dia).onda]
      return `<div style="display:flex;align-items:center;gap:8px;margin:3px 0">
        <span style="font-family:Consolas,monospace;font-size:9.5px;font-weight:700;color:${o[3]};width:24px">${esc(d.dia)}</span>
        <div class="barra" style="flex:1"><div style="width:${Math.round((d.h / maxH) * 100)}%;background:${o[3]}"></div></div>
        <span style="font-size:9px;color:#8a8378;width:64px;text-align:right">${d.h} h · ${d.n} atv.</span>
      </div>`
    }).join('')}
    <div class="nota">A carga é deliberadamente maior na Onda 2, quando ocorrem as cargas cadastrais e os treinamentos, e cai na Onda 3 para deixar folga de correção entre o piloto (D12) e a virada (D14).</div>
  </div>

  <div style="page-break-before:always"></div>
  <div class="sec">5 · ATIVIDADES POR RECURSO</div>
  <p>A mesma lista da seção 4, reorganizada por quem executa. Serve para cada pessoa enxergar o próprio compromisso e para a checagem de sobrecarga.</p>
  ${SIGLAS.map((s) => {
    const e = EQUIPE.find((x) => x[0] === s)
    const its = porRecurso[s]
    const tot = its.reduce((a, i) => a + i.h, 0)
    return `<div class="dia">
      <div class="dia-head" style="background:#faf7f0">
        <span class="dia-num" style="background:#8f682a">${esc(s)}</span>
        <span class="dia-foco">${esc(e[1])}</span>
        <span class="dia-h">${its.length} atividades · até ${tot} h de participação</span>
      </div>
      <table>
        <tr><th style="width:7%">Dia</th><th style="width:7%">#</th><th>Atividade</th><th style="width:8%">Esforço</th></tr>
        ${its.map((i) => `<tr><td class="id">${esc(i.dia)}</td><td class="id">${esc(i.id)}</td><td>${esc(i.atv)}</td><td style="white-space:nowrap">${i.h} h</td></tr>`).join('')}
      </table>
    </div>`
  }).join('')}
  <div class="nota">O total por recurso conta a participação em atividades compartilhadas, por isso a soma das colunas é maior que o esforço líquido do projeto. Reuniões e treinamentos aparecem para todos os participantes.</div>

  <div style="page-break-before:always"></div>
  <div class="sec">6 · ATIVIDADES POR FUNCIONALIDADE</div>
  <p>O que precisa estar pronto, configurado, validado e treinado em cada funcionalidade da plataforma antes da virada.</p>
  <table>
    <tr><th style="width:15%">Funcionalidade</th><th style="width:18%">Pré-requisito cadastral</th><th style="width:22%">Configuração / execução</th><th style="width:20%">Como validar</th><th style="width:14%">Treinamento</th><th style="width:5%">Dono</th><th style="width:6%">Dias</th></tr>
    ${FUNC.map((f) => `<tr><td><b>${esc(f[0])}</b></td><td>${esc(f[1])}</td><td>${esc(f[2])}</td><td>${esc(f[3])}</td><td>${esc(f[4])}</td><td class="id">${esc(f[5])}</td><td class="id">${esc(f[6])}</td></tr>`).join('')}
  </table>

  <div style="page-break-before:always"></div>
  <div class="sec">7 · MANUTENÇÕES CADASTRAIS A CARGO DA LOJA</div>
  <p>Tudo o que a Loja Cidade Imperial precisa cadastrar ou manter dentro do sistema antes da virada. A ordem importa: categorias antes de produtos; fornecedores antes de produtos e contratos; produtos antes do De/Para e do inventário; revendas antes dos usuários do canal.</p>
  <table>
    <tr><th style="width:13%">Cadastro</th><th style="width:26%">O que precisa ser feito</th><th style="width:11%">Origem do dado</th><th style="width:18%">Como carregar</th><th style="width:6%">Resp.</th><th style="width:20%">Critério de aceite</th><th style="width:6%">Quando</th></tr>
    ${CADASTROS_TAB.map((c) => `<tr><td><b>${esc(c[0])}</b></td><td>${esc(c[1])}</td><td>${esc(c[2])}</td><td>${esc(c[3])}</td><td class="id">${esc(c[4])}</td><td>${esc(c[5])}</td><td class="id">${esc(c[6])}</td></tr>`).join('')}
  </table>
  <div class="bloco">
    <div style="font-size:11.5px;font-weight:800;margin-bottom:5px">Regras de carga que evitam retrabalho</div>
    <p>• <b>Sempre a partir do modelo da própria plataforma.</b> Baixe o modelo em branco (ou com os dados atuais) na tela do cadastro e preencha sobre ele, sem renomear colunas — o cabeçalho é o que identifica cada campo na importação.</p>
    <p>• <b>Leia a prévia antes de gravar.</b> A importação mostra linha a linha o que é novo, o que atualiza um registro existente e o que está em erro. Nada é gravado antes da confirmação, e as linhas com erro são ignoradas.</p>
    <p>• <b>A chave evita duplicidade.</b> Fornecedor e revenda são identificados pelo CNPJ, produto pelo código, categoria pelo nome e usuário pelo e-mail: reimportar o mesmo arquivo atualiza, não duplica.</p>
    <p>• <b>Confira sempre por exportação.</b> Depois de cada carga, exporte o cadastro e confronte com a origem — é mais rápido do que conferir na tela e produz a evidência do que foi carregado.</p>
    <p>• <b>Contrato de royalty é sempre manual.</b> Ele calcula a cobrança e tem vigência e histórico, por isso não entra por planilha. Cadastre um a um e confira o percentual com uma segunda pessoa.</p>
    <p>• <b>Imagens e ficha fiscal não vêm por planilha.</b> As imagens são enviadas na tela do produto; a ficha fiscal pode ser complementada pelo próprio fornecedor dentro da plataforma.</p>
    <p>• <b>O inventário é posição, não movimento.</b> A última planilha lançada passa a ser o saldo em estoque. Por isso ele é relançado em D13, com a posição mais recente antes da virada.</p>
  </div>

  <div style="page-break-before:always"></div>
  <div class="sec">8 · COMUNICAÇÃO E ALINHAMENTO COM REVENDAS E FORNECEDORES</div>
  <p>O canal precisa saber, com antecedência e sem ambiguidade, o que muda, quando muda e o que se espera dele. A comunicação é planejada em ondas, com contato individual nos pontos em que a adesão depende de uma pessoa específica.</p>
  <table>
    <tr><th style="width:8%">Quando</th><th style="width:16%">Público</th><th style="width:16%">Canal</th><th style="width:18%">Objetivo</th><th>Conteúdo essencial</th><th style="width:6%">Resp.</th></tr>
    ${COMUNICACAO.map((c) => `<tr><td class="id">${esc(c[0])}</td><td><b>${esc(c[1])}</b></td><td>${esc(c[2])}</td><td>${esc(c[3])}</td><td>${esc(c[4])}</td><td class="id">${esc(c[5])}</td></tr>`).join('')}
  </table>
  <div class="bloco">
    <div style="font-size:11.5px;font-weight:800;margin-bottom:5px">Pontos de alinhamento que precisam ficar explícitos com o canal</div>
    <p><b>Com os fornecedores.</b> A cotação passa a ser exclusivamente pela plataforma, com prazo de resposta declarado em cada convite; a proposta é por item, com frete e condições comerciais separados; pode haver mais de uma rodada de negociação, e em cada rodada a Loja escreve o que espera que melhore; a nota fiscal e o boleto são anexados na própria plataforma, e um documento pode ser recusado com motivo, exigindo reenvio; o royalty devido fica visível ao fornecedor. É preciso confirmar qual e-mail recebe as cotações — sem ele, o fornecedor simplesmente não é convidado.</p>
    <p><b>Com as revendas.</b> O pedido passa a ser feito pelo catálogo da plataforma, e não mais por e-mail, telefone ou aplicativo de mensagens; o acompanhamento é por etapa, na própria tela; quando houver negociação, a revenda precisa dar a aprovação comercial para o pedido seguir; dúvidas, ocorrências e observações devem ir para a conversa do próprio pedido, que fica registrada junto dele; os documentos do faturamento ficam disponíveis para download. É preciso confirmar qual e-mail é o login — ele precisa ser monitorado por quem efetivamente compra.</p>
    <p><b>Com os dois.</b> Quem é o ponto de contato da Loja, em qual horário e com qual prazo de resposta; o que fazer se o e-mail de acesso não chegar; e a data a partir da qual o caminho antigo deixa de ser aceito. Essa última informação é a que mais reduz retrabalho — sem uma data firme, o canal mantém os dois caminhos e a operação fica dobrada.</p>
  </div>

  <div style="page-break-before:always"></div>
  <div class="sec">9 · PLANO DE TREINAMENTO</div>
  <p>Sete turmas, três audiências. A equipe da Loja é treinada antes do canal, para conseguir apoiar as dúvidas dos parceiros. Toda turma tem exercício prático em homologação — ninguém é considerado treinado apenas por ter assistido.</p>
  ${TREINO.map((t) => `<div class="dia">
    <div class="dia-head" style="background:#faf7f0">
      <span class="dia-num" style="background:#5d3f96">${esc(t[2])}</span>
      <span class="dia-foco">${esc(t[0])} — ${esc(t[1])}</span>
      <span class="dia-h">${esc(t[3])} · ${esc(t[4])}</span>
    </div>
    <table>
      <tr><td style="width:14%"><b>Conteúdo</b></td><td>${esc(t[5])}</td></tr>
      <tr><td><b>Material</b></td><td>${esc(t[6])}</td></tr>
      <tr><td><b>Avaliação</b></td><td>${esc(t[7])}</td></tr>
    </table>
  </div>`).join('')}
  <div class="bloco">
    <div style="font-size:11.5px;font-weight:800;margin-bottom:5px">Regras do treinamento</div>
    <p>• Todo treinamento acontece no <b>ambiente de homologação</b>, com dados reais já carregados e sem disparar e-mail para o canal.</p>
    <p>• Toda turma tem <b>lista de presença</b> e <b>exercício avaliado</b>; quem não atingir o critério faz uma sessão individual antes da virada.</p>
    <p>• Os webinars do canal são <b>gravados e publicados em link permanente</b>, junto do guia rápido de uma página do respectivo perfil.</p>
    <p>• As dúvidas coletadas nas turmas viram <b>FAQ</b> — publicado internamente para a Loja e resumido no guia rápido do canal.</p>
    <p>• O material usa <b>telas reais com os dados da Cidade Imperial</b>, não exemplos genéricos: o reconhecimento do próprio produto e do próprio fornecedor encurta o aprendizado.</p>
  </div>

  <div style="page-break-before:always"></div>
  <div class="sec">10 · CRITÉRIOS DE GO / NO-GO (D14)</div>
  <p>A decisão é formal, tomada pelo patrocinador com base neste checklist. Qualquer item bloqueante não atendido é motivo de No-Go e de reprogramação da virada — a decisão fica registrada em ata.</p>
  <table>
    <tr><th style="width:12%">Frente</th><th>Critério</th><th style="width:12%">Natureza</th><th style="width:10%">Atendido</th></tr>
    ${GONOGO.map((g) => `<tr><td><b>${esc(g[0])}</b></td><td>${esc(g[1])}</td><td class="${g[2] === 'Bloqueante' ? 'bloq' : 'ok'}">${esc(g[2])}</td><td style="text-align:center">☐ Sim  ☐ Não</td></tr>`).join('')}
  </table>
  <div class="nota">Decisão: ☐ GO — virada autorizada  ·  ☐ GO condicionado (listar as ressalvas e seus prazos)  ·  ☐ NO-GO — nova data: ____/____/______<br><br>Patrocinador: ______________________________________  ·  Gestor do Go Live: ______________________________________  ·  Data: ____/____/______</div>

  <div class="sec">11 · RISCOS E CONTINGÊNCIAS</div>
  <table>
    <tr><th style="width:19%">Risco</th><th style="width:7%">Prob.</th><th style="width:7%">Impacto</th><th style="width:29%">Prevenção (já embutida no plano)</th><th>Contingência</th><th style="width:6%">Dono</th></tr>
    ${RISCOS.map((r) => `<tr><td><b>${esc(r[0])}</b></td><td>${esc(r[1])}</td><td>${esc(r[2])}</td><td>${esc(r[3])}</td><td>${esc(r[4])}</td><td class="id">${esc(r[5])}</td></tr>`).join('')}
  </table>

  <div class="sec">12 · OPERAÇÃO ASSISTIDA (HYPERCARE) E TRANSIÇÃO PARA A ROTINA</div>
  <table>
    <tr><th style="width:22%">Frente</th><th style="width:20%">Quando</th><th style="width:10%">Resp.</th><th>Como funciona</th></tr>
    ${HYPERCARE.map((h) => `<tr><td><b>${esc(h[0])}</b></td><td>${esc(h[1])}</td><td class="id">${esc(h[2])}</td><td>${esc(h[3])}</td></tr>`).join('')}
  </table>
  <div class="bloco">
    <div style="font-size:11.5px;font-weight:800;margin-bottom:5px">Rotina permanente a partir de D15</div>
    <p>• <b>Manutenção cadastral.</b> Produto, fornecedor e revenda novos entram assim que existirem — o catálogo é atualizado para todas as revendas automaticamente. Contrato de royalty é revisto na renovação da vigência.</p>
    <p>• <b>Inventário.</b> Lançar a posição de estoque na periodicidade que a Loja definir (semanal é o mínimo recomendado), lembrando que a última carga é sempre o saldo vigente.</p>
    <p>• <b>Acessos.</b> Revisão trimestral de usuários ativos e permissões; desligamento imediato de quem sai do canal.</p>
    <p>• <b>Auditoria.</b> Revisão mensal dos eventos críticos, com atenção a alterações de percentual de royalty e a falhas de login.</p>
    <p>• <b>Suporte.</b> Canal único com prazo de resposta declarado; dúvidas recorrentes viram FAQ e entram no guia rápido.</p>
  </div>

  <div class="sec">13 · COMO USAR ESTE PLANO</div>
  <div class="bloco">
    <p>A seção 4 é o instrumento diário: na reunião de 15 minutos, percorra as atividades do dia e marque as concluídas pelo <b>critério de conclusão</b>, não pela percepção de andamento. A seção 5 é o compromisso individual de cada pessoa. A seção 7 é a lista de verificação da carga cadastral — o item mais frequente de atraso em implantações desta natureza. As seções 8 e 9 são o que garante que a plataforma não entre no ar sem que o canal saiba usá-la. A seção 10 é a única porta de entrada para a virada.</p>
    <p>O plano não fixa data de início: ancorado no dia autorizado pela Diretoria, D1 é o primeiro dia útil e D15 o décimo quinto. Se algum dia escorregar, a folga está deliberadamente entre D12 e D14 — use-a para correção e reteste, e não para antecipar atividades da Onda 2.</p>
  </div>

</div>
</body></html>`

const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true })
const page = await br.newPage()
await page.setContent(html, { waitUntil: 'networkidle' })
await page.pdf({ path: OUT_PDF, format: 'A4', printBackground: true, margin: { top: 0, bottom: 0, left: 0, right: 0 } })
await br.close()
console.log('PDF ok:', OUT_PDF)
console.log('atividades:', TOTAL_ATIV, '· esforço somado:', TOTAL_H, 'h · recursos:', SIGLAS.length)
console.log('por dia:', horasPorDia.map((d) => `${d.dia}=${d.h}h/${d.n}`).join(' '))
