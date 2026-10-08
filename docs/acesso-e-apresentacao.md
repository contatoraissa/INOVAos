# Acesso real e apresentação INOVA

A página inicial `/` apresenta o produto com a identidade INOVA. A referência visual foi consultada somente para organização; textos, composição e prévias são próprios. A prévia é ilustrativa e não comprova implantação dos módulos da conta real.

`/acesso` e `/acesso-paciente` oferecem **Entrar na conta**, **Criar minha conta** e **Explorar demonstração gratuita**. A demonstração permanece no ambiente existente com dados fictícios. O login real valida e-mail e senha no Supabase, verifica a confirmação do e-mail e cria um cookie HttpOnly, SameSite=Lax, Secure em HTTPS. A sessão expira após até uma hora; é necessário entrar novamente. Não há armazenamento de tokens no localStorage. O retorno de confirmação remove o fragmento da barra antes de processar o token.

O acesso real abre `/minha-conta`, com o cadastro próprio e o estado da assinatura. Pacientes têm conta gratuita e médicos continuam com assinatura pendente. A liberação dos módulos clínicos reais exige autorização por paciente e vínculo médico, migração dos módulos e integração do pagamento. Não há checkout, preço publicado ou cobrança automática. O login real nunca encaminha o usuário para o perfil fictício como se fosse seu prontuário.

## Corrigir o endereço do e-mail no Supabase

No projeto, abra **Authentication → URL Configuration**:

- **Site URL:** `http://192.168.0.2:8080`
- **Redirect URLs:** adicione exatamente `http://192.168.0.2:8080/confirmar-email`.

O código envia `redirect_to` com a origem atual do INOVA. Se você também acessar por outro endereço local, autorize o retorno equivalente para esse endereço. Quando houver domínio público, atualize Site URL e autorize o caminho de retorno no domínio HTTPS. O endereço local só funciona enquanto o servidor estiver disponível e o dispositivo estiver na rede.

Em **Authentication → Email Templates**, o template de confirmação padrão deve usar `{{ .ConfirmationURL }}`. Um template personalizado com `localhost` escrito diretamente também precisa ser corrigido. Links enviados antes dessa configuração continuam com o endereço antigo. O mesmo caminho de retorno atende recuperação de senha.

Essa configuração é feita no painel, não no SQL Editor. A chave do banco não é uma credencial para administrar as configurações do projeto. Referência oficial: https://supabase.com/docs/guides/auth/redirect-urls

Os testes de interface não criam contas, não enviam e-mails e não fazem cobranças. O fluxo completo de confirmação precisa de um novo e-mail depois da atualização das URLs no painel.
