# Verificação funcional do INOVA — 09/10/2026

Verificação da demonstração local, sobre a versão do GitHub `21ad052` e as
correções desta sessão. O layout aprovado de Rafael e Mariana foi preservado.
Não houve cadastro, exclusão ou alteração de contas e prontuários reais no Supabase.

## Resultado

| Verificação                      | Resultado                                          |
| -------------------------------- | -------------------------------------------------- |
| Regras e contratos automatizados | 76 testes passaram                                 |
| Fluxos de navegador              | 19 cenários passaram na execução final             |
| Navegação e largura de tela      | 16 rotas e 15 seções do paciente, em 1440 e 390 px |
| IA com chamadas reais ao Gemini  | 6 fluxos passaram, usando conteúdo fictício        |
| TypeScript                       | Sem erros                                          |
| Build                            | Concluído                                          |
| ESLint                           | Sem erros; 7 avisos existentes de Fast Refresh     |

Ambiente: servidor de desenvolvimento em `http://localhost:8081`, Chrome 154
automatizado pelo protocolo CDP. A verificação de largura procura rolagem
horizontal indevida; não substitui uma revisão visual em todos os aparelhos.

## O que foi exercitado

| Área                   | Comportamentos verificados                                                                                                        |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Acesso                 | Botões de demonstração, acesso de médico e paciente, navegação e logo administrativo voltando à página inicial                    |
| Preparar consulta      | Rascunho, gravação de três áudios, permissão de microfone negada, exclusão e nova gravação, PDF, envio e saída do paciente        |
| Recepção médica        | Notificação, abertura da mensagem, reprodução dos áudios, consulta ao PDF, revisão e retirada de envio                            |
| Pedidos e S2           | Solicitar, liberar, consultar preços fictícios, explorar exames e laboratórios, escolher opção e cancelar pedido                  |
| Agenda compartilhada   | Inclusão e cancelamento com motivo, coleta vinculada ao pedido, prevenção de duplicidade, navegação e eventos futuros             |
| Genética               | Importação fictícia de TXT, versões, download, revisão e exclusão do arquivo de teste; ausência de escores automáticos            |
| Perfil e configurações | Alterações, salvamento, cancelamento e persistência das preferências demonstrativas                                               |
| Administração          | Sete áreas, gráficos, filtros, estados de usuários, confirmação, histórico, tarefas de contato, feedbacks e assinaturas fictícias |
| Relatórios             | Períodos, escopo do médico e apresentação para impressão                                                                          |
| Falha de conexão       | Erro visível durante indisponibilidade e recuperação ao atualizar depois de reconectar                                            |

Também foram feitas chamadas reais de IA para resumo administrativo, explicação
dos resultados do paciente, explicação da evolução, análise de PDF laboratorial,
análise de PDF genômico e briefing da agenda. Os dados enviados nesses testes eram
fictícios. Sucesso técnico da resposta não comprova precisão clínica.

## Correção funcional encontrada

A análise de PDF falhava com HTTP 400 do Gemini: o esquema estruturado solicitado
produzia uma restrição com estados demais. O esquema enviado ao provedor foi
simplificado em `src/lib/ai-contract.ts`.

Os limites de tamanho, quantidade de achados e referências de página continuam
validados pelo servidor com Zod. Um teste de regressão verifica a rejeição de
texto longo, listas grandes e citações fora do documento. Depois da correção,
PDFs fictícios foram analisados pela aplicação, com abertura do documento original
e registro de revisão.

Alguns testes de navegador ainda esperavam telas anteriores, incluindo o login
demonstrativo antigo e o diretório de médicos substituído pelo perfil. Esses
testes foram atualizados para o fluxo atual, com espera pela hidratação do React.
A formatação dos arquivos de rotas foi ajustada para cumprir o lint; não houve
mudança de layout nessas páginas.

## Como repetir

Na raiz do projeto:

```powershell
npm.cmd test
npm.cmd run lint
npx.cmd tsc --noEmit
npm.cmd run build
```

Para os testes de navegador, mantenha apenas um servidor Vite usando essa porta:

```powershell
npm.cmd run dev -- --host 0.0.0.0 --port 8081 --strictPort
```

Em outro terminal, abra um Chrome exclusivo para os testes. Ajuste o caminho do
executável se sua instalação estiver em outro local:

```powershell
$testProfile = Join-Path (Get-Location) 'artifacts/test-chrome'
Start-Process 'C:\Program Files\Google\Chrome\Application\chrome.exe' -WindowStyle Hidden -ArgumentList @(
  '--headless=new',
  '--remote-debugging-port=9222',
  "--user-data-dir=$testProfile",
  '--use-fake-ui-for-media-stream',
  '--use-fake-device-for-media-stream',
  '--no-first-run',
  'about:blank'
)
$env:INOVA_TEST_URL = 'http://localhost:8081'
npm.cmd run test:browser
```

O executor roda os cenários sequencialmente, guarda logs e `results.json` em
`artifacts/regression` e restaura os arquivos persistentes de `.inova-demo` ao
terminar. Não execute duas baterias simultâneas no mesmo Chrome ou servidor.
Os testes criam envios e pedidos fictícios no backend temporário; esses estados
em memória podem continuar disponíveis até expirar ou reiniciar o servidor.
O perfil do navegador é exclusivo dos testes.

A bateria padrão não exige chamadas reais de IA. Para verificar o provedor,
configure o Gemini no ambiente local e execute separadamente:

```powershell
node scripts/smoke-patient-ai.mjs
node scripts/smoke-workspace.mjs --live-ai
node scripts/smoke-agenda-briefing.mjs
$env:INOVA_TEST_AI = 'true'
node scripts/smoke-admin-workspace.mjs
Remove-Item Env:INOVA_TEST_AI
```

Esses comandos podem consumir a cota do provedor. Não publique `.env.local`,
arquivos pessoais ou o perfil do navegador.

## Limites desta evidência

- Acesso real autenticado e operações remotas do Supabase não foram exercitados
  de ponta a ponta; seus contratos foram verificados por testes automatizados.
- S2 permanece uma simulação: não foram testados API real, reserva, pagamento
  ou agendamento externo.
- Tarefas administrativas de contato não disparam e-mail ou WhatsApp.
- A demonstração local e os controles de consentimento passaram. Autenticação,
  autorização e operação administrativa de produção precisam de validação
  própria antes de conectar usuários reais.
- Gemini depende de disponibilidade e cota externas; não foram testados todos
  os formatos de laudo nem validada a interpretação clínica dos resultados.

Este registro confirma os comportamentos exercitados na demonstração local.
Não certifica uma implantação de produção.
