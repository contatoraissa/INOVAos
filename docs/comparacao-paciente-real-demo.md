# Comparação do portal do paciente — 2026-10-07

Referência visual: `PatientPortal.tsx` e `PatientHealthOverview.tsx` (demonstração).
Conta real: `RealPatientPortalPage.tsx`, `RealPatientHomeSections.tsx`, `RealPatientResults.tsx`.

A conta Alison Brasil recebeu, a pedido do titular, seis laudos de teste privados
identificados como `INOVA_TESTE_FICTICIO_`: março, junho e novembro de 2025;
março, junho e setembro de 2026. São 24 resultados sintéticos de hemoglobina,
glicemia, colesterol LDL e vitamina D. Não possuem validade clínica. O script
`scripts/seed-real-patient-test-results.mjs` verifica o vínculo e não duplica os
mesmos laudos em uma segunda execução. Não cria um login ou envia e-mails.

## Diferenças que ainda precisam ser resolvidas

- A estrutura geral e os blocos da página inicial foram recuperados, mas o
  panorama, as referências dos cartões e os estados de carregamento não usam
  exatamente o mesmo componente da demonstração.
- Preparar consulta mantém persistência e envio reais, mas a demonstração tem
  controles de áudio associados individualmente a cada pergunta e uma seleção
  de pedido para o envio. O formulário real ainda reúne os áudios por envio.
- Documentos reais mostra laudos revisados; a demonstração também oferece uma
  biblioteca local, seleção de documento e visualização dividida em duas colunas.
- Resultados e evolução usam componentes diferentes entre os perfis. A
  interpretação de marcadores com IA da demonstração não foi conectada à conta
  real; não deve ser exibida como funcional sem implementar esse vínculo.
- Laboratórios favoritos mantém o acesso ao site da S2, mas a busca e cotação
  reais não estão integradas. A cotação da demonstração usa unidades e preços
  fictícios.
- Linha do tempo da conta real ainda precisa consolidar exames e genética com
  os registros da consulta.

Essas diferenças são de implementação, não apenas ausência de resultados. Os
dados de teste ajudam a comparar a interface preenchida, mas não corrigem por
si só a diferença entre os componentes. Não há comparação visual autenticada
automatizada concluída.
