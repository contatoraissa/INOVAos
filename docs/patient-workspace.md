# Área do paciente

O acesso separado fica em `/acesso-paciente`. A tela médica oferece um link para ele e a tela do paciente oferece o caminho de volta ao acesso profissional.

## Acesso demonstrativo

E-mail: `mariana@exemplo.com`. Senha fictícia: `inova2026`. A demonstração abre somente o perfil fictício de Mariana Oliveira em `/portal-paciente`.

O marcador de sessão no navegador serve apenas para demonstrar entrada e saída. Ele não autentica um usuário no servidor, não protege dados reais e não substitui autorização entre médico e paciente. Não use este fluxo com dados identificáveis.

## Fluxos disponíveis

- Meu cuidado: última coleta, atalhos e estado das anotações/documentos.
- Meus resultados: pesquisa e seleção das coletas do histórico fictício existente.
- Exames solicitados: pedidos liberados pelo médico, observações e cancelamentos, com consulta de preços S2 identificada como desconectada. Consulte [o fluxo de pedidos](./exam-orders.md).
- Minha evolução: quatro gráficos com filtro de período, sem destaques médicos ilustrativos. A idade vem do nascimento cadastrado e da data exata da última coleta; referências publicadas são selecionadas conforme idade e sexo de referência disponível. Nascimento ausente ou inválido impede a seleção; menores de 18 anos recebem indicação de consultar a referência pediátrica do laudo.
- Meus documentos: classificação, leitura de PDF local, pesquisa e remoção. Até 8 MB, com validação da assinatura do arquivo e mensagens de erro.
- Preparar consulta: sintomas, medicamentos e perguntas por texto ou áudio; ouvir, apagar e gravar novamente; selecionar até três laudos; enviar o conjunto para a caixa médica demonstrativa. Salvar e imprimir anotações continuam disponíveis.
- Meu perfil: edição demonstrativa dos contatos.
- Minha genética: envio de TXT bruto compatível com 23andMe, quatro domínios com scores pendentes, versões, revisão médica e cópia local persistente. Consulte [genética bruta](./genetic-raw.md); a retenção deste módulo é diferente dos PDFs e rascunhos da página.
- Próximos passos, Avisos, Orientações do médico, Preparo dos exames, Laboratórios favoritos e Linha do tempo: consulte [o acompanhamento do paciente](./patient-care.md) para o fluxo de publicação, preferências, realização informada e atualização dos eventos.

Os rascunhos, PDFs, contatos e áudios ficam em memória nesta página. A navegação entre seções mantém os áudios concluídos; mudar de seção descarta uma gravação ainda em andamento e libera o microfone. Atualizar ou sair remove os rascunhos. O envio explícito coloca uma cópia das respostas e anexos no servidor de desenvolvimento, disponível em **Envios do paciente** na área médica de Mariana. A caixa mantém até 20 envios e 128 MB, por até 24 horas ou até reiniciar o servidor. Não há armazenamento permanente nem autenticação real neste fluxo.

O médico pode ouvir os áudios originais, abrir PDFs, encaminhá-los à análise de laudos, marcar o envio revisado e removê-lo. A área do paciente não envia áudio nem PDF ao Google e não faz transcrição automática.

O microfone exige HTTPS ou localhost. Neste computador, use `http://localhost:8080/acesso-paciente`. No endereço HTTP da rede, a interface explica a restrição e permite anexar um arquivo de áudio já gravado. Gravações duram até três minutos; áudios até 5 MB cada, PDFs até 8 MB cada, total de até 24 MB por envio. Consentimento demonstrativo, paciente fixo, formatos e limites são validados no servidor. O envio é desativado em produção.

## Validação

`node --test scripts/test-references.mjs` verifica aniversários, datas inválidas, faixa adulta/pediátrica, sexo não informado e critérios condicionais. As fontes do catálogo são [Mayo Clinic Laboratories](https://www.mayocliniclabs.com/test-catalog/Overview/801417), [ADA](https://diabetes.org/about-diabetes/diagnosis), [SBEM/SBPC de 2020](https://pubmed.ncbi.nlm.nih.gov/32813765/) e [ACC/AHA de 2026](https://www.acc.org/About-ACC/Press-Releases/2026/03/13/18/01/ACCAHA-Issue-UpDated-Guideline-for-Managing-Lipids-Cholesterol). São parâmetros de consulta identificados na tela, não intervalos do laboratório INOVA nem classificação automática. Glicemia mantém a exigência de jejum; vitamina D mantém ressalva sobre condições clínicas; LDL exige meta definida pelo profissional. Não se assume ausência de gestação ou doenças.

`node scripts/smoke-patient.mjs`, com Chrome headless na porta 9222 e o servidor em `http://192.168.0.2:8080`. `INOVA_TEST_URL` permite outro endereço. O teste cobre credenciais demonstrativas inválidas, entrada, resultados por coleta, gráficos, anotações, impressão, PDF, perfil, menu móvel, saída e redirecionamento da entrada direta sem sessão demonstrativa.

`node scripts/smoke-patient.mjs --audio` usa localhost e um microfone simulado por Web Audio com o MediaRecorder nativo do navegador. Testa permissão recusada, gravação, exclusão, nova gravação, encerramento dos microfones, entrega de três áudios e um PDF ao servidor, reprodução na área médica, abertura do PDF na análise, revisão e remoção. `node --test scripts/test-preparation.mjs` verifica validação, idempotência, isolamento por paciente, anexos, expiração e revisão.

Após esse teste, `node scripts/smoke-patient.mjs --audio-attachment` reutiliza o áudio de teste gerado em `artifacts/` para conferir o mesmo envio pelo endereço HTTP da rede, usando arquivos anexados. Nenhum áudio de pessoa é usado nos testes.

## Revisão e acompanhamento dos envios

Em Preparar consulta, o botão Revisar antes de enviar abre um resumo com destinatário, pedido relacionado, textos, reprodução dos áudios e links para abrir apenas os PDFs selecionados. Voltar e editar preserva o rascunho; somente Confirmar envio ao médico chama o envio. Alterações no conteúdo invalidam a revisão aberta e exigem uma nova conferência. Falhas mantêm os dados para tentar novamente, com o mesmo identificador de requisição.

Meus envios ao médico lista o recebimento e a revisão marcada pelo profissional, com datas. O horário da primeira revisão é preservado em novas marcações. A atualização usa o acompanhamento existente (30 segundos enquanto a página está visível) e também pode ser feita manualmente. Orientações publicadas aparecem separadas: não são tratadas como resposta a um envio sem vínculo explícito. Os dados continuam temporários, por até 24 horas ou até reinício do servidor.

## IA em resultados e evolução

Meus resultados permite interpretar a coleta e os marcadores exibidos após consentimento explícito. Minha evolução interpreta as coletas do período selecionado. O servidor monta o contexto a partir do histórico fictício de Mariana: valores, unidades, períodos, idade na última coleta, parâmetros publicados e limitações conhecidas. Nome, CPF, nascimento, PDFs e áudios não entram nessa requisição. Os intervalos publicados são parâmetros de consulta, não referências do laboratório.

A integração reutiliza chave e modelo Gemini do servidor, restrição ao ambiente local autorizado e limite compartilhado de solicitações. A resposta é validada como resumo, explicações dos marcadores selecionados, limitações e perguntas para a consulta. O prompt proíbe diagnóstico, prescrição, doses, tratamento e inferência de risco. Essa validação verifica formato e marcadores, não valida clinicamente o texto. A interface identifica geração por IA sem revisão médica. Alterar a seleção limpa a explicação anterior. Resultado restrito à tela/sessão, sem importação no histórico ou publicação automática pelo médico.

`node --test scripts/test-patient-results-ai.mjs` verifica seleção, consentimento, contexto sem identificação, respostas simuladas válidas/inválidas e erros sem exposição de credenciais.

## Próximos requisitos de produção

Autenticação no servidor, contas individuais, armazenamento com controle de acesso, vínculo médico–paciente e confirmação da identidade do laudo para habilitar o fluxo com dados reais. A publicação de textos revisados está conectada à aba Orientações ao paciente; a síntese da IA exige avaliação do profissional e não é liberada automaticamente. Um envio recebido não implica que o médico leu, avaliou ou respondeu.
