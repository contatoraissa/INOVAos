# Portal administrativo demonstrativo

Acesso: `/admin-inova`. Não está no menu clínico do médico.

Este primeiro portal usa 4 médicos e 10 pacientes fictícios. Nenhum cadastro vem
do Supabase ou de contas autenticadas. Não exponha contas reais nessa rota sem
implementar autorização administrativa no servidor.

- Visão geral: total de usuários, contas ativas/desativadas, sem uso recente,
  cadastros por mês e histórico de relacionamento.
- Usuários: busca por nome/e-mail, filtros por perfil e situação; confirmação
  para desativar ou reativar o registro fictício.
- Contatos e reativação: anotações de tentativas ou retornos de contato.
- Feedbacks: registro de pedidos e feedbacks recebidos manualmente.

“Sem uso recente” significa conta ativa sem acesso há mais de 30 dias, considerando
a referência fixa de 08/10/2026 usada nos dados de exemplo. É distinto de conta
desativada. As contagens são calculadas a partir da lista, sem totais inventados
independentes dela. O gráfico de cadastros conta os usuários pela data de cadastro.

Status e contatos persistem somente neste navegador (`inova-demo-admin-v1`). Não
modificam acesso, sessões ou prontuários do médico/paciente. Registrar uma solicitação
de feedback não entrega mensagem a ninguém. Não há envio de e-mail, WhatsApp ou chamadas.

Próxima etapa real: autenticação administrativa, permissões verificadas no servidor,
lista de contas do banco, auditoria das mudanças, registro real de acesso e integração
de comunicação autorizada pelo administrador.

Validação: `scripts/smoke-reports-admin.mjs` verifica relatórios próprios, busca,
cancelamento/confirmação, persistência de status e registros de contatos/feedbacks,
largura móvel e preservação do prontuário demonstrativo.
