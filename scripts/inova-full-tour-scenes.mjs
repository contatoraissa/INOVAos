// Product walkthrough: only the approved doctor and patient demonstrations.
export const scenes = [
  {
    id: "m01",
    role: "Médico",
    title: "Seu dia, com mais clareza",
    path: "/dashboard",
    phrases: [
      "O INOVA conecta médico e paciente, com inteligência artificial para apoiar a preparação da consulta.",
      "Na visão geral, o médico acompanha envios, pedidos e orientações que precisam da sua atenção.",
    ],
  },
  {
    id: "m02",
    role: "Médico",
    title: "Sua carteira de pacientes",
    path: "/patients",
    phrases: [
      "Encontre pacientes por nome, CPF ou nascimento.",
      "Os filtros ajudam a localizar cadastros recentes e novos resultados.",
    ],
  },
  {
    id: "m03",
    role: "Médico",
    title: "Cadastro organizado",
    path: "/patients/new",
    phrases: [
      "No cadastro, registre CPF, e-mail, telefone e os dados do paciente.",
      "Essas informações organizam o perfil que será acompanhado pelo médico.",
    ],
  },
  {
    id: "m04",
    role: "Médico",
    title: "Novos resultados",
    path: "/results",
    phrases: [
      "Os novos resultados ficam reunidos em uma lista com filtros de período.",
      "Abra o paciente para preparar a revisão dos exames.",
    ],
  },
  {
    id: "m05",
    role: "Médico",
    title: "Histórico de exames",
    path: "/history",
    phrases: [
      "O histórico reúne as coletas anteriores dos pacientes.",
      "Consulte o período, o exame e o perfil correspondente.",
    ],
  },
  {
    id: "m06",
    role: "Médico",
    title: "Comparar para acompanhar",
    path: "/comparison",
    phrases: [
      "Compare resultados de diferentes coletas.",
      "Os gráficos ajudam a visualizar mudanças e a acompanhar os valores ao longo do tempo.",
    ],
  },
  {
    id: "m07",
    role: "Médico",
    title: "Agenda compartilhada",
    path: "/agenda",
    scroll: 620,
    phrases: [
      "Navegue pelos meses e dias, filtre pacientes e consulte os compromissos.",
      "Propostas, confirmações, previsões de resultado e cancelamentos aparecem com estados diferentes.",
    ],
  },
  {
    id: "m08",
    role: "Médico",
    title: "Eventos e cancelamentos",
    path: "/agenda",
    action: "event",
    phrases: [
      "Inclua consultas, exames e retornos na agenda.",
      "Ao cancelar, registre o motivo, como uma guia pendente. O histórico permanece disponível.",
    ],
  },
  {
    id: "m09",
    role: "Médico",
    title: "Prepare seu dia com IA",
    reuse: "04-resumo",
    phrases: [
      "A inteligência artificial prepara um briefing dos pacientes previstos na agenda.",
      "Ela organiza os relatos enviados, suspeitas registradas, pontos para conferir e informações que faltam.",
    ],
  },
  {
    id: "m10",
    role: "Médico",
    title: "IA com revisão médica",
    reuse: "05-revisao",
    phrases: [
      "A análise dos textos exige autorização antes do envio.",
      "O médico confere o resumo e abre os envios originais. A decisão continua com o profissional.",
    ],
  },
  {
    id: "m11",
    role: "Médico",
    title: "Prontuário por paciente",
    tab: "Visão geral",
    phrases: [
      "Cada paciente tem seu próprio histórico, resultados, documentos e informações de acompanhamento.",
      "As abas organizam o atendimento em um único perfil.",
    ],
  },
  {
    id: "m12",
    role: "Médico",
    title: "Resumo da consulta",
    tab: "Resumo da consulta",
    phrases: [
      "O resumo reúne informações para preparar e revisar a consulta.",
      "Consulte pendências e organize o fechamento, com orientações e próximos passos.",
    ],
  },
  {
    id: "m13",
    role: "Médico",
    title: "Mensagens, áudios e PDFs",
    tab: "Envios do paciente",
    phrases: [
      "O médico recebe os relatos, áudios e PDFs enviados na preparação.",
      "Pode abrir os documentos e registrar a revisão de cada envio.",
    ],
  },
  {
    id: "m14",
    role: "Médico",
    title: "Notificações de novos envios",
    path: "/dashboard",
    action: "bell",
    phrases: [
      "O sininho avisa sobre novas preparações e mudanças da agenda.",
      "Abra a notificação para chegar ao envio do paciente.",
    ],
  },
  {
    id: "m15",
    role: "Médico",
    title: "Solicitação de exames",
    tab: "Solicitar exames",
    phrases: [
      "Selecione os exames, registre observações e revise o pedido antes de liberar.",
      "O paciente passa a consultar o pedido no seu portal.",
    ],
  },
  {
    id: "m16",
    role: "Médico",
    title: "Orientações ao paciente",
    tab: "Orientações ao paciente",
    phrases: [
      "Escreva e revise as orientações da consulta antes de publicar.",
      "O paciente consegue consultar o que foi combinado para seu acompanhamento.",
    ],
  },
  {
    id: "m17",
    role: "Médico",
    title: "Resultados do paciente",
    tab: "Resultados",
    phrases: [
      "Consulte os marcadores da coleta, suas unidades e referências.",
      "A leitura dos resultados permanece ligada ao contexto de cada paciente.",
    ],
  },
  {
    id: "m18",
    role: "Médico",
    title: "Evolução entre coletas",
    tab: "Histórico",
    phrases: [
      "No histórico individual, acompanhe as coletas e a evolução dos marcadores.",
      "A comparação permite conferir o que mudou entre os períodos.",
    ],
  },
  {
    id: "m19",
    role: "Médico",
    title: "Histórico familiar",
    tab: "Histórico familiar",
    phrases: [
      "Registre e consulte o histórico familiar no perfil do paciente.",
      "Essa informação acrescenta contexto à revisão dos resultados.",
    ],
  },
  {
    id: "m20",
    role: "Médico",
    title: "Laudos e análise com IA",
    tab: "Laudos laboratoriais",
    action: "lab",
    phrases: [
      "Abra o laudo original em PDF e solicite uma análise assistida por inteligência artificial.",
      "Confira os achados no documento e revise a síntese antes de utilizá-la.",
    ],
  },
  {
    id: "m21",
    role: "Médico",
    title: "Arquivos genéticos",
    tab: "Genética",
    phrases: [
      "Importe o arquivo genético em formato TXT e acompanhe suas versões e marcadores.",
      "Os escores de predisposição ainda não estão configurados nesta demonstração.",
    ],
  },
  {
    id: "m22",
    role: "Médico",
    title: "Laudos genômicos",
    tab: "Genômica",
    phrases: [
      "Os laudos genômicos em PDF têm uma área própria para consulta e análise assistida.",
      "O documento original continua disponível para a revisão profissional.",
    ],
  },
  {
    id: "m23",
    role: "Médico",
    title: "Biblioteca de documentos",
    tab: "Documentos",
    phrases: [
      "Organize os documentos por tipo, encontre arquivos pelo nome e abra o original.",
      "Os laudos ficam associados ao perfil do paciente.",
    ],
  },
  {
    id: "m24",
    role: "Médico",
    title: "Acompanhamento contínuo",
    path: "/follow-up",
    phrases: [
      "A área de acompanhamento reúne pacientes e situações que precisam de revisão.",
      "Use os filtros e abra o perfil para continuar o atendimento.",
    ],
  },
  {
    id: "m25",
    role: "Médico",
    title: "Meus relatórios",
    path: "/indicators",
    phrases: [
      "Veja gráficos da sua carteira e da atividade de acompanhamento.",
      "Filtre o período, confira envios e revisões e imprima o relatório.",
    ],
  },
  {
    id: "m26",
    role: "Médico",
    title: "Perfil e preferências",
    path: "/doctors",
    phrases: [
      "No seu perfil, organize dados profissionais, CRM, contatos e informações do consultório.",
      "As configurações reúnem preferências de notificações, leitura e acompanhamento.",
    ],
  },
  {
    id: "m27",
    role: "Médico",
    title: "Configurações",
    path: "/settings",
    phrases: [
      "Ajuste as preferências demonstrativas e confira a prévia de visualização.",
      "Essas escolhas ficam salvas neste navegador.",
    ],
  },
  {
    id: "p01",
    role: "Paciente",
    title: "Minha saúde, em perspectiva",
    section: "Minha saúde",
    phrases: [
      "No INOVA Paciente, a pessoa participa do próprio acompanhamento.",
      "Minha saúde reúne resultados recentes, avisos e próximos passos para conversar com o médico.",
    ],
  },
  {
    id: "p02",
    role: "Paciente",
    title: "Minha agenda",
    section: "Minha agenda",
    scroll: 540,
    phrases: [
      "O paciente consulta a agenda compartilhada e acompanha consultas, exames e retornos.",
      "Pode propor eventos e registrar o motivo de um cancelamento.",
    ],
  },
  {
    id: "p03",
    role: "Paciente",
    title: "Próximos passos",
    section: "Próximos passos",
    phrases: [
      "Confira os pedidos de exames e as orientações disponíveis.",
      "Essa área ajuda a entender o que ainda precisa ser feito no acompanhamento.",
    ],
  },
  {
    id: "p04",
    role: "Paciente",
    title: "Avisos e atualizações",
    section: "Avisos",
    phrases: [
      "Os avisos reúnem novidades dos pedidos, envios e agenda.",
      "O sininho facilita encontrar o que mudou no acompanhamento.",
    ],
  },
  {
    id: "p05",
    role: "Paciente",
    title: "Preparar a consulta",
    section: "Preparar consulta",
    action: "preparation",
    phrases: [
      "Antes da consulta, conte seus sintomas, medicamentos em uso e dúvidas.",
      "Também é possível gravar ou anexar áudios e selecionar laudos em PDF.",
    ],
  },
  {
    id: "p06",
    role: "Paciente",
    title: "Enviar ao médico",
    section: "Preparar consulta",
    action: "send",
    phrases: [
      "Revise o conteúdo e confirme o envio ao médico.",
      "A preparação aparece na caixa do profissional, com o status do envio e da revisão.",
    ],
  },
  {
    id: "p07",
    role: "Paciente",
    title: "Orientações do médico",
    section: "Orientações do médico",
    phrases: [
      "Consulte as orientações publicadas pelo médico após a revisão.",
      "O que foi combinado fica disponível para acompanhar os próximos passos.",
    ],
  },
  {
    id: "p08",
    role: "Paciente",
    title: "Meus resultados",
    section: "Meus resultados",
    phrases: [
      "Abra os resultados, confira os valores, unidades e referências da coleta.",
      "O histórico ajuda a levar informações organizadas para a consulta.",
    ],
  },
  {
    id: "p09",
    role: "Paciente",
    title: "Entenda com IA",
    section: "Meus resultados",
    action: "patient-ai",
    phrases: [
      "A inteligência artificial também ajuda o paciente a entender os resultados em linguagem simples.",
      "Com autorização, ela explica os marcadores e sugere perguntas para conversar com o médico.",
    ],
  },
  {
    id: "p10",
    role: "Paciente",
    title: "Exames solicitados",
    section: "Exames solicitados",
    phrases: [
      "O paciente vê os exames liberados pelo médico e consulta os detalhes do pedido.",
      "Depois da coleta, pode enviar o PDF do resultado para a revisão.",
    ],
  },
  {
    id: "p11",
    role: "Paciente",
    title: "Comparar laboratórios",
    section: "Exames solicitados",
    action: "s2",
    phrases: [
      "O fluxo de cotação permite explorar exames e comparar laboratórios por localização e valores.",
      "Nesta demonstração, os preços e a integração com a S2 são simulados.",
    ],
  },
  {
    id: "p12",
    role: "Paciente",
    title: "Minha evolução",
    section: "Minha evolução",
    scroll: 500,
    phrases: [
      "Os gráficos mostram a evolução dos marcadores nas diferentes coletas.",
      "O paciente visualiza as mudanças e pode pedir uma explicação assistida por IA.",
    ],
  },
  {
    id: "p13",
    role: "Paciente",
    title: "Preparo dos exames",
    section: "Preparo dos exames",
    phrases: [
      "Consulte as informações de preparo associadas aos exames.",
      "Confirme com o laboratório e com o médico as instruções para sua coleta.",
    ],
  },
  {
    id: "p14",
    role: "Paciente",
    title: "Laboratórios favoritos",
    section: "Laboratórios favoritos",
    phrases: [
      "Guarde laboratórios de preferência para encontrar seus contatos depois.",
      "A consulta por CEP apresenta opções e cotações ilustrativas.",
    ],
  },
  {
    id: "p15",
    role: "Paciente",
    title: "Meus documentos",
    section: "Meus documentos",
    action: "document",
    phrases: [
      "Adicione PDFs, escolha o tipo de documento e encontre arquivos pelo nome.",
      "Abra o original e selecione os documentos que deseja enviar na preparação.",
    ],
  },
  {
    id: "p16",
    role: "Paciente",
    title: "Minha genética",
    section: "Minha genética",
    phrases: [
      "Envie o TXT genético e acompanhe o arquivo vinculado ao seu perfil.",
      "Os quatro domínios organizam a revisão. Eles ainda não calculam predisposição clínica.",
    ],
  },
  {
    id: "p17",
    role: "Paciente",
    title: "Linha do tempo",
    section: "Linha do tempo",
    phrases: [
      "A linha do tempo organiza exames, pedidos, envios e revisões em sequência.",
      "Pesquise e filtre os eventos para entender o histórico do acompanhamento.",
    ],
  },
  {
    id: "p18",
    role: "Paciente",
    title: "Meu perfil e acessibilidade",
    section: "Meu perfil",
    phrases: [
      "Confira seus dados de perfil e contatos.",
      "A busca do portal e os recursos de acessibilidade ajudam a encontrar informações e ajustar a leitura.",
    ],
  },
  {
    id: "p19",
    role: "Paciente",
    title: "Cuidado conectado, com IA",
    section: "Minha saúde",
    phrases: [
      "Médico e paciente conectados, com documentos, resultados, agenda e inteligência artificial no acompanhamento.",
      "Conheça a demonstração INOVA. Todos os exemplos deste vídeo usam dados fictícios.",
    ],
  },
];
