# Cadastro do paciente e vínculo com o médico — 10/10/2026

## Comportamento

O formulário demonstrativo já tinha e-mail opcional. Ele continua demonstrativo,
com o layout aprovado e seus dados separados das contas reais. Não cadastrar
pessoas reais na demonstração.

Na conta real, o login do médico autorizado abre **Pacientes** e o cadastro em
**Novo paciente**, nas rotas existentes com `?workspace=account`. `/minha-conta`
mantém o acesso aos vínculos e dados da conta. O formulário reutiliza os mesmos campos
visuais do cadastro aprovado, exige e-mail e confirmação de que o médico conferiu
a identidade e autoriza o vínculo. As permissões médicas existentes não foram
ampliadas: o acesso de avaliação ainda usa a autorização configurada no servidor.

- **Médico primeiro:** registra nome, CPF, nascimento, contato e observações.
  Quando o paciente cria a conta com o mesmo CPF, nascimento e e-mail, confirma
  o e-mail e entra no portal, o sistema conecta essa conta ao prontuário autorizado.
- **Paciente primeiro:** cria e confirma a conta; quando o médico cadastra os
  mesmos dados e autoriza o vínculo, a associação é feita no salvamento.
- **CPF já cadastrado na carteira:** reutiliza o mesmo `patient_id`, sem substituir
  nome, observações ou histórico. Preenche apenas campos de contato vazios.
  Divergências de nascimento ou e-mail interrompem o salvamento.
- **Mais de um médico:** a mesma conta pode ter vínculos distintos; os prontuários
  permanecem separados por médico. Um médico não ganha acesso à carteira de outro.
- **Sem correspondência/confirmação:** não libera dados. Minha conta oferece
  Atualizar vínculos; não informa detalhes de cadastros de outras pessoas.

O vínculo usa `inova_portal_links` e mantém as referências existentes de resultados,
laudos, consultas, pedidos e orientações. Não copia conteúdo clínico de outro
paciente nem configurações pessoais do médico. Observações privadas não aparecem
na lista de cadastros do paciente. As regras existentes continuam a controlar quais
laudos foram revisados e quais orientações foram publicadas.

## Ativação no Supabase

Executar **uma vez** `supabase/INOVA_VINCULO_PACIENTE_SQL_EDITOR.sql` no SQL Editor
do projeto, depois das migrações de contas, área médica e consulta. O mesmo SQL
está em `supabase/migrations/202610100001_patient_identity.sql` para ambientes que
aplicam migrações via CLI. Não executar as duas cópias como etapas diferentes.

A migração adiciona campos de contato e RPCs; não exclui contas, prontuários ou
documentos, não altera CPF/nascimento e não cria vínculos retroativos indiscriminados.
Cadastros antigos sem e-mail continuam exigindo conferência pelo médico: repetir
o cadastro com o CPF e nascimento originais, fornecer o e-mail correto e autorizar.
O mecanismo manual anterior também foi preservado.

**Nesta entrega, o SQL foi validado localmente, mas não aplicado ao Supabase remoto.**
Consulta somente de leitura confirmou ausência das novas colunas. Não havia URL
de conexão PostgreSQL nem token de gerenciamento para instalar a migração. A
interface informa explicitamente essa pendência, sem simular salvamento em memória.

## Telas conectadas

Após login ou confirmação de e-mail, o paciente abre
`/portal-paciente?workspace=account`, sincroniza os vínculos e recebe o cadastro
anterior, contatos, resultados liberados, laudos revisados e orientações publicadas.
Se houver mais de um médico, seleciona o prontuário sem misturar as carteiras.
Sem vínculo autorizado, recebe uma indicação de cadastro pendente, sem dados de
Mariana ou de outras pessoas.

O médico usa `/patients?workspace=account` e `/patients/new?workspace=account`.
O salvamento abre o prontuário original; repetir o CPF não cria outro histórico.
O prontuário mostra os contatos e as observações privadas para o médico,
resultados, evolução, documentos e os componentes existentes de consulta:
envios do paciente, pedidos, orientações e histórico familiar.

Os acessos de demonstração continuam sem o parâmetro `workspace`; Rafael,
Mariana e a administração mantêm suas interfaces e funcionalidades aprovadas.
O acesso real usa a mesma identidade visual, com dados do Supabase e sem
preencher lacunas com exemplos. Esta conexão cobre cadastro e prontuário;
a agenda anual, cotação de laboratórios e genética TXT das contas reais ainda
precisam de integração específica. Laudos do paciente exigem revisão médica,
e observações privadas não são devolvidas ao portal do paciente.

## Segurança e validação

CPF identifica uma correspondência, mas não comprova identidade. O vínculo
automático exige coincidência de CPF, nascimento e e-mail confirmado pelo Supabase,
mais autorização registrada pelo médico. O servidor determina o médico/usuário pela
sessão; clientes não escolhem IDs de proprietário ou destinatário. RPCs são restritas
ao servidor (`service_role`), tabelas mantêm RLS e não há busca anônima por CPF.

Referências oficiais: [usuários e confirmação de e-mail](https://supabase.com/docs/guides/auth/users)
e [RLS e chave de serviço](https://supabase.com/docs/guides/database/postgres/row-level-security).

`npm test` inclui seis novos testes de contrato e PostgreSQL local via PGlite:
cadastro em ambas as ordens, confirmação pendente, divergências de identidade,
autorização médica, preservação de histórico/anexos, duplicidade, prontuários de
médicos distintos, registros legados, recusa de transferência de vínculo, execução
repetida da migração e bloqueio dos papéis anon/authenticated.

Verificação desta entrega: **86 testes passaram**, incluindo quatro testes de
redirecionamento por perfil, liberação de resultados, separação por unidade e
tratamento de resultados qualitativos. TypeScript e build passaram.
`smoke-patient-identity.mjs` conferiu as restrições de acesso, e-mail e autorização
obrigatórios no formulário real e ausência de overflow em celular, sem criar contas
ou enviar e-mails. `smoke-workspace.mjs` passou no cadastro demonstrativo, ausência
de histórico emprestado, perfil médico, resultados, laudos e visualização móvel.
O lint dos arquivos alterados passou; o lint global encontrou 137 erros de formatação
preexistentes em `generate-inova-pitch.mjs`, `generate-sales-guide.mjs` e
`seed-fictional-patient.mjs`, além de sete avisos antigos de Fast Refresh. Esses
arquivos fora do escopo não foram modificados.

A bateria de navegador verificou 21 fluxos. O teste de acesso recebeu uma
correção de sincronização com a hidratação do React e passou na repetição;
os outros 20 passaram na execução completa. `smoke-account-enrollment.mjs`
exercita os formulários de login, cadastro médico, reutilização do prontuário,
perfil do paciente, resultados, orientações, documentos e responsividade com
respostas controladas das funções de servidor. Não cria contas nem grava no
Supabase. A persistência e as regras SQL foram exercitadas separadamente no
PostgreSQL local. O ciclo completo contra o Supabase remoto continua pendente
da instalação da migração e de uma sessão confirmada de teste.
