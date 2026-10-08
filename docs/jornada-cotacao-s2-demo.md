# Jornada de cotação demonstrativa

A partir de um pedido liberado para Mariana, em Minha agenda → Ver pedido e consultar valores → Simular consulta de preços, o botão **Explorar exames e laboratórios** abre uma jornada inspirada nas referências visuais fornecidas pelo usuário, mantendo o visual INOVA.

- Pesquisa limitada aos exames da guia, com carrinho inicial contendo todos os itens.
- Adicionar/remover itens altera somente a comparação; não altera a guia médica.
- Comparação de laboratórios fictícios, com discriminação por exame, total, distância ilustrativa e taxa domiciliar.
- Filtros locais por raio e atendimento na unidade ou em domicílio.
- Revisão da escolha e conclusão da simulação, sem pagamento, reserva, transmissão a terceiros ou alteração da agenda.

Os dados são gerados localmente. O CEP é exibido como referência, sem geocodificação; o cenário é ilustrativo de Sorocaba. A interface identifica os dados como fictícios e não implica integração ou parceria comercial ativa com a S2 Labs.

Pedidos continuam temporários (24 horas ou reinício do servidor). `scripts/simulate-s2-order.mjs` deixa um pedido liberado e verifica a jornada. `scripts/preview-s2-journey.mjs` captura o visual em `artifacts/s2-journey.png` a partir do cenário aberto. TypeScript, testes de pedidos, lint e build foram verificados.
