# Cadastro de contas INOVA

Execute `supabase/INOVA_CADASTRO_SQL_EDITOR.sql` no SQL Editor, depois do SQL inicial de retornos. O arquivo cria os dados cadastrais e as assinaturas pendentes, sem cobrança e sem liberar acesso a dados de saúde.

Em Authentication, habilite o provedor Email e **Confirm email**. Configure a Site URL e as URLs de redirecionamento autorizadas para o endereço do INOVA. Para produção, configure SMTP próprio e confira os limites de envio. Referência: https://supabase.com/docs/guides/auth/general-configuration

Os formulários estão nas páginas de acesso médico e paciente, em **Criar minha conta**. O cadastro usa Supabase Auth; a senha não é gravada nas tabelas do INOVA. O trigger cria o perfil e os dados cadastrais na mesma transação do usuário. CPF e CNPJ recebem validação matemática no formulário e no servidor; isso não confirma a identidade civil. CRM é obrigatório com UF, mas a verificação profissional ainda é pendente.

A demonstração continua separada e usa dados fictícios. Criar uma conta não entra no perfil demonstrativo de Mariana e não ativa cobrança. Pacientes não recebem assinatura; médicos começam com assinatura `pending`. Somente integração de pagamento verificada no servidor deve mudar esse estado para `active`; metadados enviados no cadastro nunca liberam assinatura.

Login real, confirmação e recuperação de senha agora estão implementados; veja `docs/acesso-e-apresentacao.md`. Etapas ainda necessárias: autorização dos módulos clínicos por paciente e vínculo médico, checkout e webhook do provedor de pagamento. Preço e provedor ainda precisam ser definidos. As tabelas permanecem sem acesso direto para `anon` e `authenticated` até a implantação dessas regras. O código atual de cadastro não torna os portais demonstrativos prontos para produção.

Nenhum teste cria usuários, envia e-mails ou faz cobranças. A migração deve ser validada no SQL Editor do projeto antes de usar os formulários.
