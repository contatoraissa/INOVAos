# Solicitação de exames e preparação para S2

Na área médica, abra um paciente e selecione **Solicitar exames**. Pesquise o catálogo demonstrativo INOVA, selecione exames, acrescente observações e salve um rascunho. Confira o pedido e clique em **Liberar para paciente**. Rascunhos não aparecem no portal do paciente. Cancelamentos de pedidos já liberados continuam visíveis ao paciente e impedem consulta de preços.

No portal de Mariana, abra **Exames solicitados**. A tela busca pedidos liberados para `mariana-oliveira`, com médico, data, exames e observações. **Atualizar pedidos** busca alterações do servidor. A lista pode ser baixada como texto demonstrativo; não é uma prescrição assinada.

Pedidos ficam na memória do servidor de desenvolvimento por até 24 horas ou até reiniciá-lo. Há limite de 100 pedidos. O mesmo identificador de solicitação não cria duplicatas em tentativas repetidas. Não há autenticação real nem autorização por usuário; as operações estão restritas ao ambiente de desenvolvimento e à origem configurada, e recusam produção.

## S2

A área de preços aceita CEP e valida o formato. O servidor também confere se o pedido está liberado. O adaptador atual informa `connected: false` e retorna uma lista vazia de preços. A interface identifica a integração pendente, sem preços, unidades, disponibilidade, reserva, pagamento ou agendamento fictícios.

O link externo aponta apenas para `https://www.s2medica.com.br/`, sem dados pessoais, CEP ou nomes dos exames na URL. Abrir o site não preenche uma compra e não altera o pedido.

A S2 anuncia API, solução com marca própria e integração personalizada em seu [programa de parcerias](https://materiais.s2medica.com.br/parcerias). Para conectar preços reais, obter documentação e acesso oficiais, confirmar recursos e condições, mapear exames INOVA aos identificadores S2 e implementar ofertas com unidade, localização, validade, preço e disponibilidade. Não reutilizar os identificadores do catálogo demonstrativo como códigos S2.

Antes de habilitar dados reais, conectar contas individuais, vínculos médico–paciente, controle de acesso, armazenamento permanente e assinatura de solicitações quando aplicável. A integração externa depende ainda da definição dos dados que cada operação precisa compartilhar.

## Validação

- `node --test scripts/test-orders.mjs`: rascunhos, liberação, cancelamento, isolamento por paciente, idempotência, validação, integração desconectada e expiração.
- `node scripts/smoke-orders.mjs`: criação na área médica, rascunho oculto ao paciente, liberação, exibição no portal, CEP, ausência de preços fictícios, link externo, layout móvel e cancelamento.

O teste de navegador utiliza Chrome com depuração na porta 9222 e o servidor em `http://192.168.0.2:8080`. Defina `INOVA_TEST_URL` para outro endereço. Ele usa somente pedidos fictícios e não acessa a S2.
