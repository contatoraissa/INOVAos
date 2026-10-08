# Acompanhamento do paciente

As seis seções adicionais ficam em `/portal-paciente`, com o mesmo acesso demonstrativo de Mariana. A página inicial também apresenta próximos passos e o cabeçalho oferece acesso aos avisos.

## Fluxo implementado

- **Próximos passos:** calcula pendências a partir de pedidos liberados, realização informada, laudos vinculados enviados, envios ainda não revisados, documentos locais e orientações publicadas. Pedidos cancelados deixam de gerar pendências.
- **Avisos:** registra liberações e cancelamentos de pedidos, recebimento e revisão dos envios, publicação e retirada de orientações, e realização informada pelo paciente. Marcar como lido persiste no servidor demonstrativo; a atualização ocorre a cada 30 segundos enquanto a aba está visível ou pelo botão Atualizar acompanhamento. Não há push, SMS ou e-mail.
- **Orientações do médico:** no prontuário, abra **Orientações ao paciente**, escreva e salve um rascunho, confira seu conteúdo, marque a revisão e publique. Apenas a versão publicada aparece para o paciente. Retirar uma orientação remove seu acesso e registra um aviso. Resumos da IA não são publicados automaticamente.
- **Laboratórios favoritos:** cadastro manual de nome, endereço, CEP e site HTTPS opcional. Até dez locais. O paciente pode associar um favorito a um pedido e reutilizar seu CEP. Cadastro não confirma parceria S2, reserva ou agendamento.
- **Preparo dos exames:** a publicação pelo médico exige pedido liberado do paciente, unidade/fonte, link HTTPS e data válida da instrução. O portal mostra a fonte e a data. Cancelar o pedido remove seu preparo da lista ativa. Nenhuma instrução clínica é inventada a partir do nome do exame. A S2 permanece desconectada.
- **Linha do tempo:** reúne eventos registrados, documentos adicionados na sessão e coletas fictícias pré-existentes. Inclui pesquisa, filtros e acesso aos detalhes. Coletas históricas informadas apenas por mês mantêm o aviso de dia não informado.

Em **Exames solicitados**, o paciente escolhe uma preferência e informa opcionalmente a data em que realizou o conjunto de exames. Essa informação é explicitamente declarada pelo paciente e pode ser corrigida ou removida; não representa confirmação do laboratório. Em **Preparar consulta**, ele pode relacionar texto, áudio e PDFs a um pedido ativo antes do envio. Um PDF local ou um laudo enviado para outro pedido não conclui a pendência desse pedido.

## Limites atuais

Dados novos ficam na memória do servidor por até 24 horas ou até seu reinício. Arquivos e rascunhos locais são descartados ao atualizar a página. O login continua demonstrativo; os endpoints recusam produção e origens não autorizadas. Para uso real faltam autenticação no servidor, vínculo entre contas, autorização por paciente e armazenamento permanente. Consulta de preços, parceiros, disponibilidade e agendamento S2 exigem acesso oficial à integração.

## Verificação

`node --test scripts/test-care.mjs` cobre privacidade de rascunhos, publicação/retirada, idempotência de eventos, leitura por paciente, validação de fontes/datas, favoritos, realização informada, vínculo de envio e expiração.

`node scripts/smoke-care.mjs`, com Chrome CDP na porta 9222 e o servidor de desenvolvimento ativo, percorre médico → paciente → médico: pedido, orientação, preparo com fonte, favorito, acompanhamento, envio, revisão, avisos lidos após atualização, linha do tempo, layout móvel, retirada e cancelamento. Usa apenas conteúdo fictício. `INOVA_TEST_URL` permite configurar o endereço do servidor.
