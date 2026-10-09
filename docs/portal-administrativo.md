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

## Painel ampliado — outubro de 2026

O painel atual reúne sete áreas: visão geral, usuários, atividade, assinaturas,
contatos e reativação, feedbacks e resumo com IA. Gráficos usam a mesma base
fictícia dos indicadores e das tabelas. Atividade pode ser consultada em 7, 30
ou 90 dias; a referência da demonstração permanece 08/10/2026.

A persistência passou a `inova-demo-admin-v2`, preservando registros v1 por
migração. Alterações têm histórico local. Desativar exige motivo e confirmação;
simular acesso registra atividade. Feedbacks têm nota, categoria e comentário,
e a classificação considera apenas a última nota de cada usuário.

Assinaturas e MRR são simulações sem cobrança ou alteração de acesso clínico.
Contatos podem ser planejados, copiados e marcados como concluídos manualmente;
não existe disparo automático. A IA Gemini recebe apenas indicadores e referências
anônimas após consentimento, sem nomes, e-mails, texto de feedback ou prontuários.
Ela propõe ações, mas não as executa. A chamada requer desenvolvimento local.
Antes de conectar contas reais, implementar autenticação e autorização no servidor.

Verificação: `node scripts/test-admin-workspace.mjs`, TypeScript, build e teste
no navegador com `scripts/smoke-admin-workspace.mjs`. O teste com Gemini real é
opcional via `INOVA_TEST_AI=true` e exige a chave configurada no servidor.

Na área Contatos e reativação, o usuário selecionado mostra seu e-mail clicável; o endereço também aparece nas tarefas. Telefones/WhatsApp ainda não estão cadastrados na base demonstrativa e são apresentados como não cadastrados.

A página inicial oferece o acesso Colaborador INOVA no menu superior e no bloco de apresentação, levando diretamente a /admin-inova. O acesso atual é demonstrativo, sem login administrativo de produção.

A hierarquia da página inicial foi ajustada: conta médica e conta paciente têm os botões principais. Demonstrações são links secundários; Colaborador INOVA é um link discreto abaixo deles, sem cartão destacado nem botão no menu superior.
