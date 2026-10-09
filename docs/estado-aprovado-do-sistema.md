# Referência para continuidade — 08/10/2026

## Decisão aprovada pelo usuário

Em 07/10/2026, o usuário aprovou o retorno às interfaces de demonstração:
“ufa, voltou como era antes”. As implementações alternativas do paciente e do
médico reais foram excluídas a pedido dele. A próxima implementação real deve
partir dos componentes de demonstração existentes e preservar seu layout,
organização, gráficos, cores, cartões e recursos. Não recriar uma interface
simplificada nem confundir dados fictícios com dados da conta autenticada.

Este documento registra o estado do código conferido em 08/10/2026; não é uma
garantia de funcionamento ponta a ponta de todos os serviços externos.

## Objetivo do INOVA

Reunir resultados laboratoriais, genética/genômica e histórico para apoiar o
acompanhamento médico e a participação do paciente. Antes da consulta, o paciente
escreve sintomas, medicamentos e perguntas, grava ou anexa áudios e envia laudos.
O médico consulta os envios e exames, acompanha gráficos, revisa informações e
publica pedidos, orientações e retornos. A IA auxilia; suas sugestões não são
diagnósticos nem substituem a revisão médica. Dados brutos genéticos não são
escores clínicos de predisposição.

## Interfaces e acessos atuais

- Agenda: lista lateral com rolagem independente. Médico tem briefing pré-consulta
  com Gemini para o dia escolhido: compromissos ativos, últimos 3 envios por paciente,
  textos das preparações e orientações publicadas, contagens de PDFs e áudios.
  Conteúdo dos anexos não é enviado. Exige autorização explícita e prévia dos textos;
  usa referências P1/P2 em vez de IDs de conta. Resumo, suspeitas registradas, pontos
  para conferir e lacunas; sem diagnóstico ou agendamento automático. Autoria de
  notas distingue paciente/médico. Resultado temporário, invalidado ao mudar o dia.

- Agenda demonstrativa: médico em `/agenda`, paciente em “Minha agenda”.
  Após revisão visual solicitada pelo usuário, usa um único calendário mensal, com setas entre meses e dias, botão Hoje, detalhes ao lado, filtro por paciente e
  exibição de cancelados. Paciente propõe eventos; médico confirma. Previsão de
  resultado permanece distinta de confirmação. Cancelamento exige motivo, mantém
  o histórico e aparece no outro perfil e nos avisos/sininho. Motivos incluem guia
  do convênio não emitida. Não cancela serviços externos, guias ou agendamentos
  reais. Eventos persistem em `.inova-demo/agenda/agenda.json`, fora do Git.

- `/indicators` agora apresenta **Meus relatórios**: somente a carteira e as
  atividades do Dr. Rafael na demonstração, com filtro de período, gráficos,
  envios, PDFs, áudios, revisões e impressão/salvamento em PDF pelo navegador.
  O menu foi renomeado; os demais destinos e layouts foram preservados.
- `/admin-inova` é um portal administrativo **demonstrativo separado**: usuários
  fictícios, ativos/desativados, contas sem uso recente, busca/filtros, gráficos,
  confirmação de mudanças de status, registros de contatos e feedbacks.
  Ações ficam no localStorage; não alteram contas reais ou prontuários, nem enviam
  mensagens. Datas de uso têm referência fictícia em 08/10/2026. Acesso a dados
  reais dependerá de autenticação e autorização administrativas no servidor.

- A autorização local aceita uma lista de origens exatas em `INOVA_AI_ORIGIN`,
  separadas por vírgula. A configuração local inclui as portas 8080 e 8081 do
  endereço de rede usado na demonstração. Alterações dessa configuração exigem
  reiniciar o servidor; origem e porta divergentes bloqueiam fila, envios e genética.

- Sininho médico: contador e lista de preparações recebidas, com quantidade de
  PDFs/áudios e acesso direto a “Envios do paciente”. Atualiza ao abrir, ao voltar
  à aba e a cada 30 segundos com a aba visível. Leitura do aviso fica neste
  navegador e não equivale à revisão médica. Consulta independente dos retornos
  do Supabase; somente demonstração local autorizada. Envios continuam temporários.

- Atualização autorizada em 08/10: somente as páginas médicas `/doctors` e
  `/settings`. O item “Médicos” passou a “Meu perfil”: dados profissionais,
  consultório e apresentação do plano. Configurações reúne preferências de
  notificações, leitura e acompanhamento, com prévia local de visualização.
  Ambas salvam no localStorage; não alteram autenticação, cobrança, entrega de
  notificações ou comportamento das demais páginas. O restante da interface
  demonstrativa permanece como referência aprovada.

- Apresentação para investidores: entrega em PDF em
  `docs/entregaveis/INOVA_investidores_2026-10-08.pdf`, com custos e EBITDA
  estimado. A rota `/investidores` foi removida em 08/10: o usuário pediu um
  documento para compartilhar, não uma página dedicada no sistema.

- Médico: **Dr. Rafael Mendes**, com pacientes e dados fictícios. O botão
  **Ver demonstração médica**, em `/` e `/acesso`, abre `/dashboard` diretamente,
  sem login. As rotas demonstrativas médicas não exigem uma conta real.
- `AppShell.tsx` renderiza `DemoAppShell` com o conteúdo de cada rota.
  `PatientDirectoryProvider.tsx` fornece os pacientes de `src/data/demo`.
- Paciente: **Mariana Oliveira**, perfil `mariana-oliveira`.
  `/acesso-paciente` possui **Explorar demonstração gratuita**, que cria o
  marcador demonstrativo no sessionStorage e abre `/portal-paciente`.
  `PatientPortal.tsx` verifica esse marcador; a rota renderiza apenas esse portal.
- Página inicial do paciente: **Minha saúde**, panorama, resultados recentes,
  genética/genômica, cuidado indicado, busca/acessibilidade, próximos passos,
  atalhos, domínios genéticos, banner de preparação, contadores e última coleta.
- Menu completo: Minha saúde, Próximos passos, Avisos, Preparar consulta,
  Orientações do médico, Meus resultados, Exames solicitados, Minha evolução,
  Preparo dos exames, Laboratórios favoritos, Meus documentos, Minha genética,
  Linha do tempo e Meu perfil.
- Área médica: visão geral, pacientes, novo paciente, resultados, histórico,
  comparação, médicos, acompanhamento, indicadores e configurações. O detalhe
  do paciente mantém as seções de consulta, envios, resultados, laudos,
  genética/genômica e documentos.

## Persistência e integrações: distinguir os ambientes

- O cadastro demonstrativo de pacientes é estado React; não grava um paciente
  real no Supabase. PDFs e outros estados locais têm regras próprias.
- A preparação possui rascunho IndexedDB no navegador. Envios, pedidos,
  orientações e revisões demonstrativas usam o backend demonstrativo temporário.
  Não afirmar que todos os dados desaparecem ao trocar de aba ou que todos são
  permanentes: verificar o armazenamento específico antes de alterar.
- Genética bruta demonstrativa usa armazenamento local no servidor, com versões,
  revisão e download. Escores permanecem pendentes de metodologia validada.
- S2 Labs: interface demonstrativa com opções/cotações fictícias; não existe
  integração real de preços, reservas ou agendamento.
- Gemini depende da configuração e das restrições do servidor; esta revisão não
  fez chamadas de IA. Seus resultados não são confirmados automaticamente.
- Agendamento humano via WhatsApp continua separado do acesso demonstrativo:
  `https://wa.me/5515997851886?text=Ol%C3%A1%2C%20gostaria%20de%20agendar%20uma%20demonstra%C3%A7%C3%A3o%20do%20sistema%20INOVA!`

## O que foi preservado da conta real

Contas Auth, prontuários, dados e migrações Supabase **não foram excluídos**.
Os módulos servidor `account-session`, `medical-workspace`, `medical-reports`,
`real-consultation` e `real-complements` permanecem. Expor uma página de
demonstração não libera as operações reais desses módulos: suas autorizações
continuam no servidor.

Foram excluídos os componentes de interface RealPatientPortalPage,
RealPatientHomeSections, RealPatientResults, RealPatientConsultationPortal,
MedicalWorkspace, MedicalExamPages, MedicalPatientExams, ManualMedicalResults e
RealConsultationOverview. Não restabelecê-los como a base visual aprovada.

A pedido do usuário, em 07/10 foram inseridos seis PDFs identificados como
`INOVA_TESTE_FICTICIO_` e 24 resultados sintéticos no prontuário associado à conta
Alison Brasil. O vínculo com a conta médica foi confirmado naquele momento.
Esses dados continuam no Supabase, mas não alimentam os portais demonstrativos.
Não foram consultados novamente nesta revisão. Scripts de seed não devem ser
executados automaticamente: produzem alterações no banco remoto.

## Verificação e cuidados para próximas sessões

- Em 08/10, revisão dos componentes e rotas; 14 testes de genética/contrato de
  consulta passaram. A verificação TypeScript (
px.cmd tsc --noEmit`) passou.
- Em 07/10, o teste de navegador `scripts/smoke-access.mjs` confirmou o clique
  em Ver demonstração médica, o dashboard Rafael e rotas médicas sem login.
  Não confundir essa evidência anterior com inspeção visual ao vivo em 08/10.
- Os documentos `area-medica-real.md`, `restauracao-consulta-real.md`,
  `comparacao-paciente-real-demo.md` e o PDR de 07/10 descrevem etapas históricas;
  não devem prevalecer sobre este estado atual. Há também informações antigas
  de login/persistência em outros guias; conferir o código.
- Não imprimir `.env.local` ou segredos e não gravá-los em documentação.
- O projeto é conectado ao Lovable: não reescrever histórico Git publicado.
- Antes de modificar o layout aprovado, conferir os componentes originais e
  limitar a mudança ao que o usuário solicitar. Não houve alteração funcional
  durante esta revisão; apenas registro de continuidade.

Atualiza��o do briefing da agenda: bot�o **Ler eventos futuros**, per�odo de 30 dias a partir de hoje, eventos ativos ordenados por data e hor�rio e op��o **Dia selecionado**. A pr�via precede a autoriza��o para gerar com Gemini. Altera��o restrita ao briefing da agenda.

Pedidos liberados agora aparecem em Minha agenda como pendências. O paciente acessa o pedido e a S2, informa uma coleta combinada e abre a preparação para enviar resultados. Não há reserva externa ou cotação integrada. Cancelar o pedido cancela a coleta vinculada no INOVA. Funciona na demonstração; preserva o calendário aprovado e os demais fluxos.

Cotação de pedidos na S2: botão explícito Simular consulta de preços usa resposta local fictícia com três opções, calculadas pelos exames do pedido; nenhuma API real ou busca geográfica é executada. Sem reserva ou pagamento. scripts/simulate-s2-order.mjs cria/libera um pedido fictício reutilizável para Mariana, testa os valores e deixa o pedido disponível (até 24 horas ou reinício do servidor).


## Portal administrativo INOVA ? 08/10/2026

A rota `/admin-inova` recebeu sete ?reas no padr?o INOVA: vis?o geral, usu?rios, atividade, assinaturas, contatos e reativa??o, feedbacks e resumo com IA. Os portais cl?nicos aprovados de Rafael e Mariana foram preservados.

Gr?ficos e totais derivam de 14 usu?rios fict?cios, com refer?ncia fixa em 08/10/2026. Conta habilitada/desativada, uso recente e satisfa??o s?o medidas distintas. Satisfa??o usa apenas a ?ltima nota expl?cita; falta de uso n?o significa descontentamento.

Altera??es persistem no navegador em `inova-demo-admin-v2`, com migra??o dos registros anteriores e hist?rico local. Desativa??o exige motivo e confirma??o. Contatos s?o tarefas manuais, sem disparo de mensagens. Assinaturas e MRR s?o simula??es, sem cobran?a.

O resumo Gemini exige consentimento e envia indicadores e refer?ncias an?nimas, sem nomes, e-mails, coment?rios livres ou prontu?rios. Recomenda??es n?o executam a??es. A chamada est? restrita ao desenvolvimento local. Autentica??o e autoriza??o administrativa de produ??o s?o necess?rias antes de conectar contas reais. Supabase n?o foi alterado.

Valida??o: testes de regras, migra??o, privacidade, persist?ncia, fluxo no navegador e responsividade, TypeScript, ESLint, build e resumo real com Gemini.

## Verificação funcional — 09/10/2026

Os portais demonstrativos de Rafael, Mariana e administração foram exercitados
no navegador. Resultado: 76 testes de regras e contratos, 19 cenários de
navegador, navegação em 16 rotas e 15 seções do paciente nas larguras de 1440 e
390 px. TypeScript e build passaram; ESLint passou sem erros, com sete avisos
existentes de Fast Refresh.

Foram verificadas chamadas reais ao Gemini para seis fluxos, sempre com dados
fictícios. A análise de PDF recebeu uma correção no esquema enviado ao provedor;
os limites e a validação de citações permanecem no servidor. O layout aprovado
foi preservado. Contas e prontuários reais do Supabase não foram alterados.

O comando `npm.cmd run test:browser` executa a bateria local. Consulte
[testes-funcionais-2026-10-09.md](testes-funcionais-2026-10-09.md) para evidências,
pré-requisitos, comandos de repetição e limites do que foi verificado.
