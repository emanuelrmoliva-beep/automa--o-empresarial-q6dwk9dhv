export interface HelpTopicStep {
  title: string
  description: string
  tip?: string
}

export interface HelpTopic {
  id: string
  category: 'comeco' | 'operacao' | 'financeiro' | 'produtos' | 'gestao' | 'mobile' | 'faq'
  categoryLabel: string
  title: string
  shortDescription: string
  iconName: string // e.g. "Building2", "LayoutDashboard", "ShoppingCart", etc.
  route?: string // link para navegar direto para o módulo
  badge?: string
  keywords: string[]
  steps: HelpTopicStep[]
  highlights?: string[]
}

export interface FAQItem {
  id: string
  question: string
  answer: string
  category: string
  relatedTopicId?: string
}

export const HELP_CATEGORIES = [
  { id: 'todos', label: 'Todos os Tópicos' },
  { id: 'comeco', label: 'Primeiros Passos' },
  { id: 'operacao', label: 'Operação Diária' },
  { id: 'financeiro', label: 'Financeiro & Caixa' },
  { id: 'produtos', label: 'Produtos & Preços' },
  { id: 'gestao', label: 'Metas & Relatórios' },
  { id: 'mobile', label: 'Celular & PWA' },
  { id: 'faq', label: 'Perguntas Frequentes (FAQ)' },
] as const

export const HELP_TOPICS: HelpTopic[] = [
  {
    id: 'orcamentos-compartilhar',
    category: 'operacao',
    categoryLabel: 'Operação Diária',
    title: 'Orçamentos & Compartilhamento (WhatsApp, E-mail, PDF)',
    shortDescription:
      'Como criar propostas comerciais e compartilhar com clientes por WhatsApp, e-mail nativo ou download de PDF.',
    iconName: 'FileText',
    route: '/orcamentos',
    badge: 'Novidade',
    keywords: [
      'orçamento',
      'proposta',
      'compartilhar',
      'whatsapp',
      'email',
      'pdf',
      'vender',
      'conversão',
      'proposta comercial',
    ],
    highlights: [
      'Geração de PDF do orçamento com dados do cliente, itens e condições.',
      'Compartilhamento direto via WhatsApp Web/App com texto formatado pronto.',
      'Envio por e-mail nativo (mailto:) e suporte ao menu nativo de compartilhamento do celular.',
      'Conversão com um clique do orçamento aprovado em Venda concluída.',
    ],
    steps: [
      {
        title: '1. Criar uma Proposta / Orçamento',
        description:
          'Acesse o menu "Orçamentos" e clique em "+ Novo Orçamento". Preencha o cliente, a validade da proposta e os itens/serviços.',
      },
      {
        title: '2. Compartilhar pelo Aplicativo de Escolha',
        description:
          'No card do orçamento, clique em "Compartilhar". Você pode abrir o WhatsApp com mensagem formatada pronta, disparar pelo seu leitor de e-mail ou gerar o PDF.',
        tip: 'O sistema não utiliza APIs pagas de disparo automático: você escolhe como e por onde enviar mantendo o controle total.',
      },
      {
        title: '3. Converter em Venda',
        description:
          'Assim que o cliente aprovar o orçamento, clique no botão "Vender" para transformá-lo imediatamente em uma venda registrada no faturamento.',
      },
    ],
  },
  {
    id: 'catalogo-produtos-fotos',
    category: 'produtos',
    categoryLabel: 'Produtos & Preços',
    title: 'Catálogo Visual de Produtos com Fotos',
    shortDescription:
      'Envie fotos para cada produto do seu inventário e utilize a visão em catálogo de cards com busca e status de estoque.',
    iconName: 'Package',
    route: '/estoque',
    badge: 'Novidade',
    keywords: ['catalogo', 'fotos', 'imagem', 'produtos', 'estoque', 'cards', 'galeria'],
    highlights: [
      'Upload de imagens de até 5MB armazenadas no PocketBase.',
      'Alternador fácil entre visualização em Grade de Catálogo e Tabela tradicional.',
      'Indicadores visuais de estoque disponível, baixo ou esgotado sobre cada foto.',
    ],
    steps: [
      {
        title: '1. Adicionar Foto ao Produto',
        description:
          'No módulo Estoque, clique em "+ Novo Produto" ou edite um item existente. Na seção "Foto do Produto (Catálogo)", escolha uma imagem PNG ou JPG.',
      },
      {
        title: '2. Alternar para a Visão em Catálogo',
        description:
          'No topo do módulo de Estoque, utilize o botão "Catálogo" para ver os cards com foto, preço de venda, markup e quantidade disponível.',
      },
    ],
  },
  {
    id: 'cotacoes-comparativo-fornecedores',
    category: 'produtos',
    categoryLabel: 'Produtos & Preços',
    title: 'Cotações & Comparativo de Fornecedores',
    shortDescription:
      'Compare preços e prazos de múltiplos fornecedores para insumos e aplique o menor custo diretamente no estoque.',
    iconName: 'Scale',
    route: '/cotacoes',
    badge: 'Novidade',
    keywords: ['cotações', 'fornecedores', 'menor preço', 'compras', 'insumos', 'comparativo'],
    highlights: [
      'Destaque visual automático da oferta de menor preço entre os fornecedores.',
      'Botão "Usar este Custo" para sincronizar o preço de custo no estoque do produto com 1 clique.',
      'Histórico completo de cotações para embasar negociações de compras.',
    ],
    steps: [
      {
        title: '1. Registrar Nova Cotação',
        description:
          'Acesse "Cotações de Fornecedores" no menu Produtos & Compras e clique em "+ Nova Cotação".',
      },
      {
        title: '2. Adicionar Fornecedores e Preços',
        description:
          'Digite o nome, contato e o preço unitário cotado por cada distribuidor ou fornecedor.',
      },
      {
        title: '3. Aplicar ao Custo do Estoque',
        description:
          'O sistema sinaliza o menor preço. Clique em "Usar este Custo" para atualizar automaticamente o cadastro do produto.',
      },
    ],
  },
  {
    id: 'fluxo-caixa-projetado',
    category: 'financeiro',
    categoryLabel: 'Financeiro & Caixa',
    title: 'Fluxo de Caixa Projetado (30, 60 e 90 Dias)',
    shortDescription:
      'Projete o saldo futuro da sua empresa cruzando saldo atual, contas a receber e contas a pagar futuras.',
    iconName: 'LineChart',
    route: '/relatorios',
    badge: 'Novidade',
    keywords: [
      'fluxo de caixa projetado',
      'projeção',
      'futuro',
      'saldo futuro',
      'previsão',
      'saldo negativo',
    ],
    highlights: [
      'Projeção dia a dia para os próximos 30, 60 ou 90 dias.',
      'Gráfico de linha dinâmico mostrando a evolução acumulada do caixa.',
      'Alerta preventivo de dias com risco de saldo negativo para você antecipar cobranças.',
    ],
    steps: [
      {
        title: '1. Acessar a Aba Fluxo Projetado',
        description: 'No menu Relatórios, selecione a aba "Fluxo de Caixa Projetado".',
      },
      {
        title: '2. Escolher o Horizonte',
        description:
          'Alterne entre 30, 60 ou 90 dias para visualizar a linha do tempo do saldo projetado.',
      },
      {
        title: '3. Exportar Projeção',
        description:
          'Clique no botão "CSV" para baixar a planilha detalhada da projeção financeira.',
      },
    ],
  },
  {
    id: 'empresa-logo-backup',
    category: 'comeco',
    categoryLabel: 'Primeiros Passos',
    title: 'Logotipo da Empresa & Backup Completo',
    shortDescription:
      'Como personalizar o ERP com a imagem da sua marca e baixar uma cópia completa de todos os dados do negócio.',
    iconName: 'Building2',
    route: '/configuracoes',
    badge: 'Essencial',
    keywords: [
      'logo',
      'logotipo',
      'imagem da empresa',
      'backup',
      'exportar dados',
      'segurança',
      'json',
    ],
    highlights: [
      'Upload de PNG/JPG para exibir no menu, topo mobile e documentos da empresa.',
      'Exportação em formato JSON estruturado com todos os registros e links das fotos.',
    ],
    steps: [
      {
        title: '1. Upload do Logotipo',
        description:
          'Em Configurações da Empresa, selecione uma imagem PNG ou JPG de até 5MB no bloco de Logo.',
      },
      {
        title: '2. Backup Completo da Empresa',
        description:
          'No rodapé das Configurações, clique em "Exportar Backup Completo (.json)" para baixar um arquivo seguro com todos os seus clientes, produtos, vendas e finanças.',
      },
    ],
  },
  {
    id: 'primeiro-acesso',
    category: 'comeco',
    categoryLabel: 'Primeiros Passos',
    title: 'Primeiro Acesso & Cadastro da Empresa',
    shortDescription:
      'Como criar sua conta de gestor e preencher o cadastro obrigatório da empresa em 2 etapas.',
    iconName: 'Building2',
    route: '/configuracoes',
    badge: 'Essencial',
    keywords: [
      'login',
      'cadastro',
      'cnpj',
      'cep',
      'onboarding',
      'empresa',
      'dados',
      'registro',
      'primeiro acesso',
      'razão social',
      'nome fantasia',
    ],
    highlights: [
      'Validação matemática oficial de CNPJ com 14 dígitos.',
      'Busca automática de endereço pelo CEP via ViaCEP.',
      'Edição posterior dos dados a qualquer momento pelo menu superior.',
    ],
    steps: [
      {
        title: '1. Criação da Conta ou Login',
        description:
          'Acesse a tela inicial com seu e-mail e senha. Se ainda não possui acesso, clique em "Cadastre-se", informe nome completo, e-mail corporativo e senha segura com no mínimo 8 caracteres.',
      },
      {
        title: '2. Etapa 1 do Onboarding: Dados Principais da Empresa',
        description:
          'Ao autenticar pela primeira vez sem uma empresa vinculada, você será direcionado ao assistente de boas-vindas. Digite o CNPJ da empresa (o sistema formata e valida os dígitos verificadores), a Razão Social e o Nome Fantasia.',
        tip: 'Se você for MEI ou profissional autônomo, preencha os dados do seu CNPJ MEI com o nome comercial que seus clientes conhecem.',
      },
      {
        title: '3. Etapa 2 do Onboarding: Contato e Endereço com CEP Automático',
        description:
          'Informe o telefone com DDD, e-mail comercial e digite o CEP com 8 dígitos. O sistema busca automaticamente o logradouro, bairro, cidade e estado. Basta complementar com o número e complemento.',
      },
      {
        title: '4. Conclusão e Acesso Imediato',
        description:
          'Ao salvar a Etapa 2, sua empresa é registrada no banco de dados e você é redirecionado ao Dashboard Operacional com todas as ferramentas liberadas.',
      },
    ],
  },
  {
    id: 'dashboard',
    category: 'operacao',
    categoryLabel: 'Operação Diária',
    title: 'Dashboard Operacional (Visão 360°)',
    shortDescription:
      'Entenda todos os indicadores, cartões de métricas, gráficos e painel de metas em tempo real.',
    iconName: 'LayoutDashboard',
    route: '/dashboard',
    badge: 'Visão Geral',
    keywords: [
      'dashboard',
      'gráficos',
      'pizza',
      'donut',
      'barras',
      'linha',
      'fluxo de caixa',
      'saldo',
      'receitas',
      'despesas',
      'metas',
      'vencimentos',
    ],
    highlights: [
      'Atualização instantânea em tempo real via Realtime Sync.',
      'Gráfico Donut com proporção clara de Receitas vs Despesas e indicador de Superávit/Déficit.',
      'Pizza de custos categorizados para identificar para onde vai o dinheiro.',
    ],
    steps: [
      {
        title: '1. Cartões de Resumo do Mês Corrente',
        description:
          'No topo você vê: Receitas do Mês (entradas confirmadas), Despesas do Mês (gastos quitados), Saldo Operacional Líquido (Receitas menos Despesas) e A Receber em Aberto (previsão futura de caixa).',
      },
      {
        title: '2. Painel de Metas Ativas & Réguas de Crescimento',
        description:
          'Acompanhe até 3 metas ativas com barras de progresso percentual calculadas automaticamente (faturamento, lucro líquido ou volume de vendas).',
      },
      {
        title: '3. Gráficos de Vendas e Evolução de Saldo',
        description:
          'O gráfico de barras compara mês a mês o faturamento e as vendas dos últimos 6 meses. O gráfico de linha exibe o fluxo real do saldo acumulado.',
      },
      {
        title: '4. Gráficos de Pizza & Donut Financeiro',
        description:
          'A pizza agrupa os custos por categoria (ex.: Fornecedores, Aluguel, Pessoal, Marketing). O donut confronta receitas e despesas com diagnóstico instantâneo de superávit.',
      },
      {
        title: '5. Próximos Vencimentos & Histórico de Movimentações',
        description:
          'No rodapé do dashboard, veja os títulos que vencem em breve (com etiqueta vermelha se estiverem atrasados) e as últimas movimentações do livro caixa.',
      },
    ],
  },
  {
    id: 'boas-vindas-pedidos-dia',
    category: 'operacao',
    categoryLabel: 'Operação Diária',
    title: 'Mensagem Motivacional & Pedidos do Dia',
    shortDescription:
      'O modal inteligente exibido ao entrar no sistema com frase inspiradora, alertas de hoje e previsão do dia.',
    iconName: 'Sparkles',
    route: '/dashboard',
    badge: 'Produtividade',
    keywords: [
      'boas vindas',
      'frase motivacional',
      'pedidos do dia',
      'compromissos',
      'entregas de hoje',
      'lembrete diário',
      'modal de boas vindas',
    ],
    highlights: [
      'Frases motivacionais dinâmicas de gestão, liderança e foco nos resultados.',
      'Lista rápida de entregas e compromissos marcados para a data de hoje.',
      'Avisos de contas que vencem hoje para você nunca esquecer de pagar ou cobrar.',
    ],
    steps: [
      {
        title: '1. Abertura Automática Diária',
        description:
          'Ao acessar o Dashboard, o sistema verifica a data e abre um painel de boas-vindas com o seu nome, data completa em português e uma mensagem inspiradora para o seu dia de negócios.',
      },
      {
        title: '2. Checagem de Entregas & Pedidos Agendados',
        description:
          'Veja os pedidos marcados na Agenda para hoje com cliente, status (Pendente, Em Produção, Concluído) e valor total.',
      },
      {
        title: '3. Checagem de Contas a Pagar e Receber de Hoje',
        description:
          'Resumo de títulos com vencimento na data presente para planejamento do saldo bancário matinal.',
      },
      {
        title: '4. Fechamento e Botão "Começar o Dia"',
        description:
          'Ao clicar no botão verde "Começar o Dia", o modal se fecha e você segue diretamente para a operação sem interrupções.',
      },
    ],
  },
  {
    id: 'vendas',
    category: 'operacao',
    categoryLabel: 'Operação Diária',
    title: 'Módulo de Vendas',
    shortDescription:
      'Como registrar vendas, selecionar clientes e produtos, dar descontos, mudar status e exportar relatórios em CSV.',
    iconName: 'ShoppingCart',
    route: '/vendas',
    badge: 'Comercial',
    keywords: [
      'venda',
      'pedido',
      'cliente',
      'produto',
      'desconto',
      'csv',
      'exportar',
      'concluída',
      'cancelada',
      'forma de pagamento',
      'nota',
    ],
    highlights: [
      'Cálculo automático de subtotal, desconto percentual/valor e valor final.',
      'Filtro por período de datas, cliente, forma de pagamento e status da venda.',
      'Exportação instantânea de relatório de vendas para planilha Excel/CSV.',
    ],
    steps: [
      {
        title: '1. Iniciar uma Nova Venda',
        description:
          'No menu lateral clique em "Vendas" e depois no botão verde "+ Nova Venda". Selecione o cliente previamente cadastrado ou deixe como Venda ao Consumidor.',
      },
      {
        title: '2. Adicionar Itens e Quantidades',
        description:
          'Escolha o produto do seu estoque. O preço unitário padrão é preenchido automaticamente, mas você pode ajustá-lo. Informe a quantidade vendida.',
        tip: 'Você pode adicionar múltiplos produtos em um mesmo pedido de venda.',
      },
      {
        title: '3. Pagamento e Descontos',
        description:
          'Selecione a forma de pagamento (Pix, Cartão de Crédito, Boleto, Dinheiro, Transferência). Caso queira conceder desconto, digite o valor no campo correspondente.',
      },
      {
        title: '4. Status e Conclusão',
        description:
          'Marque a venda como "Concluída", "Pendente" ou "Orçamento". Ao salvar, a venda alimenta os gráficos de faturamento do Dashboard e relatórios.',
      },
      {
        title: '5. Exportar Planilha CSV',
        description:
          'Use o botão "Exportar CSV" no topo da listagem para baixar o extrato filtrado com data, cliente, itens, forma de pagamento e total.',
      },
    ],
  },
  {
    id: 'venda-vinculada-estoque',
    category: 'operacao',
    categoryLabel: 'Operação Diária',
    title: 'Ligação Venda ↔ Estoque (Baixa e Estorno Automáticos)',
    shortDescription:
      'Como funciona a baixa automática de produtos ao vender, estorno em cancelamentos e proteção contra estoque negativo.',
    iconName: 'Package',
    route: '/vendas',
    badge: 'Novidade',
    keywords: [
      'baixa de estoque',
      'venda com estoque',
      'estorno',
      'cancelamento',
      'estoque negativo',
      'saldo insuficiente',
      'itens da venda',
      'inventário',
    ],
    highlights: [
      'Baixa automática e imediata no saldo físico dos produtos quando a venda é salva como "Concluída".',
      'Bloqueio seguro contra estoque insuficiente ou negativo (avisa a quantidade disponível na seleção).',
      'Estorno automático: ao cancelar a venda ou excluir, os produtos retornam integralmente ao estoque.',
      'Edição inteligente: ao alterar quantidades ou trocar itens, o sistema calcula a diferença antiga e nova com precisão.',
    ],
    steps: [
      {
        title: '1. Adicionar Itens do Estoque na Venda',
        description:
          'No modal de Nova Venda, você conta com o seletor "Vincular Produtos do Estoque". Ao selecionar um item, o sistema mostra o preço de venda e o saldo disponível em tempo real (ex.: 15 un).',
      },
      {
        title: '2. Validação e Bloqueio de Estoque Insuficiente',
        description:
          'Se você tentar vender uma quantidade maior do que a disponível no inventário físico, o sistema exibe um alerta vermelho em destaque ("Estoque insuficiente: restam apenas X unidades de Y") e impede a gravação para manter a acurácia do estoque.',
      },
      {
        title: '3. Baixa Automática ao Concluir',
        description:
          'Ao confirmar a venda com o status "Concluída", as quantidades são subtraídas diretamente do estoque dos respectivos produtos.',
      },
      {
        title: '4. Ajuste em Edições de Venda',
        description:
          'Se você editar uma venda (aumentar/diminuir quantidades ou remover itens), o ERP compara o snapshot anterior com os novos itens e recalcula os deltas, mantendo o estoque perfeitamente balanceado.',
      },
      {
        title: '5. Cancelamento ou Exclusão (Estorno Automático)',
        description:
          'Caso mude o status para "Cancelada" ou decida excluir uma venda concluída, todos os itens que haviam saído retornam automaticamente ao estoque da empresa.',
      },
    ],
  },
  {
    id: 'relatorios-pdf-export',
    category: 'gestao',
    categoryLabel: 'Metas & Relatórios',
    title: 'Relatórios Oficiais em PDF & CSV',
    shortDescription:
      'Como gerar relatórios executivos em PDF com cabeçalho da empresa, dados em BRL, tabelas zebradas e paginação.',
    iconName: 'FileSpreadsheet',
    route: '/relatorios',
    badge: 'Novidade',
    keywords: [
      'pdf',
      'relatórios em pdf',
      'resumo mensal',
      'vencimentos',
      'exportar pdf',
      'dre',
      'impressão',
      'documento',
    ],
    highlights: [
      'Geração 100% no cliente sem limite de download e sem demora.',
      'Cabeçalho corporativo com nome da empresa, CNPJ, data/hora de emissão e período.',
      'Tabelas zebradas formatadas com padrão contábil brasileiro (R$ com separador de milhar e decimal).',
      'Rodapé com numeração oficial "Página X de Y".',
    ],
    steps: [
      {
        title: '1. Relatório de Vencimentos Futuros em PDF',
        description:
          'Na aba "Vencimentos Futuros", clique em "Exportar PDF". O documento é gerado contendo o resumo dos títulos em aberto, o saldo líquido projetado e cada faixa de vencimento (vencidos, hoje, semana, 15, 30, 60 dias) com seus respectivos subtotais.',
      },
      {
        title: '2. Resumo Mensal Consolidado em PDF',
        description:
          'Na aba "Resumo Mensal", escolha o mês e ano desejados e clique em "Exportar PDF". O documento inclui o quadro de indicadores (Receitas, Despesas, Resultado Operacional e Vendas), o detalhamento por categoria/centro de custo, o extrato de lançamentos e as contas pendentes.',
      },
      {
        title: '3. Manutenção da Exportação em CSV',
        description:
          'Os botões de CSV continuam disponíveis lado a lado para abrir os dados brutos no Excel ou Google Planilhas.',
      },
    ],
  },
  {
    id: 'notificacoes-sistema',
    category: 'operacao',
    categoryLabel: 'Operação Diária',
    title: 'Sistema de Notificações & Alertas no Topo',
    shortDescription:
      'Como acompanhar contas vencendo, estoque abaixo do mínimo e compromissos da agenda pelo ícone do sino.',
    iconName: 'Bell',
    route: '/dashboard',
    badge: 'Novidade',
    keywords: [
      'notificações',
      'sino',
      'alertas',
      'vencimentos',
      'lembretes',
      'estoque baixo',
      'marcar como lida',
    ],
    highlights: [
      'Sino dinâmico na barra superior mostrando o contador exato de pendências não lidas.',
      'Cores semânticas: vermelho para atrasados, âmbar para vencimentos próximos e estoque baixo, esmeralda para entregas de hoje.',
      'Ações rápidas de "Marcar como lida" individual e "Marcar todas como lidas" com persistência no banco.',
      'Bloco de Alertas no Dashboard com os 5 títulos mais urgentes e atalho direto para quitação.',
    ],
    steps: [
      {
        title: '1. O Sino de Notificações no Topo',
        description:
          'No topo do ERP, o ícone do sino exibe uma bolha vermelha com a quantidade de notificações pendentes. Ao clicar, um painel responsivo se abre.',
      },
      {
        title: '2. Tipos de Alertas Monitorados',
        description:
          '(a) Contas a pagar e receber vencidas ou vencendo nos próximos 7 dias; (b) Alerta consolidado de produtos com estoque zerado ou abaixo do mínimo de segurança; (c) Entregas e pedidos agendados para a data de hoje.',
      },
      {
        title: '3. Navegação Rápida',
        description:
          'Ao clicar em qualquer notificação no dropdown, o ERP direciona você diretamente para a tela de resolução (Contas a Pagar, Receber, Estoque ou Agenda).',
      },
      {
        title: '4. Marcar como Lida',
        description:
          'Você pode clicar no ícone de check de uma notificação individual ou usar o botão "Marcar todas como lidas". As notificações lidas ficam salvas no PocketBase e não voltam a apitar.',
      },
    ],
  },
  {
    id: 'clientes',
    category: 'operacao',
    categoryLabel: 'Operação Diária',
    title: 'Cadastro de Clientes (PF & PJ)',
    shortDescription:
      'Gestão de contatos, histórico de compras, validação estrita de CPF/CNPJ e busca em tempo real.',
    iconName: 'Users',
    route: '/clientes',
    badge: 'Relacionamento',
    keywords: [
      'clientes',
      'pessoa física',
      'pessoa jurídica',
      'cpf',
      'cnpj',
      'telefone',
      'whatsapp',
      'endereço',
      'busca',
      'histórico',
    ],
    highlights: [
      'Validação matemática contra documentos falsos ou incompletos (CPF e CNPJ).',
      'Preenchimento de CEP com autopreenchimento de rua, bairro e cidade.',
      'Campo de observações para anotar preferências e acordos com o cliente.',
    ],
    steps: [
      {
        title: '1. Cadastrar Novo Cliente',
        description:
          'Acesse "Clientes" no menu e clique em "+ Novo Cliente". Defina o tipo de pessoa: Pessoa Física (CPF) ou Pessoa Jurídica (CNPJ).',
      },
      {
        title: '2. Preencher Documentos e Contato',
        description:
          'Digite o CPF ou CNPJ com máscara automática. O sistema valida se o documento é matematicamente autêntico. Informe telefone/WhatsApp, e-mail comercial e endereço com CEP.',
      },
      {
        title: '3. Busca Rápida',
        description:
          'Na barra superior de busca, digite qualquer trecho do nome, documento, e-mail ou cidade do cliente para filtrá-lo imediatamente.',
      },
      {
        title: '4. Edição e Exclusão Segura',
        description:
          'Clique no botão de lápis para atualizar dados cadastrais ou na lixeira para remover contatos (com diálogo de confirmação protetor).',
      },
    ],
  },
  {
    id: 'estoque',
    category: 'produtos',
    categoryLabel: 'Produtos & Preços',
    title: 'Controle de Estoque & Produtos',
    shortDescription:
      'Cadastro de itens, custo, preço de venda, estoque mínimo, alertas de reposição e movimentações de entrada/saída.',
    iconName: 'Package',
    route: '/estoque',
    badge: 'Inventário',
    keywords: [
      'estoque',
      'produtos',
      'custo',
      'preço',
      'mínimo',
      'alerta',
      'esgotado',
      'reposição',
      'sku',
      'código',
      'margem',
    ],
    highlights: [
      'Emblemas visuais dinâmicos: Verde (Normal), Amarelo (Estoque Baixo) e Vermelho (Esgotado).',
      'Ajuste rápido de quantidade para inventário ou perdas.',
      'Cálculo visual do lucro bruto por unidade cadastrada.',
    ],
    steps: [
      {
        title: '1. Cadastrar um Produto',
        description:
          'Acesse "Estoque" e clique em "+ Novo Produto". Digite o nome do item, código/SKU (opcional), categoria e unidade de medida (UN, KG, CX, etc.).',
      },
      {
        title: '2. Custos e Preço de Venda',
        description:
          'Preencha o Custo de Compra (quanto você paga ao fornecedor) e o Preço de Venda Praticado. O sistema mostra o percentual de margem bruta estimada.',
      },
      {
        title: '3. Estoque Atual e Estoque Mínimo de Segurança',
        description:
          'Defina a quantidade física que você tem hoje e a quantidade mínima de alerta. Se o estoque cair abaixo desse patamar, o sistema exibirá uma tarja amarela de aviso de reposição.',
      },
      {
        title: '4. Filtros por Situação',
        description:
          'Filtre rapidamente a tabela por "Todos", "Estoque Baixo" ou "Zerados/Esgotados" para emitir pedidos de compra a fornecedores de forma assertiva.',
      },
    ],
  },
  {
    id: 'formacao-de-precos',
    category: 'produtos',
    categoryLabel: 'Produtos & Preços',
    title: 'Formação de Preços (Markup Divisor)',
    shortDescription:
      'Calculadora profissional baseada em impostos, custos variáveis e margem líquida para definir preços lucrativos.',
    iconName: 'Calculator',
    route: '/formacao-de-precos',
    badge: 'Rentabilidade',
    keywords: [
      'formação de preços',
      'markup',
      'markup divisor',
      'lucro',
      'margem',
      'impostos',
      'despesas variáveis',
      'comissão',
      'taxa de cartão',
      'preço sugerido',
    ],
    highlights: [
      'Evita o erro clássico de somar porcentagens sobre o custo (que causa prejuízo oculto).',
      'Fórmula oficial de Markup Divisor: Preço = Custo / (1 - (Impostos + Variáveis + Margem)).',
      'Aplicação direta do preço calculado ao produto no cadastro de estoque.',
    ],
    steps: [
      {
        title: '1. Selecionar o Produto do Estoque',
        description:
          'No simulador de formação de preços, selecione um produto existente ou faça um cálculo avulso informando o custo de aquisição da mercadoria.',
      },
      {
        title: '2. Informar Percentuais Incidentes',
        description:
          'Preencha: (a) Alíquota estimada de Impostos (Simples Nacional, ICMS, etc.), (b) Despesas Variáveis de Venda (taxa de máquina de cartão, comissão de vendedores, embalagem), (c) Margem de Lucro Líquido Desejada.',
      },
      {
        title: '3. Interpretar o Markup Divisor e Preço Sugerido',
        description:
          'O sistema calcula a soma das taxas (D%), calcula o Fator Divisor (1 - D%/100) e exibe o Preço de Venda Sugerido para garantir a margem líquida exata no bolso da empresa.',
      },
      {
        title: '4. Comparar com o Preço Atual e Salvar',
        description:
          'Veja se seu preço atual está gerando lucro ou prejuízo. Com um clique em "Aplicar ao Produto", o preço de venda é sincronizado no estoque.',
      },
    ],
  },
  {
    id: 'receitas-despesas',
    category: 'financeiro',
    categoryLabel: 'Financeiro & Caixa',
    title: 'Receitas & Despesas Realizadas',
    shortDescription:
      'Lançamento direto de entradas e saídas de caixa categorizadas por centro de custo.',
    iconName: 'ReceiptText',
    route: '/receitas',
    badge: 'Fluxo Real',
    keywords: [
      'receitas',
      'despesas',
      'categorias',
      'recebida',
      'paga',
      'comprovante',
      'centro de custo',
      'fluxo de caixa',
      'gastos',
    ],
    highlights: [
      'Separação nítida entre receitas operacionais/avulsas e despesas fixas/variáveis.',
      'Filtros por mês, categoria (Fornecedores, Aluguel, Folha, Tributos) e status.',
      'Alimentação automática das fatias de pizza de despesas do Dashboard.',
    ],
    steps: [
      {
        title: '1. Lançar uma Receita Realizada',
        description:
          'Em "Receitas", clique em "+ Nova Receita". Preencha a descrição, valor em Reais, data de competência, categoria e marque o status como "Recebida" ou "Pendente".',
      },
      {
        title: '2. Lançar uma Despesa Realizada',
        description:
          'Em "Despesas", clique em "+ Nova Despesa". Digite o destinatário ou fornecedor, categoria contábil e status ("Paga" ou "Pendente").',
      },
      {
        title: '3. Impacto no Saldo do Sistema',
        description:
          'Receitas com status "Recebida" e despesas com status "Paga" impactam imediatamente o cálculo do Saldo Operacional Líquido do Dashboard.',
      },
    ],
  },
  {
    id: 'contas-pagar-receber',
    category: 'financeiro',
    categoryLabel: 'Financeiro & Caixa',
    title: 'Contas a Pagar & Contas a Receber',
    shortDescription:
      'Gestão de títulos futuros, boletos, alertas de vencimento, inadimplência e quitação de parcelas.',
    iconName: 'CreditCard',
    route: '/contas-a-pagar',
    badge: 'Projeção',
    keywords: [
      'contas a pagar',
      'contas a receber',
      'vencimento',
      'quitar',
      'atrasado',
      'inadimplência',
      'fornecedor',
      'parcela',
      'boleto',
    ],
    highlights: [
      'Destaca títulos vencidos em vermelho e títulos a vencer nos próximos dias em amarelo.',
      'A quitação gera lançamento automático no Livro Caixa (Entradas e Saídas).',
      'Totalizadores no topo informam quanto você deve pagar e quanto tem a receber na semana/mês.',
    ],
    steps: [
      {
        title: '1. Cadastro de Títulos Futuros',
        description:
          'Em "Contas a Pagar" ou "Contas a Receber", lance boletos de compras, aluguéis ou notas fiscais parceladas com valor e data exata de vencimento.',
      },
      {
        title: '2. Monitoramento de Vencimentos',
        description:
          'Acompanhe os selos de status: "Em aberto", "Pago/Recebido" ou "Vencido". Ordene por data mais próxima para priorizar pagamentos sem juros.',
      },
      {
        title: '3. Ação de Quitar / Liquidar',
        description:
          'Ao pagar um fornecedor ou receber do cliente, clique no botão de verificação verde "Quitar". O título passa para o status "Pago/Recebido" com registro da data de liquidação.',
      },
      {
        title: '4. Integração Automática com Caixa',
        description:
          'Ao quitar um título, o sistema cria automaticamente uma movimentação no Livro Caixa, garantindo conciliação perfeita sem retrabalho.',
      },
    ],
  },
  {
    id: 'entradas-saidas-ledger',
    category: 'financeiro',
    categoryLabel: 'Financeiro & Caixa',
    title: 'Ledger de Entradas e Saídas (Livro Caixa)',
    shortDescription:
      'Extrato financeiro cronológico completo da empresa alimentado automaticamente por vendas e quitações.',
    iconName: 'History',
    route: '/entradas-saidas',
    badge: 'Auditoria',
    keywords: [
      'entradas',
      'saídas',
      'livro caixa',
      'ledger',
      'extrato',
      'histórico',
      'conciliação',
      'movimentação',
      'saldo bancário',
    ],
    highlights: [
      'Visão unificada de toda moeda que entrou ou saiu da empresa em ordem cronológica.',
      'Cores contrastantes: verde para entradas (+) e vermelho para saídas (-).',
      'Alimentação automatizada ao quitar contas a pagar/receber e vendas.',
    ],
    steps: [
      {
        title: '1. Compreender o Livro Caixa',
        description:
          'O Ledger funciona como o extrato bancário corporativo. Cada linha representa uma transação efetivada com data, categoria, descrição e valor.',
      },
      {
        title: '2. Lançamentos Automáticos vs Manuais',
        description:
          'O sistema registra movimentações sozinho quando contas são quitadas. Se você teve uma despesa ou receita imprevista de balcão, pode usar o botão "+ Nova Movimentação" para lançar manualmente.',
      },
      {
        title: '3. Auditoria e Filtros',
        description:
          'Filtre apenas por entradas, apenas por saídas, por período ou por categoria para conferir o saldo com seus comprovantes bancários.',
      },
    ],
  },
  {
    id: 'metas-reguas',
    category: 'gestao',
    categoryLabel: 'Metas & Relatórios',
    title: 'Metas & Réguas de Crescimento',
    shortDescription:
      'Defina objetivos estratégicos com nome livre, bases dinâmicas (faturamento, lucro, vendas, equipamento) e réguas periódicas.',
    iconName: 'Target',
    route: '/metas',
    badge: 'Estratégico',
    keywords: [
      'metas',
      'réguas',
      'faturamento',
      'lucro líquido',
      'quantidade de vendas',
      'equipamento',
      'economia',
      'mensal',
      'trimestral',
      'semestral',
      'anual',
    ],
    highlights: [
      'Cálculo automático de progresso a partir das transações reais do banco de dados.',
      'Réguas flexíveis: Mensal, Trimestral, Semestral ou Anual.',
      'Suporte a metas financeiras automáticas e metas de investimento com progresso manual.',
    ],
    steps: [
      {
        title: '1. Criar uma Nova Meta Estratégica',
        description:
          'Acesse "Metas & Réguas" e clique em "+ Nova Meta". Escreva um título claro e motivador (ex.: "Bater R$ 80k no Mês", "Comprar Nova Máquina Seladora", "Economia para 13º Salário").',
      },
      {
        title: '2. Escolher a Base de Cálculo',
        description:
          'Selecione a base: Faturamento (soma receitas recebidas no período), Lucro Líquido (receitas menos despesas), Volume de Vendas (soma das vendas concluídas) ou Economia/Equipamento (progresso controlado manualmente).',
      },
      {
        title: '3. Escolher a Régua e Prazos',
        description:
          'Defina o tipo de régua (Mensal, Trimestral, Semestral, Anual) e as datas de início e fim. Informe o valor alvo em Reais ou quantidade.',
      },
      {
        title: '4. Acompanhar a Barra de Progresso',
        description:
          'A barra se preenche em tempo real conforme as operações acontecem. Ao alcançar 100%, o sistema exibe uma insígnia de meta atingida.',
      },
    ],
  },
  {
    id: 'agenda-entregas',
    category: 'operacao',
    categoryLabel: 'Operação Diária',
    title: 'Agenda de Pedidos & Entregas',
    shortDescription:
      'Calendário mensal interativo com visualização dia a dia para organizar logística, prazos e clientes.',
    iconName: 'CalendarDays',
    route: '/agenda',
    badge: 'Logística',
    keywords: [
      'agenda',
      'calendário',
      'entregas',
      'pedidos',
      'prazos',
      'datas',
      'pendente',
      'produção',
      'concluído',
      'compromissos',
    ],
    highlights: [
      'Grade de calendário mensal com marcadores visuais coloridos por dia com eventos.',
      'Clique em qualquer dia do mês para abrir o painel lateral com todos os compromissos daquela data.',
      'Status operacional por entrega: Pendente, Em Produção, Concluído e Cancelado.',
    ],
    steps: [
      {
        title: '1. Navegar pelo Calendário',
        description:
          'Acesse "Agenda & Entregas". Use as setas de navegação para alternar entre os meses. Dias que possuem eventos exibem pequenas tags e contadores.',
      },
      {
        title: '2. Agendar Pedido ou Entrega',
        description:
          'Clique no dia desejado no calendário ou no botão "+ Novo Agendamento". Selecione o cliente, informe o título do pedido, valor, hora e status inicial.',
      },
      {
        title: '3. Acompanhar e Atualizar Status',
        description:
          'Clique sobre um agendamento para alterar de "Pendente" para "Em Produção" ou "Concluído" à medida que sua equipe avança a preparação.',
      },
      {
        title: '4. Integração com Boas-Vindas Matinal',
        description:
          'Tudo o que estiver agendado para o dia de hoje aparece automaticamente no resumo do modal matinal do Dashboard.',
      },
    ],
  },
  {
    id: 'relatorios',
    category: 'gestao',
    categoryLabel: 'Metas & Relatórios',
    title: 'Central de Relatórios & Análise de Vencimentos',
    shortDescription:
      'Análise financeira consolidada, faixas etárias de vencimentos futuros e exportação de dados para contabilidade.',
    iconName: 'FileSpreadsheet',
    route: '/relatorios',
    badge: 'Controladoria',
    keywords: [
      'relatórios',
      'vencimentos',
      'faixas',
      '7 dias',
      '15 dias',
      '30 dias',
      'resumo mensal',
      'exportar',
      'excel',
      'contabilidade',
      'dre',
    ],
    highlights: [
      'Quadro de vencimentos futuros segmentado em faixas: Próximos 7 dias, 15 dias, 30 dias e mais de 30 dias.',
      'Comparativo consolidado de receitas x despesas com margem líquida do mês.',
      'Exportação rápida para planilhas CSV.',
    ],
    steps: [
      {
        title: '1. Acessar a Central de Relatórios',
        description:
          'Clique em "Relatórios" no menu. No topo você encontra o seletor de mês/ano de referência.',
      },
      {
        title: '2. Faixas de Vencimento Futuro (Aging)',
        description:
          'Visualize o volume financeiro a pagar e a receber dividido em 4 baldes de tempo: Vencendo em 7 dias, em 15 dias, em 30 dias e no longo prazo. Isso evita surpresas com fluxo de caixa.',
      },
      {
        title: '3. Resumo por Categorias e Faturamento',
        description:
          'Examine a tabela de centros de custo para identificar despesas anormais e o lucro percentual gerado sobre a receita total.',
      },
      {
        title: '4. Download do Extrato CSV',
        description:
          'Clique no botão de exportação para baixar os dados brutos e enviar ao seu escritório de contabilidade.',
      },
    ],
  },
  {
    id: 'pwa-celular',
    category: 'mobile',
    categoryLabel: 'Celular & PWA',
    title: 'Como Usar no Celular & Instalar o App (PWA)',
    shortDescription:
      'Instale o Automação Empresarial com o ícone "AE" na tela inicial do celular como um aplicativo nativo.',
    iconName: 'Smartphone',
    badge: 'Mobile & PWA',
    keywords: [
      'celular',
      'pwa',
      'aplicativo',
      'instalar',
      'tela inicial',
      'android',
      'iphone',
      'safari',
      'chrome',
      'ícone',
      'ae',
      'bottom bar',
      'drawer',
    ],
    highlights: [
      'Funciona em tela cheia sem barras do navegador, exatamente como um app baixado na loja.',
      'Menu inferior (Bottom Bar) com atalhos para Início, Vendas, Agenda, Financeiro e menu completo.',
      'Drawer lateral retrátil para acesso a todos os módulos com um toque.',
    ],
    steps: [
      {
        title: '1. Como Instalar no Android (Google Chrome)',
        description:
          'Abra o sistema no navegador Chrome. Toque no menu de três pontos no canto superior direito e selecione "Instalar aplicativo" ou "Adicionar à tela inicial". Confirme tocando em "Instalar". O ícone verde "AE" aparecerá junto aos seus outros apps.',
      },
      {
        title: '2. Como Instalar no iPhone / iPad (Safari)',
        description:
          'Abra o sistema no Safari da Apple. Toque no botão de compartilhamento (ícone de quadrado com seta para cima no rodapé). Role as opções e toque em "Adicionar à Tela de Início". Confirme em "Adicionar". Pronto!',
      },
      {
        title: '3. Como Instalar no Computador (Chrome / Edge)',
        description:
          'Na barra de endereço do navegador no computador, clique no ícone de monitor com seta ou no menu "Instalar Automação Empresarial". Você ganha uma janela dedicada e atalho na área de trabalho.',
      },
      {
        title: '4. Navegação Otimizada para Dedos',
        description:
          'No celular você conta com uma barra inferior de 5 botões de acesso rápido e gaveta deslizante completa para operar suas vendas e finanças de onde estiver.',
      },
    ],
  },
]

export const FAQ_LIST: FAQItem[] = [
  {
    id: 'faq-1',
    category: 'Conta & Acesso',
    question: 'Como faço para redefinir minha senha se esqueci?',
    answer:
      'Na tela de login, clique no link "Esqueceu a senha?". Digite o e-mail cadastrado e você receberá uma mensagem para redefinição com link seguro para criar sua nova credencial.',
  },
  {
    id: 'faq-2',
    category: 'Conta & Acesso',
    question: 'Como alterar a Razão Social, CNPJ ou endereço da minha empresa?',
    answer:
      'Clique no menu superior direito (onde aparece seu nome e empresa) e selecione "Dados da Empresa", ou acerte pelo link no cartão do Dashboard. Você poderá atualizar nome fantasia, CNPJ, telefone e CEP.',
    relatedTopicId: 'primeiro-acesso',
  },
  {
    id: 'faq-3',
    category: 'Financeiro',
    question: 'Qual é a diferença entre Receitas/Despesas e Contas a Pagar/Receber?',
    answer:
      'Receitas e Despesas representam dinheiro que já aconteceu (competência/caixa realizado). Contas a Pagar e a Receber são títulos e boletos para o futuro. Quando você clica em "Quitar" em uma conta a pagar/receber, o sistema automaticamente gera o lançamento de saída/entrada no livro caixa.',
    relatedTopicId: 'contas-pagar-receber',
  },
  {
    id: 'faq-4',
    category: 'Financeiro',
    question: 'Como funciona a fórmula de Markup Divisor na Formação de Preços?',
    answer:
      'O Markup Divisor divide o custo pelo fator residual: Preço = Custo / (1 - (Impostos% + Custos Variáveis% + Margem Desejada%)). Isso garante que a margem calculada corresponda exatamente à fatia líquida sobre o preço de venda final.',
    relatedTopicId: 'formacao-de-precos',
  },
  {
    id: 'faq-5',
    category: 'Operação',
    question: 'O que acontece quando o estoque de um produto atinge o nível mínimo?',
    answer:
      'O produto ganha uma etiqueta amarela de alerta ("Estoque Baixo") na listagem e passa a ser destacado nos filtros de reposição. Quando a quantidade chega a 0, ele passa para etiqueta vermelha ("Esgotado").',
    relatedTopicId: 'estoque',
  },
  {
    id: 'faq-6',
    category: 'Gestão',
    question: 'Como as Metas & Réguas calculam o progresso sozinhas?',
    answer:
      'Metas do tipo "Faturamento" somam todas as receitas recebidas no período estipulado. Metas de "Lucro" subtraem as despesas pagas das receitas. Metas de "Vendas" somam o volume de vendas concluídas. Metas de "Equipamento / Economia" permitem atualização de valor atual sob demanda.',
    relatedTopicId: 'metas-reguas',
  },
  {
    id: 'faq-7',
    category: 'Mobile',
    question: 'O aplicativo funciona offline se a internet cair?',
    answer:
      'O app carrega em cache pelo Service Worker do PWA para visualização imediata da interface, mas sincronizações com o banco de dados necessitam de conexão ativa para salvar com segurança no servidor na nuvem.',
    relatedTopicId: 'pwa-celular',
  },
  {
    id: 'faq-8',
    category: 'Operação',
    question: 'Como exportar relatórios para enviar ao meu contador?',
    answer:
      'Tanto na página de Vendas quanto na Central de Relatórios e Extratos, utilize o botão "Exportar CSV". O arquivo gerado é compatível com Excel, Google Planilhas e sistemas contábeis.',
    relatedTopicId: 'relatorios',
  },
]
