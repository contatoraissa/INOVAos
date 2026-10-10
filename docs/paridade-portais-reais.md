# Portais completos em contas reais — 10/10/2026

## Referência e decisão

O usuário pediu a mesma organização, aparência e recursos dos portais aprovados
de Rafael e Mariana, usando as contas autenticadas e seus próprios dados.
A demonstração continua nas mesmas rotas, sem `workspace=account`; a
administração demonstrativa permanece separada e não foi reformulada.

O login médico autorizado abre `/dashboard?workspace=account`. O login paciente
abre `/portal-paciente?workspace=account`. Links internos médicos preservam o
parâmetro; entrar em uma conta real não importa pacientes ou resultados fictícios.
Ausência de dados produz estados vazios, não um histórico demonstrativo.

## Conteúdo conectado

| Área | Recursos |
| --- | --- |
| Médico | Os onze destinos do menu: visão geral, agenda, pacientes, novo paciente, novos resultados, histórico, comparação, meu perfil, acompanhamento, meus relatórios e configurações. |
| Prontuário | As treze abas: resumo, envios, solicitação de exames, orientações, visão geral, resultados, histórico, comparação, contexto familiar, laudos laboratoriais, genética, genômica e documentos. |
| Resumo da consulta | Comparação de coletas, checklist, pendências, laudos, anotações e fechamento para impressão. Checklist/anotações/fechamento permanecem enquanto o prontuário estiver aberto, inclusive ao trocar de aba; não constituem documento assinado nem publicação ao paciente. |
| Paciente | As quinze seções da demonstração: saúde, agenda, próximos passos, avisos, preparar consulta, orientações, resultados, pedidos, evolução, preparo, favoritos, documentos, genética, linha do tempo e perfil. |
| Resultados | Valores e referências registrados no prontuário; liberação médica exigida para o paciente. Gráficos e comparação separam unidades; resultados qualitativos não viram números. |
| Comunicação | Textos, até três PDFs e três áudios por preparação. Rascunho local separado por conta/prontuário; publicação ou envio exige confirmação. Médico revisa envios, libera pedidos e publica orientações. |
| Documentos | Paciente adiciona PDFs localmente, confere o original e prepara o envio. Adicionar não compartilha automaticamente. Laudos do prontuário são abertos por acesso autorizado ao storage. Médico pode importar e analisar PDFs, revisar ou preencher resultados e liberá-los. |
| Agenda | Mesmo calendário mensal, navegação pelos dias/meses e lista com rolagem independente. Paciente propõe, médico confirma, ambos podem cancelar com motivo e histórico. Retorno publicado cria proposta; retirar retorno cancela o evento relacionado. |
| Pedidos e preparo | Pedidos publicados chegam ao paciente. Data de coleta informada gera proposta na agenda. Preparo exige pedido, fonte, link HTTPS e data válida de conferência. |
| Notificações | Avisos da conta com contador, leitura persistida, atualização periódica e acesso ao prontuário ou agenda. Novos envios, mudanças na agenda e liberação de laudos usam notificações do Supabase. |
| Genética | Mesmo painel de importação TXT, quatro domínios, metadados, versões, revisão, download e remoção autorizados. Autoria vem do registro real. Escores continuam não configurados; TXT não é enviado à IA. |
| Preferências | Perfil profissional e configurações salvos por conta no Supabase; contatos e favoritos do paciente também. E-mail de contato não altera o login. Ajustes de leitura têm prévia; entrega por e-mail não está integrada. |
| IA | Briefing médico do dia/eventos futuros e explicação dos resultados/evolução do paciente, com consentimento e dados autorizados pelo servidor. Análise de PDF usa o fluxo próprio. Briefing consulta textos e nomes/contagens de anexos, sem carregar seus conteúdos. |

## Banco e autorização

Script aditivo: `supabase/INOVA_PORTAIS_COMPLETOS_SQL_EDITOR.sql`, com cópia em
`supabase/migrations/202610100002_complete_account_portals.sql`. Não apaga Auth,
prontuários, resultados ou contas; não executa seed de demonstração.

Após o usuário informar que executou o script, verificações de estrutura
retornaram HTTP 200 para `inova_real_agenda` e `inova_workspace_preferences`.
O catálogo REST confirmou `inova_save_workspace_preferences`,
`inova_create_real_agenda`, `inova_transition_real_agenda` e
`inova_remove_real_genetics`. A projeção de metadados JSON também retornou 200.
Essas verificações não leram conteúdo de prontuários nem criaram eventos reais.

O servidor deriva usuário, perfil e médico da sessão; requisições não escolhem
essas identidades. Tabelas novas têm RLS e acesso direto revogado para anon e
authenticated; mutações são executadas pelo servidor autorizado. Agenda confere
vínculo, pedido, autor, status e idempotência. Paciente não confirma eventos nem
acessa rascunhos/observações privadas. A reivindicação do prontuário mantém CPF,
nascimento, e-mail confirmado e aprovação médica; CPF isolado não autoriza acesso.

## Validação e limites

- TypeScript e compilação de produção passam; ESLint dos arquivos alterados passa.
- 99 testes de regras/contratos passam, incluindo PostgreSQL local com migração
  reaplicável, isolamento, proposta/confirmação/cancelamento, notificações,
  bloqueio das permissões diretas e consulta de metadados sem base64.
- O teste `scripts/smoke-account-parity.mjs` percorre onze rotas médicas,
  treze abas e quinze seções do paciente; testa preferências, favoritos,
  proposta/confirmação/cancelamento, envio explícito de texto e PDF, sininho e
  telas móveis. Usa contas e respostas sintéticas; nenhuma conta real é criada.
- `scripts/smoke-account-enrollment.mjs` verifica login/cadastro/herança em
  interface controlada; não altera dados remotos. Capturas ficam em
  `artifacts/account-parity/` e `artifacts/enrollment/`, fora do Git.
- A regressão geral está em `scripts/run-browser-tests.mjs`, com relatório em
  `artifacts/regression/results.json`. A verificação final combinada aprovou
  **22/22 cenários**, após repetir orientação e paridade com o servidor estável.
  As evidências estão em `artifacts/regression/final-verification.json`,
  `smoke-care-final.log` e `smoke-account-parity-final.log`.
  A paridade também verifica a transferência de um PDF local para uma preparação
  já escrita, preservando a mensagem e exigindo envio explícito. Evite editar ou
  compilar durante a regressão: recarregamentos do servidor podem interromper
  estados temporários usados pelos testes de demonstração.

Ainda não foi executado, nesta entrega, um ciclo ponta a ponta com credenciais
reais de médico e paciente, upload real ao storage e chamada de IA com seus
dados. Os testes não prometem disponibilidade dos provedores. O S2 comercial
continua sem API: conta real abre a busca pública; preços, pagamento e reserva
não são inventados. Administração, cobrança, assinatura eletrônica e cálculo
genético não foram convertidos para produção como parte desta alteração.

## Checkpoint para GitHub — 10/10/2026

O usuário conferiu a versão, informou que está funcionando e solicitou o envio
ao GitHub. Este checkpoint inclui a revisão dos componentes das contas reais:
painéis de resultados e evolução, histórico e comparação, resumo da consulta,
contexto familiar, documentos, pedidos, orientações, retornos, preparação com
áudios e PDFs, conferência antes do envio, notificações e preferências.

Os sete testes adicionais verificam os adaptadores de dados reais, a
compatibilidade dos anexos, a visibilidade das informações para o paciente,
as preferências e a leitura de notificações limitada à conta proprietária.
O script `audit-all-portal-screens.mjs` permite comparar e capturar as telas das
duas modalidades; suas capturas e relatórios locais ficam fora do Git.
Os registros anteriores de regressão mantêm seus limites e não substituem uma
nova execução completa em contas reais.
