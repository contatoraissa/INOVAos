# Fluxo do médico e análise de laudos

A área médica permite cadastrar pacientes fictícios, pesquisar a rede médica, escolher paciente e coleta, comparar resultados, preparar a consulta e revisar PDFs laboratoriais, genéticos e genômicos.

## Gemini no ambiente local

A chave fica exclusivamente no servidor, em `.env.local`, ignorado pelo Git. Não coloque credenciais em variáveis `VITE_*`. Se uma chave foi publicada em conversa ou captura, substitua-a no Google AI Studio.

Copie `.env.example` para `.env.local`, preencha `GEMINI_API_KEY`, escolha um modelo disponível para a chave e reinicie o servidor:

```
npm.cmd run dev -- --host 127.0.0.1 --port 5173
```

O endpoint só permite análise com `INOVA_AI_ENABLED=true`, em desenvolvimento e no endereço local. Builds de produção recusam a análise enquanto autenticação e autorização por paciente não forem implementadas. A chave nunca é enviada ao navegador. Há limite de duas análises simultâneas e dez solicitações por minuto neste processo.

## Como testar

Para acessar pela rede no desenvolvimento, configure `INOVA_AI_ORIGIN` com a origem exata, por exemplo `http://192.168.0.2:8080`, e reinicie o Vite. Esse endereço adicional mantém a exigência de desenvolvimento, ativação explícita e origem correspondente na solicitação.

1. Abra um paciente e selecione **Laudos laboratoriais**, **Genética** ou **Genômica**.
2. Use um dos PDFs fictícios de `public/examples/`, ou um documento anonimizado de até 8 MB.
3. Selecione o PDF e confira o original.
4. Confirme que o arquivo é fictício ou anonimizado e solicite **Analisar com Gemini**. O conteúdo será enviado ao Google.
5. Confira identidade, achados, limitações, resultados extraídos e páginas de origem no PDF original.
6. Marque a síntese revisada. O estado aparece no resumo da consulta e na biblioteca de documentos.

O número de página, o trecho e a identidade são extraídos pelo modelo e devem ser conferidos. Valores críticos só são sinalizados se o documento explicitamente os declarar; a aplicação não calcula limites clínicos nem transforma ausência de dados em resultado negativo. Resultados extraídos não são adicionados automaticamente à série laboratorial demonstrativa.

Uploads não são gravados no disco pelo INOVA. Documentos, revisões e anotações ficam em memória enquanto o paciente está aberto; cadastros ficam na sessão da aplicação e são perdidos ao atualizar a página. O processamento externo tem as condições de tratamento de dados do serviço Google utilizado. Este fluxo local não deve ser usado para atendimento com dados identificáveis.

## Verificação técnica

```
node --test scripts/test-gemini.mjs
node --env-file=.env.local scripts/gemini-smoke.mjs
npm.cmd run build
```

O primeiro comando utiliza respostas simuladas e não chama a API. O segundo envia somente o PDF fictício incluído no projeto, usa a chave local e pode consumir a cota do Google.

O teste de navegador `scripts/smoke-workspace.mjs` utiliza um Chrome em modo headless, com depuração na porta 9222 e servidor na porta 5173. Confere cadastro, busca de médicos, filtros, troca de coleta, revisão compartilhada, importação e visualização do PDF e layout móvel.

Para outro endereço, defina `INOVA_TEST_URL`. A opção `--live-ai` também gera uma síntese real do PDF fictício pela interface e confere as fontes e a revisão; esse teste pode consumir a cota do Google.

## Trabalho necessário antes de produção

Autenticação real; vínculos médico–paciente e autorização no servidor; persistência com controle de acesso e auditoria; identificação e confirmação da associação do documento ao paciente; revisão humana dos resultados importados; processamento e retenção de documentos adequados ao uso com dados reais. A área do paciente será desenvolvida sobre essa base.

Referências oficiais: [PDFs no Gemini](https://ai.google.dev/gemini-api/docs/generate-content/document-processing), [saída estruturada](https://ai.google.dev/gemini-api/docs/generate-content/structured-output).
