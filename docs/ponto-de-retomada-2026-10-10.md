# INOVA — ponto de retomada em 10/10/2026

Registro solicitado pelo usuário para preservar o trabalho antes de novas
atividades. Esta memória é mantida no projeto e deve ser lida junto com
`estado-aprovado-do-sistema.md` nas próximas sessões.

## Preferências que devem orientar o trabalho

- Preservar a aparência e os recursos dos portais aprovados de demonstração.
  Alterar somente o que for solicitado; não recriar telas simplificadas.
- Médico demonstrativo: **Dr. Rafael Mendes**. Paciente: **Mariana Oliveira**.
- Identidade atual: Manrope, azul profundo, branco e ciano `#00b8e6`; letras
  IN/VA com infinito vetorial. A curva compartilhada está em
  `src/data/inova-brand.ts` e o aplicativo usa `Logo.tsx`.
  Essa alteração foi explicitamente escolhida pelo usuário após comparar as artes.
- Acesso médico e acesso paciente têm destaque na página inicial. Colaborador
  INOVA é discreto. O logo administrativo permite voltar à página inicial.
- A IA deve aparecer claramente nos materiais comerciais, sem prometer
  diagnósticos automáticos ou escores genéticos que ainda não existem.
- Apresentações comerciais e para investidores são documentos PDF; não criar
  uma página adicional no aplicativo para substituir esses entregáveis.
- Manter Git com histórico linear publicado: projeto conectado ao Lovable,
  sem force push, rebase ou alteração de commits já enviados.

## Acessos e conteúdo da demonstração

| Portal | Acesso e conteúdo |
| --- | --- |
| Médico | Botão Ver demonstração médica abre `/dashboard` sem login real. Rotas `/patients`, `/patients/new`, `/results`, `/history`, `/comparison`, `/agenda`, `/doctors` (Meu perfil), `/follow-up`, `/indicators` (Meus relatórios), `/settings`. |
| Prontuário médico | `/patients/mariana-oliveira`: resumo da consulta, envios, pedidos de exames, orientações, visão geral, resultados, histórico, comparação, histórico familiar, laudos laboratoriais, genética, genômica e documentos. |
| Paciente | `/acesso-paciente` oferece Explorar demonstração gratuita; abre `/portal-paciente` com marcador demonstrativo no sessionStorage. |
| Menu do paciente | Minha saúde, Minha agenda, Próximos passos, Avisos, Preparar consulta, Orientações do médico, Meus resultados, Exames solicitados, Minha evolução, Preparo dos exames, Laboratórios favoritos, Meus documentos, Minha genética, Linha do tempo e Meu perfil. |
| Administração | `/admin-inova`, separado do atendimento: visão geral, usuários, atividade, assinaturas, contatos e reativação, feedbacks e resumo com IA. |

O fluxo demonstrativo liga preparação com textos, áudios e PDFs à caixa do
médico e às notificações. O profissional revisa documentos, libera pedidos e
publica orientações. O paciente consulta pedidos, cotação simulada e agenda.
O calendário é mensal, com navegação pelos meses/dias, detalhes com rolagem
própria e cancelamento com motivo preservado no histórico.

## IA, integrações e armazenamento

- Gemini: briefing médico do dia e de eventos futuros; síntese de PDFs;
  explicações dos resultados e da evolução para o paciente; resumo administrativo.
  Há consentimento e validações específicas por fluxo. O briefing recebe textos
  e contagens de anexos, não o conteúdo dos anexos. A análise de PDF é um fluxo
  separado que envia o documento autorizado ao provedor.
- Durante as gravações de 10/10, foram verificadas respostas reais do Gemini
  para o briefing, a explicação de resultados do paciente e a síntese de PDF,
  somente com dados fictícios. A explicação do paciente teve falhas temporárias
  do provedor antes de uma tentativa bem-sucedida; não afirmar disponibilidade
  contínua garantida. Modelo observado: `gemini-2.5-flash`.
- Genética TXT: importação, marcadores, versões, revisão e download. Os quatro
  domínios organizam o acompanhamento; escores de predisposição não configurados.
- S2: carrinho, comparação de laboratórios, valores e seleção demonstrativos.
  Não há API comercial, pagamento, reserva ou agendamento externo real.
- Administração: 14 usuários fictícios, referência de uso em 08/10/2026.
  Conta ativa, acesso recente e satisfação são medidas distintas. E-mails
  aparecem para contato; telefones ausentes são identificados como não cadastrados.
  Contatos e pedidos de feedback são registros manuais, sem envio automático.
- Admin/perfil/preferências usam persistência local conforme o módulo.
  Preparação tem rascunho IndexedDB; envios, pedidos e orientações demonstrativos
  usam backend temporário. Agenda e genética possuem arquivos locais em
  `.inova-demo/`, excluídos do Git. Não assumir persistência idêntica em todas as áreas.

## Contas reais: trabalho preparado e pendência explícita

O cadastro real exige e-mail e conferência de identidade. A conta do paciente
pode ser associada ao prontuário anterior quando coincidem CPF, nascimento,
e-mail confirmado e autorização médica, nas duas ordens de cadastro. CPF
isolado não autoriza acesso. Histórico existente é preservado; prontuários de
médicos distintos não são misturados e observações privadas ficam com o médico.

As telas conectadas usam `?workspace=account`. A demonstração continua sem esse
parâmetro. A documentação técnica está em `vinculo-cadastro-paciente.md`.

**Atualização posterior neste mesmo dia:** os portais reais agora oferecem os
menus completos aprovados, agenda compartilhada, preferências, resultados,
documentos, consultas, notificações e genética TXT. O usuário executou
`supabase/INOVA_PORTAIS_COMPLETOS_SQL_EDITOR.sql`; as novas tabelas e funções
foram confirmadas remotamente sem ler prontuários ou fazer envios reais.
Detalhes em `paridade-portais-reais.md`. Os fluxos de interface usam respostas
controladas nos testes e as regras SQL foram verificadas em PostgreSQL local.
A cotação comercial S2 continua sem API: contas reais abrem o site externo.
Uma validação de ponta a ponta com sessões reais de médico e paciente ainda
deve distinguir autenticação, storage, envio e provedor de IA dos testes locais.
As contas e os prontuários Supabase antigos foram preservados. Não executar
scripts de seed ou apagar dados remotos como parte de uma retomada rotineira.

## Materiais entregues

| Material | Local |
| --- | --- |
| Investidores, custos e EBITDA estimado | `docs/entregaveis/INOVA_investidores_2026-10-08.pdf` |
| Guia de apresentação e venda | `docs/entregaveis/INOVA_como_apresentar_e_vender_2026-10-08.pdf` |
| Apresentação com identidade INOVA | `docs/entregaveis/INOVA_apresentacao_cuidado_conectado_2026-10-08_roteiro.md` e respectivos entregáveis |
| Visão completa e viabilidade, com telas | `docs/entregaveis/INOVA_visao_completa_e_viabilidade_2026-10-09.pdf`, 49 páginas e 52 capturas |
| Três posts fixos de Instagram | `docs/entregaveis/instagram/INOVA_posts_fixos_2026-10-10/`: 13 artes, legendas e pacotes ZIP |
| Logo para Instagram | `docs/entregaveis/instagram/INOVA_logo_instagram_2026-10-10/`: versões clara, escura e transparente |
| Vídeo mais recente | `docs/entregaveis/instagram/INOVA_portais_completos_2026-10-10/INOVA-medico-e-paciente.mp4` |
| Partes separadas | Mesmo diretório: `INOVA-medico.mp4` e `INOVA-paciente.mp4` |
| Pacote para compartilhar | Mesmo diretório: `INOVA-medico-e-paciente-completo.zip`, com vídeos, capa, SRT, legenda de postagem e índice |

O vídeo completo tem aproximadamente 7min31, em 1080 × 1920, com 46 capítulos,
gravações da interface, narração sintética em português e 140 legendas embutidas.
Mostra somente médico e paciente; IA em destaque. A parte médica tem cerca de
4min21 e a parte paciente cerca de 3min10. Todos os exemplos são fictícios.
Decodificação completa passou; legendas preservam o texto narrado e seus tempos.

Os vídeos anteriores (`INOVA_contexto`, `INOVA_video_preparar_consulta` e
`INOVA_IA_reel`) permanecem como histórico. O usuário criticou as primeiras
versões e solicitou a cobertura completa. A versão mais recente foi entregue;
não registrar aprovação estética definitiva sem nova confirmação dele.

Scripts de criação/captura/renderização ficam em `scripts/`; fontes e arquivos
de edição estão junto dos materiais. Chrome e FFmpeg foram usados localmente.
Gravações brutas, ferramentas baixadas e áudio intermediário estão em
`artifacts/`, fora do Git; os MP4s finais e os materiais de edição são versionados.

## Conversa comercial mais recente

- Prioridade sugerida: conversar pessoalmente com médicos e construir pilotos.
  Hipótese de público inicial: clínicos, endocrinologistas e cardiologistas com
  consultório próprio ou clínicas pequenas; ainda precisa de validação comercial.
- Proposta: organizar preparação, exames e acompanhamento, com apoio da IA.
  Demonstrar um problema da rotina contado pelo próprio profissional.
- Marketing sugerido: conteúdo sobre problemas da rotina, demonstrações curtas,
  fundador aparecendo e convite para agendar demonstração. Medir conversas,
  demonstrações, propostas e interesse em contratar.
- R$ 149 e R$ 249 são hipóteses autorizadas para os cenários e para testar uma
  oferta futura, não preços oficiais nem mensalidades já vendidas.
- Plano sugerido para 30 dias: 30 contatos, 10 conversas, cinco demonstrações e
  três compromissos de piloto. São sugestões, não metas contratadas ou resultados.
- Nenhum contato comercial foi enviado, cliente contratado ou anúncio publicado
  por esta conversa. O uso de dados reais depende da preparação operacional.

Portas de entrada consultadas em 10/10:
[APM/Sociedade Médica de Sorocaba](https://www.apm.org.br/institucional/regionais/distrital/4a-regiao-distrital/)
(`sorocaba@apm.org.br`, (15) 3231-1465) e
[UNISOTech](https://uniso.br/uniso-tech/)
(`unisotech@uniso.br`, (15) 98105-0688). São contatos públicos para relacionamento;
não existe parceria ou endosso firmado com essas instituições.

## Verificações e retomada técnica

As evidências de regras, TypeScript, build e fluxos de navegador de 09 e 10/10
estão em `testes-funcionais-2026-10-09.md` e `vinculo-cadastro-paciente.md`.
Não confundir essa bateria anterior com testes novos em cada retomada.
Na produção dos vídeos, foram exercitados os portais no navegador, chamadas de
IA com exemplos e a reprodução dos arquivos finais.

Para iniciar localmente: `npm.cmd run dev -- --host 0.0.0.0 --port 8081`.
O servidor atual foi usado em `http://localhost:8081`. IA, fila, envios e genética
dependem da configuração local e de `INOVA_AI_ORIGIN` com a origem exata.
Não imprimir nem publicar `.env.local`, chaves ou dados de sessões.

Antes da próxima mudança: ler esta memória, conferir `git status`, identificar
o escopo pedido pelo usuário e preservar a base existente. O próximo assunto
a desenvolver ainda não foi definido.

## Verificação do salvamento desta referência

Em 10/10, antes de versionar a identidade e os materiais: `npx.cmd tsc --noEmit`,
`npm.cmd run build` e ESLint dos componentes de marca e dos scripts de criação,
captura e renderização passaram. A compilação apresentou avisos de ferramentas
existentes, sem falhar. A bateria completa de regras/navegador não foi repetida
neste salvamento; suas evidências anteriores estão nos documentos citados.

O ponto de referência Git recebe a tag `checkpoint-inova-2026-10-10`.
Configurações secretas, dependências instaladas, estados locais e intermediários
de gravação permanecem no computador, excluídos do repositório; não confundir
esse checkpoint de código e entregáveis com um backup do banco Supabase.
