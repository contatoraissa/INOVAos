# Genética bruta no INOVA

O paciente tem a seção **Minha genética**. O médico encontra o mesmo arquivo na aba **Genética**, no **Resumo da consulta** e na biblioteca de **Documentos**. Os quatro domínios — Neurologia, Metabólico, Imunidade e Nutrição — são categorias de acompanhamento. Conforme solicitado, **scores e predisposições permanecem sem cálculo**, até haver uma metodologia validada.

## Passo a passo

1. Baixe o exemplo totalmente fictício em `public/examples/23andme-exemplo-ficticio.txt`, ou pelo link da própria tela.
2. No portal de Mariana, abra Minha genética. Selecione o TXT e confirme que ele é fictício e que o perfil selecionado é o destinatário correto.
3. Clique em Enviar arquivo genético. O original convertido para UTF-8 e seus metadados ficam vinculados ao paciente no servidor local.
4. No prontuário de Mariana, abra Genética. Confira versão do arquivo, origem do envio, marcadores, versão do genoma, orientação, ausências de chamada e avisos técnicos.
5. Baixe a cópia do TXT se desejar conferir o conteúdo completo. Marque a confirmação de associação e use Marcar arquivo genético revisado. A revisão não valida clinicamente o teste nem gera uma pontuação.
6. Nos próximos acessos, o arquivo e os quatro domínios continuam disponíveis. Arquivos idênticos não criam cópias duplicadas; é possível selecionar até três versões.
7. Excluir arquivo genético abre uma confirmação própria. Confirmar exclui a cópia e seus metadados. A mudança aparece na área médica e no portal.

Para um arquivo recebido por WhatsApp ou e-mail, salve o anexo manualmente e importe na aba Genética do médico. Não há leitura automática de mensagens, integração com WhatsApp ou busca na caixa de e-mail. O TXT também não entra no pacote de respostas/áudios/PDFs de Preparar consulta; sua entrega tem fluxo próprio e gera avisos.

## Formato e validação

O módulo aceita `.txt` UTF-8 com quatro colunas: `rsid chromosome position genotype`, separadas por espaço ou tabulação, e comentários iniciados por `#`. O ZIP deve ser extraído antes; outros fornecedores, CSV, VCF e PDF não são convertidos automaticamente.

São aceitos IDs rs/i, cromossomos 1–22/X/Y/MT (incluindo aliases numéricos), posição inteira positiva, chamadas de um ou dois alelos A/C/G/T/I/D e `--` para ausência de chamada. O parser identifica GRCh37/GRCh38 e orientação quando declaradas no cabeçalho. Um cabeçalho ausente, registros malformados, dados binários, versões de genoma conflitantes ou um marcador repetido com dados diferentes recusam a importação inteira. Duplicatas idênticas são contadas uma única vez no resumo e preservadas na cópia textual.

Limites: 25 MB por TXT, 1,2 milhão de marcadores, três versões por paciente, 20 arquivos e 100 MB de conteúdo textual no conjunto da demonstração. O resumo mostra até 25 marcadores técnicos. O número de marcadores e percentual de chamadas não são scores, probabilidades, percentis ou evidências de predisposição.

## Retenção demonstrativa

Este módulo usa `.inova-demo/genetics/`, excluído do Git. Os nomes físicos são UUIDs, independentes do nome enviado. A cópia UTF-8 tem SHA-256 e a integridade é conferida antes de download/revisão. A persistência local sobrevive à recriação do serviço e ao reinício do servidor no mesmo diretório; não tem expiração automática de 24 horas. Exclusão é explícita. Não equivale a armazenamento permanente em nuvem, backup ou prontuário real.

Os endpoints continuam limitados a desenvolvimento, ativação explícita e origem permitida. **Não há autenticação real**. Por isso o módulo solicita apenas arquivos fictícios. Dados genéticos reais exigem autenticação, autorização, vínculo entre contas, consentimento adequado, armazenamento protegido, retenção e auditoria antes de serem habilitados. Os arquivos não são enviados ao Gemini ou a outro fornecedor para inferir predisposição.

## Requisitos adicionais do produto

| ID     | Requisito e critério de aceitação                                                    |
| ------ | ------------------------------------------------------------------------------------ |
| RF-G01 | Importar TXT compatível após confirmação; validar integralmente antes de armazenar.  |
| RF-G02 | Vincular por paciente; envio do portal chega à aba Genética do médico.               |
| RF-G03 | Deduplicar por hash/paciente, manter versões e preservar cópia textual.              |
| RF-G04 | Exibir os quatro domínios nos retornos; scores não calculados têm estado explícito.  |
| RF-G05 | Revisão explícita pelo médico, sem interpretação ou publicação de score automática.  |
| RF-G06 | Download com verificação de integridade e exclusão confirmada de original/metadados. |
| RF-G07 | Armazenamento local persistente, segregado do Git e recusado em produção.            |

## Base futura para cálculo de predisposição

O arquivo bruto contém genótipos, não quatro scores prontos. Modelos devem definir fenótipos específicos, variantes, alelos de efeito, pesos, versão do genoma, população de desenvolvimento/validação, compatibilidade/cobertura dos dados e método de calibração. Um domínio amplo não corresponde automaticamente a um único modelo. A ausência de variantes ou de modelo não pode ser convertida em risco baixo, resultado negativo ou score zero. Não há dose, conduta pronta ou par gene–fármaco neste módulo.

Referências primárias consultadas: [dados brutos 23andMe](https://customercare.23andme.com/hc/en-us/articles/212196868-Accessing-Your-Raw-Genetic-Data), [detalhes técnicos](https://int.customercare.23andme.com/hc/en-us/articles/215983947-Raw-Genotype-Data-Technical-Details) e [PGS Catalog — definição, arquivos de scoring e avaliações](https://www.pgscatalog.org/about/). A leitura dessas fontes não estabelece parceria nem integra uma metodologia ao INOVA.

## Verificação

`node --test scripts/test-genetics.mjs`: dez testes de parser, consentimento, ausência de score, persistência entre instâncias, deduplicação, separação por paciente, importação atômica, limite de versões, integridade e exclusão.

`node scripts/smoke-genetics.mjs`: envio no portal, recebimento pelo médico, revisão explícita, retorno ao resumo, separação por paciente, download, avisos, erro sem perder o original, layout móvel e exclusão. Usa apenas conteúdo sintético, Chrome CDP na porta 9222 e o servidor local; `INOVA_TEST_URL` permite outro endereço.
