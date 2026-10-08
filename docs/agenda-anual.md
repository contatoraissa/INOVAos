# Agenda demonstrativa

O médico possui “Prepare seu dia com IA”, com contexto do dia e geração via Gemini
mediante autorização. A prévia contém anotações dos compromissos, últimos três envios
de cada paciente e até duas orientações publicadas. Autoria de anotações é preservada;
relatos não equivalem a suspeitas médicas. PDFs/áudios entram somente como contagens,
sem leitura ou transcrição. IDs e CPF não são incluídos; textos livres são enviados
como estão. O resultado é temporário e não grava condutas ou marca consultas.
Teste real com dados sintéticos passou, além de testes com respostas simuladas.
A lista de compromissos tem altura limitada e rolagem independente.

Médico: `/agenda`. Paciente: portal de Mariana → Minha agenda.

Calendário mensal único, navegação entre meses e dias, botão Hoje, seleção de dia, lista de eventos,
filtro por paciente para o médico, legenda de status e opção de ocultar cancelados.

Tipos: consulta, retorno, exame e previsão de resultado. O paciente pode propor
eventos na própria agenda. O médico pode criar propostas, registrar eventos
confirmados e confirmar propostas. Previsões de resultado não podem ser
confirmadas como consultas. Não há consulta automática a laboratório ou convênio.
Fontes, local e condições podem ser informados nas observações.

Cancelar exige confirmação e motivo; há opção “Guia do convênio ainda não emitida”,
convênio não autorizou, imprevisto pessoal, solicitação do médico ou outro motivo.
O evento permanece no histórico, com o motivo, nos dois perfis. Não cancela
agendamentos, exames ou solicitações de convênio fora da demonstração.

Mudanças aparecem no sininho do médico e nos Avisos do paciente. Consulta da agenda
atualiza a cada 30 segundos com a aba visível e ao retornar o foco, ou manualmente.
Eventos e histórico de avisos persistem no servidor local em `.inova-demo/agenda/`,
fora do Git. A demonstração usa um médico fictício, Dr. Rafael Mendes, e o paciente
fictício Mariana; não habilita gestão de agendas de contas reais. Endpoints são
restritos ao desenvolvimento local explicitamente autorizado, com validação no servidor.

Testes: 
ode --test scripts/test-agenda.mjs` e 
ode scripts/smoke-agenda.mjs`.
O teste de navegador deixa eventos sintéticos no histórico para inspeção.

O briefing m�dico possui o bot�o **Ler eventos futuros**: confere todos os tipos de eventos ativos dos pr�ximos 30 dias, incluindo hoje (fuso de S�o Paulo), com datas e envios de cada paciente. Cancelados ficam fora. A gera��o com Gemini continua exigindo confirma��o, e **Dia selecionado** retorna ao resumo di�rio.

## Pedidos de exames na agenda do paciente
Pedidos liberados aparecem como pend�ncias sem data de coleta inventada. A agenda permite abrir o pedido correto, consultar o site da S2 e informar data, hor�rio opcional e laborat�rio combinado. A coleta � registrada como proposta informada pelo paciente, sem confirma��o externa. Pedidos realizados deixam as pend�ncias; cancelamento pelo m�dico cancela eventos vinculados, sem cancelar reservas no laborat�rio. � poss�vel abrir a prepara��o para anexar e enviar o PDF pelo fluxo existente. A previs�o de resultados permanece manual, sem c�lculo autom�tico. Pedidos continuam tempor�rios (24 horas ou rein�cio do servidor); eventos da agenda persistem localmente. Pre�os e agendamento S2 n�o est�o integrados.
Verifica��o: scripts/smoke-exam-calendar.mjs cobre libera��o, navega��o, coleta, rejei��o de duplicata e cancelamento vinculado.
