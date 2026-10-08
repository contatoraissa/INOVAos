# INOVA — demonstração navegável da plataforma laboratorial

## Objetivo
Construir uma demonstração premium e responsiva que conte a jornada completa: entrar, localizar um paciente, consultar resultados, entender a evolução, comparar coletas e gerar um resumo informativo sem interpretação clínica.

## Experiência e identidade
- Aplicar a identidade INOVA do material enviado: azul profundo, ciano, branco e cinzas, com logotipo tipográfico próprio e símbolo de infinito.
- Criar uma interface médica sóbria, precisa e organizada, sem aparência de landing page, excesso de cartões, sombras, gradientes ou arredondamentos.
- Priorizar desktop e notebook, mantendo boa adaptação para tablet.
- Usar transições discretas, estados de carregamento, vazio, sucesso, busca encontrada e não encontrada.

## Estrutura navegável
- Login demonstrativo com acesso por qualquer e-mail e senha.
- Estrutura principal com menu lateral recolhível, cabeçalho, busca global e perfil do Dr. Rafael Mendes.
- Páginas independentes para Dashboard, Pacientes, Cadastro, Novos Resultados, Histórico, Comparação, Médicos, Acompanhamento, Indicadores e Configurações.
- Página detalhada de Mariana Oliveira com abas reais para visão geral, resultados, histórico, comparação e documentos.

## Conteúdo funcional
- Dashboard com métricas, pacientes recentes, busca de pacientes e frase institucional.
- Base local coerente com 10 pacientes fictícios e resultados laboratoriais demonstrativos.
- Busca por nome, CPF, RG e nascimento, com abertura direta do histórico.
- Resultados organizados por Hematologia, Bioquímica e Perfil lipídico.
- Linha do tempo interativa por coleta.
- Gráficos profissionais de glicemia, LDL, hemoglobina e ferritina com seleção de período e detalhes ao passar o mouse.
- Comparação entre duas coletas com variações destacadas sem interpretação médica.
- Resumo do histórico gerado sob demanda, claramente identificado como apoio à análise médica.
- Cadastro demonstrativo com confirmação visual e retorno coerente à lista.
- Indicadores operacionais com gráficos e dados fictícios.
- Controles, filtros e ações com comportamento demonstrativo; nenhuma ação principal ficará sem resposta.

## Organização técnica
- Separar dados, estrutura visual, componentes reutilizáveis, gráficos e páginas.
- Usar React, TypeScript, Tailwind, componentes existentes e Recharts.
- Manter toda a demonstração no navegador, sem persistência real ou dados médicos reais.
- Adicionar metadados próprios e distintos para cada página pública.

## Validação
- Verificar compilação e erros de execução.
- Percorrer no navegador a jornada completa: login → dashboard → busca → paciente → resultados → histórico → evolução → comparação → resumo → dashboard.
- Conferir desktop e tablet, legibilidade, ausência de sobreposições e funcionamento dos principais controles.
