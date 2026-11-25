"use server";

import { z } from "zod";
import { requireAuthUser } from "@/app/_lib/auth";
import { getUserCategories } from "@/app/_data/get-categories";
import { interpretNaturalLanguageTransaction } from "@/app/_services/ai";

const parseAiTransactionSchema = z.object({
  prompt: z
    .string()
    .trim()
    .min(
      4,
      "Descreva a movimentação com mais detalhes (ex.: 'Gastei R$ 80 no supermercado hoje').",
    )
    .max(500, "A descrição deve ter no máximo 500 caracteres."),
});

export interface AiTransactionSuggestion {
  type: "INCOME" | "EXPENSE";
  amount: number;
  date: string;
  description: string;
  categoryId: string;
  categoryName: string;
}

/**
 * UC009 / RF013 / RF014 / RN021 a RN024:
 * Interpreta o texto em linguagem natural e retorna APENAS a sugestão para revisão do usuário.
 * Nenhuma movimentação é persistida antes da confirmação explícita.
 */
export async function parseAiTransactionAction(input: {
  prompt: string;
}): Promise<{
  success: boolean;
  suggestion?: AiTransactionSuggestion;
  error?: string;
}> {
  await requireAuthUser();

  const parsed = parseAiTransactionSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error:
        parsed.error.issues[0]?.message ||
        "Informe uma frase descrevendo a movimentação.",
    };
  }

  try {
    const categories = await getUserCategories();
    const activeCategories = categories.filter((c) => c.isActive);

    const now = new Date();
    const todayIso = now.toISOString().slice(0, 10);

    const interpreted = await interpretNaturalLanguageTransaction({
      text: parsed.data.prompt,
      todayIso,
      availableCategories: activeCategories.map((c) => ({
        name: c.name,
        type: c.type,
      })),
    });

    // RN023: Seleciona categoria ativa compatível com o tipo; fallback para "Outros" do mesmo tipo
    const compatibleActive = activeCategories.filter(
      (c) => c.type === interpreted.type,
    );

    const matchedCategory =
      compatibleActive.find(
        (c) =>
          c.name.toLowerCase() === interpreted.categoryName.toLowerCase(),
      ) ||
      compatibleActive.find((c) => c.name.toLowerCase() === "outros") ||
      compatibleActive[0];

    if (!matchedCategory) {
      return {
        success: false,
        error: "Nenhuma categoria compatível disponível para este lançamento.",
      };
    }

    return {
      success: true,
      suggestion: {
        type: interpreted.type,
        amount: interpreted.amount,
        date: interpreted.date,
        description: interpreted.description,
        categoryId: matchedCategory.id,
        categoryName: matchedCategory.name,
      },
    };
  } catch (error) {
    console.error("Erro na interpretação por IA (UC009-A4):", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "O serviço de IA está temporariamente indisponível. Você pode realizar o lançamento manual.",
    };
  }
}
