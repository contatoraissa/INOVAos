# Área médica própria

A navegação médica agora usa `MedicalWorkspace`, sem renderizar os filhos demonstrativos dos antigos layouts. O nome vem da sessão confirmada Supabase. Não são copiados pacientes, resultados, métricas nem laudos fictícios.

Execute `supabase/INOVA_AREA_MEDICA_SQL_EDITOR.sql` no SQL Editor, depois das duas migrações anteriores. Essa etapa cria a tabela de pacientes próprios e a função de cadastro. Não altera assinaturas ou CRM, não cria usuários Auth e não envia convites.

As consultas são autorizadas no servidor pela sessão Supabase confirmada e pelo acesso de avaliação configurado no ambiente. O vínculo `doctor_id` vem da sessão, nunca do formulário. Todas as consultas e aberturas de prontuário incluem esse vínculo. RLS permanece habilitada, sem acesso direto público ou autenticado; a integração server-side usa a chave secreta. Não há fallback para memória quando o banco falha.

Disponível após executar SQL: painel com contagem própria, cadastrar paciente, pesquisar pacientes e consultar dados cadastrais e observações no prontuário. Ausência de dados gera estado vazio.

Para habilitar exames, execute também `supabase/INOVA_EXAMES_SQL_EDITOR.sql`. Abra Pacientes, selecione o paciente e use a aba Laudos no prontuário. Envie um PDF de até 8 MB e abra o original. O arquivo fica no bucket privado `inova-reports`; a abertura usa um endereço temporário autorizado pelo servidor. Arquivos idênticos para o mesmo paciente e tipo não são cadastrados novamente.

A análise depende da configuração e da disponibilidade do Gemini e só começa após autorização explícita. Confira a identidade, os valores e a data da coleta no original antes de confirmar a revisão. Somente a revisão confirmada grava resultados laboratoriais no histórico. A evolução compara valores numéricos do mesmo marcador e unidade, quando existem pelo menos duas coletas. Documentos genéticos e genômicos podem ser anexados e revisados, mas não geram escores de predisposição.

Ainda pendentes: pedidos, orientações, consultas, indicadores e integração do prontuário médico com a conta do paciente. Esses módulos mostram seu estado de implantação. A área real inteira ainda não está concluída. O fluxo de exames requer validação no projeto Supabase após aplicar o SQL; compilação local não comprova uma análise real do Gemini.

O acesso temporário de avaliação é configurado no servidor. Não concede status de profissional verificado nem assinatura paga. Produção requer regras de acesso completas, provisionamento pago, gestão de vínculos e demais controles definidos para os módulos.
