# Usabilidade e continuidade · demonstração INOVA

## Médico

- Dashboard: fila de envios sem revisão, pedidos em rascunho, pedidos liberados sem laudo vinculado e orientações ainda não publicadas. Filtro por categoria, atualização manual, ordem cronológica e links diretos à seção do prontuário. Não calcula urgência nem confirma atendimento pelo laboratório. PDFs locais permanecem no resumo da consulta, pois não são enviados ao servidor automaticamente.
- Prontuário: navegação por tarefa; logo retorna ao dashboard; Sair retorna ao login.
- Laudos: mostra paciente selecionado e identidade extraída; diferenças de nome são destacadas. A marcação de revisão exige confirmação de identidade no documento original, inclusive no resumo. Nova análise invalida essa confirmação. Comparação por nome é apenas um alerta, não autenticação nem prova de identidade.
- Resumo: fechamento reúne laudos revisados, envios pendentes, orientações publicadas e próximos passos escritos pelo profissional. Confirmação explícita registra uma fotografia da sessão, disponível para download TXT. Alterações posteriores são sinalizadas. Fechamento e plano sobrevivem às mudanças de aba, mas não à saída do prontuário/reload. Não publica orientação automaticamente, não assina receita e não resolve pendências por conta própria.

## Paciente

- Página inicial: primeiro próximo passo destacado, demais tarefas acessíveis em Próximos passos.
- Busca em todas as seções: pedidos liberados/cancelados, valores históricos, orientações publicadas, documentos locais e envios. Não pesquisa o conteúdo dos PDFs ou transcreve áudios. Abre a seção correspondente; no histórico de resultados, use o seletor de coleta.
- Acessibilidade: letras maiores, contraste e foco de teclado; preferências guardadas no mesmo navegador. Layout móvel e impressão permanecem disponíveis.
- Preparar consulta: textos, anotações salvas, áudios concluídos e PDFs ficam em IndexedDB por perfil, no mesmo navegador/origem. Recuperação após reload e logout, gravações ainda em andamento não são recuperáveis. O estado do consentimento, do pedido selecionado e das caixas de seleção dos anexos não é recuperado: revise-os antes de enviar.
- Limite de rascunho local: 50 MB de anexos. Erro de leitura impede sobrescrever o rascunho existente; falhas de gravação são visíveis. Exclusão em duas etapas apaga conteúdo local, não envios já recebidos pelo médico. Não há sincronização entre computadores, persistência garantida pelo navegador, backup ou armazenamento seguro de produção. Dados apenas fictícios neste ambiente.
- Revisão do envio: destinatário, textos, áudios e PDFs selecionados antes de confirmar. Status mostra recebimento e revisão com datas; orientações publicadas aparecem separadas.
- Gemini: resultados da coleta e evolução do período selecionado, após consentimento. Explicações não revisadas pelo médico, com limites e referências; sem diagnóstico/prescrição. Falhas de cota não bloqueiam próxima chamada; não há chamadas automáticas para checar renovação. Não foram consumidas chamadas reais nesta etapa.

## Verificações

`scripts/smoke-usability.mjs` verifica recuperação de texto/áudio/PDF, busca, acessibilidade, celular, exclusão confirmada, fila com abertura direta, fechamento e conferência de identidade usando dados sintéticos. Preserva e restaura o rascunho que existia antes do teste e cancela somente o pedido criado pelo teste. Requer o áudio sintético em `artifacts/test-recorded-audio.webm`, gerado pelo teste anterior de áudio.

O teste usa o Chrome na porta 9222 e o servidor demonstrativo autorizado. O conjunto de contratos tem 45 testes. Não se trata de validação clínica ou teste de segurança de produção.

## Ainda necessário para uso real

Autenticação no servidor, contas e vínculo médico–paciente, banco de dados com controle de acesso, armazenamento de arquivos, trilha de auditoria e política de retenção. Integração oficial S2 e metodologia validada para scores genéticos seguem pendentes. Não foram ativados serviços externos, cobrança ou publicação de produção nesta etapa.
