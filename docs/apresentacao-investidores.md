# Apresentação visual do INOVA

Entrega atual: documento PDF. A página `/investidores` foi removida a pedido
do usuário; não recriá-la como parte da interface do produto.
Arquivo para compartilhar: `docs/entregaveis/INOVA_investidores_2026-10-08.pdf`.
Prévia: `docs/entregaveis/INOVA_investidores_2026-10-08.png`.

A página independente tem seis capítulos: visão executiva, jornada do cuidado,
produto em ação, modelo de negócio, planejamento financeiro e próximos marcos. Não modifica os portais
aprovados. Inclui seletor de marcador, gráficos demonstrativos, cenários comerciais
editáveis, visão completa, tela cheia e impressão em PDF.

Os resultados clínicos vêm do perfil fictício Mariana em `src/data/demo.ts`.
O preço exibido vem de `src/data/pricing.ts`. O simulador calcula assinantes vezes
ticket; não representa receita ou tração atual. Não acessa prontuários, contas ou
credenciais do Supabase. Escores genéticos, integração S2, operação comercial e
validação real são identificados conforme o estágio atual.

Para apresentar ou compartilhar, use o PDF entregue. Os controles interativos
descritos neste registro são históricos e não fazem parte da entrega atual.
O script de prévia dependia da rota removida e não deve ser executado sem adaptar
a geração para documento independente. A promoção não entra no cálculo simples
dos cenários de receita recorrente.

Validação em 08/10/2026: TypeScript, ESLint e build; navegador com teste de seis
capítulos, seleção de marcador, cálculo de receita e largura em celular de 390 px.
O script `scripts/preview-investors.mjs` usa Chrome CDP na porta 9222 e o servidor
local na porta 8080 para gerar a prévia e o PDF, sem enviar dados a serviços externos.

Próximas informações para uma apresentação comercial específica: estágio do
piloto, métricas de uso verificadas, equipe, orçamento, valor de captação e uso dos
recursos. Essas informações não foram inventadas na versão inicial.

## Planejamento financeiro adicionado em 08/10

Orçamento mensal editável: equipe, suporte, infraestrutura base, ferramentas,
marketing, contabilidade/jurídico e administrativo. Os valores padrão são
exemplos e não cotações do INOVA. Consumo variável por médico, taxas de pagamento
e tributos sobre faturamento também são hipóteses editáveis.

Receita líquida = assinantes × ticket − tributos sobre faturamento.
EBITDA estimado = receita líquida − consumo/taxas − custos fixos.
Margem EBITDA = EBITDA / receita líquida. Sem receita líquida positiva, a margem
não é exibida. Ponto de equilíbrio = custos fixos / contribuição por médico,
arredondado para cima; contribuição não positiva é indicada como não alcançável.

O plano de 12 meses aplica adições líquidas constantes de médicos e mantém os
custos e o ticket. Investimento inicial em M1 é uma saída separada do EBITDA.
Caixa simplificado = caixa inicial + EBITDA acumulado − investimento inicial.
Não modela capital de giro, juros, financiamentos, impostos sobre lucro,
depreciação/amortização, promoção, inflação ou atrasos de recebimento. Custos e
alíquotas reais exigem confirmação; os cenários não são demonstrações contábeis.

As edições permanecem ao alternar capítulos na sessão, mas são reiniciadas ao
recarregar a página. O PDF usa os valores presentes ao exportar. O PDF entregue
foi regenerado incluindo o capítulo financeiro. Quatro testes de cálculo e o
teste de navegador validaram EBITDA, equilíbrio e edição/preservação dos custos.
