# Referência para continuidade — atualizado em 10/10/2026

## Ponto de retomada atual

O usuário pediu em 10/10 para salvar todo o trabalho e registrar o estado antes
de iniciar novas atividades. Leia também
[ponto-de-retomada-2026-10-10.md](ponto-de-retomada-2026-10-10.md), que reúne os
acessos, a identidade visual atual, os materiais entregues e as pendências.

A referência visual continua sendo os portais de demonstração de Rafael e
Mariana. O logo compartilhado foi atualizado por escolha explícita do usuário
para IN/VA com infinito vetorial ciano; preservar essa versão também nas artes.
O portal administrativo permanece separado. O vínculo de contas reais está
implementado em código, mas sua migração SQL ainda não foi instalada no Supabase
remoto. Não confundir a demonstração funcional com ativação remota concluída.

A entrega de vídeo mais recente mostra somente médico e paciente, com IA,
narração e legendas embutidas, em
`docs/entregaveis/instagram/INOVA_portais_completos_2026-10-10/`.
Os vídeos anteriores são histórico de criação; o usuário pediu uma versão mais
completa. Preservar todos os materiais sem apresentar esses ensaios como a
versão principal.

## Decisão aprovada pelo usuário

Em 07/10/2026, o usuário aprovou o retorno às interfaces de demonstração:
“ufa, voltou como era antes”. As implementações alternativas do paciente e do
médico reais foram excluídas a pedido dele. A próxima implementação real deve
partir dos componentes de demonstração existentes e preservar seu layout,
organização, gráficos, cores, cartões e recursos. Não recriar uma interface
simplificada nem confundir dados fictícios com dados da conta autenticada.

Este documento reúne registros do código e das verificações de 08 a 10/10/2026;
cada seção informa o momento e os limites da respectiva validação. Não é uma
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
- Menu completo: Minha saúde, Minha agenda, Próximos passos, Avisos, Preparar consulta,
  Orientações do médico, Meus resultados, Exames solicitados, Minha evolução,
  Preparo dos exames, Laboratórios favoritos, Meus documentos, Minha genética,
  Linha do tempo e Meu perfil.
- Área médica: visão geral, pacientes, novo paciente, resultados, histórico,
  comparação, agenda, meu perfil, acompanhamento, meus relatórios e configurações. O detalhe
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
  consulta passaram. A verificação TypeScript (`npx.cmd tsc --noEmit`) passou.
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

Atualização do briefing da agenda: botão **Ler eventos futuros**, período de 30 dias a partir de hoje, eventos ativos ordenados por data e horário e opção **Dia selecionado**. A prévia precede a autorização para gerar com Gemini. Alteração restrita ao briefing da agenda.

Pedidos liberados agora aparecem em Minha agenda como pendências. O paciente acessa o pedido e a S2, informa uma coleta combinada e abre a preparação para enviar resultados. Não há reserva externa ou cotação integrada. Cancelar o pedido cancela a coleta vinculada no INOVA. Funciona na demonstração; preserva o calendário aprovado e os demais fluxos.

Cotação de pedidos na S2: botão explícito Simular consulta de preços usa resposta local fictícia com três opções, calculadas pelos exames do pedido; nenhuma API real ou busca geográfica é executada. Sem reserva ou pagamento. scripts/simulate-s2-order.mjs cria/libera um pedido fictício reutilizável para Mariana, testa os valores e deixa o pedido disponível (até 24 horas ou reinício do servidor).


## Portal administrativo INOVA — 08/10/2026

A rota `/admin-inova` recebeu sete áreas no padrão INOVA: visão geral, usuários, atividade, assinaturas, contatos e reativação, feedbacks e resumo com IA. Os portais clínicos aprovados de Rafael e Mariana foram preservados.

Gráficos e totais derivam de 14 usuários fictícios, com referência fixa em 08/10/2026. Conta habilitada/desativada, uso recente e satisfação são medidas distintas. Satisfação usa apenas a última nota explícita; falta de uso não significa descontentamento.

Alterações persistem no navegador em `inova-demo-admin-v2`, com migração dos registros anteriores e histórico local. Desativação exige motivo e confirmação. Contatos são tarefas manuais, sem disparo de mensagens. Assinaturas e MRR são simulações, sem cobrança.

O resumo Gemini exige consentimento e envia indicadores e referências anônimas, sem nomes, e-mails, comentários livres ou prontuários. Recomendações não executam ações. A chamada está restrita ao desenvolvimento local. Autenticação e autorização administrativa de produção são necessárias antes de conectar contas reais. Supabase não foi alterado.

Validação: testes de regras, migração, privacidade, persistência, fluxo no navegador e responsividade, TypeScript, ESLint, build e resumo real com Gemini.

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

## Apresentação completa para investidores — 09/10/2026

Entregue em PDF: `docs/entregaveis/INOVA_visao_completa_e_viabilidade_2026-10-09.pdf`.
Inclui 49 páginas, 52 capturas da demonstração, explicações dos acessos e dos
portais médico, paciente e administrativo, gráficos e modelo financeiro.
Nenhuma interface ou rota foi alterada para produzir o material.

R$ 149 e R$ 249 foram autorizados pelo usuário como exemplos de mensalidade,
com explicação de sua escolha. Continuam hipóteses, não preços oficiais. O
modelo usa ticket de R$ 199 por mix arbitrado 50/50, custo fixo proposto de
R$ 25 mil/mês e custos variáveis/deduções explícitos. Cenários, EBITDA, projeção
de 12 meses e capital ilustrativo são estimativas, não receita ou tração real.
As premissas e os cálculos ficam nos arquivos `_premissas.json` e `_calculos.json`
ao lado do PDF. Tarifas de fornecedores têm fontes oficiais e data de consulta.
Não reutilizar as projeções como metas aprovadas ou orçamento contratado.


## 10/10/2026: identidade e cadastro de pacientes

- Cadastro real e conta do paciente podem ser vinculados preservando o prontuario existente, em ambas as ordens de cadastro. CPF, nascimento, e-mail confirmado e autorizacao medica precisam coincidir.
- Minha conta apresenta cadastros vinculados; o medico autorizado pode cadastrar ou reutilizar pacientes. Campos visuais compartilhados com a demonstracao, que continua separada.
- SQL aditivo preparado em supabase/INOVA_VINCULO_PACIENTE_SQL_EDITOR.sql; validado em PostgreSQL local, ainda nao instalado remotamente por falta de credencial de administracao SQL.
- Detalhes, limites e ativacao em docs/vinculo-cadastro-paciente.md. A primeira etapa tratou de identidade/vinculo; a integracao das telas esta descrita abaixo.

### Integração das telas de cadastro e prontuário — 10/10/2026

O login médico autorizado abre a carteira real nas rotas existentes com
`?workspace=account`. Novo paciente exige e-mail e conferência de identidade;
um CPF já cadastrado reutiliza o prontuário original. O login e a confirmação
de e-mail do paciente abrem seu portal vinculado, com dados cadastrais, contatos,
resultados liberados, laudos revisados e orientações publicadas. Observações
privadas permanecem restritas ao médico.

A demonstração de Rafael, Mariana e administração continua nos mesmos acessos,
com seus layouts e recursos preservados. Esta etapa conecta cadastro e
prontuário, não todas as funcionalidades de demonstração a contas reais.
Agenda anual, cotação e genética TXT ainda precisam de integração própria.

Validação: 86 testes de contrato/regras, TypeScript, build e lint dos arquivos
alterados. Foram verificados 21 fluxos de navegador; o acesso passou após
corrigir a espera de hidratação no teste. O novo fluxo de login/cadastro/herança
foi exercitado com respostas controladas; o SQL foi testado em PostgreSQL local.
O SQL `supabase/INOVA_VINCULO_PACIENTE_SQL_EDITOR.sql` ainda precisa ser aplicado
ao Supabase remoto. Não afirmar que a migração ou o ciclo remoto já foi validado.

### Padronização do logo — 10/10/2026

Após comparar as peças de Instagram com o logo anterior do aplicativo, o usuário
optou por adotar no sistema a versão usada nas artes: letras IN/VA e infinito
vetorial em ciano. O componente compartilhado `Logo.tsx` usa a mesma curva das
artes, definida em `src/data/inova-brand.ts`. A versão compacta usa esse símbolo;
os links, layouts e recursos dos portais continuam preservados.
