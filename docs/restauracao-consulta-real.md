# Consulta na conta real

Além dos gráficos e laudos, foram reconectadas as seções Envios do paciente, Solicitar exames, Orientações ao paciente, Histórico familiar e Retorno planejado. A navegação original do prontuário permanece compartilhada com a versão anterior.

Execute `supabase/INOVA_CONSULTA_SQL_EDITOR.sql` após as migrações médicas. O script cria vínculos de portal e registros de consulta privados. Textos e anexos de preparação ficam no banco com RLS habilitada e acesso somente pelo servidor. Não se usa a memória demonstrativa como alternativa. Ainda não foi validado o fluxo ponta a ponta no Supabase após esta migração.

Em Envios do paciente, o médico informa o e-mail da conta gratuita confirmada. O banco só cria o vínculo se CPF e nascimento coincidirem com o prontuário. Não há criação de login nem envio de convite automático. A confirmação médica do vínculo é explícita.

O paciente entra na conta e acessa seu espaço de cuidado: escolhe o médico, escreve sintomas, medicamentos e perguntas, grava ou anexa até três áudios de 5 MB e até três PDFs de 8 MB. Revisa e confirma antes de enviar. O médico lê, ouve e confirma a revisão. Gravação pelo navegador exige HTTPS ou localhost; upload de áudio continua disponível pela rede local HTTP. Rascunhos não enviados ficam no armazenamento local do dispositivo.

Pedidos usam o catálogo de exames e observações, com rascunho, publicação e cancelamento. Orientações têm rascunho, revisão explícita, publicação e retirada. Os registros publicados aparecem para o paciente vinculado. Não há preços ou agenda S2 reais, assinatura eletrônica de pedidos, nem instruções de preparo automáticas.

Histórico familiar registra relatos identificados pelo médico; não infere diagnóstico. Retorno tem data prevista, rascunho, publicação e cancelamento. O resumo mostra contagens e textos de preparações recebidas. Os anexos são consultados como fontes, sem envio automático à IA.

Complementos: execute também `supabase/INOVA_COMPLEMENTOS_SQL_EDITOR.sql`. O sino recebe avisos de preparação recebida/revisada e pedidos, orientações e retornos publicados/retirados. A leitura fica salva por usuário. Os avisos são internos ao sistema, não enviam mensagens externas. Eventos anteriores à instalação do trigger não são reconstruídos automaticamente.

A preparação permite até três áudios de 5 MB e três PDFs de 8 MB por envio. Os envios antigos com um anexo permanecem legíveis. Texto e anexos não enviados são salvos no IndexedDB deste dispositivo com chave que inclui usuário e prontuário. Ao recuperar o rascunho, a confirmação de envio deve ser refeita. Falhas de armazenamento local aparecem na tela; nenhum autosalvamento envia dados ao médico.

Genética bruta está disponível na aba Genética do prontuário e no portal da conta vinculada. O parser valida TXT de até 25 MB, calcula estatísticas e registra hash SHA-256; original e metadados ficam no banco privado. Importações idênticas são deduplicadas por paciente. Download confere a integridade. Médico confirma a associação. Os domínios genéticos permanecem sem escores enquanto não houver metodologia validada.

Ainda não restabelecidos na conta real: preferência de laboratório e confirmação de realização de pedidos, associação de envios a pedidos, identificação dos áudios por campo e síntese integrada de consulta por IA. Os componentes demonstrativos correspondentes permanecem preservados. Os complementos exigem validação ponta a ponta no Supabase após a migração; testes locais não comprovam a instalação do SQL.
