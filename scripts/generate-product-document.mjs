import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

// Repository-based product record. No API credentials, external calls or patient files.
const destination = resolve("docs/entregaveis");
mkdirSync(destination, { recursive: true });
const basename = "INOVA_PDR_e_Guia_do_Sistema_2026-10-07";
const escape = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
const p = (text) => `<p>${text}</p>`;
const list = (items) => `<ul>${items.map((item) => `<li>${item}</li>`).join("")}</ul>`;
const steps = (items) =>
  `<ol class="steps">${items.map((item) => `<li>${item}</li>`).join("")}</ol>`;
const table = (headers, rows) =>
  `<table><thead><tr>${headers.map((item) => `<th>${item}</th>`).join("")}</tr></thead><tbody>${rows.map((row) => `<tr>${row.map((item) => `<td>${item}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
const box = (title, text, kind = "note") =>
  `<aside class="${kind}"><strong>${title}</strong><p>${text}</p></aside>`;
const h3 = (text) => `<h3>${text}</h3>`;
const flow = (items) =>
  `<div class="flow">${items.map((item) => `<span>${item}</span>`).join("<b>→</b>")}</div>`;
const pages = [];
const add = (title, subtitle, body, category = "SISTEMA ATUAL") =>
  pages.push({ title, subtitle, body, category });

add(
  "Do resultado à continuidade do cuidado",
  "PDR / PRD · Documento de Requisitos do Produto e manual de uso",
  `
  <div class="cover-tag">REGISTRO DA VERSÃO DEMONSTRATIVA</div>
  <h1>Um sistema.<br>Dois espaços.<br>Cuidado conectado.</h1>
  <p class="cover-description">O que já foi implementado no INOVA, como utilizar cada fluxo e quais requisitos sustentam a experiência do médico e do paciente.</p>
  <div class="cover-grid"><div><b>Área médica</b><span>Resultados, evolução, documentos e análise assistida.</span></div><div><b>Área do paciente</b><span>Preparação da consulta, pedidos e acompanhamento.</span></div></div>
  <div class="cover-meta"><b>Versão documental 1.2</b><br>07 de outubro de 2026<br>Base: código e documentação do projeto INOVA. Inclui genética bruta.</div>
  ${box("Como ler este documento", "PDR é usado aqui como documento de requisitos do produto, também conhecido como PRD. As funções são descritas no estado atual do protótipo. Uma função demonstrativa funcionando não significa que esteja habilitada para atendimento em produção.")}
`,
  "INOVA · CUIDADO EM PERSPECTIVA",
);

add(
  "Mapa de leitura",
  "Manual de operação e especificação em um único documento",
  `
  <div class="toc">${[
    [3, "Visão do produto e público"],
    [4, "Inventário da área médica"],
    [5, "Abas do prontuário"],
    [6, "Passo a passo: acesso, paciente e resultados"],
    [7, "Passo a passo: laudos e IA"],
    [8, "Passo a passo: solicitação de exames"],
    [9, "Passo a passo: envios e orientações"],
    [10, "Inventário da área do paciente"],
    [11, "Passo a passo: resultados e documentos"],
    [12, "Passo a passo: gravação e envio"],
    [13, "Passo a passo: pedidos e laboratórios"],
    [14, "Passo a passo: continuidade do cuidado"],
    [15, "PDR: requisitos médicos"],
    [16, "PDR: requisitos do paciente"],
    [17, "Regras, estados e retenção"],
    [18, "Arquitetura e tecnologias utilizadas"],
    [19, "Validação e roteiro de demonstração"],
    [20, "Pendências, evolução e fontes do documento"],
    [21, "Novo módulo: arquivo bruto 23andMe"],
    [22, "PDR: genética bruta e scores pendentes"],
  ]
    .map(
      ([number, title]) =>
        `<a href="#page-${number}"><span>${title}</span><b>${String(number).padStart(2, "0")}</b></a>`,
    )
    .join("")}</div>
  ${h3("Legenda de situação")}
  ${table(
    ["Situação", "Significado"],
    [
      [
        "<span class='badge'>Implementado em demonstração</span>",
        "Fluxo programado e utilizável com dados fictícios e retenção temporária.",
      ],
      [
        "<span class='badge neutral'>Ilustrativo</span>",
        "Tela ou conteúdo de exemplo; não representa operação real integrada.",
      ],
      [
        "<span class='badge pending'>Integração pendente</span>",
        "Depende de serviço externo, autenticação, armazenamento ou recurso ainda não conectado.",
      ],
    ],
  )}
  ${p("As páginas de requisitos descrevem o que a versão demonstrativa já faz. As propostas para produção estão separadas na página 20.")}
`,
  "GUIA DE LEITURA",
);

add(
  "Visão do produto",
  "Organizar informação para apoiar a revisão médica e a participação do paciente",
  `
  ${h3("Problema que o INOVA procura resolver")}
  ${p("Exames, laudos extensos, histórico e relatos do paciente costumam chegar separados. O médico precisa localizar o documento, entender o período e conferir a fonte; o paciente precisa saber quais informações enviar e acompanhar os pedidos e orientações disponíveis.")}
  ${h3("Proposta implementada")}
  ${list([
    "Reunir histórico laboratorial, comparação entre coletas e documentos no espaço do médico.",
    "Oferecer síntese assistida de PDFs laboratoriais, genéticos e genômicos com acesso ao original e revisão humana.",
    "Permitir ao paciente escrever ou gravar relatos, juntar laudos e entregar o conjunto à caixa demonstrativa do médico.",
    "Conectar pedidos liberados, preferências de laboratório, orientações publicadas, avisos e linha do tempo.",
  ])}
  ${h3("Pessoas e responsabilidades")}
  ${table(
    ["Perfil", "Uso atual"],
    [
      [
        "Médico",
        "Consulta dados, confere documentos e sínteses, solicita exames e publica orientações após revisão.",
      ],
      [
        "Paciente",
        "Consulta seu histórico, prepara respostas, envia anexos, acompanha pedidos e lê orientações.",
      ],
      [
        "Equipe de desenvolvimento",
        "Mantém os dados fictícios, configuração local, limites, testes e próximos passos técnicos.",
      ],
    ],
  )}
  ${flow(["Médico solicita", "Paciente prepara e envia", "Médico revisa", "Paciente acompanha"])}
  ${box("Objetivo e limite", "A organização pode ajudar a preparar melhor a consulta, mas a versão atual não comprova redução de retornos, não faz diagnóstico e não substitui a avaliação clínica. Esses resultados dependem de validação futura.")}
  ${p("Personagens demonstrativos: Mariana Oliveira e Dr. Rafael Mendes. Nome, dados, CRM e resultados exibidos neste contexto são fictícios.")}
`,
  "VISÃO DO PRODUTO",
);

add(
  "Área médica · inventário",
  "Páginas disponíveis no menu principal",
  `
  ${table(
    ["Página / caminho", "O que existe hoje"],
    [
      [
        "Acesso médico<br><code>/</code>",
        "Formulário demonstrativo, senha visível/oculta e link para o acesso do paciente. O envio do formulário abre o painel; não há autenticação real.",
      ],
      [
        "Visão geral<br><code>/dashboard</code>",
        "Painel com dados fictícios, cartões, informações operacionais e atalhos para explorar a área médica.",
      ],
      [
        "Pacientes<br><code>/patients</code>",
        "Lista, pesquisa e abertura do perfil de um paciente.",
      ],
      [
        "Novo paciente<br><code>/patients/new</code>",
        "Formulário de dados cadastrais, validação de tamanho e duplicidade de CPF e inclusão temporária. Não verifica CPF em base oficial.",
      ],
      [
        "Novos resultados<br><code>/results</code>",
        "Lista demonstrativa com busca e filtros Última coleta, 7 dias e 30 dias. O período usa a última data da base fictícia.",
      ],
      [
        "Histórico de exames<br><code>/history</code>",
        "Pesquisa de paciente e acesso ao histórico laboratorial do seu perfil.",
      ],
      [
        "Comparação<br><code>/comparison</code>",
        "Escolha de paciente e duas coletas; tabela de valores, variação e contexto demonstrativo.",
      ],
      [
        "Médicos<br><code>/doctors</code>",
        "Diretório fictício, busca por nome/CRM/especialidade/clínica, filtro de situação e detalhes do profissional.",
      ],
      [
        "Acompanhamento<br><code>/follow-up</code>",
        "Cartões de pacientes e atalhos para evolução; movimentações da base demonstrativa.",
      ],
      [
        "Indicadores<br><code>/indicators</code>",
        "Números e gráficos operacionais ilustrativos, sem conexão com um laboratório real.",
      ],
      [
        "Configurações<br><code>/settings</code>",
        "Formulário e confirmação visual de preferências demonstrativas; não configura um serviço real de notificações.",
      ],
    ],
  )}
  ${box("Identidade visual", "Interface remodelada com identidade INOVA, menus separados, cartões, hierarquia de títulos, gráficos e adaptação a telas menores. A versão médica e o portal do paciente possuem navegação própria.")}
`,
  "INVENTÁRIO · MÉDICO",
);

add(
  "Prontuário · todas as abas",
  "Caminho de exemplo: /patients/mariana-oliveira",
  `
  ${table(
    ["Aba", "Função implementada"],
    [
      [
        "Resumo da consulta",
        "Consolida variações dos exames, laudos pendentes de revisão, checklist, contexto familiar, anotações temporárias e impressão.",
      ],
      [
        "Envios do paciente",
        "Recebe texto, áudios e PDFs entregues pelo portal; permite ouvir, abrir, encaminhar à análise, revisar e remover.",
      ],
      [
        "Solicitar exames",
        "Pesquisa e seleção no catálogo fictício; criação de rascunho, liberação ao paciente e cancelamento.",
      ],
      [
        "Orientações ao paciente",
        "Criação de texto em rascunho, revisão explícita, publicação e retirada; preparo exige pedido, fonte, link e data.",
      ],
      [
        "Visão geral",
        "Apresentação das informações disponíveis do paciente e resultados demonstrativos.",
      ],
      ["Resultados", "Consulta de resultados por coleta e categorias, com valores e unidades."],
      [
        "Laudos laboratoriais",
        "Seleção de PDF, leitura do documento, análise com Gemini e síntese para revisão.",
      ],
      ["Histórico", "Cartões e gráficos de evolução dos marcadores com filtro de período."],
      [
        "Histórico familiar",
        "Relatos fictícios de parentesco e condições para consulta e contexto; não é cálculo de risco.",
      ],
      [
        "Genética",
        "Organização de PDFs genéticos, resumo demonstrativo ou síntese produzida pelo Gemini e conferência de fontes.",
      ],
      [
        "Genômica",
        "Mesmo fluxo de documentos e IA, destinado aos laudos classificados como genômicos.",
      ],
      [
        "Comparação",
        "Comparação de duas coletas do paciente com diferenças numéricas e contexto do histórico.",
      ],
      [
        "Documentos",
        "Biblioteca dos laudos da sessão, busca por título/categoria e indicação de origem e revisão.",
      ],
    ],
  )}
  ${box("Pacientes recém-cadastrados", "O cadastro não cria exames nem histórico automaticamente. Quando não há dados, a interface mostra o estado vazio; a lista de abas disponíveis se adapta a esse perfil.")}
  ${p("A revisão de uma síntese acompanha sua apresentação no resumo da consulta e na biblioteca. Anotações e checklist pertencem à sessão de consulta, sem gravação permanente no prontuário.")}
`,
  "INVENTÁRIO · PRONTUÁRIO",
);

add(
  "Começar pela área médica",
  "Acesso, cadastro e consulta dos resultados",
  `
  ${h3("1. Entrar na demonstração")}
  ${steps([
    "Com o servidor ativo, abra <code>http://192.168.0.2:8080/</code>, ou <code>http://localhost:8080/</code> neste computador.",
    "Use os campos de exemplo: <b>rafael.mendes@clinicavida.com.br</b> e a senha fictícia <b>inova2026</b>. Clique em <b>Entrar na plataforma</b>.",
    "Abra <b>Pacientes</b> e selecione <b>Mariana Oliveira</b>. O perfil reúne as abas do prontuário.",
  ])}
  ${h3("2. Cadastrar um paciente fictício")}
  ${steps([
    "Abra <b>Novo paciente</b>. Informe nome, CPF fictício com 11 dígitos e nascimento; complete os campos adicionais desejados.",
    "Clique em <b>Cadastrar paciente</b>. Um CPF já usado na sessão é recusado.",
    "Busque o novo nome em <b>Pacientes</b>. Ele começa sem exames integrados e o cadastro é descartado ao atualizar a aplicação.",
  ])}
  ${h3("3. Resultados, evolução e comparação")}
  ${steps([
    "Em <b>Resultados</b>, escolha uma coleta. A apresentação acompanha o período selecionado.",
    "Em <b>Histórico</b>, consulte os gráficos e altere o filtro de período. Os cartões mostram valores, unidades e variação.",
    "Em <b>Comparação</b>, selecione coleta anterior e atual. Leia a diferença numérica e confira o contexto das fontes.",
    "Volte ao <b>Resumo da consulta</b>, registre pontos a conferir e marque o checklist. Use <b>Imprimir resumo</b> se desejar uma versão de revisão.",
  ])}
  ${box("Qual IA está conectada?", "A análise de PDFs usa Gemini. O painel de leitura conectada na comparação é uma prévia demonstrativa, identificada como sem IA conectada. Uma queda ou aumento de valor não é classificado automaticamente como melhora ou piora.")}
`,
  "PASSO A PASSO · MÉDICO",
);

add(
  "Analisar laudos com IA",
  "Fluxo comum a Análises clínicas, Genética e Genômica",
  `
  ${steps([
    "No paciente, abra <b>Laudos laboratoriais</b>, <b>Genética</b> ou <b>Genômica</b>, conforme o tipo do documento.",
    "Clique em <b>Selecionar PDF</b> e escolha um arquivo fictício ou anonimizado de até <b>8 MB</b>. O documento entra na lista da sessão e o original pode ser lido no visualizador.",
    "Selecione o documento e confirme a declaração de que o PDF é fictício ou anonimizado. Só então use <b>Analisar com Gemini</b>.",
    "Aguarde a conclusão. O conteúdo do PDF é enviado ao serviço Google pelo servidor; a chave permanece no servidor.",
    "Leia a <b>Síntese para revisão médica</b>: identidade extraída, escopo, achados, limitações e observações/resultados extraídos.",
    "Use os links de fonte para conferir a página e o trecho no original. A identidade extraída deve ser comparada ao paciente selecionado.",
    "Depois de conferir o conteúdo, marque a síntese revisada. O estado aparece também no resumo da consulta e em Documentos.",
  ])}
  ${h3("Documento original e síntese lado a lado")}
  ${p("As áreas de leitura do documento e do resultado da IA possuem rolagem própria, com altura limitada. O médico percorre o conteúdo extenso dentro do painel, sem precisar aumentar a página inteira para acomodar toda a síntese.")}
  ${h3("Itens críticos e rastreabilidade")}
  ${list([
    "Resultados alterados ou críticos são destacados apenas quando explicitamente declarados no laudo; não há cálculo universal de limites críticos.",
    "Páginas e trechos sugeridos pelo modelo exigem conferência humana. O servidor rejeita referências a páginas fora da quantidade informada na resposta.",
    "Dados extraídos do PDF não são adicionados automaticamente aos gráficos do histórico fictício.",
  ])}
  ${box("Resumo de exemplo e análise real são diferentes", "Ver resumo demonstrativo abre conteúdo ilustrativo. Analisar com Gemini processa o PDF selecionado, desde que o ambiente local e a configuração da API estejam habilitados.")}
`,
  "PASSO A PASSO · IA",
);

add(
  "Solicitar exames ao paciente",
  "Da seleção no catálogo à liberação do pedido",
  `
  ${steps([
    "Abra o paciente e entre em <b>Solicitar exames</b>.",
    "Pesquise e selecione os exames desejados no catálogo demonstrativo. Acrescente as observações que devem acompanhar o pedido.",
    "Clique em <b>Salvar rascunho do pedido</b>. Confira exames, paciente, profissional e observações na lista de pedidos.",
    "Clique em <b>Liberar para paciente</b>. O pedido liberado fica disponível no portal de Mariana e gera um aviso.",
    "Para interromper esse pedido, use <b>Cancelar pedido</b>. Um pedido liberado cancelado continua visível no portal, identificado como cancelado.",
  ])}
  ${flow(["Rascunho", "Liberado ao paciente", "Cancelado, se necessário"])}
  ${h3("Regras do fluxo")}
  ${table(
    ["Situação", "Comportamento"],
    [
      [
        "Rascunho",
        "Visível na área médica; oculto ao paciente. Seleções vazias, duplicadas ou desconhecidas são recusadas.",
      ],
      [
        "Liberado",
        "Paciente vê os exames, data, médico e notas; pode guardar sua preferência e informar realização.",
      ],
      [
        "Cancelado",
        "Consulta de preços e atualização do acompanhamento são desativadas. Não pode ser liberado novamente.",
      ],
      [
        "Repetição de envio",
        "O identificador da solicitação evita duplicar a criação do pedido ao repetir a mesma tentativa.",
      ],
    ],
  )}
  ${h3("O que chega ao paciente")}
  ${p("A seção Exames solicitados apresenta somente pedidos que já foram liberados para seu perfil demonstrativo. O paciente pode baixar uma lista em texto. Essa lista não contém assinatura nem validade de prescrição médica.")}
  ${box("Catálogo e integração", "Os nomes e identificadores do catálogo são internos à demonstração INOVA. Eles não são códigos de procedimentos da S2 nem comprovam cobertura, preço ou disponibilidade em uma unidade.")}
  ${p("No servidor de desenvolvimento, há limite de 100 pedidos e retenção de até 24 horas, ou até o reinício do processo.")}
`,
  "PASSO A PASSO · PEDIDOS",
);

add(
  "Revisar envios e publicar orientações",
  "A resposta do médico depende de uma ação explícita",
  `
  ${h3("1. Receber a preparação do paciente")}
  ${steps([
    "No prontuário, abra <b>Envios do paciente</b> e selecione a entrega recebida.",
    "Leia as respostas sobre sintomas, medicamentos e dúvidas. Se o paciente relacionou o envio a um pedido, confira a associação indicada.",
    "Use <b>Ouvir áudio recebido</b> e <b>Abrir laudo recebido</b> para consultar os anexos originais.",
    "Se necessário, use <b>Abrir na análise de laudos</b>. O documento vai para a aba correspondente; analisar com Gemini continua exigindo confirmação própria.",
    "Use <b>Marcar envio como revisado</b> para registrar a revisão. Essa ação gera um aviso ao paciente. <b>Remover envio da caixa</b> remove a entrega do servidor demonstrativo.",
  ])}
  ${h3("2. Publicar uma orientação")}
  ${steps([
    "Abra <b>Orientações ao paciente</b>. Escolha Resultados, Próximos passos ou Preparo dos exames; escreva título e texto.",
    "Para preparo, selecione um pedido ativo e informe unidade/fonte, link HTTPS e data válida da instrução conferida. Não basta informar o nome do exame.",
    "Clique em <b>Salvar rascunho da orientação</b>. Confira o texto, a associação ao paciente e a fonte, quando houver.",
    "Marque a declaração de revisão e clique em <b>Publicar para paciente</b>. O texto passa a aparecer no portal e gera aviso.",
    "Use <b>Retirar orientação</b> para removê-la do portal. O histórico registra a retirada; uma orientação retirada exige uma nova versão para publicação.",
  ])}
  ${box("Três ações diferentes", "Receber um envio não significa revisá-lo. Marcar revisado não produz uma resposta automática. Uma orientação só chega ao paciente depois de sua publicação explícita pelo médico.")}
`,
  "PASSO A PASSO · MÉDICO → PACIENTE",
);

add(
  "Área do paciente · inventário",
  "Acesso separado e quatorze seções de acompanhamento",
  `
  ${table(
    ["Seção", "O que o paciente encontra"],
    [
      [
        "Meu cuidado",
        "Resumo da última coleta, atalhos, situação local das anotações/documentos e próximos passos.",
      ],
      [
        "Próximos passos",
        "Pendências calculadas a partir de pedidos, realização informada, laudos vinculados, envios e orientações.",
      ],
      [
        "Avisos",
        "Eventos registrados de pedidos, recebimento/revisão, publicação/retirada e realização informada; controle de leitura.",
      ],
      ["Meus resultados", "Resultados demonstrativos por coleta e busca de marcadores."],
      [
        "Exames solicitados",
        "Pedidos liberados, observações, cancelamento, download de lista, preferência e realização informada.",
      ],
      [
        "Minha evolução",
        "Quatro gráficos de marcadores, filtros de período e parâmetros de referência com idade/contexto.",
      ],
      [
        "Meus documentos",
        "PDFs adicionados localmente, categoria, visualizador, pesquisa e remoção.",
      ],
      [
        "Preparar consulta",
        "Texto ou áudio para sintomas, medicamentos e dúvidas; anexos, vínculo opcional com pedido e envio ao médico.",
      ],
      [
        "Orientações do médico",
        "Textos de resultados e próximos passos revisados e publicados pelo médico.",
      ],
      [
        "Preparo dos exames",
        "Instruções publicadas com fonte, data e pedido ativo. Estado vazio quando nada foi publicado.",
      ],
      [
        "Laboratórios favoritos",
        "Cadastro manual de locais de preferência, endereço, CEP e site HTTPS opcional.",
      ],
      [
        "Linha do tempo",
        "Pedidos, envios, revisão, orientações, documentos locais e histórico fictício; pesquisa e filtros.",
      ],
      ["Meu perfil", "Identificação fictícia e edição demonstrativa de contatos."],
      [
        "Minha genética",
        "TXT bruto compatível com 23andMe, versões e revisão; quatro domínios com scores pendentes (p. 21–22).",
      ],
    ],
  )}
  ${p("No computador, o menu lateral tem rolagem própria. Em telas menores, ele abre por botão de menu. O cabeçalho oferece acesso aos avisos e mostra a quantidade não lida.")}
  ${box("Perfil disponível", "O portal atual usa o perfil fictício de Mariana Oliveira. Ele não é um sistema de contas de pacientes reais nem uma área autenticada de produção.")}
`,
  "INVENTÁRIO · PACIENTE",
);

add(
  "Consultar resultados e documentos",
  "Nascimento, idade, evolução e organização dos PDFs",
  `
  ${h3("1. Entrar no espaço do paciente")}
  ${steps([
    "Abra <code>/acesso-paciente</code> pelo link Sou paciente ou pelo endereço do servidor.",
    "Use <b>mariana@exemplo.com</b> e a senha fictícia <b>inova2026</b>. A entrada abre <code>/portal-paciente</code>.",
    "Em <b>Meus resultados</b>, escolha a coleta e pesquise os marcadores desejados.",
    "Em <b>Minha evolução</b>, altere o período e consulte os gráficos de LDL, glicemia, hemoglobina e vitamina D.",
  ])}
  ${h3("2. Como a referência usa o cadastro")}
  ${p("O nascimento de Mariana é <b>14/03/1994</b>. A idade é calculada usando o nascimento e a data da coleta de referência, não apenas um texto de idade fixo. Na coleta fictícia de <b>18/09/2026</b>, a idade calculada é <b>32 anos</b>.")}
  ${table(
    ["Marcador", "Regra utilizada pelo software"],
    [
      [
        "Hemoglobina",
        "Referência adulta selecionada conforme sexo de referência conhecido; orientação para conferir método e contexto no laudo.",
      ],
      [
        "Glicemia",
        "Parâmetro condicionado ao jejum; o histórico não informa jejum, portanto a referência não classifica automaticamente o resultado.",
      ],
      [
        "Vitamina D",
        "Parâmetro de consulta por faixa etária, com ressalvas para grupos e condições clínicas.",
      ],
      [
        "LDL",
        "A idade isolada não define uma meta; a interface informa que a meta individual depende do médico.",
      ],
    ],
  )}
  ${p("Nascimento inválido ou ausente impede a seleção. Para menores de 18 anos, o sistema indica a referência pediátrica do laudo. A tela identifica as fontes do catálogo; elas não são intervalos emitidos pelo laboratório executor.")}
  ${h3("3. Guardar um documento na sessão")}
  ${steps([
    "Abra <b>Meus documentos</b>, escolha a categoria e adicione um PDF de até 8 MB.",
    "Consulte o original no visualizador, pesquise pelo nome e remova o arquivo se necessário.",
    "Para entregar ao médico, vá a <b>Preparar consulta</b> e selecione esse laudo antes de enviar. Apenas adicionar o PDF não o envia.",
  ])}
`,
  "PASSO A PASSO · PACIENTE",
);

add(
  "Preparar consulta por texto ou áudio",
  "Gravar, ouvir, apagar, refazer e enviar com laudos",
  `
  ${steps([
    "Abra <b>Preparar consulta</b>. Preencha ou grave: Como você tem se sentido?, Medicamentos e suplementos e Suas perguntas para a consulta.",
    "Para gravar, use os controles de áudio do campo e autorize o microfone. Conte com suas palavras o que mudou, o que usa e o que deseja esclarecer.",
    "Pare e ouça a gravação. Se houver erro, apague o áudio e faça outro antes de enviar. Cada campo aceita um áudio concluído.",
    "Em HTTP pela rede, a gravação pode ser bloqueada pelo navegador. Neste computador, use <code>http://localhost:8080/acesso-paciente</code>. O portal também permite anexar áudio já gravado.",
    "Adicione os PDFs em Adicionar laudo à preparação ou use documentos já presentes na sessão. Marque os arquivos que deseja entregar.",
    "Se o envio corresponder a exames solicitados, escolha o pedido em <b>Relacionar envio a um pedido</b>. A associação é opcional para uma preparação geral.",
    "Confirme que respostas e anexos são fictícios ou anonimizados. Clique em <b>Enviar preparação e anexos</b> e aguarde a confirmação de recebimento.",
  ])}
  ${h3("Limites implementados")}
  ${table(
    ["Item", "Limite"],
    [
      ["Respostas escritas", "Até 3.000 caracteres por campo."],
      ["Gravação", "Até 3 minutos por áudio; até 5 MB por arquivo; três campos de áudio."],
      ["Laudos", "Até três PDFs por envio, de até 8 MB cada."],
      ["Conjunto enviado", "Até 24 MB somando os anexos."],
    ],
  )}
  ${box("Depois do envio", "A entrega fica disponível em Envios do paciente na área médica. Áudios não são transcritos automaticamente. O portal não manda os anexos ao Google; uma análise de PDF pelo médico é uma ação separada.")}
  ${p("Salvar anotações e imprimir continuam disponíveis. Navegar entre seções preserva áudios concluídos; uma gravação em andamento é descartada ao sair da seção e o microfone é liberado. Atualizar a página remove os rascunhos locais.")}
`,
  "PASSO A PASSO · ÁUDIO E ANEXOS",
);

add(
  "Pedidos e locais de preferência",
  "Escolher laboratório, consultar o estado da integração e relacionar o laudo",
  `
  ${h3("1. Receber e conferir o pedido")}
  ${steps([
    "Abra <b>Exames solicitados</b>. Selecione um pedido liberado e confira médico, exames e observações.",
    "Use <b>Atualizar pedidos</b> para buscar mudanças. Um pedido cancelado fica identificado e não pode consultar preços.",
    "Se desejar, baixe a lista demonstrativa em texto para consulta; ela não é uma prescrição assinada.",
  ])}
  ${h3("2. Cadastrar a preferência e acompanhar a realização")}
  ${steps([
    "Em <b>Laboratórios favoritos</b>, informe nome, endereço ou bairro/cidade, CEP e site HTTPS opcional. Salve o favorito.",
    "Volte ao pedido e escolha o favorito no campo Laboratório de preferência. Essa escolha não reserva horário nem confirma parceria.",
    "Se já realizou o conjunto de exames, informe uma data válida até hoje e clique em <b>Guardar acompanhamento</b>. Deixe em branco se ainda não realizou.",
    "Você pode corrigir ou remover a data posteriormente. O evento será indicado como informação sua, sem confirmação do laboratório.",
    "Quando o laudo estiver disponível, adicione o PDF em Preparar consulta, selecione o pedido correspondente e envie. Um laudo não vinculado ou de outro pedido não conclui essa pendência.",
  ])}
  ${h3("3. Como funciona a área S2 hoje")}
  ${p("O formulário aceita um CEP de oito dígitos e valida o pedido. O adaptador responde <b>integração pendente</b>, sem ofertas. O botão Abrir site da S2 leva apenas à página pública, sem transmitir pedido, CEP ou dados pessoais na URL.")}
  ${box("O que ainda depende da S2", "Consulta de preços reais dentro do INOVA, parceiros/unidades, disponibilidade, reserva, pagamento e agendamento não estão conectados. Precisam de documentação, acesso e mapeamento oficial dos exames. Favoritos são cadastrados pelo paciente.", "warning")}
`,
  "PASSO A PASSO · EXAMES E LABORATÓRIOS",
);

add(
  "Acompanhar o que acontece",
  "Próximos passos, orientações, preparo, avisos e linha do tempo",
  `
  ${table(
    ["Seção", "Passo a passo de uso"],
    [
      [
        "Próximos passos",
        "Leia as ações sugeridas e clique para abrir a seção correspondente. Pendências incluem pedido sem realização, preparo ausente, laudo não vinculado e entrega aguardando revisão.",
      ],
      [
        "Orientações do médico",
        "Abra a seção depois de receber um aviso. Leia os textos publicados e a identificação do profissional demonstrativo. Rascunhos e orientações retiradas não aparecem.",
      ],
      [
        "Preparo dos exames",
        "Confira instrução, fonte, link e data, quando houver publicação vinculada a um pedido ativo. Sem instrução publicada, o portal mostra que o preparo ainda não foi informado.",
      ],
      [
        "Avisos",
        "Abra pelo menu ou sino do cabeçalho. Use Ver acompanhamento para ir ao assunto, marque individualmente como lido ou use Marcar avisos como lidos.",
      ],
      [
        "Linha do tempo",
        "Pesquise um termo ou filtre por pedidos, envios, revisões/orientações, preparo, documentos locais ou coletas históricas. Use Abrir detalhe para consultar a seção.",
      ],
      [
        "Meu perfil",
        "Confira Mariana e edite os contatos demonstrativos. A edição não cria uma conta real e não muda a identidade do perfil.",
      ],
    ],
  )}
  ${h3("Como os avisos são produzidos")}
  ${list([
    "Liberação ou cancelamento de pedido pelo médico.",
    "Recebimento efetivo e revisão de envio na caixa demonstrativa.",
    "Publicação ou retirada de orientação pelo médico.",
    "Realização informada e correção dessa informação pelo paciente.",
  ])}
  ${p("Avisos e acompanhamento são buscados automaticamente a cada <b>30 segundos</b>, enquanto a aba está visível. A atualização manual fica disponível. O estado lido permanece no servidor durante a vida dos dados demonstrativos, inclusive após recarregar o portal.")}
  ${box("Datas e origem", "A linha do tempo diferencia eventos do servidor, documentos locais e coletas fictícias pré-existentes. Quando a coleta histórica possui apenas mês/ano, a tela informa dia não informado. Não inventa uma data de atendimento ou recebimento.")}
  ${p("O botão Sair do meu espaço remove o marcador demonstrativo de acesso do navegador. Entrar novamente não recupera os rascunhos locais apagados pela saída ou atualização.")}
`,
  "PASSO A PASSO · CONTINUIDADE",
);

add(
  "PDR · requisitos da área médica",
  "Critérios do produto que já estão presentes no protótipo",
  `
  ${table(
    ["ID", "Requisito", "Critério de aceitação da demonstração"],
    [
      [
        "RF-01",
        "Acessos separados",
        "O acesso médico abre o painel; o link do paciente abre sua própria entrada e navegação.",
      ],
      [
        "RF-02",
        "Diretório de pacientes",
        "Buscar e abrir o paciente correto; novo cadastro exige campos, tamanho e CPF não duplicado na sessão.",
      ],
      [
        "RF-03",
        "Resultados por coleta",
        "Trocar coleta altera os resultados; filtros de novos resultados respeitam a base demonstrativa.",
      ],
      [
        "RF-04",
        "Evolução e comparação",
        "Mostrar valores/unidades, período e variação; ausência de duas coletas gera estado vazio.",
      ],
      [
        "RF-05",
        "Resumo da consulta",
        "Checklist, anotações, contexto familiar e laudos compartilham estado de revisão na sessão; impressão disponível.",
      ],
      [
        "RF-06",
        "Documentos em três categorias",
        "PDFs podem ser selecionados em Laboratorial, Genética e Genômica; original e biblioteca ficam acessíveis.",
      ],
      [
        "RF-07",
        "Síntese Gemini",
        "PDF válido de até 8 MB e confirmação permitem solicitar análise; resposta validada apresenta identidade, escopo e evidências.",
      ],
      [
        "RF-08",
        "Fontes e revisão humana",
        "Síntese mantém páginas/trechos e estado de revisão. Resultados não entram automaticamente no histórico.",
      ],
      [
        "RF-09",
        "Criação de pedido",
        "Selecionar itens conhecidos e não duplicados, escrever notas e salvar um rascunho; vazio é recusado.",
      ],
      [
        "RF-10",
        "Liberação e cancelamento",
        "Somente pedido liberado chega ao paciente; cancelamento impede nova liberação e consulta de preços.",
      ],
      [
        "RF-11",
        "Caixa de preparação",
        "Texto, áudio e laudo enviados pelo portal são consultáveis; revisão e remoção operam sobre a entrega selecionada.",
      ],
      [
        "RF-12",
        "Publicação de orientações",
        "Rascunho fica privado; publicação exige declaração de revisão. Retirada remove acesso do paciente.",
      ],
      [
        "RF-13",
        "Preparo com fonte",
        "Exige pedido ativo do paciente, fonte/unidade, HTTPS e data válida; pedido cancelado não recebe nova publicação vinculada.",
      ],
    ],
  )}
  ${box("Escopo de implementação", "Todos esses critérios se referem à demonstração local. A entrada visual de um usuário e um campo CRM não equivalem a autenticação, validação profissional ou assinatura.")}
`,
  "PDR / PRD · REQUISITOS FUNCIONAIS",
);

add(
  "PDR · requisitos do paciente",
  "Recebimento, participação e rastreabilidade no portal",
  `
  ${table(
    ["ID", "Requisito", "Critério de aceitação da demonstração"],
    [
      [
        "RF-14",
        "Entrada do paciente",
        "Credenciais fictícias de Mariana abrem o portal; acesso direto sem marcador de sessão volta à entrada.",
      ],
      [
        "RF-15",
        "Referência contextual",
        "Idade vem do nascimento e coleta; referências identificam contexto/fonte. Data inválida e população pediátrica não recebem faixas adultas automáticas.",
      ],
      [
        "RF-16",
        "PDFs locais",
        "Classificar, visualizar, buscar e remover arquivos válidos. Adicionar não equivale a enviar.",
      ],
      [
        "RF-17",
        "Texto e áudio por assunto",
        "Três campos aceitam texto/áudio. É possível ouvir, apagar e refazer; microfone é liberado ao encerrar/sair.",
      ],
      [
        "RF-18",
        "Entrega ao médico",
        "Confirmação e conteúdo válido permitem envio; recibo informa anexos. Repetir a mesma solicitação não duplica a entrega.",
      ],
      [
        "RF-19",
        "Pedido recebido",
        "Portal mostra pedidos liberados do paciente, médico, data, exames, notas e situação de cancelamento.",
      ],
      [
        "RF-20",
        "Preferências de laboratório",
        "Cadastrar até dez favoritos, remover e associar um favorito próprio ao pedido; usar seu CEP no formulário.",
      ],
      [
        "RF-21",
        "Realização informada",
        "Data válida até hoje pode ser salva, corrigida e removida; tela identifica a falta de confirmação externa.",
      ],
      [
        "RF-22",
        "Vínculo laudo–pedido",
        "Envio pode indicar pedido ativo do paciente; PDF de outro pedido não elimina a pendência do pedido atual.",
      ],
      [
        "RF-23",
        "Orientações e preparo",
        "Somente publicados ficam disponíveis; preparo mantém fonte/data e exige pedido ainda ativo.",
      ],
      [
        "RF-24",
        "Avisos",
        "Eventos reais da demonstração geram avisos; marcação lida por paciente persiste durante a retenção.",
      ],
      [
        "RF-25",
        "Próximos passos",
        "Ações derivam dos dados disponíveis e deixam de considerar pedidos cancelados.",
      ],
      [
        "RF-26",
        "Linha do tempo",
        "Reúne fontes identificadas, busca, filtros e abertura de detalhe, sem inventar o dia de coletas informadas só por mês.",
      ],
      [
        "RF-27",
        "S2 transparente",
        "CEP é validado; integração desconectada retorna zero ofertas e a tela não mostra preço ou agendamento fictício.",
      ],
    ],
  )}
`,
  "PDR / PRD · REQUISITOS FUNCIONAIS",
);

add(
  "Regras, estados e retenção",
  "O que permanece, o que expira e o que cada estado significa",
  `
  ${h3("Estados principais")}
  ${flow(["PDF local", "Analisando", "Síntese pendente", "Revisado"])}
  ${flow(["Envio recebido", "Aguardando revisão", "Revisado pelo médico"])}
  ${flow(["Orientação em rascunho", "Publicada", "Retirada"])}
  ${p("Esses estados são independentes: análise de IA, revisão de envio e publicação de orientação não concluem automaticamente uns aos outros. Cancelamento de pedido é definitivo para aquele registro demonstrativo.")}
  ${table(
    ["Dados", "Armazenamento e duração atual"],
    [
      [
        "Cadastro, checklist e consulta médica",
        "Estado da aplicação/sessão; sem prontuário persistente. Recarregar perde o cadastro e reabrir o paciente reinicia a consulta.",
      ],
      [
        "PDFs e sínteses da área médica",
        "Memória enquanto o paciente está aberto; sem gravação de arquivo no disco pelo fluxo da aplicação.",
      ],
      [
        "Rascunhos, áudios, PDFs e contatos do portal (exceto TXT genético)",
        "Memória da página. Troca de seção mantém conteúdo concluído; atualizar/sair o descarta.",
      ],
      [
        "Entregas ao médico",
        "Memória do servidor: até 20 envios e 128 MB, por até 24 horas ou até reiniciar.",
      ],
      ["Pedidos", "Memória do servidor: até 100 registros, por até 24 horas ou até reiniciar."],
      [
        "Favoritos, orientações, progresso e avisos",
        "Memória do servidor com expiração de até 24 horas conforme o registro. Até 10 favoritos por paciente, 100 orientações no processo e 1.000 eventos.",
      ],
      [
        "Marcador de entrada do paciente",
        "sessionStorage no navegador. É uma marca de demonstração, não uma credencial de autorização no servidor.",
      ],
    ],
  )}
  ${h3("Regras de consistência")}
  ${list([
    "PDFs e áudios passam por validação de formato, tamanho e assinatura de arquivo. Entrega inválida não é parcialmente gravada.",
    "Pedidos, favoritos, leitura de avisos e orientações são filtrados pelo paciente indicado na demonstração; isso não substitui autorização de contas reais.",
    "Remover um favorito limpa sua associação ao progresso do pedido. Data de realização e data de fonte não podem ser inválidas ou futuras.",
    "Atualização dos eventos não é uma trilha de auditoria permanente nem garantia de atendimento/urgência.",
  ])}
`,
  "PDR / PRD · REGRAS DE NEGÓCIO",
);

add(
  "Arquitetura utilizada",
  "Tecnologias presentes e separação entre navegador, servidor e serviços",
  `
  ${table(
    ["Camada", "Tecnologia / responsabilidade"],
    [
      [
        "Interface",
        "React 19 e TypeScript; componentes de médico/paciente, formulários e estado da sessão.",
      ],
      [
        "Rotas e chamadas ao servidor",
        "TanStack Router e TanStack Start; rotas de acesso, prontuário, painel e portal; server functions.",
      ],
      [
        "Visual",
        "Tailwind CSS 4, componentes de interface Radix/shadcn e ícones Lucide; identidade INOVA e layout responsivo.",
      ],
      ["Gráficos", "Recharts; evolução dos marcadores e indicadores demonstrativos."],
      [
        "Validação",
        "Zod; contratos para PDF/síntese, pedidos, preparação, favoritos e orientações.",
      ],
      [
        "Áudio e PDFs no navegador",
        "MediaRecorder, FileReader, Blob/File e URLs locais; gravação nativa, anexos e visualizadores.",
      ],
      [
        "Servidor demonstrativo",
        "Stores em memória para pedidos, entregas e acompanhamento; idempotência, limites e expiração.",
      ],
      [
        "IA externa",
        "Google Gemini via chamada REST no servidor; saída estruturada validada antes de exibir a síntese.",
      ],
      [
        "Build",
        "Vite com configuração Lovable e Nitro; alvo Cloudflare na configuração do projeto. Build disponível não significa implantação realizada.",
      ],
      [
        "S2",
        "Adaptador desconectado com resposta explícita; sem chamada a API de preços nesta versão.",
      ],
    ],
  )}
  ${flow(["Navegador INOVA", "Server functions", "Validação + memória", "Gemini, quando solicitado"])}
  ${h3("Configuração local, sem expor credenciais")}
  ${p("O arquivo local de ambiente usa nomes <code>GEMINI_API_KEY</code>, <code>GEMINI_MODEL</code>, <code>INOVA_AI_ENABLED</code> e <code>INOVA_AI_ORIGIN</code>. A chave não entra no navegador, em variáveis VITE_* ou neste documento. O modelo é configurável.")}
  ${box("Acesso e controle atuais", "Operações locais exigem desenvolvimento, habilitação explícita e origem permitida. Produção é recusada nos endpoints demonstrativos. Isso reduz o escopo do protótipo, mas não implementa login real, vínculo médico–paciente ou autorização por usuário.")}
`,
  "PDR / PRD · TECNOLOGIA",
);

add(
  "Validação e demonstração",
  "Evidências já obtidas e roteiro para apresentar o sistema",
  `
  ${h3("Verificações executadas no desenvolvimento")}
  ${table(
    ["Conjunto", "Cobertura"],
    [
      [
        "7 testes Gemini",
        "Guarda de origem, validação de PDF, páginas citadas, envio/retorno estruturado e tratamento de erros sem expor segredo.",
      ],
      [
        "6 testes de preparação",
        "Entrega atômica, repetição sem duplicação, consentimento, anexos, revisão/remoção e expiração.",
      ],
      [
        "6 testes de pedidos",
        "Rascunho privado, liberação, cancelamento, catálogo, resposta S2 desconectada e expiração.",
      ],
      [
        "5 testes de referências",
        "Aniversário/idade, datas inválidas, adulto/pediátrico, sexo e contexto condicional.",
      ],
      [
        "7 testes de acompanhamento",
        "Publicação/retirada, fontes, leitura, favoritos, eventos, vínculo de entrega e retenção.",
      ],
      [
        "Navegador e compilação",
        "Fluxos médico/paciente/pedidos/continuidade; áudio nativo e anexos; layout móvel; TypeScript, lint dos arquivos alterados e build aprovados.",
      ],
    ],
  )}
  ${p("Total atualizado: <b>45 testes automatizados</b> dos contratos/serviços passaram: os 31 desta tabela, dez de genética bruta (p. 22) e quatro adicionais de IA e recuperação de falhas, além dos roteiros de navegador. Testes de software não são validação clínica, certificação ou prova de prontidão para produção.")}
  ${h3("Roteiro de apresentação do produto")}
  ${steps([
    "Entrar como médico, abrir Mariana e mostrar resumo, resultados, gráficos e comparação.",
    "Abrir um PDF fictício em uma aba de laudos, analisar quando a API estiver habilitada e conferir original/fontes.",
    "Criar um pedido, mostrar que o rascunho fica privado e liberá-lo ao paciente.",
    "Entrar no portal; mostrar pedido, favoritos, estado pendente da S2 e preparo, quando publicado com fonte.",
    "Preparar respostas e áudio em localhost, anexar PDF, relacionar ao pedido e enviar.",
    "Voltar ao médico, ouvir o áudio, revisar o envio e publicar uma orientação conferida.",
    "Voltar ao portal, ler a orientação, marcar avisos e consultar a linha do tempo. Demonstrar retirada/cancelamento se necessário.",
  ])}
  ${box("Material de teste", "O projeto inclui PDFs fictícios em public/examples/. Uma análise real pelo Gemini pode consumir cota da API. Se usar arquivos reais, a demonstração atual não oferece a base de autenticação e armazenamento necessária.")}
`,
  "PDR / PRD · ACEITAÇÃO",
);

add(
  "Pendências e próxima versão",
  "Separação entre protótipo funcional e operação real",
  `
  ${table(
    ["Prioridade sugerida", "Entrega necessária antes do uso real"],
    [
      [
        "1 · Contas e acesso",
        "Autenticação no servidor, recuperação de conta, perfis e autorização por paciente; vínculo entre médico e paciente.",
      ],
      [
        "2 · Persistência",
        "Banco de dados e arquivos com controle de acesso; retenção definida, histórico de versões, auditoria e recuperação.",
      ],
      [
        "3 · Identificação e revisão",
        "Confirmação da identidade dos laudos e regras de revisão/importação; governança dos parâmetros de referência e evidências.",
      ],
      [
        "4 · Pedidos reais",
        "Requisitos de emissão/assinatura e identificação do profissional, definidos antes de substituir a lista demonstrativa.",
      ],
      [
        "5 · S2",
        "Documentação e credenciais oficiais, mapeamento de procedimentos e validação das operações de preço/unidade/disponibilidade.",
      ],
      [
        "6 · Expansão",
        "Notificações externas, agendamento/pagamento e transcrição de áudio somente quando projetados, integrados e testados.",
      ],
    ],
  )}
  ${h3("Recursos que não devem ser apresentados como prontos")}
  ${p("Diagnóstico ou prescrição automática; cálculo universal de risco/valores críticos; sincronização com laboratório real; prontuário permanente; conta real de paciente; preço ou agendamento S2; assinatura digital; áudio transcrito por IA; envio de SMS/e-mail/push e publicação automática da síntese Gemini.")}
  ${h3("Fontes e rastreabilidade deste documento")}
  ${list([
    "Código: src/components/inova/ e src/routes/ — telas e ações dos usuários.",
    "Contratos e stores: src/lib/ai*, gemini-core.server.ts, preparation*, exam-order*, care*, patient-age.ts e marker-reference.ts.",
    "Dados fictícios e catálogo: src/data/demo.ts, molecular-reports.ts e order-exams.ts.",
    "Documentação: docs/medical-workspace.md, patient-workspace.md, exam-orders.md e patient-care.md.",
    "Verificação: scripts/test-*.mjs, smoke-workspace.mjs, smoke-patient.mjs, smoke-orders.mjs e smoke-care.mjs.",
  ])}
  ${box("Registro de versão", "Documento 1.2 · 07/10/2026 · retrato do projeto nesta data, com suplemento de genética bruta nas páginas 21–22. As regras de retenção local do TXT são diferentes dos PDFs e rascunhos. Conteúdo baseado no repositório e nas verificações do desenvolvimento.")}
  ${p("Entregáveis: este PDF e sua versão HTML editável, gerados pelo script scripts/generate-product-document.mjs. Nenhuma chave de API ou dado de paciente real é incluído.")}
`,
  "PDR / PRD · EVOLUÇÃO",
);

add(
  "Arquivo bruto 23andMe no INOVA",
  "Importar uma vez e consultar os quatro domínios nos retornos",
  `
  ${p("O novo módulo adiciona Minha genética ao portal do paciente e integra os arquivos brutos à aba Genética do médico, ao Resumo da consulta e à biblioteca de Documentos. A página inicial do paciente também mostra os quatro domínios quando um arquivo está vinculado.")}
  ${flow(["TXT fictício", "Importação validada", "Perfil do paciente", "Revisão e retornos"])}
  ${h3("Passo a passo")}
  ${steps([
    "Se o arquivo veio por WhatsApp ou e-mail, salve-o manualmente. Extraia o ZIP, quando houver. Não há importação automática de mensagens.",
    "No portal, abra Minha genética; no prontuário, use Genética. Selecione o TXT e confirme que é fictício e destinado ao perfil correto.",
    "Envie/importe o arquivo. O sistema valida as quatro colunas rsid, chromosome, position e genotype, antes de criar o vínculo.",
    "Confira nome, data, origem do envio, versão do genoma, orientação dos alelos, ausências de chamada e avisos técnicos. Até 25 marcadores aparecem na amostra, sem interpretação.",
    "O médico confere a associação e marca o arquivo revisado. Essa ação gera um aviso; não calcula um score.",
    "Nos próximos acessos, consulte a mesma versão e os quatro domínios. Um arquivo idêntico não cria outra cópia. O seletor permite escolher até três versões.",
    "Baixar cópia do TXT confere a integridade pelo hash. Excluir arquivo genético abre uma confirmação e remove cópia/metadados.",
  ])}
  ${h3("Quatro domínios, sem pontuação inventada")}
  ${table(
    ["Domínio", "Situação atual"],
    [
      ["Neurologia", "Score não calculado · predisposição não estimada."],
      ["Metabólico", "Score não calculado · predisposição não estimada."],
      ["Imunidade", "Score não calculado · predisposição não estimada."],
      ["Nutrição", "Score não calculado · predisposição não estimada."],
    ],
  )}
  ${box("Decisão de produto", "Conforme definido, os scores ficam pendentes até haver metodologia validada. Quantidade de variantes e taxa de chamadas são informações técnicas, não predisposição. Não há dose, conduta pronta ou par gene–fármaco.")}
`,
  "SUPLEMENTO · GENÉTICA BRUTA",
);

add(
  "PDR · genética bruta",
  "Requisitos adicionais, retenção e dependências de scoring",
  `
  ${table(
    ["ID", "Requisito", "Critério atual"],
    [
      [
        "RF-G01",
        "Importação compatível",
        "TXT UTF-8, quatro colunas, comentários #; erro de estrutura/registro rejeita o arquivo inteiro.",
      ],
      [
        "RF-G02",
        "Vínculo por paciente",
        "Envio do portal é recebido na Genética do médico; outro paciente não vê esse registro.",
      ],
      [
        "RF-G03",
        "Deduplicação e versões",
        "Hash por paciente evita repetição. Até três versões; cópia UTF-8 preservada para consulta.",
      ],
      [
        "RF-G04",
        "Quatro domínios nos retornos",
        "Cartões aparecem na página inicial, Genética, resumo e documentos; não exibem score zero ou risco baixo por falta de modelo.",
      ],
      [
        "RF-G05",
        "Revisão explícita",
        "Médico confirma associação e arquivo; revisão não valida clinicamente o teste nem interpreta predisposição.",
      ],
      [
        "RF-G06",
        "Original e exclusão",
        "Integridade SHA-256 conferida antes de download/revisão; exclusão confirmada remove TXT e metadados.",
      ],
      [
        "RF-G07",
        "Persistência local",
        "Cópias fictícias sobrevivem ao reinício no mesmo diretório; endpoints recusam produção.",
      ],
    ],
  )}
  ${h3("Limites e retenção diferentes dos PDFs")}
  ${p("Até 25 MB por TXT, 1,2 milhão de marcadores, três versões por paciente, 20 arquivos e 100 MB de texto na demonstração. O diretório .inova-demo/genetics/ fica fora do Git. Não há expiração automática de 24 horas: a exclusão é explícita. Essa retenção local não é armazenamento em nuvem, backup ou prontuário de produção. Apenas dados fictícios são permitidos neste protótipo sem autenticação real.")}
  ${h3("Dependência para estimar predisposição")}
  ${p("É preciso definir fenótipos, variantes, alelos de efeito, pesos, versão do genoma, população de validação, cobertura e calibração. Um domínio amplo não corresponde automaticamente a um modelo. O TXT não é enviado ao Gemini para inventar scores. Referência técnica consultada: PGS Catalog, https://www.pgscatalog.org/about/.")}
  ${h3("Validação do novo módulo")}
  ${p("Dez testes automatizados cobrem parser, consentimento fictício, ausência de score, persistência entre instâncias, duplicação, separação por paciente, importação atômica, versões, integridade e exclusão. O teste de navegador percorre paciente → médico → retorno, download, avisos, erro sem perder o arquivo e layout móvel.")}
  ${box("Documentação de implementação", "docs/genetic-raw.md · scripts/test-genetics.mjs · scripts/smoke-genetics.mjs. O projeto inclui um TXT inteiramente sintético para testar o formato, sem genes, risco ou interpretação clínica.")}
`,
  "SUPLEMENTO · PDR / PRD",
);

add(
  "Médico: fila, identidade e fechamento",
  "Atualização de usabilidade e continuidade · versão 1.2",
  `
  ${p("O dashboard agora reúne pendências do ambiente demonstrativo: envios não revisados, pedidos em rascunho, pedidos liberados sem laudo e orientações ainda não publicadas. Filtre por categoria e abra diretamente a seção correspondente no prontuário. A fila não classifica urgência; PDFs locais continuam no resumo da consulta.")}
  <h3>Conferir a identidade antes de revisar</h3>
  ${list(["Na síntese por IA, confira o paciente selecionado e o nome extraído do laudo.", "Se os nomes diferirem, o sistema destaca a divergência. Nome extraído pode conter erro: confira o PDF original.", "Confirme explicitamente que o documento pertence ao paciente antes de marcar a síntese como revisada. Nova análise exige nova confirmação."])}
  <h3>Fechamento da consulta</h3>
  ${list(["No Resumo da consulta, consulte laudos revisados, envios pendentes e orientações publicadas.", "Escreva próximos passos e pendências, confirme a conferência e registre o fechamento nesta sessão.", "Baixe o registro em TXT, se desejar. Alterações posteriores são sinalizadas; o plano e o fechamento permanecem ao mudar de aba."])}
  ${box("Limite do fechamento", "Registro demonstrativo sem assinatura. Não publica orientações automaticamente, não resolve pendências e não é receita. É perdido ao sair do prontuário ou atualizar a página.")}
  <h3>Navegação</h3>
  ${p("Seções do prontuário agrupadas por tarefa, com explicação da seção selecionada. Logo INOVA retorna ao início; Sair retorna ao login. As funcionalidades anteriores permanecem disponíveis.")}
`,
  "MANUAL · ATUALIZAÇÃO",
);
add(
  "Paciente: continuidade e clareza",
  "Rascunhos, busca, acessibilidade, revisão e IA",
  `
  ${list(["Página inicial: um próximo passo em destaque e acesso à lista completa de tarefas.", "Busca unificada: encontre pedidos, resultados históricos, documentos locais, envios e orientações. Abre a seção; use o seletor para escolher a coleta.", "Acessibilidade: letras maiores e contraste com preferências guardadas no navegador.", "Preparar consulta: textos, áudios concluídos e PDFs são recuperados após atualizar ou sair. Rascunho local por perfil, com limite de 50 MB de anexos.", "Apagar rascunho exige confirmação e não apaga envios já recebidos pelo médico.", "Revisar antes de enviar: confira destinatário, pedido, textos, áudios e PDFs; volte para editar ou confirme o envio.", "Meus envios: recebimento e revisão médica com datas. Orientações disponíveis são exibidas separadamente.", "Meus resultados e Minha evolução: Gemini explica os valores selecionados após consentimento, com limitações e perguntas para consulta. Alterar a seleção limpa a explicação anterior."])}
  ${box("Retenção atualizada", "Rascunhos agora ficam em IndexedDB neste navegador/origem, inclusive após logout. Não há sincronização, backup nem garantia de retenção do navegador. Use somente dados fictícios e apague o rascunho em dispositivos compartilhados. PDFs da área médica e fechamento continuam limitados à sessão.")}
  ${p("Cota Gemini: sem tentativa automática em erro 429; quando liberar, o usuário pode tentar novamente com a mesma chave. Falhas temporárias de serviço têm uma tentativa adicional. Nenhuma chamada real foi feita nesta etapa.")}
  ${p("Verificação: 45 testes de contratos; smoke-usability verifica rascunhos, áudio/PDF, busca, acessibilidade, fila, fechamento e identidade. Software testado não significa validação clínica. Autenticação real, armazenamento seguro, auditoria, integração S2 e scores genéticos validados seguem pendentes.")}
  ${p("Detalhes: docs/usabilidade-e-continuidade.md. Este suplemento atualiza as descrições anteriores sobre rascunhos temporários e operação do portal.")}
`,
  "MANUAL · ATUALIZAÇÃO",
);

const style = `
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; font-family: Arial, "Segoe UI", sans-serif; color: #253d49; background: #e8eef1; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .page { position: relative; width: 210mm; height: 297mm; margin: 0 auto 12px; padding: 15mm 18mm 18mm; background: white; break-after: page; overflow: hidden; }
  .page:last-child { break-after: auto; }
  header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #dce7ec; padding-bottom: 12px; margin-bottom: 24px; }
  .brand { font-size: 23px; font-weight: 400; letter-spacing: 5px; color: #143e4b; }
  .brand i { color: #0788a2; font-style: normal; letter-spacing: 3px; }
  .edition { color: #758d99; font-size: 10px; letter-spacing: 1px; text-transform: uppercase; }
  .eyebrow { color: #0585a0; font-size: 10px; letter-spacing: 1.6px; font-weight: 700; margin-bottom: 9px; }
  h2 { font-size: 27px; line-height: 1.15; letter-spacing: -.5px; font-weight: 600; margin: 0 0 10px; color: #183c49; }
  .subtitle { font-size: 12px; color: #6b8290; line-height: 1.5; margin: 0 0 20px; }
  h3 { font-size: 15px; margin: 20px 0 10px; color: #175c6d; }
  p, li { font-size: 12.5px; line-height: 1.55; }
  p { margin: 9px 0; }
  ul, ol { margin: 10px 0; padding-left: 21px; }
  li { margin: 7px 0; padding-left: 3px; }
  .steps { list-style: decimal; }
  .steps li::marker { color: #06849b; font-weight: bold; }
  b, strong { font-weight: 700; }
  code { font-family: Consolas, monospace; font-size: 11px; color: #1b6476; overflow-wrap: anywhere; }
  table { width: 100%; border-collapse: collapse; font-size: 11.6px; line-height: 1.45; margin: 14px 0; }
  th { background: #edf6f8; text-align: left; color: #0c6478; font-size: 10px; text-transform: uppercase; letter-spacing: .4px; padding: 10px 11px; }
  td { border-bottom: 1px solid #dce7ec; padding: 9px 11px; vertical-align: top; }
  #page-22 td { padding-top: 8px; padding-bottom: 8px; }
  #page-10 td { padding-top: 8px; padding-bottom: 8px; }
  td:first-child { font-weight: 600; width: 28%; }
  table:has(th:nth-child(3)) td:first-child { width: 9%; color: #0c6b80; }
  table:has(th:nth-child(3)) td:nth-child(2) { width: 28%; font-weight: 600; }
  .note, .warning { margin: 17px 0 10px; border-left: 3px solid #0786a0; border-radius: 0 10px 10px 0; background: #eff7f9; padding: 13px 15px; }
  .warning { background: #fff7e8; border-color: #c39029; }
  aside strong { font-size: 12px; color: #175262; }
  aside p { font-size: 11.6px; margin: 6px 0 0; }
  .flow { display: flex; align-items: center; gap: 7px; margin: 15px 0; }
  .flow span { flex: 1; background: #eaf5f7; border: 1px solid #cde7ec; border-radius: 9px; font-size: 11px; text-align: center; padding: 11px 7px; }
  .flow b { color: #1187a0; }
  .badge { display: inline-block; color: #116b62; background: #e8f5ef; padding: 4px 7px; border-radius: 9px; font-size: 10px; }
  .badge.neutral { color: #637682; background: #edf1f4; }
  .badge.pending { color: #916316; background: #fff2d5; }
  footer { position: absolute; left: 18mm; right: 18mm; bottom: 9mm; display: flex; justify-content: space-between; padding-top: 9px; border-top: 1px solid #dce7ec; font-size: 9px; color: #7a8e99; }
  .toc { margin-bottom: 18px; }
  .toc a { display: flex; justify-content: space-between; text-decoration: none; color: #284a59; padding: 5px 0; border-bottom: 1px solid #edf1f4; font-size: 12px; }
  .toc b { color: #087f98; }
  .cover-tag { display: inline-block; margin-top: 14px; color: #11859c; background: #eaf5f7; padding: 8px 10px; border-radius: 20px; font-size: 9px; letter-spacing: 1px; }
  h1 { color: #153f4c; font-size: 48px; letter-spacing: -1.5px; line-height: 1.12; margin: 25px 0; font-weight: 600; }
  .cover-description { font-size: 16px; line-height: 1.6; max-width: 550px; }
  .cover-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 26px; }
  .cover-grid div { background: #eff7f9; padding: 18px; border: 1px solid #d5e8ed; border-radius: 12px; }
  .cover-grid b { display: block; font-size: 13px; }
  .cover-grid span { display: block; font-size: 12px; line-height: 1.5; margin-top: 9px; color: #647e8b; }
  .cover-meta { font-size: 12px; line-height: 1.8; margin-top: 25px; color: #66818e; }
  #page-1 h2 { font-size: 22px; }
  #page-1 .subtitle { max-width: 470px; }
  @media print { html, body { background: white; } .page { margin: 0; } }
`;
const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><title>INOVA — PDR e Guia do Sistema</title><meta name="author" content="INOVA"><style>${style}</style></head><body>${pages.map((page, index) => `<section class="page" id="page-${index + 1}"><header><span class="brand">IN<i>∞</i>VA</span><span class="edition">Produto &amp; operação · 07/10/2026</span></header><div class="content"><div class="eyebrow">${escape(page.category)}</div><h2>${escape(page.title)}</h2><p class="subtitle">${escape(page.subtitle)}</p>${page.body}</div><footer><span>INOVA · Documento 1.2 · Ambiente demonstrativo</span><span>${String(index + 1).padStart(2, "0")} / ${pages.length}</span></footer></section>`).join("")}</body></html>`;
writeFileSync(resolve(destination, `${basename}.html`), html, "utf8");

const connection = await fetch("http://127.0.0.1:9222/json/version").then((response) =>
  response.json(),
);
async function channel(url) {
  const socket = new WebSocket(url);
  await new Promise((resolveOpen, reject) => {
    socket.addEventListener("open", resolveOpen, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });
  let sequence = 0;
  const pending = new Map();
  socket.addEventListener("message", ({ data }) => {
    const response = JSON.parse(String(data));
    if (!response.id) return;
    const item = pending.get(response.id);
    if (!item) return;
    pending.delete(response.id);
    clearTimeout(item.timer);
    if (response.error) item.reject(new Error(response.error.message));
    else item.resolve(response.result);
  });
  return {
    socket,
    call(method, params = {}) {
      return new Promise((resolveCall, reject) => {
        const id = ++sequence;
        const timer = setTimeout(() => {
          pending.delete(id);
          reject(new Error(`Timeout: ${method}`));
        }, 30000);
        pending.set(id, { resolve: resolveCall, reject, timer });
        socket.send(JSON.stringify({ id, method, params }));
      });
    },
  };
}
const browser = await channel(connection.webSocketDebuggerUrl);
const { targetId } = await browser.call("Target.createTarget", {
  url: "about:blank",
  background: false,
});
let page;
try {
  const targets = await fetch("http://127.0.0.1:9222/json/list").then((response) =>
    response.json(),
  );
  page = await channel(targets.find((target) => target.id === targetId).webSocketDebuggerUrl);
  await page.call("Page.enable");
  await page.call("Page.bringToFront");
  await page.call("Emulation.setDeviceMetricsOverride", {
    width: 794,
    height: 1123,
    deviceScaleFactor: 1,
    mobile: false,
  });
  const { frameTree } = await page.call("Page.getFrameTree");
  await page.call("Page.setDocumentContent", { frameId: frameTree.frame.id, html });
  await page.call("Runtime.evaluate", { expression: "document.fonts.ready", awaitPromise: true });
  const { result } = await page.call("Runtime.evaluate", {
    expression: `JSON.stringify([...document.querySelectorAll('.page')].map(page=>({page:page.id,title:page.querySelector('h2').textContent,contentBottom:page.querySelector('.content').getBoundingClientRect().bottom-page.getBoundingClientRect().top,footerTop:page.querySelector('footer').getBoundingClientRect().top-page.getBoundingClientRect().top})))`,
    returnByValue: true,
  });
  const measurements = JSON.parse(result.value);
  const overflowing = measurements.filter((item) => item.contentBottom > item.footerTop - 12);
  if (overflowing.length) throw new Error(`Content exceeds page: ${JSON.stringify(overflowing)}`);
  const pdf = await page.call("Page.printToPDF", {
    printBackground: true,
    preferCSSPageSize: true,
    displayHeaderFooter: false,
    generateTaggedPDF: true,
    generateDocumentOutline: true,
    marginTop: 0,
    marginBottom: 0,
    marginLeft: 0,
    marginRight: 0,
  });
  const pdfBytes = Buffer.from(pdf.data, "base64");
  const pdfPath = resolve(destination, `${basename}.pdf`);
  writeFileSync(pdfPath, pdfBytes);
  const actualPages = (pdfBytes.toString("latin1").match(/\/Type \/Page\b/g) ?? []).length;
  if (actualPages !== pages.length)
    throw new Error(`Expected ${pages.length} PDF pages; got ${actualPages}`);
  mkdirSync("artifacts", { recursive: true });
  for (const number of [1, 7, 16]) {
    await page.call("Runtime.evaluate", {
      expression: `window.scrollTo(0,document.querySelector('#page-${number}').offsetTop)`,
    });
    const screenshot = await page.call("Page.captureScreenshot", {
      format: "png",
      captureBeyondViewport: false,
    });
    writeFileSync(`artifacts/document-page-${number}.png`, Buffer.from(screenshot.data, "base64"));
  }
  writeFileSync(
    resolve(destination, `${basename}.validation.json`),
    JSON.stringify(
      {
        documentDate: "2026-10-07",
        htmlPages: pages.length,
        pdfPages: actualPages,
        bytes: pdfBytes.length,
        overflow: overflowing,
        measurements,
      },
      null,
      2,
    ),
  );
  console.log(
    JSON.stringify({
      pdf: pdfPath,
      pages: actualPages,
      bytes: pdfBytes.length,
      html: resolve(destination, `${basename}.html`),
      overflow: overflowing,
    }),
  );
} finally {
  page?.socket.close();
  await browser.call("Target.closeTarget", { targetId });
  browser.socket.close();
}
