import OpenAI from "openai";
import { z } from "zod";

export const parsedTransactionAiSchema = z.object({
  type: z.enum(["INCOME", "EXPENSE"]),
  amount: z.number().positive(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  description: z.string().min(1).max(255),
  categoryName: z.string().min(1),
});

export type ParsedTransactionAiResult = z.infer<
  typeof parsedTransactionAiSchema
>;

export const aiFinancialAnalysisSchema = z.object({
  summary: z.string().min(1),
  period_comparison: z.string().min(1),
  top_categories: z.array(
    z.object({
      category: z.string(),
      amount: z.number(),
      share_percentage: z.number(),
      observation: z.string(),
    }),
  ),
  positive_points: z.array(z.string()),
  warnings: z.array(z.string()),
  suggestions: z.array(
    z.object({
      title: z.string(),
      description: z.string(),
      estimated_savings: z.number().nonnegative().optional(),
    }),
  ),
  disclaimer: z.string(),
});

export type AiFinancialAnalysisData = z.infer<typeof aiFinancialAnalysisSchema>;

async function callLlmJson(systemPrompt: string, userPrompt: string): Promise<string> {
  if (process.env.AI_SIMULATE_UNAVAILABLE === "true") {
    throw new Error("Serviço de IA indisponível no momento (simulação CT13).");
  }

  const geminiKey = process.env.GEMINI_API_KEY?.trim();
  const openAiKey = process.env.OPENAI_API_KEY?.trim();
  const errors: string[] = [];

  if (geminiKey) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            systemInstruction: {
              parts: [{ text: systemPrompt }],
            },
            contents: [
              {
                role: "user",
                parts: [{ text: userPrompt }],
              },
            ],
            generationConfig: {
              temperature: 0.2,
              responseMimeType: "application/json",
            },
          }),
        },
      );

      if (!response.ok) {
        throw new Error(`Provedor Gemini retornou status ${response.status}.`);
      }

      const data = await response.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) {
        throw new Error("Resposta vazia do provedor Gemini.");
      }
      return text;
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Erro ao consultar Gemini.";
      errors.push(msg);
      console.warn("Falha no provedor Gemini, tentando fallback:", msg);
    }
  }

  if (openAiKey) {
    try {
      const openai = new OpenAI({ apiKey: openAiKey });
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      });
      const text = completion.choices[0]?.message?.content;
      if (!text) {
        throw new Error("Resposta vazia do provedor OpenAI.");
      }
      return text;
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Erro ao consultar OpenAI.";
      errors.push(msg);
      console.warn("Falha no provedor OpenAI:", msg);
    }
  }

  if (errors.length > 0) {
    throw new Error(
      `Falha na comunicação com os provedores de IA configurados (${errors.join(" | ")}).`,
    );
  }

  throw new Error("NO_EXTERNAL_API_KEY");
}

/**
 * Interpreta uma frase em linguagem natural para sugerir um lançamento financeiro
 * respeitando RNF005, RNF009, RN021, RN022 e RN023.
 */
export async function interpretNaturalLanguageTransaction(params: {
  text: string;
  todayIso: string;
  availableCategories: Array<{ name: string; type: "INCOME" | "EXPENSE" }>;
}): Promise<ParsedTransactionAiResult> {
  const { text, todayIso, availableCategories } = params;

  const incomeCategories = availableCategories
    .filter((c) => c.type === "INCOME")
    .map((c) => c.name);
  const expenseCategories = availableCategories
    .filter((c) => c.type === "EXPENSE")
    .map((c) => c.name);

  const systemPrompt = `Você é o assistente de lançamento financeiro do sistema AlvoFin.
Sua única função é interpretar a descrição de uma movimentação financeira informada pelo usuário e retornar um objeto JSON válido com os campos:
- "type": "INCOME" (para receitas/ganhos/salário/recebimentos) ou "EXPENSE" (para despesas/gastos/compras/pagamentos)
- "amount": número decimal positivo (ex: 80.50)
- "date": data no formato "YYYY-MM-DD". Se o usuário não informar data explícita, use obrigatoriamente "${todayIso}".
- "description": descrição curta e clara da movimentação (ex: "Supermercado", "Salário", "Uber").
- "categoryName": escolha APENAS uma das categorias compatíveis abaixo. Caso nenhuma seja adequada, use "Outros".
Categorias de RECEITA (INCOME) disponíveis: ${incomeCategories.join(", ")}
Categorias de DESPESA (EXPENSE) disponíveis: ${expenseCategories.join(", ")}`;

  try {
    const rawJson = await callLlmJson(systemPrompt, text);
    const parsedObj = JSON.parse(rawJson);
    return parsedTransactionAiSchema.parse(parsedObj);
  } catch (err) {
    if (
      err instanceof Error &&
      err.message === "NO_EXTERNAL_API_KEY"
    ) {
      return fallbackHeuristicTransactionParser(
        text,
        todayIso,
        availableCategories,
      );
    }
    throw err;
  }
}

/**
 * Interpretador heurístico local em português para funcionamento imediato
 * caso nenhuma chave externa (GEMINI_API_KEY / OPENAI_API_KEY) esteja definida no .env.
 */
function fallbackHeuristicTransactionParser(
  text: string,
  todayIso: string,
  availableCategories: Array<{ name: string; type: "INCOME" | "EXPENSE" }>,
): ParsedTransactionAiResult {
  const lower = text.toLowerCase();

  // 1. Identifica Tipo (Receita vs Despesa)
  const incomeKeywords = [
    "recebi",
    "salário",
    "salario",
    "freelance",
    "freela",
    "ganhei",
    "rendimento",
    "dividendo",
    "reembolso",
    "venda",
    "receita",
    "pix recebido",
  ];
  const isIncome = incomeKeywords.some((kw) => lower.includes(kw));
  const type: "INCOME" | "EXPENSE" = isIncome ? "INCOME" : "EXPENSE";

  // 2. Identifica Valor Monetário (ex: R$ 1.250,50 ou 80,90 ou 80)
  const moneyRegex =
    /(?:r\$\s*)?(\d{1,3}(?:\.\d{3})*(?:,\d{1,2})|\d+(?:[.,]\d{1,2})?)/i;
  const match = text.match(moneyRegex);
  if (!match) {
    throw new Error(
      "Não foi possível identificar o valor monetário na descrição informada. Informe o valor (ex.: 'Gastei R$ 80 no supermercado').",
    );
  }
  const rawNumber = match[1].includes(",")
    ? match[1].replace(/\./g, "").replace(",", ".")
    : match[1];
  const amount = Number(rawNumber);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("O valor identificado na frase não é válido.");
  }

  // 3. Identifica Data (ontem, amanhã, dd/mm/yyyy ou dd/mm, senão hoje - RN022)
  let date = todayIso;
  const baseDate = new Date(`${todayIso}T12:00:00Z`);
  if (lower.includes("ontem")) {
    baseDate.setUTCDate(baseDate.getUTCDate() - 1);
    date = baseDate.toISOString().slice(0, 10);
  } else if (lower.includes("amanhã") || lower.includes("amanha")) {
    baseDate.setUTCDate(baseDate.getUTCDate() + 1);
    date = baseDate.toISOString().slice(0, 10);
  } else {
    const brDateMatch = text.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?\b/);
    if (brDateMatch) {
      const day = String(brDateMatch[1]).padStart(2, "0");
      const month = String(brDateMatch[2]).padStart(2, "0");
      const year = brDateMatch[3] || todayIso.slice(0, 4);
      date = `${year}-${month}-${day}`;
    }
  }

  // 4. Identifica Categoria compatível (RN023)
  const compatible = availableCategories.filter((c) => c.type === type);
  let selectedCategory = "Outros";

  const keywordMap: Record<string, string[]> = {
    Alimentação: [
      "supermercado",
      "mercado",
      "ifood",
      "restaurante",
      "lanche",
      "padaria",
      "almoço",
      "almoco",
      "jantar",
      "café",
      "pizza",
      "comida",
      "alimentação",
    ],
    Moradia: [
      "aluguel",
      "condomínio",
      "condominio",
      "iptu",
      "moradia",
      "reforma",
      "casa",
    ],
    Transporte: [
      "uber",
      "99",
      "gasolina",
      "combustível",
      "combustivel",
      "ônibus",
      "onibus",
      "metrô",
      "estacionamento",
      "pedágio",
      "transporte",
    ],
    Saúde: [
      "farmácia",
      "farmacia",
      "remédio",
      "remedio",
      "médico",
      "medico",
      "consulta",
      "exame",
      "plano de saúde",
      "dentista",
      "saúde",
    ],
    Educação: [
      "faculdade",
      "curso",
      "livro",
      "escola",
      "mensalidade",
      "educação",
    ],
    Lazer: [
      "cinema",
      "netflix",
      "spotify",
      "show",
      "viagem",
      "bar",
      "jogo",
      "academia",
      "lazer",
    ],
    Utilidades: [
      "internet",
      "luz",
      "energia",
      "água",
      "agua",
      "celular",
      "telefone",
      "gás",
    ],
    Salário: ["salário", "salario", "pagamento mensal", "holerite", "adiantamento"],
    Freelance: ["freelance", "freela", "projeto", "consultoria", "serviço"],
    Rendimentos: ["rendimento", "dividendo", "juros", "cdb", "tesouro"],
  };

  // Verifica primeiro correspondência direta pelo nome da categoria do usuário
  for (const cat of compatible) {
    if (lower.includes(cat.name.toLowerCase())) {
      selectedCategory = cat.name;
      break;
    }
  }

  // Se não encontrou pelo nome exato, verifica pelo mapa semântico
  if (selectedCategory === "Outros") {
    for (const [catName, words] of Object.entries(keywordMap)) {
      if (words.some((w) => lower.includes(w))) {
        const found = compatible.find(
          (c) => c.name.toLowerCase() === catName.toLowerCase(),
        );
        if (found) {
          selectedCategory = found.name;
          break;
        }
      }
    }
  }

  // 5. Gera descrição limpa
  const cleanedDescription = text
    .replace(
      /^(gastei|paguei|comprei|recebi|ganhei|lancei)\s+/i,
      "",
    )
    .replace(/(?:r\$\s*)?\d{1,3}(?:\.\d{3})*(?:,\d{1,2})|\d+(?:[.,]\d{1,2})?/i, "")
    .replace(/\b(hoje|ontem|amanhã|amanha|no|na|de|do|da|em|com|por)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  const description =
    cleanedDescription.length >= 2
      ? cleanedDescription.charAt(0).toUpperCase() + cleanedDescription.slice(1)
      : selectedCategory;

  return {
    type,
    amount,
    date,
    description,
    categoryName: selectedCategory,
  };
}

/**
 * Gera análise financeira estruturada das receitas e despesas do mês selecionado
 * (UC010, RF015 a RF017, RN025 a RN029, RNF009).
 */
export async function generateStructuredFinancialAnalysis(params: {
  referenceMonth: number;
  referenceYear: number;
  currentPeriod: {
    totalIncome: number;
    totalExpense: number;
    balance: number;
    byCategory: Array<{
      category: string;
      type: "INCOME" | "EXPENSE";
      amount: number;
    }>;
  };
  previousPeriod: {
    totalIncome: number;
    totalExpense: number;
    balance: number;
    byCategory: Array<{
      category: string;
      type: "INCOME" | "EXPENSE";
      amount: number;
    }>;
  };
}): Promise<AiFinancialAnalysisData> {
  const { referenceMonth, referenceYear, currentPeriod, previousPeriod } =
    params;

  const systemPrompt = `Você é o analista financeiro informativo do sistema AlvoFin.
Analise exclusivamente os dados agregados de receitas e despesas do mês ${referenceMonth}/${referenceYear} e compare com o período anterior.
REGRAS OBRIGATÓRIAS (RN026, RN028, RNF009):
1. Retorne APENAS um JSON válido com as chaves exatas:
   - "summary": string com visão geral de receitas, despesas e saldo do mês.
   - "period_comparison": string comparando o mês atual com o mês anterior (variações de receitas e despesas).
   - "top_categories": array de objetos { "category": string, "amount": number, "share_percentage": number, "observation": string } destacando as categorias com maior volume de gastos.
   - "positive_points": array de strings destacando comportamentos financeiros positivos (RF017).
   - "warnings": array de strings apontando gastos elevados, aumentos relevantes ou pontos de atenção (RF016).
   - "suggestions": array de objetos { "title": string, "description": string, "estimated_savings": number } com oportunidades práticas de melhoria e valores estimados.
   - "disclaimer": string informando que a análise tem caráter exclusivamente informativo e não representa aconselhamento financeiro profissional ou recomendação de investimentos (RN028).`;

  const userPayload = JSON.stringify({
    periodo_analisado: `${String(referenceMonth).padStart(2, "0")}/${referenceYear}`,
    mes_atual: currentPeriod,
    mes_anterior: previousPeriod,
  });

  try {
    const rawJson = await callLlmJson(systemPrompt, userPayload);
    const parsed = JSON.parse(rawJson);
    return aiFinancialAnalysisSchema.parse(parsed);
  } catch (err) {
    if (err instanceof Error && err.message === "NO_EXTERNAL_API_KEY") {
      return buildAnalyticalFallbackReport(params);
    }
    throw err;
  }
}

function buildAnalyticalFallbackReport(params: {
  referenceMonth: number;
  referenceYear: number;
  currentPeriod: {
    totalIncome: number;
    totalExpense: number;
    balance: number;
    byCategory: Array<{
      category: string;
      type: "INCOME" | "EXPENSE";
      amount: number;
    }>;
  };
  previousPeriod: {
    totalIncome: number;
    totalExpense: number;
    balance: number;
    byCategory: Array<{
      category: string;
      type: "INCOME" | "EXPENSE";
      amount: number;
    }>;
  };
}): AiFinancialAnalysisData {
  const { referenceMonth, referenceYear, currentPeriod, previousPeriod } =
    params;

  const expenseCategories = currentPeriod.byCategory
    .filter((c) => c.type === "EXPENSE" && c.amount > 0)
    .sort((a, b) => b.amount - a.amount);

  const totalExp = currentPeriod.totalExpense;
  const totalInc = currentPeriod.totalIncome;
  const balance = currentPeriod.balance;

  const topCategories = expenseCategories.slice(0, 4).map((c) => {
    const share =
      totalExp > 0 ? Math.round((c.amount / totalExp) * 100) : 0;
    const prevCat = previousPeriod.byCategory.find(
      (p) => p.type === "EXPENSE" && p.category === c.category,
    );
    let obs = `Representa ${share}% das despesas totais do mês.`;
    if (prevCat && prevCat.amount > 0) {
      const diffPct = Math.round(
        ((c.amount - prevCat.amount) / prevCat.amount) * 100,
      );
      if (diffPct > 0) {
        obs += ` Aumento de ${diffPct}% em relação ao mês anterior.`;
      } else if (diffPct < 0) {
        obs += ` Redução de ${Math.abs(diffPct)}% em relação ao mês anterior.`;
      }
    }
    return {
      category: c.category,
      amount: c.amount,
      share_percentage: share,
      observation: obs,
    };
  });

  const periodComparison =
    previousPeriod.totalExpense > 0 || previousPeriod.totalIncome > 0
      ? `Em comparação ao mês anterior (Receitas: R$ ${previousPeriod.totalIncome.toFixed(
          2,
        )} | Despesas: R$ ${previousPeriod.totalExpense.toFixed(
          2,
        )}), suas despesas ${
          totalExp >= previousPeriod.totalExpense
            ? `tiveram variação de +R$ ${(
                totalExp - previousPeriod.totalExpense
              ).toFixed(2)}`
            : `reduziram em R$ ${(
                previousPeriod.totalExpense - totalExp
              ).toFixed(2)}`
        }.`
      : "Não há movimentações registradas no mês imediatamente anterior para comparação histórica.";

  const positivePoints: string[] = [];
  const warnings: string[] = [];

  if (balance > 0) {
    const savingsRate =
      totalInc > 0 ? Math.round((balance / totalInc) * 100) : 0;
    positivePoints.push(
      `Saldo positivo no período de R$ ${balance.toFixed(
        2,
      )} (preservação de ${savingsRate}% das receitas do mês).`,
    );
  }

  if (
    previousPeriod.totalExpense > 0 &&
    totalExp < previousPeriod.totalExpense
  ) {
    positivePoints.push(
      `Redução de R$ ${(previousPeriod.totalExpense - totalExp).toFixed(
        2,
      )} no volume total de despesas em relação ao mês anterior.`,
    );
  }

  if (positivePoints.length === 0) {
    positivePoints.push(
      "Manutenção do registro organizado de movimentações por categorias no período consultado.",
    );
  }

  if (balance < 0) {
    warnings.push(
      `Atenção: as despesas superaram as receitas em R$ ${Math.abs(
        balance,
      ).toFixed(2)} neste mês.`,
    );
  } else if (totalInc > 0 && totalExp / totalInc > 0.8) {
    warnings.push(
      `Comprometimento elevado da renda: ${Math.round(
        (totalExp / totalInc) * 100,
      )}% das receitas foram consumidas por despesas.`,
    );
  }

  if (topCategories[0] && topCategories[0].share_percentage >= 40) {
    warnings.push(
      `Concentração de gastos: a categoria "${topCategories[0].category}" concentrou ${topCategories[0].share_percentage}% das despesas do mês.`,
    );
  }

  if (warnings.length === 0) {
    warnings.push(
      "Nenhuma anomalia crítica identificada; mantenha o acompanhamento das categorias variáveis.",
    );
  }

  const suggestions = topCategories.slice(0, 2).map((top) => {
    const estimatedSavings = Number((top.amount * 0.1).toFixed(2));
    return {
      title: `Otimizar gastos em ${top.category}`,
      description: `Uma revisão de 10% nos lançamentos de "${top.category}" pode liberar margem adicional no orçamento mensal.`,
      estimated_savings: estimatedSavings,
    };
  });

  if (suggestions.length === 0) {
    suggestions.push({
      title: "Revisão periódica de despesas variáveis",
      description:
        "Continue categorizando todos os gastos para identificar oportunidades de economia mensal.",
      estimated_savings: 0,
    });
  }

  return {
    summary: `No período ${String(referenceMonth).padStart(
      2,
      "0",
    )}/${referenceYear}, o total de receitas consideradas foi de R$ ${totalInc.toFixed(
      2,
    )} e o total de despesas foi de R$ ${totalExp.toFixed(
      2,
    )}, resultando em um saldo de R$ ${balance.toFixed(2)}.`,
    period_comparison: periodComparison,
    top_categories: topCategories,
    positive_points: positivePoints,
    warnings,
    suggestions,
    disclaimer:
      "Esta análise tem caráter exclusivamente informativo e educacional, não representando aconselhamento financeiro profissional ou recomendação de investimentos (RN028).",
  };
}
